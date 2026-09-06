const fs = require('fs');
const indexSrc = fs.readFileSync('api/index.php', 'utf8');
const adminRoutes = [...indexSrc.matchAll(/preg_match\('#\^\/api\/admin\/appointments/g)];
console.log(adminRoutes.length);
