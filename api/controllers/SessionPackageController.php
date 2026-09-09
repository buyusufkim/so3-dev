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
        $this->db = Database::getInstance()->getConnection();
    }

    public function index()
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        // Strict GET parameters validation
        $allowedParams = ['status', 'q', 'page', 'per_page'];
        $unknownParams = array_diff(array_keys($_GET), $allowedParams);
        if (!empty($unknownParams)) {
            Response::error('Unknown query parameter(s): ' . implode(', ', $unknownParams), 'VALIDATION_ERROR', 422);
        }
        if (!empty($unknownParams)) {
            Response::error('Unknown query parameter(s): ' . implode(', ', $unknownParams), 'VALIDATION_ERROR', 422);
        }

        $page = 1;
        if (isset($_GET['page'])) {
            if (is_array($_GET['page']) || !is_scalar($_GET['page']) || !ctype_digit((string)$_GET['page']) || (int)$_GET['page'] < 1) {
                Response::error('Page must be a positive integer', 'VALIDATION_ERROR', 422);
            }
            $page = (int)$_GET['page'];
        }

        $perPage = 20;
        if (isset($_GET['per_page'])) {
            if (is_array($_GET['per_page']) || !is_scalar($_GET['per_page']) || !ctype_digit((string)$_GET['per_page']) || (int)$_GET['per_page'] < 1 || (int)$_GET['per_page'] > 100) {
                Response::error('Per page must be a positive integer between 1 and 100', 'VALIDATION_ERROR', 422);
            }
            $perPage = (int)$_GET['per_page'];
        }
        
        $offset = ($page - 1) * $perPage;

        $conditions = [];
        $params = [];

        if (isset($_GET['status'])) {
            if (!is_string($_GET['status']) || !in_array($_GET['status'], ['active', 'inactive'])) {
                Response::error('Status must be exact active or inactive', 'VALIDATION_ERROR', 422);
            }
            $conditions[] = "status = :status";
            $params[':status'] = $_GET['status'];
        }

        if (isset($_GET['q'])) {
            if (!is_string($_GET['q'])) {
                Response::error('Search query must be a string', 'VALIDATION_ERROR', 422);
            }
            $q = trim($_GET['q']);
            if (strlen($q) > 255) {
                Response::error('Search query is too long', 'VALIDATION_ERROR', 422);
            }
            if ($q !== '') {
                $conditions[] = "name LIKE :q ESCAPE '\\'";
                $params[':q'] = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
            }
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

        
        if (!isset($input['name']) || !is_string($input['name'])) {
            Response::error('Name must be a string', 'VALIDATION_ERROR', 422);
        }
        $name = trim($input['name']);
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
            if (!is_string($input['status']) || !in_array($input['status'], ['active', 'inactive'], true)) {
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

            AuditLogger::log('session_package.create', $adminId, 'session_package', $id, [
                'name' => $name,
                'session_count' => $sessionCount,
                'validity_days' => $validityDays,
                'status' => $status
            ]);

            $this->db->commit();

            $this->returnPackage($id, 201);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
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

        
        if (array_key_exists('name', $input)) {
            if (!is_string($input['name'])) {
                Response::error('Name must be a string', 'VALIDATION_ERROR', 422);
            }
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

        if (array_key_exists('session_count', $input)) {
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

        if (array_key_exists('status', $input)) {
            if (!is_string($input['status']) || !in_array($input['status'], ['active', 'inactive'], true)) {
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

            AuditLogger::log('session_package.update', $adminId, 'session_package', $id, [
                'changed_fields' => $changedFields
            ]);

            $this->db->commit();
            $this->returnPackage($id);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
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

        Response::json($package, $statusCode);
    }

    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
