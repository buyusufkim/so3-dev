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
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON verisi.', 'BAD_REQUEST', 400);
        }
        return $input;
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
