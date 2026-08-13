<?php

spl_autoload_register(function ($class) {
    $prefix = '';
    $base_dir = __DIR__ . '/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative_class = substr($class, $len);
    // Convert namespace to lowercase for folder structure consistency
    $path_parts = explode('\\', $relative_class);
    $class_name = array_pop($path_parts);
    $namespace_path = strtolower(implode('/', $path_parts));
    
    $file = $base_dir . ($namespace_path ? $namespace_path . '/' : '') . $class_name . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use Core\Config;
use Core\ErrorHandler;
use Core\Session;

ErrorHandler::register();
Config::load();
Session::start();
