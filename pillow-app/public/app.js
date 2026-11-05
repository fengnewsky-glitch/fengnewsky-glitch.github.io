const $ = s => document.querySelector(s);
let enabled = false, privacyVersion = '', sending = false, requestId = '', submittedContent = '';
const groups = document.querySelectorAll('.choices');
groups.forEach(group => group.addEventListener('click', event => {
  if (!event.target.matches('button')) return;
  const on = event.target.getAttribute('aria-pressed') === 'true';
  if (group.dataset.group === 'state') group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
  event.target.setAttribute('aria-pressed', String(!on));
}));
function show(id) {
  ['home', 'formSection', 'reviewSection', 'successSection'].forEach(n => $('#' + n).classList.toggle('hidden', n !== id));
  window.scrollTo(0, 0);
  const heading = $('#' + id).querySelector('h1,h2');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
function start(just) {
  show('formSection');
  if (just) { $('#justLeave').setAttribute('aria-pressed', 'true'); $('#wantsContact').checked = false; contactMode(); }
}
function contactMode() {
  const wants = $('#wantsContact').checked;
  $('#contact').disabled = !wants; $('#contact').required = wants;
  $('#contactWrap').classList.toggle('hidden', !wants);
}
function clearAll() {
  $('#pillowForm').reset(); groups.forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false')));
  $('#reviewText').textContent = ''; $('#submitError').textContent = ''; $('#formError').textContent = '';
  requestId = ''; submittedContent = ''; contactMode(); show('home');
}
function data() {
  const selected = group => Array.from(document.querySelectorAll(`[data-group="${group}"] [aria-pressed="true"]`)).map(b => b.textContent);
  return { nickname: $('#nickname').value.trim(), state: selected('state')[0] || '', needs: selected('need'), words: $('#words').value.trim(),
    avoid: $('#avoid').value.trim(), wantsContact: $('#wantsContact').checked, contact: $('#wantsContact').checked ? $('#contact').value.trim() : '',
    consent: $('#consent').checked, privacyVersion, website: $('#website').value };
}
$('#startContact').addEventListener('click', () => start(false));
$('#startLeave').addEventListener('click', () => start(true));
$('#backHome').addEventListener('click', () => show('home'));
$('#backEdit').addEventListener('click', () => { if (!sending) show('formSection'); });
$('#clearAll').addEventListener('click', () => { if (!sending) clearAll(); });
$('#successHome').addEventListener('click', clearAll);
$('#wantsContact').addEventListener('change', contactMode);
$('#pillowForm').addEventListener('submit', event => {
  event.preventDefault(); $('#formError').textContent = '';
  const b = data();
  if (!b.state && !b.needs.length && !b.words) { $('#formError').textContent = '选一个状态，或留下一句话就可以。'; return; }
  if (b.wantsContact && !b.contact) { $('#formError').textContent = '希望被联系时，请留一个可用的微信号或手机号。'; return; }
  $('#reviewText').textContent = `昵称：${b.nickname || '未填写'}\n\n最近的状态：${b.state || '未填写'}\n\n希望得到：${b.needs.join('、') || '未填写'}\n\n想说的话：${b.words || '未填写'}\n\n陪伴偏好：${b.avoid || '未填写'}\n\n${b.wantsContact ? '联系方式：' + b.contact : '暂时不联系，只留言'}`;
  $('#submitError').textContent = ''; show('reviewSection');
});
$('#sendMessage').addEventListener('click', async () => {
  if (sending || !enabled) return;
  const body = data(); const serialized = JSON.stringify(body);
  if (!requestId || serialized !== submittedContent) { requestId = crypto.randomUUID(); submittedContent = serialized; }
  sending = true;
  for (const id of ['sendMessage', 'backEdit', 'clearAll']) $('#' + id).disabled = true;
  $('#sendMessage').textContent = '正在提交…'; $('#submitError').textContent = '';
  try {
    const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, requestId }), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '提交未完成，请稍后重试。');
    $('#receipt').textContent = result.id.slice(0, 8);
    $('#successPromise').textContent = body.wantsContact ? '我们已收到留言。指定同学会在24小时内按你留下的方式联系你。' : '我们已收到留言。你选择了暂时不联系，我们会尊重你的意愿。';
    $('#pillowForm').reset(); $('#reviewText').textContent = '';
    groups.forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false')));
    contactMode(); requestId = ''; submittedContent = ''; show('successSection');
  } catch (error) {
    $('#submitError').textContent = ['TimeoutError', 'TypeError'].includes(error.name) ? '网络暂时没有回应。内容仍在当前页面，可再次提交；同一份留言重试不会重复保存。' : error.message;
  } finally {
    sending = false;
    for (const id of ['sendMessage', 'backEdit', 'clearAll']) $('#' + id).disabled = id === 'sendMessage' && !enabled;
    $('#sendMessage').textContent = '确认提交留言';
  }
});
contactMode();
(async () => {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' }); if (!r.ok) throw new Error();
    const config = await r.json(); enabled = config.enabled === true; privacyVersion = config.privacyVersion;
  } catch { enabled = false; }
  $('#siteState').textContent = enabled ? '私密留言 · 专人回应' : '体验预览 · 尚未开放留言';
  $('#formNotice').textContent = enabled ? '可以用昵称。只有指定的管理同学能查看留言；是否希望被联系，由你决定。提交前还可以检查和修改。' : '留言接收尚未开放。你可以体验流程，请使用示例文字；内容不会提交。';
  $('#reviewIntro').textContent = enabled ? '留言尚未发送，确认后再交给我们。' : '这是体验预览，当前不能发送留言。';
  $('#sendMessage').disabled = !enabled;
  $('#sendMessage').textContent = enabled ? '确认提交留言' : '留言入口尚未开放';
})();
