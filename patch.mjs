import fs from 'fs';
let c = fs.readFileSync('scripts/verify-member-portal-read-model.mjs', 'utf8');
c = c.replace(/if \(!dbContent\.includes\('PDO::ATTR_EMULATE_PREPARES => false'\)\)/, "if (!/PDO::ATTR_EMULATE_PREPARES\\s*=>\\s*false/.test(dbContent))");
fs.writeFileSync('scripts/verify-member-portal-read-model.mjs', c);
