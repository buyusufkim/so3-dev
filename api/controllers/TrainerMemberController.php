<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;

class TrainerMemberController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfileId(): int {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->execute([$adminId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return (int)$trainer['id'];
    }

    public function index() {
        $trainerId = $this->getTrainerProfileId();

        $page = isset($_GET['page']) ? $_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? $_GET['per_page'] : 20;
        
        // Strict validation for pagination
        if (filter_var($page, FILTER_VALIDATE_INT) === false || (int)$page < 1) {
            Response::error('Geçersiz sayfa numarası', 'VALIDATION_ERROR', 422);
        }
        if (filter_var($perPage, FILTER_VALIDATE_INT) === false || (int)$perPage < 1 || (int)$perPage > 100) {
            Response::error('Geçersiz per_page değeri', 'VALIDATION_ERROR', 422);
        }
        
        $page = (int)$page;
        $perPage = (int)$perPage;
        
        $status = $_GET['status'] ?? null;
        if ($status !== null && !in_array($status, ['active', 'inactive'])) {
            Response::error('Geçersiz durum', 'VALIDATION_ERROR', 422);
        }

        $q = $_GET['q'] ?? null;
        if ($q !== null && is_array($q)) {
            Response::error('Geçersiz arama parametresi', 'VALIDATION_ERROR', 422);
        }

        $conditions = ['m.trainer_id = ?', 'm.deleted_at IS NULL'];
        $params = [$trainerId];

        if ($status) {
            $conditions[] = 'm.status = ?';
            $params[] = $status;
        }

        if ($q !== null && $q !== '') {
            $conditions[] = '(m.first_name LIKE ? OR m.last_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)';
            $search = '%' . $q . '%';
            $params = array_merge($params, [$search, $search, $search, $search]);
        }

        $where = implode(' AND ', $conditions);

        // Count
        $countSql = "SELECT COUNT(*) FROM members m WHERE " . $where;
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        $lastPage = ceil($total / $perPage);
        if ($lastPage < 1) $lastPage = 1;

        $offset = ($page - 1) * $perPage;

        $sql = "
            SELECT 
                m.id, m.uuid, m.first_name, m.last_name, m.phone, m.email, 
                m.status, m.membership_start_date, m.membership_end_date, 
                m.created_at, m.updated_at
            FROM members m
            WHERE $where
            ORDER BY m.id DESC
            LIMIT $perPage OFFSET $offset
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'items' => $items,
            'pagination' => [
                'total' => (int)$total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => (int)$lastPage
            ]
        ]);
    }

    public function show($id) {
        $trainerId = $this->getTrainerProfileId();
        
        // Ensure ID is positive integer
        if (filter_var($id, FILTER_VALIDATE_INT) === false || (int)$id < 1) {
            Response::error('Geçersiz ID', 'VALIDATION_ERROR', 422);
        }

        $sql = "
            SELECT 
                m.id, m.uuid, m.first_name, m.last_name, m.phone, m.email, 
                m.status, m.membership_start_date, m.membership_end_date,
                m.emergency_contact_name, m.emergency_contact_phone, m.notes,
                m.created_at, m.updated_at
            FROM members m
            WHERE m.id = ? AND m.trainer_id = ? AND m.deleted_at IS NULL
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $trainerId]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
        }
        
        if (class_exists('Core\AuditLogger')) {
            AuditLogger::log('member_view', 'trainer read member', $member['id'], $_SESSION['admin_id'] ?? null);
        }

        Response::json($member);
    }
}
