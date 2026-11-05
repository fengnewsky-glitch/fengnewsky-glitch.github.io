import { randomUUID } from 'node:crypto';
import { token, digest, privateKey, secureEqual, hashPassword, verifyPassword, validPassword } from './security.mjs';

const STATES = ['', '有点累', '有些事卡住了', '最近比较难熬', '我也说不清'];
const NEEDS = ['听我说说', '需要有一对一的聆听', '陪我待一会儿', '一起梳理一件事', '一起坐坐或读一小段', '暂时只留言'];
const STATUSES = ['pending', 'contacted', 'accompanying', 'closed'];
export const PRIVACY_VERSION = '2026-11-05-v1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const COOKIE = 'pillow_session';
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
function text(value, max, name, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, `请检查${name}。`);
  return value.trim();
}
function email(value) {
  const result = text(value, 254, '邮箱', true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, '请填写有效邮箱。');
  return result;
}
function uuid(value) { if (!UUID.test(value ?? '')) fail(400, '记录编号不正确。'); return value; }
function cookieValue(request) {
  const value = (request.headers.get('cookie') || '').split(';').find(part => part.trim().startsWith(`${COOKIE}=`));
  return value ? value.trim().slice(COOKIE.length + 1) : '';
}
async function jsonBody(request) {
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) fail(415, '请使用页面表单提交。');
  if (Number(request.headers.get('content-length') || 0) > 18000) fail(413, '填写内容过长。');
  const reader = request.body?.getReader();
  if (!reader) fail(400, '请填写内容。');
  const chunks = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > 18000) { await reader.cancel(); fail(413, '填写内容过长。'); }
    chunks.push(value);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error();
    return result;
  } catch { fail(400, '提交格式有误，请重新填写。'); }
}
const publicStaff = row => ({ id: row.id, name: row.name, role: row.role, active: row.active });
async function audit(db, actor, action, target) {
  await db.query('INSERT INTO audit(id,staff_id,action,target_id) VALUES($1,$2,$3,$4)', [randomUUID(), actor.id, action, target]);
}

