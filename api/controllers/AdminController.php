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
}
