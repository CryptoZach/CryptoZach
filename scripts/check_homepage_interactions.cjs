'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(process.argv[2]||'_site');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE_ROOT||process.cwd(),'package.json'))('playwright');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={asOf:new Date().toISOString(),root,method:'Unmodified served HTML, trusted browser input, passive canvas and event observations',htmlSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),cases:[]};
function observe(){
 const state=window.__interactionProbe={frames:[],events:[],reefPaint:[],input:null,current:null,brands:new Map(),nextBrand:1,errors:[]};
 // Observe the animation clock separately from time spent waiting in the callback queue.
 const requestFrame=window.requestAnimationFrame;
 window.requestAnimationFrame=function(callback){return requestFrame.call(window,time=>{state.frameTime=time;return callback.call(window,time);});};
 const proto=CanvasRenderingContext2D.prototype,fill=proto.fillRect,draw=proto.drawImage,text=proto.fillText,move=proto.moveTo,curve=proto.quadraticCurveTo;
 function finish(){
  const f=state.current;if(!f||!f.ink.length)return;
  const passes=matchMedia('(prefers-reduced-motion: reduce)').matches?1:3,marks=[];
  for(let i=0;i<f.ink.length;i+=passes){
   const group=f.ink.slice(i,i+passes),main=group.at(-1);
   if(group.length!==passes||group.some(p=>p.kind!==main.kind||p.key!==main.key))state.errors.push('Incomplete paint group');
   marks.push({...main,l:Math.min(...group.map(p=>p.x)),t:Math.min(...group.map(p=>p.y)),r:Math.max(...group.map(p=>p.x+p.w)),b:Math.max(...group.map(p=>p.y+p.h))});
  }
  let overlaps=0,repeats=0;
  for(let i=0;i<marks.length;i++)for(let j=i+1;j<marks.length;j++){
   const a=marks[i],b=marks[j];
   if(a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t)overlaps++;
   if(a.kind==='logo'&&b.kind==='logo'&&a.key===b.key&&Math.abs((a.l+a.r-b.l-b.r)/2)<=52&&Math.abs((a.t+a.b-b.t-b.b)/2)<=44)repeats++;
  }
  const logos=marks.filter(p=>p.kind==='logo').map(p=>{
   const cx=p.x+p.w/2,cy=p.y+p.h/2,col=Math.round((cx-13)/26),baseX=Math.round(13+col*26-p.w/2);
   return {...p,cx,cy,col,dx:p.x-baseX,baseCx:baseX+p.w/2};
  });
  const rowAnchors=marks.filter(p=>p.kind==='text'&&p.key!=='$'&&p.key!=='₿').map(p=>({col:Math.round((p.ax-13)/26),cy:p.ay}));
  for(const p of logos){
   const ref=rowAnchors.find(q=>q.col===p.col)||logos.find(q=>q!==p&&q.col===p.col&&Math.abs(q.dx)<.001&&Math.abs(q.cy-p.cy)>90);
   if(ref){p.baseCy=ref.cy+20*Math.round((p.cy-ref.cy)/20);p.dy=p.cy-p.baseCy;p.distance=Math.hypot(p.dx,p.dy);}
   if(f.input){p.pointerDistance=Math.hypot(p.baseCx-f.input.x,(p.baseCy??p.cy)-f.input.y);p.away=p.dx*(p.baseCx-f.input.x)+(p.dy||0)*((p.baseCy??p.cy)-f.input.y)>0;}
   p.linkAligned=(p.distance>.15||Math.abs(p.dx)>.15)&&f.links.some(q=>Math.hypot(q.x-p.cx,q.y-p.cy)<.001);
  }
  state.frames.push({t:f.t,frameTime:f.frameTime,input:f.input,logos,rows:rowAnchors,overlaps,repeats});if(state.frames.length>700)state.frames.shift();state.current=null;
 }
 state.finish=finish;
 proto.fillRect=function(...args){
  if(this.canvas.id==='mtx'){finish();const r=this.canvas.getBoundingClientRect(),p=state.input;state.current={t:performance.now(),frameTime:state.frameTime,ink:[],links:[],input:p?{x:p.x-r.left,y:p.y-r.top,type:p.type}:null};}
  return fill.apply(this,args);
 };
 proto.drawImage=function(im,...args){
  if(im instanceof HTMLImageElement&&im.src.startsWith('data:image/')){if(!state.brands.has(im.src))state.brands.set(im.src,state.nextBrand++);this.canvas.__paintBrand=state.brands.get(im.src);}
  if(this.canvas.id==='mtx'&&args.length===4&&state.current){const [x,y,w,h]=args;state.current.ink.push({kind:'logo',key:im.__paintBrand,x,y,w,h,alpha:this.globalAlpha});}
  return draw.call(this,im,...args);
 };
 proto.fillText=function(value,x,y,...args){
  if(this.canvas.id==='mtx'&&state.current){const m=this.measureText(value);state.current.ink.push({kind:'text',key:value,ax:x,ay:y,x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,w:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,alpha:this.globalAlpha});}
  if(this.canvas.id==='reef'&&value==='$'){state.reefPaint.push({t:performance.now(),x,y});if(state.reefPaint.length>60000)state.reefPaint.shift();}
  return text.call(this,value,x,y,...args);
 };
 proto.moveTo=function(x,y){if(this.canvas.id==='reef')this.__linkStart={x,y};return move.call(this,x,y);};
 proto.quadraticCurveTo=function(cx,cy,x,y){if(this.canvas.id==='reef'&&state.current){state.current.links.push({x,y});if(this.__linkStart)state.current.links.push(this.__linkStart);}return curve.call(this,cx,cy,x,y);};
 for(const type of ['pointermove','pointerdown','pointercancel','touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,e=>{
  const t=e.touches?.[0]||e.changedTouches?.[0]||e,r=document.getElementById('hero')?.getBoundingClientRect();
  state.events.push({type,t:performance.now(),trusted:e.isTrusted,touches:e.touches?.length,x:t.clientX,y:t.clientY,hx:r?t.clientX-r.left:null,hy:r?t.clientY-r.top:null});
  if(e.touches){state.input=e.touches.length===1?{x:t.clientX,y:t.clientY,type:'touch'}:null;}else if(e.pointerType!=='touch')state.input={x:e.clientX,y:e.clientY,type:'mouse'};
 },{passive:true,capture:true});
 document.addEventListener('pointerout',e=>{if(e.pointerType!=='touch'&&!e.relatedTarget)state.input=null;},{passive:true});
}
function summary(frames){
 const logos=frames.flatMap(f=>f.logos),measured=logos.filter(p=>Number.isFinite(p.distance)),nudged=logos.filter(p=>p.distance>.15||Math.abs(p.dx)>.15);
 return {frames:frames.length,logoDraws:logos.length,measuredDisplacements:measured.length,horizontalOnly:logos.length-measured.length,maxHorizontal:logos.reduce((n,p)=>Math.max(n,Math.abs(p.dx)),0),maxDisplacement:measured.reduce((n,p)=>Math.max(n,p.distance),0),nudged:nudged.length,away:nudged.filter(p=>p.away).length,alignedTargetDraws:nudged.filter(p=>p.linkAligned).length,overlaps:frames.reduce((n,f)=>n+f.overlaps,0),repeats:frames.reduce((n,f)=>n+f.repeats,0)};
}
async function snapshot(page){return page.evaluate(()=>{const s=__interactionProbe;s.finish();return {frames:s.frames,events:s.events,reefPaint:s.reefPaint,errors:s.errors};});}
async function reset(page){await page.evaluate(()=>{const s=__interactionProbe;s.finish();s.frames=[];s.events=[];s.reefPaint=[];s.errors=[];});}
async function touch(cdp,type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({...p,id:i,radiusX:5,radiusY:5,force:1}))});}
async function target(page){
 return page.evaluate(()=>{const s=__interactionProbe;s.finish();const f=s.frames.at(-1),r=document.getElementById('hero').getBoundingClientRect();
  if(!f)return null;
  const p=f.logos.find(p=>p.alpha>.2&&p.cx>45&&p.cx<innerWidth-45&&p.cy+r.top>220&&p.cy+r.top<Math.min(innerHeight-130,680));
  return p?{...p,screenY:p.cy+r.top}:null;
 });
}
function median(values){const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;}
function rowRates(frames){
 const rates={};let previous=null;
 for(const f of frames){
  const rows=new Map(f.rows.map(r=>[r.col,r.cy]));
  // Only compare uncapped animation frames; slow callbacks must not change the measured speed.
  if(previous){const dt=f.frameTime-previous.frameTime;if(dt>5&&dt<49)for(const [col,y]of rows){
   if(!previous.rows.has(col))continue;
   const raw=y-previous.rows.get(col),dy=((raw+10)%20+20)%20-10;
   if(dy>0.005&&dy<9)(rates[col]||(rates[col]=[])).push(dy/dt*1000);
  }}
  previous={frameTime:f.frameTime,rows};
 }
 return Object.fromEntries(Object.entries(rates).filter(([,v])=>v.length>=8).map(([k,v])=>[k,median(v)]));
}
function fadeEvidence(frames){
 let previous=[];let nextId=1;const ups=new Set(),downs=new Set(),samples=[];
 for(const f of frames){
  const current=[];
  for(const p of f.logos){
   if(p.key==null)continue;
   const q=previous.filter(q=>!q.used&&q.key===p.key&&q.col===p.col&&q.w===p.w&&q.h===p.h&&Math.abs(q.cy-p.cy)<12).sort((a,b)=>Math.abs(a.cy-p.cy)-Math.abs(b.cy-p.cy))[0];
   let run=0,direction=0,start=p.alpha,id=nextId++;
   if(q){q.used=true;id=q.id;const delta=p.alpha-q.alpha;direction=Math.abs(delta)>.0001?Math.sign(delta):0;run=direction&&direction===q.direction?q.run+1:direction?1:0;start=run>1?q.start:q.alpha;}
   const t={...p,id,run,direction,start};current.push(t);
   if(run>=3&&Math.abs(p.alpha-start)>.008){const set=direction>0?ups:downs;if(!set.has(id)&&samples.length<8)samples.push({direction:direction>0?'in':'out',frames:run+1,from:start,to:p.alpha});set.add(id);}
  }
  previous=current;
 }
 return {fadeInTracks:ups.size,fadeOutTracks:downs.size,samples};
}
async function matrixFlowSample(page){
 await reset(page);await pause(600);return rowRates((await snapshot(page)).frames);
}
function compareFlow(actual,idle){
 const columns=Object.keys(idle).filter(key=>Number.isFinite(actual[key])&&actual[key]>0);
 return {columns:columns.length,idleRatio:median(columns.map(key=>actual[key]/idle[key]))};
}
async function heroInputPoint(page){
 return page.locator('#hero').evaluate(hero=>{
  const r=hero.getBoundingClientRect(),x=r.left+24,y=Math.max(180,Math.min(innerHeight-180,r.top+300));
  const hit=document.elementFromPoint(x,y);
  if(!hit?.closest('#hero')||hit.closest('a,button,input,textarea,select'))throw new Error('Flow fixture needs visible hero padding');
  return {x,y};
 });
}
async function checkSmoothing(page){
 // rowRates uses ordinary text baselines only. Dollar warps and nudged logo centers are excluded by observe().
 await page.mouse.move(0,0);await pause(650);const idle=await matrixFlowSample(page);
 const point=await heroInputPoint(page);await page.mouse.move(point.x,point.y);await pause(650);
 const hovered=compareFlow(await matrixFlowSample(page),idle);
 const cta=page.locator('#hero a[href="/papers/routing-the-dollar/"]').first();await cta.scrollIntoViewIfNeeded();const b=await cta.boundingBox();assert.ok(b);
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await pause(650);
 const ctaHovered=compareFlow(await matrixFlowSample(page),idle);
 await page.mouse.move(0,0);await pause(650);const released=compareFlow(await matrixFlowSample(page),idle);
 const measured={idleColumns:Object.keys(idle).length,hovered,ctaHovered,released};report.currentCase.smoothing=measured;
 assert.ok(measured.idleColumns>=5&&[hovered,ctaHovered,released].every(v=>v.columns>=5),'enough common painted columns to measure mouse flow');
 assert.ok(hovered.idleRatio>.50&&hovered.idleRatio<.72,'mouse hover anywhere in the hero slows actual matrix flow to about sixty percent');
 assert.ok(ctaHovered.idleRatio>.50&&ctaHovered.idleRatio<.72,'CTA hover keeps the same slow matrix flow without renewed acceleration');
 assert.ok(Math.abs(ctaHovered.idleRatio-hovered.idleRatio)<.12,'CTA proximity does not change the hero hover speed');
 assert.ok(released.idleRatio>.85&&released.idleRatio<1.15,'matrix flow returns to idle after the mouse leaves the hero');
 await reset(page);await pause(4200);const raw=await snapshot(page);measured.fades=fadeEvidence(raw.frames);measured.spacing=summary(raw.frames);
 assert.ok(measured.fades.fadeInTracks>=1&&measured.fades.fadeOutTracks>=1,'actual logo paints show consecutive fade-in and fade-out alpha steps');
 assert.equal(measured.spacing.overlaps,0);assert.equal(measured.spacing.repeats,0);
 await page.evaluate(()=>scrollTo(0,0));await pause(200);return measured;
}
async function checkTouchFlow(page,cdp){
 await page.evaluate(()=>scrollTo(0,0));await pause(650);const idle=await matrixFlowSample(page);
 const point=await heroInputPoint(page);await touch(cdp,'touchStart',[point]);
 // Continue moving through native pan, so a touch-induced 500ms speed ramp could not hide in a short tap.
 for(let i=1;i<=20;i++){await touch(cdp,'touchMove',[{x:point.x,y:point.y-i*2}]);await pause(30);}
 await reset(page);
 for(let i=21;i<=40;i++){await touch(cdp,'touchMove',[{x:point.x,y:point.y-i*2}]);await pause(30);}
 const raw=await snapshot(page),held=compareFlow(rowRates(raw.frames),idle);
 assert.ok(raw.events.filter(e=>e.type==='touchmove'&&e.trusted).length>=6,'touch-speed measurement observes sustained trusted finger movement');
 await touch(cdp,'touchEnd',[]);await pause(650);const released=compareFlow(await matrixFlowSample(page),idle);
 const measured={idleColumns:Object.keys(idle).length,held,released};report.currentCase.touchFlow=measured;
 assert.ok(measured.idleColumns>=4&&held.columns>=4&&released.columns>=4,'enough common painted columns to measure touch flow');
 assert.ok(held.idleRatio>.85&&held.idleRatio<1.15,'finger interaction preserves the idle matrix speed');
 assert.ok(released.idleRatio>.85&&released.idleRatio<1.15,'ending a touch preserves the same idle matrix speed');
 await page.evaluate(()=>scrollTo(0,0));await pause(250);return measured;
}

