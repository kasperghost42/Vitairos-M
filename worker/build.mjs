import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (path, encoding) => readFile(new URL(path, root), encoding);
const mime = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', ico: 'image/x-icon', png: 'image/png' };
const files = (await readdir(new URL('public/', root))).sort();
const assets = {};
for (const file of files) {
  const extension = file.split('.').at(-1);
  const type = mime[extension];
  assert.ok(type, 'Tipo de recurso no admitido: ' + file);
  const content = await read('public/' + file, type.startsWith('image/') ? 'base64' : 'utf8');
  assets['/' + file] = [type, content];
}
const manifest = await read('.openai/hosting.json', 'utf8');
assert.ok(JSON.parse(manifest).project_id);
const source = await read('worker/index.mjs', 'utf8');
const output = source + '\nconst assets = ' + JSON.stringify(assets) + ';\n';
const module = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
assert.equal(typeof module.default.fetch, 'function');
for (const route of ['/', '/persona.html', '/panel.html', '/styles.css', '/vitairos-m-logo.png']) {
  assert.equal((await module.default.fetch(new Request('https://demo.invalid' + route), {})).status, 200, route);
}
await mkdir(new URL('dist/server/', root), { recursive: true });
await mkdir(new URL('dist/.openai/', root), { recursive: true });
await writeFile(new URL('dist/server/index.js', root), output);
await writeFile(new URL('dist/.openai/hosting.json', root), manifest);
console.log('Worker generado y portada, paneles y recursos verificados.');
