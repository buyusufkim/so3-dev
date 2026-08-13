<?php

if (php_sapi_name() !== 'cli') {
    die("Bu script yalnizca komut satirindan calistirilabilir.\n");
}

require_once __DIR__ . '/../api/bootstrap.php';

use Core\Database;

echo "SO3 Control - Admin Olusturma\n";
echo "------------------------------\n";

$username = trim(readline("Kullanici Adi: "));
$email = trim(readline("E-posta: "));
$displayName = trim(readline("Görüntülenen İsim: "));

// Read password securely if possible, else standard input
echo "Sifre (en az 12 karakter): ";
system('stty -echo');
$password = fgets(STDIN);
if ($password !== false) {
    $password = str_replace(["\r", "\n"], "", $password);
}
system('stty echo');
echo "\n";

if (mb_strlen($username) < 1 || mb_strlen($username) > 50) {
    die("Hata: Kullanici adi 1-50 karakter olmalidir.\n");
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 100) {
    die("Hata: Gecerli bir e-posta (max 100) giriniz.\n");
}
if (mb_strlen($displayName) < 1 || mb_strlen($displayName) > 100) {
    die("Hata: Goruntu adi 1-100 karakter olmalidir.\n");
}
if (mb_strlen($password) < 12 || mb_strlen($password) > 256) {
    die("Hata: Sifre 12-256 karakter olmalidir.\n");
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if exists
    $stmt = $db->prepare("SELECT COUNT(*) FROM admins WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    if ($stmt->fetchColumn() > 0) {
        die("Hata: Bu kullanici adi veya e-posta zaten mevcut.\n");
    }

    $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
    $hash = password_hash($password, $algo);
    if ($hash === false || $hash === null) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
    }
    
    $stmt = $db->prepare("INSERT INTO admins (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$username, $email, $hash, $displayName, 'super_admin']);
    
    echo "Super Admin basariyla olusturuldu.\n";
    
} catch (\Exception $e) {
    die("Veritabani Hatasi: " . $e->getMessage() . "\n");
}
