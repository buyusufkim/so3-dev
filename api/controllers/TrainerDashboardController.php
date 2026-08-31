<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;

class TrainerDashboardController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfile(): array {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
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
            'display_name' => (string)$trainer['name']
        ];
    }

    public function index() {
        AuthMiddleware::hasRole(['trainer']);

        $trainer = $this->getTrainerProfile();
        $trainerId = $trainer['id'];

        // 1. Member metrics (strictly current trainer's non-deleted members)
        $memberStmt = $this->db->prepare("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_count
            FROM members
            WHERE trainer_id = ? AND deleted_at IS NULL
        ");
        $memberStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $memberStmt->execute();
        $memberRow = $memberStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $memberMetrics = [
            'total' => (int)($memberRow['total'] ?? 0),
            'active' => (int)($memberRow['active_count'] ?? 0),
            'inactive' => (int)($memberRow['inactive_count'] ?? 0)
        ];

        // 2. Training program metrics (strictly current trainer's non-deleted programs belonging to current trainer's non-deleted members)
        $programStmt = $this->db->prepare("
            SELECT 
                SUM(CASE WHEN tp.status = 'draft' THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN tp.status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN tp.status = 'archived' THEN 1 ELSE 0 END) as archived_count
            FROM training_programs tp
            INNER JOIN members m ON tp.member_id = m.id AND m.trainer_id = ? AND m.deleted_at IS NULL
            WHERE tp.trainer_id = ? AND tp.deleted_at IS NULL
        ");
        $programStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $programStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $programStmt->execute();
        $programRow = $programStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $draft = (int)($programRow['draft_count'] ?? 0);
        $active = (int)($programRow['active_count'] ?? 0);
        $archived = (int)($programRow['archived_count'] ?? 0);

        $programMetrics = [
            'total' => $draft + $active + $archived,
            'draft' => $draft,
            'active' => $active,
            'archived' => $archived
        ];

        // 3. Recent members (max 5 non-deleted members ordered by updated_at DESC, id DESC)
        $recentStmt = $this->db->prepare("
            SELECT 
                m.id, m.uuid, m.first_name, m.last_name, m.status, m.updated_at
            FROM members m
            WHERE m.trainer_id = ? AND m.deleted_at IS NULL
            ORDER BY m.updated_at DESC, m.id DESC
            LIMIT 5
        ");
        $recentStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $recentStmt->execute();
        $recentRows = $recentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $recentMembers = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'uuid' => (string)$row['uuid'],
                'first_name' => (string)$row['first_name'],
                'last_name' => (string)$row['last_name'],
                'status' => (string)$row['status'],
                'updated_at' => (string)$row['updated_at']
            ];
        }, $recentRows);

        Response::json([
            'trainer' => [
                'id' => (int)$trainer['id'],
                'display_name' => (string)$trainer['display_name']
            ],
            'members' => $memberMetrics,
            'training_programs' => $programMetrics,
            'recent_members' => $recentMembers
        ]);
    }
}
