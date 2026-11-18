'use strict';
const iconPaths={
 hand:'<path d="M8 13V6a2 2 0 014 0v6M12 10V5a2 2 0 014 0v8M16 10a2 2 0 014 0v5c0 4-3 7-7 7h-1c-2 0-4-1-5-3l-4-6a2 2 0 013-2l2 2"/>',
 gear:'<path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z"/><circle cx="12" cy="12" r="4"/>',
 speed:'<path d="M13 2L4 14h7l-1 8 10-13h-7z"/>',
 network:'<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v5M5 16v-3h14v3"/>',
 touch:'<path d="M10 13V7a2 2 0 014 0v6l2-2 5 3-2 7H9l-6-7a2 2 0 013-2l4 3"/><path d="M5 7a7 7 0 0114 0"/>',
 grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
 expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>',
 store:'<path d="M4 10v11h16V10M2 10l3-7h14l3 7M2 10q3 5 5 0 3 5 5 0 3 5 5 0 3 5 5 0M9 21v-7h6v7"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
 factory:'<path d="M3 21V9l6 4V9l6 4V3h5l1 18zM7 17h1M12 17h1M17 17h1"/>',
 scale:'<path d="M12 3v18M7 21h10M4 7h16M6 7l-4 8h8zM18 7l-4 8h8z"/>',
 flask:'<path d="M8 3h8M10 3v6l-7 11q0 1 2 1h14q2 0 2-1L14 9V3M7 15h10"/>',
 layers:'<path d="M12 2l10 6-10 6L2 8zM2 12l10 6 10-6M2 16l10 6 10-6"/>',
 taste:'<path d="M4 9q8 5 16 0v5c0 5-4 8-8 8s-8-3-8-8zM8 3v3M12 2v4M16 3v3"/>'
};
function icon(name){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+(iconPaths[name]||iconPaths.layers)+'</svg>';}
function fillIcons(container=document){container.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
const stages=[
 {name:'源起',title:'竹匾上的手工时代',image:'handcraft.png',caption:'药工竹匾手工泛丸',imageType:'AI 示意插画',intro:'在早期的“前店后坊”阶段并未将“药丸”作为独立剂型单列，但丸剂生产的基础工艺——泛制法已经存在。',topics:[
  {name:'老号并立',icon:'store',body:'<div class="brand-list"><div><span class="brand-year">1662</span><span class="brand-name">黄中璜</span></div><div><span class="brand-year">1669</span><span class="brand-name">保滋堂</span></div><div><span class="brand-year">1820</span><span class="brand-name">贵宁堂马伯良</span></div></div><p class="detail-lead">前店后作坊，膏丹丸散手工制售。</p>'},
  {name:'手工成型',icon:'hand',body:'<figure class="process-image"><img src="assets/manual-process.png" alt="手工制丸四步示意：起模、成型、盖面、干燥"></figure><div class="process-steps"><div class="process-step"><b>① 起模</b><p>竹匾刷⽔撒粉，手搓丸模。</p></div><div class="process-step"><b>② 成型</b><p>“四团、两撞、一翻身”，摇至丸圆。</p></div><div class="process-step"><b>③ 盖面</b><p>清水盖面、细粉封面。</p></div><div class="process-step"><b>④ 干燥</b><p>日晒，或入土炕烘房。</p></div></div>'},
  {name:'经验判定',icon:'eye',body:'<p class="detail-lead">日晒或土炕烘房干燥，成色全凭眼看、手摸、口尝，没有量化标准。</p><div class="sense-row"><div class="sense">'+icon('eye')+'<strong>眼看</strong><small>观察成色</small></div><div class="sense">'+icon('hand')+'<strong>手摸</strong><small>凭手感判断</small></div><div class="sense">'+icon('taste')+'<strong>口尝</strong><small>凭经验判断</small></div></div>'}
 ]},
 {name:'汇流',title:'公私合营与半机械化',image:'tools.png',caption:'药匾、药碾、炼蜜锅等传统制药器具',imageType:'AI 示意插画',intro:'散落的药铺汇成一家厂：三厂公私合营并立，竹匾第一次让位给会转的铜锅——泛丸原理未变，组织与器具先换了一代。',topics:[
  {name:'合营并厂',icon:'factory',body:'<div class="data-pair"><div class="data-point"><span class="year">1956</span><p>三厂并立</p></div><div class="data-point"><span class="year">1961</span><p>磨粉独立成厂</p></div></div><p class="detail-lead">丸剂由作坊转入厂房。</p>'},
  {name:'器具换代',icon:'gear',body:'<div class="compare-row"><div class="compare-item"><span class="detail-label">泛丸器具</span><p class="detail-lead">竹匾</p></div><span class="compare-arrow" aria-hidden="true">→</span><div class="compare-item"><span class="detail-label">半机械化</span><p class="detail-lead">铜制泛丸锅<br>（包衣球）</p></div></div><div class="compare-row"><div class="compare-item"><span class="detail-label">干燥方式</span><p class="detail-lead">日晒 / 土炕烘房</p></div><span class="compare-arrow" aria-hidden="true">→</span><div class="compare-item"><span class="detail-label">干燥升级</span><p class="detail-lead">热风烘房</p></div></div>'},
  {name:'最早定量',icon:'scale',body:'<p class="detail-lead">出现“查数计量”起模法——第一次告别全凭手感。</p><div class="compare-row"><div class="compare-item"><span class="detail-label">此前</span><span class="brand-name">全凭手感</span></div><span class="compare-arrow" aria-hidden="true">→</span><div class="compare-item"><span class="detail-label">开始定量</span><span class="brand-name">查数计量</span></div></div>'}
 ]},
 {name:'提速',title:'工艺现代化的三级跳',image:'workshop.jpg',caption:'包衣锅机械化泛丸制丸车间',imageType:'文档参考照片',intro:'二十年连跳三级：研发立品、装备换速、工艺与标准并起——丸剂生产由“半机械”跃入“现代化”，干燥从“小时”变成“分钟”。',topics:[
  {name:'研发立品',icon:'flask',body:'<div class="product-pair"><figure class="product"><img src="assets/xiaoke.png" alt="消渴丸产品参考图"><figcaption><b>1981 · 消渴丸上市</b>文档所附产品参考图</figcaption></figure><figure class="product"><img src="assets/zishen.png" alt="滋肾育胎丸产品参考图"><figcaption><b>1983 · 滋肾育胎丸上市</b>文档所附产品参考图</figcaption></figure></div>'},
  {name:'制丸改法',icon:'gear',body:'<div class="data-pair"><div class="data-point"><span class="detail-label">1985 · 蜜丸</span><span class="brand-name">转塑制法</span><p>螺旋挤条 ＋ 制丸刀轮</p></div><div class="data-point"><span class="detail-label">1985 · 水丸</span><span class="brand-name">转机械泛制</span></div></div><img class="detail-photo" src="assets/workshop.jpg" alt="机械化泛丸制丸车间参考照片">'},
  {name:'关键一跃',icon:'speed',body:'<p class="detail-lead">1997 年，微波干燥灭菌线。</p><div class="compare-row"><div class="compare-item"><span class="detail-label">湿丸干燥 · 原来</span><span class="compare-number">10<small>小时</small></span></div><span class="compare-arrow" aria-hidden="true">→</span><div class="compare-item"><span class="detail-label">湿丸干燥 · 升级后</span><span class="compare-number">10<small>分钟</small></span></div></div><div class="compare-row"><div class="compare-item"><span class="detail-label">溶散时间 · 原来</span><span class="compare-number">100<small>分钟</small></span></div><span class="compare-arrow" aria-hidden="true">→</span><div class="compare-item"><span class="detail-label">溶散时间 · 升级后</span><span class="compare-number">50<small>分钟</small></span></div></div>'}
 ]},
 {name:'智造',title:'从联动线到智慧工厂',image:'production.jpg',caption:'丸剂机械制丸生产线',imageType:'文档参考照片',intro:'一条联动线把分散的设备连成序贯流程；一座智慧工厂把经验变成参数，把“事后检验”变成“在线拦截”。',topics:[
  {name:'首创联动',icon:'network',body:'<p class="detail-lead">2008 年建成中药机制丸联动生产线，开启标准化连线生产。</p><figure class="process-image" style="margin-top:16px"><img src="assets/production-process.png" alt="联动生产流程示意：混合、炼药、制丸、包衣打底、湿丸筛选、干燥、干丸选丸、包装"></figure><div class="process-steps"><div class="process-step"><b>混合 → 炼药</b></div><div class="process-step"><b>制丸 → 包衣打底</b></div><div class="process-step"><b>湿丸筛选 → 干燥</b></div><div class="process-step"><b>干丸选丸 → 包装</b></div></div>'},
  {name:'精密升级',icon:'layers',body:'<div class="data-point"><span class="year">2012</span><span class="brand-name">中药丸剂无孔薄膜包衣技术</span><p style="margin-top:12px">自主研发，实现产业化。</p></div>'},
  {name:'智慧产线',icon:'factory',body:'<p class="detail-lead" style="margin-bottom:18px">2023 年，三期智慧工厂投产。</p><div class="metrics"><div><span class="metric-value">+148%</span><span class="metric-label">产能</span></div><div><span class="metric-value">约3倍</span><span class="metric-label">人均效率</span></div><div><span class="metric-value">−74%</span><span class="metric-label">人力成本</span></div></div><p class="caption-note">数据沿用现有内容稿，统计口径待最终确认。</p>'}
 ]}
];
const state={stage:null,topic:null};
const $=id=>document.getElementById(id);
const stageButtons=[...document.querySelectorAll('[data-stage]')];
function renderTopics(){
 $('topic-menu').innerHTML=stages[state.stage].topics.map((topic,i)=>'<button class="topic-button" type="button" data-topic="'+i+'" aria-expanded="'+(state.topic===i)+'" aria-controls="topic-detail">'+icon(topic.icon)+'<span>'+topic.name+'</span></button>').join('');
}
function renderDetail(){
 const stage=stages[state.stage];
 $('stage-overview').hidden=state.topic!==null;
 $('topic-detail').hidden=state.topic===null;
 renderTopics();
 if(state.topic===null){
  $('topic-detail').innerHTML='';
  $('stage-overview').innerHTML='<figure class="stage-figure"><img src="assets/'+stage.image+'" alt="'+stage.caption+'"><figcaption><span>'+stage.caption+'</span><span>'+stage.imageType+'</span></figcaption></figure>';
 }else{
  const topic=stage.topics[state.topic];
  $('topic-detail').innerHTML='<div class="detail-heading"><h3>'+topic.name+'</h3><button class="text-button" type="button" id="close-detail">'+icon('close')+'收起详情</button></div>'+topic.body;
 }
 $('interaction-status').textContent=stage.name+' / '+(state.topic===null?'请选择一个主题':stage.topics[state.topic].name);
}
function openStage(index){
 if(state.stage===index){closeStage();return;}
 state.stage=index;state.topic=null;
 document.body.classList.add('has-selection');
 document.body.dataset.activeStage=index;
 stageButtons.forEach(button=>{
  const active=Number(button.dataset.stage)===index;
  button.setAttribute('aria-expanded',String(active));
  button.querySelector('.stage-action').innerHTML=active?'已展开 <span aria-hidden="true">−</span>':'轻触展开 <span aria-hidden="true">＋</span>';
 });
 const stage=stages[index];
 $('home-center').hidden=true;$('stage-content').hidden=false;
 $('content-eyebrow').textContent='0'+(index+1)+' / '+stage.name;
 $('content-title').textContent=stage.title;
 $('stage-intro').textContent=stage.intro;
 renderDetail();
}
function closeStage(){
 const previous=state.stage;
 state.stage=null;state.topic=null;
 document.body.classList.remove('has-selection');
 delete document.body.dataset.activeStage;
 stageButtons.forEach(button=>{button.setAttribute('aria-expanded','false');button.querySelector('.stage-action').innerHTML='轻触展开 <span aria-hidden="true">＋</span>';});
 $('home-center').hidden=false;$('stage-content').hidden=true;
 $('topic-detail').innerHTML='';$('topic-detail').hidden=true;
 $('interaction-status').textContent='四个阶段 · 轻触探索';
 if(previous!==null)stageButtons[previous].focus({preventScroll:true});
}
stageButtons.forEach(button=>button.addEventListener('click',()=>openStage(Number(button.dataset.stage))));
$('topic-menu').addEventListener('click',event=>{
 const button=event.target.closest('[data-topic]');if(!button)return;
 const index=Number(button.dataset.topic);
 state.topic=state.topic===index?null:index;
 renderDetail();
 $('topic-menu').querySelector('[data-topic="'+index+'"]').focus({preventScroll:true});
});
$('topic-detail').addEventListener('click',event=>{
 if(!event.target.closest('#close-detail'))return;
 const previous=state.topic;state.topic=null;renderDetail();
 $('topic-menu').querySelector('[data-topic="'+previous+'"]').focus({preventScroll:true});
});
$('close-stage').addEventListener('click',closeStage);
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||state.stage===null)return;
 if(state.topic!==null){const previous=state.topic;state.topic=null;renderDetail();$('topic-menu').querySelector('[data-topic="'+previous+'"]').focus({preventScroll:true});}
 else closeStage();
});
$('background-toggle').addEventListener('click',()=>{
 const enabled=document.body.classList.toggle('checker');
 $('background-toggle').setAttribute('aria-pressed',String(enabled));
});
if(!document.fullscreenEnabled)$('fullscreen-toggle').hidden=true;
$('fullscreen-toggle').addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 catch{$('interaction-status').textContent='当前浏览器不支持全屏，请使用浏览器的全屏功能。';}
});
document.addEventListener('fullscreenchange',()=>{
 const fullscreen=Boolean(document.fullscreenElement);
 $('fullscreen-toggle').setAttribute('aria-label',fullscreen?'退出全屏':'全屏展示');
 document.querySelector('.fullscreen-label').textContent=fullscreen?'退出全屏':'全屏';
});
fillIcons();
