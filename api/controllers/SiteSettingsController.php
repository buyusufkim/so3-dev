<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;
use PDO;
use Throwable;
use Exception;

class SiteSettingsController {
    private $db;
    private $allowedKeys = ['contact', 'location', 'social', 'tour', 'business_hours'];

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getAdminId(): int {
        $adminId = $_SESSION['admin_id'] ?? null;
        if (!$adminId) {
            Response::error('Oturum bilgisi eksik.', 'UNAUTHORIZED', 401);
        }
        return (int)$adminId;
    }

    private function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        if (empty(trim($raw))) {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }
        $dataObj = json_decode($raw);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
        }
        if (!is_object($dataObj)) {
            Response::error('JSON nesnesi (object) bekleniyor.', 'BAD_REQUEST', 400);
        }
        return json_decode($raw, true);
    }

    private function normalizeContact(?array $data): array {
        return [
            'phone_primary' => $data['phone_primary'] ?? '05539573738',
            'phone_secondary' => $data['phone_secondary'] ?? '05072077797',
            'whatsapp' => $data['whatsapp'] ?? '05523790777'
        ];
    }

    private function normalizeLocation(?array $data): array {
        return [
            'address' => $data['address'] ?? 'Yıldırım Beyazıt, Aşık Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri',
            'maps_directions_url' => $data['maps_directions_url'] ?? 'https://www.google.com/maps/place/SO3+Selami+%C3%96zy%C4%B1ld%C4%B1r%C4%B1m+Personal+Trainer/@38.7129364,35.5318726,17z/data=!3m1!4b1!4m6!3m5!1s0x152b136a06abeb6b:0x572b063e20953544!8m2!3d38.7129364!4d35.5318726!16s%2Fg%2F11st_bxb2b',
            'maps_embed_url' => $data['maps_embed_url'] ?? 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3112.5937107116843!2d35.5292976756857!3d38.71293637176466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x152b136a06abeb6b%3A0x572b063e20953544!2sSO3%20Selami%20%C3%96zy%C4%B1ld%C4%B1r%C4%B1m%20Personal%20Trainer!5e0!3m2!1sen!2str!4v1700000000000!5m2!1sen!2str'
        ];
    }

    private function normalizeSocial(?array $data): array {
        return [
            'instagram_username' => $data['instagram_username'] ?? 'so3pt'
        ];
    }

    private function normalizeTour(?array $data): array {
        return [
            'matterport_model_id' => $data['matterport_model_id'] ?? 'sXAzAwRLnGs'
        ];
    }

    private function normalizeBusinessHours(?array $data): array {
        $enabled = isset($data['enabled']) && is_bool($data['enabled']) ? $data['enabled'] : false;
        $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
        return [
            'enabled' => $enabled,
            'items' => $items
        ];
    }

    private function fetchSetting(string $key): array {
        $stmt = $this->db->prepare("SELECT setting_value FROM site_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $data = null;
        if ($row && $row['setting_value']) {
            $data = json_decode($row['setting_value'], true);
            if (!is_array($data)) $data = null;
        }

        switch ($key) {
            case 'contact': return $this->normalizeContact($data);
            case 'location': return $this->normalizeLocation($data);
            case 'social': return $this->normalizeSocial($data);
            case 'tour': return $this->normalizeTour($data);
            case 'business_hours': return $this->normalizeBusinessHours($data);
            default: return []; // Should not happen due to whitelist
        }
    }

    public function index() {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        $settings = [
            'contact' => $this->fetchSetting('contact'),
            'location' => $this->fetchSetting('location'),
            'social' => $this->fetchSetting('social'),
            'tour' => $this->fetchSetting('tour'),
            'business_hours' => $this->fetchSetting('business_hours')
        ];

        Response::json($settings);
    }

    public function show(string $key) {
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);

        if (!in_array($key, $this->allowedKeys, true)) {
            Response::error("Geçersiz ayar anahtarı.", 'NOT_FOUND', 404);
        }

        Response::json($this->fetchSetting($key));
    }

    public function update(string $key) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $this->getAdminId();

        if (!in_array($key, $this->allowedKeys, true)) {
            Response::error("Geçersiz ayar anahtarı.", 'NOT_FOUND', 404);
        }

        $data = $this->getJsonInput();
        $validatedData = [];

        switch ($key) {
            case 'contact':
                $validatedData = $this->validateContact($data);
                break;
            case 'location':
                $validatedData = $this->validateLocation($data);
                break;
            case 'social':
                $validatedData = $this->validateSocial($data);
                break;
            case 'tour':
                $validatedData = $this->validateTour($data);
                break;
            case 'business_hours':
                $validatedData = $this->validateBusinessHours($data);
                break;
        }

        $currentData = $this->fetchSetting($key);
        $changedFields = [];
        
        foreach ($validatedData as $k => $v) {
            // loose comparison is fine for detecting deep changes simply or we can do strict json compare
            if (json_encode($v) !== json_encode($currentData[$k] ?? null)) {
                $changedFields[] = $k;
            }
        }

        if (empty($changedFields)) {
            Response::json(['message' => 'Değişiklik yapılmadı.']);
        }

        try {
            $this->db->beginTransaction();

            $jsonValue = json_encode($validatedData, JSON_UNESCAPED_UNICODE);

            $stmt = $this->db->prepare("
                INSERT INTO site_settings (setting_key, setting_value, updated_by)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$key, $jsonValue, $adminId]);

            $this->db->commit();

            AuditLogger::log('site_settings.update', $adminId, 'site_setting', null, [
                'setting_key' => $key,
                'changed_fields' => $changedFields
            ]);

            Response::json(['message' => 'Ayarlar başarıyla güncellendi.']);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Sunucu hatası, ayarlar güncellenemedi.', 'INTERNAL_ERROR', 500);
        }
    }

    private function rejectUnknownFields(array $input, array $allowed) {
        $unknown = array_diff(array_keys($input), $allowed);
        if (!empty($unknown)) {
            $fields = implode(', ', $unknown);
            Response::error("Geçersiz alanlar bulundu: {$fields}", 'VALIDATION_ERROR', 422);
        }
    }

    private function validateContact(array $data): array {
        $this->rejectUnknownFields($data, ['phone_primary', 'phone_secondary', 'whatsapp']);
        
        if (!isset($data['phone_primary']) || !is_string($data['phone_primary']) || !preg_match('/^0[0-9]{10}$/', $data['phone_primary'])) {
            Response::error('Geçersiz Birincil Telefon formatı. Örn: 05551234567', 'VALIDATION_ERROR', 422);
        }
        
        if (!isset($data['whatsapp']) || !is_string($data['whatsapp']) || !preg_match('/^0[0-9]{10}$/', $data['whatsapp'])) {
            Response::error('Geçersiz WhatsApp formatı. Örn: 05551234567', 'VALIDATION_ERROR', 422);
        }

        $phone_secondary = null;
        if (array_key_exists('phone_secondary', $data) && $data['phone_secondary'] !== null) {
            if (!is_string($data['phone_secondary']) || !preg_match('/^0[0-9]{10}$/', $data['phone_secondary'])) {
                Response::error('Geçersiz İkincil Telefon formatı. Örn: 05551234567', 'VALIDATION_ERROR', 422);
            }
            $phone_secondary = $data['phone_secondary'];
        }

        return [
            'phone_primary' => $data['phone_primary'],
            'phone_secondary' => $phone_secondary,
            'whatsapp' => $data['whatsapp']
        ];
    }

    private function validateLocation(array $data): array {
        $this->rejectUnknownFields($data, ['address', 'maps_directions_url', 'maps_embed_url']);

        if (!isset($data['address']) || !is_string($data['address'])) {
            Response::error('Adres zorunludur.', 'VALIDATION_ERROR', 422);
        }
        $address = trim($data['address']);
        if (mb_strlen($address) < 1 || mb_strlen($address) > 500) {
            Response::error('Adres 1-500 karakter olmalıdır.', 'VALIDATION_ERROR', 422);
        }

        if (!isset($data['maps_directions_url']) || !is_string($data['maps_directions_url'])) {
            Response::error('Harita yol tarifi linki zorunludur.', 'VALIDATION_ERROR', 422);
        }
        $dirUrl = trim($data['maps_directions_url']);
        if (strlen($dirUrl) > 2000) {
            Response::error('Yol tarifi linki çok uzun.', 'VALIDATION_ERROR', 422);
        }
        if (!preg_match('/^https:\/\/(www\.)?(maps\.google\.com|google\.com\/maps)/i', $dirUrl)) {
            Response::error('Geçersiz Google Maps yol tarifi linki.', 'VALIDATION_ERROR', 422);
        }

        if (!isset($data['maps_embed_url']) || !is_string($data['maps_embed_url'])) {
            Response::error('Harita embed linki zorunludur.', 'VALIDATION_ERROR', 422);
        }
        $embedUrl = trim($data['maps_embed_url']);
        if (strlen($embedUrl) > 4000) {
            Response::error('Embed linki çok uzun.', 'VALIDATION_ERROR', 422);
        }
        if (!preg_match('/^https:\/\/(www\.)?(maps\.google\.com|google\.com\/maps)\/embed/i', $embedUrl)) {
            Response::error('Geçersiz Google Maps embed linki.', 'VALIDATION_ERROR', 422);
        }

        return [
            'address' => $address,
            'maps_directions_url' => $dirUrl,
            'maps_embed_url' => $embedUrl
        ];
    }

    private function validateSocial(array $data): array {
        $this->rejectUnknownFields($data, ['instagram_username']);

        if (!isset($data['instagram_username']) || !is_string($data['instagram_username'])) {
            Response::error('Instagram kullanıcı adı zorunludur.', 'VALIDATION_ERROR', 422);
        }
        
        $username = trim($data['instagram_username']);
        $username = ltrim($username, '@');
        
        if (!preg_match('/^[A-Za-z0-9._]{1,30}$/', $username)) {
            Response::error('Geçersiz Instagram kullanıcı adı.', 'VALIDATION_ERROR', 422);
        }

        return [
            'instagram_username' => $username
        ];
    }

    private function validateTour(array $data): array {
        $this->rejectUnknownFields($data, ['matterport_model_id']);

        if (!isset($data['matterport_model_id']) || !is_string($data['matterport_model_id'])) {
            Response::error('Matterport Model ID zorunludur.', 'VALIDATION_ERROR', 422);
        }
        
        $id = trim($data['matterport_model_id']);
        if (!preg_match('/^[A-Za-z0-9_-]{1,100}$/', $id)) {
            Response::error('Geçersiz Matterport Model ID.', 'VALIDATION_ERROR', 422);
        }

        return [
            'matterport_model_id' => $id
        ];
    }

    private function validateBusinessHours(array $data): array {
        $this->rejectUnknownFields($data, ['enabled', 'items']);

        if (!isset($data['enabled']) || !is_bool($data['enabled'])) {
            Response::error('Durum (enabled) zorunludur (true/false).', 'VALIDATION_ERROR', 422);
        }

        if (!isset($data['items']) || !is_array($data['items'])) {
            Response::error('Saat öğeleri (items) liste olmalıdır.', 'VALIDATION_ERROR', 422);
        }
        
        $enabled = $data['enabled'];
        $items = $data['items'];
        
        if ($enabled && count($items) !== 7) {
            Response::error('Açık durumda tam olarak 7 gün bilgisi girilmelidir.', 'VALIDATION_ERROR', 422);
        }
        
        if (!$enabled && count($items) > 7) {
            Response::error('En fazla 7 gün bilgisi girilebilir.', 'VALIDATION_ERROR', 422);
        }

        $validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $seenDays = [];
        $validatedItems = [];

        foreach ($items as $index => $item) {
            if (!is_array($item)) {
                Response::error("Öğe $index geçersiz formatta.", 'VALIDATION_ERROR', 422);
            }
            $this->rejectUnknownFields($item, ['day', 'is_closed', 'open', 'close']);

            if (!isset($item['day']) || !in_array($item['day'], $validDays, true)) {
                Response::error("Öğe $index için geçersiz gün.", 'VALIDATION_ERROR', 422);
            }
            if (in_array($item['day'], $seenDays, true)) {
                Response::error("Aynı gün tekrar edilemez: {$item['day']}", 'VALIDATION_ERROR', 422);
            }
            $seenDays[] = $item['day'];

            if (!isset($item['is_closed']) || !is_bool($item['is_closed'])) {
                Response::error("Öğe $index için 'is_closed' boolean olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            
            $isClosed = $item['is_closed'];
            $open = null;
            $close = null;

            if ($isClosed) {
                if ((array_key_exists('open', $item) && $item['open'] !== null) || (array_key_exists('close', $item) && $item['close'] !== null)) {
                    Response::error("Kapalı günde ( {$item['day']} ) açılış/kapanış saatleri boş (null) olmalıdır.", 'VALIDATION_ERROR', 422);
                }
            } else {
                if (!isset($item['open']) || !is_string($item['open']) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $item['open'])) {
                    Response::error("{$item['day']} günü için açılış saati geçersiz (SS:DD formatı).", 'VALIDATION_ERROR', 422);
                }
                if (!isset($item['close']) || !is_string($item['close']) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $item['close'])) {
                    Response::error("{$item['day']} günü için kapanış saati geçersiz (SS:DD formatı).", 'VALIDATION_ERROR', 422);
                }
                $open = $item['open'];
                $close = $item['close'];
            }

            $validatedItems[] = [
                'day' => $item['day'],
                'is_closed' => $isClosed,
                'open' => $open,
                'close' => $close
            ];
        }

        return [
            'enabled' => $enabled,
            'items' => $validatedItems
        ];
    }
}
