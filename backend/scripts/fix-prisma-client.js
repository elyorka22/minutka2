'use strict';
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js');
if (!fs.existsSync(clientPath)) {
  console.warn('fix-prisma-client: dist/generated/prisma/client.js not found, skip');
  process.exit(0);
}

let code = fs.readFileSync(clientPath, 'utf8');
const bad = "globalThis['__dirname'] = path.dirname((0, node_url_1.fileURLToPath)(import.meta.url));";
const good = "globalThis['__dirname'] = __dirname;";
if (!code.includes(bad)) {
  console.warn('fix-prisma-client: expected line not found, skip');
  process.exit(0);
}
code = code.replace(bad, good);
fs.writeFileSync(clientPath, code);
console.log('fix-prisma-client: patched import.meta.url -> __dirname in client.js');
