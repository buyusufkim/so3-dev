<?php

namespace Controllers;

use Core\Database;
use Core\Response;

class ReceptionMemberController
{
    public function index()
    {
        // Strict query parameter allowlist
        $allowedKeys = ['q'];
        $requestKeys = array_keys($_GET);
        $extraKeys = array_diff($requestKeys, $allowedKeys);
        
        if (!empty($extraKeys)) {
            Response::error('Yalnızca q parametresine izin verilmektedir.', 'VALIDATION_ERROR', 422);
            return;
        }

        $q = $_GET['q'] ?? null;

        if (!is_string($q)) {
            Response::error('Arama parametresi (q) eksik veya geçersiz.', 'VALIDATION_ERROR', 422);
            return;
        }

        $q = trim($q);

        if (mb_strlen($q) < 2 || mb_strlen($q) > 80) {
            Response::error('Arama terimi 2 ile 80 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        // Escape wildcards for LIKE
        $escapedQ = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $q);
        $likePattern = '%' . $escapedQ . '%';

        $db = Database::getInstance()->getConnection();

        $sql = "SELECT 
                    m.id, 
                    m.uuid, 
                    m.first_name, 
                    m.last_name, 
                    m.phone, 
                    m.status, 
                    m.membership_start_date, 
                    m.membership_end_date 
                FROM members m 
                WHERE m.deleted_at IS NULL 
                AND (
                    m.uuid = :exact_q OR 
                    m.first_name LIKE :like_q_1 ESCAPE '\\\\' OR 
                    m.last_name LIKE :like_q_2 ESCAPE '\\\\' OR 
                    CONCAT(m.first_name, ' ', m.last_name) LIKE :like_q_3 ESCAPE '\\\\' OR 
                    m.phone LIKE :like_q_4 ESCAPE '\\\\'
                )
                ORDER BY m.last_name ASC, m.first_name ASC, m.id ASC
                LIMIT 20";

        try {
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':exact_q', $q, \PDO::PARAM_STR);
            $stmt->bindValue(':like_q_1', $likePattern, \PDO::PARAM_STR);
            $stmt->bindValue(':like_q_2', $likePattern, \PDO::PARAM_STR);
            $stmt->bindValue(':like_q_3', $likePattern, \PDO::PARAM_STR);
            $stmt->bindValue(':like_q_4', $likePattern, \PDO::PARAM_STR);
            $stmt->execute();
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $items = [];
            foreach ($results as $row) {
                $items[] = [
                    'id' => (int) $row['id'],
                    'uuid' => (string) $row['uuid'],
                    'first_name' => (string) $row['first_name'],
                    'last_name' => (string) $row['last_name'],
                    'phone' => (string) $row['phone'],
                    'status' => (string) $row['status'],
                    'membership_start_date' => $row['membership_start_date'] ? (string) $row['membership_start_date'] : null,
                    'membership_end_date' => $row['membership_end_date'] ? (string) $row['membership_end_date'] : null,
                ];
            }

            Response::json(['items' => $items]);
        } catch (\Exception $e) {
            error_log("ReceptionMemberController index error: " . $e->getMessage());
            Response::error('Üye araması sırasında bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
