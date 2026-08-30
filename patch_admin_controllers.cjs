const fs = require('fs');

function patchController(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Create
    content = content.replace(/try\s*\{\s*AuditLogger::log\(\$this->db,\s*\$adminId,\s*'([^']+)',\s*'([^']+)',\s*(\$newId|\$id),\s*\[([\s\S]*?)\]\);\s*\}\s*catch\s*\(Throwable\s*\$e\)\s*\{\s*error_log\("Audit log failed: "\s*\.\s*\$e->getMessage\(\)\);\s*\}\s*\$this->db->commit\(\);/g,
        `$this->db->commit();\n            try {\n                AuditLogger::log('$1', $adminId, '$2', $3, [$4]);\n            } catch (Throwable $e) {\n                error_log("Audit log failed: " . $e->getMessage());\n            }`);

    // 2. Update, Delete, Restore (uses $id instead of $newId)
    // Wait, the regex above handles `$newId` OR `$id`. Let's test it.

    fs.writeFileSync(filePath, content);
}

patchController('api/controllers/MemberMeasurementController.php');
patchController('api/controllers/MemberProgressNoteController.php');
console.log("Patched controllers");
