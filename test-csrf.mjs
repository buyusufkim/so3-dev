const indexSource = `
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'])) {
    CsrfMiddleware::handle();
}
// routes
if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/complete$#')) {}
`;
const globalCsrfMatch = indexSource.match(/if\s*\(\s*in_array\s*\(\s*\$method,\s*\[(.*?)\]\s*\)\s*\)/s);
const methodsStr = globalCsrfMatch[1];
const matches = [...methodsStr.matchAll(/'([A-Z]+)'/g)].map(m => m[1]);
console.log(matches);
