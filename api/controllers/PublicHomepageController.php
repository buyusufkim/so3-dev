<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\MediaHelper;

class PublicHomepageController
{
    private $db;



    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function index()
    {
        $allowedList = "'" . implode("','", AdminHomepageController::getAllowedSections()) . "'";

        $sql = "SELECT section_id
                FROM homepage_sections
                WHERE is_active = 1
                  AND section_id IN ($allowedList)
                ORDER BY sort_order ASC, id ASC";

        $stmt = $this->db->query($sql);
        $sections = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $result = [];
        foreach ($sections as $section) {
            $result[] = [
                'section_id' => $section['section_id']
            ];
        }

        Response::json($result);
    }


    private function resolvePublicBackground(?int $mediaId): ?array
    {
        if (!$mediaId) {
            return null;
        }
        $mediaSql = "SELECT id, storage_path, thumbnail_path, alt_text FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL";
        $mStmt = $this->db->prepare($mediaSql);
        $mStmt->execute([$mediaId]);
        $media = $mStmt->fetch(\PDO::FETCH_ASSOC);

        if ($media) {
            MediaHelper::appendUrls($media);
            return [
                'url' => $media['url'] ?? null,
                'thumbnail_url' => $media['thumbnail_url'] ?? null,
                'alt_text' => $media['alt_text'] ?? null
            ];
        }
        return null;
    }

    public function content()
    {
        $editableSections = AdminHomepageController::getEditableSections();
        $allowedList = "'" . implode("','", $editableSections) . "'";

        $sql = "SELECT section_id, content_json
                FROM homepage_sections
                WHERE section_id IN ($allowedList)";

        $stmt = $this->db->query($sql);
        $sections = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $rawStored = [];
        foreach ($editableSections as $sec) {
            $rawStored[$sec] = [];
        }
        foreach ($sections as $row) {
            $decoded = json_decode($row['content_json'], true);
            if (!is_array($decoded)) {
                $decoded = [];
            }
            $rawStored[$row['section_id']] = $decoded;
        }

        $result = [];

        foreach ($editableSections as $secId) {
            $normalized = AdminHomepageController::normalizeStoredContent($secId, $rawStored[$secId]);

            if (in_array($secId, ['hero', 'performance'], true)) {
                $mediaId = $normalized['background_media_id'] ?? null;
                unset($normalized['background_media_id']);
                $normalized['background'] = $this->resolvePublicBackground($mediaId);
            }

            $result[$secId] = $normalized;
        }

        Response::json($result);
    }
}
