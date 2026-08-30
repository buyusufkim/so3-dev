<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;
use Throwable;

class TrainerMemberMeasurementController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfileId(): int {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }
        
        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->execute([$adminId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$trainer) {
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        
        return (int)$trainer['id'];
    }
    
    private function getTrainerProfileIdForUpdate(): int {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
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
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        
        return (int)$trainer['id'];
    }

    private function checkMemberOwnership(int $memberId, int $trainerId): void {
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL");
        $stmt->execute([$memberId, $trainerId]);
        if (!$stmt->fetch()) {
            Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);
        }
    }
    
    private function checkMemberOwnershipForUpdate(int $memberId, int $trainerId): void {
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE");
        $stmt->execute([$memberId, $trainerId]);
        if (!$stmt->fetch()) {
            Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);
        }
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
        if (strlen($raw) > 16384) {
            Response::error('Payload too large', 'PAYLOAD_TOO_LARGE', 413);
        }
        if (trim($raw) === '') {
            Response::error('Empty JSON payload', 'BAD_REQUEST', 400);
        }

        $payload = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON', 'BAD_REQUEST', 400);
        }
        if (!is_array($payload) || array_keys($payload) === range(0, count($payload) - 1)) {
            Response::error('JSON root must be an object', 'BAD_REQUEST', 400);
        }

        return $payload;
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
        
        $diff = abs(round((float)$val, 2) - (float)$val);
        if ($diff > 1.0e-9) {
            Response::error("$fieldName can have at most 2 decimal places", 'VALIDATION_ERROR', 422);
        }
        
        return $val;
    }

    public function index(int $memberId): void {
        AuthMiddleware::hasRole(['trainer']);
        
        $trainerId = $this->getTrainerProfileId();
        $this->checkMemberOwnership($memberId, $trainerId);
        
        $pageRaw = $_GET['page'] ?? '1';
        $perPageRaw = $_GET['per_page'] ?? '20';
        
        if (!preg_match('/^[1-9]\d*$/', (string)$pageRaw) || !preg_match('/^[1-9]\d*$/', (string)$perPageRaw)) {
            Response::error('Pagination parameters must be canonical positive integers', 'VALIDATION_ERROR', 422);
        }
        
        $page = (int)$pageRaw;
        $perPage = (int)$perPageRaw;
        
        if ($pageRaw > PHP_INT_MAX || $perPageRaw > PHP_INT_MAX) {
            Response::error('Pagination parameters exceed limits', 'VALIDATION_ERROR', 422);
        }
        
        if ($perPage > 100) {
            Response::error('Per page cannot exceed 100', 'VALIDATION_ERROR', 422);
        }
        
        $deleted = $_GET['deleted'] ?? 'active';
        if (!in_array($deleted, ['active', 'deleted', 'all'], true)) {
            Response::error('Invalid deleted parameter', 'VALIDATION_ERROR', 422);
        }
        
        $where = "member_measurements.member_id = :member_id AND member_measurements.trainer_id = :trainer_id";
        if ($deleted === 'active') {
            $where .= " AND member_measurements.deleted_at IS NULL";
        } elseif ($deleted === 'deleted') {
            $where .= " AND member_measurements.deleted_at IS NOT NULL";
        }
        
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM member_measurements WHERE $where");
        $countStmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);
        $countStmt->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();
        
        $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
        
        if ($page > $lastPage) {
            Response::json([
                'items' => [],
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'per_page' => $perPage,
                    'last_page' => $lastPage
                ]
            ]);
        }
        
        if ($page > 1) {
            $maxPageForOffset = intdiv(PHP_INT_MAX, $perPage);
            if ($page - 1 > $maxPageForOffset) {
                Response::error('Pagination offset overflow', 'VALIDATION_ERROR', 422);
            }
        }
        $offset = ($page - 1) * $perPage;
        
        $stmt = $this->db->prepare("
            SELECT id, uuid, member_id, trainer_id, measured_at, weight_kg, body_fat_percent,
                   chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, created_at, updated_at, deleted_at
            FROM member_measurements
            WHERE $where
            ORDER BY measured_at DESC, id DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);
        $stmt->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
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
        unset($item);
        
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
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();
        
        $stmt = $this->db->prepare("
            SELECT m.id, m.uuid, m.member_id, m.trainer_id, m.measured_at, m.weight_kg, m.body_fat_percent,
                   m.chest_cm, m.waist_cm, m.hip_cm, m.arm_cm, m.thigh_cm, m.notes, m.created_at, m.updated_at, m.deleted_at
            FROM member_measurements m
            JOIN members mem ON m.member_id = mem.id
            WHERE m.id = :id 
              AND m.trainer_id = :trainer_id
              AND mem.trainer_id = :trainer_id
              AND mem.deleted_at IS NULL
              AND m.deleted_at IS NULL
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
        $stmt->execute();
        
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$item) {
            Response::error('Measurement not found', 'NOT_FOUND', 404);
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
        AuthMiddleware::hasRole(['trainer']);
        
        $payload = $this->getJsonPayload();
        
        $allowedKeys = ['measured_at', 'weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes'];
        foreach (array_keys($payload) as $key) {
            if (!in_array($key, $allowedKeys, true)) {
                Response::error("Disallowed or unknown key: $key", 'VALIDATION_ERROR', 422);
            }
        }
        
        if (!isset($payload['measured_at']) || !is_string($payload['measured_at'])) {
            Response::error("measured_at is required and must be a string", 'VALIDATION_ERROR', 422);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $payload['measured_at'])) {
            Response::error("measured_at must be in Y-m-d H:i:s format", 'VALIDATION_ERROR', 422);
        }
        $d = \DateTime::createFromFormat('Y-m-d H:i:s', $payload['measured_at']);
        if (!$d || $d->format('Y-m-d H:i:s') !== $payload['measured_at']) {
            Response::error("measured_at must be a valid calendar date and time", 'VALIDATION_ERROR', 422);
        }
        
        $weight = $this->validateMeasurement($payload['weight_kg'] ?? null, 'weight_kg', 9999.99);
        $bf = $this->validateMeasurement($payload['body_fat_percent'] ?? null, 'body_fat_percent', 100.0, true);
        $chest = $this->validateMeasurement($payload['chest_cm'] ?? null, 'chest_cm', 9999.99);
        $waist = $this->validateMeasurement($payload['waist_cm'] ?? null, 'waist_cm', 9999.99);
        $hip = $this->validateMeasurement($payload['hip_cm'] ?? null, 'hip_cm', 9999.99);
        $arm = $this->validateMeasurement($payload['arm_cm'] ?? null, 'arm_cm', 9999.99);
        $thigh = $this->validateMeasurement($payload['thigh_cm'] ?? null, 'thigh_cm', 9999.99);
        
        if ($weight === null && $bf === null && $chest === null && $waist === null && $hip === null && $arm === null && $thigh === null) {
            Response::error("At least one measurement field must be provided", 'VALIDATION_ERROR', 422);
        }
        
        $notes = null;
        if (array_key_exists('notes', $payload)) {
            if ($payload['notes'] !== null && !is_string($payload['notes'])) {
                Response::error("notes must be a string or null", 'VALIDATION_ERROR', 422);
            }
            if (is_string($payload['notes'])) {
                if (mb_strlen($payload['notes'], 'UTF-8') > 1000) {
                    Response::error("notes cannot exceed 1000 characters", 'VALIDATION_ERROR', 422);
                }
                $notes = trim($payload['notes']) === '' ? null : $payload['notes'];
            }
        }
        
        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();
            $this->checkMemberOwnershipForUpdate($memberId, $trainerId);
            
            $uuid = $this->generateUuid();
            $adminId = (int)$_SESSION['admin_id'];
            
            $stmt = $this->db->prepare("
                INSERT INTO member_measurements (
                    uuid, member_id, trainer_id, measured_at, weight_kg, body_fat_percent, 
                    chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, notes, created_by, updated_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            ");
            $stmt->execute([
                $uuid, $memberId, $trainerId, $payload['measured_at'], $weight, $bf,
                $chest, $waist, $hip, $arm, $thigh, $notes, $adminId, $adminId
            ]);
            
            $newId = (int)$this->db->lastInsertId();
            
            AuditLogger::log(
                $this->db,
                $adminId,
                'trainer_member_measurement.create',
                'Trainer created a member measurement',
                json_encode([
                    'measurement_id' => $newId,
                    'member_id' => $memberId,
                    'trainer_id' => $trainerId
                ])
            );
            
            $this->db->commit();
            Response::json(['id' => $newId, 'uuid' => $uuid], 201);
            
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if (strpos(get_class($e), 'PDOException') !== false) {
                Response::error('Database error occurred', 'INTERNAL_ERROR', 500);
            }
            Response::error('An unexpected error occurred', 'INTERNAL_ERROR', 500);
        }
    }

    public function update(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        $payload = $this->getJsonPayload();
        
        if (empty($payload)) {
            Response::error("Payload cannot be empty", 'VALIDATION_ERROR', 422);
        }
        
        $allowedKeys = ['measured_at', 'weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes'];
        foreach (array_keys($payload) as $key) {
            if (!in_array($key, $allowedKeys, true)) {
                Response::error("Disallowed or unknown key: $key", 'VALIDATION_ERROR', 422);
            }
        }
        
        if (array_key_exists('measured_at', $payload)) {
            if (!is_string($payload['measured_at'])) {
                Response::error("measured_at must be a string", 'VALIDATION_ERROR', 422);
            }
            if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $payload['measured_at'])) {
                Response::error("measured_at must be in Y-m-d H:i:s format", 'VALIDATION_ERROR', 422);
            }
            $d = \DateTime::createFromFormat('Y-m-d H:i:s', $payload['measured_at']);
            if (!$d || $d->format('Y-m-d H:i:s') !== $payload['measured_at']) {
                Response::error("measured_at must be a valid calendar date and time", 'VALIDATION_ERROR', 422);
            }
        }
        
        if (array_key_exists('notes', $payload)) {
            if ($payload['notes'] !== null && !is_string($payload['notes'])) {
                Response::error("notes must be a string or null", 'VALIDATION_ERROR', 422);
            }
            if (is_string($payload['notes'])) {
                if (mb_strlen($payload['notes'], 'UTF-8') > 1000) {
                    Response::error("notes cannot exceed 1000 characters", 'VALIDATION_ERROR', 422);
                }
            }
        }
        
        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();
            
            $stmt = $this->db->prepare("
                SELECT m.* 
                FROM member_measurements m
                JOIN members mem ON m.member_id = mem.id
                WHERE m.id = :id 
                  AND m.trainer_id = :trainer_id
                  AND mem.trainer_id = :trainer_id
                  AND mem.deleted_at IS NULL
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                $this->db->rollBack();
                Response::error('Measurement not found', 'NOT_FOUND', 404);
            }
            
            $updates = [];
            $params = [];
            $changedFields = [];
            
            $mergedWeight = array_key_exists('weight_kg', $payload) ? $payload['weight_kg'] : $current['weight_kg'];
            $mergedBf = array_key_exists('body_fat_percent', $payload) ? $payload['body_fat_percent'] : $current['body_fat_percent'];
            $mergedChest = array_key_exists('chest_cm', $payload) ? $payload['chest_cm'] : $current['chest_cm'];
            $mergedWaist = array_key_exists('waist_cm', $payload) ? $payload['waist_cm'] : $current['waist_cm'];
            $mergedHip = array_key_exists('hip_cm', $payload) ? $payload['hip_cm'] : $current['hip_cm'];
            $mergedArm = array_key_exists('arm_cm', $payload) ? $payload['arm_cm'] : $current['arm_cm'];
            $mergedThigh = array_key_exists('thigh_cm', $payload) ? $payload['thigh_cm'] : $current['thigh_cm'];
            
            $mergedWeight = $this->validateMeasurement($mergedWeight, 'weight_kg', 9999.99);
            $mergedBf = $this->validateMeasurement($mergedBf, 'body_fat_percent', 100.0, true);
            $mergedChest = $this->validateMeasurement($mergedChest, 'chest_cm', 9999.99);
            $mergedWaist = $this->validateMeasurement($mergedWaist, 'waist_cm', 9999.99);
            $mergedHip = $this->validateMeasurement($mergedHip, 'hip_cm', 9999.99);
            $mergedArm = $this->validateMeasurement($mergedArm, 'arm_cm', 9999.99);
            $mergedThigh = $this->validateMeasurement($mergedThigh, 'thigh_cm', 9999.99);
            
            if ($mergedWeight === null && $mergedBf === null && $mergedChest === null && $mergedWaist === null && $mergedHip === null && $mergedArm === null && $mergedThigh === null) {
                $this->db->rollBack();
                Response::error("At least one measurement field must be provided", 'VALIDATION_ERROR', 422);
            }
            
            if (array_key_exists('measured_at', $payload) && $payload['measured_at'] !== $current['measured_at']) {
                $updates[] = "measured_at = ?";
                $params[] = $payload['measured_at'];
                $changedFields[] = 'measured_at';
            }
            
            if (array_key_exists('notes', $payload)) {
                $notes = null;
                if (is_string($payload['notes'])) {
                    $notes = trim($payload['notes']) === '' ? null : $payload['notes'];
                }
                if ($notes !== $current['notes']) {
                    $updates[] = "notes = ?";
                    $params[] = $notes;
                    $changedFields[] = 'notes';
                }
            }
            
            $fields = [
                'weight_kg' => $mergedWeight,
                'body_fat_percent' => $mergedBf,
                'chest_cm' => $mergedChest,
                'waist_cm' => $mergedWaist,
                'hip_cm' => $mergedHip,
                'arm_cm' => $mergedArm,
                'thigh_cm' => $mergedThigh,
            ];
            
            foreach ($fields as $fieldName => $newVal) {
                $oldVal = $current[$fieldName];
                $isDifferent = false;
                if ($oldVal === null && $newVal !== null) $isDifferent = true;
                elseif ($oldVal !== null && $newVal === null) $isDifferent = true;
                elseif ($oldVal !== null && $newVal !== null) {
                    if ((float)$oldVal !== (float)$newVal) $isDifferent = true;
                }
                
                if ($isDifferent) {
                    $updates[] = "$fieldName = ?";
                    $params[] = $newVal;
                    $changedFields[] = $fieldName;
                }
            }
            
            if (empty($updates)) {
                $this->db->commit();
                Response::json(['success' => true]);
            }
            
            $adminId = (int)$_SESSION['admin_id'];
            $updates[] = "updated_by = ?";
            $params[] = $adminId;
            
            $params[] = $id;
            $params[] = $trainerId;
            $params[] = $trainerId;
            
            $setClause = implode(", ", $updates);
            $updateStmt = $this->db->prepare("
                UPDATE member_measurements 
                SET $setClause 
                WHERE id = ? 
                  AND trainer_id = ? 
                  AND deleted_at IS NULL
                  AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)
            ");
            $updateStmt->execute($params);
            
            if ($updateStmt->rowCount() !== 1) {
                $this->db->rollBack();
                Response::error('Failed to update measurement', 'INTERNAL_ERROR', 500);
            }
            
            AuditLogger::log(
                $this->db,
                $adminId,
                'trainer_member_measurement.update',
                'Trainer updated a member measurement',
                json_encode([
                    'measurement_id' => $id,
                    'member_id' => (int)$current['member_id'],
                    'trainer_id' => $trainerId,
                    'changed_fields' => $changedFields
                ])
            );
            
            $this->db->commit();
            Response::json(['success' => true]);
            
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if (strpos(get_class($e), 'PDOException') !== false) {
                Response::error('Database error occurred', 'INTERNAL_ERROR', 500);
            }
            Response::error('An unexpected error occurred', 'INTERNAL_ERROR', 500);
        }
    }

    public function destroy(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        
        try {
            $this->db->beginTransaction();
            $trainerId = $this->getTrainerProfileIdForUpdate();
            
            $stmt = $this->db->prepare("
                SELECT m.id, m.member_id 
                FROM member_measurements m
                JOIN members mem ON m.member_id = mem.id
                WHERE m.id = :id 
                  AND m.trainer_id = :trainer_id
                  AND mem.trainer_id = :trainer_id
                  AND mem.deleted_at IS NULL
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                $this->db->rollBack();
                Response::error('Measurement not found', 'NOT_FOUND', 404);
            }
            
            $adminId = (int)$_SESSION['admin_id'];
            
            $deleteStmt = $this->db->prepare("
                UPDATE member_measurements 
                SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? 
                WHERE id = ? 
                  AND trainer_id = ? 
                  AND deleted_at IS NULL
                  AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)
            ");
            $deleteStmt->execute([$adminId, $id, $trainerId, $trainerId]);
            
            if ($deleteStmt->rowCount() !== 1) {
                $this->db->rollBack();
                Response::error('Failed to archive measurement', 'INTERNAL_ERROR', 500);
            }
            
            AuditLogger::log(
                $this->db,
                $adminId,
                'trainer_member_measurement.delete',
                'Trainer archived a member measurement',
                json_encode([
                    'measurement_id' => $id,
                    'member_id' => (int)$current['member_id'],
                    'trainer_id' => $trainerId
                ])
            );
            
            $this->db->commit();
            Response::json(['success' => true]);
            
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if (strpos(get_class($e), 'PDOException') !== false) {
                Response::error('Database error occurred', 'INTERNAL_ERROR', 500);
            }
            Response::error('An unexpected error occurred', 'INTERNAL_ERROR', 500);
        }
    }

    public function restore(int $id): void {
        AuthMiddleware::hasRole(['trainer']);
        
        try {
            $this->db->beginTransaction();
            $trainerId = $this->getTrainerProfileIdForUpdate();
            
            $checkActive = $this->db->prepare("
                SELECT m.id, m.member_id 
                FROM member_measurements m
                JOIN members mem ON m.member_id = mem.id
                WHERE m.id = :id 
                  AND m.trainer_id = :trainer_id
                  AND mem.trainer_id = :trainer_id
                  AND mem.deleted_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $checkActive->bindValue(':id', $id, PDO::PARAM_INT);
            $checkActive->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
            $checkActive->execute();
            if ($checkActive->fetch()) {
                $this->db->rollBack();
                Response::error('Measurement is not archived', 'MEASUREMENT_NOT_ARCHIVED', 409);
            }
            
            $stmt = $this->db->prepare("
                SELECT m.id, m.member_id 
                FROM member_measurements m
                JOIN members mem ON m.member_id = mem.id
                WHERE m.id = :id 
                  AND m.trainer_id = :trainer_id
                  AND mem.trainer_id = :trainer_id
                  AND mem.deleted_at IS NULL
                  AND m.deleted_at IS NOT NULL
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            
            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                $this->db->rollBack();
                Response::error('Measurement not found', 'NOT_FOUND', 404);
            }
            
            $adminId = (int)$_SESSION['admin_id'];
            
            $restoreStmt = $this->db->prepare("
                UPDATE member_measurements 
                SET deleted_at = NULL, updated_by = ? 
                WHERE id = ? 
                  AND trainer_id = ? 
                  AND deleted_at IS NOT NULL
                  AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)
            ");
            $restoreStmt->execute([$adminId, $id, $trainerId, $trainerId]);
            
            if ($restoreStmt->rowCount() !== 1) {
                $this->db->rollBack();
                Response::error('Failed to restore measurement', 'INTERNAL_ERROR', 500);
            }
            
            AuditLogger::log(
                $this->db,
                $adminId,
                'trainer_member_measurement.restore',
                'Trainer restored a member measurement',
                json_encode([
                    'measurement_id' => $id,
                    'member_id' => (int)$current['member_id'],
                    'trainer_id' => $trainerId
                ])
            );
            
            $this->db->commit();
            Response::json(['success' => true]);
            
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if (strpos(get_class($e), 'PDOException') !== false) {
                Response::error('Database error occurred', 'INTERNAL_ERROR', 500);
            }
            Response::error('An unexpected error occurred', 'INTERNAL_ERROR', 500);
        }
    }
}
