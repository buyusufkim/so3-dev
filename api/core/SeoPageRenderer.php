<?php

namespace Core;

class SeoPageRenderer {
    public static function renderEventPage(?array $event): string {
        $distPath = __DIR__ . '/../../dist/index.html';
        if (!file_exists($distPath)) {
            return "<html><body>Build not found.</body></html>";
        }
        $html = file_get_contents($distPath);
        
        $html = preg_replace('/<title>.*?<\/title>/si', '', $html);
        $html = preg_replace('/<meta\s+name="description"[^>]*>/i', '', $html);
        $html = preg_replace('/<link\s+rel="canonical"[^>]*>/i', '', $html);
        $html = preg_replace('/<meta\s+name="robots"[^>]*>/i', '', $html);
        $html = preg_replace('/<meta\s+property="og:[^"]+"[^>]*>/i', '', $html);
        $html = preg_replace('/<meta\s+name="twitter:[^"]+"[^>]*>/i', '', $html);
        $html = preg_replace('/<script\b[^>]*\bid=["\']so3-home-jsonld["\'][^>]*>[\s\S]*?<\/script>/i', '', $html);
        
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
            
            if (!empty($event['cover_path'])) {
                $ogImage = "https://so3pt.com.tr" . $event['cover_path'];
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
        
        $html = str_replace('</head>', $meta . '</head>', $html);
        return $html;
    }
}
