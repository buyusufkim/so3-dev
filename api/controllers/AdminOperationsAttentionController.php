<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;
use DateTimeImmutable;
use DateTimeZone;

class AdminOperationsAttentionController
{
    private const TIMEZONE = 'Europe/Istanbul';

    public function index(): void
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        if (!empty($_GET)) {
            Response::error('Query parameters are not allowed.', 'VALIDATION_ERROR', 422);
            return;
        }

        try {
            $tz = new DateTimeZone(self::TIMEZONE);
            $now = new DateTimeImmutable('now', $tz);
            $today = new DateTimeImmutable('today', $tz);
            $tomorrow = $today->modify('+1 day');

            $nowStr = $now->format('Y-m-d H:i:s');
            $todayStartStr = $today->format('Y-m-d 00:00:00');
            $tomorrowStartStr = $tomorrow->format('Y-m-d 00:00:00');

            $db = Database::getInstance()->getConnection();

            // 1. Appointment Aggregate Query
            // Scope: starts_at < tomorrow_start AND status = 'scheduled'
            // Aggregates:
            // - needs_terminalization_count: ends_at <= now
            // - oldest_needs_terminalization_ends_at: MIN(ends_at) where ends_at <= now
            // - scheduled_future: starts_at >= today_start AND starts_at > now
            // - scheduled_in_progress: starts_at >= today_start AND starts_at <= now AND ends_at > now
            // - needs_terminalization_today: starts_at >= today_start AND ends_at <= now
            $apptStmt = $db->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN ends_at <= :now1 THEN 1 ELSE 0 END), 0) AS needs_terminalization_count,
                    MIN(CASE WHEN ends_at <= :now2 THEN ends_at ELSE NULL END) AS oldest_needs_terminalization_ends_at,
                    COALESCE(SUM(CASE WHEN starts_at >= :today_start1 AND starts_at > :now3 THEN 1 ELSE 0 END), 0) AS scheduled_future,
                    COALESCE(SUM(CASE WHEN starts_at >= :today_start2 AND starts_at <= :now4 AND ends_at > :now5 THEN 1 ELSE 0 END), 0) AS scheduled_in_progress,
                    COALESCE(SUM(CASE WHEN starts_at >= :today_start3 AND ends_at <= :now6 THEN 1 ELSE 0 END), 0) AS needs_terminalization_today
                FROM appointments
                WHERE status = 'scheduled'
                  AND starts_at < :tomorrow_start
            ");

            $apptStmt->execute([
                ':now1' => $nowStr,
                ':now2' => $nowStr,
                ':today_start1' => $todayStartStr,
                ':now3' => $nowStr,
                ':today_start2' => $todayStartStr,
                ':now4' => $nowStr,
                ':now5' => $nowStr,
                ':today_start3' => $todayStartStr,
                ':now6' => $nowStr,
                ':tomorrow_start' => $tomorrowStartStr,
            ]);

            $apptRow = $apptStmt->fetch(PDO::FETCH_ASSOC);

            $needsTerminalizationCount = (int)($apptRow['needs_terminalization_count'] ?? 0);
            $oldestApptEndsAt = $apptRow['oldest_needs_terminalization_ends_at'] !== null
                ? (string)$apptRow['oldest_needs_terminalization_ends_at']
                : null;
            if ($needsTerminalizationCount === 0) {
                $oldestApptEndsAt = null;
            }

            $scheduledFuture = (int)($apptRow['scheduled_future'] ?? 0);
            $scheduledInProgress = (int)($apptRow['scheduled_in_progress'] ?? 0);
            $needsTerminalizationToday = (int)($apptRow['needs_terminalization_today'] ?? 0);

            // 2. Open Visits Aggregate Query
            // Scope: checked_out_at IS NULL
            // Aggregates:
            // - current: COUNT(*) (all open visits)
            // - carried_over: checked_in_at < today_start
            // - opened_today: checked_in_at >= today_start AND checked_in_at < tomorrow_start
            // - future_dated: checked_in_at >= tomorrow_start
            // - oldest_checked_in_at: MIN(checked_in_at)
            $visitStmt = $db->prepare("
                SELECT
                    COUNT(*) AS current_count,
                    COALESCE(SUM(CASE WHEN checked_in_at < :today_start1 THEN 1 ELSE 0 END), 0) AS carried_over,
                    COALESCE(SUM(CASE WHEN checked_in_at >= :today_start2 AND checked_in_at < :tomorrow_start1 THEN 1 ELSE 0 END), 0) AS opened_today,
                    COALESCE(SUM(CASE WHEN checked_in_at >= :tomorrow_start2 THEN 1 ELSE 0 END), 0) AS future_dated,
                    MIN(checked_in_at) AS oldest_checked_in_at
                FROM member_visits
                WHERE checked_out_at IS NULL
            ");

            $visitStmt->execute([
                ':today_start1' => $todayStartStr,
                ':today_start2' => $todayStartStr,
                ':tomorrow_start1' => $tomorrowStartStr,
                ':tomorrow_start2' => $tomorrowStartStr,
            ]);

            $visitRow = $visitStmt->fetch(PDO::FETCH_ASSOC);

            $currentOpenVisits = (int)($visitRow['current_count'] ?? 0);
            $carriedOverOpenVisits = (int)($visitRow['carried_over'] ?? 0);
            $openedTodayStillOpen = (int)($visitRow['opened_today'] ?? 0);
            $futureOpenVisits = (int)($visitRow['future_dated'] ?? 0);
            $oldestVisitCheckedInAt = $visitRow['oldest_checked_in_at'] !== null
                ? (string)$visitRow['oldest_checked_in_at']
                : null;
            if ($currentOpenVisits === 0) {
                $oldestVisitCheckedInAt = null;
            }

            Response::json([
                'timezone' => self::TIMEZONE,
                'generated_at' => $nowStr,
                'appointments' => [
                    'needs_terminalization_count' => $needsTerminalizationCount,
                    'oldest_needs_terminalization_ends_at' => $oldestApptEndsAt,
                    'today' => [
                        'scheduled_future' => $scheduledFuture,
                        'scheduled_in_progress' => $scheduledInProgress,
                        'needs_terminalization' => $needsTerminalizationToday,
                    ],
                ],
                'open_visits' => [
                    'current' => $currentOpenVisits,
                    'carried_over' => $carriedOverOpenVisits,
                    'opened_today' => $openedTodayStillOpen,
                    'future_dated' => $futureOpenVisits,
                    'oldest_checked_in_at' => $oldestVisitCheckedInAt,
                ],
            ]);
        } catch (\Throwable $e) {
            Response::error('Operasyonel dikkat verisi alınamadı.', 'OPERATIONS_ATTENTION_ERROR', 500);
        }
    }
}
