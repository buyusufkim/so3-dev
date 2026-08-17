<?php

use Core\Database;
use Core\SeoPageRenderer;

define('SO3_SKIP_SESSION', true);

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    http_response_code(405);
    header('Allow: GET, HEAD');
    header('Cache-Control: no-store, max-age=0');
    exit;
}

$isHead = ($_SERVER['REQUEST_METHOD'] === 'HEAD');
$slug = $_GET['slug'] ?? '';

try {
    require_once __DIR__ . '/bootstrap.php';
    require_once __DIR__ . '/core/SeoPageRenderer.php';

    if (!preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/', $slug)) {
        $body = SeoPageRenderer::renderEventPage(null);
        http_response_code(404);
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
        if (!$isHead) {
            echo $body;
        }
        exit;
    }

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
        $body = SeoPageRenderer::renderEventPage($event);
        http_response_code(200);
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
        if (!$isHead) {
            echo $body;
        }
    } else {
        $body = SeoPageRenderer::renderEventPage(null);
        http_response_code(404);
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
        if (!$isHead) {
            echo $body;
        }
    }
} catch (\Throwable $e) {
    error_log("SEO Event Error: " . $e->getMessage());
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store, max-age=0');
    if (!$isHead) {
        if (class_exists('Core\SeoPageRenderer') && method_exists('Core\SeoPageRenderer', 'renderStandaloneErrorPage')) {
            echo \Core\SeoPageRenderer::renderStandaloneErrorPage();
        } else {
            echo '<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Hizmet Kullanılamıyor | SO3 Personal Training</title>
    <meta name="robots" content="noindex, nofollow">
</head>
<body>
    <h1>Hizmet Kullanılamıyor</h1>
    <p>Şu anda sayfa yüklenemiyor. Lütfen daha sonra tekrar deneyin.</p>
</body>
</html>';
        }
    }
}
