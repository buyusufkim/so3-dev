const block = "preg_match('/^[1-9]\\d*$/', $adminId)";
if (!block.match(/preg_match\(['"]\/\^\[1-9\]\\d\*\$\/['"],\s*\$adminId\)/)) {
    console.log("FAIL");
} else {
    console.log("PASS");
}
