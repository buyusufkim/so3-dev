<?php

if (php_sapi_name() !== 'cli') {
    die("Bu script yalnizca komut satirindan calistirilabilir.\n");
}

require_once __DIR__ . '/../api/bootstrap.php';

use Core\Database;

echo "SO3 Control - Database Migrations\n";
echo "---------------------------------\n";

try {
    $db = Database::getInstance()->getConnection();
    
    // Ensure migrations table exists before querying
    $db->exec("CREATE TABLE IF NOT EXISTS `schema_migrations` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `migration` VARCHAR(255) NOT NULL UNIQUE,
      `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    
    $migrationsDir = __DIR__ . '/../database/migrations';
    $files = scandir($migrationsDir);
    
    $sqlFiles = [];
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
            $sqlFiles[] = $file;
        }
    }
    
    sort($sqlFiles); // Make sure they are applied in order
    
    $appliedCount = 0;
    
    foreach ($sqlFiles as $file) {
        // Check if already applied
        $stmt = $db->prepare("SELECT COUNT(*) FROM schema_migrations WHERE migration = ?");
        $stmt->execute([$file]);
        $alreadyApplied = $stmt->fetchColumn() > 0;
        
        if (!$alreadyApplied) {
            echo "Uygulanıyor: $file ... ";
            $sql = file_get_contents($migrationsDir . '/' . $file);
            
            try {
                $db->exec($sql);
                
                $insertStmt = $db->prepare("INSERT INTO schema_migrations (migration) VALUES (?)");
                $insertStmt->execute([$file]);
                
                echo "Başarılı.\n";
                $appliedCount++;
            } catch (\Exception $e) {
                echo "HATA!\n" . $e->getMessage() . "\n";
                echo "Migration işlemi durduruldu. (MySQL DDL migrations are not guaranteed atomic. Partially failed schema migration may require manual intervention.)\n";
                exit(1);
            }
        }
    }
    
    if ($appliedCount === 0) {
        echo "Tüm migration'lar zaten uygulanmış.\n";
    } else {
        echo "Toplam $appliedCount migration başarıyla uygulandı.\n";
    }
    
} catch (\Exception $e) {
    die("Veritabanı Hatası: " . $e->getMessage() . "\n");
}
