const fs = require('fs');
let content = fs.readFileSync('package.json', 'utf8');

content = content.replace(
    /"verify:session-package-management-api": "node scripts\/verify-session-package-management-api\.mjs"/,
    '"verify:session-package-management-api": "node scripts/verify-session-package-management-api.mjs",\n    "verify:session-package-management-ui": "node scripts/verify-session-package-management-ui.mjs"'
);

fs.writeFileSync('package.json', content);
