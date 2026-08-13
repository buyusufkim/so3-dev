<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use PDO;
use Exception;

class EventCategoryController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        try {
            $stmt = $this->db->query("SELECT * FROM event_categories ORDER BY sort_order ASC, name ASC");
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            Response::json(['data' => $categories]);
        } catch (Exception $e) {
            Response::json(['error' => 'Kategoriler alınamadı.'], 500);
        }
    }

    public function create() {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::json(['error' => 'Geçersiz JSON verisi.'], 400);
        }
        
        $name = trim($data['name'] ?? '');
        $slug = trim($data['slug'] ?? '');
        $description = isset($data['description']) ? trim($data['description']) : null;
        $status = isset($data['status']) && in_array($data['status'], ['active', 'inactive']) ? $data['status'] : 'active';
        $sort_order = isset($data['sort_order']) ? (int)$data['sort_order'] : 0;

        if (strlen($name) < 1 || strlen($name) > 100) {
            Response::json(['error' => 'Kategori adı 1-100 karakter arasında olmalıdır.'], 422);
        }
        if (strlen($slug) < 1 || strlen($slug) > 120) {
            Response::json(['error' => 'Slug 1-120 karakter arasında olmalıdır.'], 422);
        }

        try {
            $stmt = $this->db->prepare("SELECT id FROM event_categories WHERE slug = ?");
            $stmt->execute([$slug]);
            if ($stmt->fetch()) {
                Response::json(['error' => 'Bu slug zaten kullanımda.'], 409);
            }

            $stmt = $this->db->prepare("INSERT INTO event_categories (name, slug, description, status, sort_order) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$name, $slug, $description, $status, $sort_order]);
            
            Response::json(['message' => 'Kategori oluşturuldu.', 'id' => $this->db->lastInsertId()], 201);
        } catch (Exception $e) {
            Response::json(['error' => 'Kategori oluşturulamadı.'], 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::json(['error' => 'Geçersiz JSON verisi.'], 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM event_categories WHERE id = ?");
            $stmt->execute([$id]);
            $category = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$category) {
                Response::json(['error' => 'Kategori bulunamadı.'], 404);
            }
            
            $name = isset($data['name']) ? trim($data['name']) : $category['name'];
            $slug = isset($data['slug']) ? trim($data['slug']) : $category['slug'];
            $description = array_key_exists('description', $data) ? trim($data['description']) : $category['description'];
            $status = isset($data['status']) && in_array($data['status'], ['active', 'inactive']) ? $data['status'] : $category['status'];
            $sort_order = isset($data['sort_order']) ? (int)$data['sort_order'] : $category['sort_order'];

            if (strlen($name) < 1 || strlen($name) > 100) {
                Response::json(['error' => 'Kategori adı 1-100 karakter arasında olmalıdır.'], 422);
            }
            if (strlen($slug) < 1 || strlen($slug) > 120) {
                Response::json(['error' => 'Slug 1-120 karakter arasında olmalıdır.'], 422);
            }

            if ($slug !== $category['slug']) {
                $stmt = $this->db->prepare("SELECT id FROM event_categories WHERE slug = ? AND id != ?");
                $stmt->execute([$slug, $id]);
                if ($stmt->fetch()) {
                    Response::json(['error' => 'Bu slug zaten kullanımda.'], 409);
                }
            }

            $stmt = $this->db->prepare("UPDATE event_categories SET name = ?, slug = ?, description = ?, status = ?, sort_order = ? WHERE id = ?");
            $stmt->execute([$name, $slug, $description, $status, $sort_order, $id]);
            
            Response::json(['message' => 'Kategori güncellendi.']);
        } catch (Exception $e) {
            Response::json(['error' => 'Kategori güncellenemedi.'], 500);
        }
    }
}
