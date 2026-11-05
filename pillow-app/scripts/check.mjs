import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('..', import.meta.url);
async function walk(url) {
  for (const entry of await readdir(url, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
    if (entry.isDirectory()) await walk(child);
    else if (/\.(m?js)$/.test(entry.name)) {
      const r = spawnSync(process.execPath, ['--check', fileURLToPath(child)], { encoding: 'utf8' });
      if (r.status) throw new Error(r.stderr);
    }
  }
}
await walk(root);
for (const file of ['public/index.html', 'public/admin/index.html']) {
  const html = await readFile(new URL(file, root), 'utf8');
  if (/\son\w+\s*=/i.test(html) || /<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) throw new Error('Inline script violates CSP: ' + file);
  if (!html.includes('lang="zh-CN"')) throw new Error('Missing language: ' + file);
}
console.log('Syntax, static page and CSP checks passed.');
