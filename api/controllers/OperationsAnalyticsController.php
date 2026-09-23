<?php

namespace Controllers;

use Core\Response;
use Core\Database;
use Middleware\AuthMiddleware;

class OperationsAnalyticsController
{
    public function operations()
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        // Strict query allowlist: only 'range' is permitted
        foreach ($_GET as $key => $val) {
            if ($key !== 'range') {
                Response::error('Geçersiz sorgu parametresi.', 'VALIDATION_ERROR', 422);
                return;
            }
        }

        $range = '30d';
        if (isset($_GET['range'])) {
            if (!is_string($_GET['range'])) {
                Response::error('Geçersiz aralık parametresi.', 'VALIDATION_ERROR', 422);
                return;
            }
            $rangeVal = trim($_GET['range']);
            if ($rangeVal === '') {
                Response::error('Aralık parametresi boş olamaz.', 'VALIDATION_ERROR', 422);
                return;
            }
            if (!in_array($rangeVal, ['7d', '30d', '90d'], true)) {
                Response::error('Geçersiz aralık. İzin verilen değerler: 7d, 30d, 90d', 'VALIDATION_ERROR', 422);
                return;
            }
            $range = $rangeVal;
        }

        $daysMap = [
            '7d' => 7,
            '30d' => 30,
            '90d' => 90,
        ];
        $days = $daysMap[$range];

