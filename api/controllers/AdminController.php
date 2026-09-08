<?php

namespace Controllers;

use Core\Response;
use Core\Database;

class AdminController
{
    public function dashboard()
    {
        $dbStatus = 'unavailable';
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->query("SELECT 1");
            if ($stmt && (int)$stmt->fetchColumn() === 1) {
                $dbStatus = 'connected';
            }
        } catch (\Exception $e) {
            $dbStatus = 'unavailable';
        }

        $mediaActive = 0;
        $trainersActive = 0;
        $branchesActive = 0;
        $homepageSectionsActive = 0;
        $eventMetrics = [
            'published' => 0,
            'draft' => 0,
            'total' => 0
        ];

        if ($dbStatus === 'connected') {
            try {
                $mediaStmt = $db->query("SELECT COUNT(*) FROM media_assets WHERE status = 'active' AND deleted_at IS NULL");
                if ($mediaStmt) {
                    $mediaActive = (int)$mediaStmt->fetchColumn();
                }
            } catch (\Exception $e) {
                // Ignore
            }

            try {
                $trainerStmt = $db->query("SELECT COUNT(*) FROM trainers WHERE is_active = 1 AND deleted_at IS NULL");
                if ($trainerStmt) {
                    $trainersActive = (int)$trainerStmt->fetchColumn();
                }
            } catch (\Exception $e) {
                // Ignore
            }

            try {
                $branchStmt = $db->query("SELECT COUNT(*) FROM branches WHERE is_active = 1 AND deleted_at IS NULL");
                if ($branchStmt) {
                    $branchesActive = (int)$branchStmt->fetchColumn();
                }
            } catch (\Exception $e) {
                // Ignore
            }

            try {
                $homepageStmt = $db->query("SELECT COUNT(*) FROM homepage_sections WHERE is_active = 1");
                if ($homepageStmt) {
                    $homepageSectionsActive = (int)$homepageStmt->fetchColumn();
                }
            } catch (\Exception $e) {
                // Ignore
            }

            try {
                $eventStmt = $db->query("
                    SELECT 
                        SUM(CASE WHEN status = 'published' AND deleted_at IS NULL THEN 1 ELSE 0 END) as published_events,
                        SUM(CASE WHEN status = 'draft' AND deleted_at IS NULL THEN 1 ELSE 0 END) as draft_events
                    FROM events
                ");
                if ($eventStmt) {
                    $row = $eventStmt->fetch(\PDO::FETCH_ASSOC);
                    $pub = (int)($row['published_events'] ?? 0);
                    $draft = (int)($row['draft_events'] ?? 0);
                    $eventMetrics = [
                        'published' => $pub,
                        'draft' => $draft,
                        'total' => $pub + $draft
                    ];
                }
            } catch (\Exception $e) {
                // Ignore
            }
        }

        Response::json([
            'system_status' => 'ok',
            'database_status' => $dbStatus,
            'metrics' => [
                'events' => $eventMetrics,
                'media_active' => $mediaActive,
                'trainers_active' => $trainersActive,
                'branches_active' => $branchesActive,
                'homepage_sections_active' => $homepageSectionsActive
            ]
        ]);
    }

    public function operationalDashboard()
    {
        \Middleware\AuthMiddleware::hasRole(['super_admin', 'admin']);

        try {
            $db = \Core\Database::getInstance()->getConnection();
        } catch (\Exception $e) {
            \Core\Response::error('Veritabanı bağlantısı kurulamadı', 'DB_ERROR', 503);
            return;
        }

        try {
            $tz = new \DateTimeZone('Europe/Istanbul');
            $startOfDay = new \DateTime('today', $tz);
            $endOfDay = new \DateTime('tomorrow', $tz);

            $startStr = $startOfDay->format('Y-m-d H:i:s');
            $endStr = $endOfDay->format('Y-m-d H:i:s');

            $stmt1 = $db->query("SELECT COUNT(*) FROM members WHERE status = 'active' AND deleted_at IS NULL");
            if (!$stmt1) throw new \Exception("Query failed");
            $activeMembers = (int)$stmt1->fetchColumn();

            $stmt2 = $db->query("SELECT COUNT(*) FROM member_visits WHERE checked_out_at IS NULL");
            if (!$stmt2) throw new \Exception("Query failed");
            $currentOccupancy = (int)$stmt2->fetchColumn();

            $stmt3 = $db->prepare("SELECT COUNT(*) FROM member_visits WHERE checked_in_at >= ? AND checked_in_at < ?");
            if (!$stmt3->execute([$startStr, $endStr])) throw new \Exception("Query failed");
            $visitsToday = (int)$stmt3->fetchColumn();

            $stmt4 = $db->prepare("SELECT COUNT(*) FROM membership_renewals WHERE created_at >= ? AND created_at < ?");
            if (!$stmt4->execute([$startStr, $endStr])) throw new \Exception("Query failed");
            $renewalsToday = (int)$stmt4->fetchColumn();

            $stmt5 = $db->prepare("
                SELECT 
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                    SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count,
                    COUNT(*) as total_count
                FROM appointments 
                WHERE starts_at >= ? AND starts_at < ?
            ");
            if (!$stmt5->execute([$startStr, $endStr])) throw new \Exception("Query failed");
            
            $row = $stmt5->fetch(\PDO::FETCH_ASSOC);
            if (!$row) throw new \Exception("Query failed");

            $appointmentsToday = [
                'total' => (int)($row['total_count'] ?? 0),
                'scheduled' => (int)($row['scheduled_count'] ?? 0),
                'completed' => (int)($row['completed_count'] ?? 0),
                'cancelled' => (int)($row['cancelled_count'] ?? 0),
                'no_show' => (int)($row['no_show_count'] ?? 0),
            ];

            \Core\Response::json([
                'metrics' => [
                    'active_members' => $activeMembers,
                    'current_occupancy' => $currentOccupancy,
                    'visits_today' => $visitsToday,
                    'renewals_today' => $renewalsToday,
                    'appointments_today' => $appointmentsToday,
                ]
            ]);
        } catch (\Exception $e) {
            \Core\Response::error('Operasyonel veriler alınamadı', 'METRICS_FETCH_ERROR', 500);
        }
    }
}
