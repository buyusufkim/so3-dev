<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;

class SessionPackageController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function index()
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $conditions = [];
        $params = [];

        if (isset($_GET['status']) && in_array($_GET['status'], ['active', 'inactive'])) {
            $conditions[] = "status = :status";
            $params[':status'] = $_GET['status'];
        }

        if (!empty($_GET['q'])) {
            $conditions[] = "name LIKE :q";
            $params[':q'] = '%' . $_GET['q'] . '%';
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM session_packages $whereClause");
        $countStmt->execute($params);
        $totalItems = $countStmt->fetchColumn();

        $stmt = $this->db->prepare("
            SELECT 
                id, uuid, name, session_count, validity_days, status, 
                created_at, updated_at
            FROM session_packages
            $whereClause
            ORDER BY id DESC
            LIMIT :offset, :per_page
        ");

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->bindValue(':per_page', $perPage, \PDO::PARAM_INT);
        $stmt->execute();

        $items = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Cast numeric types
        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['session_count'] = (int)$item['session_count'];
            $item['validity_days'] = $item['validity_days'] !== null ? (int)$item['validity_days'] : null;
        }

        Response::json([
            'items' => $items,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_items' => (int)$totalItems,
                'total_pages' => ceil($totalItems / $perPage)
            ]
        ]);
    }

    public function create()
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            Response::error('Invalid JSON payload', 'INVALID_JSON', 422);
        }

        // Strict allowlist
        $allowed = ['name', 'session_count', 'validity_days', 'status'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed)) {
                Response::error("Unknown field: $key", 'UNKNOWN_FIELD', 422);
            }
        }

        $name = isset($input['name']) ? trim($input['name']) : '';
        if (strlen($name) < 1 || strlen($name) > 150) {
            Response::error('Name must be between 1 and 150 characters', 'VALIDATION_ERROR', 422);
        }

        if (!isset($input['session_count']) || !is_int($input['session_count']) || $input['session_count'] <= 0) {
            Response::error('Session count must be a positive integer', 'VALIDATION_ERROR', 422);
        }
        $sessionCount = $input['session_count'];

        $validityDays = null;
        if (array_key_exists('validity_days', $input)) {
            if ($input['validity_days'] !== null && (!is_int($input['validity_days']) || $input['validity_days'] <= 0)) {
                Response::error('Validity days must be null or a positive integer', 'VALIDATION_ERROR', 422);
            }
            $validityDays = $input['validity_days'];
        }

        $status = 'active';
        if (isset($input['status'])) {
            if (!in_array($input['status'], ['active', 'inactive'])) {
                Response::error('Status must be active or inactive', 'VALIDATION_ERROR', 422);
            }
            $status = $input['status'];
        }

        try {
            $this->db->beginTransaction();

            $uuid = $this->generateUuid();

            $stmt = $this->db->prepare("
                INSERT INTO session_packages 
                (uuid, name, session_count, validity_days, status, created_by)
                VALUES (:uuid, :name, :session_count, :validity_days, :status, :created_by)
            ");
            $stmt->execute([
                ':uuid' => $uuid,
                ':name' => $name,
                ':session_count' => $sessionCount,
                ':validity_days' => $validityDays,
                ':status' => $status,
                ':created_by' => $adminId
            ]);

            $id = (int)$this->db->lastInsertId();

            AuditLogger::log('session_package.create', 'session_package', $id, [
                'name' => $name,
                'session_count' => $sessionCount,
                'validity_days' => $validityDays,
                'status' => $status
            ]);

            $this->db->commit();

            $this->returnPackage($id, 201);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('An unexpected error occurred', 'SERVER_ERROR', 500);
        }
    }

    public function update($id)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            Response::error('Invalid JSON payload', 'INVALID_JSON', 422);
        }
        
        if (empty($input)) {
            Response::error('Empty update payload', 'VALIDATION_ERROR', 422);
        }

        // Strict allowlist
        $allowed = ['name', 'session_count', 'validity_days', 'status'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed)) {
                Response::error("Unknown field: $key", 'UNKNOWN_FIELD', 422);
            }
        }

        $stmt = $this->db->prepare("SELECT * FROM session_packages WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $package = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$package) {
            Response::error('Session package not found', 'NOT_FOUND', 404);
        }

        $updates = [];
        $params = [':id' => $id, ':updated_by' => $adminId];
        $changedFields = [];

        if (isset($input['name'])) {
            $name = trim($input['name']);
            if (strlen($name) < 1 || strlen($name) > 150) {
                Response::error('Name must be between 1 and 150 characters', 'VALIDATION_ERROR', 422);
            }
            if ($name !== $package['name']) {
                $updates[] = "name = :name";
                $params[':name'] = $name;
                $changedFields['name'] = $name;
            }
        }

        if (isset($input['session_count'])) {
            if (!is_int($input['session_count']) || $input['session_count'] <= 0) {
                Response::error('Session count must be a positive integer', 'VALIDATION_ERROR', 422);
            }
            if ($input['session_count'] !== (int)$package['session_count']) {
                $updates[] = "session_count = :session_count";
                $params[':session_count'] = $input['session_count'];
                $changedFields['session_count'] = $input['session_count'];
            }
        }

        if (array_key_exists('validity_days', $input)) {
            if ($input['validity_days'] !== null && (!is_int($input['validity_days']) || $input['validity_days'] <= 0)) {
                Response::error('Validity days must be null or a positive integer', 'VALIDATION_ERROR', 422);
            }
            $oldVal = $package['validity_days'] !== null ? (int)$package['validity_days'] : null;
            if ($input['validity_days'] !== $oldVal) {
                $updates[] = "validity_days = :validity_days";
                $params[':validity_days'] = $input['validity_days'];
                $changedFields['validity_days'] = $input['validity_days'];
            }
        }

        if (isset($input['status'])) {
            if (!in_array($input['status'], ['active', 'inactive'])) {
                Response::error('Status must be active or inactive', 'VALIDATION_ERROR', 422);
            }
            if ($input['status'] !== $package['status']) {
                $updates[] = "status = :status";
                $params[':status'] = $input['status'];
                $changedFields['status'] = $input['status'];
            }
        }

        if (empty($updates)) {
            $this->returnPackage($id);
            return;
        }

        $updates[] = "updated_by = :updated_by";
        $setClause = implode(', ', $updates);

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("UPDATE session_packages SET $setClause WHERE id = :id");
            $stmt->execute($params);

            AuditLogger::log('session_package.update', 'session_package', $id, [
                'changed_fields' => $changedFields
            ]);

            $this->db->commit();
            $this->returnPackage($id);
        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('An unexpected error occurred', 'SERVER_ERROR', 500);
        }
    }

    private function returnPackage($id, $statusCode = 200)
    {
        $stmt = $this->db->prepare("
            SELECT 
                id, uuid, name, session_count, validity_days, status, 
                created_at, updated_at
            FROM session_packages
            WHERE id = :id
        ");
        $stmt->execute([':id' => $id]);
        $package = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($package) {
            $package['id'] = (int)$package['id'];
            $package['session_count'] = (int)$package['session_count'];
            $package['validity_days'] = $package['validity_days'] !== null ? (int)$package['validity_days'] : null;
        }

        if ($statusCode === 201) {
            http_response_code(201);
        }
        
        Response::json($package);
    }

    private function generateUuid() {
        return sprintf( '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ),
            mt_rand( 0, 0xffff ),
            mt_rand( 0, 0x0fff ) | 0x4000,
            mt_rand( 0, 0x3fff ) | 0x8000,
            mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff )
        );
    }
}
