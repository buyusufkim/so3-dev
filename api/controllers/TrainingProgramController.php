<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuthMiddleware;
use Core\AuditLogger;

class TrainingProgramController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

    private function getJsonInput(): array {
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $raw = file_get_contents('php://input');
        if (empty(trim($raw))) {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }

        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'BAD_REQUEST', 400);
        }
        
        if (!is_array($data)) {
            Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);
        }

        return $data;
    }

    private function validateDate($date): bool {
        if ($date === null) return true;
        if (!is_string($date)) return false;
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    public function create($member_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $member_id = (int)$member_id;
        
        $val = $this->getJsonInput();

        $allowedFields = ['title', 'status', 'start_date', 'end_date', 'notes'];
        foreach (array_keys($val) as $key) {
            if (!in_array($key, $allowedFields)) {
                Response::error("Bilinmeyen alan: $key", 'VALIDATION_ERROR', 422);
            }
        }

        if (!isset($val['title']) || !is_string($val['title'])) {
            Response::error("title zorunludur ve metin olmalıdır.", 'VALIDATION_ERROR', 422);
        }
        $val['title'] = trim($val['title']);
        $titleLen = mb_strlen($val['title'], 'UTF-8');
        if ($titleLen < 1 || $titleLen > 160) {
            Response::error("title 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        $status = isset($val['status']) ? $val['status'] : 'draft';
        if (!in_array($status, ['draft', 'active', 'archived'])) {
            Response::error("status geçersiz.", 'VALIDATION_ERROR', 422);
        }

        $start_date = isset($val['start_date']) ? $val['start_date'] : null;
        if (!$this->validateDate($start_date)) {
            Response::error("start_date geçersiz.", 'VALIDATION_ERROR', 422);
        }

        $end_date = isset($val['end_date']) ? $val['end_date'] : null;
        if (!$this->validateDate($end_date)) {
            Response::error("end_date geçersiz.", 'VALIDATION_ERROR', 422);
        }

        if ($start_date !== null && $end_date !== null && $end_date < $start_date) {
            Response::error("end_date, start_date'den önce olamaz.", 'VALIDATION_ERROR', 422);
        }

        $notes = isset($val['notes']) ? $val['notes'] : null;
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

            $stmt = $this->db->prepare("SELECT trainer_id, deleted_at FROM members WHERE id = ? FOR UPDATE");
            $stmt->execute([$member_id]);
            $member = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                Response::error("Üye bulunamadı.", 'NOT_FOUND', 404);
            }

            if ($member['trainer_id'] === null) {
                Response::error("Üyeye atanmış bir eğitmen yok.", 'MEMBER_TRAINER_NOT_ASSIGNED', 409);
            }

            $trainer_id = (int)$member['trainer_id'];

            $stmt = $this->db->prepare("SELECT is_active, deleted_at FROM trainers WHERE id = ? FOR UPDATE");
            $stmt->execute([$trainer_id]);
            $trainer = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null || (int)$trainer['is_active'] !== 1) {
                Response::error("Bağlı eğitmen pasif veya silinmiş.", 'MEMBER_TRAINER_INVALID', 409);
            }

            $uuid = $this->generateUuid();
            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            $stmt = $this->db->prepare("
                INSERT INTO training_programs (
                    uuid, member_id, trainer_id, title, status, start_date, end_date, notes, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $uuid, $member_id, $trainer_id, $val['title'], $status,
                $start_date, $end_date, $notes, $currentAdminId, $currentAdminId
            ]);
            
            $program_id = (int)$this->db->lastInsertId();

            $this->db->commit();

            try {
                AuditLogger::log(
                    'training_program.create',
                    $currentAdminId,
                    'training_program',
                    $program_id,
                    [
                        'program_id' => $program_id,
                        'member_id' => $member_id,
                        'trainer_id' => $trainer_id,
                        'new_status' => $status
                    ]
                );
            } catch (\Exception $e) {}

            Response::json(['id' => $program_id, 'uuid' => $uuid], 201);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainingProgramController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $id = (int)$id;
        $val = $this->getJsonInput();

        if (empty($val)) {
            Response::error("En az bir alan gönderilmelidir.", 'VALIDATION_ERROR', 422);
        }

        $allowedFields = ['title', 'status', 'start_date', 'end_date', 'notes'];
        foreach (array_keys($val) as $key) {
            if (!in_array($key, $allowedFields)) {
                Response::error("Bilinmeyen alan: $key", 'VALIDATION_ERROR', 422);
            }
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT * FROM training_programs WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $program = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$program) {
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            if ($program['deleted_at'] !== null) {
                Response::error("Silinmiş program güncellenemez.", 'VALIDATION_ERROR', 422);
            }

            if (isset($val['title'])) {
                if (!is_string($val['title'])) {
                    Response::error("title metin olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $val['title'] = trim($val['title']);
                $titleLen = mb_strlen($val['title'], 'UTF-8');
                if ($titleLen < 1 || $titleLen > 160) {
                    Response::error("title 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
            }

            if (isset($val['status'])) {
                if (!in_array($val['status'], ['draft', 'active', 'archived'])) {
                    Response::error("status geçersiz.", 'VALIDATION_ERROR', 422);
                }
            }

            $current_start = $program['start_date'];
            $current_end = $program['end_date'];
            
            $new_start = array_key_exists('start_date', $val) ? $val['start_date'] : $current_start;
            $new_end = array_key_exists('end_date', $val) ? $val['end_date'] : $current_end;

            if (array_key_exists('start_date', $val) && !$this->validateDate($new_start)) {
                Response::error("start_date geçersiz.", 'VALIDATION_ERROR', 422);
            }
            if (array_key_exists('end_date', $val) && !$this->validateDate($new_end)) {
                Response::error("end_date geçersiz.", 'VALIDATION_ERROR', 422);
            }

            if ($new_start !== null && $new_end !== null && $new_end < $new_start) {
                Response::error("end_date, start_date'den önce olamaz.", 'VALIDATION_ERROR', 422);
            }

            if (array_key_exists('notes', $val)) {
                $notes = $val['notes'];
                if ($notes !== null) {
                    if (!is_string($notes)) {
                        Response::error("notes metin olmalıdır.", 'VALIDATION_ERROR', 422);
                    }
                    if (mb_strlen($notes, 'UTF-8') > 3000) {
                        Response::error("notes en fazla 3000 karakter olabilir.", 'VALIDATION_ERROR', 422);
                    }
                }
            }

            $updateFields = [];
            $params = [];
            $changedFields = [];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $val)) {
                    if ($program[$field] !== $val[$field]) {
                        $updateFields[] = "$field = ?";
                        $params[] = $val[$field];
                        $changedFields[] = $field;
                    }
                }
            }

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            if (!empty($updateFields)) {
                $updateFields[] = "updated_by = ?";
                $params[] = $currentAdminId;
                
                $params[] = $id;

                $sql = "UPDATE training_programs SET " . implode(", ", $updateFields) . " WHERE id = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
            }

            $this->db->commit();

            if (!empty($changedFields)) {
                try {
                    AuditLogger::log(
                        'training_program.update',
                        $currentAdminId,
                        'training_program',
                        $id,
                        [
                            'program_id' => $id,
                            'member_id' => (int)$program['member_id'],
                            'trainer_id' => (int)$program['trainer_id'],
                            'changed_fields' => $changedFields,
                            'new_status' => isset($val['status']) ? $val['status'] : $program['status']
                        ]
                    );
                } catch (\Exception $e) {}
            }

            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainingProgramController@update Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function delete($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $id = (int)$id;

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT member_id, trainer_id, deleted_at FROM training_programs WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $program = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$program || $program['deleted_at'] !== null) {
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            $stmt = $this->db->prepare("UPDATE training_programs SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?");
            $stmt->execute([$currentAdminId, $id]);

            $this->db->commit();

            try {
                AuditLogger::log(
                    'training_program.delete',
                    $currentAdminId,
                    'training_program',
                    $id,
                    [
                        'program_id' => $id,
                        'member_id' => (int)$program['member_id'],
                        'trainer_id' => (int)$program['trainer_id']
                    ]
                );
            } catch (\Exception $e) {}

            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainingProgramController@delete Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function restore($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $id = (int)$id;

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT member_id, trainer_id, deleted_at FROM training_programs WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $program = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$program) {
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            if ($program['deleted_at'] === null) {
                Response::error("Program silinmemiş.", 'PROGRAM_NOT_ARCHIVED', 409);
            }

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;

            $stmt = $this->db->prepare("UPDATE training_programs SET deleted_at = NULL, updated_by = ? WHERE id = ?");
            $stmt->execute([$currentAdminId, $id]);

            $this->db->commit();

            try {
                AuditLogger::log(
                    'training_program.restore',
                    $currentAdminId,
                    'training_program',
                    $id,
                    [
                        'program_id' => $id,
                        'member_id' => (int)$program['member_id'],
                        'trainer_id' => (int)$program['trainer_id']
                    ]
                );
            } catch (\Exception $e) {}

            Response::json(['success' => true]);

        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainingProgramController@restore Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function index($member_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $member_id = (int)$member_id;

        $page = isset($_GET['page']) ? $_GET['page'] : 1;
        if (!is_scalar($page) || !is_numeric($page) || (int)$page <= 0 || (string)(int)$page !== (string)$page) {
            Response::error('Geçersiz sayfa numarası.', 'VALIDATION_ERROR', 422);
        }
        $page = (int)$page;

        $per_page = isset($_GET['per_page']) ? $_GET['per_page'] : 20;
        if (!is_scalar($per_page) || !is_numeric($per_page) || (int)$per_page <= 0 || (string)(int)$per_page !== (string)$per_page) {
            Response::error('Geçersiz sayfa boyutu.', 'VALIDATION_ERROR', 422);
        }
        $per_page = (int)$per_page;
        if ($per_page > 100) $per_page = 100;

        $status = isset($_GET['status']) ? $_GET['status'] : null;
        if ($status !== null) {
            if (!in_array($status, ['draft', 'active', 'archived'])) {
                Response::error('Geçersiz status filtresi.', 'VALIDATION_ERROR', 422);
            }
        }

        $deleted = isset($_GET['deleted']) ? $_GET['deleted'] : 'active';
        if (!in_array($deleted, ['active', 'deleted', 'all'])) {
            Response::error('Geçersiz deleted filtresi.', 'VALIDATION_ERROR', 422);
        }

        try {
            $where = ["p.member_id = ?"];
            $params = [$member_id];

            if ($status !== null) {
                $where[] = "p.status = ?";
                $params[] = $status;
            }

            if ($deleted === 'active') {
                $where[] = "p.deleted_at IS NULL";
            } elseif ($deleted === 'deleted') {
                $where[] = "p.deleted_at IS NOT NULL";
            }

            $whereClause = implode(" AND ", $where);

            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM training_programs p WHERE $whereClause");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $last_page = $total > 0 ? ceil($total / $per_page) : 1;
            $offset = ($page - 1) * $per_page;

            $sql = "
                SELECT 
                    p.id, p.uuid, p.title, p.status, p.start_date, p.end_date, 
                    p.created_at, p.updated_at, p.deleted_at,
                    t.id as trainer_id, t.name as trainer_name
                FROM training_programs p
                LEFT JOIN trainers t ON p.trainer_id = t.id
                WHERE $whereClause
                ORDER BY p.id DESC
                LIMIT ? OFFSET ?
            ";

            $stmt = $this->db->prepare($sql);
            
            $i = 1;
            foreach ($params as $param) {
                $stmt->bindValue($i++, $param);
            }
            $stmt->bindValue($i++, $per_page, \PDO::PARAM_INT);
            $stmt->bindValue($i++, $offset, \PDO::PARAM_INT);
            $stmt->execute();
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $items = [];
            foreach ($results as $r) {
                $items[] = [
                    'id' => (int)$r['id'],
                    'uuid' => $r['uuid'],
                    'title' => $r['title'],
                    'status' => $r['status'],
                    'start_date' => $r['start_date'],
                    'end_date' => $r['end_date'],
                    'created_at' => $r['created_at'],
                    'updated_at' => $r['updated_at'],
                    'deleted_at' => $r['deleted_at'],
                    'trainer' => [
                        'id' => (int)$r['trainer_id'],
                        'name' => $r['trainer_name']
                    ]
                ];
            }

            Response::json([
                'items' => $items,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'per_page' => $per_page,
                    'last_page' => (int)$last_page
                ]
            ]);

        } catch (\Throwable $e) {
            error_log('TrainingProgramController@index Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function show($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $id = (int)$id;

        try {
            $sql = "
                SELECT 
                    p.id, p.uuid, p.title, p.status, p.start_date, p.end_date, p.notes,
                    p.created_at, p.updated_at,
                    m.id as member_id, m.uuid as member_uuid, m.first_name as member_first, m.last_name as member_last,
                    t.id as trainer_id, t.name as trainer_name
                FROM training_programs p
                JOIN members m ON p.member_id = m.id
                JOIN trainers t ON p.trainer_id = t.id
                WHERE p.id = ? AND p.deleted_at IS NULL
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $program = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$program) {
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            Response::json([
                'id' => (int)$program['id'],
                'uuid' => $program['uuid'],
                'title' => $program['title'],
                'status' => $program['status'],
                'start_date' => $program['start_date'],
                'end_date' => $program['end_date'],
                'notes' => $program['notes'],
                'created_at' => $program['created_at'],
                'updated_at' => $program['updated_at'],
                'member' => [
                    'id' => (int)$program['member_id'],
                    'uuid' => $program['member_uuid'],
                    'first_name' => $program['member_first'],
                    'last_name' => $program['member_last']
                ],
                'trainer' => [
                    'id' => (int)$program['trainer_id'],
                    'name' => $program['trainer_name']
                ]
            ]);

        } catch (\Throwable $e) {
            error_log('TrainingProgramController@show Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
