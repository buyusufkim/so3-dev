<?php

namespace Middleware;

use Core\Database;
use Core\Response;

class RateLimitMiddleware
{
    public static function checkLoginLimit($username, $ipAddress)
    {
        $db = Database::getInstance()->getConnection();
        
        // Count failed attempts in the last 15 minutes
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM admin_login_attempts 
            WHERE (username = ? OR ip_address = ?) 
            AND successful = 0 
            AND created_at > (NOW() - INTERVAL 15 MINUTE)
        ");
        $stmt->execute([$username, $ipAddress]);
        $attempts = $stmt->fetchColumn();

        if ($attempts >= 5) {
            header('Retry-After: 900');
            Response::error('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.', 'TOO_MANY_REQUESTS', 429);
        }
    }

    public static function recordAttempt($username, $ipAddress, $successful)
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            INSERT INTO admin_login_attempts (username, ip_address, successful) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$username, $ipAddress, $successful ? 1 : 0]);
    }

    public static function clearAttempts($username, $ipAddress)
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            DELETE FROM admin_login_attempts 
            WHERE (username = ? OR ip_address = ?)
        ");
        $stmt->execute([$username, $ipAddress]);
    }
}
