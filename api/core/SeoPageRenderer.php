<?php

namespace Core;

class SeoPageRenderer {
    public static function renderEventPage(?array $event): string {
        $distPath = dirname(__DIR__, 2) . '/index.html';
        if (!file_exists($distPath) || !is_readable($distPath)) {
            throw new \RuntimeException('Template missing or unreadable');
        }
        $html = file_get_contents($distPath);
        if (empty($html) || stripos($html, '</head>') === false) {
            throw new \RuntimeException('Template empty or missing </head>');
        }
        
        $replacements = [
            '/<title>.*?<\/title>/si',
            '/<meta\s+name="description"[^>]*>/i',
            '/<link\s+rel="canonical"[^>]*>/i',
            '/<meta\s+name="robots"[^>]*>/i',
            '/<meta\s+property="og:[^"]+"[^>]*>/i',
            '/<meta\s+name="twitter:[^"]+"[^>]*>/i',
            '/<script\b[^>]*\bid=["\']so3-home-jsonld["\'][^>]*>[\s\S]*?<\/script>/i'
        ];
        
        foreach ($replacements as $pattern) {
            $html = preg_replace($pattern, '', $html);
            if ($html === null) {
                throw new \RuntimeException('Regex replacement failed');
            }
        }
        
        $meta = "";
        
        if ($event) {
            $title = !empty($event['seo_title']) ? trim($event['seo_title']) : trim($event['title']) . ' | SO3 Personal Training';
            $description = !empty($event['seo_description']) ? trim($event['seo_description']) : trim($event['excerpt'] ?? '');
            
            $canonical = "https://so3pt.com.tr/etkinlikler/" . $event['slug'];
            
            $meta .= "<title>" . htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</title>\n";
            $meta .= "<meta name=\"description\" content=\"" . htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            $meta .= "<link rel=\"canonical\" href=\"" . htmlspecialchars($canonical, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            $meta .= "<meta name=\"robots\" content=\"index, follow\" />\n";
            $meta .= "<meta property=\"og:title\" content=\"" . htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            $meta .= "<meta property=\"og:description\" content=\"" . htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            $meta .= "<meta property=\"og:type\" content=\"article\" />\n";
            $meta .= "<meta property=\"og:url\" content=\"" . htmlspecialchars($canonical, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            
            $coverPath = $event['cover_path'] ?? '';
            $isValidCover = false;
            
            if (!empty($coverPath)) {
                $normalizedPath = ltrim($coverPath, '/');
                
                if (preg_match('/\A(?:uploads|media)\/[a-zA-Z0-9\.\_\-\/]+\z/', $normalizedPath)) {
                    $segments = explode('/', $normalizedPath);
                    $segmentCheck = true;
                    foreach ($segments as $segment) {
                        if ($segment === '' || $segment === '.' || $segment === '..') {
                            $segmentCheck = false;
                            break;
                        }
                    }
                    if ($segmentCheck) {
                        $isValidCover = true;
                        $ogImage = "https://so3pt.com.tr/" . $normalizedPath;
                    }
                }
            }

            if ($isValidCover) {
                $meta .= "<meta property=\"og:image\" content=\"" . htmlspecialchars($ogImage, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
                $meta .= "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n";
                $meta .= "<meta name=\"twitter:image\" content=\"" . htmlspecialchars($ogImage, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            } else {
                $meta .= "<meta name=\"twitter:card\" content=\"summary\" />\n";
            }
            $meta .= "<meta name=\"twitter:title\" content=\"" . htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            $meta .= "<meta name=\"twitter:description\" content=\"" . htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\" />\n";
            
        } else {
            $meta .= "<title>Sayfa Bulunamadı | SO3 Personal Training</title>\n";
            $meta .= "<meta name=\"robots\" content=\"noindex, follow\" />\n";
        }
        
        $count = 0;
        $html = preg_replace('/<\/head>/i', $meta . '</head>', $html, 1, $count);
        if ($html === null || $count !== 1) {
            throw new \RuntimeException('Failed to inject meta tags into head');
        }
        return $html;
    }

    public static function renderStandaloneErrorPage(): string {
        return '<!DOCTYPE html>
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
