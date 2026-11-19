(() => {
  'use strict';
  const content = window.EXHIBIT_CONTENT;
  const meta = [
    {short:'数字孪生',en:'DIGITAL TWIN',line:'数据、产线与工厂的连接',headline:'构建一座数字工厂',summary:'以智慧园区数据中台连接设备与业务数据，结合自动化产线和三维可视化，构建数字孪生工厂。',main:1,gallery:[2,3],teasers:['单元与数据的分散','连接工厂的关键路径','效率与能效的变化']},
    {short:'质量管控',en:'QUALITY CONTROL',line:'让生产过程可管、可追溯',headline:'看见生产的全过程',summary:'围绕中药制剂生产全过程，通过网络、生产管理系统与药品溯源体系，实现质量管控与信息追溯。',main:4,gallery:[5],teasers:['流程与追溯的难题','让生产信息贯通','质量与追溯的变化']},
    {short:'柔性包装',en:'FLEXIBLE PACKAGING',line:'从包装到入库的高效衔接',headline:'让包装适应生产',summary:'围绕丸剂包装的效率、质量与规格切换，通过柔性包装生产线贯通包装、装箱和入库环节。',main:6,gallery:[7],teasers:['效率与换型的制约','贯通柔性包装产线','速度与自动化的变化']},
    {short:'智能协同',en:'INTELLIGENT COLLABORATION',line:'让物料流转与装配协同',headline:'让物料自主流转',summary:'以智能输送与自动化装配衔接物料搬运和包装后段，减少人工操作，使物料流转全程可追溯。',main:8,gallery:[9],teasers:['人工搬运的负担','输送与装配的协同','效率与成本的变化']}
  ];
  const captions = ['','数字中药智能制造工厂整体架构图','机制丸一体化产线及设备拼图','数字化工厂SCADA三维可视化','基于大数据技术的质量管控承载网络架构','基于大数据技术的药品溯源系统架构示意','智能制造丸剂包装柔性生产线实景图','智能制造丸剂包装柔性生产线与部分设备实景图','智能输送AGV与产线三维布局','智能装配·后段无人化'];
  const sections = ['痛点','破题','成效'];
  const sectionEN = ['THE CHALLENGE','THE SOLUTION','THE IMPACT'];
  const workspace = document.getElementById('workspace');
  const nav = document.getElementById('chapter-nav');
  const opened = new Map();
  let active = null;
  const mobile = window.matchMedia('(max-width:760px)');
  const esc = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const imagePath = n => 'assets/image'+n+'.png';
  const imageMarkup = (n,cls='') => `<figure class="${cls}"><button class="media-button" data-action="image" data-image="${n}" type="button" aria-label="查看大图：${esc(captions[n])}"><img src="${imagePath(n)}" alt="${esc(captions[n])}" loading="lazy"><span class="media-zoom">查看大图</span></button><figcaption class="media-caption">${esc(captions[n])}</figcaption></figure>`;
  const announce = message => { document.getElementById('announcer').textContent = message; };
  function updateLayout(){
    const count = opened.size;
    workspace.hidden = count === 0;
    workspace.dataset.count = String(count);
    document.body.classList.toggle('has-windows',count>0);
    for(const [id,state] of opened) state.element.classList.toggle('is-mobile-active',id===active);
    nav.querySelectorAll('button').forEach(button=>{
      const id = Number(button.dataset.block);
      button.classList.toggle('is-open',opened.has(id));
      button.classList.toggle('is-active',id===active);
      button.setAttribute('aria-pressed',String(id===active));
    });
  }
  function setHash(id,view){
    const hash = id === null ? '#home' : '#block='+(id+1)+(view==='overview'?'':'&section='+view);
    history.replaceState(null,'',hash);
  }
  function renderWindow(id){
    const state = opened.get(id);
    const data = content[id];
    const design = meta[id];
    const category = sections.indexOf(state.view);
    const detail = category >= 0;
    let body = '';
    if(state.zoom !== null){
      body = `<div class="image-viewer"><button type="button" class="back-overview" data-action="unzoom">返回内容</button><img src="${imagePath(state.zoom)}" alt="${esc(captions[state.zoom])}"><p>${esc(captions[state.zoom])}</p></div>`;
    } else if(!detail){
      body = `<div class="overview-hero">${imageMarkup(design.main)}<div class="overview-copy"><p class="eyebrow">${design.en}</p><h3>${design.headline}</h3><p>${design.summary}</p></div></div><div class="story-menu" aria-label="选择痛点、破题或成效">${sections.map((name,i)=>`<button class="story-entry" type="button" data-action="section" data-section="${name}"><span class="story-index">0${i+1}</span><strong>${name}</strong><small>${design.teasers[i]}</small></button>`).join('')}</div><p class="overview-foot"><span class="small-orbit" aria-hidden="true"></span>选择一个主题，查看这个板块的完整内容</p>`;
    } else {
      body = `<div class="window-toolbar"><button class="back-overview" data-action="overview" type="button">返回板块概览</button><nav class="detail-tabs" aria-label="${esc(design.short)}详情分类">${sections.map(name=>`<button class="detail-tab" type="button" data-action="section" data-section="${name}" aria-pressed="${state.view===name}">${name}</button>`).join('')}</nav></div><div class="section-eyebrow">${sectionEN[category]}</div><h3 class="section-heading">${state.view}</h3>`;
      if(category===0){
        body += `<div class="challenge-layout"><div class="challenge-copy">${data.pain.split('；').map(text=>`<p>${esc(text)}</p>`).join('')}</div>${imageMarkup(design.main)}</div>`;
      } else if(category===1){
        body += `<ol class="solution-list">${data.solution.map(text=>{
          const colon=text.indexOf('：');
          return colon>0 ? `<li><strong>${esc(text.slice(0,colon))}</strong>${esc(text.slice(colon+1))}</li>` : `<li>${esc(text)}</li>`;
        }).join('')}</ol><div class="gallery ${design.gallery.length===1?'single':''}">${design.gallery.map(n=>imageMarkup(n)).join('')}</div>`;
        if(data.supplement) body += `<div class="supplement">${data.supplement.map(text=>`<p>${esc(text)}</p>`).join('')}</div>`;
      } else {
        body += `<div class="metrics">${data.results.map(([label,value])=>`<div class="metric"><div class="metric-value">${esc(value)}</div><div class="metric-label">${esc(label)}</div></div>`).join('')}</div><p class="metric-note">数值沿用客户提供方案。${esc(data.note||'具体统计口径以客户确认为准。')}</p>`;
      }
      body += '<p class="detail-source">资料来源：绿色制造1.0（拼接屏）互动</p>';
    }
    state.element.innerHTML = `<header class="window-header"><div class="window-heading"><p class="window-kicker">绿色制造 / ${esc(design.short)}${detail?' / '+state.view:''}</p><h2 id="window-title-${id}">${esc(data.title)}</h2></div><button type="button" class="close-window" data-action="close" aria-label="关闭${esc(design.short)}板块">×</button></header><div class="window-content">${body}</div>`;
    state.element.dataset.view = state.view;
  }
  function openBlock(id,view){
    if(!Number.isInteger(id)||id<0||id>=content.length) return;
    const already = opened.has(id);
    if(!already){
      const element = document.createElement('article');
      element.className='exhibit-window';
      element.dataset.block=String(id);
      element.setAttribute('aria-labelledby','window-title-'+id);
      const state={view:view||'overview',zoom:null,element};
      opened.set(id,state);
      element.addEventListener('pointerdown',()=>{if(active!==id){active=id;updateLayout();}});
      element.addEventListener('click',event=>{
        const button=event.target.closest('button[data-action]');
        if(!button) return;
        active=id;
        const action=button.dataset.action;
        if(action==='close'){closeBlock(id);return;}
        if(action==='section') state.view=button.dataset.section;
        if(action==='overview') state.view='overview';
        if(action==='image') state.zoom=Number(button.dataset.image);
        else state.zoom=null;
        renderWindow(id);updateLayout();setHash(id,state.view);
        const focusTarget=state.element.querySelector(action==='section'?'.detail-tab[aria-pressed="true"]':action==='image'?'.image-viewer .back-overview':action==='overview'?'.story-entry':'.window-content button');
        focusTarget?.focus({preventScroll:true});
        if(mobile.matches && action!=='image') state.element.scrollIntoView({block:'start',behavior:'instant'});
        announce(designLabel(id,state));
      });
      workspace.append(element);
      renderWindow(id);
    } else if(view){
      opened.get(id).view=view;
      opened.get(id).zoom=null;
      renderWindow(id);
    }
    active=id;updateLayout();setHash(id,opened.get(id).view);
    if(mobile.matches) window.scrollTo({top:0,behavior:'instant'});
    announce(designLabel(id,opened.get(id)));
  }
  function designLabel(id,state){return meta[id].short+'，'+(state.view==='overview'?'板块概览':state.view);}
  function closeBlock(id){
    const state=opened.get(id);
    state.element.remove();opened.delete(id);
    if(active===id) active=opened.size?[...opened.keys()].at(-1):null;
    updateLayout();setHash(active,active===null?'overview':opened.get(active).view);
    nav.querySelector(`[data-block="${id}"]`).focus({preventScroll:true});
    if(mobile.matches) window.scrollTo({top:0,behavior:'instant'});
    announce(meta[id].short+'板块已关闭');
  }
  meta.forEach((design,id)=>{
    const button=document.createElement('button');
    button.type='button';button.className='chapter-button';button.dataset.block=id;
    button.innerHTML=`<span class="nav-index">0${id+1}</span><span>${design.short}</span>`;
    button.addEventListener('click',()=>openBlock(id));
    nav.append(button);
    const portal=document.createElement('button');
    portal.type='button';portal.className='portal';portal.dataset.block=id;
    portal.setAttribute('aria-label','进入'+content[id].title);
    portal.innerHTML=`<span class="orb"><span class="orb-orbit"></span><span class="orb-index">0${id+1} / EXPLORE</span><span class="orb-image"><img src="${imagePath(design.main)}" alt="" fetchpriority="${id===0?'high':'auto'}"></span></span><span class="portal-name">${design.short}</span><span class="portal-subtitle">${design.line}</span><span class="portal-action">进入板块</span>`;
    portal.addEventListener('click',()=>openBlock(id));
    document.getElementById('portals').append(portal);
  });
  const floats=document.getElementById('floating-tiles');
  for(let i=0;i<20;i++){
    const tile=document.createElement('span');tile.className='floating-tile';
    tile.style.cssText=`left:${(i*37+7)%97}%;top:${(i*23+6)%87}%;--angle:${(i%5-2)*4}deg;--delay:-${i%7}s`;
    tile.innerHTML=`<img src="${imagePath(i%9+1)}" alt="" loading="lazy">`;floats.append(tile);
  }
  const fullscreen=document.getElementById('fullscreen');
  if(!document.documentElement.requestFullscreen){fullscreen.hidden=true;}
  else fullscreen.addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('当前浏览器未能进入全屏');}
  });
  document.addEventListener('fullscreenchange',()=>{fullscreen.firstChild.textContent=document.fullscreenElement?'退出全屏':'全屏浏览';});
  mobile.addEventListener('change',updateLayout);
  function restoreHash(){
    const query=new URLSearchParams(location.hash.slice(1));
    const raw=query.get('block');
    if(!raw) return;
    const id=Number(raw)-1;
    const section=query.get('section');
    openBlock(id,sections.includes(section)?section:'overview');
  }
  restoreHash();
  window.addEventListener('hashchange',restoreHash);
  updateLayout();
  const canvas=document.getElementById('particles');
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
  let points=[],width=0,height=0,frame=0,last=0;
  function seeded(n){const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);}
  function resize(){
    width=window.innerWidth;height=window.innerHeight;
    const ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);
    points=Array.from({length:width<760?65:185},(_,i)=>({x:seeded(i+1)*width,y:seeded(i+241)*height,r:.35+seeded(i+41)*1.25,a:.12+seeded(i+71)*.42,phase:seeded(i+91)*6.28}));
    draw(0);
  }
  function draw(time){
    ctx.clearRect(0,0,width,height);
    points.forEach((p,i)=>{
      const dy=reduced.matches?0:Math.sin(time*.00013+p.phase)*5;
      ctx.fillStyle=`rgba(93,226,190,${p.a})`;ctx.beginPath();ctx.arc(p.x,p.y+dy,p.r,0,Math.PI*2);ctx.fill();
      if(i%4===0&&points[i+1]){const next=points[i+1];const distance=Math.hypot(p.x-next.x,p.y-next.y);if(distance<170){ctx.strokeStyle='rgba(76,167,143,.07)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y+dy);ctx.lineTo(next.x,next.y);ctx.stroke();}}
    });
  }
  function animate(time){if(time-last>50){draw(time);last=time;}frame=requestAnimationFrame(animate);}
  function motion(){cancelAnimationFrame(frame);if(!reduced.matches&&!document.hidden)frame=requestAnimationFrame(animate);else draw(0);}
  resize();motion();
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',motion);
  reduced.addEventListener('change',motion);
})();
