<?php

if (php_sapi_name() !== 'cli') {
    die("Bu script yalnizca komut satirindan calistirilabilir.\n");
}

require_once __DIR__ . '/../api/bootstrap.php';

use Core\Database;

echo "SO3 Control - Eski Login Denemelerini Temizle\n";
echo "-------------------------------------------\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Delete older than 30 days
    $stmt = $db->prepare("DELETE FROM admin_login_attempts WHERE created_at < (NOW() - INTERVAL 30 DAY)");
    $stmt->execute();
    $deleted = $stmt->rowCount();
    
    echo "Başarıyla 30 günden eski $deleted başarısız giriş denemesi kaydı temizlendi.\n";
    
} catch (\Exception $e) {
    die("Veritabani Hatasi: " . $e->getMessage() . "\n");
}
