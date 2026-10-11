<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\MemberAuthMiddleware;
use PDO;

class MemberProfileController
{
    private $db;
    private $memberId;
    private $accountId;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function rejectQueryParams(): void
    {
        if (!empty($_GET)) {
            Response::error('Sorgu parametreleri kabul edilmiyor.', 'VALIDATION_ERROR', 422);
        }
    }

    private function guard(): void
    {
        MemberAuthMiddleware::handle();
        $this->memberId = (int)($_SESSION['member_id'] ?? 0);
        $this->accountId = (int)($_SESSION['member_account_id'] ?? 0);

        $this->rejectQueryParams();

        if ($this->memberId <= 0 || $this->accountId <= 0) {
            Response::error('Yetkisiz erişim.', 'UNAUTHORIZED', 401);
        }

        $stmt = $this->db->prepare("SELECT must_change_password FROM member_accounts WHERE id = :id");
        $stmt->execute([':id' => $this->accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$account) {
            Response::error('Yetkisiz erişim.', 'UNAUTHORIZED', 401);
        }

        if ((int)$account['must_change_password'] === 1) {
            Response::error('Devam etmek için önce şifrenizi değiştirmeniz gerekiyor.', 'PASSWORD_CHANGE_REQUIRED', 403);
        }
    }

    public function getProfile(): void
    {
        $this->guard();

        $stmt = $this->db->prepare("
            SELECT ma.username, ma.status AS account_status,
                   m.first_name, m.last_name, m.phone, m.email,
                   m.emergency_contact_name, m.emergency_contact_phone
            FROM member_accounts ma
            JOIN members m ON ma.member_id = m.id
            WHERE ma.id = :account_id
              AND ma.member_id = :member_id
              AND ma.status = 'active'
              AND m.status = 'active'
              AND m.deleted_at IS NULL
        ");
        $stmt->execute([
            ':account_id' => $this->accountId,
            ':member_id' => $this->memberId
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Profil bulunamadı.', 'NOT_FOUND', 404);
        }

        Response::json([
            'account' => [
                'username' => (string)$row['username'],
                'status' => (string)$row['account_status'],
            ],
            'profile' => [
                'first_name' => (string)$row['first_name'],
                'last_name' => (string)$row['last_name'],
                'phone' => (string)$row['phone'],
                'email' => $row['email'] !== null ? (string)$row['email'] : null,
                'emergency_contact_name' => $row['emergency_contact_name'] !== null ? (string)$row['emergency_contact_name'] : null,
                'emergency_contact_phone' => $row['emergency_contact_phone'] !== null ? (string)$row['emergency_contact_phone'] : null,
            ],
        ]);
    }
}
