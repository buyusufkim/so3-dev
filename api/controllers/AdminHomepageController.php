<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use Core\MediaHelper;

class AdminHomepageController {
    
    private const SECTION_DEFINITIONS = [
        'hero' => ['editable' => true],
        'brand_band' => ['editable' => true],
        'branches' => ['editable' => true],
        'about' => ['editable' => true],
        'why_so3' => ['editable' => true],
        'process' => ['editable' => true],
        'trainers' => ['editable' => true],
        'performance' => ['editable' => true],
        'community' => ['editable' => true],
        'instagram' => ['editable' => true],
        'tour' => ['editable' => true],
        'contact' => ['editable' => true],
    ];

    public static function getAllowedSections(): array {
        return array_keys(self::SECTION_DEFINITIONS);
    }

    private function containsHtmlMarkup($value): bool {
        if (is_string($value)) {
            return preg_match('/<\/?[a-zA-Z][^>]*>/', $value) === 1;
        }
        if (is_array($value)) {
            foreach ($value as $item) {
                if ($this->containsHtmlMarkup($item)) {
                    return true;
                }
            }
        }
        return false;
    }

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


    public static function getEditableSections(): array {
        $editable = [];
        foreach (self::SECTION_DEFINITIONS as $id => $meta) {
            if (($meta['editable'] ?? false) === true) {
                $editable[] = $id;
            }
        }
        return $editable;
    }

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
            'secondary_cta_label' => 'SO3\'ü keşfet',
            'secondary_cta_target' => '/#branslar',
            'background_media_id' => null
        ],
                                                        'contact' => [
            'contact_eyebrow' => 'SO3 / İLETİŞİM',
            'contact_headline_primary' => 'SO3\'e',
            'contact_headline_emphasis' => 'ulaş.',
            'directions_cta_label' => 'Yol Tarifi Al',
            'consultation_eyebrow' => 'SO3 / ÖN GÖRÜŞME',
            'consultation_headline_primary' => 'Önce seni',
            'consultation_headline_emphasis' => 'tanıyalım.',
            'consultation_intro_primary' => 'Hedefini ve hangi alanda çalışmak istediğini konuşarak başlayalım.',
            'consultation_intro_secondary' => 'Nereden başlayacağını bilmiyorsan sorun değil. Birlikte değerlendirebiliriz.'
        ],
        'tour' => [
            'eyebrow' => '360° SANAL TUR',
            'headline' => 'SO3\'ün içinde dolaş.',
            'intro' => 'Antrenman alanlarını gelmeden önce sanal turla keşfet.'
        ],
        'instagram' => [
            'eyebrow' => 'SO3 / REELS',
            'headline' => 'SO3\'ü takip et.',
            'intro' => 'Güncel motivasyon, antrenman kesitleri ve SO3 topluluğundan anlar için Instagram\'da bize katılın.',
            'cta_label' => 'Instagram\'da Takip Et',
            'placeholder_text' => 'En güncel Reels videolarımızı Instagram hesabımız üzerinden hemen izleyebilirsiniz.',
            'reels' => []
        ],
        'community' => [
            'eyebrow' => 'SO3 / TOPLULUK',
            'headline' => 'SO3 Ailesi Çok Sosyal',
            'intro' => 'SO3 topluluğu; kano, doğa yürüyüşü, voleybol ve piknik gibi etkinliklerle salon dışında da bir araya gelir.',
            'cta_label' => 'Tüm Etkinlikleri Keşfet'
        ],
        'trainers' => [
            'eyebrow' => 'SO3 / EKİP',
            'headline' => 'Profesyonel Eğitim Kadrosu',
            'intro' => 'SO3 antrenör kadromuzla tanışın.'
        ],
        'branches' => [
            'eyebrow' => 'SO3 / BRANŞLAR',
            'headline_primary' => 'Sana uygun olanı seç.',
            'headline_emphasis' => 'Harekete geç.',
            'gallery_cta_label' => 'Galeriyi Gör'
        ],
        'performance' => [
            'headline_primary' => 'PERFORMANS',
            'headline_emphasis' => 'TESADÜF DEĞİLDİR.',
            'description' => 'Disiplinli çalışma, düzenli takip ve gelişime odaklanan yaklaşım SO3 kültürünün bir parçasıdır.',
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
        ],
        'why_so3' => [
            'eyebrow' => 'NEDEN SO3',
            'headline_primary' => 'Tek tip program yok.',
            'headline_emphasis' => 'Sana göre bir sistem var.',
            'intro' => 'SO3\'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.',
            'items' => [
                ['title' => 'Birebir Takip', 'description' => 'Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler.'],
                ['title' => 'Kişiye Özel Program', 'description' => 'Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır.'],
                ['title' => 'Süreç Takibi', 'description' => 'Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir.'],
                ['title' => 'Gelişime Göre Güncel', 'description' => 'Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir.']
            ]
        ],
        'process' => [
            'eyebrow' => 'NASIL ÇALIŞIR?',
            'headline_primary' => '',
            'headline_emphasis' => '',
            'steps' => [
                ['title' => 'Seni tanırız.'],
                ['title' => 'Sana göre planlarız.'],
                ['title' => 'Birlikte çalışırız.'],
                ['title' => 'Sen geliştikçe süreci güncelleriz.']
            ]
        ]
    ];

    private static function normalizeInstagramUrl(string $url): ?string {
        $parsed = parse_url($url);
        if (!$parsed || !isset($parsed['scheme']) || !isset($parsed['host']) || !isset($parsed['path'])) {
            return null;
        }
        
        if (strtolower($parsed['scheme']) !== 'https') {
            return null;
        }
        
        $host = strtolower($parsed['host']);
        if ($host !== 'instagram.com' && $host !== 'www.instagram.com') {
            return null;
        }
        
        if (isset($parsed['user']) || isset($parsed['pass']) || isset($parsed['port'])) {
            return null;
        }
        
        if (preg_match('#^/(reel|p)/([A-Za-z0-9_-]+)/?$#', $parsed['path'], $matches)) {
            $type = $matches[1];
            $shortcode = $matches[2];
            return "https://www.instagram.com/{$type}/{$shortcode}/";
        }
        
        return null;
    }

    public static function normalizeStoredContent(string $section_id, array $stored): array {
        $defaults = self::DEFAULTS[$section_id];
            $merged = [];
            foreach ($defaults as $k => $v) {
                if (array_key_exists($k, $stored)) {
                    $storedVal = $stored[$k];
                    if (in_array($section_id, ['hero', 'performance'], true) && $k === 'background_media_id') {
                        if (is_null($storedVal)) {
                            $merged[$k] = null;
                        } elseif (is_int($storedVal) && $storedVal > 0) {
                            $merged[$k] = $storedVal;
                        } else {
                            $merged[$k] = $v;
                        }
                    } elseif (is_array($v)) {
                        if ($section_id === 'instagram' && $k === 'reels') {
                            $validReels = [];
                            if (is_array($storedVal)) {
                                foreach ($storedVal as $reel) {
                                    if (is_string($reel)) {
                                        $normalized = self::normalizeInstagramUrl(trim($reel));
                                        if ($normalized && !in_array($normalized, $validReels, true)) {
                                            $validReels[] = $normalized;
                                        }
                                    }
                                }
                            }
                            $merged[$k] = array_slice($validReels, 0, 6);
                        } elseif ($section_id === 'why_so3' && $k === 'items') {
                            $validItems = [];
                            if (is_array($storedVal) && count($storedVal) >= 1 && count($storedVal) <= 6) {
                                $allValid = true;
                                foreach ($storedVal as $item) {
                                    if (!is_array($item)) { $allValid = false; break; }
                                    $keys = array_keys($item);
                                    sort($keys);
                                    if ($keys !== ['description', 'title']) { $allValid = false; break; }
                                    if (!is_string($item['title']) || !is_string($item['description'])) { $allValid = false; break; }
                                    $t = trim($item['title']);
                                    $d = trim($item['description']);
                                    if (mb_strlen($t) < 1 || mb_strlen($t) > 100 || mb_strlen($d) < 1 || mb_strlen($d) > 500) { $allValid = false; break; }
                                    $validItems[] = ['title' => $t, 'description' => $d];
                                }
                                if ($allValid && count($validItems) > 0) {
                                    $merged[$k] = $validItems;
                                } else {
                                    $merged[$k] = $v;
                                }
                            } else {
                                $merged[$k] = $v;
                            }
                        } elseif ($section_id === 'process' && $k === 'steps') {
                            $validSteps = [];
                            if (is_array($storedVal) && count($storedVal) >= 1 && count($storedVal) <= 8) {
                                $allValid = true;
                                foreach ($storedVal as $step) {
                                    if (!is_array($step)) { $allValid = false; break; }
                                    $keys = array_keys($step);
                                    if ($keys !== ['title']) { $allValid = false; break; }
                                    if (!is_string($step['title'])) { $allValid = false; break; }
                                    $t = trim($step['title']);
                                    if (mb_strlen($t) < 1 || mb_strlen($t) > 180) { $allValid = false; break; }
                                    $validSteps[] = ['title' => $t];
                                }
                                if ($allValid && count($validSteps) > 0) {
                                    $merged[$k] = $validSteps;
                                } else {
                                    $merged[$k] = $v;
                                }
                            } else {
                                $merged[$k] = $v;
                            }
                        } elseif ($section_id === 'brand_band' && $k === 'items') {
                            $validItems = [];
                            if (is_array($storedVal) && count($storedVal) >= 1 && count($storedVal) <= 12) {
                                $allValid = true;
                                foreach ($storedVal as $item) {
                                    if (!is_string($item)) { $allValid = false; break; }
                                    $t = trim($item);
                                    if (mb_strlen($t) < 1 || mb_strlen($t) > 100) { $allValid = false; break; }
                                    $validItems[] = $t;
                                }
                                if ($allValid && count($validItems) > 0) {
                                    $merged[$k] = $validItems;
                                } else {
                                    $merged[$k] = $v;
                                }
                            } else {
                                $merged[$k] = $v;
                            }
                        } else {
                            $merged[$k] = $v;
                        }
                    } elseif (gettype($storedVal) === gettype($v)) {
                        $merged[$k] = $storedVal;
                    } else {
                        $merged[$k] = $v;
                    }
                } else {
                    $merged[$k] = $v;
                }
            }
        return $merged;
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        $allowedSections = self::getAllowedSections();
        $db = Database::getInstance();
        $sections = $db->fetchAll(
            "SELECT section_id, is_active, sort_order, updated_at
             FROM homepage_sections
             ORDER BY sort_order ASC, id ASC"
        );

        $sections = array_values(array_filter($sections, static function ($section) use ($allowedSections) {
            return is_array($section)
                && isset($section['section_id'])
                && is_string($section['section_id'])
                && in_array($section['section_id'], $allowedSections, true);
        }));

        foreach ($sections as &$section) {
            $section['is_active'] = (int)$section['is_active'];
            $section['sort_order'] = (int)$section['sort_order'];
        }
        unset($section);

        Response::json($sections);
    }

    public function update(string $section_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();

        if (!in_array($section_id, self::getAllowedSections(), true)) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }

        $input = $this->getJsonInput();
        if (count($input) !== 1 || !array_key_exists('is_active', $input) || !is_bool($input['is_active'])) {
            Response::error('Sadece boolean is_active alanı gönderilebilir.', 'VALIDATION_ERROR', 422);
        }

        $db = Database::getInstance();
        $current = $db->fetch(
            "SELECT id, is_active FROM homepage_sections WHERE section_id = ?",
            [$section_id]
        );

        if (!$current) {
            Response::error('Bölüm bulunamadı.', 'NOT_FOUND', 404);
        }

        $isActive = $input['is_active'] ? 1 : 0;
        $oldIsActive = (bool)$current['is_active'];

        $db->query(
            "UPDATE homepage_sections
             SET is_active = ?, updated_by = ?, updated_at = NOW()
             WHERE id = ?",
            [$isActive, $adminId, $current['id']]
        );

        AuditLogger::log(
            'homepage.section.toggle',
            $adminId,
            'homepage_section',
            (int)$current['id'],
            [
                'section_id' => $section_id,
                'old_is_active' => $oldIsActive,
                'new_is_active' => (bool)$isActive
            ]
        );

        Response::json(['success' => true]);
    }

    public function reorder() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();

        $input = $this->getJsonInput();
        if (count($input) !== 1 || !array_key_exists('sections', $input) || !is_array($input['sections'])) {
            Response::error('Sadece sections listesi gönderilebilir.', 'VALIDATION_ERROR', 422);
        }

        $sections = $input['sections'];
        $allowedSections = self::getAllowedSections();

        if (count($sections) !== count($allowedSections)) {
            Response::error('Eksik veya fazla bölüm gönderildi.', 'VALIDATION_ERROR', 422);
        }

        foreach ($sections as $sectionId) {
            if (!is_string($sectionId)) {
                Response::error('Geçersiz bölüm tipi, metin olmalıdır.', 'VALIDATION_ERROR', 422);
            }
        }

        if (count(array_unique($sections)) !== count($sections)
            || !empty(array_diff($sections, $allowedSections))
            || !empty(array_diff($allowedSections, $sections))) {
            Response::error('Bölüm listesi hatalı.', 'VALIDATION_ERROR', 422);
        }

        $db = Database::getInstance();
        $oldRecords = $db->fetchAll(
            "SELECT section_id FROM homepage_sections ORDER BY sort_order ASC, id ASC"
        );
        $oldOrder = array_values(array_filter(
            array_column($oldRecords, 'section_id'),
            static function ($sectionId) use ($allowedSections) {
                return is_string($sectionId) && in_array($sectionId, $allowedSections, true);
            }
        ));

        try {
            $db->beginTransaction();

            $order = 10;
            foreach ($sections as $sectionId) {
                $db->query(
                    "UPDATE homepage_sections
                     SET sort_order = ?, updated_by = ?, updated_at = NOW()
                     WHERE section_id = ?",
                    [$order, $adminId, $sectionId]
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
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error('Sıralama güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }

    public function getContent(string $section_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        if (!in_array($section_id, self::getAllowedSections())) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }
        if (!in_array($section_id, self::getEditableSections())) {
            Response::error('Bu bölüm henüz düzenlenemez.', 'CONTENT_NOT_EDITABLE', 422);
        }

        $db = Database::getInstance();
        $record = $db->fetch("SELECT id, content_json, updated_at FROM homepage_sections WHERE section_id = ?", [$section_id]);
        if (!$record) {
            Response::error('Bölüm bulunamadı.', 'NOT_FOUND', 404);
        }

        $stored = json_decode($record['content_json'], true);
        if (!is_array($stored)) {
            $stored = [];
        }
        
        $merged = self::normalizeStoredContent($section_id, $stored);

        $response = [
            'section_id' => $section_id,
            'content' => $merged,
            'updated_at' => $record['updated_at']
        ];

        if (in_array($section_id, ['hero', 'performance']) && !empty($merged['background_media_id'])) {
            $media = $db->fetch("SELECT id, storage_path, thumbnail_path, alt_text FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$merged['background_media_id']]);
            if ($media) {
                MediaHelper::appendUrls($media);
                $response['media'] = ['background' => $media];
            }
        }

        Response::json($response);
    }

    public function updateContent(string $section_id) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        $adminId = $this->getAdminId();

        if (!in_array($section_id, self::getAllowedSections())) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }
        if (!in_array($section_id, self::getEditableSections())) {
            Response::error('Bu bölüm henüz düzenlenemez.', 'CONTENT_NOT_EDITABLE', 422);
        }

        $input = $this->getJsonInput();
        if (count($input) !== 1 || !array_key_exists('content', $input) || !is_array($input['content'])) {
            Response::error('Geçersiz veri formatı. Sadece content objesi gönderilebilir.', 'VALIDATION_ERROR', 422);
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
        $oldStored = json_decode($record['content_json'], true);
        if (!is_array($oldStored)) {
            $oldStored = [];
        }
        $oldMerged = self::normalizeStoredContent($section_id, $oldStored);

        $oldMediaId = null;
        $newMediaId = null;

        $allowedKeys = array_keys($defaults);
        $extraKeys = array_diff(array_keys($content), $allowedKeys);
        if (!empty($extraKeys)) {
            Response::error('Geçersiz alanlar tespit edildi.', 'VALIDATION_ERROR', 422);
        }

        if ($section_id === 'hero') {
            foreach (['eyebrow', 'headline_primary', 'headline_emphasis', 'support_text', 'feature_left', 'feature_right', 'primary_cta_label', 'secondary_cta_label', 'primary_cta_target', 'secondary_cta_target'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline_primary'] = trim($content['headline_primary'] ?? '');
            $validated['headline_emphasis'] = trim($content['headline_emphasis'] ?? '');
            $validated['support_text'] = trim($content['support_text'] ?? $defaults['support_text']);
            $validated['feature_left'] = trim($content['feature_left'] ?? $defaults['feature_left']);
            $validated['feature_right'] = trim($content['feature_right'] ?? $defaults['feature_right']);
            $validated['primary_cta_label'] = trim($content['primary_cta_label'] ?? $defaults['primary_cta_label']);
            $validated['secondary_cta_label'] = trim($content['secondary_cta_label'] ?? $defaults['secondary_cta_label']);
            
            $pcta = trim($content['primary_cta_target'] ?? $defaults['primary_cta_target']);
            $scta = trim($content['secondary_cta_target'] ?? $defaults['secondary_cta_target']);
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline_primary']) > 100 || mb_strlen($validated['headline_emphasis']) > 100 || mb_strlen($validated['support_text']) > 180 || mb_strlen($validated['feature_left']) > 80 || mb_strlen($validated['feature_right']) > 80 || mb_strlen($validated['primary_cta_label']) > 60 || mb_strlen($validated['secondary_cta_label']) > 60 || mb_strlen($pcta) > 200 || mb_strlen($scta) > 200) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
            if (empty($validated['headline_primary']) || empty($validated['headline_emphasis'])) {
                Response::error('Ana başlık ve vurgulu başlık zorunludur.', 'VALIDATION_ERROR', 422);
            }
            if (!preg_match('#^/(?:[a-zA-Z0-9\-\_]+)*(?:\#[a-zA-Z0-9\-\_]+)?$#', $pcta)) {
                Response::error('Geçersiz birincil CTA URL.', 'VALIDATION_ERROR', 422);
            }
            if (!preg_match('#^/(?:[a-zA-Z0-9\-\_]+)*(?:\#[a-zA-Z0-9\-\_]+)?$#', $scta)) {
                Response::error('Geçersiz ikincil CTA URL.', 'VALIDATION_ERROR', 422);
            }
            $validated['primary_cta_target'] = $pcta;
            $validated['secondary_cta_target'] = $scta;

            if (array_key_exists('background_media_id', $content) && !is_null($content['background_media_id'])) {
                $bgId = $content['background_media_id'];
                if (!is_int($bgId) || $bgId <= 0) {
                    Response::error('Geçersiz medya ID.', 'VALIDATION_ERROR', 422);
                }
                $media = $db->fetch("SELECT id FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$bgId]);
                if (!$media) {
                    Response::error('Geçersiz veya silinmiş medya.', 'VALIDATION_ERROR', 422);
                }
                $validated['background_media_id'] = $bgId;
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
                $lower = mb_strtolower($t);
                foreach ($cleanItems as $c) {
                    if (mb_strtolower($c) === $lower) {
                        Response::error('Aynı hizmet tekrar eklenemez.', 'VALIDATION_ERROR', 422);
                    }
                }
                $cleanItems[] = $t;
            }
            $validated['items'] = $cleanItems;
        }
        elseif ($section_id === 'about') {
            foreach (['eyebrow', 'headline_primary', 'headline_emphasis', 'paragraph_primary', 'paragraph_secondary', 'youtube_title', 'youtube_video_id'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline_primary'] = trim($content['headline_primary'] ?? $defaults['headline_primary']);
            $validated['headline_emphasis'] = trim($content['headline_emphasis'] ?? $defaults['headline_emphasis']);
            $validated['paragraph_primary'] = trim($content['paragraph_primary'] ?? $defaults['paragraph_primary']);
            $validated['paragraph_secondary'] = trim($content['paragraph_secondary'] ?? $defaults['paragraph_secondary']);
            $validated['youtube_title'] = trim($content['youtube_title'] ?? $defaults['youtube_title']);
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline_primary']) > 120 || mb_strlen($validated['headline_emphasis']) > 120 || mb_strlen($validated['paragraph_primary']) > 1200 || mb_strlen($validated['paragraph_secondary']) > 1200 || mb_strlen($validated['youtube_title']) > 120) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
            $yid = trim($content['youtube_video_id'] ?? $defaults['youtube_video_id']);
            if ($yid !== '' && !preg_match('/^[A-Za-z0-9_-]{6,20}$/', $yid)) {
                Response::error('Geçersiz YouTube Video ID.', 'VALIDATION_ERROR', 422);
            }
            $validated['youtube_video_id'] = $yid;
        }
        elseif ($section_id === 'why_so3') {
            foreach (['eyebrow', 'headline_primary', 'headline_emphasis', 'intro'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline_primary'] = trim($content['headline_primary'] ?? $defaults['headline_primary']);
            $validated['headline_emphasis'] = trim($content['headline_emphasis'] ?? $defaults['headline_emphasis']);
            $validated['intro'] = trim($content['intro'] ?? $defaults['intro']);
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline_primary']) > 140 || mb_strlen($validated['headline_emphasis']) > 140 || mb_strlen($validated['intro']) > 400) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
            $items = $content['items'] ?? [];
            if (!is_array($items) || count($items) < 1 || count($items) > 6) {
                Response::error('1 ile 6 arasında madde eklemelisiniz.', 'VALIDATION_ERROR', 422);
            }
            $cleanItems = [];
            foreach ($items as $item) {
                if (!is_array($item)) {
                    Response::error('Geçersiz veri tipi.', 'VALIDATION_ERROR', 422);
                }
                
                $itemKeys = array_keys($item);
                sort($itemKeys);
                if ($itemKeys !== ['description', 'title']) {
                    Response::error('Geçersiz veri tipi. Fazla veya eksik anahtar.', 'VALIDATION_ERROR', 422);
                }

                if (!is_string($item['title']) || !is_string($item['description'])) {
                    Response::error('Geçersiz veri tipi. Metin olmalı.', 'VALIDATION_ERROR', 422);
                }

                $t = trim($item['title']);
                $d = trim($item['description']);
                if (mb_strlen($t) < 1 || mb_strlen($t) > 100 || mb_strlen($d) < 1 || mb_strlen($d) > 500) {
                    Response::error('Madde başlığı 1-100, açıklaması 1-500 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $cleanItems[] = ['title' => $t, 'description' => $d];
            }
            $validated['items'] = $cleanItems;
        }
        elseif ($section_id === 'process') {
            foreach (['eyebrow', 'headline_primary', 'headline_emphasis'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline_primary'] = trim($content['headline_primary'] ?? '');
            $validated['headline_emphasis'] = trim($content['headline_emphasis'] ?? '');
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline_primary']) > 140 || mb_strlen($validated['headline_emphasis']) > 140) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
            $steps = $content['steps'] ?? [];
            if (!is_array($steps) || count($steps) < 1 || count($steps) > 8) {
                Response::error('1 ile 8 arasında adım eklemelisiniz.', 'VALIDATION_ERROR', 422);
            }
            $cleanSteps = [];
            foreach ($steps as $step) {
                if (!is_array($step)) {
                    Response::error('Geçersiz veri tipi.', 'VALIDATION_ERROR', 422);
                }
                
                $stepKeys = array_keys($step);
                if ($stepKeys !== ['title']) {
                    Response::error('Geçersiz veri tipi. Fazla veya eksik anahtar.', 'VALIDATION_ERROR', 422);
                }
                
                if (!is_string($step['title'])) {
                    Response::error('Geçersiz veri tipi. Metin olmalı.', 'VALIDATION_ERROR', 422);
                }

                $t = trim($step['title']);
                if (mb_strlen($t) < 1 || mb_strlen($t) > 180) {
                    Response::error('Adım metni 1-180 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $cleanSteps[] = ['title' => $t];
            }
            $validated['steps'] = $cleanSteps;
        }

        elseif ($section_id === 'contact') {
            foreach (['contact_eyebrow', 'contact_headline_primary', 'contact_headline_emphasis', 'directions_cta_label', 'consultation_eyebrow', 'consultation_headline_primary', 'consultation_headline_emphasis', 'consultation_intro_primary', 'consultation_intro_secondary'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['contact_eyebrow'] = trim($content['contact_eyebrow'] ?? $defaults['contact_eyebrow']);
            $validated['contact_headline_primary'] = trim($content['contact_headline_primary'] ?? $defaults['contact_headline_primary']);
            $validated['contact_headline_emphasis'] = trim($content['contact_headline_emphasis'] ?? $defaults['contact_headline_emphasis']);
            $validated['directions_cta_label'] = trim($content['directions_cta_label'] ?? $defaults['directions_cta_label']);
            $validated['consultation_eyebrow'] = trim($content['consultation_eyebrow'] ?? $defaults['consultation_eyebrow']);
            $validated['consultation_headline_primary'] = trim($content['consultation_headline_primary'] ?? $defaults['consultation_headline_primary']);
            $validated['consultation_headline_emphasis'] = trim($content['consultation_headline_emphasis'] ?? $defaults['consultation_headline_emphasis']);
            $validated['consultation_intro_primary'] = trim($content['consultation_intro_primary'] ?? $defaults['consultation_intro_primary']);
            $validated['consultation_intro_secondary'] = trim($content['consultation_intro_secondary'] ?? $defaults['consultation_intro_secondary']);
            
            if (mb_strlen($validated['contact_eyebrow']) < 1 || mb_strlen($validated['contact_headline_primary']) < 1 || mb_strlen($validated['contact_headline_emphasis']) < 1 || mb_strlen($validated['consultation_eyebrow']) < 1 || mb_strlen($validated['consultation_headline_primary']) < 1 || mb_strlen($validated['consultation_headline_emphasis']) < 1) {
                Response::error('Gerekli alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['contact_eyebrow']) > 80 || mb_strlen($validated['contact_headline_primary']) > 120 || mb_strlen($validated['contact_headline_emphasis']) > 120 || mb_strlen($validated['directions_cta_label']) > 80 || mb_strlen($validated['consultation_eyebrow']) > 80 || mb_strlen($validated['consultation_headline_primary']) > 120 || mb_strlen($validated['consultation_headline_emphasis']) > 120 || mb_strlen($validated['consultation_intro_primary']) > 400 || mb_strlen($validated['consultation_intro_secondary']) > 400) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
        }
        elseif ($section_id === 'tour') {
            foreach (['eyebrow', 'headline', 'intro'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline'] = trim($content['headline'] ?? $defaults['headline']);
            $validated['intro'] = trim($content['intro'] ?? $defaults['intro']);
            
            if (mb_strlen($validated['eyebrow']) < 1 || mb_strlen($validated['headline']) < 1) {
                Response::error('Gerekli alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline']) > 160 || mb_strlen($validated['intro']) > 300) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
        }
        elseif ($section_id === 'instagram') {
            foreach (['eyebrow', 'headline', 'intro', 'cta_label', 'placeholder_text'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline'] = trim($content['headline'] ?? $defaults['headline']);
            $validated['intro'] = trim($content['intro'] ?? $defaults['intro']);
            $validated['cta_label'] = trim($content['cta_label'] ?? $defaults['cta_label']);
            $validated['placeholder_text'] = trim($content['placeholder_text'] ?? $defaults['placeholder_text']);
            
            if (mb_strlen($validated['eyebrow']) < 1 || mb_strlen($validated['headline']) < 1) {
                Response::error('Gerekli alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline']) > 160 || mb_strlen($validated['intro']) > 400 || mb_strlen($validated['cta_label']) > 80 || mb_strlen($validated['placeholder_text']) > 300) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
            
            $reels = $content['reels'] ?? [];
            if (!is_array($reels)) {
                Response::error('Reels verisi dizi formatında olmalıdır.', 'VALIDATION_ERROR', 422);
            }
            if (count($reels) > 6) {
                Response::error('En fazla 6 adet Reel eklenebilir.', 'VALIDATION_ERROR', 422);
            }
            
            $normalizedReels = [];
            foreach ($reels as $reelUrl) {
                if (!is_string($reelUrl)) {
                    Response::error('Reel URL metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $reelUrl = trim($reelUrl);
                if (empty($reelUrl)) continue;
                
                $normalizedUrl = self::normalizeInstagramUrl($reelUrl);
                if (!$normalizedUrl) {
                    Response::error('Geçersiz veya desteklenmeyen Instagram bağlantısı: ' . $reelUrl, 'VALIDATION_ERROR', 422);
                }
                
                if (!in_array($normalizedUrl, $normalizedReels, true)) {
                    $normalizedReels[] = $normalizedUrl;
                }
            }
            
            if (count($normalizedReels) > 6) {
                Response::error('En fazla 6 adet Reel eklenebilir.', 'VALIDATION_ERROR', 422);
            }
            
            $validated['reels'] = $normalizedReels;
        }
        elseif ($section_id === 'community') {
            foreach (['eyebrow', 'headline', 'intro', 'cta_label'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline'] = trim($content['headline'] ?? $defaults['headline']);
            $validated['intro'] = trim($content['intro'] ?? $defaults['intro']);
            $validated['cta_label'] = trim($content['cta_label'] ?? $defaults['cta_label']);
            
            if (mb_strlen($validated['eyebrow']) < 1 || mb_strlen($validated['headline']) < 1) {
                Response::error('Gerekli alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline']) > 160 || mb_strlen($validated['intro']) > 500 || mb_strlen($validated['cta_label']) > 80) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
        }
        elseif ($section_id === 'trainers') {
            foreach (['eyebrow', 'headline', 'intro'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline'] = trim($content['headline'] ?? $defaults['headline']);
            $validated['intro'] = trim($content['intro'] ?? $defaults['intro']);
            
            if (mb_strlen($validated['eyebrow']) < 1 || mb_strlen($validated['headline']) < 1) {
                Response::error('Gerekli alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline']) > 160 || mb_strlen($validated['intro']) > 300) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
        }
        elseif ($section_id === 'branches') {
            foreach (['eyebrow', 'headline_primary', 'headline_emphasis', 'gallery_cta_label'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['eyebrow'] = trim($content['eyebrow'] ?? $defaults['eyebrow']);
            $validated['headline_primary'] = trim($content['headline_primary'] ?? $defaults['headline_primary']);
            $validated['headline_emphasis'] = trim($content['headline_emphasis'] ?? $defaults['headline_emphasis']);
            $validated['gallery_cta_label'] = trim($content['gallery_cta_label'] ?? $defaults['gallery_cta_label']);
            
            if (mb_strlen($validated['eyebrow']) < 1 || mb_strlen($validated['headline_primary']) < 1 || mb_strlen($validated['headline_emphasis']) < 1) {
                Response::error('Gerekli alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['eyebrow']) > 80 || mb_strlen($validated['headline_primary']) > 140 || mb_strlen($validated['headline_emphasis']) > 140 || mb_strlen($validated['gallery_cta_label']) > 60) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
        }
        elseif ($section_id === 'performance') {
            foreach (['headline_primary', 'headline_emphasis', 'description'] as $field) {
                if (array_key_exists($field, $content) && !is_string($content[$field])) {
                    Response::error('Geçersiz veri tipi (' . $field . '). Sadece metin olmalıdır.', 'VALIDATION_ERROR', 422);
                }
            }
            $validated['headline_primary'] = trim($content['headline_primary'] ?? $defaults['headline_primary']);
            $validated['headline_emphasis'] = trim($content['headline_emphasis'] ?? $defaults['headline_emphasis']);
            $validated['description'] = trim($content['description'] ?? $defaults['description']);
            
            if (mb_strlen($validated['headline_primary']) < 1 || mb_strlen($validated['headline_emphasis']) < 1 || mb_strlen($validated['description']) < 1) {
                Response::error('Tüm alanların doldurulması zorunludur.', 'VALIDATION_ERROR', 422);
            }
            
            if (mb_strlen($validated['headline_primary']) > 140 || mb_strlen($validated['headline_emphasis']) > 140 || mb_strlen($validated['description']) > 500) {
                Response::error('Karakter sınırı aşıldı.', 'VALIDATION_ERROR', 422);
            }
            
            $mid = $content['background_media_id'] ?? null;
            if ($mid !== null) {
                if (!is_int($mid) || $mid <= 0) {
                    Response::error('Geçersiz görsel seçimi.', 'VALIDATION_ERROR', 422);
                }
                $mediaRecord = $db->fetch("SELECT id FROM media_assets WHERE id = ? AND media_type = 'image' AND status = 'active' AND deleted_at IS NULL", [$mid]);
                if (!$mediaRecord) {
                    Response::error('Seçilen görsel bulunamadı veya kullanılamaz durumda.', 'VALIDATION_ERROR', 422);
                }
                $validated['background_media_id'] = $mid;
            } else {
                $validated['background_media_id'] = null;
            }
            $oldMediaId = $oldMerged['background_media_id'];
            $newMediaId = $validated['background_media_id'];
        }

        if ($this->containsHtmlMarkup($validated)) {
            Response::error('HTML etiketleri desteklenmiyor.', 'VALIDATION_ERROR', 422);
        }

        try {
            $db->beginTransaction();

            $db->query(
                "UPDATE homepage_sections
                 SET content_json = ?, updated_by = ?, updated_at = NOW()
                 WHERE id = ?",
                [
                    json_encode($validated, JSON_UNESCAPED_UNICODE),
                    $adminId,
                    $sectionDbId
                ]
            );

            if (in_array($section_id, ['hero', 'performance']) && $oldMediaId !== $newMediaId) {
                if ($oldMediaId !== null) {
                    $db->query(
                        "DELETE FROM media_usages WHERE media_id = ? AND entity_type = 'homepage_section' AND entity_id = ? AND field_name = 'background'",
                        [$oldMediaId, $sectionDbId]
                    );
                }
                if ($newMediaId !== null) {
                    $db->query(
                        "INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field_name) VALUES (?, 'homepage_section', ?, 'background')",
                        [$newMediaId, $sectionDbId]
                    );
                }
            }

            $db->commit();
            
            $changed = [];
            foreach ($validated as $k => $v) {
                $ov = $oldMerged[$k] ?? null;
                if ($v !== $ov) {
                    $changed[] = $k;
                }
            }
            
            $auditData = [
                'section_id' => $section_id,
                'changed_fields' => $changed
            ];
            
            if (in_array($section_id, ['hero', 'performance']) && $oldMediaId !== $newMediaId) {
                $auditData['old_media_id'] = $oldMediaId;
                $auditData['new_media_id'] = $newMediaId;
            }

            AuditLogger::log(
                'homepage.section.content.update',
                $adminId,
                'homepage_section',
                $sectionDbId,
                $auditData
            );

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error('İçerik güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
}
