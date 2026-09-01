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

        // 4. Attention: members without active program (active non-deleted members of current trainer with no active non-deleted program by current trainer)
        $noProgramStmt = $this->db->prepare("
            SELECT 
                m.id, m.uuid, m.first_name, m.last_name, m.updated_at
            FROM members m
            WHERE m.trainer_id = ? 
              AND m.deleted_at IS NULL 
              AND m.status = 'active'
              AND NOT EXISTS (
                  SELECT 1 FROM training_programs tp
                  WHERE tp.member_id = m.id
                    AND tp.trainer_id = ?
                    AND tp.status = 'active'
                    AND tp.deleted_at IS NULL
              )
            ORDER BY m.updated_at DESC, m.id DESC
            LIMIT 5
        ");
        $noProgramStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $noProgramStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $noProgramStmt->execute();
        $noProgramRows = $noProgramStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $membersWithoutActiveProgram = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'uuid' => (string)$row['uuid'],
                'first_name' => (string)$row['first_name'],
                'last_name' => (string)$row['last_name'],
                'updated_at' => (string)$row['updated_at']
            ];
        }, $noProgramRows);

        // 5. Attention: draft programs (draft non-deleted programs of current trainer for active non-deleted members of current trainer)
        $draftProgStmt = $this->db->prepare("
            SELECT 
                tp.id, tp.uuid, tp.member_id, tp.title, tp.updated_at,
                m.first_name AS member_first_name, m.last_name AS member_last_name
            FROM training_programs tp
            INNER JOIN members m ON tp.member_id = m.id AND m.trainer_id = ? AND m.deleted_at IS NULL AND m.status = 'active'
            WHERE tp.trainer_id = ? AND tp.deleted_at IS NULL AND tp.status = 'draft'
            ORDER BY tp.updated_at DESC, tp.id DESC
            LIMIT 5
        ");
        $draftProgStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $draftProgStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $draftProgStmt->execute();
        $draftProgRows = $draftProgStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $draftPrograms = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'uuid' => (string)$row['uuid'],
                'member_id' => (int)$row['member_id'],
                'member_first_name' => (string)$row['member_first_name'],
                'member_last_name' => (string)$row['member_last_name'],
                'title' => (string)$row['title'],
                'updated_at' => (string)$row['updated_at']
            ];
        }, $draftProgRows);

        // 6. Attention: expired active memberships (active non-deleted members of current trainer with membership_end_date < CURDATE())
        $expiredMemStmt = $this->db->prepare("
            SELECT 
                m.id, m.uuid, m.first_name, m.last_name, m.membership_end_date
            FROM members m
            WHERE m.trainer_id = ? 
              AND m.deleted_at IS NULL 
              AND m.status = 'active'
              AND m.membership_end_date IS NOT NULL
              AND m.membership_end_date < CURDATE()
            ORDER BY m.membership_end_date DESC, m.id DESC
            LIMIT 5
        ");
        $expiredMemStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $expiredMemStmt->execute();
        $expiredMemRows = $expiredMemStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $expiredActiveMemberships = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'uuid' => (string)$row['uuid'],
                'first_name' => (string)$row['first_name'],
                'last_name' => (string)$row['last_name'],
                'membership_end_date' => (string)$row['membership_end_date']
            ];
        }, $expiredMemRows);

        // 7. Attention: expired active programs (active non-deleted programs of current trainer with end_date < CURDATE() for active non-deleted members of current trainer)
        $expiredProgStmt = $this->db->prepare("
            SELECT 
                tp.id, tp.uuid, tp.member_id, tp.title, tp.end_date,
                m.first_name AS member_first_name, m.last_name AS member_last_name
            FROM training_programs tp
            INNER JOIN members m ON tp.member_id = m.id AND m.trainer_id = ? AND m.deleted_at IS NULL AND m.status = 'active'
            WHERE tp.trainer_id = ? 
              AND tp.deleted_at IS NULL 
              AND tp.status = 'active'
              AND tp.end_date IS NOT NULL
              AND tp.end_date < CURDATE()
            ORDER BY tp.end_date DESC, tp.id DESC
            LIMIT 5
        ");
        $expiredProgStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $expiredProgStmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $expiredProgStmt->execute();
        $expiredProgRows = $expiredProgStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $expiredActivePrograms = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'uuid' => (string)$row['uuid'],
                'member_id' => (int)$row['member_id'],
                'member_first_name' => (string)$row['member_first_name'],
                'member_last_name' => (string)$row['member_last_name'],
                'title' => (string)$row['title'],
                'end_date' => (string)$row['end_date']
            ];
        }, $expiredProgRows);

        Response::json([
            'trainer' => [
                'id' => (int)$trainer['id'],
                'display_name' => (string)$trainer['display_name']
            ],
            'members' => $memberMetrics,
            'training_programs' => $programMetrics,
            'recent_members' => $recentMembers,
            'attention' => [
                'members_without_active_program' => $membersWithoutActiveProgram,
                'draft_programs' => $draftPrograms,
                'expired_active_memberships' => $expiredActiveMemberships,
                'expired_active_programs' => $expiredActivePrograms
            ]
        ]);
    }
}
