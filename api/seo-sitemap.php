<?php

define('SO3_SKIP_SESSION', true);

try {
    require_once __DIR__ . '/bootstrap.php';
    use Core\Database;

    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
        http_response_code(405);
        header('Allow: GET, HEAD');
        header('Cache-Control: no-store, max-age=0');
        exit('Method Not Allowed');
    }

    $isHead = ($_SERVER['REQUEST_METHOD'] === 'HEAD');

    $db = Database::getInstance()->getConnection();
    
    $query = "
        SELECT slug, updated_at 
        FROM events 
        WHERE status = 'published' AND deleted_at IS NULL
        ORDER BY updated_at DESC
    ";
    
    $stmt = $db->query($query);
    $events = $stmt->fetchAll(\PDO::FETCH_ASSOC);
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    
    $urls = [
        ['loc' => 'https://so3pt.com.tr/', 'lastmod' => date('Y-m-d')],
        ['loc' => 'https://so3pt.com.tr/etkinlikler', 'lastmod' => date('Y-m-d')]
    ];
    
    foreach ($urls as $u) {
        $xml .= "  <url>\n";
        $xml .= "    <loc>" . htmlspecialchars($u['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</loc>\n";
        $xml .= "    <lastmod>" . htmlspecialchars($u['lastmod'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</lastmod>\n";
        $xml .= "  </url>\n";
    }
    
    foreach ($events as $event) {
        $slug = $event['slug'];
        if (!preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/', $slug)) {
            error_log("Sitemap generation skipped invalid slug: " . $slug);
            continue;
        }
        $loc = "https://so3pt.com.tr/etkinlikler/" . $slug;
        $date = !empty($event['updated_at']) ? substr($event['updated_at'], 0, 10) : date('Y-m-d');
        
        $xml .= "  <url>\n";
        $xml .= "    <loc>" . htmlspecialchars($loc, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</loc>\n";
        $xml .= "    <lastmod>" . htmlspecialchars($date, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</lastmod>\n";
        $xml .= "  </url>\n";
    }
    
    $xml .= '</urlset>';

    http_response_code(200);
    header('Content-Type: application/xml; charset=UTF-8');
    header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
    
    if (!$isHead) {
        echo $xml;
    }

} catch (\Throwable $e) {
    http_response_code(503);
    header('Cache-Control: no-store, max-age=0');
    exit;
}
