<?php
namespace Core;

class MediaHelper
{
    public static function appendUrls(&$asset) {
        if (!$asset) return;
        $baseUrl = rtrim($_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'], '/');
        if (isset($asset['storage_path'])) {
            $asset['url'] = $asset['storage_path'] ? $baseUrl . '/' . $asset['storage_path'] : null;
            unset($asset['storage_path']);
        }
        if (array_key_exists('thumbnail_path', $asset)) {
            $asset['thumbnail_url'] = $asset['thumbnail_path'] ? $baseUrl . '/' . $asset['thumbnail_path'] : null;
            unset($asset['thumbnail_path']);
        }
    }

    public static function appendUrlsToArray(&$assets) {
        if (!is_array($assets)) return;
        foreach ($assets as &$asset) {
            self::appendUrls($asset);
        }
    }
}
