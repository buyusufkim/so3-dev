<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;
use DateTime;
use Exception;
use Throwable;


class MemberProgressNoteController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function getAdminId(): int {
        return (int)($_SESSION['admin_id'] ?? 0);
    }

    private function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getJsonPayload(): array {
        $contentTypeHeader = $_SERVER['CONTENT_TYPE'] ?? '';
        $parts = explode(';', $contentTypeHeader);
        $mediaType = strtolower(trim($parts[0]));
        if ($mediaType !== 'application/json') {
            Response::error("Content type must be application/json", 'UNSUPPORTED_MEDIA_TYPE', 415);
        }
        
        $input = file_get_contents('php://input');
        if (strlen($input) > 16384) {
            Response::error("Payload too large", 'PAYLOAD_TOO_LARGE', 413);
        }
        
        if (trim($input) === '') {
            Response::error("Empty payload", 'BAD_REQUEST', 400);
        }
        
        $dataRaw = json_decode($input);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($dataRaw)) {
            Response::error("Invalid JSON payload", 'BAD_REQUEST', 400);
        }
        
        $data = json_decode($input, true);
        if (empty($data)) {
            Response::error("Empty payload", 'VALIDATION_ERROR', 422);
        }
        
        return $data;
    }

    public function index(int $memberId): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
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
        if (!is_int($offset) || $offset < 0) {
            Response::error("Pagination offset overflow", 'VALIDATION_ERROR', 422);
        }
        
        $deleted = isset($_GET['deleted']) ? $_GET['deleted'] : 'active';
        if (!in_array($deleted, ['active', 'deleted', 'all'], true)) {
            Response::error("Invalid deleted parameter", 'VALIDATION_ERROR', 422);
        }
        
        $stmtM = $this->db->prepare("SELECT id, deleted_at FROM members WHERE id = ?");
        $stmtM->execute([$memberId]);
        $member = $stmtM->fetch(PDO::FETCH_ASSOC);
        
        if (!$member || $member['deleted_at'] !== null) {
            Response::error("Member not found", 'NOT_FOUND', 404);
        }
        
        $where = ["member_id = ?"];
        $params = [$memberId];
        
        if ($deleted === 'active') {
            $where[] = "deleted_at IS NULL";
        } elseif ($deleted === 'deleted') {
            $where[] = "deleted_at IS NOT NULL";
        }
        
        $whereClause = implode(" AND ", $where);
        
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM member_progress_notes WHERE $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
        
        $sql = "SELECT id, uuid, member_id, trainer_id, recorded_at, created_at, updated_at, deleted_at 
                FROM member_progress_notes 
                WHERE $whereClause 
                ORDER BY recorded_at DESC, id DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = $this->db->prepare($sql);
        $bindIndex = 1;
        foreach ($params as $p) {
            $stmt->bindValue($bindIndex++, $p);
        }
        $stmt->bindValue($bindIndex++, $perPage, PDO::PARAM_INT);
        $stmt->bindValue($bindIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['member_id'] = (int)$item['member_id'];
            $item['trainer_id'] = (int)$item['trainer_id'];
        }
        
        Response::json([
            'items' => $items,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage
            ]
        ]);
    }

    public function show(int $id): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $stmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, recorded_at, note, created_at, updated_at, deleted_at 
                FROM member_progress_notes WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$item) {
            Response::error("Progress note not found", 'NOT_FOUND', 404);
        }
        
        $item['id'] = (int)$item['id'];
        $item['member_id'] = (int)$item['member_id'];
        $item['trainer_id'] = (int)$item['trainer_id'];
        
        Response::json($item);
    }

    public function store(int $memberId): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $data = $this->getJsonPayload();
        
        $allowed = ['recorded_at', 'note'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowed, true)) {
                Response::error("Invalid field in payload: $key", 'VALIDATION_ERROR', 422);
            }
        }
        
        if (!isset($data['recorded_at'])) {
            Response::error("recorded_at is required", 'VALIDATION_ERROR', 422);
        }
        if (!is_string($data['recorded_at'])) {
            Response::error("recorded_at must be a string", 'VALIDATION_ERROR', 422);
        }
        $d = DateTime::createFromFormat('Y-m-d H:i:s', $data['recorded_at']);
        if (!$d || $d->format('Y-m-d H:i:s') !== $data['recorded_at']) {
            Response::error("Invalid recorded_at format. Must be Y-m-d H:i:s", 'VALIDATION_ERROR', 422);
        }
        
        if (!isset($data['note'])) {
            Response::error("note is required", 'VALIDATION_ERROR', 422);
        }
        if (!is_string($data['note'])) {
            Response::error("note must be a string", 'VALIDATION_ERROR', 422);
        }
        if (trim($data['note']) === '') {
            Response::error("note cannot be empty", 'VALIDATION_ERROR', 422);
        }
        $noteLen = mb_strlen($data['note'], 'UTF-8');
        if ($noteLen < 1 || $noteLen > 5000) {
            Response::error("note length must be between 1 and 5000 characters", 'VALIDATION_ERROR', 422);
        }
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, trainer_id, deleted_at FROM members WHERE id = ? FOR UPDATE");
            $stmt->execute([$memberId]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$member || $member['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error("Member not found", 'NOT_FOUND', 404);
            }
            
            if (!$member['trainer_id']) {
                $this->db->rollBack();
                Response::error("Member has no assigned trainer", 'MEMBER_TRAINER_NOT_ASSIGNED', 409);
            }

            $tStmt = $this->db->prepare("SELECT id, is_active, deleted_at FROM trainers WHERE id = ? FOR UPDATE");
            $tStmt->execute([$member['trainer_id']]);
            $trainer = $tStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null || $trainer['is_active'] != 1) {
                $this->db->rollBack();
                Response::error("Assigned trainer is invalid or inactive", 'MEMBER_TRAINER_INVALID', 409);
            }

            $uuid = $this->generateUuid();
            $adminId = $this->getAdminId();

            $insertStmt = $this->db->prepare("
                INSERT INTO member_progress_notes 
                (uuid, member_id, trainer_id, recorded_at, note, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->execute([
                $uuid,
                $memberId,
                $trainer['id'],
                $data['recorded_at'],
                $data['note'],
                $adminId,
                $adminId
            ]);
            
            if ($insertStmt->rowCount() !== 1) {
                throw new Exception("Failed to insert progress note");
            }
            
            $newId = (int)$this->db->lastInsertId();

            try {
                AuditLogger::log($this->db, $adminId, 'member_progress_note.create', 'member_progress_notes', $newId, [
                    'progress_note_id' => $newId,
                    'member_id' => $memberId,
                    'trainer_id' => $trainer['id']
                ]);
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }

            $this->db->commit();
            
            Response::json([
                'id' => $newId,
                'uuid' => $uuid
            ], 201);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error("Internal server error", 'INTERNAL_ERROR', 500);
        }
    }

    public function update(int $id): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $data = $this->getJsonPayload();
        
        $allowed = ['recorded_at', 'note'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowed, true)) {
                Response::error("Invalid field in payload: $key", 'VALIDATION_ERROR', 422);
            }
        }
        
        $validated = [];
        
        if (array_key_exists('recorded_at', $data)) {
            if ($data['recorded_at'] === null) {
                Response::error("recorded_at cannot be null", 'VALIDATION_ERROR', 422);
            }
            if (!is_string($data['recorded_at'])) {
                Response::error("recorded_at must be a string", 'VALIDATION_ERROR', 422);
            }
            $d = DateTime::createFromFormat('Y-m-d H:i:s', $data['recorded_at']);
            if (!$d || $d->format('Y-m-d H:i:s') !== $data['recorded_at']) {
                Response::error("Invalid recorded_at format. Must be Y-m-d H:i:s", 'VALIDATION_ERROR', 422);
            }
            $validated['recorded_at'] = $data['recorded_at'];
        }
        
        if (array_key_exists('note', $data)) {
            if ($data['note'] === null) {
                Response::error("note cannot be null", 'VALIDATION_ERROR', 422);
            }
            if (!is_string($data['note'])) {
                Response::error("note must be a string", 'VALIDATION_ERROR', 422);
            }
            if (trim($data['note']) === '') {
                Response::error("note cannot be empty", 'VALIDATION_ERROR', 422);
            }
            $noteLen = mb_strlen($data['note'], 'UTF-8');
            if ($noteLen < 1 || $noteLen > 5000) {
                Response::error("note length must be between 1 and 5000 characters", 'VALIDATION_ERROR', 422);
            }
            $validated['note'] = $data['note'];
        }
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT * FROM member_progress_notes WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current) {
                $this->db->rollBack();
                Response::error("Progress note not found", 'NOT_FOUND', 404);
            }
            if ($current['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error("Progress note is deleted", 'NOT_FOUND', 404);
            }
            
            $merged = $current;
            foreach ($validated as $field => $val) {
                $merged[$field] = $val;
            }
            
            $updateFields = [];
            $updateValues = [];
            $changedFieldNames = [];
            
            foreach (['recorded_at', 'note'] as $f) {
                $oldVal = $current[$f];
                $newVal = $merged[$f];
                
                $isDifferent = false;
                if ($oldVal !== (string)$newVal) {
                    $isDifferent = true;
                }
                
                if ($isDifferent) {
                    $updateFields[] = "`$f` = ?";
                    $updateValues[] = $newVal;
                    $changedFieldNames[] = $f;
                }
            }
            
            if (empty($updateFields)) {
                $this->db->commit();
                Response::json(['success' => true]);
                return;
            }
            
            $adminId = $this->getAdminId();
            $updateFields[] = "`updated_by` = ?";
            $updateValues[] = $adminId;
            
            $updateValues[] = $id;
            
            $sql = "UPDATE member_progress_notes SET " . implode(", ", $updateFields) . " WHERE id = ? AND deleted_at IS NULL";
            $stmtU = $this->db->prepare($sql);
            $stmtU->execute($updateValues);
            
            if ($stmtU->rowCount() !== 1) {
                throw new Exception("Failed to update progress note");
            }
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_progress_note.update', 'member_progress_notes', $id, [
                    'progress_note_id' => $id,
                    'member_id' => $current['member_id'],
                    'trainer_id' => $current['trainer_id'],
                    'changed_fields' => $changedFieldNames
                ]);
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }
            
            $this->db->commit();
            Response::json(['success' => true]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error("Internal server error", 'INTERNAL_ERROR', 500);
        }
    }

    public function destroy(int $id): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, member_id, trainer_id, deleted_at FROM member_progress_notes WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current || $current['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error("Progress note not found", 'NOT_FOUND', 404);
            }
            
            $adminId = $this->getAdminId();
            
            $delStmt = $this->db->prepare("UPDATE member_progress_notes SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND deleted_at IS NULL");
            $delStmt->execute([$adminId, $id]);
            
            if ($delStmt->rowCount() !== 1) {
                throw new Exception("Failed to delete progress note");
            }
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_progress_note.delete', 'member_progress_notes', $id, [
                    'progress_note_id' => $id,
                    'member_id' => $current['member_id'],
                    'trainer_id' => $current['trainer_id']
                ]);
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }
            
            $this->db->commit();
            Response::json(['success' => true]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error("Internal server error", 'INTERNAL_ERROR', 500);
        }
    }

    public function restore(int $id): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, member_id, trainer_id, deleted_at FROM member_progress_notes WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current) {
                $this->db->rollBack();
                Response::error("Progress note not found", 'NOT_FOUND', 404);
            }
            
            if ($current['deleted_at'] === null) {
                $this->db->rollBack();
                Response::error("Progress note is not archived", 'PROGRESS_NOTE_NOT_ARCHIVED', 409);
            }
            
            $adminId = $this->getAdminId();
            
            $resStmt = $this->db->prepare("UPDATE member_progress_notes SET deleted_at = NULL, updated_by = ? WHERE id = ? AND deleted_at IS NOT NULL");
            $resStmt->execute([$adminId, $id]);
            
            if ($resStmt->rowCount() !== 1) {
                throw new Exception("Failed to restore progress note");
            }
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_progress_note.restore', 'member_progress_notes', $id, [
                    'progress_note_id' => $id,
                    'member_id' => $current['member_id'],
                    'trainer_id' => $current['trainer_id']
                ]);
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }
            
            $this->db->commit();
            Response::json(['success' => true]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log($e->getMessage());
            Response::error("Internal server error", 'INTERNAL_ERROR', 500);
        }
    }
}
