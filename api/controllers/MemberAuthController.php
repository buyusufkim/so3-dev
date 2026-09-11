<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\Session;
use Middleware\MemberAuthMiddleware;
use Middleware\CsrfMiddleware;

class MemberAuthController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getCsrf()
    {
        $token = Session::getCsrfToken();
        Response::json(['csrf_token' => $token]);
    }

    private function getJsonPayload()
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== 0) {
            Response::error('Unsupported Media Type', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 16384) {
            Response::error('Payload Too Large', 'PAYLOAD_TOO_LARGE', 413);
        }

        $rawBody = file_get_contents('php://input');
        if (strlen($rawBody) > 16384) {
            Response::error('Payload Too Large', 'PAYLOAD_TOO_LARGE', 413);
        }

        $input = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }
        
        return $input;
    }

    private function checkRateLimit($username, $ip)
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) 
            FROM member_login_attempts 
            WHERE (username = :username OR ip_address = :ip) 
            AND successful = 0 
            AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->execute([':username' => $username, ':ip' => $ip]);
        $attempts = $stmt->fetchColumn();

        if ($attempts >= 5) {
            header('Retry-After: 900');
            Response::error('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.', 'TOO_MANY_REQUESTS', 429);
        }
    }

    private function recordAttempt($username, $ip, $successful)
    {
        $stmt = $this->db->prepare("
            INSERT INTO member_login_attempts (username, ip_address, successful) 
            VALUES (:username, :ip, :successful)
        ");
        $stmt->execute([
            ':username' => $username,
            ':ip' => $ip,
            ':successful' => $successful ? 1 : 0
        ]);
        
        if ($successful) {
            $stmt = $this->db->prepare("
                DELETE FROM member_login_attempts 
                WHERE (username = :username OR ip_address = :ip) 
                AND successful = 0
            ");
            $stmt->execute([':username' => $username, ':ip' => $ip]);
        }
    }

    public function login()
    {
        $input = $this->getJsonPayload();

        $allowedKeys = ['username', 'password'];
        if (count(array_diff(array_keys($input), $allowedKeys)) > 0 || count(array_diff($allowedKeys, array_keys($input))) > 0) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        if (!array_key_exists('username', $input) || !is_string($input['username'])) {
            Response::error('Geçersiz format.', 'VALIDATION_ERROR', 422);
        }
        if (!array_key_exists('password', $input) || !is_string($input['password'])) {
            Response::error('Geçersiz format.', 'VALIDATION_ERROR', 422);
        }

        $username = strtolower(trim($input['username']));
        $password = $input['password'];

        if (strlen($username) < 3 || strlen($username) > 50 || !preg_match('/^[a-z0-9._-]+$/', $username)) {
            Response::error('Giriş bilgileri geçersiz.', 'UNAUTHORIZED', 401);
        }

        if (strlen($password) < 1 || strlen($password) > 256) {
            Response::error('Giriş bilgileri geçersiz.', 'UNAUTHORIZED', 401);
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $this->checkRateLimit($username, $ip);

        $stmt = $this->db->prepare("
            SELECT ma.id as account_id, ma.uuid as account_uuid, ma.username, ma.password_hash, ma.status as account_status, ma.must_change_password, ma.auth_version,
                   m.id as member_id, m.uuid as member_uuid, m.first_name, m.last_name, m.status as member_status, m.deleted_at
            FROM member_accounts ma
            JOIN members m ON ma.member_id = m.id
            WHERE ma.username = :username
        ");
        $stmt->execute([':username' => $username]);
        $identity = $stmt->fetch(\PDO::FETCH_ASSOC);

        $dummyHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // valid fixed bcrypt hash for 'password'
        $hash = $identity ? $identity['password_hash'] : $dummyHash;

        $isValid = password_verify($password, $hash);

        if (!$identity || !$isValid) {
            $this->recordAttempt($username, $ip, false);
            Response::error('Giriş bilgileri geçersiz.', 'UNAUTHORIZED', 401);
        }

        if ($identity['account_status'] !== 'active' || $identity['member_status'] !== 'active' || $identity['deleted_at'] !== null) {
            $this->recordAttempt($username, $ip, false);
            Response::error('Giriş bilgileri geçersiz.', 'UNAUTHORIZED', 401);
        }

        $this->recordAttempt($username, $ip, true);

        if (password_needs_rehash($identity['password_hash'], defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
            if ($newHash !== false) {
                $upd = $this->db->prepare("UPDATE member_accounts SET password_hash = :hash WHERE id = :id");
                $upd->execute([':hash' => $newHash, ':id' => $identity['account_id']]);
            }
        }

        $upd = $this->db->prepare("UPDATE member_accounts SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id");
        $upd->execute([':ip' => $ip, ':id' => $identity['account_id']]);

        Session::regenerate();
        Session::rotateCsrfToken();
        
        $_SESSION['logged_in'] = true;
        $_SESSION['auth_realm'] = 'member';
        $_SESSION['member_account_id'] = (int)$identity['account_id'];
        $_SESSION['member_id'] = (int)$identity['member_id'];
        $_SESSION['member_auth_version'] = (int)$identity['auth_version'];
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();

        Response::json([
            'account' => [
                'id' => (int)$identity['account_id'],
                'uuid' => $identity['account_uuid'],
                'username' => $identity['username'],
                'must_change_password' => (bool)$identity['must_change_password']
            ],
            'member' => [
                'id' => (int)$identity['member_id'],
                'uuid' => $identity['member_uuid'],
                'first_name' => $identity['first_name'],
                'last_name' => $identity['last_name']
            ]
        ]);
    }

    public function me()
    {
        MemberAuthMiddleware::handle();

        $stmt = $this->db->prepare("
            SELECT ma.id as account_id, ma.uuid as account_uuid, ma.username, ma.status as account_status, ma.must_change_password,
                   m.id as member_id, m.uuid as member_uuid, m.first_name, m.last_name, m.status as member_status
            FROM member_accounts ma
            JOIN members m ON ma.member_id = m.id
            WHERE ma.id = :account_id
        ");
        $stmt->execute([':account_id' => $_SESSION['member_account_id']]);
        $identity = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$identity) {
            Session::destroy();
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
        }

        Response::json([
            'account' => [
                'id' => (int)$identity['account_id'],
                'uuid' => $identity['account_uuid'],
                'username' => $identity['username'],
                'status' => $identity['account_status'],
                'must_change_password' => (bool)$identity['must_change_password']
            ],
            'member' => [
                'id' => (int)$identity['member_id'],
                'uuid' => $identity['member_uuid'],
                'first_name' => $identity['first_name'],
                'last_name' => $identity['last_name'],
                'status' => $identity['member_status']
            ]
        ]);
    }

    public function logout()
    {
        MemberAuthMiddleware::handle();
        Session::destroy();
        Response::json(['success' => true]);
    }

    public function changePassword()
    {
        MemberAuthMiddleware::handle();
        CsrfMiddleware::handle();

        $input = $this->getJsonPayload();

        $allowedKeys = ['current_password', 'new_password'];
        if (count(array_diff(array_keys($input), $allowedKeys)) > 0 || count(array_diff($allowedKeys, array_keys($input))) > 0) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        if (!array_key_exists('current_password', $input) || !is_string($input['current_password']) || $input['current_password'] === '' || strlen($input['current_password']) > 256) {
            Response::error('Geçersiz format.', 'VALIDATION_ERROR', 422);
        }

        if (!array_key_exists('new_password', $input) || !is_string($input['new_password']) || strlen($input['new_password']) < 12 || strlen($input['new_password']) > 256 || $input['current_password'] === $input['new_password']) {
            Response::error('Yeni şifre geçerli değil.', 'VALIDATION_ERROR', 422);
        }
        
        $currentPassword = $input['current_password'];
        $newPassword = $input['new_password'];

        $this->db->beginTransaction();

        try {
            $stmt = $this->db->prepare("SELECT password_hash, auth_version FROM member_accounts WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $_SESSION['member_account_id']]);
            $account = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$account || !password_verify($currentPassword, $account['password_hash'])) {
                throw new \Exception('INVALID_CREDENTIALS', 401);
            }

            $newHash = password_hash($newPassword, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
            if ($newHash === false) {
                throw new \RuntimeException('Password hashing failed');
            }
            $newVersion = (int)$account['auth_version'] + 1;

            $upd = $this->db->prepare("
                UPDATE member_accounts 
                SET password_hash = :hash, must_change_password = 0, password_changed_at = NOW(), auth_version = :version
                WHERE id = :id
            ");
            $upd->execute([':hash' => $newHash, ':version' => $newVersion, ':id' => $_SESSION['member_account_id']]);

            $this->db->commit();
            
            Session::regenerate();
            Session::rotateCsrfToken();
            $_SESSION['member_auth_version'] = $newVersion;
            
            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() === 401) {
                Response::error('Mevcut şifre yanlış.', 'INVALID_CREDENTIALS', 401);
            }
            Response::error('Sunucu hatası', 'SERVER_ERROR', 500);
        }
    }
}
