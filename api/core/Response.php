<?php

namespace Core;

class Response
{
    public static function json($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['data' => $data]);
        exit;
    }

    public static function error($message, $code = 'INTERNAL_ERROR', $statusCode = 500)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => [
                'code' => $code,
                'message' => $message
            ]
        ]);
        exit;
    }
}
