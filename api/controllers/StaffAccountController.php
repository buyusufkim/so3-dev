<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;

class StaffAccountController
{
    private $db;
    private $managedRoles = ['admin', 'editor', 'reception'];

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getPayload()
    {
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $input = file_get_contents('php://input');
        if (strlen($input) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }

        return $data;
    }

    public function index()
    {
        AuthMiddleware::hasRole(['super_admin']);

        try {
            $inClause = implode(',', array_fill(0, count($this->managedRoles), '?'));
            $sql = "
                SELECT 
                    id, username, email, display_name, role, status, 
                    last_login_at, password_changed_at, created_at
                FROM admins 
                WHERE role IN ($inClause)
                ORDER BY created_at DESC
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($this->managedRoles);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format dates and cast types properly
            $items = [];
            foreach ($results as $row) {
                $items[] = [
                    'id' => (int)$row['id'],
                    'username' => $row['username'],
                    'email' => $row['email'],
                    'display_name' => $row['display_name'],
                    'role' => $row['role'],
                    'status' => $row['status'],
                    'last_login_at' => $row['last_login_at'],
                    'password_changed_at' => $row['password_changed_at'],
                    'created_at' => $row['created_at'],
                ];
            }

            Response::json(['items' => $items]);
        } catch (\Exception $e) {
            error_log('StaffAccountController@index Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function create()
    {
        AuthMiddleware::hasRole(['super_admin']);

        $data = $this->getPayload();

        $allowedKeys = ['username', 'email', 'display_name', 'password', 'role'];
        $diff = array_diff(array_keys($data), $allowedKeys);
        if (!empty($diff)) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        $username = isset($data['username']) ? $data['username'] : null;
        $email = isset($data['email']) ? $data['email'] : null;
        $display_name = isset($data['display_name']) ? $data['display_name'] : null;
        $password = isset($data['password']) ? $data['password'] : null;
        $role = isset($data['role']) ? $data['role'] : null;

        if (
            ($username !== null && !is_string($username)) ||
            ($email !== null && !is_string($email)) ||
            ($display_name !== null && !is_string($display_name)) ||
            ($password !== null && !is_string($password)) ||
            ($role !== null && !is_string($role))
        ) {
            Response::error('Geçersiz veri tipi.', 'VALIDATION_ERROR', 422);
        }

        $username = $username !== null ? trim($username) : null;
        $email = $email !== null ? trim($email) : null;
        $display_name = $display_name !== null ? trim($display_name) : null;

        if (!$username || strlen($username) < 3 || strlen($username) > 50 || !preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
            Response::error('Kullanıcı adı 3-50 karakter uzunluğunda olmalı ve sadece harf, sayı, nokta, tire veya alt çizgi içermelidir.', 'VALIDATION_ERROR', 422);
        }
        if (!$email || strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Geçerli bir e-posta adresi gereklidir (maksimum 100 karakter).', 'VALIDATION_ERROR', 422);
        }
        if (!$display_name || mb_strlen($display_name, 'UTF-8') < 2 || mb_strlen($display_name, 'UTF-8') > 100) {
            Response::error('Görünen ad 2-100 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }
        if (!$password || mb_strlen($password, 'UTF-8') < 12 || mb_strlen($password, 'UTF-8') > 256) {
            Response::error('Şifre 12-256 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }
        if (!in_array($role, $this->managedRoles, true)) {
            Response::error('Geçersiz rol belirtildi.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT id FROM admins WHERE username = ? OR email = ? FOR UPDATE");
            $stmt->execute([$username, $email]);
            if ($stmt->fetch()) {
                $this->db->rollBack();
                Response::error('Kullanıcı adı veya e-posta adresi zaten kullanımda.', 'ACCOUNT_IDENTITY_CONFLICT', 409);
            }

            $hashAlgo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
            $password_hash = password_hash($password, $hashAlgo);
            if ($password_hash === false) {
                throw new \RuntimeException('Password hashing failed');
            }

            $stmt = $this->db->prepare("
                INSERT INTO admins (username, email, display_name, password_hash, role, status) 
                VALUES (?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$username, $email, $display_name, $password_hash, $role]);
            
            $admin_id = $this->db->lastInsertId();

            $this->db->commit();

            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'staff_account.create',
                    $currentAdminId,
                    'admin',
                    $admin_id,
                    [
                        'username' => $username,
                        'email' => $email,
                        'role' => $role
                    ]
                );
            } catch (\Exception $e) {
                error_log('AuditLog error in StaffAccountController@create: ' . $e->getMessage());
            }

            Response::json([
                'id' => (int)$admin_id,
                'username' => $username,
                'email' => $email,
                'display_name' => $display_name,
                'role' => $role,
                'status' => 'active'
            ], 201);

        } catch (\PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() == 23000 && isset($e->errorInfo[1]) && $e->errorInfo[1] == 1062) {
                Response::error('Kullanıcı adı veya e-posta adresi zaten kullanımda.', 'ACCOUNT_IDENTITY_CONFLICT', 409);
            }
            error_log('StaffAccountController@create PDOException: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('StaffAccountController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    private function getTargetAccountForUpdate(int $id)
    {
        $stmt = $this->db->prepare("SELECT id, role, status FROM admins WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $target = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            $this->db->rollBack();
            Response::error('Hesap bulunamadı.', 'ACCOUNT_NOT_FOUND', 404);
            exit;
        }

        if (!in_array($target['role'], $this->managedRoles, true)) {
            $this->db->rollBack();
            Response::error('Bu hesap türü yönetilemez.', 'FORBIDDEN', 403);
            exit;
        }

        $stmt2 = $this->db->prepare("SELECT id FROM trainers WHERE admin_id = ?");
        $stmt2->execute([$id]);
        if ($stmt2->fetch()) {
            $this->db->rollBack();
            Response::error('Eğitmen hesapları bu akıştan yönetilemez.', 'CONFLICT', 409);
            exit;
        }

        return $target;
    }

    public function updateStatus(int $id)
    {
        AuthMiddleware::hasRole(['super_admin']);
        $data = $this->getPayload();

        $status = isset($data['status']) ? $data['status'] : null;
        if ($status !== 'active' && $status !== 'inactive') {
            Response::error('Durum active veya inactive olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        $allowedKeys = ['status'];
        $diff = array_diff(array_keys($data), $allowedKeys);
        if (!empty($diff)) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $target = $this->getTargetAccountForUpdate($id);

            if ($target['status'] === $status) {
                $this->db->rollBack();
                Response::json(['message' => 'Status zaten güncel']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE admins SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);

            $this->db->commit();

            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'staff_account.status_update',
                    $currentAdminId,
                    'admin',
                    $id,
                    [
                        'old_status' => $target['status'],
                        'new_status' => $status
                    ]
                );
            } catch (\Exception $e) {
                error_log('AuditLog error in StaffAccountController@updateStatus: ' . $e->getMessage());
            }

            Response::json(['message' => 'Status updated']);
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('StaffAccountController@updateStatus Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function updateRole(int $id)
    {
        AuthMiddleware::hasRole(['super_admin']);
        $data = $this->getPayload();

        $role = isset($data['role']) ? $data['role'] : null;
        if (!in_array($role, $this->managedRoles, true)) {
            Response::error('Geçersiz rol.', 'VALIDATION_ERROR', 422);
        }

        $allowedKeys = ['role'];
        $diff = array_diff(array_keys($data), $allowedKeys);
        if (!empty($diff)) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $target = $this->getTargetAccountForUpdate($id);

            if ($target['role'] === $role) {
                $this->db->rollBack();
                Response::json(['message' => 'Rol zaten güncel']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE admins SET role = ? WHERE id = ?");
            $stmt->execute([$role, $id]);

            $this->db->commit();

            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'staff_account.role_update',
                    $currentAdminId,
                    'admin',
                    $id,
                    [
                        'old_role' => $target['role'],
                        'new_role' => $role
                    ]
                );
            } catch (\Exception $e) {
                error_log('AuditLog error in StaffAccountController@updateRole: ' . $e->getMessage());
            }

            Response::json(['message' => 'Role updated']);
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('StaffAccountController@updateRole Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function resetPassword(int $id)
    {
        AuthMiddleware::hasRole(['super_admin']);
        $data = $this->getPayload();

        $password = isset($data['password']) ? $data['password'] : null;
        if (!$password || mb_strlen($password, 'UTF-8') < 12 || mb_strlen($password, 'UTF-8') > 256) {
            Response::error('Şifre 12-256 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        $allowedKeys = ['password'];
        $diff = array_diff(array_keys($data), $allowedKeys);
        if (!empty($diff)) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $target = $this->getTargetAccountForUpdate($id);

            $hashAlgo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
            $password_hash = password_hash($password, $hashAlgo);
            if ($password_hash === false) {
                throw new \RuntimeException('Password hashing failed');
            }

            $stmt = $this->db->prepare("UPDATE admins SET password_hash = ?, password_changed_at = NOW() WHERE id = ?");
            $stmt->execute([$password_hash, $id]);

            $this->db->commit();

            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'staff_account.password_reset',
                    $currentAdminId,
                    'admin',
                    $id,
                    []
                );
            } catch (\Exception $e) {
                error_log('AuditLog error in StaffAccountController@resetPassword: ' . $e->getMessage());
            }

            Response::json(['message' => 'Password reset successfully']);
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('StaffAccountController@resetPassword Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
