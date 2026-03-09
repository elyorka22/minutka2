'use strict';
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js');
if (!fs.existsSync(clientPath)) {
  console.warn('fix-prisma-client: dist/generated/prisma/client.js not found, skip');
  process.exit(0);
}

let code = fs.readFileSync(clientPath, 'utf8');
const good = "globalThis['__dirname'] = __dirname;";
const alreadyPatched = code.includes(good);
const importMetaRegex = /globalThis\s*\[\s*['"]__dirname['"]\s*\]\s*=\s*[^;]+import\.meta\.url[^;]*;/;
if (importMetaRegex.test(code)) {
  code = code.replace(importMetaRegex, good);
  fs.writeFileSync(clientPath, code);
  console.log('fix-prisma-client: patched import.meta.url -> __dirname in client.js');
} else if (!alreadyPatched) {
  console.warn('fix-prisma-client: no import.meta line to patch found');
}
