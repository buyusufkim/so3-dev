import re

with open('api/controllers/EventController.php', 'r') as f:
    content = f.read()

# 1. Insert Cover validation
cover_validation = """
        if ($cover_media_id) {
            $stmtCover = $this->db->prepare("SELECT id FROM media_assets WHERE id = ? AND status = 'active' AND deleted_at IS NULL AND media_type = 'image'");
            $stmtCover->execute([$cover_media_id]);
            if (!$stmtCover->fetch()) {
                Response::json(['error' => 'Geçersiz veya silinmiş kapak görseli. Sadece aktif görseller kapak olabilir.'], 422);
            }
        }
"""
content = content.replace("        if ($status === 'published') {", cover_validation + "\n        if ($status === 'published') {")

# 2. Insert Featured on home check
featured_check = """
        if ($status !== 'published') {
            $featured_on_home = false;
        }
"""
content = content.replace("        return [", featured_check + "\n        return [")

with open('api/controllers/EventController.php', 'w') as f:
    f.write(content)
