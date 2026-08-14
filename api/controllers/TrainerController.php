<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Core\MediaHelper;
use Middleware\AuthMiddleware;
use PDO;
use Exception;
use Throwable;

class TrainerController {
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
        AuditLogger::log($action, $adminId, 'trainer', $entityId, $metadata);
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


    public function publicIndex() {
        $sql = "SELECT 
                    t.slug, t.name, t.role_title, t.bio, t.instagram_username, t.profile_media_id,
                    b.slug as branch_slug, b.name as branch_name
                FROM trainers t
                JOIN branches b ON t.branch_id = b.id
                WHERE t.is_active = 1 
                  AND t.deleted_at IS NULL
                  AND b.is_active = 1 
                  AND b.deleted_at IS NULL
                ORDER BY t.sort_order ASC, t.id ASC";
        
        $trainers = $this->db->fetchAll($sql);
        $result = [];
        
        foreach ($trainers as $t) {
            $trainer = [
                'slug' => $t['slug'],
                'name' => $t['name'],
                'role_title' => $t['role_title'],
                'bio' => $t['bio'],
                'instagram_username' => $t['instagram_username'],
                'branch' => [
                    'slug' => $t['branch_slug'],
                    'name' => $t['branch_name']
                ],
                'profile' => null
            ];
            
            if ($t['profile_media_id']) {
                $profile = $this->db->fetch("SELECT id, storage_path, thumbnail_path, alt_text FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$t['profile_media_id']]);
                if ($profile) {
                    \Core\MediaHelper::appendUrls($profile);
                    $trainer['profile'] = [
                        'url' => $profile['url'] ?? null,
                        'thumbnail_url' => $profile['thumbnail_url'] ?? null,
                        'alt_text' => $profile['alt_text'] ?? null
                    ];
                }
            }
            
            $result[] = $trainer;
        }
        
        \Core\Response::json($result);
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        
        $sql = "SELECT 
                    t.id, t.uuid, t.slug, t.name, t.role_title, t.bio, 
                    t.instagram_username, t.is_active, t.sort_order, t.updated_at,
                    b.id as branch_id, b.slug as branch_slug, b.name as branch_name, b.is_active as branch_active,
                    m.id as media_id, m.storage_path as media_path, m.thumbnail_path as media_thumb, m.alt_text as media_alt
                FROM trainers t
                INNER JOIN branches b ON t.branch_id = b.id
                LEFT JOIN media_assets m ON t.profile_media_id = m.id AND m.media_type = 'image' AND m.status = 'active' AND m.deleted_at IS NULL
                WHERE t.deleted_at IS NULL
                ORDER BY t.sort_order ASC, t.id ASC";
                
        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $trainers = [];
        foreach ($rows as $r) {
            $profile = null;
            if ($r['media_id']) {
                $asset = [
                    'id' => (int)$r['media_id'],
                    'storage_path' => $r['media_path'],
                    'thumbnail_path' => $r['media_thumb'],
                    'alt_text' => $r['media_alt']
                ];
                MediaHelper::appendUrls($asset);
                $profile = $asset;
            }

            $trainers[] = [
                'id' => (int)$r['id'],
                'uuid' => $r['uuid'],
                'slug' => $r['slug'],
                'name' => $r['name'],
                'role_title' => $r['role_title'],
                'is_active' => (bool)$r['is_active'],
                'sort_order' => (int)$r['sort_order'],
                'updated_at' => $r['updated_at'],
                'branch' => [
                    'id' => (int)$r['branch_id'],
                    'slug' => $r['branch_slug'],
                    'name' => $r['branch_name'],
                    'is_active' => (bool)$r['branch_active']
                ],
                'profile' => $profile
            ];
        }

        Response::json($trainers);
    }

    public function show($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        
        $sql = "SELECT 
                    t.id, t.uuid, t.slug, t.name, t.role_title, t.bio, 
                    t.instagram_username, t.is_active, t.sort_order, t.created_at, t.updated_at,
                    b.id as branch_id, b.slug as branch_slug, b.name as branch_name, b.is_active as branch_active,
                    m.id as media_id, m.storage_path as media_path, m.thumbnail_path as media_thumb, m.alt_text as media_alt
                FROM trainers t
                INNER JOIN branches b ON t.branch_id = b.id
                LEFT JOIN media_assets m ON t.profile_media_id = m.id AND m.media_type = 'image' AND m.status = 'active' AND m.deleted_at IS NULL
                WHERE t.id = ? AND t.deleted_at IS NULL";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$r) {
            Response::error('Eğitmen bulunamadı.', 'NOT_FOUND', 404);
        }

        $profile = null;
        if ($r['media_id']) {
            $asset = [
                'id' => (int)$r['media_id'],
                'storage_path' => $r['media_path'],
                'thumbnail_path' => $r['media_thumb'],
                'alt_text' => $r['media_alt']
            ];
            MediaHelper::appendUrls($asset);
            $profile = $asset;
        }

        $trainer = [
            'id' => (int)$r['id'],
            'uuid' => $r['uuid'],
            'slug' => $r['slug'],
            'name' => $r['name'],
            'role_title' => $r['role_title'],
            'bio' => $r['bio'],
            'instagram_username' => $r['instagram_username'],
            'is_active' => (bool)$r['is_active'],
            'sort_order' => (int)$r['sort_order'],
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at'],
            'branch' => [
                'id' => (int)$r['branch_id'],
                'slug' => $r['branch_slug'],
                'name' => $r['branch_name'],
                'is_active' => (bool)$r['branch_active']
            ],
            'profile' => $profile
        ];

        Response::json($trainer);
    }

