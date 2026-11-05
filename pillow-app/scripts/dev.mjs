import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { localDatabase } from './local-db.mjs';
import { createApp } from '../src/app.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const local = resolve(root, '.local'); await mkdir(local, { recursive: true });
const db = await localDatabase(resolve(local, 'database'));
const settingsPath = resolve(local, 'settings.json');
let settings;
try { settings = JSON.parse(await readFile(settingsPath, 'utf8')); }
catch {
  settings = { SUPERADMIN_EMAIL: process.env.SUPERADMIN_EMAIL || 'owner@example.test', BOOTSTRAP_SECRET: randomBytes(32).toString('base64url'), RATE_LIMIT_SECRET: randomBytes(32).toString('base64url') };
  await writeFile(settingsPath, JSON.stringify(settings), { mode: 0o600 });
}
const port = Number(process.env.PORT || 4178); const origin = `http://127.0.0.1:${port}`;
const app = createApp(db, { ...settings, APP_ORIGIN: origin, PUBLIC_SUBMISSIONS_ENABLED: 'true' });
const publicDir = resolve(root, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const request = new Request(new URL(req.url, origin), { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : req, duplex: 'half' });
      const result = await app(request, { ip: req.socket.remoteAddress });
      res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(Buffer.from(await result.arrayBuffer())); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let path = resolve(publicDir, '.' + decodeURIComponent(new URL(req.url, origin).pathname));
    if (path !== publicDir && !path.startsWith(publicDir + sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(path)).isDirectory()) {
      if (!new URL(req.url, origin).pathname.endsWith('/')) { res.writeHead(302, { Location: new URL(req.url, origin).pathname + '/' }); res.end(); return; }
      path = resolve(path, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    res.end(req.method === 'HEAD' ? undefined : await readFile(path));
  } catch { if (!res.headersSent) res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Local preview: ${origin}/`);
  console.log(`Admin: ${origin}/admin/`);
  console.log('Local test data only. To open the first owner account, use the setup URL in .local/setup-url.txt.');
});
await writeFile(resolve(local, 'setup-url.txt'), `${origin}/admin/#setup=${settings.BOOTSTRAP_SECRET}\nLocal login email: ${settings.SUPERADMIN_EMAIL}\n`, { mode: 0o600 });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
