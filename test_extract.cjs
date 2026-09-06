const fs = require('fs');

function extractBalanced(source, startIndex, openChar = '{', closeChar = '}') {
    if (startIndex < 0) return null;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    
    let blockStart = source.indexOf(openChar, startIndex);
    if (blockStart === -1) return null;
    
    for (let i = blockStart; i < source.length; i++) {
        let c = source[i];
        let nextC = source[i+1];
        
        if (inLineComment) {
            if (c === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (c === '*' && nextC === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inString) {
            if (c === '\\') i++;
            else if (c === stringChar) inString = false;
            continue;
        }
        
        if (c === '/' && nextC === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '/' && nextC === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === '"' || c === "'") {
            inString = true;
            stringChar = c;
            continue;
        }
        
        if (c === openChar) braceCount++;
        if (c === closeChar) {
            braceCount--;
            if (braceCount === 0) {
                return source.substring(blockStart, i + 1);
            }
        }
    }
    return null;
}

const src = fs.readFileSync('api/controllers/AppointmentController.php', 'utf8');

const cIdx = src.indexOf("private function handleCreate(");
const rIdx = src.indexOf("private function handleReschedule(");
const caIdx = src.indexOf("private function handleCancel(");
const tIdx = src.indexOf("private function handleTerminalize(");

console.log("Create exists:", cIdx !== -1);
console.log("Reschedule exists:", rIdx !== -1);
console.log("Cancel exists:", caIdx !== -1);
console.log("Terminalize exists:", tIdx !== -1);

if (cIdx !== -1) {
    const block = extractBalanced(src, cIdx);
    console.log("Create block length:", block.length);
}