export function createApp(db, env = {}) {
  return async function handle(request, context = {}) {
    const url = new URL(request.url);
    const origin = env.APP_ORIGIN || url.origin;
    const secure = !origin.startsWith('http://localhost:') && !origin.startsWith('http://127.0.0.1:');
    const result = (value, status = 200, extra = {}) => Response.json(value, {
      status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extra }
    });
    const sessionCookie = (value, seconds = 28800) => `${COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
    const rateSecret = env.RATE_LIMIT_SECRET;
    async function rate(action, maximum, seconds, subject = context.ip || 'unknown') {
      if (!rateSecret || rateSecret.length < 32) fail(503, '服务尚未配置完成。');
      const now = Date.now(); const bucket = Math.floor(now / (seconds * 1000));
      const key = privateKey(rateSecret, `${action}:${subject}:${bucket}`);
      const end = new Date((bucket + 1) * seconds * 1000).toISOString();
      const r = await db.query('INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count', [key, end]);
      if (r.rows[0].count > maximum) fail(429, '操作较频繁，请稍后再试。');
      await db.query('DELETE FROM rate_limits WHERE expires_at < CURRENT_TIMESTAMP');
    }
    async function auth() {
      const raw = cookieValue(request);
      if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) fail(401, '请先登录。');
      const { rows } = await db.query('SELECT u.* FROM sessions s JOIN staff u ON u.id=s.staff_id WHERE s.token_hash=$1 AND s.expires_at>CURRENT_TIMESTAMP AND u.active=TRUE', [digest(raw)]);
      if (!rows[0]) fail(401, '登录已过期，请重新登录。');
      return rows[0];
    }
    function superOnly(user) { if (user.role !== 'superadmin') fail(403, '此操作仅限超级管理员。'); }
    async function newSession(user, executor = db) {
      const value = token();
      await executor.query('DELETE FROM sessions WHERE expires_at<CURRENT_TIMESTAMP');
      await executor.query('INSERT INTO sessions(token_hash,staff_id,expires_at) VALUES($1,$2,$3)', [digest(value), user.id, new Date(Date.now() + 28800000).toISOString()]);
      return value;
    }
    try {
      const path = url.pathname.replace(/\/$/, '');
      const method = request.method;
      if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) fail(405, '不支持此操作。');
      if (method !== 'GET' && request.headers.get('origin') !== origin) fail(403, '请从本站页面提交。');

      if (path === '/api/config' && method === 'GET') {
        const { rows } = await db.query("SELECT id FROM staff WHERE role='superadmin' AND active=TRUE LIMIT 1");
        return result({ enabled: env.PUBLIC_SUBMISSIONS_ENABLED === 'true' && !!rows.length && !!rateSecret && rateSecret.length >= 32, privacyVersion: PRIVACY_VERSION });
      }
      if (path === '/api/setup' && method === 'POST') {
        await rate('setup', 5, 900);
        const body = await jsonBody(request);
        if (!env.BOOTSTRAP_SECRET || env.BOOTSTRAP_SECRET.length < 32 || typeof body.secret !== 'string' || !secureEqual(body.secret, env.BOOTSTRAP_SECRET)) fail(403, '开通链接无效。');
        const address = email(env.SUPERADMIN_EMAIL || '');
        const name = text(body.name, 50, '称呼', true);
        if (!validPassword(body.password)) fail(400, '密码需要12至128个字符。');
        const encoded = await hashPassword(body.password);
        const user = { id: randomUUID(), name, email: address, role: 'superadmin', active: true };
        const raw = await db.transaction(async tx => {
          // Unique fixed bootstrap email also serializes concurrent setup attempts.
          const insert = await tx.query("INSERT INTO staff(id,email,name,role,password_hash) SELECT $1,$2,$3,'superadmin',$4 WHERE NOT EXISTS(SELECT 1 FROM staff WHERE role='superadmin') ON CONFLICT(email) DO NOTHING RETURNING id", [user.id, address, name, encoded]);
          if (!insert.rows.length) fail(409, '超级管理员已经开通，请直接登录。');
          await audit(tx, user, 'setup', user.id);
          return newSession(user, tx);
        });
        return result({ user: { ...publicStaff(user), email: address } }, 201, { 'Set-Cookie': sessionCookie(raw) });
      }
      if (path === '/api/login' && method === 'POST') {
        await rate('login-ip', 30, 900);
        const body = await jsonBody(request); const address = email(body.email);
        await rate('login-email', 8, 900, address);
        const { rows } = await db.query('SELECT * FROM staff WHERE email=$1', [address]);
        const user = rows[0];
        const passwordOk = await verifyPassword(body.password, user?.password_hash || 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128));
        if (!user?.active || !user.password_hash || !passwordOk) fail(401, '邮箱或密码不正确，或账号尚未开通。');
        const raw = await newSession(user);
        return result({ user: { ...publicStaff(user), email: user.email } }, 200, { 'Set-Cookie': sessionCookie(raw) });
      }
      if (path === '/api/activate' && method === 'POST') {
        await rate('activation', 10, 900);
        const body = await jsonBody(request);
        if (!/^[A-Za-z0-9_-]{43}$/.test(body.token || '')) fail(400, '开通链接无效或已过期。');
        if (!validPassword(body.password)) fail(400, '密码需要12至128个字符。');
        const encoded = await hashPassword(body.password);
        await db.transaction(async tx => {
          const { rows } = await tx.query('DELETE FROM activations WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP RETURNING staff_id', [digest(body.token)]);
          if (!rows.length) fail(400, '开通链接无效或已过期。');
          const updated = await tx.query('UPDATE staff SET password_hash=$1 WHERE id=$2 AND active=TRUE RETURNING id', [encoded, rows[0].staff_id]);
          if (!updated.rows.length) fail(400, '账号已停用，请联系负责人。');
          await tx.query('DELETE FROM sessions WHERE staff_id=$1', [rows[0].staff_id]);
          await audit(tx, { id: rows[0].staff_id }, 'activate', rows[0].staff_id);
        });
        return result({ ok: true });
      }
      if (path === '/api/messages' && method === 'POST') {
        if (env.PUBLIC_SUBMISSIONS_ENABLED !== 'true') fail(503, '留言入口尚未开放，请稍后再来。');
        const owner = await db.query("SELECT id FROM staff WHERE role='superadmin' AND active=TRUE LIMIT 1");
        if (!owner.rows.length) fail(503, '留言入口尚未开放，请稍后再来。');
        const b = await jsonBody(request);
        if (b.website) fail(400, '提交未完成，请重新打开页面。');
        if (b.consent !== true || b.privacyVersion !== PRIVACY_VERSION) fail(400, '请阅读并同意当前的隐私说明。');
        const requestId = uuid(b.requestId); const nickname = text(b.nickname, 50, '昵称');
        const state = text(b.state, 30, '最近状态');
        if (!STATES.includes(state) || !Array.isArray(b.needs) || b.needs.length > NEEDS.length || b.needs.some(n => !NEEDS.includes(n))) fail(400, '请选择页面中的陪伴选项。');
        const needs = [...new Set(b.needs)]; const words = text(b.words, 3000, '留言'); const avoid = text(b.avoid, 300, '陪伴偏好');
        if (typeof b.wantsContact !== 'boolean') fail(400, '请选择是否希望被联系。');
        const contact = b.wantsContact ? text(b.contact, 200, '联系方式', true) : '';
        if (!state && !needs.length && !words) fail(400, '选一个状态，或留下一句话就可以。');
        // A retry receives only its receipt, never the stored personal data.
        const prior = await db.query('SELECT id FROM messages WHERE request_id=$1', [requestId]);
        if (prior.rows.length) return result({ id: prior.rows[0].id }, 200);
        await rate('submit', 5, 3600);
        const id = randomUUID();
        const { rows } = await db.query('INSERT INTO messages(id,request_id,nickname,state,needs,words,avoid,contact,wants_contact,privacy_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(request_id) DO NOTHING RETURNING id', [id, requestId, nickname, state, JSON.stringify(needs), words, avoid, contact, b.wantsContact, PRIVACY_VERSION]);
        if (rows.length) return result({ id }, 201);
        const duplicate = await db.query('SELECT id FROM messages WHERE request_id=$1', [requestId]);
        return result({ id: duplicate.rows[0].id });
      }

      const user = await auth();
      if (path === '/api/me' && method === 'GET') return result({ user: { ...publicStaff(user), email: user.email } });
      if (path === '/api/logout' && method === 'POST') {
        await db.query('DELETE FROM sessions WHERE token_hash=$1', [digest(cookieValue(request))]);
        return result({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
      }
      if (path === '/api/password' && method === 'POST') {
        await rate('password', 8, 900, user.id);
        const b = await jsonBody(request);
        if (!await verifyPassword(b.currentPassword, user.password_hash)) fail(400, '原密码不正确。');
        if (!validPassword(b.password)) fail(400, '新密码需要12至128个字符。');
        const encoded = await hashPassword(b.password);
        await db.transaction(async tx => {
          await tx.query('UPDATE staff SET password_hash=$1 WHERE id=$2', [encoded, user.id]);
          await tx.query('DELETE FROM sessions WHERE staff_id=$1', [user.id]);
          await tx.query('DELETE FROM activations WHERE staff_id=$1', [user.id]);
          await audit(tx, user, 'change_password', user.id);
        });
        return result({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
      }
      if (path === '/api/staff' && method === 'GET') {
        const { rows } = await db.query('SELECT id,name,role,active,email FROM staff ORDER BY created_at,id');
        return result({ staff: rows.map(row => user.role === 'superadmin' ? row : publicStaff(row)) });
      }
      if (path === '/api/staff' && method === 'POST') {
        superOnly(user); const b = await jsonBody(request);
        const address = email(b.email); const name = text(b.name, 50, '称呼', true);
        const id = randomUUID(); const raw = token();
        await db.transaction(async tx => {
          const insert = await tx.query("INSERT INTO staff(id,email,name,role) VALUES($1,$2,$3,'manager') ON CONFLICT(email) DO NOTHING RETURNING id", [id, address, name]);
          if (!insert.rows.length) fail(409, '该邮箱已有账号，请使用重置开通链接。');
          await tx.query('INSERT INTO activations(token_hash,staff_id,expires_at) VALUES($1,$2,$3)', [digest(raw), id, new Date(Date.now()+86400000).toISOString()]);
          await audit(tx, user, 'create_staff', id);
        });
        return result({ activationUrl: `${origin}/admin/#activate=${raw}` }, 201);
      }
      const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/);
      if (staffMatch && method === 'PATCH') {
        superOnly(user); const id = uuid(staffMatch[1]); const b = await jsonBody(request);
        if (typeof b.active !== 'boolean' || id === user.id) fail(400, '不能停用当前超级管理员。');
        await db.transaction(async tx => {
          const update = await tx.query("UPDATE staff SET active=$1 WHERE id=$2 AND role='manager' RETURNING id", [b.active, id]);
          if (!update.rows.length) fail(404, '找不到该同学账号。');
          await tx.query('DELETE FROM sessions WHERE staff_id=$1', [id]);
          await tx.query('DELETE FROM activations WHERE staff_id=$1', [id]);
          await audit(tx, user, b.active ? 'enable_staff' : 'disable_staff', id);
        });
        return result({ ok: true });
      }
      const resetMatch = path.match(/^\/api\/staff\/([^/]+)\/activation$/);
      if (resetMatch && method === 'POST') {
        superOnly(user); const id = uuid(resetMatch[1]); const raw = token();
        await db.transaction(async tx => {
          const r = await tx.query("UPDATE staff SET password_hash=NULL WHERE id=$1 AND role='manager' AND active=TRUE RETURNING id", [id]);
          if (!r.rows.length) fail(400, '请先启用该同学账号。');
          await tx.query('DELETE FROM sessions WHERE staff_id=$1', [id]);
          await tx.query('DELETE FROM activations WHERE staff_id=$1', [id]);
          await tx.query('INSERT INTO activations(token_hash,staff_id,expires_at) VALUES($1,$2,$3)', [digest(raw), id, new Date(Date.now()+86400000).toISOString()]);
          await audit(tx, user, 'reset_staff', id);
        });
        return result({ activationUrl: `${origin}/admin/#activate=${raw}` });
      }
      if (path === '/api/summary' && method === 'GET') {
        const { rows } = await db.query("SELECT status,COUNT(*)::int AS count FROM messages GROUP BY status");
        const overdue = await db.query("SELECT COUNT(*)::int AS count FROM messages WHERE status='pending' AND wants_contact=TRUE AND created_at<CURRENT_TIMESTAMP-INTERVAL '24 hours'");
        return result({ counts: Object.fromEntries(rows.map(r => [r.status, r.count])), overdue: overdue.rows[0].count });
      }
      if (path === '/api/messages' && method === 'GET') {
        const status = url.searchParams.get('status') || '';
        const assignee = url.searchParams.get('assignee') || '';
        if (status && !STATUSES.includes(status)) fail(400, '进度筛选无效。');
        if (assignee && assignee !== 'unassigned') uuid(assignee);
        const before = url.searchParams.get('before'); const beforeId = url.searchParams.get('beforeId');
        if (before && (!Number.isFinite(Date.parse(before)) || !beforeId)) fail(400, '分页标记无效。');
        if (beforeId) uuid(beforeId);
        const { rows } = await db.query(`SELECT m.*,u.name AS assignee_name FROM messages m LEFT JOIN staff u ON u.id=m.assignee_id
          WHERE ($1='' OR m.status=$1) AND ($2='' OR ($2='unassigned' AND m.assignee_id IS NULL) OR m.assignee_id::text=$2)
          AND ($3::timestamptz IS NULL OR (m.created_at,m.id)<($3::timestamptz,$4::uuid))
          ORDER BY m.created_at DESC,m.id DESC LIMIT 41`, [status, assignee, before || null, beforeId || null]);
        const items = rows.slice(0, 40); const last = items.at(-1);
        return result({ messages: items.map(({ request_id, privacy_version, ...row }) => row), next: rows.length > 40 ? { before: last.created_at, beforeId: last.id } : null });
      }
      const match = path.match(/^\/api\/messages\/([^/]+)$/);
      if (match) {
        const id = uuid(match[1]);
        if (method === 'GET') {
          const { rows } = await db.query('SELECT * FROM messages WHERE id=$1', [id]);
          if (!rows.length) fail(404, '留言不存在或已删除。');
          const notes = await db.query('SELECT n.id,n.body,n.created_at,u.name FROM notes n JOIN staff u ON u.id=n.staff_id WHERE n.message_id=$1 ORDER BY n.created_at,n.id', [id]);
          const { request_id, ...message } = rows[0];
          return result({ message, notes: notes.rows });
        }
        if (method === 'PATCH') {
          const b = await jsonBody(request);
          if (!STATUSES.includes(b.status) || !Number.isInteger(b.revision)) fail(400, '请检查进度。');
          const assignee = b.assigneeId === null ? null : uuid(b.assigneeId);
          const note = text(b.note || '', 2000, '内部备注');
          await db.transaction(async tx => {
            if (assignee) {
              const r = await tx.query('SELECT id FROM staff WHERE id=$1 AND active=TRUE', [assignee]);
              if (!r.rows.length) fail(400, '请选择已启用的负责人。');
            }
            const r = await tx.query(`UPDATE messages SET status=$1,assignee_id=$2,updated_at=CURRENT_TIMESTAMP,revision=revision+1,
              contacted_at=CASE WHEN $1 IN ('contacted','accompanying') AND contacted_at IS NULL THEN CURRENT_TIMESTAMP ELSE contacted_at END
              WHERE id=$3 AND revision=$4 RETURNING id`, [b.status, assignee, id, b.revision]);
            if (!r.rows.length) fail(409, '留言已被其他同学更新或删除，请刷新后再操作。');
            if (note) await tx.query('INSERT INTO notes(id,message_id,staff_id,body) VALUES($1,$2,$3,$4)', [randomUUID(), id, user.id, note]);
            await audit(tx, user, 'update_message', id);
          });
          return result({ ok: true });
        }
        if (method === 'DELETE') {
          superOnly(user); const b = await jsonBody(request);
          if (b.confirm !== '删除' || !Number.isInteger(b.revision)) fail(400, '请确认删除。');
          await db.transaction(async tx => {
            const r = await tx.query('DELETE FROM messages WHERE id=$1 AND revision=$2 RETURNING id', [id, b.revision]);
            if (!r.rows.length) fail(409, '留言已更新或删除，请刷新后再操作。');
            await audit(tx, user, 'delete_message', id);
          });
          return result({ ok: true });
        }
      }
      fail(404, '找不到此功能。');
    } catch (error) {
      if (error instanceof HttpError) return result({ error: error.message }, error.status, error.status === 429 ? { 'Retry-After': '900' } : {});
      return result({ error: '服务暂时不可用，请稍后重试。' }, 503);
    }
  };
}
