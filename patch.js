import fs from 'fs';
let code = fs.readFileSync('scripts/verify-appointment-read-create.mjs', 'utf8');

code = code.replace("contents.index.indexOf(\"'POST'\")", "contents.index.indexOf(\"'POST' =>\")");
code = code.replace("contents.index.indexOf(\"'POST'\")", "contents.index.indexOf(\"'POST' =>\")");
code = code.replace("contents.index.indexOf(\"'POST'\")", "contents.index.indexOf(\"'POST' =>\")");

code = code.replace(
  "/BETWEEN|<=|>=/.test(handleReadBlock)",
  "/BETWEEN\\\\s|starts_at\\\\s*<=|ends_at\\\\s*>=/.test(handleReadBlock)"
);

fs.writeFileSync('scripts/verify-appointment-read-create.mjs', code);
