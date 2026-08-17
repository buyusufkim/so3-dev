<?php

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/core/SeoPageRenderer.php';

use Core\Database;
use Core\SeoPageRenderer;

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$slug = $_GET['slug'] ?? '';
if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
    echo SeoPageRenderer::renderEventPage(null);
    exit;
}

try {
    $db = Database::getInstance()->getConnection();
    
    $query = "
        SELECT e.title, e.excerpt, e.seo_title, e.seo_description, e.slug, m.storage_path as cover_path
        FROM events e
        LEFT JOIN media_assets m ON e.cover_media_id = m.id AND m.status = 'active' AND m.deleted_at IS NULL
        WHERE e.slug = ? AND e.status = 'published' AND e.deleted_at IS NULL
        LIMIT 1
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([$slug]);
    $event = $stmt->fetch(\PDO::FETCH_ASSOC);
    
    if ($event) {
        http_response_code(200);
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
        echo SeoPageRenderer::renderEventPage($event);
    } else {
        http_response_code(404);
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
        echo SeoPageRenderer::renderEventPage(null);
    }
} catch (\Exception $e) {
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
    echo SeoPageRenderer::renderEventPage(null);
}

