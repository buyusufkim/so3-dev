<?php

namespace Core;

class Session
{
    private const SESSION_NAME = 'so3_admin_session';
    private const ABSOLUTE_TIMEOUT = 28800; // 8 hours
    private const IDLE_TIMEOUT = 1800; // 30 minutes

    public static function start()
    {
        if (session_status() === PHP_SESSION_NONE) {
            $isProduction = Config::get('app_env') === 'production';
            
            ini_set('session.use_only_cookies', 1);
            ini_set('session.use_strict_mode', 1);
            
            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'domain' => '',
                'secure' => $isProduction,
                'httponly' => true,
                'samesite' => $isProduction ? 'Strict' : 'Lax'
            ]);

            session_name(self::SESSION_NAME);
            session_start();
        }

        self::checkTimeout();
    }

    private static function checkTimeout()
    {
        if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
            $now = time();
            
            if (isset($_SESSION['login_time']) && ($now - $_SESSION['login_time'] > self::ABSOLUTE_TIMEOUT)) {
                self::destroy();
                return;
            }
            
            if (isset($_SESSION['last_activity']) && ($now - $_SESSION['last_activity'] > self::IDLE_TIMEOUT)) {
                self::destroy();
                return;
            }
            
            $_SESSION['last_activity'] = $now;
        }
    }

    public static function regenerate()
    {
        session_regenerate_id(true);
    }

    public static function destroy()
    {
        $_SESSION = array();
        
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params["path"],
                'domain' => $params["domain"],
                'secure' => $params["secure"],
                'httponly' => $params["httponly"],
                'samesite' => $params["samesite"] ?? 'Lax'
            ]);
        }
        
        session_destroy();
    }

    public static function getCsrfToken()
    {
        if (empty($_SESSION['csrf_token'])) {
            self::rotateCsrfToken();
        }
        return $_SESSION['csrf_token'];
    }

    public static function rotateCsrfToken()
    {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    public static function validateCsrfToken($token)
    {
        if (empty($_SESSION['csrf_token']) || empty($token)) {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $token);
    }
}
