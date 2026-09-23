<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use PDO;

class AdminNotificationController
{
    /**
     * Map database row to safe API projection.
     * Internal fields (recipient_admin_id, source_key) are never exposed.
     */
    private function mapNotification(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'uuid' => (string)$row['uuid'],
            'type' => (string)$row['type'],
            'severity' => (string)$row['severity'],
            'title' => (string)$row['title'],
            'body' => (string)$row['body'],
            'entity_type' => $row['entity_type'] !== null ? (string)$row['entity_type'] : null,
            'entity_id' => $row['entity_id'] !== null ? (int)$row['entity_id'] : null,
            'action_path' => $row['action_path'] !== null ? (string)$row['action_path'] : null,
            'is_read' => $row['read_at'] !== null,
            'read_at' => $row['read_at'] !== null ? (string)$row['read_at'] : null,
            'is_dismissed' => $row['dismissed_at'] !== null,
            'dismissed_at' => $row['dismissed_at'] !== null ? (string)$row['dismissed_at'] : null,
            'created_at' => (string)$row['created_at'],
        ];
    }

    /**
     * GET /api/admin/notifications
     * List current admin's notifications with pagination, view filter, and independent unread count.
     */
    public function index()
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if ($adminId <= 0) {
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
            return;
        }

        // 1. Strict query parameter allowlist
        $allowedKeys = ['view', 'page', 'per_page'];
        $requestKeys = array_keys($_GET);
        $extraKeys = array_diff($requestKeys, $allowedKeys);

        if (!empty($extraKeys)) {
            Response::error('Geçersiz sorgu parametresi.', 'VALIDATION_ERROR', 422);
            return;
        }

        // 2. Validate view parameter (default: active)
        $view = $_GET['view'] ?? 'active';
        if (!is_string($view) || !in_array($view, ['active', 'unread', 'dismissed'], true)) {
            Response::error('Geçersiz view parametresi.', 'VALIDATION_ERROR', 422);
            return;
        }

        // 3. Validate page parameter (default: 1, >= 1 canonical integer)
        $page = 1;
        if (isset($_GET['page'])) {
            $rawPage = $_GET['page'];
            if (!is_string($rawPage) || !preg_match('/^[1-9]\d*$/', $rawPage)) {
                Response::error('page pozitif bir tam sayı olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            $page = (int)$rawPage;
        }

        // 4. Validate per_page parameter (default: 20, 1..100 canonical integer)
        $perPage = 20;
        if (isset($_GET['per_page'])) {
            $rawPerPage = $_GET['per_page'];
            if (!is_string($rawPerPage) || !preg_match('/^[1-9]\d*$/', $rawPerPage)) {
                Response::error('per_page pozitif bir tam sayı olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            $perPage = (int)$rawPerPage;
            if ($perPage < 1 || $perPage > 100) {
                Response::error('per_page 1 ile 100 arasında olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
        }

        try {
            $db = Database::getInstance()->getConnection();

            // 5. Page-independent unread count for current recipient
            $unreadStmt = $db->prepare("
                SELECT COUNT(*) 
                FROM admin_notifications 
                WHERE recipient_admin_id = :admin_id 
                  AND dismissed_at IS NULL 
                  AND read_at IS NULL
            ");
            $unreadStmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $unreadStmt->execute();
            $unreadCount = (int)$unreadStmt->fetchColumn();

            // 6. View predicate for pagination & items
            $viewClause = "";
            if ($view === 'active') {
                $viewClause = "AND dismissed_at IS NULL";
            } elseif ($view === 'unread') {
                $viewClause = "AND dismissed_at IS NULL AND read_at IS NULL";
            } elseif ($view === 'dismissed') {
                $viewClause = "AND dismissed_at IS NOT NULL";
            }

            // 7. Total count for selected view
            $countStmt = $db->prepare("
                SELECT COUNT(*) 
                FROM admin_notifications 
                WHERE recipient_admin_id = :admin_id $viewClause
            ");
            $countStmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $countStmt->execute();
            $total = (int)$countStmt->fetchColumn();

            $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
            $offset = ($page - 1) * $perPage;

            // 8. Fetch items ordered newest first
            $stmt = $db->prepare("
                SELECT id, uuid, type, severity, title, body, entity_type, entity_id, action_path, read_at, dismissed_at, created_at
                FROM admin_notifications
                WHERE recipient_admin_id = :admin_id $viewClause
                ORDER BY created_at DESC, id DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_map([$this, 'mapNotification'], $rows);

            Response::json([
                'unread_count' => $unreadCount,
                'view' => $view,
                'items' => $items,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'per_page' => $perPage,
                    'last_page' => $lastPage,
                ],
            ]);
        } catch (\Throwable $e) {
            error_log("AdminNotificationController index error: " . $e->getMessage());
            Response::error('Bildirimler alınırken bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * PATCH /api/admin/notifications/:id/read
     * Mark notification as read (idempotent, recipient-scoped).
     */
    public function markRead($id)
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if ($adminId <= 0) {
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
            return;
        }

        $id = (int)$id;
        if ($id <= 0) {
            Response::error('Geçersiz bildirim ID.', 'VALIDATION_ERROR', 422);
            return;
        }

        if (!empty($_GET)) {
            Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);
            return;
        }

        $rawBody = trim(file_get_contents('php://input'));
        if ($rawBody === '') {
            Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        $decoded = json_decode($rawBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
            return;
        }

        if (!($decoded instanceof \stdClass)) {
            Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        if (count(get_object_vars($decoded)) !== 0) {
            Response::error('İstek gövdesi (body) boş olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        try {
            $db = Database::getInstance()->getConnection();

            // Check existence scoped strictly by recipient
            $fetchStmt = $db->prepare("
                SELECT id, uuid, type, severity, title, body, entity_type, entity_id, action_path, read_at, dismissed_at, created_at
                FROM admin_notifications
                WHERE id = :id AND recipient_admin_id = :admin_id
            ");
            $fetchStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $fetchStmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $fetchStmt->execute();

            $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                Response::error('Bildirim bulunamadı.', 'NOT_FOUND', 404);
                return;
            }

            // Idempotent mark-read: update only if currently unread
            if ($row['read_at'] === null) {
                $updateStmt = $db->prepare("
                    UPDATE admin_notifications
                    SET read_at = CURRENT_TIMESTAMP
                    WHERE id = :id AND recipient_admin_id = :admin_id AND read_at IS NULL
                ");
                $updateStmt->bindValue(':id', $id, PDO::PARAM_INT);
                $updateStmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
                $updateStmt->execute();

                // Refetch updated row
                $fetchStmt->execute();
                $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);
            }

            Response::json([
                'notification' => $this->mapNotification($row)
            ]);
        } catch (\Throwable $e) {
            error_log("AdminNotificationController markRead error: " . $e->getMessage());
            Response::error('Bildirim güncellenirken bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * PATCH /api/admin/notifications/:id/dismiss
     * Dismiss notification (idempotent, recipient-scoped; dismiss implies read).
     */
    public function dismiss($id)
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if ($adminId <= 0) {
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
            return;
        }

        $id = (int)$id;
        if ($id <= 0) {
            Response::error('Geçersiz bildirim ID.', 'VALIDATION_ERROR', 422);
            return;
        }

        if (!empty($_GET)) {
            Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);
            return;
        }

        $rawBody = trim(file_get_contents('php://input'));
        if ($rawBody === '') {
            Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        $decoded = json_decode($rawBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
            return;
        }

        if (!($decoded instanceof \stdClass)) {
            Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        if (count(get_object_vars($decoded)) !== 0) {
            Response::error('İstek gövdesi (body) boş olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        try {
            $db = Database::getInstance()->getConnection();

            // Check existence scoped strictly by recipient
            $fetchStmt = $db->prepare("
                SELECT id, uuid, type, severity, title, body, entity_type, entity_id, action_path, read_at, dismissed_at, created_at
                FROM admin_notifications
                WHERE id = :id AND recipient_admin_id = :admin_id
            ");
            $fetchStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $fetchStmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $fetchStmt->execute();

            $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                Response::error('Bildirim bulunamadı.', 'NOT_FOUND', 404);
                return;
            }

            // Idempotent dismiss: update only if not currently dismissed.
            // Dismiss implies read: read_at is set to CURRENT_TIMESTAMP if currently null.
            if ($row['dismissed_at'] === null) {
                $updateStmt = $db->prepare("
                    UPDATE admin_notifications
                    SET dismissed_at = CURRENT_TIMESTAMP,
                        read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                    WHERE id = :id AND recipient_admin_id = :admin_id AND dismissed_at IS NULL
                ");
                $updateStmt->bindValue(':id', $id, PDO::PARAM_INT);
                $updateStmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
                $updateStmt->execute();

                // Refetch updated row
                $fetchStmt->execute();
                $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);
            }

            Response::json([
                'notification' => $this->mapNotification($row)
            ]);
        } catch (\Throwable $e) {
            error_log("AdminNotificationController dismiss error: " . $e->getMessage());
            Response::error('Bildirim kapatılırken bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
