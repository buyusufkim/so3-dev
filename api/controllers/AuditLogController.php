<?php
namespace Controllers;

class AuditLogController
{
    public function index()
    {
        \Middleware\AuthMiddleware::hasRole(['super_admin']);

        try {
            $db = \Core\Database::getInstance()->getConnection();
            
            // Pagination
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            if ($page < 1) $page = 1;
            
            $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
            if ($perPage < 1) $perPage = 20;
            if ($perPage > 100) $perPage = 100; // max limit
            
            $offset = ($page - 1) * $perPage;

            // Optional filters
            $whereParts = [];
            $params = [];

            if (!empty($_GET['action'])) {
                $whereParts[] = 'a.action = ?';
                $params[] = $_GET['action'];
            }
            if (!empty($_GET['entity_type'])) {
                $whereParts[] = 'a.entity_type = ?';
                $params[] = $_GET['entity_type'];
            }
            if (!empty($_GET['admin_id'])) {
                $whereParts[] = 'a.admin_id = ?';
                $params[] = (int)$_GET['admin_id'];
            }

            $whereSql = '';
            if (count($whereParts) > 0) {
                $whereSql = 'WHERE ' . implode(' AND ', $whereParts);
            }

            // Total count
            $countQuery = "SELECT COUNT(*) FROM audit_logs a $whereSql";
            $countStmt = $db->prepare($countQuery);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            // Fetch records
            // JOIN admins to get actor details
            $query = "
                SELECT 
                    a.id, 
                    a.action, 
                    a.entity_type, 
                    a.entity_id, 
                    a.admin_id,
                    ad.display_name,
                    a.created_at
                FROM audit_logs a
                LEFT JOIN admins ad ON a.admin_id = ad.id
                $whereSql
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT ? OFFSET ?
            ";
            
            $fetchParams = array_merge($params, [$perPage, $offset]);
            $stmt = $db->prepare($query);
            
            // Need to bind LIMIT and OFFSET as INT because PDO defaults to string for array execution
            $bindIdx = 1;
            foreach ($params as $val) {
                $stmt->bindValue($bindIdx++, $val, is_int($val) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->bindValue($bindIdx++, $perPage, \PDO::PARAM_INT);
            $stmt->bindValue($bindIdx++, $offset, \PDO::PARAM_INT);
            
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $data = [];
            foreach ($rows as $row) {
                $actor = null;
                if ($row['admin_id']) {
                    $displayName = trim($row['display_name'] ?? '');
                    if (empty($displayName)) $displayName = 'Bilinmeyen';
                    $actor = [
                        'admin_id' => (int)$row['admin_id'],
                        'display_name' => $displayName
                    ];
                }

                $data[] = [
                    'id' => (int)$row['id'],
                    'action' => $row['action'],
                    'entity_type' => $row['entity_type'],
                    'entity_id' => $row['entity_id'] ? (int)$row['entity_id'] : null,
                    'actor' => $actor,
                    'created_at' => $row['created_at']
                ];
            }

            \Core\Response::json([
                'data' => $data,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'per_page' => $perPage,
                    'last_page' => ceil($total / $perPage) ?: 1
                ]
            ]);

        } catch (\Exception $e) {
            \Core\Response::error('Denetim kayıtları alınamadı', 'AUDIT_LOG_FETCH_ERROR', 500);
        }
    }
}
