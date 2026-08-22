<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;
use Exception;
use Throwable;

class MemberController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getAdminId(): int {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
            Response::error('Oturum bilgisi eksik.', 'UNAUTHORIZED', 401);
        }
        return (int)$adminId;
    }

    private function logAudit(string $action, ?int $entityId, ?int $adminId, array $metadata = []): void {
        AuditLogger::log($action, $adminId, 'member', $entityId, $metadata);
    }

    private function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        if (empty(trim($raw))) {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }
        $dataObj = json_decode($raw);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }
        if (!is_object($dataObj)) {
            Response::error('JSON nesnesi (object) bekleniyor.', 'BAD_REQUEST', 400);
        }
        return json_decode($raw, true);
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $q = isset($_GET['q']) ? $_GET['q'] : null;
        if ($q !== null) {
            if (!is_scalar($q)) {
                Response::error('Geçersiz q parametresi.', 'VALIDATION_ERROR', 422);
            }
            $q = trim((string)$q);
        }

        $status = isset($_GET['status']) ? $_GET['status'] : null;
        if ($status !== null) {
            if (!is_string($status) || !in_array($status, ['active', 'inactive'])) {
                Response::error('status yalnızca active veya inactive olabilir.', 'VALIDATION_ERROR', 422);
            }
        }

        $trainerId = isset($_GET['trainer_id']) ? $_GET['trainer_id'] : null;
        if ($trainerId !== null && $trainerId !== '') {
            if (!is_scalar($trainerId) || !is_numeric($trainerId) || (int)$trainerId <= 0 || (string)(int)$trainerId !== (string)$trainerId) {
                Response::error('Geçersiz trainer_id.', 'VALIDATION_ERROR', 422);
            }
            $trainerId = (int)$trainerId;
        }

        $page = 1;
        if (isset($_GET['page'])) {
            $p = $_GET['page'];
            if (!is_scalar($p) || is_bool($p)) {
                Response::error('Geçersiz page parametresi.', 'VALIDATION_ERROR', 422);
            }
            $pStr = (string)$p;
            $pFiltered = filter_var($pStr, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1]
            ]);
            if ($pFiltered === false || (string)$pFiltered !== $pStr) {
                Response::error('Geçersiz page parametresi.', 'VALIDATION_ERROR', 422);
            }
            $page = $pFiltered;
        }

        $perPage = 20;
        if (isset($_GET['per_page'])) {
            $pp = $_GET['per_page'];
            if (!is_scalar($pp) || is_bool($pp)) {
                Response::error('Geçersiz per_page parametresi.', 'VALIDATION_ERROR', 422);
            }
            $ppStr = (string)$pp;
            $ppFiltered = filter_var($ppStr, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1, 'max_range' => 100]
            ]);
            if ($ppFiltered === false || (string)$ppFiltered !== $ppStr) {
                Response::error('Geçersiz per_page parametresi.', 'VALIDATION_ERROR', 422);
            }
            $perPage = $ppFiltered;
        }
        
        $offset = ($page - 1) * $perPage;
        
        $where = ["m.deleted_at IS NULL"];
        $params = [];

        if ($q !== null && $q !== '') {
            $where[] = "(m.first_name LIKE ? OR m.last_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)";
            $likeQ = '%' . $q . '%';
            $params[] = $likeQ;
            $params[] = $likeQ;
            $params[] = $likeQ;
            $params[] = $likeQ;
        }

        if ($status !== null && $status !== '') {
            $where[] = "m.status = ?";
            $params[] = $status;
        }

        if ($trainerId !== null && $trainerId !== '') {
            $where[] = "m.trainer_id = ?";
            $params[] = $trainerId;
        }

        $whereClause = implode(" AND ", $where);

        $countSql = "SELECT COUNT(*) FROM members m WHERE {$whereClause}";
        $stmtCount = $this->db->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $sql = "SELECT 
                    m.id, m.uuid, m.first_name, m.last_name, m.phone, m.email, 
                    m.status, m.membership_start_date, m.membership_end_date, 
                    m.created_at, m.updated_at,
                    t.id as trainer_id, t.name as trainer_name
                FROM members m
                LEFT JOIN trainers t ON m.trainer_id = t.id
                WHERE {$whereClause}
                ORDER BY m.id DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $this->db->prepare($sql);
        
        $bindIdx = 1;
        foreach ($params as $p) {
            $stmt->bindValue($bindIdx++, $p, is_int($p) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue($bindIdx++, $perPage, PDO::PARAM_INT);
        $stmt->bindValue($bindIdx++, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $members = [];
        foreach ($rows as $r) {
            $members[] = [
                'id' => (int)$r['id'],
                'uuid' => $r['uuid'],
                'first_name' => $r['first_name'],
                'last_name' => $r['last_name'],
                'phone' => $r['phone'],
                'email' => $r['email'],
                'status' => $r['status'],
                'membership_start_date' => $r['membership_start_date'],
                'membership_end_date' => $r['membership_end_date'],
                'created_at' => $r['created_at'],
                'updated_at' => $r['updated_at'],
                'trainer' => $r['trainer_id'] ? [
                    'id' => (int)$r['trainer_id'],
                    'name' => $r['trainer_name']
                ] : null
            ];
        }

        $lastPage = (int)ceil($total / $perPage);
        if ($lastPage < 1) $lastPage = 1;

        Response::json([
            'items' => $members,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage
            ]
        ]);
    }

    public function show($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $sql = "SELECT 
                    m.id, m.uuid, m.first_name, m.last_name, m.phone, m.email, 
                    m.status, m.membership_start_date, m.membership_end_date, 
                    m.emergency_contact_name, m.emergency_contact_phone, m.notes,
                    m.consent_given_at,
                    m.created_at, m.updated_at,
                    t.id as trainer_id, t.name as trainer_name
                FROM members m
                LEFT JOIN trainers t ON m.trainer_id = t.id
                WHERE m.id = ? AND m.deleted_at IS NULL";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$r) {
            Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
        }

        $member = [
            'id' => (int)$r['id'],
            'uuid' => $r['uuid'],
            'first_name' => $r['first_name'],
            'last_name' => $r['last_name'],
            'phone' => $r['phone'],
            'email' => $r['email'],
            'status' => $r['status'],
            'membership_start_date' => $r['membership_start_date'],
            'membership_end_date' => $r['membership_end_date'],
            'emergency_contact_name' => $r['emergency_contact_name'],
            'emergency_contact_phone' => $r['emergency_contact_phone'],
            'notes' => $r['notes'],
            'consent_given_at' => $r['consent_given_at'],
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at'],
            'trainer' => $r['trainer_id'] ? [
                'id' => (int)$r['trainer_id'],
                'name' => $r['trainer_name']
            ] : null
        ];

        Response::json($member);
    }

    private function validateDate(?string $date): bool {
        if ($date === null) return true;
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
    
    private function validateDateTime(?string $date): bool {
        if ($date === null) return true;
        $d = \DateTime::createFromFormat('Y-m-d H:i:s', $date);
        return $d && $d->format('Y-m-d H:i:s') === $date;
    }

    private function validateMemberData(array $data, bool $isUpdate): array {
        $allowedFields = [
            'first_name', 'last_name', 'phone', 'email', 'status', 'trainer_id',
            'membership_start_date', 'membership_end_date', 'emergency_contact_name', 
            'emergency_contact_phone', 'notes', 'consent_given_at'
        ];
        
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowedFields)) {
                Response::error("Geçersiz alan: {$key}", 'VALIDATION_ERROR', 422);
            }
        }

        if (!$isUpdate) {
            $required = ['first_name', 'last_name', 'phone', 'status'];
            foreach ($required as $req) {
                if (!array_key_exists($req, $data) || $data[$req] === null) {
                    Response::error("{$req} alanı zorunludur.", 'VALIDATION_ERROR', 422);
                }
                if (!is_string($data[$req])) {
                    Response::error("{$req} alanı metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                if (trim($data[$req]) === '') {
                    Response::error("{$req} alanı boş olamaz.", 'VALIDATION_ERROR', 422);
                }
            }
        } else {
            if (empty($data)) {
                Response::error('Güncellenecek alan bulunamadı.', 'VALIDATION_ERROR', 422);
            }
        }

        $val = [];

        if (array_key_exists('first_name', $data)) {
            if (!is_string($data['first_name'])) {
                Response::error("first_name metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $firstName = trim($data['first_name']);
            if (mb_strlen($firstName) < 1 || mb_strlen($firstName) > 80) {
                Response::error("first_name 1-80 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['first_name'] = $firstName;
        }

        if (array_key_exists('last_name', $data)) {
            if (!is_string($data['last_name'])) {
                Response::error("last_name metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $lastName = trim($data['last_name']);
            if (mb_strlen($lastName) < 1 || mb_strlen($lastName) > 80) {
                Response::error("last_name 1-80 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['last_name'] = $lastName;
        }

        if (array_key_exists('phone', $data)) {
            if (!is_string($data['phone'])) {
                Response::error("phone metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $phone = trim($data['phone']);
            if (mb_strlen($phone) < 1 || mb_strlen($phone) > 20) {
                Response::error("phone 1-20 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['phone'] = $phone;
        }

        if (array_key_exists('email', $data)) {
            if ($data['email'] !== null) {
                if (!is_string($data['email'])) {
                    Response::error("email metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $email = trim($data['email']);
                if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    Response::error("Geçerli bir e-posta adresi giriniz.", 'VALIDATION_ERROR', 422);
                }
                if (mb_strlen($email) > 120) {
                    Response::error("email en fazla 120 karakter olabilir.", 'VALIDATION_ERROR', 422);
                }
                $val['email'] = $email === '' ? null : $email;
            } else {
                $val['email'] = null;
            }
        }

        if (array_key_exists('status', $data)) {
            if ($data['status'] !== 'active' && $data['status'] !== 'inactive') {
                Response::error("status 'active' veya 'inactive' olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['status'] = $data['status'];
        }

        if (array_key_exists('trainer_id', $data)) {
            if ($data['trainer_id'] !== null) {
                if (!is_int($data['trainer_id']) || $data['trainer_id'] <= 0) {
                    Response::error("Geçersiz eğitmen ID.", 'VALIDATION_ERROR', 422);
                }
                $trainerId = (int)$data['trainer_id'];
                $stmt = $this->db->prepare("SELECT id FROM trainers WHERE id = ? AND deleted_at IS NULL");
                $stmt->execute([$trainerId]);
                if (!$stmt->fetch()) {
                    Response::error("Belirtilen eğitmen bulunamadı veya silinmiş.", 'VALIDATION_ERROR', 422);
                }
                $val['trainer_id'] = $trainerId;
            } else {
                $val['trainer_id'] = null;
            }
        }

        if (array_key_exists('membership_start_date', $data)) {
            if ($data['membership_start_date'] !== null && !is_string($data['membership_start_date'])) {
                Response::error("Tarih metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $sdate = $data['membership_start_date'] !== null ? trim($data['membership_start_date']) : null;
            if ($sdate !== null && !$this->validateDate($sdate)) {
                Response::error("Geçersiz başlangıç tarihi (YYYY-MM-DD bekleniyor).", 'VALIDATION_ERROR', 422);
            }
            $val['membership_start_date'] = $sdate;
        }

        if (array_key_exists('membership_end_date', $data)) {
            if ($data['membership_end_date'] !== null && !is_string($data['membership_end_date'])) {
                Response::error("Tarih metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $edate = $data['membership_end_date'] !== null ? trim($data['membership_end_date']) : null;
            if ($edate !== null && !$this->validateDate($edate)) {
                Response::error("Geçersiz bitiş tarihi (YYYY-MM-DD bekleniyor).", 'VALIDATION_ERROR', 422);
            }
            $val['membership_end_date'] = $edate;
        }
        
        if (array_key_exists('membership_start_date', $val) && array_key_exists('membership_end_date', $val)) {
            if ($val['membership_start_date'] && $val['membership_end_date']) {
                if (strtotime($val['membership_end_date']) < strtotime($val['membership_start_date'])) {
                    Response::error("Bitiş tarihi başlangıç tarihinden önce olamaz.", 'VALIDATION_ERROR', 422);
                }
            }
        }

        if (array_key_exists('emergency_contact_name', $data)) {
            if ($data['emergency_contact_name'] !== null) {
                if (!is_string($data['emergency_contact_name'])) {
                    Response::error("Metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $ecn = trim($data['emergency_contact_name']);
                if (mb_strlen($ecn) > 120) {
                    Response::error("En fazla 120 karakter olabilir.", 'VALIDATION_ERROR', 422);
                }
                $val['emergency_contact_name'] = $ecn === '' ? null : $ecn;
            } else {
                $val['emergency_contact_name'] = null;
            }
        }

        if (array_key_exists('emergency_contact_phone', $data)) {
            if ($data['emergency_contact_phone'] !== null) {
                if (!is_string($data['emergency_contact_phone'])) {
                    Response::error("Metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $ecp = trim($data['emergency_contact_phone']);
                if (mb_strlen($ecp) > 20) {
                    Response::error("En fazla 20 karakter olabilir.", 'VALIDATION_ERROR', 422);
                }
                $val['emergency_contact_phone'] = $ecp === '' ? null : $ecp;
            } else {
                $val['emergency_contact_phone'] = null;
            }
        }

        if (array_key_exists('notes', $data)) {
            if ($data['notes'] !== null) {
                if (!is_string($data['notes'])) {
                    Response::error("Metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $notes = trim($data['notes']);
                if (mb_strlen($notes) > 3000) {
                    Response::error("En fazla 3000 karakter olabilir.", 'VALIDATION_ERROR', 422);
                }
                $val['notes'] = $notes === '' ? null : $notes;
            } else {
                $val['notes'] = null;
            }
        }
        
        if (array_key_exists('consent_given_at', $data)) {
            if ($data['consent_given_at'] !== null && !is_string($data['consent_given_at'])) {
                Response::error("consent_given_at metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $cdate = $data['consent_given_at'] !== null ? trim($data['consent_given_at']) : null;
            if ($cdate !== null && !$this->validateDateTime($cdate)) {
                Response::error("Geçersiz consent_given_at (YYYY-MM-DD HH:MM:SS bekleniyor).", 'VALIDATION_ERROR', 422);
            }
            $val['consent_given_at'] = $cdate;
        }

        return $val;
    }

    public function create() {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();
        
        $data = $this->getJsonInput();
        $val = $this->validateMemberData($data, false);
        $uuid = $this->generateUuid();

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("
                INSERT INTO members (
                    uuid, first_name, last_name, phone, email, 
                    status, trainer_id, membership_start_date, membership_end_date,
                    emergency_contact_name, emergency_contact_phone, notes,
                    consent_given_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $uuid,
                $val['first_name'],
                $val['last_name'],
                $val['phone'],
                $val['email'] ?? null,
                $val['status'],
                $val['trainer_id'] ?? null,
                $val['membership_start_date'] ?? null,
                $val['membership_end_date'] ?? null,
                $val['emergency_contact_name'] ?? null,
                $val['emergency_contact_phone'] ?? null,
                $val['notes'] ?? null,
                $val['consent_given_at'] ?? null,
                $adminId
            ]);

            $memberId = (int)$this->db->lastInsertId();
            if ($memberId <= 0) {
                throw new Exception("ID alınamadı.");
            }

            $this->db->commit();
            
            // Audit metadata: only safe values
            $auditMeta = ['status' => $val['status']];
            if (isset($val['trainer_id'])) {
                $auditMeta['trainer_id'] = $val['trainer_id'];
            }
            $this->logAudit('member.create', $memberId, $adminId, $auditMeta);

            Response::json(['success' => true, 'id' => $memberId], 201);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, üye oluşturulamadı.', 'INTERNAL_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();
        $id = (int)$id;

        $stmt = $this->db->prepare("SELECT * FROM members WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
        }

        $member['trainer_id'] = $member['trainer_id'] !== null ? (int)$member['trainer_id'] : null;

        $data = $this->getJsonInput();
        $val = $this->validateMemberData($data, true);
        
        $testStartDate = array_key_exists('membership_start_date', $val) ? $val['membership_start_date'] : $member['membership_start_date'];
        $testEndDate = array_key_exists('membership_end_date', $val) ? $val['membership_end_date'] : $member['membership_end_date'];
        
        if ($testStartDate && $testEndDate) {
            if (strtotime($testEndDate) < strtotime($testStartDate)) {
                Response::error("Bitiş tarihi başlangıç tarihinden önce olamaz.", 'VALIDATION_ERROR', 422);
            }
        }

        try {
            $this->db->beginTransaction();

            $sets = [];
            $params = [];
            $changed = [];

            foreach ($val as $k => $v) {
                if ($member[$k] !== $v) {
                    $sets[] = "{$k} = ?";
                    $params[] = $v;
                    $changed[] = $k;
                }
            }

            if (empty($sets)) {
                $this->db->rollBack();
                Response::json(['message' => 'Değişiklik yapılmadı.']);
            }

            $sets[] = "updated_by = ?";
            $params[] = $adminId;

            $params[] = $id;
            
            $sql = "UPDATE members SET " . implode(", ", $sets) . " WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            $this->db->commit();
            
            $meta = ['changed_fields' => $changed];
            if (in_array('status', $changed)) {
                $meta['new_status'] = $val['status'];
            }
            if (in_array('trainer_id', $changed)) {
                $meta['new_trainer_id'] = $val['trainer_id'];
            }

            $this->logAudit('member.update', $id, $adminId, $meta);

            Response::json(['message' => 'Üye güncellendi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, üye güncellenemedi.', 'INTERNAL_ERROR', 500);
        }
    }

    public function delete($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();
        $id = (int)$id;

        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("UPDATE members SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?");
            $stmt->execute([$adminId, $id]);

            $this->db->commit();
            $this->logAudit('member.delete', $id, $adminId);

            Response::json(['message' => 'Üye silindi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, üye silinemedi.', 'INTERNAL_ERROR', 500);
        }
    }
    
    public function restore($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();
        $id = (int)$id;

        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ? AND deleted_at IS NOT NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Response::error('Silinmiş üye bulunamadı.', 'NOT_FOUND', 404);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("UPDATE members SET deleted_at = NULL, updated_by = ? WHERE id = ?");
            $stmt->execute([$adminId, $id]);

            $this->db->commit();
            $this->logAudit('member.restore', $id, $adminId);

            Response::json(['message' => 'Üye başarıyla geri yüklendi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, üye geri yüklenemedi.', 'INTERNAL_ERROR', 500);
        }
    }
}
