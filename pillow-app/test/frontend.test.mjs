import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { parseHTML } from 'linkedom';

const flush = () => new Promise(resolve => setImmediate(resolve));
async function page(enabled, failFirst = false) {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const { document, window } = parseHTML(html);
  const initial = Array.from(document.querySelectorAll('input,textarea')).map(el => [el, el.getAttribute('value') || '', el.hasAttribute('checked')]);
  for (const [el, value, checked] of initial) { el.value = value; if (el.type === 'checkbox') el.checked = checked; }
  document.querySelector('#pillowForm').reset = () => { for (const [el, value, checked] of initial) { el.value = value; if (el.type === 'checkbox') el.checked = checked; } };
  window.scrollTo = () => {};
  const calls = [];
  const context = vm.createContext({ document, window, crypto: webcrypto, AbortSignal,
    fetch: async (url, options) => {
      if (url === '/api/config') return Response.json({ enabled, privacyVersion: '2026-11-05-v1' });
      calls.push(JSON.parse(options.body));
      if (failFirst && calls.length === 1) throw new TypeError('offline');
      return Response.json({ id: '12345678-0000-4000-8000-000000000001' }, { status: 201 });
    }
  });
  vm.runInContext(script, context); await flush();
  const $ = selector => document.querySelector(selector);
  const click = el => el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  const submit = () => $('#pillowForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  return { document, $, calls, click, submit, window };
}

test('frontend: confirmed submission succeeds, clears private fields and respects no-contact choice', async () => {
  const p = await page(true); const { $, click, submit, calls } = p;
  assert.equal($('#sendMessage').disabled, false);
  click($('#startLeave'));
  assert.equal($('#wantsContact').checked, false);
  $('#words').value = '<img src=x onerror=alert(1)>测试文字'; $('#contact').value = 'must-not-send'; $('#consent').checked = true;
  submit();
  assert.equal($('#reviewSection').classList.contains('hidden'), false);
  assert.match($('#reviewText').textContent, /<img src=x/);
  assert.equal($('#reviewText').querySelectorAll('img').length, 0);
  click($('#sendMessage')); await flush();
  assert.equal(calls.length, 1); assert.equal(calls[0].contact, ''); assert.equal(calls[0].wantsContact, false);
  assert.equal($('#successSection').classList.contains('hidden'), false); assert.equal($('#words').value, '');
  assert.equal($('#reviewText').textContent, ''); assert.equal($('#receipt').textContent, '12345678');
  assert.match($('#successPromise').textContent, /尊重你的意愿/);
  click($('#successHome')); assert.equal($('#home').classList.contains('hidden'), false);
});

test('frontend: failed network submission retains contents; retry reuses idempotency key', async () => {
  const { $, click, submit, calls } = await page(true, true);
  click($('#startContact')); $('#words').value = '测试网络失败'; $('#contact').value = 'test-only'; $('#consent').checked = true;
  submit(); click($('#sendMessage')); await flush();
  assert.match($('#submitError').textContent, /网络/); assert.equal($('#words').value, '测试网络失败');
  click($('#sendMessage')); await flush();
  assert.equal(calls.length, 2); assert.equal(calls[0].requestId, calls[1].requestId);
  assert.equal($('#successSection').classList.contains('hidden'), false);
});

test('frontend: closed backend remains preview and never sends personal data', async () => {
  const { $, click, submit, calls } = await page(false);
  assert.equal($('#sendMessage').disabled, true); assert.match($('#siteState').textContent, /尚未开放/);
  click($('#startLeave')); $('#words').value = '仅测试'; $('#consent').checked = true; submit(); click($('#sendMessage')); await flush();
  assert.equal(calls.length, 0); assert.equal($('#reviewSection').classList.contains('hidden'), false);
});
