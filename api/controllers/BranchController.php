<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use Core\AuditLogger;
use Core\MediaHelper;

class BranchController {
    
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); 
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); 
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
    
    
    private function getAdminId(): int {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
            Response::error('Oturum bilgisi eksik.', 'UNAUTHORIZED', 401);
        }
        return (int)$adminId;
    }
    
    private function getJsonInput() {
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


    public function getAdminList() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        
        $sql = "SELECT b.id, b.uuid, b.slug, b.name, b.description, b.is_active, b.sort_order, b.updated_at, b.cover_media_id,
                (SELECT COUNT(*) FROM branch_media bm WHERE bm.branch_id = b.id) as gallery_count
                FROM branches b
                WHERE b.deleted_at IS NULL
                ORDER BY b.sort_order ASC, b.id ASC";
        $branches = $this->db->fetchAll($sql);
        
        foreach ($branches as &$b) {
            $b['is_active'] = (bool)$b['is_active'];
            $b['cover'] = null;
            if ($b['cover_media_id']) {
                $cover = $this->db->fetch("SELECT id, storage_path, thumbnail_path, alt_text FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$b['cover_media_id']]);
                if ($cover) {
                    MediaHelper::appendUrls($cover);
                    $b['cover'] = $cover;
                }
            }
            unset($b['cover_media_id']);
        }
        
        Response::json($branches);
    }

    public function getAdminDetail($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        
        $branch = $this->db->fetch("SELECT id, uuid, slug, name, description, is_active, sort_order, created_at, updated_at, cover_media_id FROM branches WHERE id = ? AND deleted_at IS NULL", [$id]);
        if (!$branch) {
            Response::error('Branş bulunamadı.', 'NOT_FOUND', 404);
        }
        
        $branch['is_active'] = (bool)$branch['is_active'];
        
        $branch['cover'] = null;
        if ($branch['cover_media_id']) {
            $cover = $this->db->fetch("SELECT id, storage_path, thumbnail_path, alt_text FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$branch['cover_media_id']]);
            if ($cover) {
                MediaHelper::appendUrls($cover);
                $branch['cover'] = $cover;
            }
        }
        unset($branch['cover_media_id']);
        
        $gallery = $this->db->fetchAll("SELECT m.id, m.storage_path, m.thumbnail_path, m.alt_text, m.caption, m.width, m.height 
                                        FROM branch_media bm 
                                        JOIN media_assets m ON m.id = bm.media_id 
                                        WHERE bm.branch_id = ? AND m.media_type = 'image' AND m.status = 'active' AND m.deleted_at IS NULL 
                                        ORDER BY bm.sort_order ASC, bm.id ASC", [$id]);
        
        foreach ($gallery as &$item) {
            MediaHelper::appendUrls($item);
        }
        $branch['gallery'] = $gallery;
        
        Response::json($branch);
    }
    
    private function validateSlugUniqueness($slug, $excludeId = null) {
        $params = [$slug];
        $sql = "SELECT id FROM branches WHERE slug = ?";
        if ($excludeId !== null) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        $existing = $this->db->fetch($sql, $params);
        if ($existing) {
            Response::error('Bu slug başka bir branş tarafından kullanılıyor.', 'CONFLICT', 409);
        }
    }
    
    private function validateMedia($id, $isArray = false) {
        if ($id === null) return;
        $media = $this->db->fetch("SELECT id FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$id]);
        if (!$media) {
            Response::error('Geçersiz veya silinmiş medya ID.', 'VALIDATION_ERROR', 422);
        }
    }
    
    public function create() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();
        
        $input = $this->getJsonInput();
        
        $allowed = ['name', 'slug', 'description', 'cover_media_id', 'gallery_media_ids', 'is_active'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed)) {
                Response::error('Geçersiz alan: ' . $key, 'VALIDATION_ERROR', 422);
            }
        }
        
        if (!array_key_exists('name', $input) || !is_string($input['name'])) Response::error('Geçersiz name.', 'VALIDATION_ERROR', 422);
        if (!array_key_exists('slug', $input) || !is_string($input['slug'])) Response::error('Geçersiz slug.', 'VALIDATION_ERROR', 422);
        if (!array_key_exists('description', $input) || !is_string($input['description'])) Response::error('Geçersiz description.', 'VALIDATION_ERROR', 422);
        
        $name = trim($input['name']);
        $slug = $input['slug'];
        $desc = trim($input['description']);
        
        if (mb_strlen($name) < 1 || mb_strlen($name) > 120) Response::error('İsim 1-120 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
        if (mb_strlen($slug) < 1 || mb_strlen($slug) > 100) Response::error('Slug 1-100 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) Response::error('Geçersiz slug.', 'VALIDATION_ERROR', 422);
        if (mb_strlen($desc) < 1 || mb_strlen($desc) > 600) Response::error('Açıklama 1-600 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
        
        if (!array_key_exists('is_active', $input) || !is_bool($input['is_active'])) Response::error('Geçersiz is_active.', 'VALIDATION_ERROR', 422);
        $isActive = $input['is_active'] ? 1 : 0;
        
        $coverId = null;
        if (array_key_exists('cover_media_id', $input)) {
            if ($input['cover_media_id'] !== null && (!is_int($input['cover_media_id']) || $input['cover_media_id'] <= 0)) {
                Response::error('Geçersiz cover_media_id.', 'VALIDATION_ERROR', 422);
            }
            $coverId = $input['cover_media_id'];
            $this->validateMedia($coverId);
        }
        
        $galleryIds = [];
        if (array_key_exists('gallery_media_ids', $input)) {
            if (!is_array($input['gallery_media_ids'])) Response::error('gallery_media_ids dizi olmalıdır.', 'VALIDATION_ERROR', 422);
            if (count($input['gallery_media_ids']) > 20) Response::error('En fazla 20 medya eklenebilir.', 'VALIDATION_ERROR', 422);
            foreach ($input['gallery_media_ids'] as $gid) {
                if (!is_int($gid) || $gid <= 0) Response::error('Geçersiz galeri media ID.', 'VALIDATION_ERROR', 422);
                $this->validateMedia($gid);
                if (in_array($gid, $galleryIds)) Response::error('Aynı medya ID birden fazla kullanılamaz.', 'VALIDATION_ERROR', 422);
                $galleryIds[] = $gid;
            }
        }
        
        $this->validateSlugUniqueness($slug);
        
        $uuid = $this->generateUuid();
        
        try {
            $this->db->beginTransaction();
            
            $sortOrder = (int)$this->db->fetch("SELECT COALESCE(MAX(sort_order), 0) + 10 as nx FROM branches WHERE deleted_at IS NULL")['nx'];
            
            $this->db->query("INSERT INTO branches (uuid, slug, name, description, cover_media_id, is_active, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                $uuid, $slug, $name, $desc, $coverId, $isActive, $sortOrder, $adminId
            ]);
            $branchId = (int)$this->db->getConnection()->lastInsertId();
            if ($branchId <= 0) { throw new \Exception('Insert failed'); }
            
            if ($coverId) {
                $this->db->query("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'branch', ?, 'cover')", [$coverId, $branchId]);
            }
            
            foreach ($galleryIds as $i => $gid) {
                $order = ($i + 1) * 10;
                $this->db->query("INSERT INTO branch_media (branch_id, media_id, sort_order) VALUES (?, ?, ?)", [$branchId, $gid, $order]);
                $this->db->query("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'branch', ?, 'gallery')", [$gid, $branchId]);
            }
            
            $this->db->commit();
            
            AuditLogger::log('branch.create', $adminId, 'branch', $branchId, [
                'name' => $name,
                'slug' => $slug,
                'gallery_count' => count($galleryIds)
            ]);
            
            Response::json(['success' => true, 'id' => $branchId]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Branş oluşturulurken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();
        
        $branch = $this->db->fetch("SELECT * FROM branches WHERE id = ? AND deleted_at IS NULL", [$id]);
        if (!$branch) {
            Response::error('Branş bulunamadı.', 'NOT_FOUND', 404);
        }
        
        $input = $this->getJsonInput();
        
        if (empty($input)) {
            Response::error('Güncellenecek veri bulunamadı.', 'VALIDATION_ERROR', 422);
        }

        $allowed = ['name', 'slug', 'description', 'cover_media_id', 'gallery_media_ids', 'is_active'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed)) {
                Response::error('Geçersiz alan: ' . $key, 'VALIDATION_ERROR', 422);
            }
        }

        $updates = [];
        $params = [];
        $changed = [];
        
        if (array_key_exists('name', $input)) {
            if (!is_string($input['name'])) Response::error('Geçersiz name.', 'VALIDATION_ERROR', 422);
            $name = trim($input['name']);
            if (mb_strlen($name) < 1 || mb_strlen($name) > 120) Response::error('İsim 1-120 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
            if ($name !== $branch['name']) {
                $updates[] = "name = ?";
                $params[] = $name;
                $changed[] = 'name';
            }
        }
        
        if (array_key_exists('slug', $input)) {
            if (!is_string($input['slug'])) Response::error('Geçersiz slug.', 'VALIDATION_ERROR', 422);
            $slug = $input['slug'];
            if (mb_strlen($slug) < 1 || mb_strlen($slug) > 100) Response::error('Slug 1-100 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
            if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) Response::error('Geçersiz slug.', 'VALIDATION_ERROR', 422);
            $this->validateSlugUniqueness($slug, $id);
            if ($slug !== $branch['slug']) {
                $updates[] = "slug = ?";
                $params[] = $slug;
                $changed[] = 'slug';
            }
        }
        
        if (array_key_exists('description', $input)) {
            if (!is_string($input['description'])) Response::error('Geçersiz description.', 'VALIDATION_ERROR', 422);
            $desc = trim($input['description']);
            if (mb_strlen($desc) < 1 || mb_strlen($desc) > 600) Response::error('Açıklama 1-600 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
            if ($desc !== $branch['description']) {
                $updates[] = "description = ?";
                $params[] = $desc;
                $changed[] = 'description';
            }
        }
        
        if (array_key_exists('is_active', $input)) {
            if (!is_bool($input['is_active'])) Response::error('Geçersiz is_active.', 'VALIDATION_ERROR', 422);
            $isActive = $input['is_active'] ? 1 : 0;
            if ($isActive != $branch['is_active']) {
                $updates[] = "is_active = ?";
                $params[] = $isActive;
                $changed[] = 'is_active';
            }
        }
        
        $newCoverId = $branch['cover_media_id'];
        $coverChanged = false;
        if (array_key_exists('cover_media_id', $input)) {
            if ($input['cover_media_id'] !== null && (!is_int($input['cover_media_id']) || $input['cover_media_id'] <= 0)) {
                Response::error('Geçersiz cover_media_id.', 'VALIDATION_ERROR', 422);
            }
            $coverId = $input['cover_media_id'];
            $this->validateMedia($coverId);
            
            if ($coverId !== $branch['cover_media_id']) {
                $updates[] = "cover_media_id = ?";
                $params[] = $coverId;
                $changed[] = 'cover_media_id';
                $newCoverId = $coverId;
                $coverChanged = true;
            }
        }
        
        $galleryChanged = false;
        $galleryIds = null;
        if (array_key_exists('gallery_media_ids', $input)) {
            if (!is_array($input['gallery_media_ids'])) Response::error('gallery_media_ids dizi olmalıdır.', 'VALIDATION_ERROR', 422);
            if (count($input['gallery_media_ids']) > 20) Response::error('En fazla 20 medya eklenebilir.', 'VALIDATION_ERROR', 422);
            
            $galleryIds = [];
            foreach ($input['gallery_media_ids'] as $gid) {
                if (!is_int($gid) || $gid <= 0) Response::error('Geçersiz galeri media ID.', 'VALIDATION_ERROR', 422);
                $this->validateMedia($gid);
                if (in_array($gid, $galleryIds)) Response::error('Aynı medya ID birden fazla kullanılamaz.', 'VALIDATION_ERROR', 422);
                $galleryIds[] = $gid;
            }
            $changed[] = 'gallery_media_ids';
            $galleryChanged = true;
        }
        
        if (empty($updates) && !$galleryChanged && !$coverChanged) {
            Response::json(['success' => true]);
        }
        
        try {
            $this->db->beginTransaction();
            
            if (!empty($updates) || $coverChanged || $galleryChanged) {
                $updates[] = "updated_by = ?";
                $params[] = $adminId;
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE branches SET " . implode(", ", $updates) . " WHERE id = ?";
                $params[] = $id;
                $this->db->query($sql, $params);
            }
            
            if ($coverChanged) {
                if ($branch['cover_media_id']) {
                    $this->db->query("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'branch' AND entity_id = ? AND field_name = 'cover'", [$branch['cover_media_id'], $id]);
                }
                if ($newCoverId) {
                    $this->db->query("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'branch', ?, 'cover')", [$newCoverId, $id]);
                }
            }
            
            if ($galleryChanged) {
                // Delete existing gallery and usages
                $oldGallery = $this->db->fetchAll("SELECT media_id FROM branch_media WHERE branch_id = ?", [$id]);
                foreach ($oldGallery as $og) {
                    $this->db->query("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'branch' AND entity_id = ? AND field_name = 'gallery'", [$og['media_id'], $id]);
                }
                $this->db->query("DELETE FROM branch_media WHERE branch_id = ?", [$id]);
                
                // Insert new
                foreach ($galleryIds as $i => $gid) {
                    $order = ($i + 1) * 10;
                    $this->db->query("INSERT INTO branch_media (branch_id, media_id, sort_order) VALUES (?, ?, ?)", [$id, $gid, $order]);
                    $this->db->query("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'branch', ?, 'gallery')", [$gid, $id]);
                }
            }
            
            $this->db->commit();
            
            $auditData = [
                'changed_fields' => $changed
            ];
            if ($coverChanged) {
                $auditData['old_cover_media_id'] = $branch['cover_media_id'];
                $auditData['new_cover_media_id'] = $newCoverId;
            }
            if ($galleryChanged) {
                $auditData['gallery_count'] = count($galleryIds);
            }
            
            AuditLogger::log('branch.update', $adminId, 'branch', $id, $auditData);
            
            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Branş güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
    
    public function delete($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();
        
        $branch = $this->db->fetch("SELECT * FROM branches WHERE id = ? AND deleted_at IS NULL", [$id]);
        if (!$branch) {
            Response::error('Branş bulunamadı veya zaten silinmiş.', 'NOT_FOUND', 404);
        }
        
        try {
            $this->db->beginTransaction();
            
            $this->db->query("UPDATE branches SET deleted_at = NOW(), is_active = 0, updated_by = ?, updated_at = NOW() WHERE id = ?", [$adminId, $id]);
            
            if ($branch['cover_media_id']) {
                $this->db->query("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'branch' AND entity_id = ? AND field_name = 'cover'", [$branch['cover_media_id'], $id]);
            }
            
            $gallery = $this->db->fetchAll("SELECT media_id FROM branch_media WHERE branch_id = ?", [$id]);
            foreach ($gallery as $g) {
                $this->db->query("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'branch' AND entity_id = ? AND field_name = 'gallery'", [$g['media_id'], $id]);
            }
            
            $this->db->commit();
            
            AuditLogger::log('branch.delete', $adminId, 'branch', $id);
            
            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Branş silinirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
    
    public function reorder() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();
        
        $input = $this->getJsonInput();
        
        $allowed = ['branch_ids'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed)) {
                Response::error('Geçersiz alan: ' . $key, 'VALIDATION_ERROR', 422);
            }
        }
        
        if (!array_key_exists('branch_ids', $input) || !is_array($input['branch_ids'])) {
            Response::error('Geçersiz payload.', 'VALIDATION_ERROR', 422);
        }
        
        $ids = $input['branch_ids'];
        
        $current = $this->db->fetchAll("SELECT id FROM branches WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC");
        $currentIds = array_column($current, 'id');
        
        if (count($ids) !== count($currentIds)) {
            Response::error('Tüm aktif branş IDleri gönderilmelidir.', 'VALIDATION_ERROR', 422);
        }
        
        $cleanIds = [];
        foreach ($ids as $id) {
            if (!is_int($id)) Response::error('Geçersiz ID formatı.', 'VALIDATION_ERROR', 422);
            if (!in_array($id, $currentIds)) Response::error('Bilinmeyen veya silinmiş branş IDsi: ' . $id, 'VALIDATION_ERROR', 422);
            if (in_array($id, $cleanIds)) Response::error('Tekrarlayan branş IDsi: ' . $id, 'VALIDATION_ERROR', 422);
            $cleanIds[] = $id;
        }
        
        try {
            $this->db->beginTransaction();
            
            foreach ($cleanIds as $index => $id) {
                $order = ($index + 1) * 10;
                $this->db->query("UPDATE branches SET sort_order = ?, updated_by = ?, updated_at = NOW() WHERE id = ?", [$order, $adminId, $id]);
            }
            
            $this->db->commit();
            
            AuditLogger::log('branches.reorder', $adminId, 'branches', null, ['old_order' => $currentIds, 'new_order' => $cleanIds]);
            
            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sıralama güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
}
