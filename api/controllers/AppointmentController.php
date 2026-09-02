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
        // v4 UUID
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    private function getTrainerProfileId(int $adminId): int {
        $stmt = $this->db->prepare("SELECT id FROM trainers WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1");
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$trainer) {
            Response::json(['error' => 'TRAINER_PROFILE_NOT_LINKED', 'message' => 'Trainer profile not found or inactive.'], 403);
        }
        return (int)$trainer['id'];
    }

    // --- READ HELPERS ---

    private function parseWindowDate(string $dateStr, string $field): DateTime {
        try {
            $dt = new DateTime($dateStr, new DateTimeZone('Europe/Istanbul'));
            if ($dt->format('Y-m-d H:i:s') !== $dateStr) {
                Response::json(['error' => 'VALIDATION_ERROR', 'message' => "Invalid $field format. Expected YYYY-MM-DD HH:mm:ss"], 422);
            }
            return $dt;
        } catch (Exception $e) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => "Invalid $field format."], 422);
        }
    }

    private function handleRead(array $allowedParams, ?int $forcedTrainerId = null) {
        $queryParams = $_GET;
        
        // Strict allowlist validation
        foreach (array_keys($queryParams) as $key) {
            if (!in_array($key, $allowedParams, true)) {
                Response::json(['error' => 'VALIDATION_ERROR', 'message' => "Forbidden query parameter: $key"], 422);
            }
        }

        if (!isset($queryParams['from']) || !isset($queryParams['to'])) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => "'from' and 'to' parameters are required."], 422);
        }

        if (!is_string($queryParams['from']) || !is_string($queryParams['to'])) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => "'from' and 'to' must be strings."], 422);
        }

        $fromDt = $this->parseWindowDate($queryParams['from'], 'from');
        $toDt = $this->parseWindowDate($queryParams['to'], 'to');

        if ($fromDt >= $toDt) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => "'from' must be before 'to'."], 422);
        }

        $diff = $fromDt->diff($toDt);
        if ($diff->days > 31 || ($diff->days == 31 && ($diff->h > 0 || $diff->i > 0 || $diff->s > 0))) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => "Maximum allowed window is 31 calendar days."], 422);
        }

        $sql = "
            SELECT 
                a.id as appointment_id, a.uuid as appointment_uuid, a.starts_at, a.ends_at, a.status,
                m.id as member_id, m.uuid as member_uuid, m.first_name as member_first_name, m.last_name as member_last_name,
                t.id as trainer_id, t.uuid as trainer_uuid, t.display_name as trainer_name
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
            if (!preg_match('/^[1-9]\d*$/', (string)$queryParams['trainer_id'])) {
                Response::json(['error' => 'VALIDATION_ERROR', 'message' => "trainer_id must be a positive integer."], 422);
            }
            $sql .= " AND a.trainer_id = ?";
            $params[] = (int)$queryParams['trainer_id'];
        }

        if (isset($queryParams['member_id'])) {
            if (!preg_match('/^[1-9]\d*$/', (string)$queryParams['member_id'])) {
                Response::json(['error' => 'VALIDATION_ERROR', 'message' => "member_id must be a positive integer."], 422);
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
    }

    // --- CREATE HELPERS ---

    private function handleCreate(array $allowedKeys, ?int $forcedTrainerId = null) {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::json(['error' => 'INVALID_JSON', 'message' => 'Malformed JSON payload.'], 400);
        }

        $dataKeys = array_keys($data);
        sort($dataKeys);
        $allowedSorted = $allowedKeys;
        sort($allowedSorted);

        if ($dataKeys !== $allowedSorted) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => 'Exact payload keys required.'], 422);
        }

        if (!is_int($data['member_id']) || $data['member_id'] <= 0) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => 'member_id must be a positive integer.'], 422);
        }

        $trainerId = $forcedTrainerId;
        if ($trainerId === null) {
            if (!is_int($data['trainer_id']) || $data['trainer_id'] <= 0) {
                Response::json(['error' => 'VALIDATION_ERROR', 'message' => 'trainer_id must be a positive integer.'], 422);
            }
            $trainerId = $data['trainer_id'];
        }

        if (!is_string($data['starts_at']) || !is_string($data['ends_at'])) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => 'starts_at and ends_at must be strings.'], 422);
        }

        $startsDt = $this->parseWindowDate($data['starts_at'], 'starts_at');
        $endsDt = $this->parseWindowDate($data['ends_at'], 'ends_at');

        if ($startsDt >= $endsDt) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => 'starts_at must be strictly before ends_at.'], 422);
        }

        if ($startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')) {
            Response::json(['error' => 'VALIDATION_ERROR', 'message' => 'Appointments must start and end on the same calendar day (Europe/Istanbul).'], 422);
        }

        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId || $adminId <= 0) {
            Response::json(['error' => 'UNAUTHORIZED', 'message' => 'Valid session required.'], 401);
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
                Response::json(['error' => 'NOT_FOUND', 'message' => 'Member not found or deleted.'], 404);
            }

            if ($member['status'] !== 'active') {
                $this->db->rollBack();
                Response::json(['error' => 'MEMBER_INELIGIBLE', 'message' => 'Member is not active.'], 409);
            }

            if ($member['membership_end_date'] !== null) {
                $memEndDate = new DateTime($member['membership_end_date'] . ' 23:59:59', new DateTimeZone('Europe/Istanbul'));
                // Use DATE() comparison semantics: starts_at local calendar date must be <= membership_end_date
                if ($startsDt->format('Y-m-d') > $memEndDate->format('Y-m-d')) {
                    $this->db->rollBack();
                    Response::json(['error' => 'MEMBER_INELIGIBLE', 'message' => 'Appointment date exceeds membership end date.'], 409);
                }
            }

            if ($forcedTrainerId !== null && (int)$member['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::json(['error' => 'FORBIDDEN', 'message' => 'Trainer can only create appointments for assigned members.'], 403);
            }

            // 2. Trainer lock
            $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
            $trainStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
            $trainStmt->execute();
            $trainer = $trainStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::json(['error' => 'NOT_FOUND', 'message' => 'Trainer not found or deleted.'], 404);
            }

            if ($trainer['is_active'] != 1) {
                $this->db->rollBack();
                Response::json(['error' => 'TRAINER_INELIGIBLE', 'message' => 'Trainer is inactive.'], 409);
            }

            if ($forcedTrainerId !== null && (int)$trainer['admin_id'] !== $adminId) {
                $this->db->rollBack();
                Response::json(['error' => 'FORBIDDEN', 'message' => 'Unauthorized trainer profile access.'], 403);
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
                Response::json(['error' => 'TRAINER_CONFLICT', 'message' => 'Trainer is already booked for this time.'], 409);
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
                Response::json(['error' => 'MEMBER_CONFLICT', 'message' => 'Member is already booked for this time.'], 409);
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

            $this->db->commit();

            // 6. Audit
            try {
                AuditLogger::log(
                    'appointment.created',
                    "Appointment created for member {$data['member_id']} with trainer {$trainerId}",
                    [
                        'member_id' => $data['member_id'],
                        'trainer_id' => $trainerId,
                        'starts_at' => $data['starts_at'],
                        'ends_at' => $data['ends_at']
                    ],
                    $adminId,
                    $this->db
                );
            } catch (Throwable $e) {
                // Do not fail request on audit failure
                error_log("Failed to log appointment creation: " . $e->getMessage());
            }

            Response::json([
                'appointment' => [
                    'id' => $appId,
                    'uuid' => $uuid,
                    'member_id' => (int)$data['member_id'],
                    'trainer_id' => $trainerId,
                    'starts_at' => $data['starts_at'],
                    'ends_at' => $data['ends_at'],
                    'status' => 'scheduled'
                ]
            ], 201);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Appointment Create Error: " . $e->getMessage());
            Response::json(['error' => 'INTERNAL_ERROR', 'message' => 'An unexpected error occurred.'], 500);
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
            Response::json(['error' => 'UNAUTHORIZED', 'message' => 'Unauthorized.'], 401);
        }
        $trainerId = $this->getTrainerProfileId($adminId);
        $this->handleRead(['from', 'to', 'member_id'], $trainerId);
    }

    public function createTrainerAppointment() {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId) {
            Response::json(['error' => 'UNAUTHORIZED', 'message' => 'Unauthorized.'], 401);
        }
        $trainerId = $this->getTrainerProfileId($adminId);
        $this->handleCreate(['member_id', 'starts_at', 'ends_at'], $trainerId);
    }
}
