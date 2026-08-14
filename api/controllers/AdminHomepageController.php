<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use Core\MediaHelper;

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


    private const EDITABLE_SECTIONS = ['hero', 'brand_band', 'about', 'why_so3', 'process'];

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
                ['title' => 'Birebir Takip', 'description' => 'Antrenmanın her anında antrenör gözetiminde her bir tekrarda en doğru ve sağlıklı sonuç'],
                ['title' => 'Kişiye Özel Program', 'description' => 'Kalıplaşmış antrenman programları değil, size özel hazırlanmış en verimli antrenman programı ile çalışın'],
                ['title' => 'Özel Takip', 'description' => 'Antrenörün sadece salonda değil günlük beslenme, takviye kullanımı ve su tüketimini her öğün ilgiyle birebir WhatsApp üzerinden takip eder'],
                ['title' => 'Sürekli Güncel', 'description' => 'Programın her ay düzenli ölçümlerle kişisel gelişimin ve vücut tipinize en uygun şekilde güncellenir.']
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

        $stored = json_decode($record['content_json'], true);
        if (!is_array($stored)) {
            $stored = [];
        }
        
        $defaults = self::DEFAULTS[$section_id];
        $merged = [];
        foreach ($defaults as $k => $v) {
            if (isset($stored[$k]) && gettype($stored[$k]) === gettype($v)) {
                if (is_array($v)) {
                    if ($section_id === 'why_so3' && $k === 'items') {
                        $validItems = [];
                        foreach ($stored[$k] as $item) {
                            if (is_array($item) && isset($item['title']) && isset($item['description'])) {
                                $validItems[] = [
                                    'title' => (string)$item['title'],
                                    'description' => (string)$item['description']
                                ];
                            }
                        }
                        $merged[$k] = !empty($validItems) ? $validItems : $v;
                    } elseif ($section_id === 'process' && $k === 'steps') {
                        $validSteps = [];
                        foreach ($stored[$k] as $step) {
                            if (is_array($step) && isset($step['title'])) {
                                $validSteps[] = [
                                    'title' => (string)$step['title']
                                ];
                            }
                        }
                        $merged[$k] = !empty($validSteps) ? $validSteps : $v;
                    } elseif ($section_id === 'brand_band' && $k === 'items') {
                        $validItems = [];
                        foreach ($stored[$k] as $item) {
                            if (is_string($item)) {
                                $validItems[] = $item;
                            }
                        }
                        $merged[$k] = !empty($validItems) ? $validItems : $v;
                    } else {
                        $merged[$k] = $v;
                    }
                } else {
                    $merged[$k] = $stored[$k];
                }
            } else {
                $merged[$k] = $v;
            }
        }

        $response = [
            'section_id' => $section_id,
            'content' => $merged,
            'updated_at' => $record['updated_at']
        ];

        if ($section_id === 'hero' && !empty($merged['background_media_id'])) {
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

        if (!in_array($section_id, self::ALLOWED_SECTIONS)) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }
        if (!in_array($section_id, self::EDITABLE_SECTIONS)) {
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
        $oldStored = json_decode($record['content_json'], true) ?: [];
        $oldMerged = [];
        foreach ($defaults as $k => $v) {
            $oldMerged[$k] = $oldStored[$k] ?? $v;
        }

        $oldMediaId = null;
        $newMediaId = null;

        $allowedKeys = array_keys($defaults);
        $extraKeys = array_diff(array_keys($content), $allowedKeys);
        if (!empty($extraKeys)) {
            Response::error('Geçersiz alanlar tespit edildi.', 'VALIDATION_ERROR', 422);
        }

        if ($section_id === 'hero') {
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

            if (!empty($content['background_media_id'])) {
                $bgId = $content['background_media_id'];
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
                if (count($itemKeys) !== 2 || !in_array('title', $itemKeys) || !in_array('description', $itemKeys)) {
                    Response::error('Geçersiz veri tipi. Fazla veya eksik anahtar.', 'VALIDATION_ERROR', 422);
                }

                $t = trim($item['title'] ?? '');
                $d = trim($item['description'] ?? '');
                if (mb_strlen($t) < 1 || mb_strlen($t) > 100 || mb_strlen($d) < 1 || mb_strlen($d) > 500) {
                    Response::error('Madde başlığı 1-100, açıklaması 1-500 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $cleanItems[] = ['title' => $t, 'description' => $d];
            }
            $validated['items'] = $cleanItems;
        }
        elseif ($section_id === 'process') {
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
                if (count($stepKeys) !== 1 || !in_array('title', $stepKeys)) {
                    Response::error('Geçersiz veri tipi. Fazla veya eksik anahtar.', 'VALIDATION_ERROR', 422);
                }

                $t = trim($step['title'] ?? '');
                if (mb_strlen($t) < 1 || mb_strlen($t) > 180) {
                    Response::error('Adım metni 1-180 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
                }
                $cleanSteps[] = ['title' => $t];
            }
            $validated['steps'] = $cleanSteps;
        }

        try {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error('İçerik güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
}
