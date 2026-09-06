const fs = require('fs');

let code = fs.readFileSync('scripts/verify-appointment-lifecycle.mjs', 'utf8');

// Fix Namespace Capability Matrix
code = code.replace(/preg_match\\('#\\^\\/api\\/(\\[a-z_\\]\+)\\/appointments.*?\\$\\$#'\/g/, "preg_match('#^/api/([a-z_]+)/appointments.*\\\\$#'/g)");
// I'll just rewrite the faulty functions with replace.

