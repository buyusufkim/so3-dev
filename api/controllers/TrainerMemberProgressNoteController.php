<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;
use Throwable;
use DateTime;
use Exception;

class TrainerMemberProgressNoteController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfileId(): int {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->execute([$adminId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return (int)$trainer['id'];
    }

    private function getTrainerProfileIdForUpdate(): int {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
            FOR UPDATE
        ");
        $stmt->execute([$adminId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return (int)$trainer['id'];
    }

    private function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getJsonPayload(): array {
        $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
        if (strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0) {
            Response::error('Content-Type must be exactly application/json', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false) { 
            Response::error('Empty JSON payload', 'BAD_REQUEST', 400);
        }
        if (strlen($raw) > 16384) {
            Response::error('Payload too large', 'PAYLOAD_TOO_LARGE', 413);
        }
        if (trim($raw) === '') {
            Response::error('Empty JSON payload', 'BAD_REQUEST', 400);
        }

        $isObj = json_decode($raw, false);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)) {
            Response::error('Invalid JSON', 'BAD_REQUEST', 400);
        }

        $data = json_decode($raw, true);
        
        $forbidden = ['id', 'uuid', 'member_id', 'trainer_id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by'];
        foreach ($forbidden as $f) {
            if (array_key_exists($f, $data)) {
                Response::error("Field '$f' is not allowed", 'VALIDATION_ERROR', 422);
            }
        }

        return $data;
    }

    public function index(int $memberId): void {
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();

        $pageRaw = $_GET['page'] ?? '1';
        $perPageRaw = $_GET['per_page'] ?? '20';

        if (!is_string($pageRaw) || !preg_match('/^[1-9]\d*$/', $pageRaw)) {
            Response::error("Invalid page parameter", 'VALIDATION_ERROR', 422);
        }
        if (!is_string($perPageRaw) || !preg_match('/^[1-9]\d*$/', $perPageRaw)) {
            Response::error("Invalid per_page parameter", 'VALIDATION_ERROR', 422);
        }

        $page = (int)$pageRaw;
        $perPage = (int)$perPageRaw;

        if ((string)$page !== $pageRaw || (string)$perPage !== $perPageRaw) {
            Response::error("Pagination parameter out of range", 'VALIDATION_ERROR', 422);
        }
        if ($perPage > 100) {
            Response::error("per_page cannot exceed 100", 'VALIDATION_ERROR', 422);
        }
        if (($page - 1) > intdiv(PHP_INT_MAX, $perPage)) {
            Response::error("Pagination offset overflow", 'VALIDATION_ERROR', 422);
        }
        $offset = ($page - 1) * $perPage;

        $deleted = $_GET['deleted'] ?? 'active';
        if (!in_array($deleted, ['active', 'deleted', 'all'], true)) {
            Response::error("Invalid deleted parameter", 'VALIDATION_ERROR', 422);
        }

        $where = ["pn.member_id = ?", "m.trainer_id = ?", "pn.trainer_id = ?", "m.deleted_at IS NULL"];
        $params = [$memberId, $trainerId, $trainerId];

        if ($deleted === 'active') {
            $where[] = "pn.deleted_at IS NULL";
        } elseif ($deleted === 'deleted') {
            $where[] = "pn.deleted_at IS NOT NULL";
        }

        $whereClause = implode(" AND ", $where);

        $countSql = "SELECT COUNT(*) FROM member_progress_notes pn JOIN members m ON pn.member_id = m.id WHERE $whereClause";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;

        if ($page > $lastPage) {
            Response::json([
                'items' => [],
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage
            ]);
            return;
        }

        $sql = "
            SELECT 
                pn.id, pn.uuid, pn.member_id, pn.trainer_id, pn.recorded_at, 
                pn.created_at, pn.updated_at, pn.deleted_at
            FROM member_progress_notes pn
            JOIN members m ON pn.member_id = m.id
            WHERE $whereClause
            ORDER BY pn.recorded_at DESC, pn.id DESC
            LIMIT ? OFFSET ?
        ";

        $params[] = $perPage;
        $params[] = $offset;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['member_id'] = (int)$item['member_id'];
            $item['trainer_id'] = (int)$item['trainer_id'];
        }

        Response::json([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage
        ]);
    }

    public function show(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();

        $sql = "
            SELECT 
                pn.id, pn.uuid, pn.member_id, pn.trainer_id, pn.recorded_at, 
                pn.note, pn.created_at, pn.updated_at, pn.deleted_at
            FROM member_progress_notes pn
            JOIN members m ON pn.member_id = m.id
            WHERE pn.id = ? 
              AND pn.deleted_at IS NULL 
              AND m.trainer_id = ? 
              AND pn.trainer_id = ? 
              AND m.deleted_at IS NULL
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $trainerId, $trainerId]);
        $note = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$note) {
            Response::error('Progress note not found', 'NOT_FOUND', 404);
        }

        $note['id'] = (int)$note['id'];
        $note['member_id'] = (int)$note['member_id'];
        $note['trainer_id'] = (int)$note['trainer_id'];

        Response::json($note);
    }

    public function store(int $memberId): void {
        AuthMiddleware::hasRole(['trainer']);
        
        $payload = $this->getJsonPayload();
        
        if (!array_key_exists('recorded_at', $payload) || $payload['recorded_at'] === null) {
            Response::error('recorded_at is required', 'VALIDATION_ERROR', 422);
        }
        if (!is_string($payload['recorded_at'])) {
            Response::error('recorded_at must be a string', 'VALIDATION_ERROR', 422);
        }
        $d = DateTime::createFromFormat('Y-m-d H:i:s', $payload['recorded_at']);
        if (!$d || $d->format('Y-m-d H:i:s') !== $payload['recorded_at']) {
            Response::error('Invalid recorded_at format. Must be Y-m-d H:i:s', 'VALIDATION_ERROR', 422);
        }

        if (!array_key_exists('note', $payload) || $payload['note'] === null) {
            Response::error('note is required', 'VALIDATION_ERROR', 422);
        }
        if (!is_string($payload['note'])) {
            Response::error('note must be a string', 'VALIDATION_ERROR', 422);
        }
        if (trim($payload['note']) === '') {
            Response::error('note cannot be empty', 'VALIDATION_ERROR', 422);
        }
        $noteLen = mb_strlen($payload['note'], 'UTF-8');
        if ($noteLen < 1 || $noteLen > 5000) {
            Response::error('note length must be between 1 and 5000 characters', 'VALIDATION_ERROR', 422);
        }

        $this->db->beginTransaction();
        try {
            $trainerId = $this->getTrainerProfileIdForUpdate();
            
            $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$memberId, $trainerId]);
            if (!$stmt->fetch()) {
                $this->db->rollBack();
                Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);
            }

            $uuid = $this->generateUuid();
            $adminId = (int)$_SESSION['admin_id'];

            $insertSql = "INSERT INTO member_progress_notes (uuid, member_id, trainer_id, recorded_at, note, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $this->db->prepare($insertSql);
            $insertStmt->execute([
                $uuid,
                $memberId,
                $trainerId,
                $payload['recorded_at'],
                $payload['note'],
                $adminId,
                $adminId
            ]);

            if ($insertStmt->rowCount() !== 1) {
                throw new Exception("Failed to insert progress note");
            }

            $newId = (int)$this->db->lastInsertId();
            
            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_progress_note.create',
                    $adminId,
                    'member_progress_notes',
                    $newId,
                    [
                        'progress_note_id' => $newId,
                        'member_id' => $memberId,
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }

            Response::json(['id' => $newId, 'uuid' => $uuid], 201);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error('Internal server error', 'INTERNAL_ERROR', 500);
        }
    }

    public function update(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        $payload = $this->getJsonPayload();
        
        if (empty($payload)) {
            Response::error('Empty payload', 'VALIDATION_ERROR', 422);
        }

        $validated = [];
        if (array_key_exists('recorded_at', $payload)) {
            if ($payload['recorded_at'] === null) {
                Response::error('recorded_at cannot be null', 'VALIDATION_ERROR', 422);
            }
            if (!is_string($payload['recorded_at'])) {
                Response::error('recorded_at must be a string', 'VALIDATION_ERROR', 422);
            }
            $d = DateTime::createFromFormat('Y-m-d H:i:s', $payload['recorded_at']);
            if (!$d || $d->format('Y-m-d H:i:s') !== $payload['recorded_at']) {
                Response::error('Invalid recorded_at format. Must be Y-m-d H:i:s', 'VALIDATION_ERROR', 422);
            }
            $validated['recorded_at'] = $payload['recorded_at'];
        }
        if (array_key_exists('note', $payload)) {
            if ($payload['note'] === null) {
                Response::error('note cannot be null', 'VALIDATION_ERROR', 422);
            }
            if (!is_string($payload['note'])) {
                Response::error('note must be a string', 'VALIDATION_ERROR', 422);
            }
            if (trim($payload['note']) === '') {
                Response::error('note cannot be empty', 'VALIDATION_ERROR', 422);
            }
            $noteLen = mb_strlen($payload['note'], 'UTF-8');
            if ($noteLen < 1 || $noteLen > 5000) {
                Response::error('note length must be between 1 and 5000 characters', 'VALIDATION_ERROR', 422);
            }
            $validated['note'] = $payload['note'];
        }

        if (empty($validated)) {
            Response::json(['success' => true]);
            return;
        }

        $this->db->beginTransaction();
        try {
            $trainerId = $this->getTrainerProfileIdForUpdate();

            $sql = "
                SELECT pn.*, m.trainer_id as current_member_trainer, m.deleted_at as member_deleted_at
                FROM member_progress_notes pn
                JOIN members m ON pn.member_id = m.id
                WHERE pn.id = ? FOR UPDATE
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$current || $current['deleted_at'] !== null || $current['member_deleted_at'] !== null || (int)$current['trainer_id'] !== $trainerId || (int)$current['current_member_trainer'] !== $trainerId) {
                $this->db->rollBack();
                Response::error('Progress note not found', 'NOT_FOUND', 404);
            }

            $updateFields = [];
            $updateValues = [];
            $changedFieldNames = [];

            foreach (['recorded_at', 'note'] as $f) {
                if (array_key_exists($f, $validated)) {
                    if ($current[$f] !== (string)$validated[$f]) {
                        $updateFields[] = "`$f` = ?";
                        $updateValues[] = $validated[$f];
                        $changedFieldNames[] = $f;
                    }
                }
            }

            if (empty($updateFields)) {
                $this->db->commit();
                Response::json(['success' => true]);
                return;
            }

            $adminId = (int)$_SESSION['admin_id'];
            $updateFields[] = "`updated_by` = ?";
            $updateValues[] = $adminId;

            $updateValues[] = $id;
            $updateValues[] = $trainerId;
            $updateValues[] = $trainerId;

            $updateSql = "
                UPDATE member_progress_notes 
                SET " . implode(", ", $updateFields) . "
                WHERE id = ? 
                  AND trainer_id = ? 
                  AND deleted_at IS NULL 
                  AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)
            ";
            
            $updateStmt = $this->db->prepare($updateSql);
            $updateStmt->execute($updateValues);

            if ($updateStmt->rowCount() !== 1) {
                throw new Exception("Failed to update progress note");
            }

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_progress_note.update',
                    $adminId,
                    'member_progress_notes',
                    $id,
                    [
                        'progress_note_id' => $id,
                        'member_id' => (int)$current['member_id'],
                        'trainer_id' => $trainerId,
                        'changed_fields' => $changedFieldNames
                    ]
                );
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }

            Response::json(['success' => true]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error('Internal server error', 'INTERNAL_ERROR', 500);
        }
    }

    public function destroy(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        
        $this->db->beginTransaction();
        try {
            $trainerId = $this->getTrainerProfileIdForUpdate();

            $sql = "
                SELECT pn.id, pn.member_id, pn.deleted_at, m.trainer_id as current_member_trainer, m.deleted_at as member_deleted_at
                FROM member_progress_notes pn
                JOIN members m ON pn.member_id = m.id
                WHERE pn.id = ? AND pn.trainer_id = ? FOR UPDATE
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id, $trainerId]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$current || $current['deleted_at'] !== null || $current['member_deleted_at'] !== null || (int)$current['current_member_trainer'] !== $trainerId) {
                $this->db->rollBack();
                Response::error('Progress note not found', 'NOT_FOUND', 404);
            }

            $adminId = (int)$_SESSION['admin_id'];

            $delSql = "
                UPDATE member_progress_notes 
                SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?
                WHERE id = ? 
                  AND trainer_id = ? 
                  AND deleted_at IS NULL 
                  AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)
            ";
            $delStmt = $this->db->prepare($delSql);
            $delStmt->execute([$adminId, $id, $trainerId, $trainerId]);

            if ($delStmt->rowCount() !== 1) {
                throw new Exception("Failed to delete progress note");
            }

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_progress_note.delete',
                    $adminId,
                    'member_progress_notes',
                    $id,
                    [
                        'progress_note_id' => $id,
                        'member_id' => (int)$current['member_id'],
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }

            Response::json(['success' => true]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error('Internal server error', 'INTERNAL_ERROR', 500);
        }
    }

    public function restore(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        
        $this->db->beginTransaction();
        try {
            $trainerId = $this->getTrainerProfileIdForUpdate();

            $sql = "
                SELECT pn.id, pn.member_id, pn.deleted_at, m.trainer_id as current_member_trainer, m.deleted_at as member_deleted_at
                FROM member_progress_notes pn
                JOIN members m ON pn.member_id = m.id
                WHERE pn.id = ? AND pn.trainer_id = ? FOR UPDATE
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id, $trainerId]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$current || $current['member_deleted_at'] !== null || (int)$current['current_member_trainer'] !== $trainerId) {
                $this->db->rollBack();
                Response::error('Progress note not found', 'NOT_FOUND', 404);
            }

            if ($current['deleted_at'] === null) {
                $this->db->rollBack();
                Response::error('Progress note is not archived', 'PROGRESS_NOTE_NOT_ARCHIVED', 409);
            }

            $adminId = (int)$_SESSION['admin_id'];

            $resSql = "
                UPDATE member_progress_notes 
                SET deleted_at = NULL, updated_by = ?
                WHERE id = ? 
                  AND trainer_id = ? 
                  AND deleted_at IS NOT NULL 
                  AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)
            ";
            $resStmt = $this->db->prepare($resSql);
            $resStmt->execute([$adminId, $id, $trainerId, $trainerId]);

            if ($resStmt->rowCount() !== 1) {
                throw new Exception("Failed to restore progress note");
            }

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_progress_note.restore',
                    $adminId,
                    'member_progress_notes',
                    $id,
                    [
                        'progress_note_id' => $id,
                        'member_id' => (int)$current['member_id'],
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }

            Response::json(['success' => true]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error('Internal server error', 'INTERNAL_ERROR', 500);
        }
    }
}
