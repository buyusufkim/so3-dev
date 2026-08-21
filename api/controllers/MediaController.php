<?php
namespace Controllers;

use Core\Response;
use Core\Database;
use Core\AuditLogger;

class MediaController
{
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    public function index() {
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
        $status = isset($_GET['status']) ? $_GET['status'] : 'active';
        $type = isset($_GET['type']) ? $_GET['type'] : null;
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        
        $offset = ($page - 1) * $limit;
        
        $where = ["status = :status"];
        $params = [':status' => $status];
        
        if ($type && in_array($type, ['image', 'video'])) {
            $where[] = "media_type = :type";
            $params[':type'] = $type;
        }
        
        if ($search) {
            $where[] = "(original_name LIKE :search OR title LIKE :search OR alt_text LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }
        
        $whereStr = implode(' AND ', $where);
        
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM media_assets WHERE $whereStr");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        $stmt = $this->db->prepare("
            SELECT id, uuid, original_name, storage_path, thumbnail_path, mime_type, extension, file_size, width, height, media_type, title, alt_text, caption, status, created_at
            FROM media_assets 
            WHERE $whereStr 
            ORDER BY created_at DESC 
            LIMIT :limit OFFSET :offset
        ");
        
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        
        $assets = $stmt->fetchAll();
        
        // Map to web-safe URLs
        $baseUrl = rtrim($_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'], '/');
        
        foreach ($assets as &$asset) {
            $asset['url'] = $baseUrl . '/' . $asset['storage_path'];
            if ($asset['thumbnail_path']) {
                $asset['thumbnail_url'] = $baseUrl . '/' . $asset['thumbnail_path'];
            } else {
                $asset['thumbnail_url'] = null;
            }
            unset($asset['storage_path'], $asset['thumbnail_path']);
        }
        
        Response::json([
            'data' => $assets,
            'meta' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => $total,
                'last_page' => ceil($total / $limit)
            ]
        ]);
    }

    public function show($id) {
        $stmt = $this->db->prepare("
            SELECT a.id, a.uuid, a.original_name, a.storage_path, a.thumbnail_path, a.mime_type, a.extension, a.file_size, a.width, a.height, a.media_type, a.title, a.alt_text, a.caption, a.status, a.created_at,
                   u.username as uploaded_by_username
            FROM media_assets a
            LEFT JOIN admins u ON a.uploaded_by = u.id
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $asset = $stmt->fetch();
        
        if (!$asset) {
            Response::error('Media not found', 'NOT_FOUND', 404);
        }
        
        $baseUrl = rtrim($_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'], '/');
        $asset['url'] = $baseUrl . '/' . $asset['storage_path'];
        if ($asset['thumbnail_path']) {
            $asset['thumbnail_url'] = $baseUrl . '/' . $asset['thumbnail_path'];
        } else {
            $asset['thumbnail_url'] = null;
        }
        unset($asset['storage_path'], $asset['thumbnail_path']);
        
        // Usage counts
        $usageStmt = $this->db->prepare("SELECT COUNT(*) FROM media_usages WHERE media_id = ?");
        $usageStmt->execute([$id]);
        $asset['usage_count'] = $usageStmt->fetchColumn();
        
        Response::json($asset);
    }
    
    public function update($id) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $title = $input['title'] ?? null;
        $alt_text = $input['alt_text'] ?? null;
        $caption = $input['caption'] ?? null;
        
        $stmt = $this->db->prepare("UPDATE media_assets SET title = ?, alt_text = ?, caption = ? WHERE id = ?");
        $stmt->execute([$title, $alt_text, $caption, $id]);
        
        AuditLogger::log('media.updated', $_SESSION['admin_id'], 'media', $id, ['title' => $title]);
        Response::json(['success' => true]);
    }
    
    public function destroy($id) {
        // Soft delete
        $usageStmt = $this->db->prepare("SELECT COUNT(*) FROM media_usages WHERE media_id = ?");
        $usageStmt->execute([$id]);
        $usageCount = $usageStmt->fetchColumn();
        
        if ($usageCount > 0) {
            Response::error('Görsel kullanımda. Önce kullanım alanlarından kaldırılmalı.', 'MEDIA_IN_USE', 409);
        }
        
        $stmt = $this->db->prepare("UPDATE media_assets SET status = 'deleted', deleted_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        AuditLogger::log('media.deleted', $_SESSION['admin_id'], 'media', $id, []);
        Response::json(['success' => true]);
    }

    public function restore($id) {
        $stmt = $this->db->prepare("UPDATE media_assets SET status = 'active', deleted_at = NULL WHERE id = ?");
        $stmt->execute([$id]);
        
        AuditLogger::log('media.restored', $_SESSION['admin_id'], 'media', $id, []);
        Response::json(['success' => true]);
    }

    public function store() {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $err = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
            $msg = 'Upload failed';
            if ($err === UPLOAD_ERR_INI_SIZE) $msg = 'Dosya çok büyük.';
            Response::error($msg, 'UPLOAD_FAILED', 400);
        }
        
        $file = $_FILES['file'];
        
        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        $allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
        $allowedVideos = ['video/mp4', 'video/webm'];
        
        if (!in_array($mime, $allowedImages) && !in_array($mime, $allowedVideos)) {
            Response::error('Desteklenmeyen dosya türü.', 'UNSUPPORTED_TYPE', 400);
        }
        
        $isImage = in_array($mime, $allowedImages);
        $mediaType = $isImage ? 'image' : 'video';
        
        $checksum = hash_file('sha256', $file['tmp_name']);
        
        // Check duplicate
        $dupStmt = $this->db->prepare("SELECT id FROM media_assets WHERE checksum = ? AND status != 'deleted' LIMIT 1");
        $dupStmt->execute([$checksum]);
        $duplicate = $dupStmt->fetchColumn();
        
        // We will just store the checksum. Front-end could handle warning but API continues to save it.
        
        if ($isImage && $file['size'] > 15 * 1024 * 1024) {
            Response::error('Görsel maksimum 15MB olabilir.', 'FILE_TOO_LARGE', 400);
        } elseif (!$isImage && $file['size'] > 100 * 1024 * 1024) {
            Response::error('Video maksimum 100MB olabilir.', 'FILE_TOO_LARGE', 400);
        }
        
        $width = null;
        $height = null;
        $storagePath = '';
        $thumbnailPath = null;
        $extension = '';
        
        $year = date('Y');
        $month = date('m');
        
        $uploadDir = dirname(__DIR__, 2) . '/uploads';
        
        if ($isImage) {
            // Check dimensions
            list($origW, $origH) = getimagesize($file['tmp_name']);
            if (!$origW || !$origH) {
                Response::error('Geçersiz görsel dosyası.', 'INVALID_IMAGE', 400);
            }
            if ($origW > 12000 || $origH > 12000 || ($origW * $origH) > 60000000) {
                Response::error('Görsel boyutları çok büyük (Max 60MP / 12000x12000).', 'FILE_TOO_LARGE', 400);
            }
            
            if (!extension_loaded('gd')) {
                Response::error('Sunucuda GD kütüphanesi eksik, işlem yapılamıyor.', 'SERVER_ERROR', 500);
            }
            
            $image = null;
            if ($mime === 'image/jpeg') $image = imagecreatefromjpeg($file['tmp_name']);
            elseif ($mime === 'image/png') $image = imagecreatefrompng($file['tmp_name']);
            elseif ($mime === 'image/webp') $image = imagecreatefromwebp($file['tmp_name']);
            
            if (!$image) {
                Response::error('Görsel çözümlenemedi.', 'INVALID_IMAGE', 400);
            }
            
            // Resize logic
            $maxEdge = 2400;
            $thumbEdge = 600;
            
            $ratio = $origW / $origH;
            
            // Main image
            $newW = $origW;
            $newH = $origH;
            if ($origW > $maxEdge || $origH > $maxEdge) {
                if ($origW > $origH) {
                    $newW = $maxEdge;
                    $newH = $maxEdge / $ratio;
                } else {
                    $newH = $maxEdge;
                    $newW = $maxEdge * $ratio;
                }
            }
            
            $mainImg = imagecreatetruecolor($newW, $newH);
            if ($mime === 'image/png' || $mime === 'image/webp') {
                imagealphablending($mainImg, false);
                imagesavealpha($mainImg, true);
            }
            imagecopyresampled($mainImg, $image, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            
            // Thumb
            $tW = $origW;
            $tH = $origH;
            if ($origW > $thumbEdge || $origH > $thumbEdge) {
                if ($origW > $origH) {
                    $tW = $thumbEdge;
                    $tH = $thumbEdge / $ratio;
                } else {
                    $tH = $thumbEdge;
                    $tW = $thumbEdge * $ratio;
                }
            }
            
            $thumbImg = imagecreatetruecolor($tW, $tH);
            if ($mime === 'image/png' || $mime === 'image/webp') {
                imagealphablending($thumbImg, false);
                imagesavealpha($thumbImg, true);
            }
            imagecopyresampled($thumbImg, $image, 0, 0, 0, 0, $tW, $tH, $origW, $origH);
            
            // Random names
            $randomName = bin2hex(random_bytes(16)) . '.webp';
            $extension = 'webp';
            $mime = 'image/webp'; // We convert to WebP
            $width = $newW;
            $height = $newH;
            
            $relDir = "images/$year/$month";
            $thumbDir = "thumbnails/$year/$month";
            
            if (!is_dir("$uploadDir/$relDir")) {
                if (!mkdir("$uploadDir/$relDir", 0755, true)) {
                    Response::error('Storage failed', 'STORAGE_FAILED', 500);
                }
            }
            if (!is_dir("$uploadDir/$thumbDir")) {
                if (!mkdir("$uploadDir/$thumbDir", 0755, true)) {
                    Response::error('Storage failed', 'STORAGE_FAILED', 500);
                }
            }
            
            $mainPath = "$uploadDir/$relDir/$randomName";
            $thumbPath = "$uploadDir/$thumbDir/$randomName";
            
            $mainSuccess = imagewebp($mainImg, $mainPath, 85);
            $thumbSuccess = imagewebp($thumbImg, $thumbPath, 80);
            
            imagedestroy($image);
            imagedestroy($mainImg);
            imagedestroy($thumbImg);
            
            if (!$mainSuccess || !$thumbSuccess) {
                if (file_exists($mainPath)) @unlink($mainPath);
                if (file_exists($thumbPath)) @unlink($thumbPath);
                Response::error('Storage failed', 'STORAGE_FAILED', 500);
            }
            
            $storagePath = "uploads/$relDir/$randomName";
            $thumbnailPath = "uploads/$thumbDir/$randomName";
            
        } else {
            // Video
            $extMap = ['video/mp4' => 'mp4', 'video/webm' => 'webm'];
            $extension = $extMap[$mime];
            $randomName = bin2hex(random_bytes(16)) . '.' . $extension;

            if (!isset($_FILES['poster']) || $_FILES['poster']['error'] !== UPLOAD_ERR_OK) {
                Response::error('Video kapağı oluşturulamadı.', 'VIDEO_POSTER_REQUIRED', 400);
            }

            $posterFile = $_FILES['poster'];
            if ($posterFile['size'] > 5 * 1024 * 1024) {
                Response::error('Video kapağı maksimum 5MB olabilir.', 'VIDEO_POSTER_TOO_LARGE', 400);
            }

            $posterFinfo = finfo_open(FILEINFO_MIME_TYPE);
            $posterMime = finfo_file($posterFinfo, $posterFile['tmp_name']);
            finfo_close($posterFinfo);

            $allowedPosterTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!in_array($posterMime, $allowedPosterTypes, true)) {
                Response::error('Geçersiz video kapağı.', 'INVALID_VIDEO_POSTER', 400);
            }

            $posterDimensions = getimagesize($posterFile['tmp_name']);
            if (!$posterDimensions) {
                Response::error('Geçersiz video kapağı.', 'INVALID_VIDEO_POSTER', 400);
            }

            [$posterWidth, $posterHeight] = $posterDimensions;
            if ($posterWidth > 12000 || $posterHeight > 12000 || ($posterWidth * $posterHeight) > 60000000) {
                Response::error('Video kapağı boyutları çok büyük.', 'VIDEO_POSTER_TOO_LARGE', 400);
            }

            if (!extension_loaded('gd')) {
                Response::error('Sunucuda GD kütüphanesi eksik, işlem yapılamıyor.', 'SERVER_ERROR', 500);
            }

            $posterImage = null;
            if ($posterMime === 'image/jpeg') $posterImage = imagecreatefromjpeg($posterFile['tmp_name']);
            elseif ($posterMime === 'image/png') $posterImage = imagecreatefrompng($posterFile['tmp_name']);
            elseif ($posterMime === 'image/webp') $posterImage = imagecreatefromwebp($posterFile['tmp_name']);

            if (!$posterImage) {
                Response::error('Video kapağı çözümlenemedi.', 'INVALID_VIDEO_POSTER', 400);
            }

            $posterMaxEdge = 1200;
            $posterScale = min(1, $posterMaxEdge / max($posterWidth, $posterHeight));
            $newPosterWidth = max(1, (int) round($posterWidth * $posterScale));
            $newPosterHeight = max(1, (int) round($posterHeight * $posterScale));
            $posterOutput = imagecreatetruecolor($newPosterWidth, $newPosterHeight);
            imagecopyresampled(
                $posterOutput,
                $posterImage,
                0,
                0,
                0,
                0,
                $newPosterWidth,
                $newPosterHeight,
                $posterWidth,
                $posterHeight
            );
            imagedestroy($posterImage);
            
            $relDir = "videos/$year/$month";
            $thumbDir = "thumbnails/$year/$month";
            if (!is_dir("$uploadDir/$relDir")) {
                if (!mkdir("$uploadDir/$relDir", 0755, true)) {
                    imagedestroy($posterOutput);
                    Response::error('Storage failed', 'STORAGE_FAILED', 500);
                }
            }
            if (!is_dir("$uploadDir/$thumbDir")) {
                if (!mkdir("$uploadDir/$thumbDir", 0755, true)) {
                    imagedestroy($posterOutput);
                    Response::error('Storage failed', 'STORAGE_FAILED', 500);
                }
            }
            
            $mainPath = "$uploadDir/$relDir/$randomName";
            $posterName = pathinfo($randomName, PATHINFO_FILENAME) . '.webp';
            $thumbPath = "$uploadDir/$thumbDir/$posterName";
            
            if (!move_uploaded_file($file['tmp_name'], $mainPath)) {
                imagedestroy($posterOutput);
                Response::error('Storage failed', 'STORAGE_FAILED', 500);
            }

            $posterSuccess = imagewebp($posterOutput, $thumbPath, 82);
            imagedestroy($posterOutput);

            if (!$posterSuccess) {
                if (file_exists($mainPath)) @unlink($mainPath);
                if (file_exists($thumbPath)) @unlink($thumbPath);
                Response::error('Storage failed', 'STORAGE_FAILED', 500);
            }
            
            $storagePath = "uploads/$relDir/$randomName";
            $thumbnailPath = "uploads/$thumbDir/$posterName";
            $width = $newPosterWidth;
            $height = $newPosterHeight;
        }
        
        $uuid = bin2hex(random_bytes(16));
        $finalSize = filesize($mainPath);
        if ($finalSize === false) {
            if (file_exists($mainPath)) @unlink($mainPath);
            if (isset($thumbPath) && file_exists($thumbPath)) @unlink($thumbPath);
            Response::error('Storage failed', 'STORAGE_FAILED', 500);
        }
        
        try {
            $this->db->beginTransaction();
            $stmt = $this->db->prepare("
                INSERT INTO media_assets 
                (uuid, original_name, storage_name, storage_path, thumbnail_path, mime_type, extension, file_size, width, height, media_type, uploaded_by, checksum) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $uuid, $file['name'], $randomName, $storagePath, $thumbnailPath, $mime, $extension, $finalSize, $width, $height, $mediaType, $_SESSION['admin_id'] ?? null, $checksum
            ]);
            $id = $this->db->lastInsertId();
            $this->db->commit();
            
            AuditLogger::log('media.upload', $_SESSION['admin_id'] ?? null, 'media', $id, ['filename' => $file['name']]);
            
            $this->show($id); // return new item
            
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if (file_exists($mainPath)) @unlink($mainPath);
            if (isset($thumbPath) && file_exists($thumbPath)) @unlink($thumbPath);
            
            Response::error('Database error', 'DB_ERROR', 500);
        }
    }
}
