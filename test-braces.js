function getMethodBlock(code, searchString, braceStartSearchStr = '{') {
    const startIndex = code.indexOf(searchString);
    if (startIndex === -1) return null;
    
    const braceIndex = code.indexOf(braceStartSearchStr, startIndex);
    if (braceIndex === -1) return null;

    const braceEndSearchStr = braceStartSearchStr === '{' ? '}' : (braceStartSearchStr === '[' ? ']' : ')');

    let braceCount = 0;
    let started = false;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;
    
    let endIndex = -1;

    for (let i = braceIndex; i < code.length; i++) {
        const c = code[i];
        const next = code[i+1] || '';
        
        if ((inSingleQuote || inDoubleQuote) && c === '\\') {
            i++; 
            continue;
        }

        if (inLineComment) {
            if (c === '\n' || c === '\r') {
                inLineComment = false;
            }
            continue;
        }
        
        if (inBlockComment) {
            if (c === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        
        if (inSingleQuote) {
            if (c === "'") inSingleQuote = false;
            continue;
        }
        
        if (inDoubleQuote) {
            if (c === '"') inDoubleQuote = false;
            continue;
        }
        
        if (c === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '#') {
            inLineComment = true;
            continue;
        }
        if (c === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === "'") {
            inSingleQuote = true;
            continue;
        }
        if (c === '"') {
            inDoubleQuote = true;
            continue;
        }
        
        if (c === braceStartSearchStr) {
            braceCount++;
            started = true;
        } else if (c === braceEndSearchStr) {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIndex = i + 1;
            break;
        }
    }
    
    return endIndex !== -1 ? code.substring(startIndex, endIndex) : null;
}
console.log(getMethodBlock("'GET' => [\n foo ]", "'GET' => [", "["));
