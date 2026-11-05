const $ = selector => document.querySelector(selector);
const statusNames = { pending: '待回应', contacted: '已联系', accompanying: '陪伴中', closed: '已结束' };
let user = null, staff = [], nextPage = null, pageVersion = 0, loading = false, currentDetail = null;
const hash = new URLSearchParams(location.hash.slice(1));
let activationToken = hash.get('activate') || '', setupSecret = hash.get('setup') || '';
if (activationToken || setupSecret) history.replaceState(null, '', location.pathname);
const date = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '';
function node(tag, content, className) { const n = document.createElement(tag); if (content !== undefined) n.textContent = content; if (className) n.className = className; return n; }
function button(label, handler, className) { const b = node('button', label, className); b.type = 'button'; b.addEventListener('click', handler); return b; }
function notice(message) { $('#globalMessage').textContent = message; $('#globalMessage').classList.toggle('hidden', !message); }
function clearPrivateUI() {
  user = null; staff = []; nextPage = null; currentDetail = null; pageVersion++;
  $('#workspace').classList.add('hidden'); $('#authSection').classList.remove('hidden');
  for (const id of ['messageList', 'detailContent', 'staffList', 'summary', 'signedIn', 'activationUrl', 'overdue']) { const el = $('#' + id); if (el.tagName === 'INPUT') el.value = ''; else el.replaceChildren(); }
  $('#activationBox').classList.add('hidden'); $('#detailDialog').close(); $('#passwordDialog').close();
  $('#passwordForm').reset(); $('#loginForm').reset();
}
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  let value;
  try { value = await r.json(); } catch { throw new Error('服务暂时没有回应，请稍后再试。'); }
  if (r.status === 401 && user) { clearPrivateUI(); notice('登录已过期，请重新登录。'); }
  if (!r.ok) throw new Error(value.error || '操作未完成。');
  return value;
}
async function busy(form, callback, errorId) {
  const b = form.querySelector('button[type="submit"],button.primary');
  if (b?.disabled) return;
  if (b) b.disabled = true;
  $('#' + errorId).textContent = '';
  try { await callback(); } catch (error) { $('#' + errorId).textContent = ['TimeoutError', 'TypeError'].includes(error.name) ? '网络暂时没有回应，请检查连接后重试。' : error.message; }
  finally { if (b) b.disabled = false; }
}
async function copy(value, control) {
  try { await navigator.clipboard.writeText(value); const label = control.textContent; control.textContent = '已复制'; setTimeout(() => control.textContent = label, 1800); }
  catch { notice('浏览器未允许自动复制，请选中文字手工复制。'); }
}
async function enter(current) {
  user = current; activationToken = ''; setupSecret = '';
  $('#loginForm').classList.remove('hidden'); $('#activateForm').classList.add('hidden');
  $('#authTitle').textContent = '欢迎回来'; $('#authIntro').textContent = '指定的管理同学登录后，可查看和跟进私密留言。';
  panels('messages');
  $('#authSection').classList.add('hidden'); $('#workspace').classList.remove('hidden');
  $('#signedIn').textContent = `${current.name} · ${current.role === 'superadmin' ? '超级管理员' : '管理员'}`;
  $('#staffTab').classList.toggle('hidden', current.role !== 'superadmin');
  $('#loginForm').reset(); $('#activateForm').reset(); notice('');
  await loadStaff(); await refresh();
}
$('#loginForm').addEventListener('submit', event => {
  event.preventDefault(); busy(event.target, async () => {
    const result = await api('/login', 'POST', { email: $('#email').value.trim(), password: $('#password').value });
    await enter(result.user);
  }, 'authError');
});
if (activationToken || setupSecret) {
  $('#loginForm').classList.add('hidden'); $('#activateForm').classList.remove('hidden');
  $('#authTitle').textContent = setupSecret ? '开通超级管理员' : '开通管理账号';
  $('#authIntro').textContent = '为自己设置一个独立密码。请勿将开通链接转给其他人。';
  if (setupSecret) for (const id of ['displayName', 'displayNameLabel']) $('#' + id).classList.remove('hidden');
  $('#displayName').required = !!setupSecret;
}
$('#activateForm').addEventListener('submit', event => {
  event.preventDefault(); busy(event.target, async () => {
    if ($('#newPassword').value !== $('#repeatPassword').value) throw new Error('两次输入的密码不一致。');
    if (setupSecret) {
      const result = await api('/setup', 'POST', { secret: setupSecret, name: $('#displayName').value.trim(), password: $('#newPassword').value });
      await enter(result.user);
    } else {
      await api('/activate', 'POST', { token: activationToken, password: $('#newPassword').value });
      activationToken = ''; $('#activateForm').reset(); $('#activateForm').classList.add('hidden'); $('#loginForm').classList.remove('hidden');
      $('#authTitle').textContent = '账号已开通'; $('#authIntro').textContent = '请使用负责人登记的邮箱和刚设置的密码登录。';
    }
  }, 'authError');
});
$('#logout').addEventListener('click', async () => {
  try { await api('/logout', 'POST', {}); clearPrivateUI(); notice('已退出。'); }
  catch { notice('退出请求未完成，请重试后再离开公共设备。'); }
});
$('#passwordButton').addEventListener('click', () => { $('#passwordError').textContent = ''; $('#passwordDialog').showModal(); });
$('#passwordForm').addEventListener('submit', event => {
  event.preventDefault(); busy(event.target, async () => {
    if ($('#changedPassword').value !== $('#changedRepeat').value) throw new Error('两次输入的新密码不一致。');
    await api('/password', 'POST', { currentPassword: $('#currentPassword').value, password: $('#changedPassword').value });
    clearPrivateUI(); notice('密码已修改，全部设备已退出，请重新登录。');
  }, 'passwordError');
});
async function loadStaff() {
  const result = await api('/staff'); if (!user) return;
  staff = result.staff;
  const select = $('#assigneeFilter'), selected = select.value;
  select.replaceChildren(new Option('全部负责人', ''), new Option('尚未分配', 'unassigned'));
  staff.forEach(s => select.add(new Option(s.name + (s.active ? '' : '（已停用）'), s.id)));
  if ([...select.options].some(o => o.value === selected)) select.value = selected;
  renderStaff();
}
async function refresh() {
  if (!user) return;
  $('#listError').textContent = '';
  try {
    const version = ++pageVersion;
    const value = await api('/summary'); if (!user || version !== pageVersion) return;
    $('#summary').replaceChildren(...Object.entries(statusNames).map(([key, label]) => { const div = node('div', label, 'stat'); div.append(node('strong', String(value.counts[key] || 0))); return div; }));
    $('#overdue').textContent = value.overdue ? `${value.overdue} 条希望被联系的留言已等待超过24小时，请优先处理。` : '';
    await loadMessages(false);
  } catch (error) { $('#listError').textContent = error.message; }
}
async function loadMessages(append) {
  if (loading && append) return;
  const version = ++pageVersion; loading = true; $('#loadMore').disabled = true;
  const params = new URLSearchParams({ status: $('#statusFilter').value, assignee: $('#assigneeFilter').value });
  if (append && nextPage) { params.set('before', nextPage.before); params.set('beforeId', nextPage.beforeId); }
  try {
    const value = await api('/messages?' + params); if (!user || version !== pageVersion) return;
    if (!append) $('#messageList').replaceChildren();
    for (const message of value.messages) {
      const control = button('', () => openDetail(message.id), 'card message');
      const head = node('div', undefined, 'messageHead'); head.append(node('strong', message.nickname || '一位朋友'), node('span', statusNames[message.status], 'tag'));
      control.append(head, node('p', message.words || message.needs.join('、') || message.state, 'excerpt'), node('p', `负责人：${message.assignee_name || '尚未分配'} · ${message.wants_contact ? '希望被联系' : '暂时只留言'}`, 'muted'), node('p', date(message.created_at), 'muted'));
      $('#messageList').append(control);
    }
    if (!$('#messageList').children.length) $('#messageList').append(node('p', '当前没有符合条件的留言。', 'muted'));
    nextPage = value.next; $('#loadMore').classList.toggle('hidden', !nextPage); $('#listError').textContent = '';
  } catch (error) { $('#listError').textContent = error.message; }
  finally { loading = false; $('#loadMore').disabled = false; }
}
$('#refresh').addEventListener('click', async () => { try { await loadStaff(); await refresh(); } catch (e) { notice(e.message); } });
$('#applyFilter').addEventListener('click', () => loadMessages(false));
$('#loadMore').addEventListener('click', () => loadMessages(true));
function panels(which) {
  $('#messagesPanel').classList.toggle('hidden', which !== 'messages'); $('#staffPanel').classList.toggle('hidden', which !== 'staff');
  $('#messageTab').classList.toggle('selected', which === 'messages'); $('#staffTab').classList.toggle('selected', which === 'staff');
  if (which !== 'staff') { $('#activationBox').classList.add('hidden'); $('#activationUrl').value = ''; }
}
$('#messageTab').addEventListener('click', () => panels('messages'));
$('#staffTab').addEventListener('click', () => panels('staff'));
async function openDetail(id) {
  if (!user) return;
  $('#detailContent').replaceChildren(node('p', '正在读取留言…')); if (!$('#detailDialog').open) $('#detailDialog').showModal();
  try {
    const result = await api('/messages/' + id); if (!user || !$('#detailDialog').open) return;
    currentDetail = result.message; renderDetail(result);
  } catch (error) { $('#detailContent').replaceChildren(node('p', error.message, 'error')); }
}
function renderDetail({ message: m, notes }) {
  const box = $('#detailContent'); box.replaceChildren(node('h2', m.nickname || '一位朋友的留言'), node('p', `编号 ${m.id.slice(0, 8)} · ${date(m.created_at)}`, 'muted'));
  for (const [label, value] of [['最近的状态', m.state], ['希望怎样被陪伴', m.needs.join('、')], ['想说的话', m.words], ['陪伴偏好', m.avoid]]) { box.append(node('h3', label), node('div', value || '未填写', 'detailText')); }
  box.append(node('h3', '联系方式'), node('div', m.wants_contact ? m.contact : '对方选择了暂时不联系，请尊重其意愿。', 'detailText'));
  if (m.wants_contact) box.append(button('复制联系方式', event => copy(m.contact, event.currentTarget)));
  const f = node('form'); const grid = node('div', undefined, 'detailGrid');
  const status = node('select'); status.setAttribute('aria-label', '跟进进度'); for (const [key, label] of Object.entries(statusNames)) status.add(new Option(label, key)); status.value = m.status;
  const assign = node('select'); assign.setAttribute('aria-label', '负责人'); assign.add(new Option('尚未分配', ''));
  staff.filter(s => s.active || s.id === m.assignee_id).forEach(s => assign.add(new Option(s.name + (s.active ? '' : '（已停用）'), s.id)));
  assign.value = m.assignee_id || '';
  const statusLabel = node('label', '跟进进度'); statusLabel.append(status); const assignLabel = node('label', '负责人'); assignLabel.append(assign); grid.append(statusLabel, assignLabel);
  const noteLabel = node('label', '新增内部备注（可不填）'); const note = node('textarea'); note.maxLength = 2000; note.placeholder = '记录已做的联系、双方约定和下一步，避免记录无关隐私。'; noteLabel.append(note);
  const error = node('p', '', 'error'); error.setAttribute('role', 'alert');
  const save = node('button', '保存跟进', 'primary'); save.type = 'submit'; f.append(grid, noteLabel, error, save); box.append(f);
  f.addEventListener('submit', async event => {
    event.preventDefault(); save.disabled = true; error.textContent = '';
    try {
      await api('/messages/' + m.id, 'PATCH', { status: status.value, assigneeId: assign.value || null, note: note.value.trim(), revision: m.revision });
      await openDetail(m.id); await refresh();
    } catch (e) { error.textContent = e.message; }
    finally { save.disabled = false; }
  });
  box.append(node('h3', '内部跟进记录'));
  if (!notes.length) box.append(node('p', '暂无内部备注。', 'muted'));
  for (const n of notes) { const div = node('div', undefined, 'note'); div.append(node('p', n.body), node('p', `${n.name} · ${date(n.created_at)}`, 'muted')); box.append(div); }
  if (user.role === 'superadmin') {
    const d = node('div', undefined, 'deleteBlock'); d.append(node('h3', '删除留言'), node('p', '删除后，当前数据库中的留言、联系方式及内部备注将一并移除，不能在工作台恢复。操作日志仅保留编号、操作者和时间。', 'muted'));
    const label = node('label', '确认删除请输入“删除”'); const input = node('input'); input.maxLength = 2; label.append(input); d.append(label);
    const del = button('永久删除这条留言', async () => {
      if (input.value !== '删除') { error.textContent = '请先输入“删除”。'; return; }
      del.disabled = true;
      try { await api('/messages/' + m.id, 'DELETE', { confirm: input.value, revision: m.revision }); $('#detailDialog').close(); $('#detailContent').replaceChildren(); currentDetail = null; notice('留言及内部备注已删除。'); await refresh(); }
      catch (e) { error.textContent = e.message; }
      finally { del.disabled = false; }
    }, 'danger'); d.append(del); box.append(d);
  }
}
function activation(url) { $('#activationUrl').value = url; $('#activationBox').classList.remove('hidden'); }
$('#copyActivation').addEventListener('click', event => copy($('#activationUrl').value, event.currentTarget));
$('#staffForm').addEventListener('submit', event => {
  event.preventDefault(); busy(event.target, async () => {
    const value = await api('/staff', 'POST', { email: $('#staffEmail').value.trim(), name: $('#staffName').value.trim() });
    event.target.reset(); activation(value.activationUrl); await loadStaff();
  }, 'staffError');
});
function renderStaff() {
  $('#staffList').replaceChildren(); if (user?.role !== 'superadmin') return;
  for (const s of staff) {
    const row = node('div', undefined, 'staffRow'); const info = node('div'); info.append(node('strong', s.name), node('p', `${s.email} · ${s.role === 'superadmin' ? '超级管理员' : '管理员'} · ${s.active ? '已启用' : '已停用'}`, 'muted')); row.append(info);
    if (s.role !== 'superadmin') {
      const controls = node('div', undefined, 'row');
      if (s.active) controls.append(button('重置开通链接', async event => {
        if (!confirm('这会立即退出该账号的全部设备，并使原密码失效。继续生成开通链接？')) return;
        event.currentTarget.disabled = true;
        try { const result = await api('/staff/' + s.id + '/activation', 'POST', {}); activation(result.activationUrl); }
        catch (e) { $('#staffError').textContent = e.message; }
        finally { event.target.disabled = false; }
      }));
      controls.append(button(s.active ? '停用账号' : '启用账号', async () => {
        if (!confirm(`${s.active ? '停用后会立即退出全部设备。' : '启用后需要重新生成开通链接。'}确认继续？`)) return;
        try { await api('/staff/' + s.id, 'PATCH', { active: !s.active }); await loadStaff(); }
        catch (e) { $('#staffError').textContent = e.message; }
      })); row.append(controls);
    }
    $('#staffList').append(row);
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user) api('/me').catch(() => {}); });
$('#detailDialog').addEventListener('close', () => { $('#detailContent').replaceChildren(); currentDetail = null; });
$('#passwordDialog').addEventListener('close', () => $('#passwordForm').reset());
if (!activationToken && !setupSecret) api('/me').then(value => enter(value.user)).catch(error => { if (!error.message.includes('登录')) notice('当前尚未登录，或后端服务尚未接通。'); });
