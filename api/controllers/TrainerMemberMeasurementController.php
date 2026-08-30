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
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
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
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return (int)$trainer['id'];
    }

    private function checkMemberOwnership(int $memberId, int $trainerId): void {
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL");
        $stmt->bindValue(1, $memberId, PDO::PARAM_INT);
        $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $stmt->execute();
        if (!$stmt->fetch()) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);
        }
    }

    private function checkMemberOwnershipForUpdate(int $memberId, int $trainerId): void {
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE");
        $stmt->bindValue(1, $memberId, PDO::PARAM_INT);
        $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $stmt->execute();
        if (!$stmt->fetch()) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
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
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON', 'BAD_REQUEST', 400);
        }
        if (!is_object($isObj)) {
            Response::error('JSON root must be an object', 'BAD_REQUEST', 400);
        }

        $payload = json_decode($raw, true);

        return $payload;
    }

    private function validateMeasurement($val, string $fieldName, float $maxLimit, bool $allowZero = false) {
        if ($val === null) return null;
        if (!is_int($val) && !is_float($val)) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error("$fieldName must be a JSON number or null", 'VALIDATION_ERROR', 422);
        }
        if (is_nan($val) || is_infinite($val)) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error("$fieldName is invalid", 'VALIDATION_ERROR', 422);
        }
        if ($allowZero) {
            if ($val < 0 || $val > $maxLimit) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                Response::error("$fieldName must be between 0 and $maxLimit", 'VALIDATION_ERROR', 422);
            }
        } else {
            if ($val <= 0 || $val > $maxLimit) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                Response::error("$fieldName must be greater than 0 and up to $maxLimit", 'VALIDATION_ERROR', 422);
            }
        }

        $diff = abs(round((float)$val, 2) - (float)$val);
        if ($diff > 1.0e-9) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
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

        if (!is_string($pageRaw) || !is_string($perPageRaw) || !preg_match('/^[1-9]\d*$/', $pageRaw) || !preg_match('/^[1-9]\d*$/', $perPageRaw)) {
            Response::error('Pagination parameters must be canonical positive integers', 'VALIDATION_ERROR', 422);
        }

        $page = (int)$pageRaw;
        $perPage = (int)$perPageRaw;

        if ((string)$page !== $pageRaw || (string)$perPage !== $perPageRaw) {
            Response::error('Pagination parameters exceed limits', 'VALIDATION_ERROR', 422);
        }

        if ($perPage > 100) {
            Response::error('Per page cannot exceed 100', 'VALIDATION_ERROR', 422);
        }

        if ($page > 1) {
            $maxPageForOffset = intdiv(PHP_INT_MAX, $perPage);
            if (($page - 1) > $maxPageForOffset) {
                Response::error('Pagination offset overflow', 'VALIDATION_ERROR', 422);
            }
        }
        $offset = ($page - 1) * $perPage;

        $deleted = $_GET['deleted'] ?? 'active';
        if (!in_array($deleted, ['active', 'deleted', 'all'], true)) {
            Response::error('Invalid deleted parameter', 'VALIDATION_ERROR', 422);
        }

        $where = "member_measurements.member_id = :member_id
                  AND member_measurements.trainer_id = :measurement_trainer_id
                  AND mem.trainer_id = :member_trainer_id
                  AND mem.deleted_at IS NULL";

        if ($deleted === 'active') {
            $where .= " AND member_measurements.deleted_at IS NULL";
        } elseif ($deleted === 'deleted') {
            $where .= " AND member_measurements.deleted_at IS NOT NULL";
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM member_measurements JOIN members mem ON member_measurements.member_id = mem.id WHERE $where");
        $countStmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);
        $countStmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
        $countStmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
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

        $stmt = $this->db->prepare("
            SELECT member_measurements.id, member_measurements.uuid, member_measurements.member_id, member_measurements.trainer_id, member_measurements.measured_at, member_measurements.weight_kg, member_measurements.body_fat_percent,
                   member_measurements.chest_cm, member_measurements.waist_cm, member_measurements.hip_cm, member_measurements.arm_cm, member_measurements.thigh_cm, member_measurements.created_at, member_measurements.updated_at, member_measurements.deleted_at
            FROM member_measurements
            JOIN members mem ON member_measurements.member_id = mem.id
            WHERE $where
            ORDER BY member_measurements.measured_at DESC, member_measurements.id DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);
        $stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
        $stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
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
              AND m.trainer_id = :measurement_trainer_id
              AND mem.trainer_id = :member_trainer_id
              AND mem.deleted_at IS NULL
              AND m.deleted_at IS NULL
        ");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
        $stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
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

            if ($stmt->rowCount() !== 1) {
                $this->db->rollBack();
                Response::error('Failed to create measurement', 'INTERNAL_ERROR', 500);
            }

            $newId = (int)$this->db->lastInsertId();
            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_measurement.create',
                    $adminId,
                    'member_measurements',
                    $newId,
                    [
                        'measurement_id' => $newId,
                        'member_id' => $memberId,
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (Throwable $auditError) {
                error_log("Audit error: " . $auditError->getMessage());
            }

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

        $validated = [];
        if (array_key_exists('weight_kg', $payload)) {
            $validated['weight_kg'] = $this->validateMeasurement($payload['weight_kg'], 'weight_kg', 9999.99);
        }
        if (array_key_exists('body_fat_percent', $payload)) {
            $validated['body_fat_percent'] = $this->validateMeasurement($payload['body_fat_percent'], 'body_fat_percent', 100.0, true);
        }
        if (array_key_exists('chest_cm', $payload)) {
            $validated['chest_cm'] = $this->validateMeasurement($payload['chest_cm'], 'chest_cm', 9999.99);
        }
        if (array_key_exists('waist_cm', $payload)) {
            $validated['waist_cm'] = $this->validateMeasurement($payload['waist_cm'], 'waist_cm', 9999.99);
        }
        if (array_key_exists('hip_cm', $payload)) {
            $validated['hip_cm'] = $this->validateMeasurement($payload['hip_cm'], 'hip_cm', 9999.99);
        }
        if (array_key_exists('arm_cm', $payload)) {
            $validated['arm_cm'] = $this->validateMeasurement($payload['arm_cm'], 'arm_cm', 9999.99);
        }
        if (array_key_exists('thigh_cm', $payload)) {
            $validated['thigh_cm'] = $this->validateMeasurement($payload['thigh_cm'], 'thigh_cm', 9999.99);
        }

        try {
            $this->db->beginTransaction();

            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("
                SELECT m.*
                FROM member_measurements m
                JOIN members mem ON m.member_id = mem.id
                WHERE m.id = :id
                  AND m.trainer_id = :measurement_trainer_id
                  AND mem.trainer_id = :member_trainer_id
                  AND mem.deleted_at IS NULL
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->execute();

            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                $this->db->rollBack();
                Response::error('Measurement not found', 'NOT_FOUND', 404);
            }

            $updates = [];
            $params = [];
            $changedFields = [];

            $mergedWeight = array_key_exists('weight_kg', $validated) ? $validated['weight_kg'] : $current['weight_kg'];
            $mergedBf = array_key_exists('body_fat_percent', $validated) ? $validated['body_fat_percent'] : $current['body_fat_percent'];
            $mergedChest = array_key_exists('chest_cm', $validated) ? $validated['chest_cm'] : $current['chest_cm'];
            $mergedWaist = array_key_exists('waist_cm', $validated) ? $validated['waist_cm'] : $current['waist_cm'];
            $mergedHip = array_key_exists('hip_cm', $validated) ? $validated['hip_cm'] : $current['hip_cm'];
            $mergedArm = array_key_exists('arm_cm', $validated) ? $validated['arm_cm'] : $current['arm_cm'];
            $mergedThigh = array_key_exists('thigh_cm', $validated) ? $validated['thigh_cm'] : $current['thigh_cm'];

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
                if ($notes !== $current['notes']) {
                    $updates[] = "notes = ?";
                    $params[] = $notes;
                    $changedFields[] = 'notes';
                }
            }

            foreach ($validated as $fieldName => $newVal) {
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

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_measurement.update',
                    $adminId,
                    'member_measurements',
                    $id,
                    [
                        'measurement_id' => $id,
                        'member_id' => (int)$current['member_id'],
                        'trainer_id' => $trainerId,
                        'changed_fields' => $changedFields
                    ]
                );
            } catch (Throwable $auditError) {
                error_log("Audit error: " . $auditError->getMessage());
            }

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
                  AND m.trainer_id = :measurement_trainer_id
                  AND mem.trainer_id = :member_trainer_id
                  AND mem.deleted_at IS NULL
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
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
            $deleteStmt->bindValue(1, $adminId, PDO::PARAM_INT);
            $deleteStmt->bindValue(2, $id, PDO::PARAM_INT);
            $deleteStmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $deleteStmt->bindValue(4, $trainerId, PDO::PARAM_INT);
            $deleteStmt->execute();

            if ($deleteStmt->rowCount() !== 1) {
                $this->db->rollBack();
                Response::error('Failed to archive measurement', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_measurement.delete',
                    $adminId,
                    'member_measurements',
                    $id,
                    [
                        'measurement_id' => $id,
                        'member_id' => (int)$current['member_id'],
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (Throwable $auditError) {
                error_log("Audit error: " . $auditError->getMessage());
            }

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

            $stmt = $this->db->prepare("
                SELECT m.id, m.member_id, m.deleted_at
                FROM member_measurements m
                JOIN members mem ON m.member_id = mem.id
                WHERE m.id = :id
                  AND m.trainer_id = :measurement_trainer_id
                  AND mem.trainer_id = :member_trainer_id
                  AND mem.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
            $stmt->execute();

            $current = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                $this->db->rollBack();
                Response::error('Measurement not found', 'NOT_FOUND', 404);
            }

            if ($current['deleted_at'] === null) {
                $this->db->rollBack();
                Response::error('Measurement is not archived', 'MEASUREMENT_NOT_ARCHIVED', 409);
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
            $restoreStmt->bindValue(1, $adminId, PDO::PARAM_INT);
            $restoreStmt->bindValue(2, $id, PDO::PARAM_INT);
            $restoreStmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $restoreStmt->bindValue(4, $trainerId, PDO::PARAM_INT);
            $restoreStmt->execute();

            if ($restoreStmt->rowCount() !== 1) {
                $this->db->rollBack();
                Response::error('Failed to restore measurement', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_member_measurement.restore',
                    $adminId,
                    'member_measurements',
                    $id,
                    [
                        'measurement_id' => $id,
                        'member_id' => (int)$current['member_id'],
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (Throwable $auditError) {
                error_log("Audit error: " . $auditError->getMessage());
            }

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
