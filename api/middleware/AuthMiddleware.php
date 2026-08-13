<?php

namespace Middleware;

use Core\Response;

class AuthMiddleware
{
    public static function handle()
    {
        if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
            Response::error('Oturum gerekli.', 'UNAUTHORIZED', 401);
        }
    }

    public static function hasRole($roles)
    {
        self::handle();
        
        $userRole = $_SESSION['admin_role'] ?? null;
        
        if (!is_array($roles)) {
            $roles = [$roles];
        }

        if (!in_array($userRole, $roles)) {
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }
    }
}
