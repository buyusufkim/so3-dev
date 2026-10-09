<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\MemberAuthMiddleware;
use PDO;

class MemberCommunityUpdateController
{
    private PDO $db;
    private int $memberId;
    private int $accountId;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function guard(): void
    {
        MemberAuthMiddleware::handle();
        $this->memberId = (int)($_SESSION['member_id'] ?? 0);
        $this->accountId = (int)($_SESSION['member_account_id'] ?? 0);

        // Check account exists and password change not pending
        $stmt = $this->db->prepare("SELECT id, must_change_password, status FROM member_accounts WHERE id = :id");
        $stmt->execute([':id' => $this->accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$account || $account['status'] !== 'active') {
            Response::error('Yetkisiz erişim.', 'UNAUTHORIZED', 401);
        }

        if ((int)$account['must_change_password'] === 1) {
            Response::error('Devam etmek için önce şifrenizi değiştirmeniz gerekiyor.', 'PASSWORD_CHANGE_REQUIRED', 403);
        }
    }

    private function formatRow(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'uuid' => (string)$row['uuid'],
            'title' => (string)$row['title'],
            'body' => (string)$row['body'],
            'published_at' => (string)$row['published_at']
        ];
    }

    /**
     * GET /api/member/community-updates
     */
    public function index(): void
    {
        $this->guard();

        // Member endpoint must reject ANY query parameters
        if (!empty($_GET)) {
            Response::error('Sorgu parametreleri kabul edilmemektedir.', 'VALIDATION_ERROR', 422);
        }

        // Bounded feed query: LIMIT 50, ORDER BY published_at DESC, id DESC
        $selectSql = "
            SELECT 
                id,
                uuid,
                title,
                body,
                published_at
            FROM community_updates
            WHERE status = 'published' 
              AND published_at IS NOT NULL 
              AND deleted_at IS NULL
            ORDER BY published_at DESC, id DESC
            LIMIT 50
        ";

        $stmt = $this->db->query($selectSql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $items = array_map([$this, 'formatRow'], $rows);

        Response::json([
            'items' => $items
        ]);
    }
}
