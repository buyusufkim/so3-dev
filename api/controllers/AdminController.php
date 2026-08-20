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
        } catch (\Throwable $e) {
            $dbStatus = 'unavailable';
        }

        $mediaCount = null;
        $eventCount = null;

        try {
            if ($dbStatus === 'connected') {
                $mediaStmt = $db->query("SELECT COUNT(*) FROM media_assets WHERE status = 'active' AND deleted_at IS NULL");
                if ($mediaStmt) {
                    $mediaCount = (int)$mediaStmt->fetchColumn();
                }

                $eventStmt = $db->query(
                    "SELECT COUNT(*)
                     FROM events
                     WHERE deleted_at IS NULL AND status IN ('published', 'draft')"
                );
                if ($eventStmt) {
                    $eventCount = (int)$eventStmt->fetchColumn();
                }
            }
        } catch (\Throwable $e) {
            $mediaCount = null;
            $eventCount = null;
        }

        Response::json([
            'system_status' => 'ok',
            'database_status' => $dbStatus,
            'metrics' => [
                'events' => $eventCount,
                'media' => $mediaCount,
                'visitors' => null,
                'trainers' => null
            ]
        ]);
    }
}
