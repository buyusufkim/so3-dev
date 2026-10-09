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
     * GET /api/member/community/updates
     */
    public function index(): void
    {
        $this->guard();

        $page = isset($_GET['page']) ? filter_var($_GET['page'], FILTER_VALIDATE_INT) : 1;
        if ($page === false || $page < 1) {
            $page = 1;
        }

        $perPage = isset($_GET['per_page']) ? filter_var($_GET['per_page'], FILTER_VALIDATE_INT) : 20;
        if ($perPage === false || $perPage < 1) {
            $perPage = 20;
        } elseif ($perPage > 50) {
            $perPage = 50;
        }

        $now = (new \DateTime('now', new \DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');

        // Count query
        $countSql = "
            SELECT COUNT(*) 
            FROM community_updates 
            WHERE status = 'published' 
              AND published_at IS NOT NULL 
              AND published_at <= :now
              AND deleted_at IS NULL
        ";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->bindValue(':now', $now, PDO::PARAM_STR);
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;

        // Select query - strictly published only, ordered by published_at DESC, id DESC
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
              AND published_at <= :now
              AND deleted_at IS NULL
            ORDER BY published_at DESC, id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($selectSql);
        $stmt->bindValue(':now', $now, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $items = array_map([$this, 'formatRow'], $rows);

        Response::json([
            'items' => $items,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => (int)(ceil($total / $perPage) ?: 1)
            ]
        ]);
    }

    /**
     * GET /api/member/community/updates/{id}
     */
    public function show(int $id): void
    {
        $this->guard();

        $now = (new \DateTime('now', new \DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            SELECT 
                id,
                uuid,
                title,
                body,
                published_at
            FROM community_updates
            WHERE id = :id
              AND status = 'published' 
              AND published_at IS NOT NULL 
              AND published_at <= :now
              AND deleted_at IS NULL
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':now', $now, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Duyuru bulunamadı.', 'NOT_FOUND', 404);
        }

        Response::json([
            'update' => $this->formatRow($row)
        ]);
    }
}
