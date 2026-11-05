// One-time migration of the original page. Kept for provenance; not run during builds.
import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../public/index.html', import.meta.url);
let s = await readFile(path, 'utf8');
if (s.includes('src="app.js"')) process.exit(0);
s = s.replace(/<script>[\s\S]*?<\/script>/, '<script src="app.js" defer></script>');
const replacements = [
  ['class="preview">页面预览 · 暂未收集留言', 'class="preview" id="siteState" role="status">正在连接留言入口…'],
  ['onclick="start(false)"', 'id="startContact"'], ['onclick="start(true)"', 'id="startLeave"'],
  ['onclick="goHome()"', 'id="backHome"'], ['onclick="edit()"', 'id="backEdit"'], ['onclick="clearAll()"', 'id="clearAll"'],
  ['所有问题都可以跳过。', '可以只选一个状态，或留下一句话。'],
  ['<div class="notice">这是页面体验预览，未连接接收渠道。请用示例文字测试，不要填写真实隐私或联系方式。内容仅在当前页面临时展示，不会提交或保存。</div>', '<div class="notice" id="formNotice" role="status">正在确认留言入口，请稍候。</div>'],
  ['<form id="pillowForm">', '<form id="pillowForm"><label class="label" for="nickname">怎么称呼你？（可不填）</label><input id="nickname" maxlength="50" autocomplete="off" placeholder="昵称就可以"><div class="botTrap" aria-hidden="true"><label for="website">请留空</label><input id="website" tabindex="-1" autocomplete="off"></div>'],
  ['<label class="label" for="contact">希望我们怎样联系你？</label><input id="contact" maxlength="200" placeholder="正式开放后可填写微信或其他联系方式，也可以不留">', '<label class="label check"><input id="wantsContact" type="checkbox" checked> 我希望有人联系我</label><p class="hint">也可以取消勾选，暂时只留言。这样我们无法主动联系你。</p><div id="contactWrap"><label class="label" for="contact">微信号或手机号</label><input id="contact" maxlength="200" autocomplete="off" placeholder="填写一种常用的联系方式即可"></div>'],
  ['<p class="privacy">正式开放后，由指定同修私密查看；需要邀请其他人接续陪伴时，会先征求你的同意。留有有效联系方式并希望被联系的留言，将在提交后24小时内得到专人回应。不留联系方式时，我们无法主动联系。</p>', '<details class="privacy"><summary>留言隐私与陪伴说明</summary><p>留言、联系方式及内部跟进记录仅供指定的管理同学开展陪伴使用。需要邀请管理团队以外的人参与时，会先征求你的同意。不会将你的留言公开展示。</p><p>希望被联系并留下有效联系方式时，指定同学将在提交后24小时内回应。这里并非即时在线服务。</p><p>第一版不自动删除留言，超级管理员可以删除留言及相关内部备注。如希望删除，可将留言编号告知与你联系的负责人；未留联系方式时，可保留编号，之后通过所在群的负责人提出申请。系统备份的清理遵循托管服务的保留周期。</p><p>如暂时不希望被联系，可取消勾选，联系方式不会随留言提交。不需要填写身份证、住址、病历或他人的隐私资料。</p></details><label class="check privacy"><input id="consent" type="checkbox" required> 我已阅读留言隐私与陪伴说明，同意将填写的内容交给指定同学处理。</label>'],
  ['<button class="primary" type="submit">预览留言内容 →</button>', '<p id="formError" class="error" role="alert"></p><button class="primary" type="submit">检查留言内容 →</button>'],
  ['<p><strong>预览完成，留言尚未发送。</strong><br>正式开放后，指定同修会在24小时内回应希望被联系的留言。</p>', '<p id="reviewIntro">留言尚未发送，请先检查内容。</p>'],
  ['<div class="actions"><button class="primary" id="backEdit">返回修改</button>', '<p id="submitError" class="error" role="alert"></p><div class="actions"><button class="primary" id="sendMessage" disabled>正在连接…</button><button id="backEdit">返回修改</button>'],
  ['接收渠道尚未配置。本次内容没有发送给任何人，关闭页面后不保留。', '只有看到“我们收到你的留言了”，才表示提交成功。未提交的内容只在当前页面临时保留。'],
  ['</section><footer>', '</section><section id="successSection" class="hidden"><div class="form"><h2>我们收到你的留言了。</h2><p id="successPromise"></p><p>留言编号：<strong id="receipt"></strong></p><p class="note">你可以记下编号。如需询问处理进度或申请删除，将编号告知负责人即可；编号本身不能用来公开查询留言。</p><button id="successHome" class="primary">回到首页</button></div></section><footer>'],
  ['</style>', '.check{display:flex;align-items:flex-start;gap:10px;line-height:1.8}.check input{width:20px;height:20px;flex-shrink:0;margin-top:4px;accent-color:var(--green)}.hint{font-size:13px;color:#687763}.error{color:#9b3c30;font-size:14px;white-space:pre-wrap}.botTrap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}button:disabled{opacity:.55;cursor:wait}summary{cursor:pointer}details{border-top:1px solid #e1e4d7;padding-top:16px}#reviewText{overflow-wrap:anywhere}</style>']
];
for (const [from, to] of replacements) { if (!s.includes(from)) throw new Error('Missing source fragment: ' + from.slice(0, 70)); s = s.replace(from, to); }
await writeFile(path, s);
