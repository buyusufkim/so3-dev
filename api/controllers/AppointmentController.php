<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use PDO;
use Exception;
use Throwable;
use DateTime;
use DateTimeZone;

class AppointmentController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getTrainerProfileId(int $adminId): int {
        try {
            $stmt = $this->db->prepare("SELECT id FROM trainers WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1");
            $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
            $stmt->execute();
            $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$trainer) {
                Response::error('Trainer profile not found or inactive.', 'TRAINER_PROFILE_NOT_LINKED', 403);
            }
            return (int)$trainer['id'];
        } catch (Throwable $e) {
            error_log("Appointment Read Error (getTrainerProfileId): " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }

    // --- READ HELPERS ---

    private function parseWindowDate(string $dateStr, string $field): DateTime {
        try {
            $dt = new DateTime($dateStr, new DateTimeZone('Europe/Istanbul'));
            if ($dt->format('Y-m-d H:i:s') !== $dateStr) {
                Response::error("Invalid $field format. Expected YYYY-MM-DD HH:mm:ss", 'VALIDATION_ERROR', 422);
            }
            return $dt;
        } catch (Exception $e) {
            Response::error("Invalid $field format.", 'VALIDATION_ERROR', 422);
        }
    }

    private function handleRead(array $allowedParams, ?int $forcedTrainerId = null) {
        try {
            $queryParams = $_GET;
            
            // Strict allowlist validation
            foreach (array_keys($queryParams) as $key) {
                if (!in_array($key, $allowedParams, true)) {
                    Response::error("Forbidden query parameter: $key", 'VALIDATION_ERROR', 422);
                }
            }

            if (!isset($queryParams['from']) || !isset($queryParams['to'])) {
                Response::error("'from' and 'to' parameters are required.", 'VALIDATION_ERROR', 422);
            }

            if (!is_string($queryParams['from']) || !is_string($queryParams['to'])) {
                Response::error("'from' and 'to' must be strings.", 'VALIDATION_ERROR', 422);
            }

            $fromDt = $this->parseWindowDate($queryParams['from'], 'from');
            $toDt = $this->parseWindowDate($queryParams['to'], 'to');

            if ($fromDt >= $toDt) {
                Response::error("'from' must be before 'to'.", 'VALIDATION_ERROR', 422);
            }

            $diff = $fromDt->diff($toDt);
            if ($diff->days > 31 || ($diff->days == 31 && ($diff->h > 0 || $diff->i > 0 || $diff->s > 0))) {
                Response::error("Maximum allowed window is 31 calendar days.", 'VALIDATION_ERROR', 422);
            }

            $sql = "
                SELECT 
                    a.id as appointment_id, a.uuid as appointment_uuid, a.starts_at, a.ends_at, a.status,
                    m.id as member_id, m.uuid as member_uuid, m.first_name as member_first_name, m.last_name as member_last_name,
                    t.id as trainer_id, t.uuid as trainer_uuid, t.name as trainer_name
                FROM appointments a
                INNER JOIN members m ON a.member_id = m.id
                INNER JOIN trainers t ON a.trainer_id = t.id
                WHERE a.starts_at < ? AND a.ends_at > ?
            ";
            
            $params = [
                $queryParams['to'],
                $queryParams['from']
            ];

            if ($forcedTrainerId !== null) {
                $sql .= " AND a.trainer_id = ?";
                $params[] = $forcedTrainerId;
            } elseif (isset($queryParams['trainer_id'])) {
                if (!is_string($queryParams['trainer_id']) || !preg_match('/^[1-9]\d*$/', (string)$queryParams['trainer_id'])) {
                    Response::error("trainer_id must be a positive integer.", 'VALIDATION_ERROR', 422);
                }
                $sql .= " AND a.trainer_id = ?";
                $params[] = (int)$queryParams['trainer_id'];
            }

            if (isset($queryParams['member_id'])) {
                if (!is_string($queryParams['member_id']) || !preg_match('/^[1-9]\d*$/', (string)$queryParams['member_id'])) {
                    Response::error("member_id must be a positive integer.", 'VALIDATION_ERROR', 422);
                }
                $sql .= " AND a.member_id = ?";
                $params[] = (int)$queryParams['member_id'];
            }

            $sql .= " ORDER BY a.starts_at ASC, a.id ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $items = [];
            foreach ($rows as $row) {
                $items[] = [
                    'appointment' => [
                        'id' => (int)$row['appointment_id'],
                        'uuid' => $row['appointment_uuid'],
                        'starts_at' => $row['starts_at'],
                        'ends_at' => $row['ends_at'],
                        'status' => $row['status']
                    ],
                    'member' => [
                        'id' => (int)$row['member_id'],
                        'uuid' => $row['member_uuid'],
                        'first_name' => $row['member_first_name'],
                        'last_name' => $row['member_last_name']
                    ],
                    'trainer' => [
                        'id' => (int)$row['trainer_id'],
                        'uuid' => $row['trainer_uuid'],
                        'name' => $row['trainer_name']
                    ]
                ];
            }

            Response::json(['items' => $items]);

        } catch (Throwable $e) {
            error_log("Appointment Read Error: " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }

    // --- CREATE HELPERS ---

    private function handleCreate(array $allowedKeys, ?int $forcedTrainerId = null) {
        if (!empty($_GET)) {
            Response::error(
                'Query parameters are not allowed for appointment creation.',
                'VALIDATION_ERROR',
                422
            );
        }

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Malformed JSON payload.', 'INVALID_JSON', 400);
        }

        $dataKeys = array_keys($data);
        sort($dataKeys);
        $allowedSorted = $allowedKeys;
        sort($allowedSorted);

        if ($dataKeys !== $allowedSorted) {
            Response::error('Exact payload keys required.', 'VALIDATION_ERROR', 422);
        }

        if (!is_int($data['member_id']) || $data['member_id'] <= 0) {
            Response::error('member_id must be a positive integer.', 'VALIDATION_ERROR', 422);
        }

        $trainerId = $forcedTrainerId;
        if ($trainerId === null) {
            if (!is_int($data['trainer_id']) || $data['trainer_id'] <= 0) {
                Response::error('trainer_id must be a positive integer.', 'VALIDATION_ERROR', 422);
            }
            $trainerId = $data['trainer_id'];
        }

        if (!is_string($data['starts_at']) || !is_string($data['ends_at'])) {
            Response::error('starts_at and ends_at must be strings.', 'VALIDATION_ERROR', 422);
        }

        $startsDt = $this->parseWindowDate($data['starts_at'], 'starts_at');
        $endsDt = $this->parseWindowDate($data['ends_at'], 'ends_at');

        if ($startsDt >= $endsDt) {
            Response::error('starts_at must be strictly before ends_at.', 'VALIDATION_ERROR', 422);
        }

        if ($startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')) {
            Response::error('Appointments must start and end on the same calendar day (Europe/Istanbul).', 'VALIDATION_ERROR', 422);
        }

        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }

        try {
            $this->db->beginTransaction();

            // 1. Member lock
            $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
            $memStmt->bindValue(1, $data['member_id'], PDO::PARAM_INT);
            $memStmt->execute();
            $member = $memStmt->fetch(PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Member not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($member['status'] !== 'active') {
                $this->db->rollBack();
                Response::error('Member is not active.', 'MEMBER_INELIGIBLE', 409);
            }

            if ($member['membership_end_date'] !== null) {
                $memEndDate = new DateTime($member['membership_end_date'] . ' 23:59:59', new DateTimeZone('Europe/Istanbul'));
                // Use DATE() comparison semantics: starts_at local calendar date must be <= membership_end_date
                if ($startsDt->format('Y-m-d') > $memEndDate->format('Y-m-d')) {
                    $this->db->rollBack();
                    Response::error('Appointment date exceeds membership end date.', 'MEMBER_INELIGIBLE', 409);
                }
            }

            if ($forcedTrainerId !== null && (int)$member['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Trainer can only create appointments for assigned members.', 'FORBIDDEN', 403);
            }

            // 2. Trainer lock
            $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
            $trainStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
            $trainStmt->execute();
            $trainer = $trainStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Trainer not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($trainer['is_active'] != 1) {
                $this->db->rollBack();
                Response::error('Trainer is inactive.', 'TRAINER_INELIGIBLE', 409);
            }

            if ($forcedTrainerId !== null && (int)$trainer['admin_id'] !== $adminId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            // 3. Trainer conflict
            $tConfStmt = $this->db->prepare("
                SELECT id FROM appointments 
                WHERE trainer_id = ? AND status = 'scheduled' 
                  AND starts_at < ? AND ends_at > ?
                FOR UPDATE
            ");
            $tConfStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
            $tConfStmt->bindValue(2, $data['ends_at'], PDO::PARAM_STR);
            $tConfStmt->bindValue(3, $data['starts_at'], PDO::PARAM_STR);
            $tConfStmt->execute();
            
            if ($tConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Trainer is already booked for this time.', 'TRAINER_CONFLICT', 409);
            }

            // 4. Member conflict
            $mConfStmt = $this->db->prepare("
                SELECT id FROM appointments 
                WHERE member_id = ? AND status = 'scheduled' 
                  AND starts_at < ? AND ends_at > ?
                FOR UPDATE
            ");
            $mConfStmt->bindValue(1, $data['member_id'], PDO::PARAM_INT);
            $mConfStmt->bindValue(2, $data['ends_at'], PDO::PARAM_STR);
            $mConfStmt->bindValue(3, $data['starts_at'], PDO::PARAM_STR);
            $mConfStmt->execute();
            
            if ($mConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Member is already booked for this time.', 'MEMBER_CONFLICT', 409);
            }

            // 5. Insert
            $uuid = $this->generateUuid();
            $insStmt = $this->db->prepare("
                INSERT INTO appointments (uuid, member_id, trainer_id, starts_at, ends_at, status, created_by)
                VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
            ");
            $insStmt->bindValue(1, $uuid, PDO::PARAM_STR);
            $insStmt->bindValue(2, $data['member_id'], PDO::PARAM_INT);
            $insStmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $insStmt->bindValue(4, $data['starts_at'], PDO::PARAM_STR);
            $insStmt->bindValue(5, $data['ends_at'], PDO::PARAM_STR);
            $insStmt->bindValue(6, $adminId, PDO::PARAM_INT);
            $insStmt->execute();
            
            $appId = (int)$this->db->lastInsertId();

            $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $fetchStmt->bindValue(1, $appId, PDO::PARAM_INT);
            $fetchStmt->execute();
            $persistedApp = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if (!$persistedApp) {
                $this->db->rollBack();
                Response::error('Failed to retrieve persisted appointment.', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            // 6. Audit
            try {
                AuditLogger::log(
                    'appointment.created',
                    $adminId,
                    'appointment',
                    $appId,
                    [
                        'member_id' => (int)$persistedApp['member_id'],
                        'trainer_id' => (int)$persistedApp['trainer_id'],
                        'starts_at' => $persistedApp['starts_at'],
                        'ends_at' => $persistedApp['ends_at']
                    ]
                );
            } catch (Throwable $e) {
                // Do not fail request on audit failure
                error_log("Failed to log appointment creation: " . $e->getMessage());
            }

            Response::json([
                'appointment' => [
                    'id' => (int)$persistedApp['id'],
                    'uuid' => $persistedApp['uuid'],
                    'member_id' => (int)$persistedApp['member_id'],
                    'trainer_id' => (int)$persistedApp['trainer_id'],
                    'starts_at' => $persistedApp['starts_at'],
                    'ends_at' => $persistedApp['ends_at'],
                    'status' => $persistedApp['status']
                ]
            ], 201);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Appointment Create Error: " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }


    // --- RESCHEDULE HELPERS ---

    private function handleReschedule(int $appointmentId, ?int $forcedTrainerId = null) {
        if (!empty($_GET)) {
            Response::error(
                'Query parameters are not allowed for appointment reschedule.',
                'VALIDATION_ERROR',
                422
            );
        }

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Malformed JSON payload.', 'INVALID_JSON', 400);
        }

        $dataKeys = array_keys($data);
        sort($dataKeys);
        $allowedSorted = ['ends_at', 'starts_at'];

        if ($dataKeys !== $allowedSorted) {
            Response::error('Exact payload keys required.', 'VALIDATION_ERROR', 422);
        }

        if (!is_string($data['starts_at']) || !is_string($data['ends_at'])) {
            Response::error('starts_at and ends_at must be strings.', 'VALIDATION_ERROR', 422);
        }

        $startsDt = $this->parseWindowDate($data['starts_at'], 'starts_at');
        $endsDt = $this->parseWindowDate($data['ends_at'], 'ends_at');

        if ($startsDt >= $endsDt) {
            Response::error('starts_at must be strictly before ends_at.', 'VALIDATION_ERROR', 422);
        }

        if ($startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')) {
            Response::error('Appointments must start and end on the same calendar day (Europe/Istanbul).', 'VALIDATION_ERROR', 422);
        }

        $adminId = $_SESSION['admin_id'] ?? null;
        if (is_string($adminId) && preg_match('/^[1-9]\d*$/', $adminId)) {
            $adminId = (int)$adminId;
        }
        if (!is_int($adminId) || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }

        try {
            $this->db->beginTransaction();

            // Discovery
            $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $discStmt->bindValue(1, $appointmentId, PDO::PARAM_INT);
            $discStmt->execute();
            $discovery = $discStmt->fetch(PDO::FETCH_ASSOC);

            if (!$discovery) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            if ($forcedTrainerId !== null && (int)$discovery['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            $currentMemberId = (int)$discovery['member_id'];
            $currentTrainerId = (int)$discovery['trainer_id'];

            // 1. Member lock
            $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
            $memStmt->bindValue(1, $currentMemberId, PDO::PARAM_INT);
            $memStmt->execute();
            $member = $memStmt->fetch(PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Member not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($member['status'] !== 'active') {
                $this->db->rollBack();
                Response::error('Member is not active.', 'MEMBER_INELIGIBLE', 409);
            }

            if ($member['membership_end_date'] !== null) {
                $memEndDate = new DateTime($member['membership_end_date'] . ' 23:59:59', new DateTimeZone('Europe/Istanbul'));
                if ($startsDt->format('Y-m-d') > $memEndDate->format('Y-m-d')) {
                    $this->db->rollBack();
                    Response::error('Appointment date exceeds membership end date.', 'MEMBER_INELIGIBLE', 409);
                }
            }

            if ($forcedTrainerId !== null && (int)$member['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Trainer can only manage appointments for assigned members.', 'FORBIDDEN', 403);
            }

            // 2. Trainer lock
            $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
            $trainStmt->bindValue(1, $currentTrainerId, PDO::PARAM_INT);
            $trainStmt->execute();
            $trainer = $trainStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Trainer not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($trainer['is_active'] != 1) {
                $this->db->rollBack();
                Response::error('Trainer is inactive.', 'TRAINER_INELIGIBLE', 409);
            }

            if ($forcedTrainerId !== null && (int)$trainer['admin_id'] !== $adminId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            // 3. Appointment lock
            $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
            $appStmt->bindValue(1, $appointmentId, PDO::PARAM_INT);
            $appStmt->execute();
            $lockedApp = $appStmt->fetch(PDO::FETCH_ASSOC);

            if (!$lockedApp) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            if ((int)$lockedApp['member_id'] !== $currentMemberId || (int)$lockedApp['trainer_id'] !== $currentTrainerId) {
                $this->db->rollBack();
                Response::error('Appointment participants have changed.', 'APPOINTMENT_CHANGED', 409);
            }

            if ($lockedApp['status'] !== 'scheduled') {
                $this->db->rollBack();
                Response::error('Only scheduled appointments can be rescheduled.', 'APPOINTMENT_NOT_RESCHEDULABLE', 409);
            }

            if ($forcedTrainerId !== null && (int)$lockedApp['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            if ($lockedApp['starts_at'] === $data['starts_at'] && $lockedApp['ends_at'] === $data['ends_at']) {
                $this->db->rollBack();
                Response::error('At least one time value must change.', 'VALIDATION_ERROR', 422);
            }

            // 4. Trainer conflict
            $tConfStmt = $this->db->prepare("
                SELECT id FROM appointments 
                WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' 
                  AND starts_at < ? AND ends_at > ?
                FOR UPDATE
            ");
            $tConfStmt->bindValue(1, $appointmentId, PDO::PARAM_INT);
            $tConfStmt->bindValue(2, $currentTrainerId, PDO::PARAM_INT);
            $tConfStmt->bindValue(3, $data['ends_at'], PDO::PARAM_STR);
            $tConfStmt->bindValue(4, $data['starts_at'], PDO::PARAM_STR);
            $tConfStmt->execute();
            
            if ($tConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Trainer is already booked for this time.', 'TRAINER_CONFLICT', 409);
            }

            // 5. Member conflict
            $mConfStmt = $this->db->prepare("
                SELECT id FROM appointments 
                WHERE id <> ? AND member_id = ? AND status = 'scheduled' 
                  AND starts_at < ? AND ends_at > ?
                FOR UPDATE
            ");
            $mConfStmt->bindValue(1, $appointmentId, PDO::PARAM_INT);
            $mConfStmt->bindValue(2, $currentMemberId, PDO::PARAM_INT);
            $mConfStmt->bindValue(3, $data['ends_at'], PDO::PARAM_STR);
            $mConfStmt->bindValue(4, $data['starts_at'], PDO::PARAM_STR);
            $mConfStmt->execute();
            
            if ($mConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Member is already booked for this time.', 'MEMBER_CONFLICT', 409);
            }

            // 6. History INSERT
            $historyUuid = $this->generateUuid();
            $histStmt = $this->db->prepare("
                INSERT INTO appointment_reschedules 
                (uuid, appointment_id, previous_starts_at, previous_ends_at, new_starts_at, new_ends_at, rescheduled_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $histStmt->bindValue(1, $historyUuid, PDO::PARAM_STR);
            $histStmt->bindValue(2, $appointmentId, PDO::PARAM_INT);
            $histStmt->bindValue(3, $lockedApp['starts_at'], PDO::PARAM_STR);
            $histStmt->bindValue(4, $lockedApp['ends_at'], PDO::PARAM_STR);
            $histStmt->bindValue(5, $data['starts_at'], PDO::PARAM_STR);
            $histStmt->bindValue(6, $data['ends_at'], PDO::PARAM_STR);
            $histStmt->bindValue(7, $adminId, PDO::PARAM_INT);
            $histStmt->execute();

            // 7. Appointment UPDATE
            $updStmt = $this->db->prepare("
                UPDATE appointments 
                SET starts_at = ?, ends_at = ?, updated_by = ?
                WHERE id = ?
            ");
            $updStmt->bindValue(1, $data['starts_at'], PDO::PARAM_STR);
            $updStmt->bindValue(2, $data['ends_at'], PDO::PARAM_STR);
            $updStmt->bindValue(3, $adminId, PDO::PARAM_INT);
            $updStmt->bindValue(4, $appointmentId, PDO::PARAM_INT);
            $updStmt->execute();

            if ($updStmt->rowCount() === 0) {
                $this->db->rollBack();
                Response::error('Failed to update appointment.', 'INTERNAL_ERROR', 500);
            }

            // 8. Persisted fetch
            $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $fetchStmt->bindValue(1, $appointmentId, PDO::PARAM_INT);
            $fetchStmt->execute();
            $persistedApp = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if (!$persistedApp) {
                $this->db->rollBack();
                Response::error('Failed to retrieve persisted appointment.', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            // 9. Audit
            try {
                AuditLogger::log(
                    'appointment.rescheduled',
                    $adminId,
                    'appointment',
                    $appointmentId,
                    [
                        'previous_starts_at' => $lockedApp['starts_at'],
                        'previous_ends_at' => $lockedApp['ends_at'],
                        'new_starts_at' => $persistedApp['starts_at'],
                        'new_ends_at' => $persistedApp['ends_at']
                    ]
                );
            } catch (Throwable $e) {
                error_log("Failed to log appointment reschedule: " . $e->getMessage());
            }

            Response::json([
                'appointment' => [
                    'id' => (int)$persistedApp['id'],
                    'uuid' => $persistedApp['uuid'],
                    'member_id' => (int)$persistedApp['member_id'],
                    'trainer_id' => (int)$persistedApp['trainer_id'],
                    'starts_at' => $persistedApp['starts_at'],
                    'ends_at' => $persistedApp['ends_at'],
                    'status' => $persistedApp['status']
                ]
            ], 200);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Appointment Reschedule Error: " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }


    // --- CANCEL HELPERS ---

    private function handleCancel(int $appointmentId) {
        if (!empty($_GET)) {
            Response::error(
                'Query parameters are not allowed for appointment cancellation.',
                'VALIDATION_ERROR',
                422
            );
        }

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Malformed JSON payload.', 'INVALID_JSON', 400);
        }

        $dataKeys = array_keys($data);
        sort($dataKeys);
        $allowedSorted = ['cancellation_reason'];

        if ($dataKeys !== $allowedSorted) {
            Response::error('Exact payload keys required.', 'VALIDATION_ERROR', 422);
        }

        if (!is_string($data['cancellation_reason'])) {
            Response::error('cancellation_reason must be a string.', 'VALIDATION_ERROR', 422);
        }

        $reason = trim($data['cancellation_reason']);
        if (empty($reason)) {
            Response::error('cancellation_reason cannot be empty.', 'VALIDATION_ERROR', 422);
        }
        if (mb_strlen($reason) > 255) {
            Response::error('cancellation_reason cannot exceed 255 characters.', 'VALIDATION_ERROR', 422);
        }

        $adminId = $_SESSION['admin_id'] ?? null;
        if (is_string($adminId) && preg_match('/^[1-9]\d*$/', $adminId)) {
            $adminId = (int)$adminId;
        }
        if (!is_int($adminId) || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }

        try {
            $this->db->beginTransaction();

            // Discovery
            $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $discStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $discStmt->execute();
            $discovery = $discStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$discovery) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            $currentMemberId = (int)$discovery['member_id'];
            $currentTrainerId = (int)$discovery['trainer_id'];

            // 1. Member lock
            $memStmt = $this->db->prepare("SELECT id FROM members WHERE id = ? FOR UPDATE");
            $memStmt->bindValue(1, $currentMemberId, \PDO::PARAM_INT);
            $memStmt->execute();
            if (!$memStmt->fetch(\PDO::FETCH_ASSOC)) {
                $this->db->rollBack();
                Response::error('Member not found.', 'INTERNAL_ERROR', 500);
            }

            // 2. Trainer lock
            $trainStmt = $this->db->prepare("SELECT id FROM trainers WHERE id = ? FOR UPDATE");
            $trainStmt->bindValue(1, $currentTrainerId, \PDO::PARAM_INT);
            $trainStmt->execute();
            if (!$trainStmt->fetch(\PDO::FETCH_ASSOC)) {
                $this->db->rollBack();
                Response::error('Trainer not found.', 'INTERNAL_ERROR', 500);
            }

            // 3. Appointment lock
            $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
            $appStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $appStmt->execute();
            $lockedApp = $appStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$lockedApp) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            if ((int)$lockedApp['member_id'] !== $currentMemberId || (int)$lockedApp['trainer_id'] !== $currentTrainerId) {
                $this->db->rollBack();
                Response::error('Appointment participants have changed.', 'APPOINTMENT_CHANGED', 409);
            }

            if ($lockedApp['status'] !== 'scheduled') {
                $this->db->rollBack();
                Response::error('Only scheduled appointments can be cancelled.', 'APPOINTMENT_NOT_CANCELLABLE', 409);
            }

            $now = new DateTime('now', new DateTimeZone('Europe/Istanbul'));
            $endsAtDt = new DateTime($lockedApp['ends_at'], new DateTimeZone('Europe/Istanbul'));

            if ($now >= $endsAtDt) {
                $this->db->rollBack();
                Response::error('Cannot cancel an appointment that has already ended.', 'APPOINTMENT_NOT_CANCELLABLE', 409);
            }
            
            $cancelledAt = $now->format('Y-m-d H:i:s');

            // 4. Appointment UPDATE
            $updStmt = $this->db->prepare("
                UPDATE appointments 
                SET status = 'cancelled', cancellation_reason = ?, cancelled_by = ?, cancelled_at = ?, updated_by = ?
                WHERE id = ?
            ");
            $updStmt->bindValue(1, $reason, \PDO::PARAM_STR);
            $updStmt->bindValue(2, $adminId, \PDO::PARAM_INT);
            $updStmt->bindValue(3, $cancelledAt, \PDO::PARAM_STR);
            $updStmt->bindValue(4, $adminId, \PDO::PARAM_INT);
            $updStmt->bindValue(5, $appointmentId, \PDO::PARAM_INT);
            $updStmt->execute();

            if ($updStmt->rowCount() === 0) {
                $this->db->rollBack();
                Response::error('Failed to cancel appointment.', 'INTERNAL_ERROR', 500);
            }

            // 5. Persisted fetch
            $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status, cancellation_reason, cancelled_by, cancelled_at FROM appointments WHERE id = ?");
            $fetchStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $fetchStmt->execute();
            $persistedApp = $fetchStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$persistedApp) {
                $this->db->rollBack();
                Response::error('Failed to retrieve persisted appointment.', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            // 6. Audit
            try {
                AuditLogger::log(
                    'appointment.cancelled',
                    $adminId,
                    'appointment',
                    $appointmentId,
                    [
                        'previous_status' => $lockedApp['status'],
                        'new_status' => $persistedApp['status'],
                        'cancelled_at' => $persistedApp['cancelled_at']
                    ]
                );
            } catch (Throwable $e) {
                error_log("Failed to log appointment cancellation: " . $e->getMessage());
            }

            Response::json([
                'appointment' => [
                    'id' => (int)$persistedApp['id'],
                    'uuid' => $persistedApp['uuid'],
                    'member_id' => (int)$persistedApp['member_id'],
                    'trainer_id' => (int)$persistedApp['trainer_id'],
                    'starts_at' => $persistedApp['starts_at'],
                    'ends_at' => $persistedApp['ends_at'],
                    'status' => $persistedApp['status']
                ]
            ], 200);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Appointment Cancel Error: " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }

    // --- PUBLIC ENTRY POINTS ---

    public function getAdminAppointments() {
        $this->handleRead(['from', 'to', 'trainer_id', 'member_id']);
    }

    public function createAdminAppointment() {
        $this->handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at']);
    }

    public function getReceptionAppointments() {
        $this->handleRead(['from', 'to', 'trainer_id', 'member_id']);
    }

    public function createReceptionAppointment() {
        $this->handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at']);
    }

    public function getTrainerAppointments() {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId) {
            Response::error('Unauthorized.', 'UNAUTHORIZED', 401);
        }
        $trainerId = $this->getTrainerProfileId($adminId);
        $this->handleRead(['from', 'to', 'member_id'], $trainerId);
    }

    public function createTrainerAppointment() {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId) {
            Response::error('Unauthorized.', 'UNAUTHORIZED', 401);
        }
        $trainerId = $this->getTrainerProfileId($adminId);
        $this->handleCreate(['member_id', 'starts_at', 'ends_at'], $trainerId);
    }

    public function rescheduleAdminAppointment(int $id) {
        $this->handleReschedule($id);
    }

    public function rescheduleReceptionAppointment(int $id) {
        $this->handleReschedule($id);
    }

    public function rescheduleTrainerAppointment(int $id) {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (is_string($adminId) && preg_match('/^[1-9]\d*$/', $adminId)) {
            $adminId = (int)$adminId;
        }
        if (!is_int($adminId) || $adminId <= 0) {
            Response::error('Unauthorized.', 'UNAUTHORIZED', 401);
        }
        $trainerId = $this->getTrainerProfileId($adminId);
        $this->handleReschedule($id, $trainerId);
    }

    public function cancelAdminAppointment(int $id) {
        $this->handleCancel($id);
    }

    public function cancelReceptionAppointment(int $id) {
        $this->handleCancel($id);
    }

    public function completeAdminAppointment(int $id) {
        $this->handleTerminalize($id, 'admin', 'completed');
    }

    public function noShowAdminAppointment(int $id) {
        $this->handleTerminalize($id, 'admin', 'no_show');
    }

    public function completeTrainerAppointment(int $id) {
        $this->handleTerminalize($id, 'trainer', 'completed');
    }

    public function noShowTrainerAppointment(int $id) {
        $this->handleTerminalize($id, 'trainer', 'no_show');
    }

    private function handleTerminalize(int $id, string $scope, string $targetStatus) {
        if ($targetStatus !== 'completed' && $targetStatus !== 'no_show') {
            Response::error('Internal Error.', 'INTERNAL_ERROR', 500);
        }
        
        if (!empty($_GET)) {
            Response::error('Query parameters are not allowed.', 'VALIDATION_ERROR', 422);
        }
        
        $rawBody = file_get_contents('php://input');
        if (empty(trim($rawBody))) {
            Response::error('Request body is required.', 'INVALID_JSON', 400);
        }
        
        $dataObj = json_decode($rawBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON.', 'INVALID_JSON', 400);
        }
        if (!is_object($dataObj)) {
            Response::error('Payload must be a JSON object.', 'VALIDATION_ERROR', 422);
        }
        
        $data = json_decode($rawBody, true);
        if (count($data) > 0) {
            Response::error('No payload fields allowed.', 'VALIDATION_ERROR', 422);
        }
        
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!is_int($adminId)) {
            if (is_string($adminId) && preg_match('/^[1-9]\d*$/', $adminId)) {
                $adminId = (int)$adminId;
            } else {
                Response::error('Unauthorized.', 'UNAUTHORIZED', 401);
            }
        }
        if ($adminId <= 0) {
            Response::error('Unauthorized.', 'UNAUTHORIZED', 401);
        }

        if ($id <= 0) {
            Response::error('Invalid appointment ID.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $discStmt->execute([$id]);
            $discovery = $discStmt->fetch(\PDO::FETCH_ASSOC);
            if (!$discovery) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            $memStmt = $this->db->prepare("SELECT id FROM members WHERE id = ? FOR UPDATE");
            $memStmt->execute([$discovery['member_id']]);
            $member = $memStmt->fetch(\PDO::FETCH_ASSOC);
            if (!$member) {
                $this->db->rollBack();
                Response::error('Member not found.', 'INTERNAL_ERROR', 500);
            }

            $trnStmt = $this->db->prepare("SELECT id, admin_id FROM trainers WHERE id = ? FOR UPDATE");
            $trnStmt->execute([$discovery['trainer_id']]);
            $trainer = $trnStmt->fetch(\PDO::FETCH_ASSOC);
            if (!$trainer) {
                $this->db->rollBack();
                Response::error('Trainer not found.', 'INTERNAL_ERROR', 500);
            }

            if ($scope === 'trainer') {
                if ((int)$trainer['admin_id'] !== $adminId) {
                    $this->db->rollBack();
                    Response::error('Forbidden.', 'FORBIDDEN', 403);
                }
            }

            $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
            $appStmt->execute([$id]);
            $lockedApp = $appStmt->fetch(\PDO::FETCH_ASSOC);
            if (!$lockedApp) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            if ($lockedApp['member_id'] !== $discovery['member_id'] || $lockedApp['trainer_id'] !== $discovery['trainer_id']) {
                $this->db->rollBack();
                Response::error('Appointment participants have changed.', 'APPOINTMENT_CHANGED', 409);
            }

            if ($lockedApp['status'] !== 'scheduled') {
                $this->db->rollBack();
                Response::error('Only scheduled appointments can be terminalized.', 'APPOINTMENT_NOT_TERMINALIZABLE', 409);
            }

            $now = new \DateTime('now', new \DateTimeZone('Europe/Istanbul'));
            $terminalizedAt = $now->format('Y-m-d H:i:s');

            $endsAtDt = new \DateTime($lockedApp['ends_at'], new \DateTimeZone('Europe/Istanbul'));
            if ($now < $endsAtDt) {
                $this->db->rollBack();
                Response::error('Appointment cannot be terminalized before it ends.', 'APPOINTMENT_NOT_TERMINALIZABLE', 409);
            }

            if ($targetStatus === 'completed') {
                $updStmt = $this->db->prepare("
                    UPDATE appointments 
                    SET status = 'completed', completed_by = ?, completed_at = ?, updated_by = ?
                    WHERE id = ?
                ");
                $updStmt->execute([$adminId, $terminalizedAt, $adminId, $id]);
            } else {
                $updStmt = $this->db->prepare("
                    UPDATE appointments 
                    SET status = 'no_show', no_show_by = ?, no_show_at = ?, updated_by = ?
                    WHERE id = ?
                ");
                $updStmt->execute([$adminId, $terminalizedAt, $adminId, $id]);
            }

            if ($updStmt->rowCount() === 0) {
                $this->db->rollBack();
                Response::error('Failed to terminalize appointment.', 'INTERNAL_ERROR', 500);
            }

            $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status, completed_by, completed_at, no_show_by, no_show_at FROM appointments WHERE id = ?");
            $fetchStmt->execute([$id]);
            $persisted = $fetchStmt->fetch(\PDO::FETCH_ASSOC);
            if (!$persisted) {
                $this->db->rollBack();
                Response::error('Failed to fetch persisted appointment.', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            try {
                if ($targetStatus === 'completed') {
                    \Core\AuditLogger::log('appointment.completed', $adminId, 'appointment', $id, [
                        'previous_status' => $lockedApp['status'],
                        'new_status' => $persisted['status'],
                        'completed_at' => $persisted['completed_at']
                    ]);
                } else {
                    \Core\AuditLogger::log('appointment.no_show', $adminId, 'appointment', $id, [
                        'previous_status' => $lockedApp['status'],
                        'new_status' => $persisted['status'],
                        'no_show_at' => $persisted['no_show_at']
                    ]);
                }
            } catch (\Throwable $e) {
                error_log('AuditLogger failed during appointment ' . $targetStatus . ': ' . $e->getMessage());
            }

            Response::json([
                'appointment' => [
                    'id' => (int)$persisted['id'],
                    'uuid' => $persisted['uuid'],
                    'member_id' => (int)$persisted['member_id'],
                    'trainer_id' => (int)$persisted['trainer_id'],
                    'starts_at' => $persisted['starts_at'],
                    'ends_at' => $persisted['ends_at'],
                    'status' => $persisted['status']
                ]
            ]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Appointment terminalization error: ' . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }

}
