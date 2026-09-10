const fs = require('fs');
let content = fs.readFileSync('src/admin/api/adminDevFallback.ts', 'utf8');

content = content.replace(
    /endpoint\.startsWith\('\/api\/admin\/dashboard'\)/,
    "endpoint.startsWith('/api/admin/session-packages') ||\n                     endpoint.startsWith('/api/admin/member-session-packages') ||\n                     endpoint.startsWith('/api/admin/dashboard')"
);

fs.writeFileSync('src/admin/api/adminDevFallback.ts', content);
