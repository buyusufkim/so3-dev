<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;

class TrainerMeasurementProgressController
{
    private PDO $db;

    private const METRIC_FIELDS = [
        'weight_kg',
        'body_fat_percent',
        'chest_cm',
        'waist_cm',
        'hip_cm',
        'arm_cm',
        'thigh_cm'
    ];

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

    private function getTrainerProfileId(): int
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
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
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return (int)$trainer['id'];
    }

    private function checkMemberOwnership(int $memberId, int $trainerId): void
    {
        $stmt = $this->db->prepare("
            SELECT id FROM members
            WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL
        ");
        $stmt->bindValue(1, $memberId, PDO::PARAM_INT);
        $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $stmt->execute();
        if (!$stmt->fetch()) {
            Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);
        }
    }

    private function formatMeasurement(?array $row): ?array
    {
        if ($row === null) {
            return null;
        }

        return [
            'id' => (int)$row['id'],
            'uuid' => (string)$row['uuid'],
            'member_id' => (int)$row['member_id'],
            'measured_at' => (string)$row['measured_at'],
            'weight_kg' => $row['weight_kg'] !== null ? (float)$row['weight_kg'] : null,
            'body_fat_percent' => $row['body_fat_percent'] !== null ? (float)$row['body_fat_percent'] : null,
            'chest_cm' => $row['chest_cm'] !== null ? (float)$row['chest_cm'] : null,
            'waist_cm' => $row['waist_cm'] !== null ? (float)$row['waist_cm'] : null,
            'hip_cm' => $row['hip_cm'] !== null ? (float)$row['hip_cm'] : null,
            'arm_cm' => $row['arm_cm'] !== null ? (float)$row['arm_cm'] : null,
            'thigh_cm' => $row['thigh_cm'] !== null ? (float)$row['thigh_cm'] : null,
        ];
    }

    private function calculateDeltas(?array $current, ?array $reference): ?array
    {
        if ($current === null || $reference === null) {
            return null;
        }

        $deltas = [];
        foreach (self::METRIC_FIELDS as $field) {
            $currVal = $current[$field];
            $refVal = $reference[$field];

            if ($currVal !== null && $refVal !== null) {
                $deltas[$field] = round((float)$currVal - (float)$refVal, 2);
            } else {
                $deltas[$field] = null;
            }
        }

        return $deltas;
    }

    private function calculateDaysBetween(?string $earlierDate, ?string $laterDate): ?int
    {
        if ($earlierDate === null || $laterDate === null) {
            return null;
        }

        try {
            $d1 = new \DateTimeImmutable($earlierDate);
            $d2 = new \DateTimeImmutable($laterDate);
            $diff = $d1->diff($d2);
            return (int)$diff->days;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function index(int $memberId): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $this->rejectQueryParams();

        if ($memberId <= 0) {
            Response::error('Geçersiz üye ID', 'VALIDATION_ERROR', 422);
        }

        $trainerId = $this->getTrainerProfileId();
        $this->checkMemberOwnership($memberId, $trainerId);

        $stmt = $this->db->prepare("
            SELECT 
                mm.id, mm.uuid, mm.member_id, mm.trainer_id, mm.measured_at,
                mm.weight_kg, mm.body_fat_percent, mm.chest_cm, mm.waist_cm, mm.hip_cm, mm.arm_cm, mm.thigh_cm,
                mm.created_at, mm.updated_at
            FROM member_measurements mm
            JOIN members mem ON mm.member_id = mem.id
            WHERE mm.member_id = :member_id
              AND mm.trainer_id = :measurement_trainer_id
              AND mem.trainer_id = :member_trainer_id
              AND mem.deleted_at IS NULL
              AND mm.deleted_at IS NULL
            ORDER BY mm.measured_at ASC, mm.id ASC
        ");
        $stmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);
        $stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);
        $stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $totalMeasurements = count($rows);

        $latest = null;
        $previous = null;
        $first = null;
        $diffFromPrevious = null;
        $diffFromFirst = null;
        $daysSincePrevious = null;
        $daysSinceFirst = null;

        if ($totalMeasurements === 1) {
            $latest = $this->formatMeasurement($rows[0]);
            $first = $latest;
            $previous = null;
        } elseif ($totalMeasurements >= 2) {
            $first = $this->formatMeasurement($rows[0]);
            $previous = $this->formatMeasurement($rows[$totalMeasurements - 2]);
            $latest = $this->formatMeasurement($rows[$totalMeasurements - 1]);

            $diffFromPrevious = $this->calculateDeltas($latest, $previous);
            $diffFromFirst = $this->calculateDeltas($latest, $first);

            $daysSincePrevious = $this->calculateDaysBetween($previous['measured_at'], $latest['measured_at']);
            $daysSinceFirst = $this->calculateDaysBetween($first['measured_at'], $latest['measured_at']);
        }

        $metrics = [];
        foreach (self::METRIC_FIELDS as $field) {
            $latestVal = $latest !== null ? $latest[$field] : null;
            $prevVal = $previous !== null ? $previous[$field] : null;
            $firstVal = $first !== null ? $first[$field] : null;

            $diffPrev = ($totalMeasurements >= 2 && $latestVal !== null && $prevVal !== null)
                ? round((float)$latestVal - (float)$prevVal, 2)
                : null;

            $diff1st = ($totalMeasurements >= 2 && $latestVal !== null && $firstVal !== null)
                ? round((float)$latestVal - (float)$firstVal, 2)
                : null;

            $metrics[$field] = [
                'latest' => $latestVal,
                'previous' => $prevVal,
                'first' => $firstVal,
                'diff_previous' => $diffPrev,
                'diff_first' => $diff1st,
            ];
        }

        Response::json([
            'member_id' => $memberId,
            'total_measurements' => $totalMeasurements,
            'latest' => $latest,
            'previous' => $previous,
            'first' => $first,
            'baseline' => $first,
            'diff_from_previous' => $diffFromPrevious,
            'changes_from_previous' => $diffFromPrevious,
            'since_previous' => $diffFromPrevious,
            'diff_from_first' => $diffFromFirst,
            'changes_from_first' => $diffFromFirst,
            'since_first' => $diffFromFirst,
            'diff_from_baseline' => $diffFromFirst,
            'changes_from_baseline' => $diffFromFirst,
            'since_baseline' => $diffFromFirst,
            'days_since_previous' => $daysSincePrevious,
            'days_since_first' => $daysSinceFirst,
            'days_since_baseline' => $daysSinceFirst,
            'metrics' => $metrics,
        ]);
    }
}
