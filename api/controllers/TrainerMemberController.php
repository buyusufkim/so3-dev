<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;

class TrainerMemberController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfileId(): int {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }

        return (int)$trainer['id'];
    }

    private function validatePaginationParam($value, $default, $min, $max = null) {
        if ($value === null) return $default;
        if (is_array($value) || is_bool($value) || is_object($value)) return false;
        
        $val = (string)$value;
        $filtered = filter_var($val, FILTER_VALIDATE_INT);
        
        if ($filtered === false) return false;
        if ((string)$filtered !== $val) return false;
        if ($filtered < $min) return false;
        if ($max !== null && $filtered > $max) return false;
        
        return $filtered;
    }

    public function index() {
        AuthMiddleware::hasRole(['trainer']);
        
        $trainerId = $this->getTrainerProfileId();

        $pageInput = isset($_GET['page']) ? $_GET['page'] : null;
        $perPageInput = isset($_GET['per_page']) ? $_GET['per_page'] : null;
        
        $page = $this->validatePaginationParam($pageInput, 1, 1);
        $perPage = $this->validatePaginationParam($perPageInput, 20, 1, 100);

        if ($page === false) {
            Response::error('Geçersiz sayfa numarası', 'VALIDATION_ERROR', 422);
        }
        if ($perPage === false) {
            Response::error('Geçersiz per_page değeri', 'VALIDATION_ERROR', 422);
        }
        
        if (($page - 1) > intdiv(PHP_INT_MAX, $perPage)) {
            Response::error('Geçersiz sayfa numarası', 'VALIDATION_ERROR', 422);
        }
        
        $status = isset($_GET['status']) ? $_GET['status'] : null;
        if ($status !== null) {
            if (is_array($status) || !is_string($status) || !in_array($status, ['active', 'inactive'])) {
                Response::error('Geçersiz durum', 'VALIDATION_ERROR', 422);
            }
        }

        $q = isset($_GET['q']) ? $_GET['q'] : null;
        if ($q !== null) {
            if (is_array($q) || is_bool($q) || is_object($q)) {
                Response::error('Geçersiz arama parametresi', 'VALIDATION_ERROR', 422);
            }
            $q = trim((string)$q);
        }

        $conditions = ['m.trainer_id = ?', 'm.deleted_at IS NULL'];

        if ($status) {
            $conditions[] = 'm.status = ?';
        }

        if ($q !== null && $q !== '') {
            $conditions[] = '(m.first_name LIKE ? OR m.last_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)';
        }

        $where = implode(' AND ', $conditions);

        // Count
        $countSql = "SELECT COUNT(*) FROM members m WHERE " . $where;
        $countStmt = $this->db->prepare($countSql);
        $countStmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $paramIndex = 2;
        if ($status) {
            $countStmt->bindValue($paramIndex++, $status, PDO::PARAM_STR);
        }
        if ($q !== null && $q !== '') {
            $search = '%' . $q . '%';
            $countStmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
            $countStmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
            $countStmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
            $countStmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
        }
        $countStmt->execute();
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
            LIMIT ? OFFSET ?
        ";
        $stmt = $this->db->prepare($sql);
        
        $stmt->bindValue(1, $trainerId, PDO::PARAM_INT);
        $paramIndex = 2;
        if ($status) {
            $stmt->bindValue($paramIndex++, $status, PDO::PARAM_STR);
        }
        if ($q !== null && $q !== '') {
            $search = '%' . $q . '%';
            $stmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
            $stmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
            $stmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
            $stmt->bindValue($paramIndex++, $search, PDO::PARAM_STR);
        }

        $stmt->bindValue($paramIndex++, $perPage, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Normalize response types
        $normalizedItems = array_map(function($item) {
            $item['id'] = (int)$item['id'];
            return $item;
        }, $items);

        Response::json([
            'items' => $normalizedItems,
            'pagination' => [
                'total' => (int)$total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => (int)$lastPage
            ]
        ]);
    }

    public function show($id) {
        AuthMiddleware::hasRole(['trainer']);
        
        $trainerId = $this->getTrainerProfileId();
        
        if (is_array($id) || is_bool($id) || is_object($id)) {
            Response::error('Geçersiz ID', 'VALIDATION_ERROR', 422);
        }

        $idStr = (string)$id;
        $filteredId = filter_var($idStr, FILTER_VALIDATE_INT);
        if ($filteredId === false || (string)$filteredId !== $idStr || $filteredId < 1) {
            Response::error('Geçersiz ID', 'VALIDATION_ERROR', 422);
        }

        $idInt = (int)$filteredId;

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
        $stmt->bindValue(1, $idInt, PDO::PARAM_INT);
        $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
        $stmt->execute();
        
        $member = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
        }
        
        // Normalize
        $member['id'] = (int)$member['id'];

        Response::json($member);
    }
}
