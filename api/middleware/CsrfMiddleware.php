<?php

namespace Middleware;

use Core\Response;
use Core\Session;

class CsrfMiddleware
{
    public static function handle()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $headers = getallheaders();
            $token = $headers['X-CSRF-Token'] ?? $headers['x-csrf-token'] ?? '';
            
            if (!Session::validateCsrfToken($token)) {
                Response::error('Geçersiz istek (CSRF).', 'FORBIDDEN', 403);
            }
        }
    }
}
