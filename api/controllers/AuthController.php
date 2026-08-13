<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\Session;
use Core\AuditLogger;
use Middleware\RateLimitMiddleware;

class AuthController
{
    public function getCsrf()
    {
        Response::json(['token' => Session::getCsrfToken()]);
    }

    public function login()
    {
        $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
        if ($contentLength > 16384) {
            Response::error('Payload Too Large', 'PAYLOAD_TOO_LARGE', 413);
        }

        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Unsupported Media Type', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $rawInput = file_get_contents('php://input');
        if (strlen($rawInput) > 16384) { // 16KB limit
            Response::error('Payload Too Large', 'PAYLOAD_TOO_LARGE', 413);
        }

        $input = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
            Response::error('Geçersiz istek formatı.', 'BAD_REQUEST', 400);
        }

        $username = isset($input['username']) && is_string($input['username']) ? trim($input['username']) : '';
        $password = isset($input['password']) && is_string($input['password']) ? $input['password'] : '';
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        if (empty($username) || empty($password) || mb_strlen($username) > 100 || mb_strlen($password) > 256) {
            Response::error('Giriş bilgileri geçersiz.', 'VALIDATION_ERROR', 422);
        }

        RateLimitMiddleware::checkLoginLimit($username, $ipAddress);

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM admins WHERE (username = ? OR email = ?) AND status = 'active' LIMIT 1");
        $stmt->execute([$username, $username]);
        $admin = $stmt->fetch();

        // Fixed dummy hash to consume similar time when user not found
        $dummyHash = '$2y$10$O06/1Yl0U7i1gK.47F/eKe0q.21M4U/x0d0Yd2u9/2X4Z0a2O0u2C';
        
        $passwordMatches = false;
        if ($admin) {
            $passwordMatches = password_verify($password, $admin['password_hash']);
        } else {
            password_verify($password, $dummyHash);
        }

        if ($admin && $passwordMatches) {
            // Success
            Session::regenerate();
            Session::rotateCsrfToken();

            $_SESSION['logged_in'] = true;
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_role'] = $admin['role'];
            $_SESSION['login_time'] = time();
            $_SESSION['last_activity'] = time();

            // Rehash if needed
            $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
            if (password_needs_rehash($admin['password_hash'], $algo)) {
                $newHash = password_hash($password, $algo);
                if ($newHash) {
                    $rehashStmt = $db->prepare("UPDATE admins SET password_hash = ?, password_changed_at = NOW() WHERE id = ?");
                    $rehashStmt->execute([$newHash, $admin['id']]);
                }
            }

            // Update last login
            $updateStmt = $db->prepare("UPDATE admins SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?");
            $updateStmt->execute([$ipAddress, $admin['id']]);

            RateLimitMiddleware::clearAttempts($username, $ipAddress);
            AuditLogger::log('auth.login.success', $admin['id'], null, null, ['username' => $username]);

            Response::json([
                'id' => $admin['id'],
                'username' => $admin['username'],
                'display_name' => $admin['display_name'],
                'role' => $admin['role']
            ]);
        } else {
            RateLimitMiddleware::recordAttempt($username, $ipAddress, false);
            AuditLogger::log('auth.login.failed', null, null, null, ['username' => $username]);
            Response::error('Giriş bilgileri geçersiz.', 'UNAUTHORIZED', 401);
        }
    }

    public function logout()
    {
        $adminId = $_SESSION['admin_id'] ?? null;
        if ($adminId) {
            AuditLogger::log('auth.logout', $adminId);
        }
        Session::destroy();
        Response::json(['success' => true]);
    }

    public function me()
    {
        if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
            Response::error('Oturum gerekli.', 'UNAUTHORIZED', 401);
        }

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT id, username, email, display_name, role, last_login_at FROM admins WHERE id = ? AND status = 'active'");
        $stmt->execute([$_SESSION['admin_id']]);
        $admin = $stmt->fetch();

        if (!$admin) {
            Session::destroy();
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
        }

        Response::json($admin);
    }
}
