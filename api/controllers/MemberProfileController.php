<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\MemberAuthMiddleware;
use Middleware\CsrfMiddleware;
use PDO;

class MemberProfileController
{
    private $db;
    private $memberId;
    private $accountId;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function rejectQueryParams(): void
    {
        if (!empty($_GET)) {
            Response::error('Sorgu parametreleri kabul edilmiyor.', 'VALIDATION_ERROR', 422);
        }
    }

    private function guard(): void
    {
        MemberAuthMiddleware::handle();
        $this->memberId = (int)($_SESSION['member_id'] ?? 0);
        $this->accountId = (int)($_SESSION['member_account_id'] ?? 0);

        $this->rejectQueryParams();

        if ($this->memberId <= 0 || $this->accountId <= 0) {
            Response::error('Yetkisiz erişim.', 'UNAUTHORIZED', 401);
        }

        $stmt = $this->db->prepare("SELECT must_change_password FROM member_accounts WHERE id = :id");
        $stmt->execute([':id' => $this->accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$account) {
            Response::error('Yetkisiz erişim.', 'UNAUTHORIZED', 401);
        }

        if ((int)$account['must_change_password'] === 1) {
            Response::error('Devam etmek için önce şifrenizi değiştirmeniz gerekiyor.', 'PASSWORD_CHANGE_REQUIRED', 403);
        }
    }

    private function formatProfileResponse(array $row): array
    {
        return [
            'account' => [
                'username' => (string)$row['username'],
                'status' => (string)$row['account_status'],
            ],
            'profile' => [
                'first_name' => (string)$row['first_name'],
                'last_name' => (string)$row['last_name'],
                'phone' => (string)$row['phone'],
                'email' => $row['email'] !== null ? (string)$row['email'] : null,
                'emergency_contact_name' => $row['emergency_contact_name'] !== null ? (string)$row['emergency_contact_name'] : null,
                'emergency_contact_phone' => $row['emergency_contact_phone'] !== null ? (string)$row['emergency_contact_phone'] : null,
            ],
        ];
    }

    private function fetchProfileRecord(): ?array
    {
        $stmt = $this->db->prepare("
            SELECT ma.username, ma.status AS account_status,
                   m.first_name, m.last_name, m.phone, m.email,
                   m.emergency_contact_name, m.emergency_contact_phone
            FROM member_accounts ma
            JOIN members m ON ma.member_id = m.id
            WHERE ma.id = :account_id
              AND ma.member_id = :member_id
              AND ma.status = 'active'
              AND m.status = 'active'
              AND m.deleted_at IS NULL
        ");
        $stmt->execute([
            ':account_id' => $this->accountId,
            ':member_id' => $this->memberId
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function getProfile(): void
    {
        $this->guard();

        $row = $this->fetchProfileRecord();

        if (!$row) {
            Response::error('Profil bulunamadı.', 'NOT_FOUND', 404);
        }

        Response::json($this->formatProfileResponse($row));
    }

    public function updateProfile(): void
    {
        // 1. Authentication guard (checks session, query params, must_change_password)
        $this->guard();

        // 2. CSRF validation
        CsrfMiddleware::handle();

        // 3. Payload reading and size limit
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== 0) {
            Response::error('İçerik türü application/json olmalıdır.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $raw = file_get_contents('php://input');
        if (strlen($raw) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }

        // 4. Exact payload keys enforcement: exactly email, emergency_contact_name, emergency_contact_phone
        $allowedKeys = ['email', 'emergency_contact_name', 'emergency_contact_phone'];
        $payloadKeys = array_keys($data);

        $extraKeys = array_diff($payloadKeys, $allowedKeys);
        if (!empty($extraKeys)) {
            Response::error('İzin verilmeyen alanlar içeriyor.', 'VALIDATION_ERROR', 422);
        }

        $missingKeys = array_diff($allowedKeys, $payloadKeys);
        if (!empty($missingKeys)) {
            Response::error('Eksik alanlar var.', 'VALIDATION_ERROR', 422);
        }

        // 5. Field validation & normalization
        // Helper: reject control characters
        $hasControlChars = function (string $str): bool {
            return (bool)preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $str);
        };

        // --- email ---
        $rawEmail = $data['email'];
        $cleanEmail = null;
        if ($rawEmail !== null) {
            if (!is_string($rawEmail)) {
                Response::error('E-posta metin formatında olmalıdır.', 'VALIDATION_ERROR', 422);
            }
            if ($hasControlChars($rawEmail)) {
                Response::error('E-posta geçersiz karakterler içeriyor.', 'VALIDATION_ERROR', 422);
            }
            $trimmedEmail = trim($rawEmail);
            if ($trimmedEmail !== '') {
                if (mb_strlen($trimmedEmail) > 120) {
                    Response::error('E-posta en fazla 120 karakter olabilir.', 'VALIDATION_ERROR', 422);
                }
                if (!filter_var($trimmedEmail, FILTER_VALIDATE_EMAIL)) {
                    Response::error('Geçerli bir e-posta adresi giriniz.', 'VALIDATION_ERROR', 422);
                }
                $cleanEmail = $trimmedEmail;
            }
        }

        // --- emergency_contact_name ---
        $rawName = $data['emergency_contact_name'];
        $cleanName = null;
        if ($rawName !== null) {
            if (!is_string($rawName)) {
                Response::error('Acil durum kişisi adı metin formatında olmalıdır.', 'VALIDATION_ERROR', 422);
            }
            if ($hasControlChars($rawName)) {
                Response::error('Acil durum kişisi adı geçersiz karakterler içeriyor.', 'VALIDATION_ERROR', 422);
            }
            $trimmedName = trim($rawName);
            if ($trimmedName !== '') {
                if (mb_strlen($trimmedName) > 120) {
                    Response::error('Acil durum kişisi adı en fazla 120 karakter olabilir.', 'VALIDATION_ERROR', 422);
                }
                $cleanName = $trimmedName;
            }
        }

        // --- emergency_contact_phone ---
        $rawPhone = $data['emergency_contact_phone'];
        $cleanPhone = null;
        if ($rawPhone !== null) {
            if (!is_string($rawPhone)) {
                Response::error('Acil durum telefonu metin formatında olmalıdır.', 'VALIDATION_ERROR', 422);
            }
            if ($hasControlChars($rawPhone)) {
                Response::error('Acil durum telefonu geçersiz karakterler içeriyor.', 'VALIDATION_ERROR', 422);
            }
            $trimmedPhone = trim($rawPhone);
            if ($trimmedPhone !== '') {
                if (mb_strlen($trimmedPhone) > 20) {
                    Response::error('Acil durum telefonu en fazla 20 karakter olabilir.', 'VALIDATION_ERROR', 422);
                }
                // Allow standard Turkish and reasonable phone formats (digits, optional +, space, hyphen, parens)
                // Reject letters or obviously invalid characters
                if (!preg_match('/^\+?[0-9\s\-\(\)]{7,20}$/', $trimmedPhone)) {
                    Response::error('Geçerli bir telefon numarası giriniz.', 'VALIDATION_ERROR', 422);
                }
                $digitsCount = strlen(preg_replace('/\D/', '', $trimmedPhone));
                if ($digitsCount < 7 || $digitsCount > 15) {
                    Response::error('Geçerli bir telefon numarası giriniz.', 'VALIDATION_ERROR', 422);
                }
                $cleanPhone = $trimmedPhone;
            }
        }

        // 6. Atomic authorized update on the member's own record
        try {
            $this->db->beginTransaction();

            // Verify member and account are active and match session ownership
            $checkStmt = $this->db->prepare("
                SELECT m.id
                FROM members m
                JOIN member_accounts ma ON ma.member_id = m.id
                WHERE m.id = :member_id
                  AND ma.id = :account_id
                  AND m.status = 'active'
                  AND ma.status = 'active'
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $checkStmt->execute([
                ':member_id' => $this->memberId,
                ':account_id' => $this->accountId
            ]);
            if (!$checkStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Üye bulunamadı veya hesap aktif değil.', 'NOT_FOUND', 404);
            }

            // Perform single atomic UPDATE with ONLY allowlisted fields
            $updateStmt = $this->db->prepare("
                UPDATE members
                SET email = :email,
                    emergency_contact_name = :emergency_contact_name,
                    emergency_contact_phone = :emergency_contact_phone
                WHERE id = :member_id
                  AND status = 'active'
                  AND deleted_at IS NULL
            ");
            $updateStmt->execute([
                ':email' => $cleanEmail,
                ':emergency_contact_name' => $cleanName,
                ':emergency_contact_phone' => $cleanPhone,
                ':member_id' => $this->memberId
            ]);

            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Profil güncellenemedi.', 'INTERNAL_ERROR', 500);
        }

        // 7. Fetch refreshed canonical profile and return canonical response
        $updatedRecord = $this->fetchProfileRecord();
        if (!$updatedRecord) {
            Response::error('Profil bulunamadı.', 'NOT_FOUND', 404);
        }

        Response::json($this->formatProfileResponse($updatedRecord));
    }
}

