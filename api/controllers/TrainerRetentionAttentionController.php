<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;
use DateTimeImmutable;
use DateTimeZone;

class TrainerRetentionAttentionController
{
    private PDO $db;

    private const TIMEZONE = 'Europe/Istanbul';
    private const INACTIVITY_DAYS = 14;

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

    private function getTrainerProfile(): array
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if ($adminId <= 0) {
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id, name FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return [
            'id' => (int)$trainer['id'],
            'name' => (string)$trainer['name']
        ];
    }

    public function index(): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $this->rejectQueryParams();

        $trainer = $this->getTrainerProfile();
        $trainerId = $trainer['id'];

        $tz = new DateTimeZone(self::TIMEZONE);
        $now = new DateTimeImmutable('now', $tz);
        $businessDate = $now->format('Y-m-d');
        $generatedAt = $now->format('Y-m-d H:i:s');
        $businessNow = $generatedAt;

        $cutoff = $now->modify('-' . self::INACTIVITY_DAYS . ' days')->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            SELECT 
                m.id,
                m.uuid,
                m.first_name,
                m.last_name,
                m.phone,
                MAX(a.ends_at) AS last_completed_at
            FROM members m
            JOIN appointments a 
                ON a.member_id = m.id 
                AND a.trainer_id = m.trainer_id 
                AND a.status = 'completed'
            WHERE m.trainer_id = ?
              AND m.deleted_at IS NULL
              AND m.status = 'active'
              AND (m.membership_end_date IS NULL OR m.membership_end_date >= ?)
              AND NOT EXISTS (
                  SELECT 1 FROM appointments a2
                  WHERE a2.member_id = m.id
                    AND a2.trainer_id = m.trainer_id
                    AND a2.status = 'scheduled'
                    AND a2.starts_at >= ?
              )
            GROUP BY m.id, m.uuid, m.first_name, m.last_name, m.phone
            HAVING MAX(a.ends_at) <= ?
            ORDER BY last_completed_at ASC, m.id ASC
            LIMIT 20
        ");

        $stmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $stmt->bindValue(2, $businessDate, PDO::PARAM_STR);
        $stmt->bindValue(3, $businessNow, PDO::PARAM_STR);
        $stmt->bindValue(4, $cutoff, PDO::PARAM_STR);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $businessDateObj = new DateTimeImmutable($businessDate, $tz);
        $items = [];

        foreach ($rows as $row) {
            $lastCompletedAt = (string)$row['last_completed_at'];
            $lastCompletedDateStr = substr($lastCompletedAt, 0, 10);
            $lastCompletedDateObj = new DateTimeImmutable($lastCompletedDateStr, $tz);

            $diff = $lastCompletedDateObj->diff($businessDateObj);
            $inactivityDays = (int)$diff->format('%r%a');

            $phone = $row['phone'] !== null ? trim((string)$row['phone']) : null;
            if ($phone === '') {
                $phone = null;
            }

            $items[] = [
                'member' => [
                    'id' => (int)$row['id'],
                    'uuid' => (string)$row['uuid'],
                    'first_name' => (string)$row['first_name'],
                    'last_name' => (string)$row['last_name'],
                    'phone' => $phone
                ],
                'last_completed_at' => $lastCompletedAt,
                'inactivity_days' => $inactivityDays
            ];
        }

        Response::json([
            'timezone' => self::TIMEZONE,
            'business_date' => $businessDate,
            'generated_at' => $generatedAt,
            'threshold_days' => self::INACTIVITY_DAYS,
            'items' => $items
        ]);
    }
}
