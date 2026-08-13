<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;

class AdminHomepageController {
    
    private const ALLOWED_SECTIONS = [
        'hero',
        'brand_band',
        'branches',
        'about',
        'why_so3',
        'process',
        'trainers',
        'performance',
        'community',
        'instagram',
        'tour',
        'contact'
    ];

    private function getAdminId() {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
            Response::error('Oturum bilgisi eksik.', 'UNAUTHORIZED', 401);
        }
        return $adminId;
    }

    private function getJsonInput() {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
            Response::error('Geçersiz JSON verisi.', 'BAD_REQUEST', 400);
        }
        return $input;
    }


    private const EDITABLE_SECTIONS = ['hero', 'brand_band', 'about'];

    private const DEFAULTS = [
        'hero' => [
            'eyebrow' => 'SO3 / PERSONAL TRAINING',
            'headline_primary' => 'Herkese göre değil.',
            'headline_emphasis' => 'SANA GÖRE.',
            'support_text' => 'Kalabalığa değil, gelişimine odaklan.',
            'feature_left' => 'Kişiye özel antrenman',
            'feature_right' => 'Birebir takip',
            'primary_cta_label' => 'Ön görüşme planla',
            'primary_cta_target' => '/#iletisim',
            'secondary_cta_label' => 'SO3'ü keşfet',
            'secondary_cta_target' => '/#branslar',
            'background_media_id' => null
        ],
        'brand_band' => [
            'items' => [
                'Kişisel Diyetisyen ve Beslenme Programı',
                'Supplement Danışmanlığı',
                'Birebir Dersler',
                'Kişiye Özel Program',
                'Özel Etkinlikler',
                'Profesyonel Eğitmenler'
            ]
        ],
        'about' => [
            'eyebrow' => 'SO3 HAKKINDA',
            'headline_primary' => 'Kişiye Özel Bir',
            'headline_emphasis' => 'Antrenman Süreci',
            'paragraph_primary' => 'SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.',
            'paragraph_secondary' => 'SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer.',
            'youtube_video_id' => '0ojUK4qD8yE',
            'youtube_title' => 'SO3 PT Tanıtım Filmi'
        ]
    ];

    public function getContent(string $section_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        if (!in_array($section_id, self::ALLOWED_SECTIONS)) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }
        if (!in_array($section_id, self::EDITABLE_SECTIONS)) {
            Response::error('Bu bölüm henüz düzenlenemez.', 'CONTENT_NOT_EDITABLE', 422);
        }

        $db = Database::getInstance();
        $record = $db->fetch("SELECT id, content_json, updated_at FROM homepage_sections WHERE section_id = ?", [$section_id]);
        if (!$record) {
            Response::error('Bölüm bulunamadı.', 'NOT_FOUND', 404);
        }

        $stored = json_decode($record['content_json'], true) ?: [];
        $merged = array_merge(self::DEFAULTS[$section_id], $stored);

        // API envelope fix: do not double wrap, but match the requirement:
        // { "data": { "section_id": "...", "content": {}, "updated_at": "..." } }
        // Response::json() wraps in "data" by default, so we pass just the inner object.
        Response::json([
            'section_id' => $section_id,
            'content' => $merged,
            'updated_at' => $record['updated_at']
        ]);
    }

    public function updateContent(string $section_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();

        if (!in_array($section_id, self::ALLOWED_SECTIONS)) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }
        if (!in_array($section_id, self::EDITABLE_SECTIONS)) {
            Response::error('Bu bölüm henüz düzenlenemez.', 'CONTENT_NOT_EDITABLE', 422);
        }

        $input = $this->getJsonInput();
        if (!isset($input['content']) || !is_array($input['content'])) {
            Response::error('Geçersiz veri formatı. content objesi gerekli.', 'VALIDATION_ERROR', 422);
        }

        $content = $input['content'];
        $validated = [];
        $defaults = self::DEFAULTS[$section_id];
        
        $db = Database::getInstance();
        $record = $db->fetch("SELECT id, content_json FROM homepage_sections WHERE section_id = ?", [$section_id]);
        if (!$record) {
            Response::error('Bölüm bulunamadı.', 'NOT_FOUND', 404);
        }
        $sectionDbId = $record['id'];
        $oldStored = json_decode($record['content_json'], true) ?: [];
        $oldMerged = array_merge($defaults, $oldStored);

        $oldMediaId = null;
        $newMediaId = null;

        if ($section_id === 'hero') {
            $validated['eyebrow'] = mb_substr(trim($content['eyebrow'] ?? $defaults['eyebrow']), 0, 80);
            $validated['headline_primary'] = mb_substr(trim($content['headline_primary'] ?? ''), 0, 100);
            $validated['headline_emphasis'] = mb_substr(trim($content['headline_emphasis'] ?? ''), 0, 100);
            $validated['support_text'] = mb_substr(trim($content['support_text'] ?? $defaults['support_text']), 0, 180);
            $validated['feature_left'] = mb_substr(trim($content['feature_left'] ?? $defaults['feature_left']), 0, 80);
            $validated['feature_right'] = mb_substr(trim($content['feature_right'] ?? $defaults['feature_right']), 0, 80);
            
            $validated['primary_cta_label'] = mb_substr(trim($content['primary_cta_label'] ?? $defaults['primary_cta_label']), 0, 60);
            $validated['secondary_cta_label'] = mb_substr(trim($content['secondary_cta_label'] ?? $defaults['secondary_cta_label']), 0, 60);
            
            $pcta = trim($content['primary_cta_target'] ?? $defaults['primary_cta_target']);
            $scta = trim($content['secondary_cta_target'] ?? $defaults['secondary_cta_target']);
            
            if (empty($validated['headline_primary']) || empty($validated['headline_emphasis'])) {
                Response::error('Ana başlık ve vurgulu başlık zorunludur.', 'VALIDATION_ERROR', 422);
            }
            if (!preg_match('#^/(?:[a-zA-Z0-9\-\_]+)*(?:\#[a-zA-Z0-9\-\_]+)?$#', $pcta)) {
                $pcta = '/';
            }
            if (!preg_match('#^/(?:[a-zA-Z0-9\-\_]+)*(?:\#[a-zA-Z0-9\-\_]+)?$#', $scta)) {
                $scta = '/';
            }
            $validated['primary_cta_target'] = mb_substr($pcta, 0, 200);
            $validated['secondary_cta_target'] = mb_substr($scta, 0, 200);

            $bgId = $content['background_media_id'] ?? null;
            if ($bgId !== null) {
                if (!is_numeric($bgId)) {
                    Response::error('Geçersiz medya ID.', 'VALIDATION_ERROR', 422);
                }
                $media = $db->fetch("SELECT id FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$bgId]);
                if (!$media) {
                    Response::error('Geçersiz veya silinmiş medya.', 'VALIDATION_ERROR', 422);
                }
                $validated['background_media_id'] = (int)$bgId;
            } else {
                $validated['background_media_id'] = null;
            }

            $oldMediaId = $oldMerged['background_media_id'] ?? null;
            $newMediaId = $validated['background_media_id'];
        }
        elseif ($section_id === 'brand_band') {
            $items = $content['items'] ?? [];
            if (!is_array($items) || count($items) < 1 || count($items) > 12) {
                Response::error('1 ile 12 arasında madde eklemelisiniz.', 'VALIDATION_ERROR', 422);
            }
            $cleanItems = [];
            foreach ($items as $item) {
                if (!is_string($item)) {
                    Response::error('Geçersiz veri tipi.', 'VALIDATION_ERROR', 422);
                }
                $t = trim($item);
                if (mb_strlen($t) < 1 || mb_strlen($t) > 100) {
                    Response::error('Her madde 1-100 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                // Case-insensitive duplicate check
                $lower = mb_strtolower($t);
                $isDup = false;
                foreach ($cleanItems as $c) {
                    if (mb_strtolower($c) === $lower) {
                        $isDup = true;
                        break;
                    }
                }
                if (!$isDup) {
                    $cleanItems[] = $t;
                }
            }
            if (count($cleanItems) < 1) {
                Response::error('En az 1 geçerli madde gerekli.', 'VALIDATION_ERROR', 422);
            }
            $validated['items'] = $cleanItems;
        }
        elseif ($section_id === 'about') {
            $validated['eyebrow'] = mb_substr(trim($content['eyebrow'] ?? $defaults['eyebrow']), 0, 80);
            $validated['headline_primary'] = mb_substr(trim($content['headline_primary'] ?? $defaults['headline_primary']), 0, 120);
            $validated['headline_emphasis'] = mb_substr(trim($content['headline_emphasis'] ?? $defaults['headline_emphasis']), 0, 120);
            $validated['paragraph_primary'] = mb_substr(trim($content['paragraph_primary'] ?? $defaults['paragraph_primary']), 0, 1200);
            $validated['paragraph_secondary'] = mb_substr(trim($content['paragraph_secondary'] ?? $defaults['paragraph_secondary']), 0, 1200);
            $validated['youtube_title'] = mb_substr(trim($content['youtube_title'] ?? $defaults['youtube_title']), 0, 120);
            
            $yid = trim($content['youtube_video_id'] ?? $defaults['youtube_video_id']);
            if ($yid !== '' && !preg_match('/^[A-Za-z0-9_-]{6,20}$/', $yid)) {
                Response::error('Geçersiz YouTube Video ID.', 'VALIDATION_ERROR', 422);
            }
            $validated['youtube_video_id'] = $yid;
        }

        try {
            $db->beginTransaction();

            $db->query(
                "UPDATE homepage_sections SET content_json = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
                [json_encode($validated, JSON_UNESCAPED_UNICODE), $adminId, $sectionDbId]
            );

            if ($section_id === 'hero' && $oldMediaId !== $newMediaId) {
                if ($oldMediaId) {
                    $db->query(
                        "DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'homepage_section' AND entity_id = ? AND field_name = 'background'",
                        [$oldMediaId, $sectionDbId]
                    );
                }
                if ($newMediaId) {
                    $db->query(
                        "INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'homepage_section', ?, 'background')",
                        [$newMediaId, $sectionDbId]
                    );
                }
            }

            $db->commit();

            // Detect changed fields for audit
            $changed = [];
            foreach ($validated as $k => $v) {
                $ov = $oldMerged[$k] ?? null;
                // strict compare arrays/values
                if ($v !== $ov) {
                    $changed[] = $k;
                }
            }

            AuditLogger::log(
                'homepage.section.content.update',
                $adminId,
                'homepage_section',
                $sectionDbId,
                [
                    'section_id' => $section_id,
                    'changed_fields' => $changed,
                    'old_media_id' => $oldMediaId,
                    'new_media_id' => $newMediaId
                ]
            );

            Response::json(['success' => true]);

        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error('İçerik güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        $db = Database::getInstance();
        $sections = $db->fetchAll(
            "SELECT section_id, is_active, sort_order, updated_at 
             FROM homepage_sections 
             ORDER BY sort_order ASC"
        );

        // API envelope fix: do not double wrap
        Response::json($sections);
    }

    public function update(string $section_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();

        if (!in_array($section_id, self::ALLOWED_SECTIONS)) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }

        $input = $this->getJsonInput();

        // Strict JSON boolean validation, and reject extra fields
        if (count($input) !== 1 || !array_key_exists('is_active', $input) || !is_bool($input['is_active'])) {
            Response::error('Sadece boolean is_active alanı gönderilebilir.', 'VALIDATION_ERROR', 422);
        }

        $db = Database::getInstance();
        $is_active = $input['is_active'] ? 1 : 0;
        
        $current = $db->fetch(
            "SELECT is_active FROM homepage_sections WHERE section_id = ?", 
            [$section_id]
        );
        
        if (!$current) {
            Response::error('Bölüm bulunamadı.', 'NOT_FOUND', 404);
        }

        $old_is_active = (bool)$current['is_active'];

        $db->query(
            "UPDATE homepage_sections 
             SET is_active = ?, updated_by = ?, updated_at = NOW() 
             WHERE section_id = ?",
            [$is_active, $adminId, $section_id]
        );

        AuditLogger::log(
            'homepage.section.toggle',
            $adminId,
            'homepage_section',
            $section_id,
            [
                'old_is_active' => $old_is_active,
                'new_is_active' => (bool)$is_active
            ]
        );

        Response::json(['success' => true]);
    }

    public function reorder() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();

        $input = $this->getJsonInput();
        
        if (!isset($input['sections']) || !is_array($input['sections'])) {
            Response::error('Geçersiz veri formatı.', 'VALIDATION_ERROR', 422);
        }

        $sections = $input['sections'];
        
        if (count($sections) !== count(self::ALLOWED_SECTIONS)) {
            Response::error('Eksik veya fazla bölüm gönderildi.', 'VALIDATION_ERROR', 422);
        }

        // Validate that every item is a string before any string operations
        foreach ($sections as $sec) {
            if (!is_string($sec)) {
                Response::error('Geçersiz bölüm tipi, metin olmalıdır.', 'VALIDATION_ERROR', 422);
            }
        }

        $diff1 = array_diff($sections, self::ALLOWED_SECTIONS);
        $diff2 = array_diff(self::ALLOWED_SECTIONS, $sections);
        
        if (!empty($diff1) || !empty($diff2)) {
            Response::error('Bölüm listesi hatalı (tanımsız bölüm).', 'VALIDATION_ERROR', 422);
        }

        if (count(array_unique($sections)) !== count($sections)) {
            Response::error('Tekrarlayan bölümler mevcut.', 'VALIDATION_ERROR', 422);
        }

        $db = Database::getInstance();
        
        // Fetch old order for audit logger
        $oldRecords = $db->fetchAll("SELECT section_id FROM homepage_sections ORDER BY sort_order ASC");
        $oldOrder = array_column($oldRecords, 'section_id');

        try {
            $db->beginTransaction();

            $order = 10;
            foreach ($sections as $section_id) {
                $db->query(
                    "UPDATE homepage_sections SET sort_order = ?, updated_by = ?, updated_at = NOW() WHERE section_id = ?",
                    [$order, $adminId, $section_id]
                );
                $order += 10;
            }

            $db->commit();

            AuditLogger::log(
                'homepage.sections.reorder',
                $adminId,
                'homepage',
                null,
                [
                    'old_order' => $oldOrder,
                    'new_order' => $sections
                ]
            );

            Response::json(['success' => true]);
        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error('Sıralama güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
}
