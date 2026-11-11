const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf8');

content = content.replace(
    /const response = await axios\.get\(url, \{\n\s*responseType: 'arraybuffer',\n\s*headers: \{/g,
    'const response = await axiosGetWithFallback(url, {\n      responseType: \'arraybuffer\',\n      headers: {'
);

fs.writeFileSync('server/api.ts', content, 'utf8');
console.log("Patched image proxy successfully!");
