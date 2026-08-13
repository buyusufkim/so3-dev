<?php

namespace Core;

class ErrorHandler
{
    public static function register()
    {
        set_error_handler([self::class, 'handleError']);
        set_exception_handler([self::class, 'handleException']);
    }

    public static function handleError($level, $message, $file, $line)
    {
        if (error_reporting() !== 0) {
            throw new \ErrorException($message, 0, $level, $file, $line);
        }
    }

    public static function handleException(\Throwable $exception)
    {
        $env = 'production';
        try {
            if (class_exists('Core\Config')) {
                $env = Config::get('app_env', 'production');
            }
        } catch (\Exception $e) {
            $env = 'production';
        }
        
        if ($env === 'development') {
            Response::error(
                $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine(),
                'SERVER_ERROR',
                500
            );
        } else {
            // Production: log the error internally, return generic message
            error_log($exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine());
            Response::error("Bir hata oluştu.", "INTERNAL_ERROR", 500);
        }
    }
}
