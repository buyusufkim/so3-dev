const fs = require('fs');
const indexSrc = fs.readFileSync('api/index.php', 'utf8');
const allMatches = [...indexSrc.matchAll(/preg_match\('#\^\\/api\\/([a-z_]+)\\/appointments.*?\$#'/g)];
console.log(allMatches.map(m => m[1]));
