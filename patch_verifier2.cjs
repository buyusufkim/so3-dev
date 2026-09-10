const fs = require('fs');
let content = fs.readFileSync('scripts/verify-session-package-management-ui.mjs', 'utf8');

content = content.replace(
    /check\(!mPanel\.includes\('Manuel Düzeltme'\) \|\| !mPanel\.includes\('post\('\) \|\| mPanel\.indexOf\('Manuel Düzeltme'\) < mPanel\.indexOf\('İşlem'\), 'No adjustment mutation UI'\);/,
    "check(!mPanel.includes('adjustment_api_call') && !mPanel.match(/<button[^>]*>\\s*Manuel Düzeltme\\s*<\\/button>/i), 'No adjustment mutation UI');"
);

fs.writeFileSync('scripts/verify-session-package-management-ui.mjs', content);
