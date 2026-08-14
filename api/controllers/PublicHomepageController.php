<?php

namespace Controllers;

use Core\Database;
use Core\Response;

class PublicHomepageController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function index()
    {
        $sql = "SELECT section_id
                FROM homepage_sections
                WHERE is_active = 1
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
