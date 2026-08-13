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
            if ($stmt && $stmt->fetchColumn() === 1) {
                $dbStatus = 'connected';
            }
        } catch (\Exception $e) {
            $dbStatus = 'unavailable';
        }

        $mediaCount = null;
        $eventMetrics = null;

        try {
            if ($dbStatus === 'connected') {
                $mediaStmt = $db->query("SELECT COUNT(*) FROM media_assets WHERE status = 'active' AND deleted_at IS NULL");
                if ($mediaStmt) {
                    $mediaCount = (int)$mediaStmt->fetchColumn();
                }

                $eventStmt = $db->query("
                    SELECT 
                        SUM(CASE WHEN status = 'published' AND deleted_at IS NULL THEN 1 ELSE 0 END) as published_events,
                        SUM(CASE WHEN status = 'draft' AND deleted_at IS NULL THEN 1 ELSE 0 END) as draft_events
                    FROM events
                ");
                if ($eventStmt) {
                    $row = $eventStmt->fetch(\PDO::FETCH_ASSOC);
                    $eventMetrics = [
                        'published_events' => (int)($row['published_events'] ?? 0),
                        'draft_events' => (int)($row['draft_events'] ?? 0),
                        'total_active' => ((int)($row['published_events'] ?? 0)) + ((int)($row['draft_events'] ?? 0))
                    ];
                }
            }
        } catch (\Exception $e) {
            $mediaCount = null;
            $eventMetrics = null;
        }

        Response::json([
            'system_status' => 'ok',
            'database_status' => $dbStatus,
            'metrics' => [
                'events' => $eventMetrics,
                'media' => $mediaCount,
                'visitors' => null,
                'trainers' => null
            ]
        ]);
    }
}
