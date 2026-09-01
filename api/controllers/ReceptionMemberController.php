<?php

namespace Controllers;

use Core\Database;
use Core\Response;

class ReceptionMemberController
{
    public function index()
    {
        $q = $_GET['q'] ?? null;

        if (!is_string($q)) {
            Response::json(['error' => 'Validation error: q parameter is required'], 422);
            return;
        }

        $q = trim($q);

        if (mb_strlen($q) < 2 || mb_strlen($q) > 80) {
            Response::json(['error' => 'Validation error: q must be between 2 and 80 characters'], 422);
            return;
        }

        $db = Database::getInstance()->getConnection();

        // Escape wildcards for LIKE
        $escapedQ = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $q);
        $likePattern = '%' . $escapedQ . '%';

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
                    m.first_name LIKE :like_q OR 
                    m.last_name LIKE :like_q OR 
                    CONCAT(m.first_name, ' ', m.last_name) LIKE :like_q OR 
                    m.phone LIKE :like_q
                )
                ORDER BY m.last_name ASC, m.first_name ASC, m.id ASC
                LIMIT 20";

        try {
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':exact_q', $q, \PDO::PARAM_STR);
            $stmt->bindValue(':like_q', $likePattern, \PDO::PARAM_STR);
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
            Response::json(['error' => 'An error occurred while searching members.'], 500);
        }
    }
}
