<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;

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

    public function index() {
        $db = Database::getInstance();
        $sections = $db->fetchAll(
            "SELECT section_id, is_active, sort_order, updated_at 
             FROM homepage_sections 
             ORDER BY sort_order ASC"
        );

        Response::json(['data' => $sections]);
    }

    public function update(string $section_id) {
        if (!in_array($section_id, self::ALLOWED_SECTIONS)) {
            Response::error('Geçersiz bölüm.', 'INVALID_SECTION', 422);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['is_active']) || !is_bool($input['is_active'])) {
            Response::error('is_active boolean formatında olmalıdır.', 'VALIDATION_ERROR', 422);
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
            [$is_active, $_SESSION['user_id'], $section_id]
        );

        AuditLogger::log('homepage.section.toggle', "{$section_id} görünürlüğü güncellendi.", [
            'section_id' => $section_id,
            'old_is_active' => $old_is_active,
            'new_is_active' => (bool)$is_active
        ]);

        Response::json(['success' => true]);
    }

    public function reorder() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['sections']) || !is_array($input['sections'])) {
            Response::error('Geçersiz veri formatı.', 'VALIDATION_ERROR', 422);
        }

        $sections = $input['sections'];
        
        if (count($sections) !== count(self::ALLOWED_SECTIONS)) {
            Response::error('Eksik veya fazla bölüm gönderildi.', 'VALIDATION_ERROR', 422);
        }

        $diff1 = array_diff($sections, self::ALLOWED_SECTIONS);
        $diff2 = array_diff(self::ALLOWED_SECTIONS, $sections);
        
        if (!empty($diff1) || !empty($diff2)) {
            Response::error('Bölüm listesi hatalı.', 'VALIDATION_ERROR', 422);
        }

        if (count(array_unique($sections)) !== count($sections)) {
            Response::error('Tekrarlayan bölümler mevcut.', 'VALIDATION_ERROR', 422);
        }

        $db = Database::getInstance();
         
        
        try {
            $db->beginTransaction();

            $order = 10;
            foreach ($sections as $section_id) {
                $db->query(
                    "UPDATE homepage_sections SET sort_order = ?, updated_by = ?, updated_at = NOW() WHERE section_id = ?",
                    [$order, $_SESSION['user_id'], $section_id]
                );
                $order += 10;
            }

            $db->commit();

            AuditLogger::log('homepage.sections.reorder', "Ana sayfa bölümleri yeniden sıralandı.", [
                'new_order' => $sections
            ]);

            Response::json(['success' => true]);
        } catch (\Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error('Sıralama güncellenirken bir hata oluştu.', 'DATABASE_ERROR', 500);
        }
    }
}
