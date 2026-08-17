<?php

require_once __DIR__ . '/bootstrap.php';
use Core\Database;

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    http_response_code(405);
    exit('Method Not Allowed');
}

try {
    $db = Database::getInstance()->getConnection();
    
    $query = "
        SELECT slug, updated_at 
        FROM events 
        WHERE status = 'published' AND deleted_at IS NULL
        ORDER BY updated_at DESC
    ";
    
    $stmt = $db->query($query);
    $events = $stmt->fetchAll(\PDO::FETCH_ASSOC);
    
    header('Content-Type: application/xml; charset=UTF-8');
    header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
    
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    
    $urls = [
        ['loc' => 'https://so3pt.com.tr/', 'lastmod' => date('Y-m-d')],
        ['loc' => 'https://so3pt.com.tr/etkinlikler', 'lastmod' => date('Y-m-d')]
    ];
    
    foreach ($urls as $u) {
        echo "  <url>\n";
        echo "    <loc>" . htmlspecialchars($u['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</loc>\n";
        echo "    <lastmod>" . htmlspecialchars($u['lastmod'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</lastmod>\n";
        echo "  </url>\n";
    }
    
    foreach ($events as $event) {
        $slug = $event['slug'];
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            error_log("Sitemap generation skipped invalid slug: " . $slug);
            continue;
        }
        $loc = "https://so3pt.com.tr/etkinlikler/" . $slug;
        $date = !empty($event['updated_at']) ? substr($event['updated_at'], 0, 10) : date('Y-m-d');
        
        echo "  <url>\n";
        echo "    <loc>" . htmlspecialchars($loc, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</loc>\n";
        echo "    <lastmod>" . htmlspecialchars($date, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</lastmod>\n";
        echo "  </url>\n";
    }
    
    echo '</urlset>';

} catch (\Exception $e) {
    http_response_code(503);
    exit;
}
