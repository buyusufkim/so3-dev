<?php

namespace Core;

class AuditLogger
{
    public static function log($action, $adminId = null, $entityType = null, $entityId = null, $metadata = [])
    {
        try {
            $db = Database::getInstance()->getConnection();
            $ipAddress = self::getIpAddress();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            
            // Recursive sanitization of metadata
            $sanitizedMetadata = self::sanitizeMetadata($metadata);
            
            // Cap size to 16KB JSON approx
            $json = json_encode($sanitizedMetadata);
            if (strlen($json) > 16384) {
                $json = json_encode(['error' => 'Metadata too large, truncated']);
            }
            
            $stmt = $db->prepare("
                INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $adminId,
                $action,
                $entityType,
                $entityId,
                $ipAddress,
                $userAgent,
                $json
            ]);
        } catch (\Exception $e) {
            // Silently fail audit logging to not break the main flow, 
            // but in a real system we would log this to a file.
            error_log("Audit log failed: " . $e->getMessage());
        }
    }
    
    private static function sanitizeMetadata($data)
    {
        if (!is_array($data) && !is_object($data)) {
            return $data;
        }

        $redactKeys = [
            'password', 'password_hash', 'csrf', 'csrf_token', 
            'session', 'session_id', 'cookie', 'authorization', 
            'db_pass', 'secret', 'token', 'api_key'
        ];
        
        $sanitized = [];
        foreach ($data as $key => $value) {
            $lowerKey = strtolower((string)$key);
            $shouldRedact = false;
            foreach ($redactKeys as $redactKey) {
                if (strpos($lowerKey, $redactKey) !== false) {
                    $shouldRedact = true;
                    break;
                }
            }
            
            if ($shouldRedact) {
                $sanitized[$key] = '[REDACTED]';
            } elseif (is_array($value) || is_object($value)) {
                $sanitized[$key] = self::sanitizeMetadata($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        return $sanitized;
    }

    private static function getIpAddress()
    {
        // Simple IP retrieval. Trusting X-Forwarded-For blindly is a risk, 
        // but often required behind load balancers. 
        // For a secure control panel, REMOTE_ADDR is safest unless explicitly configured.
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
