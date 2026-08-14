<?php

namespace Controllers;

use Core\Database;
use Core\Response;

class PublicHomepageController
{
    private $db;

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

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function index()
    {
        $allowedList = "'" . implode("','", self::ALLOWED_SECTIONS) . "'";

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
}
