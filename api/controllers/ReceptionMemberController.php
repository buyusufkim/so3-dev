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

    public function checkIn($id)
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
            return;
        }

        if (!empty($_GET)) {
            Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);
            return;
        }

        $rawBody = trim(file_get_contents('php://input'));
        if ($rawBody !== '') {
            $decoded = json_decode($rawBody);
            if (json_last_error() !== JSON_ERROR_NONE) {
                Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
                return;
            }
            if (!($decoded instanceof \stdClass)) {
                Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            if (count(get_object_vars($decoded)) !== 0) {
                Response::error('İstek gövdesi (body) boş olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
        }

        $db = Database::getInstance()->getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("
                SELECT id, status, membership_end_date, deleted_at, (membership_end_date IS NULL OR membership_end_date >= CURDATE()) AS is_eligible_date
                FROM members
                WHERE id = :id
                FOR UPDATE
            ");
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
            $stmt->execute();
            
            $member = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                $db->rollBack();
                Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
                return;
            }

            if ($member['status'] !== 'active') {
                $db->rollBack();
                Response::error('Üye pasif durumda. Giriş yapılamaz.', 'MEMBER_INACTIVE', 409);
                return;
            }

            if (!$member['is_eligible_date']) {
                $db->rollBack();
                Response::error('Üyelik süresi dolmuş. Giriş yapılamaz.', 'MEMBERSHIP_EXPIRED', 409);
                return;
            }

            $visitStmt = $db->prepare("
                SELECT id 
                FROM member_visits 
                WHERE member_id = :id AND checked_out_at IS NULL 
                LIMIT 1
            ");
            $visitStmt->bindValue(':id', $id, \PDO::PARAM_INT);
            $visitStmt->execute();
            
            if ($visitStmt->fetch()) {
                $db->rollBack();
                Response::error('Üyenin zaten açık bir ziyareti (girişi) bulunmaktadır.', 'MEMBER_ALREADY_CHECKED_IN', 409);
                return;
            }

            $uuid = $this->generateUuid();
            $insertStmt = $db->prepare("
                INSERT INTO member_visits (uuid, member_id, checked_in_by, checked_in_at)
                VALUES (:uuid, :member_id, :checked_in_by, CURRENT_TIMESTAMP)
            ");
            $insertStmt->bindValue(':uuid', $uuid, \PDO::PARAM_STR);
            $insertStmt->bindValue(':member_id', $id, \PDO::PARAM_INT);
            $insertStmt->bindValue(':checked_in_by', $adminId, \PDO::PARAM_INT);
            $insertStmt->execute();

            $visitId = (int)$db->lastInsertId();

            $fetchVisitStmt = $db->prepare("
                SELECT checked_in_at 
                FROM member_visits 
                WHERE id = :id
            ");
            $fetchVisitStmt->bindValue(':id', $visitId, \PDO::PARAM_INT);
            $fetchVisitStmt->execute();
            $visitData = $fetchVisitStmt->fetch(\PDO::FETCH_ASSOC);

            $db->commit();

            try {
                \Core\AuditLogger::log(
                    'reception.member.check_in',
                    $adminId,
                    'member_visit',
                    $visitId,
                    ['member_id' => $id]
                );
            } catch (\Exception $e) {
                error_log("Audit log failed for check-in $visitId: " . $e->getMessage());
            }

            Response::json([
                'visit' => [
                    'id' => $visitId,
                    'uuid' => $uuid,
                    'member_id' => $id,
                    'checked_in_at' => (string)$visitData['checked_in_at']
                ]
            ], 201);

        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("ReceptionMemberController checkIn error: " . $e->getMessage());
            Response::error('Giriş işlemi sırasında beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function checkOut($id)
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
            return;
        }

        if (!empty($_GET)) {
            Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);
            return;
        }

        $rawBody = trim(file_get_contents('php://input'));
        if ($rawBody !== '') {
            $decoded = json_decode($rawBody);
            if (json_last_error() !== JSON_ERROR_NONE) {
                Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
                return;
            }
            if (!($decoded instanceof \stdClass)) {
                Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            if (count(get_object_vars($decoded)) !== 0) {
                Response::error('İstek gövdesi (body) boş olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
        }

        $db = Database::getInstance()->getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("SELECT id FROM members WHERE id = :id FOR UPDATE");
            $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
            $stmt->execute();
            
            $member = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$member) {
                $db->rollBack();
                Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
                return;
            }

            $visitStmt = $db->prepare("
                SELECT id, uuid, member_id, checked_in_at 
                FROM member_visits 
                WHERE member_id = :id AND checked_out_at IS NULL 
                LIMIT 1
            ");
            $visitStmt->bindValue(':id', $id, \PDO::PARAM_INT);
            $visitStmt->execute();
            
            $visit = $visitStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$visit) {
                $db->rollBack();
                Response::error('Üyenin açık bir ziyareti bulunmamaktadır.', 'MEMBER_NOT_CHECKED_IN', 409);
                return;
            }

            $visitId = (int)$visit['id'];

            $updateStmt = $db->prepare("
                UPDATE member_visits 
                SET checked_out_at = CURRENT_TIMESTAMP, 
                    checked_out_by = :admin_id 
                WHERE id = :visit_id AND checked_out_at IS NULL
            ");
            $updateStmt->bindValue(':admin_id', $adminId, \PDO::PARAM_INT);
            $updateStmt->bindValue(':visit_id', $visitId, \PDO::PARAM_INT);
            $updateStmt->execute();

            if ($updateStmt->rowCount() !== 1) {
                $db->rollBack();
                Response::error('Çıkış işlemi sırasında veri tutarsızlığı tespit edildi.', 'INTERNAL_ERROR', 500);
                return;
            }

            $fetchUpdatedStmt = $db->prepare("SELECT checked_out_at FROM member_visits WHERE id = :visit_id");
            $fetchUpdatedStmt->bindValue(':visit_id', $visitId, \PDO::PARAM_INT);
            $fetchUpdatedStmt->execute();
            $updatedVisit = $fetchUpdatedStmt->fetch(\PDO::FETCH_ASSOC);

            $db->commit();

            try {
                \Core\AuditLogger::log(
                    'reception.member.check_out',
                    $adminId,
                    'member_visit',
                    $visitId,
                    ['member_id' => $id]
                );
            } catch (\Exception $e) {
                error_log("Audit log failed for check-out $visitId: " . $e->getMessage());
            }

            Response::json([
                'visit' => [
                    'id' => $visitId,
                    'uuid' => $visit['uuid'],
                    'member_id' => (int)$visit['member_id'],
                    'checked_in_at' => (string)$visit['checked_in_at'],
                    'checked_out_at' => (string)$updatedVisit['checked_out_at']
                ]
            ], 200);

        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("ReceptionMemberController checkOut error: " . $e->getMessage());
            Response::error('Çıkış işlemi sırasında beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function occupancy()
    {
        if (!empty($_GET)) {
            Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);
            return;
        }

        $db = Database::getInstance()->getConnection();

        $sql = "SELECT 
                    mv.id AS visit_id,
                    mv.uuid AS visit_uuid,
                    mv.member_id,
                    mv.checked_in_at,
                    m.uuid AS member_uuid,
                    m.first_name,
                    m.last_name,
                    IF(DATE(mv.checked_in_at) < CURDATE(), 1, 0) AS is_stale
                FROM member_visits mv
                JOIN members m ON mv.member_id = m.id
                WHERE mv.checked_out_at IS NULL
                ORDER BY is_stale DESC, mv.checked_in_at ASC, mv.id ASC";

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $items = [];
            $staleCount = 0;

            foreach ($results as $row) {
                $isStale = (bool)$row['is_stale'];
                if ($isStale) {
                    $staleCount++;
                }

                $items[] = [
                    'visit' => [
                        'id' => (int)$row['visit_id'],
                        'uuid' => (string)$row['visit_uuid'],
                        'checked_in_at' => (string)$row['checked_in_at']
                    ],
                    'member' => [
                        'id' => (int)$row['member_id'],
                        'uuid' => (string)$row['member_uuid'],
                        'first_name' => (string)$row['first_name'],
                        'last_name' => (string)$row['last_name']
                    ],
                    'is_stale' => $isStale
                ];
            }

            Response::json([
                'current_count' => count($items),
                'stale_count' => $staleCount,
                'items' => $items
            ]);

        } catch (\Throwable $e) {
            error_log("ReceptionMemberController occupancy error: " . $e->getMessage());
            Response::error('Doluluk bilgisi alınırken beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    private function generateUuid(): string 
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
