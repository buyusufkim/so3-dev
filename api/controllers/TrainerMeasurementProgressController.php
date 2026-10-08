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

    public function index(int $memberId): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $this->rejectQueryParams();

        if ($memberId <= 0) {
            Response::error('Geçersiz üye ID', 'VALIDATION_ERROR', 422);
        }

        $trainerId = $this->getTrainerProfileId();
        $this->checkMemberOwnership($memberId, $trainerId);

        // Count total active measurements
        $countStmt = $this->db->prepare("
            SELECT COUNT(*) 
            FROM member_measurements
            WHERE member_id = ?
              AND trainer_id = ?
              AND deleted_at IS NULL
        ");
        $countStmt->bindValue(1, $memberId, PDO::PARAM_INT);
        $countStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $countStmt->execute();
        $measurementCount = (int)$countStmt->fetchColumn();

        if ($measurementCount === 0) {
            Response::json([
                'measurement_count' => 0,
                'first' => null,
                'previous' => null,
                'latest' => null,
                'comparisons' => [
                    'from_previous' => null,
                    'from_first' => null,
                ],
            ]);
            return;
        }

        // Query A: latest two measurements
        $latestStmt = $this->db->prepare("
            SELECT id, uuid, measured_at, weight_kg, body_fat_percent, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm
            FROM member_measurements
            WHERE member_id = ?
              AND trainer_id = ?
              AND deleted_at IS NULL
            ORDER BY measured_at DESC, id DESC
            LIMIT 2
        ");
        $latestStmt->bindValue(1, $memberId, PDO::PARAM_INT);
        $latestStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $latestStmt->execute();
        $latestRows = $latestStmt->fetchAll(PDO::FETCH_ASSOC);

        $latest = $this->formatMeasurement($latestRows[0]);
        $previous = null;
        $first = null;
        $fromPrevious = null;
        $fromFirst = null;

        if ($measurementCount === 1) {
            $first = $latest;
            $previous = null;
            $fromPrevious = null;
            $fromFirst = $this->calculateDeltas($latest, $first);
        } elseif ($measurementCount === 2) {
            $previous = $this->formatMeasurement($latestRows[1]);
            $first = $previous;
            $fromPrevious = $this->calculateDeltas($latest, $previous);
            $fromFirst = $this->calculateDeltas($latest, $first);
        } else {
            // measurementCount >= 3
            $previous = $this->formatMeasurement($latestRows[1]);

            // Query B: first one
            $firstStmt = $this->db->prepare("
                SELECT id, uuid, measured_at, weight_kg, body_fat_percent, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm
                FROM member_measurements
                WHERE member_id = ?
                  AND trainer_id = ?
                  AND deleted_at IS NULL
                ORDER BY measured_at ASC, id ASC
                LIMIT 1
            ");
            $firstStmt->bindValue(1, $memberId, PDO::PARAM_INT);
            $firstStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
            $firstStmt->execute();
            $firstRow = $firstStmt->fetch(PDO::FETCH_ASSOC);

            $first = $this->formatMeasurement($firstRow ?: null);
            $fromPrevious = $this->calculateDeltas($latest, $previous);
            $fromFirst = $this->calculateDeltas($latest, $first);
        }

        Response::json([
            'measurement_count' => $measurementCount,
            'first' => $first,
            'previous' => $previous,
            'latest' => $latest,
            'comparisons' => [
                'from_previous' => $fromPrevious,
                'from_first' => $fromFirst,
            ],
        ]);
    }
}
