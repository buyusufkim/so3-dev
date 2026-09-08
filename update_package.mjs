import fs from 'fs';

const path = 'package.json';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('"verify:member-operational-history": "node scripts/verify-member-operational-history.mjs"', '"verify:member-operational-history": "node scripts/verify-member-operational-history.mjs",\n    "verify:operational-admin-dashboard": "node scripts/verify-operational-admin-dashboard.mjs"');

fs.writeFileSync(path, content);
