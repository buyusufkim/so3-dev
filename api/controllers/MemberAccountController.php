<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;

class MemberAccountController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAccount($memberId)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        $stmt = $this->db->prepare("
            SELECT id, uuid, first_name, last_name, status, deleted_at 
            FROM members WHERE id = :id
        ");
        $stmt->execute([':id' => $memberId]);
        $member = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$member || $member['deleted_at'] !== null) {
            Response::error('Üye bulunamadı', 'NOT_FOUND', 404);
        }

        $stmt = $this->db->prepare("
            SELECT id, uuid, member_id, username, status, must_change_password, 
                   last_login_at, password_changed_at, created_at 
            FROM member_accounts 
            WHERE member_id = :member_id
        ");
        $stmt->execute([':member_id' => $memberId]);
        $account = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($account) {
            $account['id'] = (int)$account['id'];
            $account['member_id'] = (int)$account['member_id'];
            $account['must_change_password'] = (bool)$account['must_change_password'];
        }

        Response::json([
            'member' => [
                'id' => (int)$member['id'],
                'uuid' => $member['uuid'],
                'first_name' => $member['first_name'],
                'last_name' => $member['last_name'],
                'status' => $member['status']
            ],
            'account' => $account ?: null
        ]);
    }

    public function createAccount($memberId)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            Response::error('Geçersiz JSON payload', 'INVALID_JSON', 422);
        }

        $allowedKeys = ['username', 'password'];
        if (count(array_diff(array_keys($input), $allowedKeys)) > 0 || count(array_diff($allowedKeys, array_keys($input))) > 0) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!is_string($username) || !is_string($password)) {
            Response::error('Geçersiz format.', 'VALIDATION_ERROR', 422);
        }

        $username = strtolower($username);

        if (strlen($username) < 3 || strlen($username) > 50 || !preg_match('/^[a-z0-9._-]+$/', $username)) {
            Response::error('Kullanıcı adı geçerli değil.', 'VALIDATION_ERROR', 422);
        }

        if (strlen($password) < 12 || strlen($password) > 256) {
            Response::error('Şifre geçerli değil.', 'VALIDATION_ERROR', 422);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, deleted_at FROM members WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $memberId]);
            $member = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                throw new \Exception('NOT_FOUND', 404);
            }

            $stmt = $this->db->prepare("SELECT id FROM member_accounts WHERE member_id = :id");
            $stmt->execute([':id' => $memberId]);
            if ($stmt->fetch()) {
                throw new \Exception('MEMBER_ACCOUNT_ALREADY_EXISTS', 409);
            }

            $stmt = $this->db->prepare("SELECT id FROM member_accounts WHERE username = :username");
            $stmt->execute([':username' => $username]);
            if ($stmt->fetch()) {
                throw new \Exception('ACCOUNT_IDENTITY_CONFLICT', 409);
            }

            $hash = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
            $uuid = bin2hex(random_bytes(18)); // Ensure UUID generation or reuse existing function

            $stmt = $this->db->prepare("
                INSERT INTO member_accounts (uuid, member_id, username, password_hash, status, must_change_password, created_by, updated_by) 
                VALUES (:uuid, :member_id, :username, :hash, 'active', 1, :created_by, :updated_by)
            ");
            $stmt->execute([
                ':uuid' => $uuid,
                ':member_id' => $memberId,
                ':username' => $username,
                ':hash' => $hash,
                ':created_by' => $adminId,
                ':updated_by' => $adminId
            ]);
            $accountId = $this->db->lastInsertId();

            AuditLogger::log('member_account.create', $adminId, 'member_account', $accountId, [
                'member_id' => $memberId,
                'username' => $username
            ]);

            $this->db->commit();
            
            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() === 404) {
                Response::error('Üye bulunamadı', 'NOT_FOUND', 404);
            } elseif ($e->getCode() === 409) {
                Response::error($e->getMessage(), $e->getMessage(), 409);
            }
            Response::error('Sunucu hatası', 'SERVER_ERROR', 500);
        }
    }

    public function updateStatus($accountId)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input) || !isset($input['status'])) {
            Response::error('Geçersiz JSON payload', 'INVALID_JSON', 422);
        }

        $allowedKeys = ['status'];
        if (count(array_diff(array_keys($input), $allowedKeys)) > 0 || count(array_diff($allowedKeys, array_keys($input))) > 0) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        $status = $input['status'];
        if (!in_array($status, ['active', 'inactive'])) {
            Response::error('Geçersiz durum.', 'VALIDATION_ERROR', 422);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, status, auth_version, member_id, username FROM member_accounts WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $accountId]);
            $account = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$account) {
                throw new \Exception('NOT_FOUND', 404);
            }

            if ($account['status'] !== $status) {
                $newVersion = (int)$account['auth_version'];
                if ($status === 'inactive') {
                    $newVersion++;
                }

                $upd = $this->db->prepare("
                    UPDATE member_accounts 
                    SET status = :status, auth_version = :version, updated_by = :admin_id 
                    WHERE id = :id
                ");
                $upd->execute([
                    ':status' => $status,
                    ':version' => $newVersion,
                    ':admin_id' => $adminId,
                    ':id' => $accountId
                ]);

                AuditLogger::log('member_account.status_update', $adminId, 'member_account', $accountId, [
                    'member_id' => $account['member_id'],
                    'username' => $account['username'],
                    'new_status' => $status,
                    'auth_version' => $newVersion
                ]);
            }

            $this->db->commit();
            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() === 404) {
                Response::error('Hesap bulunamadı', 'NOT_FOUND', 404);
            }
            Response::error('Sunucu hatası', 'SERVER_ERROR', 500);
        }
    }

    public function resetPassword($accountId)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input) || !isset($input['password'])) {
            Response::error('Geçersiz JSON payload', 'INVALID_JSON', 422);
        }

        $allowedKeys = ['password'];
        if (count(array_diff(array_keys($input), $allowedKeys)) > 0 || count(array_diff($allowedKeys, array_keys($input))) > 0) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }

        $password = $input['password'];
        if (!is_string($password) || strlen($password) < 12 || strlen($password) > 256) {
            Response::error('Şifre geçerli değil.', 'VALIDATION_ERROR', 422);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, auth_version, member_id, username FROM member_accounts WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $accountId]);
            $account = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$account) {
                throw new \Exception('NOT_FOUND', 404);
            }

            $hash = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
            $newVersion = (int)$account['auth_version'] + 1;

            $upd = $this->db->prepare("
                UPDATE member_accounts 
                SET password_hash = :hash, must_change_password = 1, password_changed_at = NOW(), 
                    auth_version = :version, updated_by = :admin_id 
                WHERE id = :id
            ");
            $upd->execute([
                ':hash' => $hash,
                ':version' => $newVersion,
                ':admin_id' => $adminId,
                ':id' => $accountId
            ]);

            AuditLogger::log('member_account.password_reset', $adminId, 'member_account', $accountId, [
                'member_id' => $account['member_id'],
                'username' => $account['username'],
                'auth_version' => $newVersion
            ]);

            $this->db->commit();
            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() === 404) {
                Response::error('Hesap bulunamadı', 'NOT_FOUND', 404);
            }
            Response::error('Sunucu hatası', 'SERVER_ERROR', 500);
        }
    }
}