        try {
            $tz = new \DateTimeZone('Europe/Istanbul');
            $today = new \DateTimeImmutable('today', $tz);

            $startDate = $today->modify('-' . ($days - 1) . ' days');
            $tomorrow = $today->modify('+1 day');

            $startDateStr = $startDate->format('Y-m-d');
            $endDateStr = $today->format('Y-m-d');

            $startDateTimeStr = $startDate->format('Y-m-d 00:00:00');
            $endDateTimeExclusiveStr = $tomorrow->format('Y-m-d 00:00:00');

            $db = Database::getInstance()->getConnection();

            // Align MySQL session time_zone to UTC+03:00 to match PHP Europe/Istanbul calendar authority
            // for TIMESTAMP columns (membership_renewals.created_at) while leaving DATETIME columns unaffected.
            $tzResult = $db->exec("SET time_zone = '+03:00'");
            if ($tzResult === false) {
                throw new \Exception('Failed to set DB session time_zone');
            }

            // 1. Current Snapshot: Active Members (status = 'active' AND deleted_at IS NULL)
            $activeStmt = $db->query("SELECT COUNT(*) FROM members WHERE status = 'active' AND deleted_at IS NULL");
            if (!$activeStmt) {
                throw new \Exception('Failed to query active members');
            }
            $activeMembers = (int)$activeStmt->fetchColumn();

            // 2. Current Snapshot: Current Occupancy (checked_out_at IS NULL)
            $occupancyStmt = $db->query("SELECT COUNT(*) FROM member_visits WHERE checked_out_at IS NULL");
            if (!$occupancyStmt) {
                throw new \Exception('Failed to query current occupancy');
            }
            $currentOccupancy = (int)$occupancyStmt->fetchColumn();

            // 3. Period Visits: Total visits and distinct member_id in interval
            $periodVisitsStmt = $db->prepare("
                SELECT 
                    COUNT(*) as total,
                    COUNT(DISTINCT member_id) as unique_members
                FROM member_visits
                WHERE checked_in_at >= ? AND checked_in_at < ?
            ");
            if (!$periodVisitsStmt->execute([$startDateTimeStr, $endDateTimeExclusiveStr])) {
                throw new \Exception('Failed to query period visits');
            }
            $periodVisitsRow = $periodVisitsStmt->fetch(\PDO::FETCH_ASSOC);

            // 4. Daily Visits: Group by calendar date in interval
            $dailyVisitsStmt = $db->prepare("
                SELECT 
                    DATE(checked_in_at) as visit_date,
                    COUNT(*) as visits,
                    COUNT(DISTINCT member_id) as unique_visitors
                FROM member_visits
                WHERE checked_in_at >= ? AND checked_in_at < ?
                GROUP BY DATE(checked_in_at)
            ");
            if (!$dailyVisitsStmt->execute([$startDateTimeStr, $endDateTimeExclusiveStr])) {
                throw new \Exception('Failed to query daily visits');
            }
            $dailyVisitsRows = $dailyVisitsStmt->fetchAll(\PDO::FETCH_ASSOC);

            $visitsByDate = [];
            foreach ($dailyVisitsRows as $row) {
                $dateKey = (string)$row['visit_date'];
                $visitsByDate[$dateKey] = [
                    'visits' => (int)$row['visits'],
                    'unique_visitors' => (int)$row['unique_visitors'],
                ];
            }

            // 5. Period Renewals: Total renewals and distinct member_id in interval
            $periodRenewalsStmt = $db->prepare("
                SELECT 
                    COUNT(*) as total,
                    COUNT(DISTINCT member_id) as unique_members
                FROM membership_renewals
                WHERE created_at >= ? AND created_at < ?
            ");
            if (!$periodRenewalsStmt->execute([$startDateTimeStr, $endDateTimeExclusiveStr])) {
                throw new \Exception('Failed to query period renewals');
            }
            $periodRenewalsRow = $periodRenewalsStmt->fetch(\PDO::FETCH_ASSOC);

            // 6. Daily Renewals: Group by calendar date in interval
            $dailyRenewalsStmt = $db->prepare("
                SELECT 
                    DATE(created_at) as renewal_date,
                    COUNT(*) as total
                FROM membership_renewals
                WHERE created_at >= ? AND created_at < ?
                GROUP BY DATE(created_at)
            ");
            if (!$dailyRenewalsStmt->execute([$startDateTimeStr, $endDateTimeExclusiveStr])) {
                throw new \Exception('Failed to query daily renewals');
            }
            $dailyRenewalsRows = $dailyRenewalsStmt->fetchAll(\PDO::FETCH_ASSOC);

            $renewalsByDate = [];
            foreach ($dailyRenewalsRows as $row) {
                $dateKey = (string)$row['renewal_date'];
                $renewalsByDate[$dateKey] = (int)$row['total'];
            }

            // 7. Period Appointments: Counts by status in interval based on starts_at
            $periodApptStmt = $db->prepare("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                    SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count
                FROM appointments
                WHERE starts_at >= ? AND starts_at < ?
            ");
            if (!$periodApptStmt->execute([$startDateTimeStr, $endDateTimeExclusiveStr])) {
                throw new \Exception('Failed to query period appointments');
            }
            $periodApptRow = $periodApptStmt->fetch(\PDO::FETCH_ASSOC);

            // 8. Daily Appointments: Group by calendar date in interval based on starts_at
            $dailyApptStmt = $db->prepare("
                SELECT 
                    DATE(starts_at) as appt_date,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                    SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count
                FROM appointments
                WHERE starts_at >= ? AND starts_at < ?
                GROUP BY DATE(starts_at)
            ");
            if (!$dailyApptStmt->execute([$startDateTimeStr, $endDateTimeExclusiveStr])) {
                throw new \Exception('Failed to query daily appointments');
            }
            $dailyApptRows = $dailyApptStmt->fetchAll(\PDO::FETCH_ASSOC);

            $appointmentsByDate = [];
            foreach ($dailyApptRows as $row) {
                $dateKey = (string)$row['appt_date'];
                $appointmentsByDate[$dateKey] = [
                    'total' => (int)$row['total'],
                    'scheduled' => (int)($row['scheduled_count'] ?? 0),
                    'completed' => (int)($row['completed_count'] ?? 0),
                    'cancelled' => (int)($row['cancelled_count'] ?? 0),
                    'no_show' => (int)($row['no_show_count'] ?? 0),
                ];
            }

            // Zero-fill daily array deterministically from oldest date to newest date (ASC)
            $daily = [];
            for ($i = 0; $i < $days; $i++) {
                $curDate = $startDate->modify("+{$i} days")->format('Y-m-d');
                $daily[] = [
                    'date' => $curDate,
                    'visits' => (int)($visitsByDate[$curDate]['visits'] ?? 0),
                    'unique_visitors' => (int)($visitsByDate[$curDate]['unique_visitors'] ?? 0),
                    'renewals' => (int)($renewalsByDate[$curDate] ?? 0),
                    'appointments' => [
                        'total' => (int)($appointmentsByDate[$curDate]['total'] ?? 0),
                        'scheduled' => (int)($appointmentsByDate[$curDate]['scheduled'] ?? 0),
                        'completed' => (int)($appointmentsByDate[$curDate]['completed'] ?? 0),
                        'cancelled' => (int)($appointmentsByDate[$curDate]['cancelled'] ?? 0),
                        'no_show' => (int)($appointmentsByDate[$curDate]['no_show'] ?? 0),
                    ],
                ];
            }

            Response::json([
                'range' => $range,
                'start_date' => $startDateStr,
                'end_date' => $endDateStr,
                'timezone' => 'Europe/Istanbul',
                'current' => [
                    'active_members' => $activeMembers,
                    'current_occupancy' => $currentOccupancy,
                ],
                'period' => [
                    'visits' => [
                        'total' => (int)($periodVisitsRow['total'] ?? 0),
                        'unique_members' => (int)($periodVisitsRow['unique_members'] ?? 0),
                    ],
                    'renewals' => [
                        'total' => (int)($periodRenewalsRow['total'] ?? 0),
                        'unique_members' => (int)($periodRenewalsRow['unique_members'] ?? 0),
                    ],
                    'appointments' => [
                        'total' => (int)($periodApptRow['total'] ?? 0),
                        'scheduled' => (int)($periodApptRow['scheduled_count'] ?? 0),
                        'completed' => (int)($periodApptRow['completed_count'] ?? 0),
                        'cancelled' => (int)($periodApptRow['cancelled_count'] ?? 0),
                        'no_show' => (int)($periodApptRow['no_show_count'] ?? 0),
                    ],
                ],
                'daily' => $daily,
            ]);
        } catch (\Exception $e) {
            Response::error('Analitik verileri alınamadı', 'INTERNAL_ERROR', 500);
        }
    }
}