async function shellState(page,mobile){
 return page.evaluate(mobile=>{
  const host=document.querySelector('.signal'),svg=host?.querySelector('.signal-shell');
  if(!host||!svg)throw new Error('Selected-work shell is missing');
  const variant=mobile?'mobile':'desktop';
  const ids=['selected-work-shell-mesh-'+variant,'selected-work-shell-glints-'+variant];
  const paths=ids.map(id=>{
   const d=document.getElementById(id)?.getAttribute('d');
   if(!d)throw new Error('Missing rendered shell path '+id);
   return {id,numbers:(d.match(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi)||[]).map(Number)};
  });
  const b=svg.getBoundingClientRect(),v=svg.viewBox.baseVal;
  const visibleOpacity=el=>{let value=1;for(let n=el;n&&n!==svg;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return 0;value*=Number(s.opacity);}return value;};
  const feedback=[svg,...svg.querySelectorAll('.signal-shell__rim,.signal-shell__halo,.signal-shell__bevel')].map(el=>{
   const s=getComputedStyle(el);return [s.stroke,s.strokeOpacity,s.strokeWidth,s.opacity,s.filter];
  });
  return {paths,scaleX:b.width/v.width,scaleY:b.height/v.height,active:host.classList.contains('is-shell-active'),
   responseOpacity:Math.max(0,...[...svg.querySelectorAll('.signal-shell__response')].map(visibleOpacity)),
   gradient:document.getElementById('selected-work-shell-contact')?.getAttribute('gradientTransform')||'',
   feedback:JSON.stringify(feedback),pointerEvents:getComputedStyle(svg).pointerEvents};
 },mobile);
}
function shellDisplacement(base,next){
 assert.equal(next.paths.length,base.paths.length,'Shell topology remains stable during interaction');
 let maximum=0,moved=0,still=0,total=0;
 for(let p=0;p<base.paths.length;p++){
  const a=base.paths[p].numbers,b=next.paths[p].numbers;
  assert.ok(a.length>20&&a.length%2===0,'Shell needs real paired SVG mesh coordinates');
  assert.equal(b.length,a.length,'Interaction preserves all existing mesh vertices');
  for(let i=0;i<a.length;i+=2){
   assert.ok(Number.isFinite(b[i])&&Number.isFinite(b[i+1]),'Deformed SVG coordinates are finite');
   const distance=Math.hypot((b[i]-a[i])*base.scaleX,(b[i+1]-a[i+1])*base.scaleY);
   maximum=Math.max(maximum,distance);if(distance>.15)moved++;if(distance<.05)still++;total++;
  }
 }
 return {maximum,moved,still,total};
}
async function settleShell(page,mobile,base){
 const start=Date.now();let state,displacement;
 do{
  await pause(100);state=await shellState(page,mobile);displacement=shellDisplacement(base,state);
  if(!state.active&&displacement.maximum<.08&&state.responseOpacity<.02)break;
 }while(Date.now()-start<2600);
 assert.ok(!state.active&&displacement.maximum<.08&&state.responseOpacity<.02,'Shell settles back after release without latched geometry or glow');
 return {milliseconds:Date.now()-start,maxResidualPx:displacement.maximum};
}
async function shellPoint(page,fraction=.1){
 return page.locator('.signal').evaluate((host,fraction)=>{
  const b=host.getBoundingClientRect(),x=b.left+b.width*fraction;
  const y=Math.max(150,Math.min(innerHeight-120,b.top+b.height*.5));
  const hit=document.elementFromPoint(x,y);
  if(!hit?.closest('.signal')||hit.closest('a,button,input,textarea,select'))throw new Error('Shell gesture fixture needs non-interactive visible padding');
  return {x,y};
 },fraction);
}
async function checkShell(page,url,mobile,reduced,cdp){
 await page.locator('.signal').scrollIntoViewIfNeeded();
 await page.locator('.signal').evaluate(host=>{const b=host.getBoundingClientRect();scrollBy(0,b.top+b.height*.5-innerHeight*.55);});
 if(!mobile)await page.mouse.move(0,0);
 await pause(200);const base=await shellState(page,mobile),result={};report.currentCase.shell=result;
 assert.equal(base.pointerEvents,'none','Decorative shell SVG must not intercept its research links');
 const a=await shellPoint(page,.05),b=await shellPoint(page,.95);
 await reset(page);
 if(mobile){
  const scrollBefore=await page.evaluate(()=>scrollY);
  await touch(cdp,'touchStart',[a]);await pause(160);
  const pressed=await shellState(page,mobile);result.press=shellDisplacement(base,pressed);
  assert.ok(pressed.active,'A finger press gives visible shell feedback');
  if(reduced){
   assert.equal(result.press.maximum,0,'Reduced-motion press cannot deform the mesh');
   assert.notEqual(pressed.feedback,base.feedback,'Reduced-motion feedback changes actual rim styling');
  }else{
   assert.ok(result.press.maximum>.25&&result.press.moved>2,'Finger press deforms actual shell geometry');
   assert.ok(pressed.responseOpacity>base.responseOpacity+.02,'Finger contact produces visible localized glow');
  }
  const duringDrag=[];
  for(let i=1;i<=18;i++){
   await touch(cdp,'touchMove',[{x:a.x+i*2,y:a.y-i*6}]);await pause(30);
   if(i%3===0)duringDrag.push(await shellState(page,mobile));
  }
  const dragged=await shellState(page,mobile),raw=await snapshot(page);
  assert.ok(raw.events.length&&raw.events.every(e=>e.trusted),'Shell gesture uses real trusted browser input');
  result.nativeScrollPx=await page.evaluate(()=>scrollY)-scrollBefore;
  result.pointerCanceled=raw.events.some(e=>e.type==='pointercancel');
  assert.ok(!result.pointerCanceled,'Shell owns the drag instead of surrendering it to page scrolling');
  assert.ok(raw.events.filter(e=>e.type==='touchmove').length>=6,'Shell receives sustained native finger movement');
  assert.ok(Math.abs(result.nativeScrollPx)<2,'Dragging the shell holds the page in place');
  if(reduced){
   assert.ok(duringDrag.length>=2);for(const state of duringDrag)assert.equal(shellDisplacement(base,state).maximum,0,'Reduced-motion native drags keep every mesh vertex fixed');
  }else{
   assert.ok(duringDrag.length>=2,'Measure shell movement throughout a held finger drag');
   result.dragMovement=shellDisplacement(duringDrag[0],duringDrag.at(-1));
   assert.ok(result.dragMovement.maximum>.15,'Finger drag keeps deforming the shell at new contact positions');
   assert.ok(new Set(duringDrag.map(s=>s.gradient)).size>=2,'Localized glow follows the held finger');
   assert.ok(dragged.responseOpacity>.02);
  }
  await touch(cdp,'touchEnd',[]);result.settlement=await settleShell(page,mobile,base);
  const outside=await page.locator('.signal').evaluate(host=>{
   const r=host.getBoundingClientRect(),x=Math.max(1,r.left-8),y=r.top+r.height*.5;
   if(document.elementFromPoint(x,y)?.closest('.signal'))throw new Error('Outside-shell gesture must begin outside the cocoon');
   return {x,y,scrollY};
  });
  await touch(cdp,'touchStart',[{x:outside.x,y:outside.y}]);
  for(let i=1;i<=12;i++){await touch(cdp,'touchMove',[{x:outside.x,y:outside.y-i*8}]);await pause(30);}
  await touch(cdp,'touchEnd',[]);await pause(180);
  result.outsideScrollPx=await page.evaluate(()=>scrollY)-outside.scrollY;assert.ok(result.outsideScrollPx>35,'A finger outside the cocoon still scrolls the page');
 }else{
  await page.mouse.move(a.x,a.y);await pause(220);const hovered=await shellState(page,mobile);
  result.hover=shellDisplacement(base,hovered);
  assert.ok(result.hover.maximum>.25&&result.hover.moved>2,'Mouse hover deforms actual SVG mesh coordinates');
  assert.ok(result.hover.still>result.hover.total*.25,'Shell reaction remains local instead of moving the entire mesh');
  assert.ok(hovered.responseOpacity>base.responseOpacity+.02,'Hover produces a visible localized glow');
  await page.mouse.down();await pause(160);const pressed=await shellState(page,mobile);result.press=shellDisplacement(base,pressed);
  assert.ok(pressed.active&&result.press.maximum>.25);
  for(let i=1;i<=8;i++){await page.mouse.move(a.x+(b.x-a.x)*i/8,a.y+(b.y-a.y)*i/8);await pause(25);}
  await pause(160);const dragged=await shellState(page,mobile);result.drag=shellDisplacement(pressed,dragged);
  assert.ok(result.drag.maximum>.25,'Dragging to another part changes which shell vertices move');
  assert.notEqual(dragged.gradient,pressed.gradient,'Localized glow follows the mouse drag');
  const raw=await snapshot(page);assert.ok(raw.events.length&&raw.events.every(e=>e.trusted));
  await page.mouse.up();await page.mouse.move(0,0);result.settlement=await settleShell(page,mobile,base);
 }
 const link=page.locator('.signal-list a[href="/papers/routing-the-dollar/"]');
 await link.scrollIntoViewIfNeeded();const destination=new URL(await link.getAttribute('href'),url).pathname;
 result.linkInput=await link.evaluate(el=>{
  const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width*.5,r.top+r.height*.5);
  return {hitHref:hit?.closest('a')?.getAttribute('href'),scale:visualViewport.scale,offsetX:visualViewport.offsetLeft,offsetY:visualViewport.offsetTop};
 });
 assert.equal(result.linkInput.hitHref,destination,'The tap starts on the intended research link');
 try{
  await Promise.all([page.waitForURL(u=>u.pathname===destination,{timeout:5000,waitUntil:'domcontentloaded'}),mobile?link.tap({timeout:5000}):link.click({timeout:5000})]);
 }finally{result.linkReached=new URL(page.url()).pathname;}
 if(mobile){
  // Isolate native zoom so its visual viewport cannot leak into later gesture checks.
  const pinchPage=await page.context().newPage(),pinchCdp=await page.context().newCDPSession(pinchPage);
  await pinchPage.goto(url,{waitUntil:'domcontentloaded'});await Promise.race([pinchPage.evaluate(()=>document.fonts.ready),pause(4000)]);await pause(300);
  await pinchPage.locator('.signal').evaluate(host=>{const r=host.getBoundingClientRect();scrollBy(0,r.top+r.height*.5-innerHeight*.55);});await pause(200);
  const pinch=await pinchPage.locator('.signal').evaluate(host=>{const r=host.getBoundingClientRect();return{x:r.left+r.width*.5,y:r.top+r.height*.5,r:r.width*.23,scale:visualViewport.scale};});
  await touch(pinchCdp,'touchStart',[{x:pinch.x-pinch.r,y:pinch.y},{x:pinch.x+pinch.r,y:pinch.y}]);await pause(60);
  for(let i=1;i<=8;i++){await touch(pinchCdp,'touchMove',[{x:pinch.x-pinch.r-i*5,y:pinch.y},{x:pinch.x+pinch.r+i*5,y:pinch.y}]);await pause(35);}
  result.pinchScaleRatio=await pinchPage.evaluate(()=>visualViewport.scale)/pinch.scale;assert.ok(result.pinchScaleRatio>1.1,'Native two-finger zoom remains available over the cocoon');
  assert.equal((await shellState(pinchPage,mobile)).active,false,'Multitouch releases the single-finger shell response');
  await touch(pinchCdp,'touchEnd',[]);await pinchPage.close();
 }
 // Restore an untouched homepage before the existing matrix, coral and dial checks.
 await page.goto(url,{waitUntil:'domcontentloaded'});await Promise.race([page.evaluate(()=>document.fonts.ready),pause(4000)]);await page.evaluate(()=>scrollTo(0,0));await pause(700);
 return result;
}

