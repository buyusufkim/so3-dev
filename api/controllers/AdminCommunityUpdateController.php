<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;

class AdminCommunityUpdateController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getJsonPayload(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }

        if (strlen($raw) > 32768) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $isObj = json_decode($raw, false);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)) {
            Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private function validateTitle(string $title): string
    {
        $trimmed = trim($title);
        $len = mb_strlen($trimmed, 'UTF-8');
        if ($len < 1 || $len > 160) {
            Response::error('Başlık 1 ile 160 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }
        return $trimmed;
    }

    private function validateBody(string $body): string
    {
        $trimmed = trim($body);
        $len = mb_strlen($trimmed, 'UTF-8');
        if ($len < 1 || $len > 5000) {
            Response::error('İçerik 1 ile 5000 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }
        return $trimmed;
    }

    private function formatListRow(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'uuid' => (string)$row['uuid'],
            'title' => (string)$row['title'],
            'status' => (string)$row['status'],
            'published_at' => $row['published_at'] !== null ? (string)$row['published_at'] : null,
            'created_at' => (string)$row['created_at'],
            'updated_at' => (string)$row['updated_at']
        ];
    }

    private function formatDetailRow(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'uuid' => (string)$row['uuid'],
            'title' => (string)$row['title'],
            'body' => (string)$row['body'],
            'status' => (string)$row['status'],
            'published_at' => $row['published_at'] !== null ? (string)$row['published_at'] : null,
            'created_at' => (string)$row['created_at'],
            'updated_at' => (string)$row['updated_at']
        ];
    }

    /**
     * GET /api/admin/community-updates
     */
    public function index(): void
    {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        // Strict query allowlist: exactly status, page, per_page allowed
        $allowedQueryKeys = ['status', 'page', 'per_page'];
        foreach (array_keys($_GET) as $key) {
            if (!in_array($key, $allowedQueryKeys, true)) {
                Response::error("Geçersiz sorgu parametresi: $key", 'VALIDATION_ERROR', 422);
            }
        }

        $page = 1;
        if (isset($_GET['page'])) {
            $rawPage = $_GET['page'];
            if (!is_numeric($rawPage) || (int)$rawPage < 1 || (string)(int)$rawPage !== (string)$rawPage) {
                Response::error('Geçersiz sayfa numarası.', 'VALIDATION_ERROR', 422);
            }
            $page = (int)$rawPage;
        }

        $perPage = 20;
        if (isset($_GET['per_page'])) {
            $rawPerPage = $_GET['per_page'];
            if (!is_numeric($rawPerPage) || (int)$rawPerPage < 1 || (int)$rawPerPage > 50 || (string)(int)$rawPerPage !== (string)$rawPerPage) {
                Response::error('Geçersiz sayfa boyutu (1-50 arası olmalıdır).', 'VALIDATION_ERROR', 422);
            }
            $perPage = (int)$rawPerPage;
        }

        $statusFilter = null;
        if (isset($_GET['status']) && $_GET['status'] !== '' && $_GET['status'] !== 'all') {
            $status = (string)$_GET['status'];
            if (!in_array($status, ['draft', 'published'], true)) {
                Response::error('Geçersiz durum filtresi.', 'VALIDATION_ERROR', 422);
            }
            $statusFilter = $status;
        }

        $whereClauses = ['deleted_at IS NULL'];
        $params = [];

        if ($statusFilter !== null) {
            $whereClauses[] = 'status = :status';
            $params[':status'] = $statusFilter;
        }

        $whereSql = implode(' AND ', $whereClauses);

        // Count query
        $countSql = "SELECT COUNT(*) FROM community_updates WHERE $whereSql";
        $countStmt = $this->db->prepare($countSql);
        foreach ($params as $k => $v) {
            $countStmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;

        // Select query - List row strictly excludes body and internal actor fields
        // Canonical ordering: created_at DESC, id DESC
        $selectSql = "
            SELECT 
                id,
                uuid,
                title,
                status,
                published_at,
                created_at,
                updated_at
            FROM community_updates
            WHERE $whereSql
            ORDER BY created_at DESC, id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($selectSql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $items = array_map([$this, 'formatListRow'], $rows);

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
     * GET /api/admin/community-updates/{id}
     */
    public function show(int $id): void
    {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        $stmt = $this->db->prepare("
            SELECT 
                id,
                uuid,
                title,
                body,
                status,
                published_at,
                created_at,
                updated_at
            FROM community_updates
            WHERE id = :id AND deleted_at IS NULL
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Duyuru bulunamadı.', 'NOT_FOUND', 404);
        }

        Response::json([
            'update' => $this->formatDetailRow($row)
        ]);
    }

    /**
     * POST /api/admin/community-updates
     */
    public function create(): void
    {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = (int)($_SESSION['admin_id'] ?? 0);

        $payload = $this->getJsonPayload();

        $allowedKeys = ['title', 'body', 'status'];
        foreach (array_keys($payload) as $key) {
            if (!in_array($key, $allowedKeys, true)) {
                Response::error("Geçersiz alan: $key", 'VALIDATION_ERROR', 422);
            }
        }

        if (!isset($payload['title']) || !is_string($payload['title'])) {
            Response::error('Başlık zorunludur.', 'VALIDATION_ERROR', 422);
        }
        $title = $this->validateTitle($payload['title']);

        if (!isset($payload['body']) || !is_string($payload['body'])) {
            Response::error('İçerik zorunludur.', 'VALIDATION_ERROR', 422);
        }
        $body = $this->validateBody($payload['body']);

        $status = 'draft';
        if (isset($payload['status'])) {
            if (!in_array($payload['status'], ['draft', 'published'], true)) {
                Response::error('Geçersiz durum. Yalnızca draft veya published olabilir.', 'VALIDATION_ERROR', 422);
            }
            $status = (string)$payload['status'];
        }

        $now = (new \DateTime('now', new \DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');
        $publishedAt = ($status === 'published') ? $now : null;
        $uuid = $this->generateUuid();

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO community_updates (
                    uuid, title, body, status, published_at, 
                    created_by_admin_id, updated_by_admin_id
                ) VALUES (
                    :uuid, :title, :body, :status, :published_at,
                    :created_by_admin_id, :updated_by_admin_id
                )
            ");
            $stmt->bindValue(':uuid', $uuid, PDO::PARAM_STR);
            $stmt->bindValue(':title', $title, PDO::PARAM_STR);
            $stmt->bindValue(':body', $body, PDO::PARAM_STR);
            $stmt->bindValue(':status', $status, PDO::PARAM_STR);
            $stmt->bindValue(':published_at', $publishedAt, $publishedAt !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':created_by_admin_id', $adminId, PDO::PARAM_INT);
            $stmt->bindValue(':updated_by_admin_id', $adminId, PDO::PARAM_INT);
            $stmt->execute();

            $insertId = (int)$this->db->lastInsertId();

            $this->db->commit();

            try {
                AuditLogger::log('community_update.create', $adminId, 'community_update', $insertId, [
                    'title' => $title,
                    'status' => $status,
                    'published_at' => $publishedAt
                ]);
            } catch (\Throwable $e) {
                error_log('AuditLog error: ' . $e->getMessage());
            }

            $stmtShow = $this->db->prepare("
                SELECT 
                    id,
                    uuid,
                    title,
                    body,
                    status,
                    published_at,
                    created_at,
                    updated_at
                FROM community_updates
                WHERE id = :id
            ");
            $stmtShow->bindValue(':id', $insertId, PDO::PARAM_INT);
            $stmtShow->execute();
            $row = $stmtShow->fetch(PDO::FETCH_ASSOC);

            Response::json([
                'update' => $this->formatDetailRow($row)
            ], 201);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Duyuru oluşturulamadı.', 'COMMUNITY_UPDATE_CREATE_ERROR', 500);
        }
    }

    /**
     * PATCH /api/admin/community-updates/{id}
     */
    public function update(int $id): void
    {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = (int)($_SESSION['admin_id'] ?? 0);

        $payload = $this->getJsonPayload();

        $allowedKeys = ['title', 'body', 'status'];
        foreach (array_keys($payload) as $key) {
            if (!in_array($key, $allowedKeys, true)) {
                Response::error("Geçersiz alan: $key", 'VALIDATION_ERROR', 422);
            }
        }

        if (empty($payload)) {
            Response::error('Güncellenecek alan bulunamadı.', 'VALIDATION_ERROR', 422);
        }

        $this->db->beginTransaction();
        try {
            $stmtLock = $this->db->prepare("
                SELECT id, status, published_at 
                FROM community_updates 
                WHERE id = :id AND deleted_at IS NULL 
                FOR UPDATE
            ");
            $stmtLock->bindValue(':id', $id, PDO::PARAM_INT);
            $stmtLock->execute();
            $current = $stmtLock->fetch(PDO::FETCH_ASSOC);

            if (!$current) {
                $this->db->rollBack();
                Response::error('Duyuru bulunamadı.', 'NOT_FOUND', 404);
            }

            $updateFields = [];
            $params = [':id' => $id, ':updated_by_admin_id' => $adminId];

            if (array_key_exists('title', $payload)) {
                if (!is_string($payload['title'])) {
                    $this->db->rollBack();
                    Response::error('Başlık geçerli bir metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $cleanTitle = $this->validateTitle($payload['title']);
                $updateFields[] = 'title = :title';
                $params[':title'] = $cleanTitle;
            }

            if (array_key_exists('body', $payload)) {
                if (!is_string($payload['body'])) {
                    $this->db->rollBack();
                    Response::error('İçerik geçerli bir metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $cleanBody = $this->validateBody($payload['body']);
                $updateFields[] = 'body = :body';
                $params[':body'] = $cleanBody;
            }

            if (array_key_exists('status', $payload)) {
                if (!in_array($payload['status'], ['draft', 'published'], true)) {
                    $this->db->rollBack();
                    Response::error('Geçersiz durum. Yalnızca draft veya published olabilir.', 'VALIDATION_ERROR', 422);
                }
                $newStatus = (string)$payload['status'];
                $updateFields[] = 'status = :status';
                $params[':status'] = $newStatus;

                // Lifecycle of published_at:
                // Canonical rule:
                // If transitioning to 'published' AND published_at is currently NULL -> set to now
                // If transitioning to 'published' AND published_at is ALREADY NOT NULL -> preserve stored published_at (republish)
                // If transitioning to 'draft' -> preserve stored published_at (do NOT null it)
                if ($newStatus === 'published' && $current['published_at'] === null) {
                    $now = (new \DateTime('now', new \DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');
                    $updateFields[] = 'published_at = :published_at';
                    $params[':published_at'] = $now;
                }
            }

            $updateFields[] = 'updated_by_admin_id = :updated_by_admin_id';

            $sql = "UPDATE community_updates SET " . implode(', ', $updateFields) . " WHERE id = :id";
            $updateStmt = $this->db->prepare($sql);
            foreach ($params as $k => $v) {
                if ($v === null) {
                    $updateStmt->bindValue($k, null, PDO::PARAM_NULL);
                } elseif (is_int($v)) {
                    $updateStmt->bindValue($k, $v, PDO::PARAM_INT);
                } else {
                    $updateStmt->bindValue($k, $v, PDO::PARAM_STR);
                }
            }
            $updateStmt->execute();

            $this->db->commit();

            try {
                AuditLogger::log('community_update.update', $adminId, 'community_update', $id, [
                    'updated_fields' => array_keys($payload)
                ]);
            } catch (\Throwable $e) {
                error_log('AuditLog error: ' . $e->getMessage());
            }

            $stmtShow = $this->db->prepare("
                SELECT 
                    id,
                    uuid,
                    title,
                    body,
                    status,
                    published_at,
                    created_at,
                    updated_at
                FROM community_updates
                WHERE id = :id
            ");
            $stmtShow->bindValue(':id', $id, PDO::PARAM_INT);
            $stmtShow->execute();
            $row = $stmtShow->fetch(PDO::FETCH_ASSOC);

            Response::json([
                'update' => $this->formatDetailRow($row)
            ]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Duyuru güncellenemedi.', 'COMMUNITY_UPDATE_UPDATE_ERROR', 500);
        }
    }

    /**
     * DELETE /api/admin/community-updates/{id}
     */
    public function destroy(int $id): void
    {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = (int)($_SESSION['admin_id'] ?? 0);

        $now = (new \DateTime('now', new \DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');

        $this->db->beginTransaction();
        try {
            $stmtLock = $this->db->prepare("
                SELECT id 
                FROM community_updates 
                WHERE id = :id AND deleted_at IS NULL 
                FOR UPDATE
            ");
            $stmtLock->bindValue(':id', $id, PDO::PARAM_INT);
            $stmtLock->execute();
            if (!$stmtLock->fetch()) {
                $this->db->rollBack();
                Response::error('Duyuru bulunamadı.', 'NOT_FOUND', 404);
            }

            $stmt = $this->db->prepare("
                UPDATE community_updates 
                SET deleted_at = :deleted_at, updated_by_admin_id = :admin_id 
                WHERE id = :id
            ");
            $stmt->bindValue(':deleted_at', $now, PDO::PARAM_STR);
            $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $this->db->commit();

            try {
                AuditLogger::log('community_update.delete', $adminId, 'community_update', $id, []);
            } catch (\Throwable $e) {
                error_log('AuditLog error: ' . $e->getMessage());
            }

            Response::json([
                'deleted' => true,
                'id' => $id
            ]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Duyuru silinemedi.', 'COMMUNITY_UPDATE_DELETE_ERROR', 500);
        }
    }
}
