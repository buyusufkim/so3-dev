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

class TrainerAvailabilityController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function rejectQueryParams(): void
    {
        if (!empty($_GET)) {
            Response::error('Query parameters are not allowed.', 'VALIDATION_ERROR', 422);
        }
    }

    private function resolveTrainerFromSession(): array
    {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }

        $stmt = $this->db->prepare("SELECT id, name, is_active, deleted_at FROM trainers WHERE admin_id = ? AND deleted_at IS NULL");
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            Response::error('Trainer profile not found.', 'NOT_FOUND', 404);
        }

        if ((int)$trainer['is_active'] !== 1) {
            Response::error('Trainer profile is inactive.', 'TRAINER_INELIGIBLE', 403);
        }

        return $trainer;
    }

    private function resolveTrainerById(int $trainerId): array
    {
        if ($trainerId <= 0) {
            Response::error('Invalid trainer ID.', 'VALIDATION_ERROR', 422);
        }

        $stmt = $this->db->prepare("SELECT id, name, is_active, deleted_at FROM trainers WHERE id = ?");
        $stmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer || $trainer['deleted_at'] !== null) {
            Response::error('Trainer not found.', 'NOT_FOUND', 404);
        }

        return $trainer;
    }

    private function fetchAvailabilityResponse(int $trainerId, string $trainerName): array
    {
        $wStmt = $this->db->prepare("
            SELECT day_of_week, start_time, end_time 
            FROM trainer_availability_windows 
            WHERE trainer_id = ? 
            ORDER BY day_of_week ASC, start_time ASC, end_time ASC
        ");
        $wStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $wStmt->execute();
        $windows = $wStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $formattedWindows = [];
        foreach ($windows as $w) {
            $formattedWindows[] = [
                'day_of_week' => (int)$w['day_of_week'],
                'start_time' => substr($w['start_time'], 0, 5),
                'end_time' => substr($w['end_time'], 0, 5)
            ];
        }

        $bStmt = $this->db->prepare("
            SELECT id, starts_at, ends_at, reason 
            FROM trainer_unavailability_blocks 
            WHERE trainer_id = ? 
            ORDER BY starts_at ASC, ends_at ASC, id ASC
        ");
        $bStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $bStmt->execute();
        $blocks = $bStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $formattedBlocks = [];
        foreach ($blocks as $b) {
            $formattedBlocks[] = [
                'id' => (int)$b['id'],
                'starts_at' => $b['starts_at'],
                'ends_at' => $b['ends_at'],
                'reason' => $b['reason']
            ];
        }

        return [
            'trainer' => [
                'id' => $trainerId,
                'name' => $trainerName
            ],
            'timezone' => 'Europe/Istanbul',
            'weekly_windows' => $formattedWindows,
            'unavailability_blocks' => $formattedBlocks
        ];
    }

    private function parseAndValidateReplacePayload(): array
    {
        $this->rejectQueryParams();

        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') === false) {
            Response::error('Content-Type must be application/json.', 'INVALID_CONTENT_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if (strlen($raw) > 1048576) {
            Response::error('Payload too large.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Malformed JSON payload.', 'INVALID_JSON', 400);
        }

        $dataKeys = array_keys($data);
        sort($dataKeys);
        if ($dataKeys !== ['unavailability_blocks', 'weekly_windows']) {
            Response::error('Exact payload keys required: weekly_windows, unavailability_blocks.', 'VALIDATION_ERROR', 422);
        }

        if (!is_array($data['weekly_windows']) || !is_array($data['unavailability_blocks'])) {
            Response::error('Payload fields must be arrays.', 'VALIDATION_ERROR', 422);
        }

        if (count($data['weekly_windows']) > 28) {
            Response::error('Maximum of 28 weekly windows allowed.', 'VALIDATION_ERROR', 422);
        }

        if (count($data['unavailability_blocks']) > 100) {
            Response::error('Maximum of 100 unavailability blocks allowed.', 'VALIDATION_ERROR', 422);
        }

        // Validate weekly windows
        $validatedWindows = [];
        $windowsByDay = [];

        foreach ($data['weekly_windows'] as $w) {
            if (!is_array($w)) {
                Response::error('Each weekly window must be an object.', 'VALIDATION_ERROR', 422);
            }
            $wKeys = array_keys($w);
            sort($wKeys);
            if ($wKeys !== ['day_of_week', 'end_time', 'start_time']) {
                Response::error('Exact window keys required: day_of_week, start_time, end_time.', 'VALIDATION_ERROR', 422);
            }

            if (!is_int($w['day_of_week']) || $w['day_of_week'] < 1 || $w['day_of_week'] > 7) {
                Response::error('day_of_week must be an integer between 1 and 7.', 'VALIDATION_ERROR', 422);
            }

            if (!is_string($w['start_time']) || !is_string($w['end_time'])) {
                Response::error('start_time and end_time must be strings.', 'VALIDATION_ERROR', 422);
            }

            $timeRegex = '/^(?:[01]\d|2[0-3]):[0-5]\d$/';
            if (!preg_match($timeRegex, $w['start_time']) || !preg_match($timeRegex, $w['end_time'])) {
                Response::error('start_time and end_time must be in 24-hour HH:MM format.', 'VALIDATION_ERROR', 422);
            }

            $startMinutes = (int)substr($w['start_time'], 0, 2) * 60 + (int)substr($w['start_time'], 3, 2);
            $endMinutes = (int)substr($w['end_time'], 0, 2) * 60 + (int)substr($w['end_time'], 3, 2);

            if ($startMinutes >= $endMinutes) {
                Response::error('start_time must be strictly before end_time.', 'VALIDATION_ERROR', 422);
            }

            $day = $w['day_of_week'];
            if (!isset($windowsByDay[$day])) {
                $windowsByDay[$day] = [];
            }

            // Check overlap with existing windows on the same weekday
            foreach ($windowsByDay[$day] as $existing) {
                if ($existing['startMinutes'] < $endMinutes && $existing['endMinutes'] > $startMinutes) {
                    Response::error('Overlapping weekly availability windows are not allowed on the same day.', 'VALIDATION_ERROR', 422);
                }
            }

            $windowItem = [
                'day_of_week' => $day,
                'start_time' => $w['start_time'],
                'end_time' => $w['end_time'],
                'startMinutes' => $startMinutes,
                'endMinutes' => $endMinutes
            ];

            $windowsByDay[$day][] = $windowItem;
            $validatedWindows[] = $windowItem;
        }

        // Sort weekly windows canonically: day_of_week ASC, start_time ASC, end_time ASC
        usort($validatedWindows, function ($a, $b) {
            if ($a['day_of_week'] !== $b['day_of_week']) {
                return $a['day_of_week'] <=> $b['day_of_week'];
            }
            if ($a['startMinutes'] !== $b['startMinutes']) {
                return $a['startMinutes'] <=> $b['startMinutes'];
            }
            return $a['endMinutes'] <=> $b['endMinutes'];
        });

        // Validate unavailability blocks
        $validatedBlocks = [];
        $tz = new DateTimeZone('Europe/Istanbul');

        foreach ($data['unavailability_blocks'] as $b) {
            if (!is_array($b)) {
                Response::error('Each unavailability block must be an object.', 'VALIDATION_ERROR', 422);
            }
            $bKeys = array_keys($b);
            sort($bKeys);
            if ($bKeys !== ['ends_at', 'reason', 'starts_at']) {
                Response::error('Exact block keys required: starts_at, ends_at, reason.', 'VALIDATION_ERROR', 422);
            }

            if (!is_string($b['starts_at']) || !is_string($b['ends_at'])) {
                Response::error('starts_at and ends_at must be strings.', 'VALIDATION_ERROR', 422);
            }

            $sDt = DateTime::createFromFormat('Y-m-d H:i:s', $b['starts_at'], $tz);
            $eDt = DateTime::createFromFormat('Y-m-d H:i:s', $b['ends_at'], $tz);

            if (!$sDt || $sDt->format('Y-m-d H:i:s') !== $b['starts_at'] ||
                !$eDt || $eDt->format('Y-m-d H:i:s') !== $b['ends_at']) {
                Response::error('starts_at and ends_at must be valid Gregorian datetimes in YYYY-MM-DD HH:mm:ss format.', 'VALIDATION_ERROR', 422);
            }

            if ($sDt >= $eDt) {
                Response::error('starts_at must be strictly before ends_at.', 'VALIDATION_ERROR', 422);
            }

            $reason = null;
            if ($b['reason'] !== null) {
                if (!is_string($b['reason'])) {
                    Response::error('reason must be string or null.', 'VALIDATION_ERROR', 422);
                }
                $trimmed = trim($b['reason']);
                if ($trimmed !== '') {
                    if (mb_strlen($trimmed, 'UTF-8') > 255) {
                        Response::error('reason must not exceed 255 characters.', 'VALIDATION_ERROR', 422);
                    }
                    $reason = $trimmed;
                }
            }

            // Check overlap with already validated blocks
            foreach ($validatedBlocks as $existing) {
                if ($existing['starts_at'] < $b['ends_at'] && $existing['ends_at'] > $b['starts_at']) {
                    Response::error('Overlapping unavailability blocks are not allowed in the same submission.', 'VALIDATION_ERROR', 422);
                }
            }

            $validatedBlocks[] = [
                'starts_at' => $b['starts_at'],
                'ends_at' => $b['ends_at'],
                'reason' => $reason
            ];
        }

        // Sort blocks canonically: starts_at ASC, ends_at ASC
        usort($validatedBlocks, function ($a, $b) {
            if ($a['starts_at'] !== $b['starts_at']) {
                return strcmp($a['starts_at'], $b['starts_at']);
            }
            return strcmp($a['ends_at'], $b['ends_at']);
        });

        return [
            'weekly_windows' => $validatedWindows,
            'unavailability_blocks' => $validatedBlocks
        ];
    }

    private function executeTransactionalReplace(int $trainerId, string $trainerName, int $actorAdminId, array $validated): void
    {
        $windows = $validated['weekly_windows'];
        $blocks = $validated['unavailability_blocks'];

        try {
            $this->db->beginTransaction();

            // 1. Lock target trainer FOR UPDATE
            $tStmt = $this->db->prepare("SELECT id, name, is_active, deleted_at FROM trainers WHERE id = ? FOR UPDATE");
            $tStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
            $tStmt->execute();
            $trainer = $tStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Trainer not found or deleted.', 'NOT_FOUND', 404);
            }

            // 2. Delete existing windows
            $delWStmt = $this->db->prepare("DELETE FROM trainer_availability_windows WHERE trainer_id = ?");
            $delWStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
            $delWStmt->execute();

            // 3. Delete existing blocks
            $delBStmt = $this->db->prepare("DELETE FROM trainer_unavailability_blocks WHERE trainer_id = ?");
            $delBStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
            $delBStmt->execute();

            // 4. Insert new canonical windows
            if (!empty($windows)) {
                $insWStmt = $this->db->prepare("
                    INSERT INTO trainer_availability_windows (trainer_id, day_of_week, start_time, end_time, created_by)
                    VALUES (?, ?, ?, ?, ?)
                ");
                foreach ($windows as $w) {
                    $insWStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
                    $insWStmt->bindValue(2, $w['day_of_week'], PDO::PARAM_INT);
                    $insWStmt->bindValue(3, $w['start_time'] . ':00', PDO::PARAM_STR);
                    $insWStmt->bindValue(4, $w['end_time'] . ':00', PDO::PARAM_STR);
                    $insWStmt->bindValue(5, $actorAdminId, PDO::PARAM_INT);
                    $insWStmt->execute();
                }
            }

            // 5. Insert new canonical blocks
            if (!empty($blocks)) {
                $insBStmt = $this->db->prepare("
                    INSERT INTO trainer_unavailability_blocks (trainer_id, starts_at, ends_at, reason, created_by)
                    VALUES (?, ?, ?, ?, ?)
                ");
                foreach ($blocks as $b) {
                    $insBStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
                    $insBStmt->bindValue(2, $b['starts_at'], PDO::PARAM_STR);
                    $insBStmt->bindValue(3, $b['ends_at'], PDO::PARAM_STR);
                    $insBStmt->bindValue(4, $b['reason'], $b['reason'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $insBStmt->bindValue(5, $actorAdminId, PDO::PARAM_INT);
                    $insBStmt->execute();
                }
            }

            $this->db->commit();

            // 6. Audit logging after successful commit
            try {
                AuditLogger::log(
                    'trainer.availability.updated',
                    $actorAdminId,
                    'trainer',
                    $trainerId,
                    [
                        'weekly_window_count' => count($windows),
                        'unavailability_block_count' => count($blocks)
                    ]
                );
            } catch (Throwable $e) {
                error_log("Failed to log trainer availability update: " . $e->getMessage());
            }

            // Return updated configuration
            $response = $this->fetchAvailabilityResponse($trainerId, $trainer['name']);
            Response::json($response);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Trainer Availability Update Error: " . $e->getMessage());
            Response::error('Failed to update trainer availability.', 'INTERNAL_ERROR', 500);
        }
    }

    public function getAdminAvailability(int $trainerId): void
    {
        $this->rejectQueryParams();
        $trainer = $this->resolveTrainerById($trainerId);
        $response = $this->fetchAvailabilityResponse((int)$trainer['id'], $trainer['name']);
        Response::json($response);
    }

    public function replaceAdminAvailability(int $trainerId): void
    {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }
        $trainer = $this->resolveTrainerById($trainerId);
        $validated = $this->parseAndValidateReplacePayload();
        $this->executeTransactionalReplace((int)$trainer['id'], $trainer['name'], $adminId, $validated);
    }

    public function getTrainerAvailability(): void
    {
        $this->rejectQueryParams();
        $trainer = $this->resolveTrainerFromSession();
        $response = $this->fetchAvailabilityResponse((int)$trainer['id'], $trainer['name']);
        Response::json($response);
    }

    public function replaceTrainerAvailability(): void
    {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }
        $trainer = $this->resolveTrainerFromSession();
        $validated = $this->parseAndValidateReplacePayload();
        $this->executeTransactionalReplace((int)$trainer['id'], $trainer['name'], $adminId, $validated);
    }
}
