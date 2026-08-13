<?php

namespace Core;

use PDO;
use PDOException;
use Exception;

class Database
{
    private static $instance = null;
    private $pdo;

    private function __construct()
    {
        $host = Config::get('db_host');
        $db   = Config::get('db_name');
        $user = Config::get('db_user');
        $pass = Config::get('db_pass');
        $charset = 'utf8mb4';

        if (!$host || !$db) {
            throw new Exception("Database configuration is missing.");
        }

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            // Do not expose database credentials or details
            throw new Exception("Database connection failed.");
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->pdo;
    }
}
