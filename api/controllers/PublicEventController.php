<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\MediaHelper;
use PDO;
use Exception;

class PublicEventController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
    }

    public function categories() {
        try {
            $stmt = $this->db->query("SELECT name, slug, description FROM event_categories WHERE status = 'active' ORDER BY sort_order ASC, name ASC");
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            Response::json(['items' => $categories]);
        } catch (Exception $e) {
            Response::json(['error' => 'Kategoriler alınamadı.'], 500);
        }
    }

    public function index() {
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 12;
        $featured = isset($_GET['featured']) && $_GET['featured'] == '1';

        $where = ["e.status = 'published'", "e.deleted_at IS NULL"];
        $params = [];

        if ($featured) {
            $where[] = "e.featured_on_home = 1";
            $limit = min($limit, 6); // Max public featured limit is 6
            $orderSql = "ORDER BY e.featured_order IS NULL, e.featured_order ASC, e.event_date DESC, e.created_at DESC";
        } else {
            $orderSql = "ORDER BY e.event_date DESC, e.created_at DESC";
        }
        
        $offset = ($page - 1) * $limit;
        $whereSql = implode(' AND ', $where);

        try {
            $countStmt = $this->db->prepare("SELECT COUNT(*) FROM events e WHERE $whereSql");
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            $sql = "
                SELECT e.slug, e.title, e.excerpt, e.event_date, e.location, e.published_at,
                       c.name as category_name, c.slug as category_slug,
                       m.storage_path as cover_storage_path, m.thumbnail_path as cover_thumbnail_path, m.alt_text as cover_alt_text
                FROM events e 
                JOIN event_categories c ON e.category_id = c.id 
                LEFT JOIN media_assets m ON e.cover_media_id = m.id 
                WHERE $whereSql 
                $orderSql
                LIMIT $limit OFFSET $offset
            ";
            
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
                'items' => $events,
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

    public function show($slug) {
        try {
            $stmt = $this->db->prepare("
                SELECT e.id, e.slug, e.title, e.excerpt, e.content, e.event_date, e.location,
                       e.seo_title, e.seo_description, e.published_at,
                       c.name as category_name, c.slug as category_slug,
                       m.id as cover_id, m.storage_path as cover_storage_path, m.thumbnail_path as cover_thumbnail_path, m.alt_text as cover_alt_text
                FROM events e
                JOIN event_categories c ON e.category_id = c.id
                LEFT JOIN media_assets m ON e.cover_media_id = m.id
                WHERE e.slug = ? AND e.status = 'published' AND e.deleted_at IS NULL
            ");
            $stmt->execute([$slug]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                Response::json(['error' => 'Etkinlik bulunamadı.'], 404);
            }

            // Fetch gallery
            $stmtGallery = $this->db->prepare("
                SELECT m.id, m.media_type, m.storage_path, m.thumbnail_path, m.alt_text, m.width, m.height, em.caption
                FROM event_media em
                JOIN media_assets m ON em.media_id = m.id
                WHERE em.event_id = ? AND m.status = 'active' AND m.deleted_at IS NULL
                ORDER BY em.sort_order ASC
            ");
            $stmtGallery->execute([$event['id']]);
            $gallery = $stmtGallery->fetchAll(PDO::FETCH_ASSOC);
            MediaHelper::appendUrlsToArray($gallery);
            $event['gallery'] = $gallery;
            
            // Format response structure
            $response = [
                'id' => $event['id'],
                'slug' => $event['slug'],
                'title' => $event['title'],
                'excerpt' => $event['excerpt'],
                'content' => $event['content'],
                'event_date' => $event['event_date'],
                'location' => $event['location'],
                'seo_title' => $event['seo_title'],
                'seo_description' => $event['seo_description'],
                'published_at' => $event['published_at'],
                'category' => [
                    'name' => $event['category_name'],
                    'slug' => $event['category_slug']
                ],
                'cover' => null,
                'gallery' => $event['gallery']
            ];
            
            if ($event['cover_id']) {
                $tempAsset = [
                    'storage_path' => $event['cover_storage_path'],
                    'thumbnail_path' => $event['cover_thumbnail_path']
                ];
                MediaHelper::appendUrls($tempAsset);

                $response['cover'] = [
                    'id' => $event['cover_id'],
                    'url' => $tempAsset['url'] ?? null,
                    'thumbnail_url' => $tempAsset['thumbnail_url'] ?? null,
                    'alt_text' => $event['cover_alt_text']
                ];
                // For compatibility with previous frontend
                $response['cover_url'] = $tempAsset['url'] ?? null;
                $response['coverImage'] = $tempAsset['url'] ?? null;
            }

            Response::json($response);
        } catch (Exception $e) {
            Response::json(['error' => 'Etkinlik alınamadı.'], 500);
        }
    }
}