async function checkCase(browser,url,mobile,reduced){
 const context=await browser.newContext({viewport:{width:mobile?390:1280,height:844},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference',colorScheme:'dark'});
 await context.addInitScript(observe);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await Promise.race([page.evaluate(()=>document.fonts.ready),pause(4000)]);await pause(700);
 const spec={name:reduced?'reduced-motion':mobile?'mobile':'desktop'},cdp=mobile?await context.newCDPSession(page):null;
 report.currentCase=spec;
 spec.shell=await checkShell(page,url,mobile,reduced,cdp);
 if(!mobile&&!reduced)spec.smoothing=await checkSmoothing(page);
 if(mobile&&!reduced)spec.touchFlow=await checkTouchFlow(page,cdp);
 await reset(page);
 if(reduced){
  const before=await page.locator('#mtx').evaluate(c=>c.toDataURL());await touch(cdp,'touchStart',[{x:90,y:600}]);
  for(let i=1;i<=12;i++){await touch(cdp,'touchMove',[{x:90+i*4,y:600-i*8}]);await pause(30);}await touch(cdp,'touchEnd',[]);await pause(150);
  assert.equal(await page.locator('#mtx').evaluate(c=>c.toDataURL()),before,'reduced-motion matrix remains stationary');
  const raw=await snapshot(page);assert.equal(raw.frames.length,0);spec.stationary=true;spec.scrollPx=await page.evaluate(()=>scrollY);assert.ok(spec.scrollPx>30);
 }else{
  // Wait through a complete idle logo dwell and fade before targeting visible ink.
  const targetStart=Date.now();let chosen=null;
  while(!chosen&&Date.now()-targetStart<6000){await pause(80);chosen=await target(page);}
  spec.pointerTarget={waitMs:Date.now()-targetStart,found:!!chosen};
  if(!chosen)spec.pointerTarget.observation=await page.evaluate(()=>{
   const s=__interactionProbe;s.finish();const f=s.frames.at(-1),r=document.getElementById('hero').getBoundingClientRect();
   return {scrollY,heroTop:r.top,heroBottom:r.bottom,viewportHeight:innerHeight,frames:s.frames.length,latestFrameTime:f?.t??null,now:performance.now(),logoDraws:f?.logos.length??0,visibleLogos:f?.logos.filter(p=>p.cy+r.top>0&&p.cy+r.top<innerHeight).length??0,errors:s.errors};
  });
  assert.ok(chosen,'visible logo available for an actual pointer target: '+JSON.stringify(spec.pointerTarget));
  await reset(page);const x=chosen.baseCx-7,y=chosen.screenY;
  if(mobile){
   await touch(cdp,'touchStart',[{x,y}]);await pause(60);
   for(let i=1;i<=12;i++){await touch(cdp,'touchMove',[{x,y:y-i*8}]);await pause(35);}spec.nativeScrollPx=await page.evaluate(()=>scrollY);
  }
  // Follow actual visible ink after the native pan, so a drifting random mark cannot make the test vacuous.
  for(let i=0;i<20;i++){
   const next=await page.evaluate(({col,key,cy})=>{const s=__interactionProbe;s.finish();const latest=s.frames.at(-1);if(!latest)return null;const r=document.getElementById('hero').getBoundingClientRect(),visible=latest.logos.filter(p=>p.alpha>.15&&p.cx>30&&p.cx<innerWidth-30&&p.cy+r.top>100&&p.cy+r.top<innerHeight-100),list=visible.filter(p=>p.col===col&&p.key===key);if(!list.length)list.push(...visible);list.sort((a,b)=>Math.hypot(a.cy-cy,(a.col-col)*26)-Math.hypot(b.cy-cy,(b.col-col)*26));const p=list[0];return p?{...p,screenY:p.cy+r.top}:null;},chosen);
   if(next)chosen=next;
   if(mobile)await touch(cdp,'touchMove',[{x:chosen.baseCx-7,y:chosen.screenY}]);else await page.mouse.move(chosen.baseCx-7,chosen.screenY);
   await pause(35);
  }
  if(mobile)await touch(cdp,'touchEnd',[]);
  await pause(40);const raw=await snapshot(page);spec.nudge=summary(raw.frames);
  assert.ok(raw.events.length>0&&raw.events.every(e=>e.trusted),'browser input must be trusted');
  assert.ok(spec.nudge.nudged>=4,'actual logo pixels must move, not only dollar glyphs');assert.ok(spec.nudge.maxHorizontal>.25,'logos must visibly deflect horizontally');
  assert.ok(spec.nudge.maxDisplacement<=8.001,'logo deflection remains within eight pixels');assert.ok(spec.nudge.maxHorizontal<=8.001);
  assert.ok(spec.nudge.away>=4,'local logos move away from the contact');assert.ok(spec.nudge.alignedTargetDraws>=2,'reef targets follow the displaced painted centers');
  assert.equal(spec.nudge.overlaps,0,'painted glyph/logo rectangles overlap');assert.equal(spec.nudge.repeats,0,'neighboring copies of the same logo repeat');assert.deepEqual(raw.errors,[]);
  if(mobile){
   const cancel=raw.events.find(e=>e.type==='pointercancel');assert.ok(cancel,'native page pan cancels pointer stream');
   spec.afterCancelNudge=summary(raw.frames.filter(f=>f.t>cancel.t+350));assert.ok(spec.afterCancelNudge.nudged>=2,'logo movement continues beyond tap settling during native touch scrolling');
   const moves=raw.events.filter(e=>e.type==='touchmove'&&e.t>cancel.t);spec.fingerDollarSamples=moves.filter(e=>raw.reefPaint.some(p=>p.t>=e.t&&p.t<e.t+90&&Math.hypot(p.x-e.hx,p.y-e.hy)<6)).length;
   assert.ok(spec.fingerDollarSamples>=3,'coral dollar paint follows touch after pointercancel');spec.finalScrollPx=await page.evaluate(()=>scrollY);assert.ok(spec.nativeScrollPx>40,'native page pan remains available before following the falling logo');
  }else await page.mouse.move(0,0);
  await pause(800);await reset(page);await pause(120);spec.released=summary((await snapshot(page)).frames);assert.ok(spec.released.maxHorizontal<.05,'logos ease back after input leaves or ends');
  if(mobile){
   await page.locator('#dial').scrollIntoViewIfNeeded();await page.evaluate(()=>{const b=document.getElementById('dial').getBoundingClientRect();scrollBy(0,b.top-(innerHeight-b.height)/2);});await pause(300);await reset(page);
   assert.equal(await page.locator('.dialgesture').evaluate(e=>getComputedStyle(e).touchAction),'pinch-zoom');
   const b=await page.locator('#dial').boundingBox(),cx=b.x+b.width/2,cy=b.y+b.height/2,r=b.width*.36575,before=await page.evaluate(()=>scrollY);let grinding=0;
   await touch(cdp,'touchStart',[{x:cx+r,y:cy}]);await pause(55);for(let i=1;i<=16;i++){const a=i*.08;await touch(cdp,'touchMove',[{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}]);await pause(30);if(await page.locator('#dial').evaluate(c=>c.classList.contains('grinding')))grinding++;}
   spec.dialScrollPx=await page.evaluate(()=>scrollY)-before;spec.dialGrindingSamples=grinding;assert.ok(Math.abs(spec.dialScrollPx)<2);assert.ok(grinding>=6);assert.ok(!(await snapshot(page)).events.some(e=>e.type==='pointercancel'));await touch(cdp,'touchEnd',[]);await pause(350);assert.equal(await page.locator('#dial').evaluate(c=>c.classList.contains('grinding')),false);
   const c=await page.locator('#dial').boundingBox(),cornerBefore=await page.evaluate(()=>scrollY);await touch(cdp,'touchStart',[{x:c.x+8,y:c.y+8}]);for(let i=1;i<=10;i++){await touch(cdp,'touchMove',[{x:c.x+8,y:c.y+8-i*8}]);await pause(30);}await touch(cdp,'touchEnd',[]);spec.cornerScrollPx=await page.evaluate(()=>scrollY)-cornerBefore;assert.ok(spec.cornerScrollPx>40);
   await page.evaluate(()=>{const b=document.getElementById('dial').getBoundingClientRect();scrollBy(0,b.top-(innerHeight-b.height)/2);});await pause(300);
   const pin=await page.locator('#dial').boundingBox(),px=pin.x+pin.width/2,py=pin.y+pin.height/2,pr=pin.width*.29,startScale=await page.evaluate(()=>visualViewport.scale);
   await touch(cdp,'touchStart',[{x:px-pr,y:py},{x:px+pr,y:py}]);await pause(60);for(let i=1;i<=8;i++){await touch(cdp,'touchMove',[{x:px-pr-i*4,y:py},{x:px+pr+i*4,y:py}]);await pause(35);}spec.rimPinchScaleRatio=await page.evaluate(()=>visualViewport.scale)/startScale;assert.ok(spec.rimPinchScaleRatio>1.1,'native rim pinch remains available');await touch(cdp,'touchEnd',[]);await pause(350);assert.equal(await page.locator('#dial').evaluate(c=>c.classList.contains('grinding')),false);
  }
 }
 assert.deepEqual(errors,[]);spec.pageErrors=errors;report.cases.push(spec);delete report.currentCase;console.log(JSON.stringify(spec));await context.close();
}
(async()=>{
 assert.ok(fs.existsSync(path.join(root,'index.html')),'target directory must contain index.html');
 const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.json':'application/json'};
 const server=http.createServer((req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
 let browser;try{browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});report.browser=await browser.version();await checkCase(browser,url,false,false);await checkCase(browser,url,true,false);await checkCase(browser,url,true,true);report.pass=true;report.completedAt=new Date().toISOString();}
 catch(e){report.pass=false;report.error=e.stack;process.exitCode=1;console.error(e.stack);}
 finally{console.log(JSON.stringify(report,null,2));if(process.env.HOMEPAGE_INTERACTIONS_REPORT)fs.writeFileSync(process.env.HOMEPAGE_INTERACTIONS_REPORT,JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
