<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;
use DateTime;
use DateTimeZone;

class TrainerDailyAgendaController
{
    private PDO $db;

    private const TIMEZONE = 'Europe/Istanbul';

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
        $now = new DateTime('now', $tz);
        $businessDate = $now->format('Y-m-d');
        $generatedAt = $now->format('Y-m-d H:i:s');
        $nowStr = $generatedAt;

        $dayStart = $businessDate . ' 00:00:00';
        $tomorrow = (clone $now)->modify('+1 day')->format('Y-m-d') . ' 00:00:00';

        $apptStmt = $this->db->prepare("
            SELECT 
                a.id,
                a.uuid,
                a.starts_at,
                a.ends_at,
                a.status,
                a.member_id,
                a.member_session_package_id,
                m.id AS m_id,
                m.uuid AS m_uuid,
                m.first_name AS m_first_name,
                m.last_name AS m_last_name,
                m.phone AS m_phone,
                m.trainer_id AS m_trainer_id,
                m.deleted_at AS m_deleted_at,
                msp.id AS msp_id,
                msp.member_id AS msp_member_id,
                msp.package_name_snapshot AS msp_package_name
            FROM appointments a
            LEFT JOIN members m ON a.member_id = m.id
            LEFT JOIN member_session_packages msp ON a.member_session_package_id = msp.id
            WHERE a.trainer_id = ?
              AND a.starts_at >= ?
              AND a.starts_at < ?
            ORDER BY a.starts_at ASC, a.id ASC
        ");
        $apptStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $apptStmt->bindValue(2, $dayStart);
        $apptStmt->bindValue(3, $tomorrow);
        $apptStmt->execute();
        $rows = $apptStmt->fetchAll(PDO::FETCH_ASSOC);

        $knownStatuses = ['scheduled', 'completed', 'no_show', 'cancelled'];

        $appointments = [];
        $summary = [
            'total' => 0,
            'scheduled' => 0,
            'completed' => 0,
            'no_show' => 0,
            'cancelled' => 0,
            'remaining_scheduled' => 0,
            'past_due_scheduled' => 0,
        ];
        $needsTerminalization = [];
        $currentAppt = null;
        $nextAppt = null;

        foreach ($rows as $row) {
            $status = (string)$row['status'];
            if (!in_array($status, $knownStatuses, true)) {
                Response::error('Bilinmeyen randevu durumu.', 'TRAINER_DAILY_AGENDA_INCONSISTENT', 409);
            }

            if ($row['m_id'] === null) {
                Response::error('Eğitmen randevu üye verisi tutarsız.', 'TRAINER_DAILY_AGENDA_INCONSISTENT', 409);
            }

            // Member integrity for scheduled appointments
            if ($status === 'scheduled') {
                if ((int)$row['m_trainer_id'] !== $trainerId || $row['m_deleted_at'] !== null) {
                    Response::error('Eğitmen randevu verisi tutarsız.', 'TRAINER_DAILY_AGENDA_INCONSISTENT', 409);
                }
            }

            // Package projection and integrity
            $packageObj = null;
            if ($row['member_session_package_id'] !== null) {
                $mspId = $row['msp_id'] !== null ? (int)$row['msp_id'] : null;
                $mspMemberId = $row['msp_member_id'] !== null ? (int)$row['msp_member_id'] : null;

                if ($mspId === null || $mspMemberId !== (int)$row['member_id']) {
                    if ($status === 'scheduled') {
                        Response::error('Eğitmen randevu paket verisi tutarsız.', 'TRAINER_DAILY_AGENDA_INCONSISTENT', 409);
                    }
                    $packageObj = null;
                } else {
                    $packageObj = [
                        'id' => $mspId,
                        'package_name' => (string)$row['msp_package_name']
                    ];
                }
            }

            $startsAt = (string)$row['starts_at'];
            $endsAt = (string)$row['ends_at'];

            if ($status === 'scheduled') {
                if ($nowStr < $startsAt) {
                    $temporalState = 'upcoming';
                } elseif ($nowStr < $endsAt) {
                    $temporalState = 'in_progress';
                } else {
                    $temporalState = 'past_due';
                }
            } else {
                $temporalState = 'terminal';
            }

            $contactPhone = null;
            if ($status === 'scheduled' && $row['m_phone'] !== null) {
                $trimmedPhone = trim((string)$row['m_phone']);
                if ($trimmedPhone !== '') {
                    $contactPhone = $trimmedPhone;
                }
            }

            $item = [
                'id' => (int)$row['id'],
                'uuid' => (string)$row['uuid'],
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => $status,
                'member' => [
                    'id' => (int)$row['m_id'],
                    'uuid' => (string)$row['m_uuid'],
                    'first_name' => (string)$row['m_first_name'],
                    'last_name' => (string)$row['m_last_name'],
                    'phone' => $contactPhone,
                ],
                'session_package' => $packageObj,
                'temporal_state' => $temporalState,
            ];

            $appointments[] = $item;
            $summary['total']++;

            if ($status === 'scheduled') {
                $summary['scheduled']++;

                if ($endsAt > $nowStr) {
                    $summary['remaining_scheduled']++;
                } else {
                    $summary['past_due_scheduled']++;
                }

                if ($endsAt <= $nowStr) {
                    $needsTerminalization[] = $item;
                }

                // Focus current: starts_at <= now AND ends_at > now
                if ($startsAt <= $nowStr && $endsAt > $nowStr) {
                    if ($currentAppt !== null) {
                        Response::error('Eğitmen randevu saatleri çakışması tespit edildi.', 'TRAINER_DAILY_AGENDA_INCONSISTENT', 409);
                    }
                    $currentAppt = $item;
                }

                // Focus next: earliest scheduled appointment with starts_at > now
                if ($startsAt > $nowStr) {
                    if ($nextAppt === null) {
                        $nextAppt = $item;
                    }
                }
            } elseif ($status === 'completed') {
                $summary['completed']++;
            } elseif ($status === 'no_show') {
                $summary['no_show']++;
            } elseif ($status === 'cancelled') {
                $summary['cancelled']++;
            }
        }

        Response::json([
            'timezone' => self::TIMEZONE,
            'business_date' => $businessDate,
            'generated_at' => $generatedAt,
            'trainer' => [
                'id' => $trainerId,
                'name' => $trainer['name']
            ],
            'summary' => $summary,
            'focus' => [
                'current' => $currentAppt,
                'next' => $nextAppt
            ],
            'needs_terminalization' => $needsTerminalization,
            'appointments' => $appointments
        ]);
    }
}
