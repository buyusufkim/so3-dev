<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;
use Exception;
use Throwable;
use DateTime;

class MemberMeasurementController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getAdminId(): int {
        return (int)($_SESSION['admin_id'] ?? 0);
    }

    private function validateMeasurement($val, string $fieldName, float $maxLimit, bool $allowZero = false) {
        if ($val === null) return null;
        if (!is_int($val) && !is_float($val)) {
            Response::error("$fieldName must be a JSON number or null", 'VALIDATION_ERROR', 422);
        }
        if (is_nan($val) || is_infinite($val)) {
            Response::error("$fieldName is invalid", 'VALIDATION_ERROR', 422);
        }
        if ($allowZero) {
            if ($val < 0 || $val > $maxLimit) {
                Response::error("$fieldName must be between 0 and $maxLimit", 'VALIDATION_ERROR', 422);
            }
        } else {
            if ($val <= 0 || $val > $maxLimit) {
                Response::error("$fieldName must be greater than 0 and up to $maxLimit", 'VALIDATION_ERROR', 422);
            }
        }
        
        $strVal = (string)$val;
        if (strpos($strVal, '.') !== false) {
            $parts = explode('.', $strVal);
            if (isset($parts[1]) && strlen($parts[1]) > 2) {
                Response::error("$fieldName can have at most 2 decimal places", 'VALIDATION_ERROR', 422);
            }
        }
        return $val;
    }

    public function index(int $memberId): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
        if ($perPage < 1) $perPage = 20;
        if ($perPage > 100) $perPage = 100;
        
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
        
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM member_measurements WHERE $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
        if ($page > $lastPage) $page = $lastPage;
        
        $offset = ($page - 1) * $perPage;
        
        $sql = "SELECT id, uuid, member_id, trainer_id, measured_at, weight_kg, body_fat_percent, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, created_at, updated_at, deleted_at 
                FROM member_measurements 
                WHERE $whereClause 
                ORDER BY measured_at DESC, id DESC 
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
            $item['weight_kg'] = $item['weight_kg'] !== null ? (float)$item['weight_kg'] : null;
            $item['body_fat_percent'] = $item['body_fat_percent'] !== null ? (float)$item['body_fat_percent'] : null;
            $item['chest_cm'] = $item['chest_cm'] !== null ? (float)$item['chest_cm'] : null;
            $item['waist_cm'] = $item['waist_cm'] !== null ? (float)$item['waist_cm'] : null;
            $item['hip_cm'] = $item['hip_cm'] !== null ? (float)$item['hip_cm'] : null;
            $item['arm_cm'] = $item['arm_cm'] !== null ? (float)$item['arm_cm'] : null;
            $item['thigh_cm'] = $item['thigh_cm'] !== null ? (float)$item['thigh_cm'] : null;
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
        
        $stmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, measured_at, weight_kg, body_fat_percent, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, notes, created_at, updated_at, deleted_at 
                FROM member_measurements WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$item) {
            Response::error("Measurement not found", 'NOT_FOUND', 404);
        }
        
        $item['id'] = (int)$item['id'];
        $item['member_id'] = (int)$item['member_id'];
        $item['trainer_id'] = (int)$item['trainer_id'];
        $item['weight_kg'] = $item['weight_kg'] !== null ? (float)$item['weight_kg'] : null;
        $item['body_fat_percent'] = $item['body_fat_percent'] !== null ? (float)$item['body_fat_percent'] : null;
        $item['chest_cm'] = $item['chest_cm'] !== null ? (float)$item['chest_cm'] : null;
        $item['waist_cm'] = $item['waist_cm'] !== null ? (float)$item['waist_cm'] : null;
        $item['hip_cm'] = $item['hip_cm'] !== null ? (float)$item['hip_cm'] : null;
        $item['arm_cm'] = $item['arm_cm'] !== null ? (float)$item['arm_cm'] : null;
        $item['thigh_cm'] = $item['thigh_cm'] !== null ? (float)$item['thigh_cm'] : null;
        
        Response::json($item);
    }

    public function store(int $memberId): void {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error("Payload too large", 'PAYLOAD_TOO_LARGE', 413);
        }
        
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') === false) {
            Response::error("Content type must be application/json", 'UNSUPPORTED_MEDIA_TYPE', 415);
        }
        
        $input = file_get_contents('php://input');
        $dataRaw = json_decode($input);
        
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($dataRaw)) {
            Response::error("Invalid JSON payload", 'BAD_REQUEST', 400);
        }
        
        $data = json_decode($input, true);
        
        $allowed = ['measured_at', 'weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowed, true)) {
                Response::error("Invalid field in payload: $key", 'VALIDATION_ERROR', 422);
            }
        }
        
        if (!isset($data['measured_at'])) {
            Response::error("measured_at is required", 'VALIDATION_ERROR', 422);
        }
        if (!is_string($data['measured_at'])) {
            Response::error("measured_at must be a string", 'VALIDATION_ERROR', 422);
        }
        $d = DateTime::createFromFormat('Y-m-d H:i:s', $data['measured_at']);
        if (!$d || $d->format('Y-m-d H:i:s') !== $data['measured_at']) {
            Response::error("Invalid measured_at format. Must be Y-m-d H:i:s", 'VALIDATION_ERROR', 422);
        }
        
        $weight = array_key_exists('weight_kg', $data) ? $this->validateMeasurement($data['weight_kg'], 'weight_kg', 9999.99) : null;
        $body_fat = array_key_exists('body_fat_percent', $data) ? $this->validateMeasurement($data['body_fat_percent'], 'body_fat_percent', 100, true) : null;
        $chest = array_key_exists('chest_cm', $data) ? $this->validateMeasurement($data['chest_cm'], 'chest_cm', 9999.99) : null;
        $waist = array_key_exists('waist_cm', $data) ? $this->validateMeasurement($data['waist_cm'], 'waist_cm', 9999.99) : null;
        $hip = array_key_exists('hip_cm', $data) ? $this->validateMeasurement($data['hip_cm'], 'hip_cm', 9999.99) : null;
        $arm = array_key_exists('arm_cm', $data) ? $this->validateMeasurement($data['arm_cm'], 'arm_cm', 9999.99) : null;
        $thigh = array_key_exists('thigh_cm', $data) ? $this->validateMeasurement($data['thigh_cm'], 'thigh_cm', 9999.99) : null;
        
        if ($weight === null && $body_fat === null && $chest === null && $waist === null && $hip === null && $arm === null && $thigh === null) {
            Response::error("At least one measurement field must be provided and not null", 'VALIDATION_ERROR', 422);
        }
        
        $notes = null;
        if (array_key_exists('notes', $data)) {
            $notesStr = $data['notes'];
            if ($notesStr !== null) {
                if (!is_string($notesStr)) {
                    Response::error("notes must be a string or null", 'VALIDATION_ERROR', 422);
                }
                if (trim($notesStr) === '') {
                    $notes = null;
                } else {
                    if (mb_strlen($notesStr, 'UTF-8') > 1000) {
                        Response::error("notes cannot exceed 1000 characters", 'VALIDATION_ERROR', 422);
                    }
                    $notes = $notesStr;
                }
            }
        }
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT id, trainer_id, deleted_at FROM members WHERE id = ? FOR UPDATE");
            $stmt->execute([$memberId]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error("Member not found or deleted", 'NOT_FOUND', 404);
            }

            if (!$member['trainer_id']) {
                $this->db->rollBack();
                Response::error("Member has no assigned trainer", 'MEMBER_TRAINER_NOT_ASSIGNED', 409);
            }

            $tStmt = $this->db->prepare("SELECT id, status, deleted_at FROM trainers WHERE id = ?");
            $tStmt->execute([$member['trainer_id']]);
            $trainer = $tStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null || $trainer['status'] !== 'active') {
                $this->db->rollBack();
                Response::error("Assigned trainer is invalid or inactive", 'MEMBER_TRAINER_INVALID', 409);
            }
            
            $uuid = sprintf(
                '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );

            $adminId = $this->getAdminId();

            $insertStmt = $this->db->prepare("
                INSERT INTO member_measurements (
                    uuid, member_id, trainer_id, measured_at, weight_kg, body_fat_percent,
                    chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, notes, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->execute([
                $uuid, $memberId, $member['trainer_id'], $data['measured_at'],
                $weight, $body_fat, $chest, $waist, $hip, $arm, $thigh, $notes,
                $adminId, $adminId
            ]);

            if ($insertStmt->rowCount() !== 1) {
                throw new Exception("Failed to insert measurement");
            }
            $newId = (int)$this->db->lastInsertId();
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_measurement.create', 'member_measurements', $newId, [
                    'measurement_id' => $newId,
                    'member_id' => $memberId,
                    'trainer_id' => $member['trainer_id']
                ]);
            } catch (Throwable $e) {
                error_log("Audit log failed: " . $e->getMessage());
            }

            $this->db->commit();
            
            http_response_code(201);
            echo json_encode(['id' => $newId, 'uuid' => $uuid]);
            exit;
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
        
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error("Payload too large", 'PAYLOAD_TOO_LARGE', 413);
        }
        
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') === false) {
            Response::error("Content type must be application/json", 'UNSUPPORTED_MEDIA_TYPE', 415);
        }
        
        $input = file_get_contents('php://input');
        $dataRaw = json_decode($input);
        
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($dataRaw)) {
            Response::error("Invalid JSON payload", 'BAD_REQUEST', 400);
        }
        
        $data = json_decode($input, true);
        if (empty($data)) {
            Response::error("Empty payload", 'VALIDATION_ERROR', 422);
        }
        
        $allowed = ['measured_at', 'weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowed, true)) {
                Response::error("Invalid field in payload: $key", 'VALIDATION_ERROR', 422);
            }
        }
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT * FROM member_measurements WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current) {
                $this->db->rollBack();
                Response::error("Measurement not found", 'NOT_FOUND', 404);
            }
            if ($current['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error("Measurement is deleted", 'NOT_FOUND', 404);
            }
            
            $merged = $current;
            
            if (array_key_exists('measured_at', $data)) {
                if ($data['measured_at'] === null) {
                    $this->db->rollBack();
                    Response::error("measured_at cannot be null", 'VALIDATION_ERROR', 422);
                }
                if (!is_string($data['measured_at'])) {
                    $this->db->rollBack();
                    Response::error("measured_at must be a string", 'VALIDATION_ERROR', 422);
                }
                $d = DateTime::createFromFormat('Y-m-d H:i:s', $data['measured_at']);
                if (!$d || $d->format('Y-m-d H:i:s') !== $data['measured_at']) {
                    $this->db->rollBack();
                    Response::error("Invalid measured_at format. Must be Y-m-d H:i:s", 'VALIDATION_ERROR', 422);
                }
                $merged['measured_at'] = $data['measured_at'];
            }
            
            $measureFields = [
                'weight_kg' => [9999.99, false],
                'body_fat_percent' => [100, true],
                'chest_cm' => [9999.99, false],
                'waist_cm' => [9999.99, false],
                'hip_cm' => [9999.99, false],
                'arm_cm' => [9999.99, false],
                'thigh_cm' => [9999.99, false]
            ];
            
            foreach ($measureFields as $field => $rules) {
                if (array_key_exists($field, $data)) {
                    $val = $data[$field];
                    if ($val !== null) {
                        if (!is_int($val) && !is_float($val)) {
                            $this->db->rollBack();
                            Response::error("$field must be a JSON number or null", 'VALIDATION_ERROR', 422);
                        }
                        if (is_nan($val) || is_infinite($val)) {
                            $this->db->rollBack();
                            Response::error("$field is invalid", 'VALIDATION_ERROR', 422);
                        }
                        if ($rules[1]) {
                            if ($val < 0 || $val > $rules[0]) {
                                $this->db->rollBack();
                                Response::error("$field must be between 0 and {$rules[0]}", 'VALIDATION_ERROR', 422);
                            }
                        } else {
                            if ($val <= 0 || $val > $rules[0]) {
                                $this->db->rollBack();
                                Response::error("$field must be greater than 0 and up to {$rules[0]}", 'VALIDATION_ERROR', 422);
                            }
                        }
                        $strVal = (string)$val;
                        if (strpos($strVal, '.') !== false) {
                            $parts = explode('.', $strVal);
                            if (isset($parts[1]) && strlen($parts[1]) > 2) {
                                $this->db->rollBack();
                                Response::error("$field can have at most 2 decimal places", 'VALIDATION_ERROR', 422);
                            }
                        }
                    }
                    $merged[$field] = $val;
                }
            }
            
            if (array_key_exists('notes', $data)) {
                $notes = $data['notes'];
                if ($notes !== null) {
                    if (!is_string($notes)) {
                        $this->db->rollBack();
                        Response::error("notes must be a string or null", 'VALIDATION_ERROR', 422);
                    }
                    if (trim($notes) === '') {
                        $notes = null;
                    } else {
                        if (mb_strlen($notes, 'UTF-8') > 1000) {
                            $this->db->rollBack();
                            Response::error("notes cannot exceed 1000 characters", 'VALIDATION_ERROR', 422);
                        }
                    }
                }
                $merged['notes'] = $notes;
            }
            
            $hasMeasurement = false;
            foreach (array_keys($measureFields) as $field) {
                if ($merged[$field] !== null) {
                    $hasMeasurement = true;
                    break;
                }
            }
            
            if (!$hasMeasurement) {
                $this->db->rollBack();
                Response::error("At least one measurement field must be not null", 'VALIDATION_ERROR', 422);
            }
            
            $updateFields = [];
            $updateValues = [];
            $changedFieldNames = [];
            
            foreach ($allowed as $f) {
                $oldVal = $current[$f];
                $newVal = $merged[$f];
                
                $isDifferent = false;
                if ($oldVal === null && $newVal !== null) $isDifferent = true;
                elseif ($oldVal !== null && $newVal === null) $isDifferent = true;
                elseif ($oldVal !== null && $newVal !== null) {
                    if (in_array($f, array_keys($measureFields))) {
                        if ((float)$oldVal !== (float)$newVal) $isDifferent = true;
                    } else {
                        if ($oldVal !== (string)$newVal) $isDifferent = true;
                    }
                }
                
                if ($isDifferent) {
                    $updateFields[] = "`$f` = ?";
                    $updateValues[] = $newVal;
                    $changedFieldNames[] = $f;
                }
            }
            
            if (empty($updateFields)) {
                $this->db->rollBack();
                Response::json(['success' => true]);
                return;
            }
            
            $adminId = $this->getAdminId();
            $updateFields[] = "`updated_by` = ?";
            $updateValues[] = $adminId;
            
            $updateValues[] = $id;
            
            $sql = "UPDATE member_measurements SET " . implode(", ", $updateFields) . " WHERE id = ?";
            $stmtU = $this->db->prepare($sql);
            $stmtU->execute($updateValues);
            
            if ($stmtU->rowCount() !== 1) {
                throw new Exception("Failed to update measurement");
            }
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_measurement.update', 'member_measurements', $id, [
                    'measurement_id' => $id,
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
            $stmt = $this->db->prepare("SELECT id, member_id, trainer_id, deleted_at FROM member_measurements WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current || $current['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error("Measurement not found", 'NOT_FOUND', 404);
            }
            
            $adminId = $this->getAdminId();
            
            $delStmt = $this->db->prepare("UPDATE member_measurements SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?");
            $delStmt->execute([$adminId, $id]);
            
            if ($delStmt->rowCount() !== 1) {
                throw new Exception("Failed to delete measurement");
            }
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_measurement.delete', 'member_measurements', $id, [
                    'measurement_id' => $id,
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
            $stmt = $this->db->prepare("SELECT id, member_id, trainer_id, deleted_at FROM member_measurements WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$current) {
                $this->db->rollBack();
                Response::error("Measurement not found", 'NOT_FOUND', 404);
            }
            
            if ($current['deleted_at'] === null) {
                $this->db->rollBack();
                Response::error("Measurement is not archived", 'MEASUREMENT_NOT_ARCHIVED', 409);
            }
            
            $adminId = $this->getAdminId();
            
            $resStmt = $this->db->prepare("UPDATE member_measurements SET deleted_at = NULL, updated_by = ? WHERE id = ?");
            $resStmt->execute([$adminId, $id]);
            
            if ($resStmt->rowCount() !== 1) {
                throw new Exception("Failed to restore measurement");
            }
            
            try {
                AuditLogger::log($this->db, $adminId, 'member_measurement.restore', 'member_measurements', $id, [
                    'measurement_id' => $id,
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
