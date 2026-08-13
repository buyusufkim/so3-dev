<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Core\MediaHelper;
use Middleware\AuthMiddleware;
use PDO;
use Exception;

class EventController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function generateSlug($text) {
        $tr = ['ş','Ş','ı','İ','ğ','Ğ','ü','Ü','ö','Ö','ç','Ç'];
        $eng = ['s','s','i','i','g','g','u','u','o','o','c','c'];
        $text = str_replace($tr, $eng, $text);
        $text = mb_strtolower($text, 'UTF-8');
        $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
        $text = preg_replace('/[\s-]+/', '-', $text);
        return trim($text, '-');
    }

    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function logAudit($action, $eventId, $adminId, $details = null) {
        AuditLogger::log($action, $adminId, 'event', $eventId, $details ?: []);
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $status = $_GET['status'] ?? '';
        $category = $_GET['category'] ?? '';
        $featured = $_GET['featured'] ?? '';
        $deleted = $_GET['deleted'] ?? 'false';

        $where = ["1=1"];
        $params = [];

        if ($deleted === 'true') {
            $where[] = "e.deleted_at IS NOT NULL";
        } else {
            $where[] = "e.deleted_at IS NULL";
        }

        if ($search) {
            $where[] = "(e.title LIKE ? OR e.excerpt LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($status && in_array($status, ['draft', 'published', 'archived'])) {
            $where[] = "e.status = ?";
            $params[] = $status;
        }

        if ($category && is_numeric($category)) {
            $where[] = "e.category_id = ?";
            $params[] = (int)$category;
        }

        if ($featured !== '') {
            $where[] = "e.featured_on_home = ?";
            $params[] = $featured == '1' ? 1 : 0;
        }

        $whereSql = implode(' AND ', $where);

        try {
            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM events e WHERE $whereSql");
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            $sql = "SELECT e.*, c.name as category_name, m.storage_path as cover_storage_path, m.thumbnail_path as cover_thumbnail_path 
                    FROM events e 
                    LEFT JOIN event_categories c ON e.category_id = c.id 
                    LEFT JOIN media_assets m ON e.cover_media_id = m.id 
                    WHERE $whereSql 
                    ORDER BY e.created_at DESC 
                    LIMIT $limit OFFSET $offset";
                    
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($events as &$event) {
                if (isset($event['cover_storage_path'])) {
                    $event['storage_path'] = $event['cover_storage_path'];
                    $event['thumbnail_path'] = $event['cover_thumbnail_path'];
                    MediaHelper::appendUrls($event);
                    $event['cover_url'] = $event['url'] ?? null;
                    $event['cover_thumbnail_url'] = $event['thumbnail_url'] ?? null;
                    unset($event['url'], $event['thumbnail_url'], $event['storage_path'], $event['thumbnail_path']);
                } else {
                    $event['cover_url'] = null;
                    $event['cover_thumbnail_url'] = null;
                }
                unset($event['cover_storage_path'], $event['cover_thumbnail_path']);
            }

            Response::json([
                'data' => $events,
                'meta' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        } catch (Exception $e) {
            Response::json(['error' => 'Etkinlikler alınamadı.'], 500);
        }
    }

    public function show($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        try {
            $stmt = $this->db->prepare("
                SELECT e.*, c.name as category_name, m.storage_path as cover_storage_path, m.thumbnail_path as cover_thumbnail_path, m.alt_text as cover_alt_text
                FROM events e 
                LEFT JOIN event_categories c ON e.category_id = c.id 
                LEFT JOIN media_assets m ON e.cover_media_id = m.id 
                WHERE e.id = ?
            ");
            $stmt->execute([$id]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                Response::json(['error' => 'Etkinlik bulunamadı.'], 404);
            }

            if (isset($event['cover_storage_path'])) {
                $event['storage_path'] = $event['cover_storage_path'];
                $event['thumbnail_path'] = $event['cover_thumbnail_path'];
                MediaHelper::appendUrls($event);
                $event['cover_url'] = $event['url'] ?? null;
                $event['cover_thumbnail_url'] = $event['thumbnail_url'] ?? null;
                unset($event['url'], $event['thumbnail_url'], $event['storage_path'], $event['thumbnail_path']);
            } else {
                $event['cover_url'] = null;
                $event['cover_thumbnail_url'] = null;
            }
            unset($event['cover_storage_path'], $event['cover_thumbnail_path']);

            $stmtGallery = $this->db->prepare("
                SELECT m.id, m.media_type, m.storage_path, m.thumbnail_path, m.alt_text, m.width, m.height, em.caption, em.sort_order
                FROM event_media em 
                JOIN media_assets m ON em.media_id = m.id 
                WHERE em.event_id = ? AND m.status = 'active' AND m.deleted_at IS NULL
                ORDER BY em.sort_order ASC
            ");
            $stmtGallery->execute([$event['id']]);
            $gallery = $stmtGallery->fetchAll(PDO::FETCH_ASSOC);
            MediaHelper::appendUrlsToArray($gallery);
            $event['gallery'] = $gallery;

            Response::json(['data' => $event]);
        } catch (Exception $e) {
            Response::json(['error' => 'Etkinlik alınamadı.'], 500);
        }
    }

    private function validateEventData($data, $isUpdate = false, $currentEventId = null) {
        $title = trim($data['title'] ?? '');
        $slug = trim($data['slug'] ?? '');
        if (!$slug && $title) {
            $slug = $this->generateSlug($title);
        }
        
        $excerpt = isset($data['excerpt']) ? trim($data['excerpt']) : null;
        $content = isset($data['content']) ? trim($data['content']) : null;
        $location = isset($data['location']) ? trim($data['location']) : null;
        $seo_title = isset($data['seo_title']) ? trim($data['seo_title']) : null;
        $seo_description = isset($data['seo_description']) ? trim($data['seo_description']) : null;
        $category_id = isset($data['category_id']) ? $data['category_id'] : null;
        $status = isset($data['status']) && in_array($data['status'], ['draft', 'published', 'archived']) ? $data['status'] : 'draft';
        
        // Strict boolean validation
        if (isset($data['featured_on_home']) && !is_bool($data['featured_on_home'])) {
            Response::json(['error' => 'featured_on_home geçersiz. Sadece true veya false (boolean) kabul edilir.'], 422);
        }
        $featured_on_home = isset($data['featured_on_home']) ? $data['featured_on_home'] : false;
        
        // Order validation
        $featured_order = null;
        if (isset($data['featured_order']) && $data['featured_order'] !== '') {
            if (!is_numeric($data['featured_order'])) {
                Response::json(['error' => 'Geçersiz featured_order.'], 422);
            }
            $featured_order = (int)$data['featured_order'];
            if ($featured_order < 0 || $featured_order > 10000) {
                Response::json(['error' => 'featured_order 0-10000 arasında olmalıdır.'], 422);
            }
        }
        
        $event_date = !empty($data['event_date']) ? $data['event_date'] : null;
        if ($event_date) {
            $d = \DateTime::createFromFormat('Y-m-d H:i:s', $event_date);
            if (!$d || $d->format('Y-m-d H:i:s') !== $event_date) {
                $d2 = \DateTime::createFromFormat('Y-m-d', $event_date);
                if (!$d2 || $d2->format('Y-m-d') !== $event_date) {
                    Response::json(['error' => 'Geçersiz tarih formatı (YYYY-MM-DD veya YYYY-MM-DD HH:MM:SS olmalıdır).'], 422);
                }
            }
        }
        
        $cover_media_id = isset($data['cover_media_id']) && $data['cover_media_id'] ? (int)$data['cover_media_id'] : null;

        if (strlen($title) < 1 || strlen($title) > 160) {
            Response::json(['error' => 'Başlık 1-160 karakter arasında olmalıdır.'], 422);
        }
        if (strlen($slug) < 1 || strlen($slug) > 180) {
            Response::json(['error' => 'Slug 1-180 karakter arasında olmalıdır.'], 422);
        }
        if ($excerpt && mb_strlen($excerpt) > 500) {
            Response::json(['error' => 'Özet 500 karakterden uzun olamaz.'], 422);
        }
        if ($content && mb_strlen($content) > 20000) {
            Response::json(['error' => 'İçerik çok uzun.'], 422);
        }
        if ($location && mb_strlen($location) > 200) {
            Response::json(['error' => 'Konum 200 karakterden uzun olamaz.'], 422);
        }
        if ($seo_title && mb_strlen($seo_title) > 70) {
            Response::json(['error' => 'SEO başlığı 70 karakterden uzun olamaz.'], 422);
        }
        if ($seo_description && mb_strlen($seo_description) > 170) {
            Response::json(['error' => 'SEO açıklaması 170 karakterden uzun olamaz.'], 422);
        }

        // Validate Category
        if (!$category_id || !is_numeric($category_id) || (int)$category_id <= 0) {
            Response::json(['error' => 'Kategori seçimi zorunludur.'], 422);
        }
        $category_id = (int)$category_id;
        $stmtCat = $this->db->prepare("SELECT id FROM event_categories WHERE id = ? AND status = 'active'");
        $stmtCat->execute([$category_id]);
        if (!$stmtCat->fetch()) {
            Response::json(['error' => 'Geçersiz veya aktif olmayan kategori.'], 422);
        }

        if ($slug !== ($data['original_slug'] ?? '')) {
            $sql = "SELECT id FROM events WHERE slug = ?";
            $params = [$slug];
            if ($isUpdate) {
                $sql .= " AND id != ?";
                $params[] = $currentEventId;
            }
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            if ($stmt->fetch()) {
                Response::json(['error' => 'Bu slug zaten kullanımda.'], 409);
            }
        }


        if ($cover_media_id) {
            $stmtCover = $this->db->prepare("SELECT id FROM media_assets WHERE id = ? AND status = 'active' AND deleted_at IS NULL AND media_type = 'image'");
            $stmtCover->execute([$cover_media_id]);
            if (!$stmtCover->fetch()) {
                Response::json(['error' => 'Geçersiz veya silinmiş kapak görseli. Sadece aktif görseller kapak olabilir.'], 422);
            }
        }

        if ($status === 'published') {
            if (!$cover_media_id) Response::json(['error' => 'Yayınlamak için kapak görseli gereklidir.'], 422);
            if (!$excerpt) Response::json(['error' => 'Yayınlamak için özet gereklidir.'], 422);
        }


        if ($status !== 'published') {
            $featured_on_home = false;
        }

        return [
            'title' => $title, 'slug' => $slug, 'category_id' => $category_id,
            'excerpt' => $excerpt, 'content' => $content, 'location' => $location,
            'seo_title' => $seo_title, 'seo_description' => $seo_description,
            'status' => $status, 'featured_on_home' => $featured_on_home,
            'featured_order' => $featured_order, 'event_date' => $event_date,
            'cover_media_id' => $cover_media_id
        ];
    }

    private function updateCoverUsage($eventId, $newMediaId, $oldMediaId) {
        if ($oldMediaId && $oldMediaId !== $newMediaId) {
            $stmt = $this->db->prepare("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'event' AND entity_id = ? AND field_name = 'cover'");
            $stmt->execute([$oldMediaId, $eventId]);
        }
        if ($newMediaId && $oldMediaId !== $newMediaId) {
            $stmt = $this->db->prepare("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'event', ?, 'cover')");
            $stmt->execute([$newMediaId, $eventId]);
        }
    }

    public function create() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $_SESSION['admin_id'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::json(['error' => 'Geçersiz JSON verisi.'], 400);
        }

        $val = $this->validateEventData($data);
        $uuid = $this->generateUuid();
        $publishedAt = $val['status'] === 'published' ? date('Y-m-d H:i:s') : null;

        try {
            $this->db->beginTransaction();
            $stmt = $this->db->prepare("
                INSERT INTO events 
                (uuid, title, slug, category_id, excerpt, content, event_date, location, cover_media_id, status, featured_on_home, featured_order, seo_title, seo_description, published_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $uuid, $val['title'], $val['slug'], $val['category_id'], $val['excerpt'], $val['content'],
                $val['event_date'], $val['location'], $val['cover_media_id'], $val['status'],
                $val['featured_on_home'] ? 1 : 0, $val['featured_order'], $val['seo_title'], $val['seo_description'],
                $publishedAt, $adminId
            ]);
            
            $eventId = $this->db->lastInsertId();
            
            if ($val['cover_media_id']) {
                $this->updateCoverUsage($eventId, $val['cover_media_id'], null);
            }

            $this->db->commit();
            $this->logAudit('event.created', $eventId, $adminId);
            Response::json(['message' => 'Etkinlik oluşturuldu.', 'id' => $eventId], 201);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::json(['error' => 'Etkinlik oluşturulamadı.'], 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $_SESSION['admin_id'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::json(['error' => 'Geçersiz JSON verisi.'], 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM events WHERE id = ?");
            $stmt->execute([$id]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$event) {
                Response::json(['error' => 'Etkinlik bulunamadı.'], 404);
            }

            $data['original_slug'] = $event['slug'];

            if (!isset($data['featured_on_home'])) {
                $data['featured_on_home'] = (bool)$event['featured_on_home'];
            }

            // Merge existing with new for validation
            $mergedData = array_merge($event, $data);
            $val = $this->validateEventData($mergedData, true, $id);

            $publishedAt = $event['published_at'];
            if ($val['status'] === 'published' && $event['status'] !== 'published' && !$publishedAt) {
                $publishedAt = date('Y-m-d H:i:s');
            }

            $this->db->beginTransaction();
            $stmt = $this->db->prepare("
                UPDATE events SET 
                    title = ?, slug = ?, category_id = ?, excerpt = ?, content = ?, event_date = ?, location = ?, 
                    cover_media_id = ?, status = ?, featured_on_home = ?, featured_order = ?, seo_title = ?, 
                    seo_description = ?, published_at = ?, updated_by = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $val['title'], $val['slug'], $val['category_id'], $val['excerpt'], $val['content'],
                $val['event_date'], $val['location'], $val['cover_media_id'], $val['status'],
                $val['featured_on_home'] ? 1 : 0, $val['featured_order'], $val['seo_title'], $val['seo_description'],
                $publishedAt, $adminId, $id
            ]);

            $this->updateCoverUsage($id, $val['cover_media_id'], $event['cover_media_id']);

            $this->db->commit();

            if ($event['status'] !== $val['status']) {
                $this->logAudit('event.' . $val['status'], $id, $adminId);
            }
            if ($event['featured_on_home'] != $val['featured_on_home']) {
                $this->logAudit('event.featured.changed', $id, $adminId, ['featured' => $val['featured_on_home']]);
            }
            $this->logAudit('event.updated', $id, $adminId);

            Response::json(['message' => 'Etkinlik güncellendi.']);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::json(['error' => 'Etkinlik güncellenemedi.'], 500);
        }
    }

    public function destroy($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'] ?? null;
        try {
            $stmt = $this->db->prepare("UPDATE events SET deleted_at = NOW(), featured_on_home = 0 WHERE id = ?");
            $stmt->execute([$id]);
            $this->logAudit('event.deleted', $id, $adminId);
            Response::json(['message' => 'Etkinlik çöp kutusuna taşındı.']);
        } catch (Exception $e) {
            Response::json(['error' => 'İşlem başarısız.'], 500);
        }
    }

    public function restore($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'] ?? null;
        try {
            $stmt = $this->db->prepare("UPDATE events SET deleted_at = NULL, status = 'draft', featured_on_home = 0 WHERE id = ?");
            $stmt->execute([$id]);
            $this->logAudit('event.restored', $id, $adminId);
            Response::json(['message' => 'Etkinlik taslak olarak geri yüklendi.']);
        } catch (Exception $e) {
            Response::json(['error' => 'İşlem başarısız.'], 500);
        }
    }

    public function attachMedia($eventId) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $_SESSION['admin_id'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::json(['error' => 'Geçersiz JSON verisi.'], 400);
        }
        $mediaId = isset($data['media_id']) ? (int)$data['media_id'] : null;

        if (!$mediaId) {
            Response::json(['error' => 'Media ID zorunludur.'], 422);
        }

        try {
            $stmt = $this->db->prepare("SELECT id, deleted_at FROM events WHERE id = ?");
            $stmt->execute([$eventId]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$event) Response::json(['error' => 'Etkinlik bulunamadı.'], 404);
            if ($event['deleted_at'] !== null) Response::json(['error' => 'Silinmiş etkinliğe medya eklenemez.'], 409);

            $stmt = $this->db->prepare("SELECT id FROM media_assets WHERE id = ? AND status = 'active' AND deleted_at IS NULL");
            $stmt->execute([$mediaId]);
            if (!$stmt->fetch()) Response::json(['error' => 'Geçersiz veya silinmiş medya.'], 422);

            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT MAX(sort_order) FROM event_media WHERE event_id = ?");
            $stmt->execute([$eventId]);
            $maxOrder = (int)$stmt->fetchColumn();

            $stmt = $this->db->prepare("INSERT IGNORE INTO event_media (event_id, media_id, sort_order) VALUES (?, ?, ?)");
            $stmt->execute([$eventId, $mediaId, $maxOrder + 10]);

            if ($stmt->rowCount() > 0) {
                $stmtUsage = $this->db->prepare("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'event', ?, 'gallery')");
                $stmtUsage->execute([$mediaId, $eventId]);
                $this->logAudit('event.media.attached', $eventId, $adminId, ['media_id' => $mediaId]);
            }

            $this->db->commit();
            Response::json(['message' => 'Medya galeriye eklendi.']);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::json(['error' => 'Medya eklenemedi.'], 500);
        }
    }

    public function detachMedia($eventId, $mediaId) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $_SESSION['admin_id'] ?? null;
        try {
            // Detach is allowed on deleted events according to instructions "only if intentionally needed for cleanup"
            $this->db->beginTransaction();
            $stmt = $this->db->prepare("DELETE FROM event_media WHERE event_id = ? AND media_id = ?");
            $stmt->execute([$eventId, $mediaId]);
            if ($stmt->rowCount() > 0) {
                $stmtUsage = $this->db->prepare("DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'event' AND entity_id = ? AND field_name = 'gallery'");
                $stmtUsage->execute([$mediaId, $eventId]);
                $this->logAudit('event.media.detached', $eventId, $adminId, ['media_id' => $mediaId]);
            }
            $this->db->commit();
            Response::json(['message' => 'Medya galeriden çıkarıldı.']);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::json(['error' => 'İşlem başarısız.'], 500);
        }
    }

    public function reorderMedia($eventId) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::json(['error' => 'Geçersiz JSON verisi.'], 400);
        }

        $orders = $data['orders'] ?? [];
        if (!is_array($orders)) {
            Response::json(['error' => 'Geçersiz veri formatı. orders array olmalıdır.'], 422);
        }

        try {
            $stmt = $this->db->prepare("SELECT id, deleted_at FROM events WHERE id = ?");
            $stmt->execute([$eventId]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$event) Response::json(['error' => 'Etkinlik bulunamadı.'], 404);
            if ($event['deleted_at'] !== null) Response::json(['error' => 'Silinmiş etkinliğin medyaları sıralanamaz.'], 409);

            // Fetch all valid media ids for this event
            $stmt = $this->db->prepare("SELECT media_id FROM event_media WHERE event_id = ?");
            $stmt->execute([$eventId]);
            $validMediaIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $suppliedMediaIds = [];
            foreach ($orders as $o) {
                if (!isset($o['media_id']) || !isset($o['sort_order'])) {
                    Response::json(['error' => 'Her öğe media_id ve sort_order içermelidir.'], 422);
                }
                $mId = (int)$o['media_id'];
                $sOrd = (int)$o['sort_order'];
                if ($sOrd < 0 || $sOrd > 100000) {
                    Response::json(['error' => 'Geçersiz sort_order değeri.'], 422);
                }
                if (in_array($mId, $suppliedMediaIds)) {
                    Response::json(['error' => 'Aynı media_id birden fazla kullanılamaz.'], 422);
                }
                if (!in_array($mId, $validMediaIds)) {
                    Response::json(['error' => 'Geçersiz media_id. Bu etkinlikte bulunmuyor.'], 422);
                }
                $suppliedMediaIds[] = $mId;
            }

            $this->db->beginTransaction();
            $stmt = $this->db->prepare("UPDATE event_media SET sort_order = ? WHERE event_id = ? AND media_id = ?");
            
            foreach ($orders as $o) {
                $stmt->execute([(int)$o['sort_order'], $eventId, (int)$o['media_id']]);
            }

            $this->db->commit();
            Response::json(['message' => 'Sıralama güncellendi.']);
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::json(['error' => 'Sıralama güncellenemedi.'], 500);
        }
    }
}
