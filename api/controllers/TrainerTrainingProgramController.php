<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use Core\AuditLogger;
use PDO;

class TrainerTrainingProgramController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfileId(): int {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->execute([$adminId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        return (int)$trainer['id'];
    }

    private function getTrainerProfileIdForUpdate(): int {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
            FOR UPDATE
        ");
        $stmt->execute([$adminId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        return (int)$trainer['id'];
    }

    private function getJsonPayload(): array {
        $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
        if (strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false) {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }
        
        if (strlen($raw) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }
        
        if (trim($raw) === '') {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }

        $isObj = json_decode($raw, false);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)) {
            Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);
        }

        $data = json_decode($raw, true);

        $allowlist = ['title', 'status', 'start_date', 'end_date', 'notes'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowlist, true)) {
                Response::error("Bilinmeyen alan: $key", 'VALIDATION_ERROR', 422);
            }
        }
        return $data;
    }

    private function validateDate($date): bool {
        if ($date === null) return true;
        if (!is_string($date)) return false;
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    private function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public function index($memberId) {
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();
        
        // Ownership check
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL");
        $stmt->execute([$memberId, $trainerId]);
        if (!$stmt->fetch()) {
            Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
        }

        $pageRaw = $_GET['page'] ?? '1';
        $perPageRaw = $_GET['per_page'] ?? '20';

        if (!is_string($pageRaw) || !preg_match('/^[1-9]\d*$/', $pageRaw)) {
            Response::error('Geçersiz sayfa numarası', 'VALIDATION_ERROR', 422);
        }
        if (!is_string($perPageRaw) || !preg_match('/^[1-9]\d*$/', $perPageRaw)) {
            Response::error('Geçersiz per_page değeri', 'VALIDATION_ERROR', 422);
        }

        $page = (int)$pageRaw;
        $perPage = (int)$perPageRaw;

        if ((string)$page !== $pageRaw || (string)$perPage !== $perPageRaw) {
            Response::error('Pagination parameter out of range', 'VALIDATION_ERROR', 422);
        }

        if ($perPage > 100) {
            Response::error('per_page cannot exceed 100', 'VALIDATION_ERROR', 422);
        }

        if (($page - 1) > intdiv(PHP_INT_MAX, $perPage)) {
            Response::error('Pagination offset overflow', 'VALIDATION_ERROR', 422);
        }

        $status = isset($_GET['status']) ? $_GET['status'] : null;
        if ($status !== null) {
            if (is_array($status) || !is_string($status) || !in_array($status, ['draft', 'active', 'archived'])) {
                Response::error('Geçersiz durum', 'VALIDATION_ERROR', 422);
            }
        }

        $conditions = [
            'tp.member_id = ?', 
            'tp.trainer_id = ?', 
            'm.trainer_id = ?',
            'm.deleted_at IS NULL',
            'tp.deleted_at IS NULL'
        ];
        $params = [$memberId, $trainerId, $trainerId];

        if ($status) {
            $conditions[] = 'tp.status = ?';
            $params[] = $status;
        }

        $where = implode(' AND ', $conditions);
        
        $countSql = "
            SELECT COUNT(*) 
            FROM training_programs tp
            JOIN members m ON tp.member_id = m.id
            WHERE $where
        ";
        $countStmt = $this->db->prepare($countSql);
        
        $paramIndex = 1;
        foreach ($params as $param) {
            if (is_int($param)) {
                $countStmt->bindValue($paramIndex++, $param, PDO::PARAM_INT);
            } else {
                $countStmt->bindValue($paramIndex++, $param, PDO::PARAM_STR);
            }
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        $lastPage = ceil($total / $perPage);
        if ($lastPage < 1) $lastPage = 1;

        $offset = ($page - 1) * $perPage;

        $sql = "
            SELECT 
                tp.id, tp.uuid, tp.title, tp.status, tp.start_date, tp.end_date, 
                tp.created_at, tp.updated_at
            FROM training_programs tp
            JOIN members m ON tp.member_id = m.id
            WHERE $where
            ORDER BY tp.id DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $this->db->prepare($sql);
        
        $paramIndex = 1;
        foreach ($params as $param) {
            if (is_int($param)) {
                $stmt->bindValue($paramIndex++, $param, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($paramIndex++, $param, PDO::PARAM_STR);
            }
        }
        $stmt->bindValue($paramIndex++, $perPage, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $normalizedItems = array_map(function($item) {
            $item['id'] = (int)$item['id'];
            return $item;
        }, $items);

        Response::json([
            'items' => $normalizedItems,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => (int)$lastPage
            ]
        ]);
    }

    public function show($id) {
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();
        
        $sql = "
            SELECT 
                tp.id, tp.uuid, tp.title, tp.status, tp.start_date, tp.end_date, tp.notes,
                tp.created_at, tp.updated_at,
                m.id as member_id, m.uuid as member_uuid, m.first_name as member_first_name, m.last_name as member_last_name,
                t.id as trainer_id, t.display_name as trainer_name
            FROM training_programs tp
            JOIN members m ON tp.member_id = m.id
            JOIN trainers t ON tp.trainer_id = t.id
            WHERE tp.id = ? 
              AND tp.trainer_id = ? 
              AND tp.deleted_at IS NULL
              AND m.trainer_id = ?
              AND m.deleted_at IS NULL
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $trainerId, $trainerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Program bulunamadı.', 'NOT_FOUND', 404);
        }

        Response::json([
            'id' => (int)$row['id'],
            'uuid' => $row['uuid'],
            'title' => $row['title'],
            'status' => $row['status'],
            'start_date' => $row['start_date'],
            'end_date' => $row['end_date'],
            'notes' => $row['notes'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'member' => [
                'id' => (int)$row['member_id'],
                'uuid' => $row['member_uuid'],
                'first_name' => $row['member_first_name'],
                'last_name' => $row['member_last_name']
            ],
            'trainer' => [
                'id' => (int)$row['trainer_id'],
                'name' => $row['trainer_name']
            ]
        ]);
    }

    public function create($memberId) {
        AuthMiddleware::hasRole(['trainer']);
        
        $val = $this->getJsonPayload();

        if (!array_key_exists('title', $val) || !is_string($val['title'])) {
            Response::error("title zorunludur ve metin olmalıdır.", 'VALIDATION_ERROR', 422);
        }
        $val['title'] = trim($val['title']);
        $titleLen = mb_strlen($val['title'], 'UTF-8');
        if ($titleLen < 1 || $titleLen > 160) {
            Response::error("title 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        $status = array_key_exists('status', $val) ? $val['status'] : 'draft';
        if (!is_string($status) || !in_array($status, ['draft', 'active', 'archived'], true)) {
            Response::error("status geçersiz.", 'VALIDATION_ERROR', 422);
        }

        $start_date = array_key_exists('start_date', $val) ? $val['start_date'] : null;
        if (!$this->validateDate($start_date)) {
            Response::error("start_date geçersiz.", 'VALIDATION_ERROR', 422);
        }

        $end_date = array_key_exists('end_date', $val) ? $val['end_date'] : null;
        if (!$this->validateDate($end_date)) {
            Response::error("end_date geçersiz.", 'VALIDATION_ERROR', 422);
        }

        if ($start_date !== null && $end_date !== null && $end_date < $start_date) {
            Response::error("end_date, start_date'den önce olamaz.", 'VALIDATION_ERROR', 422);
        }

        $notes = array_key_exists('notes', $val) ? $val['notes'] : null;
        if ($notes !== null) {
            if (!is_string($notes)) {
                Response::error("notes metin olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            if (mb_strlen($notes, 'UTF-8') > 3000) {
                Response::error("notes en fazla 3000 karakter olabilir.", 'VALIDATION_ERROR', 422);
            }
        }

        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$memberId, $trainerId]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$member) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Üye bulunamadı.", 'NOT_FOUND', 404);
            }

            $uuid = $this->generateUuid();
            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            $stmt = $this->db->prepare("
                INSERT INTO training_programs (
                    uuid, member_id, trainer_id, title, status, start_date, end_date, notes, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $uuid, $memberId, $trainerId, $val['title'], $status,
                $start_date, $end_date, $notes, $currentAdminId, $currentAdminId
            ]);
            
            $program_id = (int)$this->db->lastInsertId();
            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_training_program.create',
                    $currentAdminId,
                    'training_program',
                    $program_id,
                    [
                        'program_id' => $program_id,
                        'member_id' => $memberId,
                        'trainer_id' => $trainerId,
                        'new_status' => $status
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['id' => $program_id, 'uuid' => $uuid], 201);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerTrainingProgramController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['trainer']);
        
        $val = $this->getJsonPayload();
        
        if (empty($val)) {
            Response::error("En az bir alan gönderilmelidir.", 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("
                SELECT tp.* 
                FROM training_programs tp
                JOIN members m ON tp.member_id = m.id
                WHERE tp.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ?
                  AND m.deleted_at IS NULL 
                FOR UPDATE
            ");
            $stmt->execute([$id, $trainerId, $trainerId]);
            $program = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$program) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            $finalTitle = $program['title'];
            $finalStatus = $program['status'];
            $finalStartDate = $program['start_date'];
            $finalEndDate = $program['end_date'];
            $finalNotes = $program['notes'];
            $changed = false;
            $changedFields = [];

            if (array_key_exists('title', $val)) {
                $t = $val['title'];
                if (!is_string($t)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("title metin olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $t = trim($t);
                $len = mb_strlen($t, 'UTF-8');
                if ($len < 1 || $len > 160) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("title 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                if ($finalTitle !== $t) {
                    $finalTitle = $t;
                    $changed = true;
                    $changedFields[] = 'title';
                }
            }

            if (array_key_exists('status', $val)) {
                $s = $val['status'];
                if (!is_string($s) || !in_array($s, ['draft', 'active', 'archived'], true)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("status geçersiz.", 'VALIDATION_ERROR', 422);
                }
                if ($finalStatus !== $s) {
                    $finalStatus = $s;
                    $changed = true;
                    $changedFields[] = 'status';
                }
            }

            if (array_key_exists('start_date', $val)) {
                $sd = $val['start_date'];
                if (!$this->validateDate($sd)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("start_date geçersiz.", 'VALIDATION_ERROR', 422);
                }
                if ($finalStartDate !== $sd) {
                    $finalStartDate = $sd;
                    $changed = true;
                    $changedFields[] = 'start_date';
                }
            }

            if (array_key_exists('end_date', $val)) {
                $ed = $val['end_date'];
                if (!$this->validateDate($ed)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("end_date geçersiz.", 'VALIDATION_ERROR', 422);
                }
                if ($finalEndDate !== $ed) {
                    $finalEndDate = $ed;
                    $changed = true;
                    $changedFields[] = 'end_date';
                }
            }

            if ($finalStartDate !== null && $finalEndDate !== null && $finalEndDate < $finalStartDate) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("end_date, start_date'den önce olamaz.", 'VALIDATION_ERROR', 422);
            }

            if (array_key_exists('notes', $val)) {
                $n = $val['notes'];
                if ($n !== null) {
                    if (!is_string($n)) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("notes metin olmalıdır.", 'VALIDATION_ERROR', 422);
                    }
                    if (mb_strlen($n, 'UTF-8') > 3000) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("notes en fazla 3000 karakter olabilir.", 'VALIDATION_ERROR', 422);
                    }
                }
                if ($finalNotes !== $n) {
                    $finalNotes = $n;
                    $changed = true;
                    $changedFields[] = 'notes';
                }
            }

            if (!$changed) {
                $this->db->commit();
                Response::json(['success' => true]);
            }

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            $stmt = $this->db->prepare("
                UPDATE training_programs 
                SET title = ?, status = ?, start_date = ?, end_date = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL
            ");
            $stmt->execute([
                $finalTitle, $finalStatus, $finalStartDate, $finalEndDate, $finalNotes, $currentAdminId, $id, $trainerId
            ]);

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_training_program.update',
                    $currentAdminId,
                    'training_program',
                    $id,
                    [
                        'program_id' => $id,
                        'member_id' => $program['member_id'],
                        'trainer_id' => $trainerId,
                        'changed_fields' => $changedFields
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerTrainingProgramController@update Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function delete($id) {
        AuthMiddleware::hasRole(['trainer']);
        
        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("
                SELECT tp.* 
                FROM training_programs tp
                JOIN members m ON tp.member_id = m.id
                WHERE tp.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ?
                  AND m.deleted_at IS NULL 
                FOR UPDATE
            ");
            $stmt->execute([$id, $trainerId, $trainerId]);
            $program = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$program) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            $stmt = $this->db->prepare("
                UPDATE training_programs 
                SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? 
                WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL
            ");
            $stmt->execute([$currentAdminId, $id, $trainerId]);

            if ($stmt->rowCount() !== 1) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Silme işlemi başarısız.", 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_training_program.delete',
                    $currentAdminId,
                    'training_program',
                    $id,
                    [
                        'program_id' => $id,
                        'member_id' => $program['member_id'],
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerTrainingProgramController@delete Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
