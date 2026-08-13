<?php

namespace Core;

class Config
{
    private static $config = null;

    public static function load()
    {
        $envPath = getenv('SO3_CONFIG_PATH');
        $localConfigPath = __DIR__ . '/../config/config.local.php';

        if ($envPath && file_exists($envPath)) {
            self::$config = require $envPath;
        } elseif (file_exists($localConfigPath)) {
            self::$config = require $localConfigPath;
        } else {
            throw new \Exception("Configuration missing. Secure deployment requires private config file.");
        }

        if (!is_array(self::$config)) {
            throw new \Exception("Configuration format invalid.");
        }

        $requiredKeys = ['db_host', 'db_name', 'db_user', 'db_pass', 'app_env', 'app_url'];
        foreach ($requiredKeys as $key) {
            if (!array_key_exists($key, self::$config)) {
                throw new \Exception("Configuration missing required key.");
            }
        }
    }

    public static function get($key, $default = null)
    {
        if (self::$config === null) {
            self::load();
        }

        return isset(self::$config[$key]) ? self::$config[$key] : $default;
    }
}
