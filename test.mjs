const block = "if ((int)$trainer['admin_id'] !== $adminId)";
if (block.match(/(?<!\(int\))\$trainer\['admin_id'\]\s*!==\s*\$adminId/)) {
    console.log("FAIL");
} else {
    console.log("PASS");
}
