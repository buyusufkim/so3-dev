<?php
namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;

class TrainerAccountController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function index()
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        try {
            $sql = "
                SELECT 
                    t.id AS trainer_id, t.name AS trainer_name, t.slug AS trainer_slug, t.is_active AS trainer_is_active,
                    a.id AS account_id, a.username AS account_username, a.email AS account_email, 
                    a.display_name AS account_display_name, a.role AS account_role, a.status AS account_status, 
                    a.last_login_at AS account_last_login_at, a.password_changed_at AS account_password_changed_at
                FROM trainers t
                LEFT JOIN admins a ON t.admin_id = a.id AND a.role = 'trainer'
                WHERE t.deleted_at IS NULL
                ORDER BY t.sort_order ASC, t.id ASC
            ";
            
            $stmt = $this->db->query($sql);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = [];
            foreach ($results as $row) {
                $item = [
                    'trainer' => [
                        'id' => (int)$row['trainer_id'],
                        'name' => $row['trainer_name'],
                        'slug' => $row['trainer_slug'],
                        'is_active' => (bool)$row['trainer_is_active'],
                    ],
                    'account' => null,
                ];

                if ($row['account_id']) {
                    $item['account'] = [
                        'id' => (int)$row['account_id'],
                        'username' => $row['account_username'],
                        'email' => $row['account_email'],
                        'display_name' => $row['account_display_name'],
                        'role' => $row['account_role'],
                        'status' => $row['account_status'],
                        'last_login_at' => $row['account_last_login_at'],
                        'password_changed_at' => $row['account_password_changed_at'],
                    ];
                }

                $data[] = $item;
            }

            Response::json($data);
        } catch (\Exception $e) {
            error_log('TrainerAccountController@index Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function create()
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        // Check content type
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        // Check payload size limit (16 KB)
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $input = file_get_contents('php://input');
        if (strlen($input) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }

        $trainer_id = isset($data['trainer_id']) ? $data['trainer_id'] : null;
        $username = isset($data['username']) ? $data['username'] : null;
        $email = isset($data['email']) ? $data['email'] : null;
        $display_name = isset($data['display_name']) ? $data['display_name'] : null;
        $password = isset($data['password']) ? $data['password'] : null;

        if (
            ($trainer_id !== null && !is_int($trainer_id)) ||
            ($username !== null && !is_string($username)) ||
            ($email !== null && !is_string($email)) ||
            ($display_name !== null && !is_string($display_name)) ||
            ($password !== null && !is_string($password))
        ) {
            Response::error('Geçersiz veri tipi.', 'VALIDATION_ERROR', 422);
        }

        $username = $username !== null ? trim($username) : null;
        $email = $email !== null ? trim($email) : null;
        $display_name = $display_name !== null ? trim($display_name) : null;

        // Validations
        if (!is_int($trainer_id) || $trainer_id <= 0) {
            Response::error('Geçerli bir eğitmen ID gereklidir.', 'VALIDATION_ERROR', 422);
        }

        if (!$username || strlen($username) < 3 || strlen($username) > 50 || !preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
            Response::error('Kullanıcı adı 3-50 karakter uzunluğunda olmalı ve sadece harf, sayı, nokta, tire veya alt çizgi içermelidir.', 'VALIDATION_ERROR', 422);
        }

        if (!$email || strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Geçerli bir e-posta adresi gereklidir (maksimum 100 karakter).', 'VALIDATION_ERROR', 422);
        }

        if (!$display_name || mb_strlen($display_name, 'UTF-8') < 2 || mb_strlen($display_name, 'UTF-8') > 100) {
            Response::error('Görünen ad 2-100 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        if (!$password || mb_strlen($password, 'UTF-8') < 12 || mb_strlen($password, 'UTF-8') > 256) {
            Response::error('Şifre 12-256 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            // Find trainer
            $stmt = $this->db->prepare("SELECT id, admin_id FROM trainers WHERE id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$trainer_id]);
            $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer) {
                $this->db->rollBack();
                Response::error('Eğitmen bulunamadı.', 'TRAINER_NOT_FOUND', 404);
            }

            if (!empty($trainer['admin_id'])) {
                $this->db->rollBack();
                Response::error('Bu eğitmen zaten bir hesaba bağlı.', 'TRAINER_ACCOUNT_ALREADY_LINKED', 409);
            }

            // Check if username or email exists in admins
            $stmt = $this->db->prepare("SELECT id FROM admins WHERE username = ? OR email = ? FOR UPDATE");
            $stmt->execute([$username, $email]);
            if ($stmt->fetch()) {
                $this->db->rollBack();
                Response::error('Kullanıcı adı veya e-posta adresi zaten kullanımda.', 'ACCOUNT_IDENTITY_CONFLICT', 409);
            }

            // Hash password
            $hashAlgo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
            $password_hash = password_hash($password, $hashAlgo);
            if ($password_hash === false) {
                throw new \RuntimeException('Password hashing failed');
            }

            // Create admin
            $stmt = $this->db->prepare("
                INSERT INTO admins (username, email, display_name, password_hash, role, status) 
                VALUES (?, ?, ?, ?, 'trainer', 'active')
            ");
            $stmt->execute([$username, $email, $display_name, $password_hash]);
            $admin_id = $this->db->lastInsertId();

            // Link trainer
            $stmt = $this->db->prepare("UPDATE trainers SET admin_id = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$admin_id, $trainer_id]);
            
            if ($stmt->rowCount() !== 1) {
                throw new \RuntimeException('Trainer link update failed');
            }

            $this->db->commit();

            // Audit
            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'trainer_account.create',
                    $currentAdminId,
                    'trainer',
                    $trainer_id,
                    [
                        'created_admin_id' => (int)$admin_id,
                        'role' => 'trainer'
                    ]
                );
            } catch (\Exception $e) {
                // Ignore audit failure
                error_log('AuditLogger failed during trainer account creation: ' . $e->getMessage());
            }

            Response::json([
                'id' => (int)$admin_id,
                'trainer_id' => (int)$trainer_id,
                'username' => $username,                
                'email' => $email,
                'display_name' => $display_name,
                'role' => 'trainer',
                'status' => 'active'
            ], 201);

        } catch (\PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() == 23000 && isset($e->errorInfo[1]) && $e->errorInfo[1] == 1062) {
                Response::error('Kullanıcı adı veya e-posta adresi zaten kullanımda.', 'ACCOUNT_IDENTITY_CONFLICT', 409);
            }
            error_log('TrainerAccountController@create PDOException: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerAccountController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function updateStatus($trainer_id)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        $trainer_id = (int)$trainer_id;
        if ($trainer_id <= 0) {
            Response::error('Geçerli bir eğitmen ID gereklidir.', 'VALIDATION_ERROR', 422);
        }

        // Check content type
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        // Check payload size limit (16 KB)
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }
        $input = file_get_contents('php://input');
        if (strlen($input) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }

        // Strict payload validation: only allow 'status' key
        if (count($data) !== 1 || !array_key_exists('status', $data)) {
            Response::error('Sadece status alanı gönderilebilir.', 'VALIDATION_ERROR', 422);
        }

        $status = $data['status'];
        if ($status !== 'active' && $status !== 'inactive') {
            Response::error('Geçersiz hesap durumu.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT id, admin_id FROM trainers WHERE id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$trainer_id]);
            $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer) {
                $this->db->rollBack();
                Response::error('Eğitmen bulunamadı.', 'TRAINER_NOT_FOUND', 404);
            }

            if (empty($trainer['admin_id'])) {
                $this->db->rollBack();
                Response::error('Bu eğitmenin bağlı bir hesabı yok.', 'TRAINER_ACCOUNT_NOT_LINKED', 409);
            }

            $admin_id = (int)$trainer['admin_id'];
            $stmt = $this->db->prepare("SELECT id, role, status FROM admins WHERE id = ? FOR UPDATE");
            $stmt->execute([$admin_id]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admin || $admin['role'] !== 'trainer') {
                $this->db->rollBack();
                Response::error('Geçersiz veya yetkisiz hesap bağlantısı.', 'TRAINER_ACCOUNT_INVALID_LINK', 409);
            }

            if ($admin['status'] !== $status) {
                $stmt = $this->db->prepare("UPDATE admins SET status = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$status, $admin_id]);

                if ($stmt->rowCount() !== 1) {
                    throw new \RuntimeException('Status update failed');
                }
            }

            $this->db->commit();

            // Audit
            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'trainer_account.status_update',
                    $currentAdminId,
                    'trainer',
                    (int)$trainer_id,
                    [
                        'account_id' => $admin_id,
                        'new_status' => $status
                    ]
                );
            } catch (\Exception $e) {
                error_log('AuditLogger failed during trainer account status update: ' . $e->getMessage());
            }

            Response::json([
                'trainer_id' => (int)$trainer_id,
                'account_id' => $admin_id,
                'status' => $status
            ]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerAccountController@updateStatus Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function resetPassword($trainer_id)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        $trainer_id = (int)$trainer_id;
        if ($trainer_id <= 0) {
            Response::error('Geçerli bir eğitmen ID gereklidir.', 'VALIDATION_ERROR', 422);
        }

        // Check content type
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        // Check payload size limit (16 KB)
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }
        $input = file_get_contents('php://input');
        if (strlen($input) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }

        // Strict payload validation: only allow 'password' key
        if (count($data) !== 1 || !array_key_exists('password', $data)) {
            Response::error('Sadece password alanı gönderilebilir.', 'VALIDATION_ERROR', 422);
        }

        $password = $data['password'];
        if (!is_string($password)) {
            Response::error('Şifre geçerli bir metin olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        $len = mb_strlen($password, 'UTF-8');
        if ($len < 12 || $len > 256) {
            Response::error('Şifre 12-256 karakter arasında olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT id, admin_id FROM trainers WHERE id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$trainer_id]);
            $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer) {
                $this->db->rollBack();
                Response::error('Eğitmen bulunamadı.', 'TRAINER_NOT_FOUND', 404);
            }

            if (empty($trainer['admin_id'])) {
                $this->db->rollBack();
                Response::error('Bu eğitmenin bağlı bir hesabı yok.', 'TRAINER_ACCOUNT_NOT_LINKED', 409);
            }

            $admin_id = (int)$trainer['admin_id'];
            $stmt = $this->db->prepare("SELECT id, role FROM admins WHERE id = ? FOR UPDATE");
            $stmt->execute([$admin_id]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admin || $admin['role'] !== 'trainer') {
                $this->db->rollBack();
                Response::error('Geçersiz veya yetkisiz hesap bağlantısı.', 'TRAINER_ACCOUNT_INVALID_LINK', 409);
            }

            $hashAlgo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
            $password_hash = password_hash($password, $hashAlgo);
            if ($password_hash === false) {
                throw new \RuntimeException('Password hashing failed');
            }

            $stmt = $this->db->prepare("UPDATE admins SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$password_hash, $admin_id]);

            if ($stmt->rowCount() !== 1) {
                throw new \RuntimeException('Password reset update failed');
            }

            $this->db->commit();

            // Audit
            try {
                $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
                AuditLogger::log(
                    'trainer_account.password_reset',
                    $currentAdminId,
                    'trainer',
                    (int)$trainer_id,
                    [
                        'account_id' => $admin_id
                    ]
                );
            } catch (\Exception $e) {
                error_log('AuditLogger failed during trainer account password reset: ' . $e->getMessage());
            }

            Response::json([
                'trainer_id' => (int)$trainer_id,
                'account_id' => $admin_id,
                'password_changed' => true
            ]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerAccountController@resetPassword Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
