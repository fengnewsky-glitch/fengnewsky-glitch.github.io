import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localDatabase } from '../scripts/local-db.mjs';
import { createApp, PRIVACY_VERSION } from '../src/app.mjs';

test('real database: submissions, account lifecycle, permissions and deletion', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pillow-test-'));
  let db = await localDatabase(join(directory, 'pg'));
  const env = { APP_ORIGIN: 'https://pillow.test', SUPERADMIN_EMAIL: 'owner@example.test', BOOTSTRAP_SECRET: 'b'.repeat(43), RATE_LIMIT_SECRET: 'r'.repeat(43), PUBLIC_SUBMISSIONS_ENABLED: 'true' };
  let app = createApp(db, env);
  const call = async (path, method = 'GET', body, cookie = '', ip = '1.2.3.4', origin = env.APP_ORIGIN) => {
    const req = new Request(env.APP_ORIGIN + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const response = await app(req, { ip });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  };
  const message = extra => ({ requestId: randomUUID(), nickname: '测试朋友', state: '有点累', needs: ['需要有一对一的聆听'], words: '只用于测试的留言', avoid: '暂时不需要建议', wantsContact: true, contact: 'test-wechat-only', consent: true, privacyVersion: PRIVACY_VERSION, website: '', ...extra });
  let ownerCookie, managerCookie, managerId, messageId, revision, rawActivation;
  try {
    await t.test('entry stays closed until owner exists; public cannot read any messages', async () => {
      assert.equal((await call('/config')).body.enabled, false);
      assert.equal((await call('/messages', 'POST', message())).status, 503);
      assert.equal((await call('/messages')).status, 401);
      assert.equal((await call('/summary')).status, 401);
    });
    await t.test('owner bootstrap requires secret, cannot repeat, password hash and secure cookie', async () => {
      const body = { secret: env.BOOTSTRAP_SECRET, name: '测试负责人', password: 'test-owner-password-123!' };
      assert.equal((await call('/setup', 'POST', { ...body, secret: 'wrong' })).status, 403);
      const r = await call('/setup', 'POST', body); assert.equal(r.status, 201, JSON.stringify(r.body)); ownerCookie = r.cookie;
      assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/); assert.match(r.headers.get('set-cookie'), /Secure/);
      assert.equal((await call('/setup', 'POST', body)).status, 409);
      const stored = (await db.query('SELECT password_hash FROM staff')).rows[0].password_hash;
      assert.match(stored, /^scrypt\$/); assert.ok(!stored.includes(body.password));
      assert.equal((await call('/config')).body.enabled, true);
    });
    await t.test('cross-site writes and missing consent are rejected; disabled rollout blocks submission', async () => {
      assert.equal((await call('/messages', 'POST', message(), '', '1.2.3.4', 'https://evil.test')).status, 403);
      assert.equal((await call('/messages', 'POST', message({ consent: false }))).status, 400);
      assert.equal((await call('/messages', 'POST', message({ needs: ['not-allowed'] }))).status, 400);
      assert.equal((await call('/messages', 'POST', message({ contact: '' }))).status, 400);
      assert.equal((await call('/messages', 'POST', message({ words: 'x'.repeat(3001) }))).status, 400);
      const closed = createApp(db, { ...env, PUBLIC_SUBMISSIONS_ENABLED: 'false' });
      assert.equal((await closed(new Request(env.APP_ORIGIN + '/api/messages', { method: 'POST', headers: { Origin: env.APP_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(message()) }))).status, 503);
    });
    await t.test('anonymous submit persists once; retries return same receipt and no personal data', async () => {
      const payload = message(); const r = await call('/messages', 'POST', payload); assert.equal(r.status, 201, JSON.stringify(r.body)); messageId = r.body.id;
      const retry = await call('/messages', 'POST', payload); assert.equal(retry.status, 200); assert.equal(retry.body.id, messageId);
      assert.deepEqual(Object.keys(retry.body), ['id']);
      assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM messages WHERE request_id=$1', [payload.requestId])).rows[0].n), 1);
      assert.equal((await call('/messages/' + messageId)).status, 401);
      const r2 = await call('/messages', 'POST', message({ wantsContact: false, contact: 'must-not-be-saved' }));
      assert.equal(r2.status, 201); assert.equal((await db.query('SELECT contact FROM messages WHERE id=$1', [r2.body.id])).rows[0].contact, '');
    });
    await t.test('same public IP is limited; DB keeps hashed rate identifiers only', async () => {
      const ip = '9.9.9.9';
      for (let i = 0; i < 5; i++) assert.equal((await call('/messages', 'POST', message(), '', ip)).status, 201);
      assert.equal((await call('/messages', 'POST', message(), '', ip)).status, 429);
      const keys = (await db.query('SELECT key FROM rate_limits')).rows;
      assert.ok(keys.every(r => /^[a-f0-9]{64}$/.test(r.key)));
    });
    await t.test('superadmin creates an account with a single-use hashed activation link; role escalation ignored', async () => {
      const r = await call('/staff', 'POST', { name: '测试同学', email: 'member@example.test', role: 'superadmin' }, ownerCookie);
      assert.equal(r.status, 201, JSON.stringify(r.body)); rawActivation = new URLSearchParams(new URL(r.body.activationUrl).hash.slice(1)).get('activate');
      assert.equal((await call('/login', 'POST', { email: 'member@example.test', password: 'test-member-password-123!' })).status, 401);
      assert.equal((await call('/activate', 'POST', { token: rawActivation, password: 'test-member-password-123!' })).status, 200);
      assert.equal((await call('/activate', 'POST', { token: rawActivation, password: 'test-member-password-123!' })).status, 400);
      const login = await call('/login', 'POST', { email: 'member@example.test', password: 'test-member-password-123!' });
      assert.equal(login.status, 200); managerCookie = login.cookie; managerId = login.body.user.id; assert.equal(login.body.user.role, 'manager');
      assert.ok(!(await db.query('SELECT token_hash FROM activations')).rows.some(r => r.token_hash === rawActivation));
    });
    await t.test('ordinary manager can follow up; cannot delete or manage accounts; stale updates rejected', async () => {
      const r = await call('/messages/' + messageId, 'GET', undefined, managerCookie); assert.equal(r.status, 200); revision = r.body.message.revision;
      assert.equal((await call('/messages/' + messageId, 'DELETE', { confirm: '删除', revision }, managerCookie)).status, 403);
      assert.equal((await call('/staff', 'POST', { name: 'x', email: 'bad@example.test' }, managerCookie)).status, 403);
      assert.equal((await call('/staff/' + managerId, 'PATCH', { active: false }, managerCookie)).status, 403);
      const update = { revision, status: 'contacted', assigneeId: managerId, note: '已联系，仅测试。<script>alert(1)</script>' };
      assert.equal((await call('/messages/' + messageId, 'PATCH', update, managerCookie)).status, 200);
      assert.equal((await call('/messages/' + messageId, 'PATCH', update, managerCookie)).status, 409);
      const after = await call('/messages/' + messageId, 'GET', undefined, ownerCookie);
      assert.equal(after.body.notes.length, 1); assert.equal(after.body.message.assignee_id, managerId); assert.ok(after.body.message.contacted_at);
      revision = after.body.message.revision;
      assert.ok((await call('/staff', 'GET', undefined, managerCookie)).body.staff.every(s => !('email' in s)));
      const badAssignee = await call('/messages/' + messageId, 'PATCH', { ...update, revision, assigneeId: randomUUID(), note: 'should-not-save' }, ownerCookie);
      assert.equal(badAssignee.status, 400); assert.equal((await call('/messages/' + messageId, 'GET', undefined, ownerCookie)).body.notes.length, 1);
    });
    await t.test('disabling staff revokes existing sessions immediately; reset revokes old password', async () => {
      assert.equal((await call('/staff/' + managerId, 'PATCH', { active: false }, ownerCookie)).status, 200);
      assert.equal((await call('/me', 'GET', undefined, managerCookie)).status, 401);
      assert.equal((await call('/staff/' + managerId, 'PATCH', { active: true }, ownerCookie)).status, 200);
      const r = await call('/staff/' + managerId + '/activation', 'POST', {}, ownerCookie); assert.equal(r.status, 200);
      assert.equal((await call('/login', 'POST', { email: 'member@example.test', password: 'test-member-password-123!' })).status, 401);
      const raw = new URLSearchParams(new URL(r.body.activationUrl).hash.slice(1)).get('activate');
      assert.equal((await call('/activate', 'POST', { token: raw, password: 'test-member-new-password-123!' })).status, 200);
    });
    await t.test('pagination does not repeat or skip rows at the same timestamp', async () => {
      const ids = Array.from({ length: 43 }, () => randomUUID());
      await db.transaction(async tx => { for (const id of ids) await tx.query('INSERT INTO messages(id,request_id,wants_contact,privacy_version) VALUES($1,$2,FALSE,$3)', [id, randomUUID(), PRIVACY_VERSION]); });
      const first = await call('/messages', 'GET', undefined, ownerCookie); assert.equal(first.status, 200, JSON.stringify(first.body)); assert.equal(first.body.messages.length, 40); assert.ok(first.body.next);
      const params = new URLSearchParams(first.body.next); const second = await call('/messages?' + params, 'GET', undefined, ownerCookie);
      const found = [...first.body.messages, ...second.body.messages].map(m => m.id);
      assert.equal(new Set(found).size, found.length); assert.ok(ids.every(id => found.includes(id)));
    });
    await t.test('data survives restart; superadmin deletion cascades notes, retains no contents in audit', async () => {
      await db.close(); db = await localDatabase(join(directory, 'pg')); app = createApp(db, env);
      assert.equal((await call('/messages/' + messageId, 'GET', undefined, ownerCookie)).body.notes.length, 1);
      assert.equal((await call('/messages/' + messageId, 'DELETE', { confirm: '', revision }, ownerCookie)).status, 400);
      assert.equal((await call('/messages/' + messageId, 'DELETE', { confirm: '删除', revision }, ownerCookie)).status, 200);
      assert.equal((await call('/messages/' + messageId, 'GET', undefined, ownerCookie)).status, 404);
      assert.equal((await db.query('SELECT * FROM notes WHERE message_id=$1', [messageId])).rows.length, 0);
      const deletion = (await db.query("SELECT * FROM audit WHERE target_id=$1 AND action='delete_message'", [messageId])).rows[0];
      assert.ok(deletion); assert.ok(!JSON.stringify(deletion).includes('test-wechat'));
    });
    await t.test('password change expires old sessions; signout expires server session', async () => {
      const r = await call('/password', 'POST', { currentPassword: 'test-owner-password-123!', password: 'test-owner-new-password-456!' }, ownerCookie); assert.equal(r.status, 200);
      assert.equal((await call('/me', 'GET', undefined, ownerCookie)).status, 401);
      const login = await call('/login', 'POST', { email: env.SUPERADMIN_EMAIL, password: 'test-owner-new-password-456!' }); assert.equal(login.status, 200); ownerCookie = login.cookie;
      assert.equal((await call('/logout', 'POST', {}, ownerCookie)).status, 200);
      assert.equal((await call('/me', 'GET', undefined, ownerCookie)).status, 401);
    });
  } finally { await db.close(); await rm(directory, { recursive: true, force: true }); }
});