    private function validateTrainerData(array $data, bool $isUpdate, ?int $currentId = null): array {
        $allowedFields = ['name', 'slug', 'role_title', 'branch_id', 'bio', 'profile_media_id', 'instagram_username', 'is_active'];
        
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowedFields)) {
                Response::error("Geçersiz alan: {$key}", 'VALIDATION_ERROR', 422);
            }
        }

        if (!$isUpdate) {
            $required = ['name', 'slug', 'role_title', 'branch_id', 'is_active'];
            foreach ($required as $req) {
                if (!array_key_exists($req, $data) || $data[$req] === null) {
                    Response::error("{$req} alanı zorunludur.", 'VALIDATION_ERROR', 422);
                }
            }
        } else {
            if (empty($data)) {
                Response::error('Güncellenecek alan bulunamadı.', 'VALIDATION_ERROR', 422);
            }
        }

        $val = [];

        if (array_key_exists('name', $data)) {
            if ($data['name'] === null || !is_string($data['name'])) {
                Response::error("İsim metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $name = trim($data['name']);
            if (mb_strlen($name) < 1 || mb_strlen($name) > 120) {
                Response::error("İsim 1-120 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['name'] = $name;
        }

        if (array_key_exists('slug', $data)) {
            if ($data['slug'] === null || !is_string($data['slug'])) {
                Response::error("Slug metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $slug = trim($data['slug']);
            if (strlen($slug) < 1 || strlen($slug) > 120) {
                Response::error("Slug 1-120 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
                Response::error("Slug sadece küçük harf, rakam ve tire içerebilir.", 'VALIDATION_ERROR', 422);
            }

            // Uniqueness check
            $sql = "SELECT id FROM trainers WHERE slug = ?";
            $params = [$slug];
            if ($currentId) {
                $sql .= " AND id != ?";
                $params[] = $currentId;
            }
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            if ($stmt->fetch()) {
                Response::error("Bu slug başka bir eğitmen tarafından kullanılıyor.", 'CONFLICT', 409);
            }
            $val['slug'] = $slug;
        }

        if (array_key_exists('role_title', $data)) {
            if ($data['role_title'] === null || !is_string($data['role_title'])) {
                Response::error("Rol metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $role = trim($data['role_title']);
            if (mb_strlen($role) < 1 || mb_strlen($role) > 160) {
                Response::error("Rol 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['role_title'] = $role;
        }

        if (array_key_exists('branch_id', $data)) {
            if ($data['branch_id'] === null || !is_int($data['branch_id']) || $data['branch_id'] <= 0) {
                Response::error("Geçersiz branş ID.", 'VALIDATION_ERROR', 422);
            }
            $branchId = (int)$data['branch_id'];
            $stmt = $this->db->prepare("SELECT id FROM branches WHERE id = ? AND deleted_at IS NULL");
            $stmt->execute([$branchId]);
            if (!$stmt->fetch()) {
                Response::error("Belirtilen branş bulunamadı veya silinmiş.", 'VALIDATION_ERROR', 422);
            }
            $val['branch_id'] = $branchId;
        }

        if (array_key_exists('bio', $data)) {
            if ($data['bio'] !== null) {
                if (!is_string($data['bio'])) {
                    Response::error("Biyografi metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $bio = trim($data['bio']);
                if (mb_strlen($bio) > 1200) {
                    Response::error("Biyografi en fazla 1200 karakter olabilir.", 'VALIDATION_ERROR', 422);
                }
                $val['bio'] = $bio === '' ? null : $bio;
            } else {
                $val['bio'] = null;
            }
        }

        if (array_key_exists('instagram_username', $data)) {
            if ($data['instagram_username'] !== null) {
                if (!is_string($data['instagram_username'])) {
                    Response::error("Instagram kullanıcı adı metin formatında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $insta = ltrim(trim($data['instagram_username']), '@');
                if ($insta === '') {
                    $val['instagram_username'] = null;
                } else {
                    if (!preg_match('/^[A-Za-z0-9._]{1,80}$/', $insta)) {
                        Response::error("Geçersiz Instagram kullanıcı adı.", 'VALIDATION_ERROR', 422);
                    }
                    $val['instagram_username'] = $insta;
                }
            } else {
                $val['instagram_username'] = null;
            }
        }

        if (array_key_exists('profile_media_id', $data)) {
            if ($data['profile_media_id'] !== null) {
                if (!is_int($data['profile_media_id']) || $data['profile_media_id'] <= 0) {
                    Response::error("Geçersiz profil medya ID.", 'VALIDATION_ERROR', 422);
                }
                $mediaId = (int)$data['profile_media_id'];
                $stmt = $this->db->prepare("SELECT id FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL");
                $stmt->execute([$mediaId]);
                if (!$stmt->fetch()) {
                    Response::error("Geçersiz veya silinmiş profil görseli.", 'VALIDATION_ERROR', 422);
                }
                $val['profile_media_id'] = $mediaId;
            } else {
                $val['profile_media_id'] = null;
            }
        }

        if (array_key_exists('is_active', $data)) {
            if ($data['is_active'] === null || !is_bool($data['is_active'])) {
                Response::error("is_active boolean (true/false) olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $val['is_active'] = $data['is_active'] ? 1 : 0;
        }

        return $val;
    }

    private function updateProfileMediaUsage(int $trainerId, ?int $newMediaId, ?int $oldMediaId) {
        if ($oldMediaId && $oldMediaId !== $newMediaId) {
            $stmt = $this->db->prepare("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'trainer' AND entity_id = ? AND field_name = 'profile'");
            $stmt->execute([$oldMediaId, $trainerId]);
        }
        if ($newMediaId && $oldMediaId !== $newMediaId) {
            $stmt = $this->db->prepare("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'trainer', ?, 'profile')");
            $stmt->execute([$newMediaId, $trainerId]);
        }
    }

    public function create() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();
        
        $data = $this->getJsonInput();
        $val = $this->validateTrainerData($data, false);
        $uuid = $this->generateUuid();

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->query("SELECT MAX(sort_order) as m FROM trainers WHERE deleted_at IS NULL");
            $maxOrder = (int)$stmt->fetchColumn();
            $sortOrder = $maxOrder + 10;

            $stmt = $this->db->prepare("
                INSERT INTO trainers (
                    uuid, slug, name, role_title, branch_id, bio, 
                    profile_media_id, instagram_username, is_active, 
                    sort_order, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $uuid,
                $val['slug'],
                $val['name'],
                $val['role_title'],
                $val['branch_id'],
                $val['bio'] ?? null,
                $val['profile_media_id'] ?? null,
                $val['instagram_username'] ?? null,
                $val['is_active'],
                $sortOrder,
                $adminId
            ]);

            $trainerId = (int)$this->db->lastInsertId();
            if ($trainerId <= 0) {
                throw new Exception("Eğitmen ID alınamadı.");
            }

            if (!empty($val['profile_media_id'])) {
                $this->updateProfileMediaUsage($trainerId, $val['profile_media_id'], null);
            }

            $this->db->commit();
            $this->logAudit('trainer.create', $trainerId, $adminId, ['branch_id' => $val['branch_id']]);

            Response::json(['success' => true, 'id' => $trainerId], 201);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, eğitmen oluşturulamadı.', 'INTERNAL_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();
        $id = (int)$id;

        $stmt = $this->db->prepare("SELECT * FROM trainers WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            Response::error('Eğitmen bulunamadı.', 'NOT_FOUND', 404);
        }

        // Normalize numeric/boolean fields to strictly match validation types before comparison
        $trainer['branch_id'] = (int)$trainer['branch_id'];
        $trainer['profile_media_id'] = $trainer['profile_media_id'] !== null ? (int)$trainer['profile_media_id'] : null;
        $trainer['is_active'] = (int)$trainer['is_active'];

        $data = $this->getJsonInput();
        $val = $this->validateTrainerData($data, true, $id);

        try {
            $this->db->beginTransaction();

            $sets = [];
            $params = [];
            $changed = [];

            foreach ($val as $k => $v) {
                if ($trainer[$k] !== $v) {
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

            // Updated at is updated automatically by ON UPDATE CURRENT_TIMESTAMP

            $params[] = $id;
            
            $sql = "UPDATE trainers SET " . implode(", ", $sets) . " WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            if (in_array('profile_media_id', $changed)) {
                $this->updateProfileMediaUsage($id, $val['profile_media_id'] ?? null, $trainer['profile_media_id']);
            }

            $this->db->commit();
            
            $meta = ['changed_fields' => $changed];
            if (in_array('profile_media_id', $changed)) {
                $meta['old_profile_media_id'] = $trainer['profile_media_id'];
                $meta['new_profile_media_id'] = $val['profile_media_id'] ?? null;
            }

            $this->logAudit('trainer.update', $id, $adminId, $meta);

            Response::json(['message' => 'Eğitmen güncellendi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, eğitmen güncellenemedi.', 'INTERNAL_ERROR', 500);
        }
    }

    public function delete($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();
        $id = (int)$id;

        $stmt = $this->db->prepare("SELECT id FROM trainers WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Response::error('Eğitmen bulunamadı.', 'NOT_FOUND', 404);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("UPDATE trainers SET deleted_at = CURRENT_TIMESTAMP, is_active = 0, updated_by = ? WHERE id = ?");
            $stmt->execute([$adminId, $id]);

            $stmt = $this->db->prepare("DELETE FROM media_usages WHERE entity_type = 'trainer' AND entity_id = ?");
            $stmt->execute([$id]);

            $this->db->commit();
            $this->logAudit('trainer.delete', $id, $adminId);

            Response::json(['message' => 'Eğitmen silindi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, eğitmen silinemedi.', 'INTERNAL_ERROR', 500);
        }
    }

    public function reorder() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();
        
        $data = $this->getJsonInput();
        if (count(array_keys($data)) !== 1 || !isset($data['trainer_ids'])) {
            Response::error("Sadece 'trainer_ids' alanı gönderilmelidir.", 'VALIDATION_ERROR', 422);
        }

        $trainerIds = $data['trainer_ids'];
        if (!is_array($trainerIds)) {
            Response::error("'trainer_ids' dizi olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        if (empty($trainerIds)) {
            Response::error("'trainer_ids' boş olamaz.", 'VALIDATION_ERROR', 422);
        }

        $uniqueIds = array_unique($trainerIds);
        if (count($uniqueIds) !== count($trainerIds)) {
            Response::error("Tekrarlanan ID'ler bulundu.", 'VALIDATION_ERROR', 422);
        }

        foreach ($trainerIds as $tid) {
            if (!is_int($tid) || $tid <= 0) {
                Response::error("Geçersiz eğitmen ID formatı.", 'VALIDATION_ERROR', 422);
            }
        }

        $stmt = $this->db->query("SELECT id FROM trainers WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC");
        $dbIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $oldOrder = [];
        foreach ($dbIds as $did) {
            $oldOrder[] = (int)$did;
        }
        
        if (count($uniqueIds) !== count($dbIds) || count(array_diff($uniqueIds, $dbIds)) > 0 || count(array_diff($dbIds, $uniqueIds)) > 0) {
             Response::error("Gönderilen liste mevcut aktif eğitmenlerle birebir eşleşmiyor.", 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("UPDATE trainers SET sort_order = ?, updated_by = ? WHERE id = ?");
            $order = 10;
            foreach ($trainerIds as $tid) {
                $stmt->execute([$order, $adminId, (int)$tid]);
                $order += 10;
            }

            $this->db->commit();
            $this->logAudit('trainers.reorder', null, $adminId, ['old_order' => $oldOrder, 'new_order' => $trainerIds]);

            Response::json(['message' => 'Sıralama başarıyla güncellendi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sıralama güncellenirken hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
