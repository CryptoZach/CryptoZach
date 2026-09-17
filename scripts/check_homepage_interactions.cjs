'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(process.argv[2]||'_site');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE_ROOT||process.cwd(),'package.json'))('playwright');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={asOf:new Date().toISOString(),root,method:'Unmodified served HTML, trusted browser input, passive canvas and event observations',cases:[]};
function observe(){
 const state=window.__interactionProbe={frames:[],events:[],reefPaint:[],input:null,current:null,brands:new Map(),nextBrand:1,errors:[]};
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
   p.linkAligned=p.distance>.15&&f.links.some(q=>Math.hypot(q.x-p.cx,q.y-p.cy)<.001);
  }
  state.frames.push({t:f.t,input:f.input,logos,overlaps,repeats});if(state.frames.length>700)state.frames.shift();state.current=null;
 }
 state.finish=finish;
 proto.fillRect=function(...args){
  if(this.canvas.id==='mtx'){finish();const r=this.canvas.getBoundingClientRect(),p=state.input;state.current={t:performance.now(),ink:[],links:[],input:p?{x:p.x-r.left,y:p.y-r.top,type:p.type}:null};}
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
 const logos=frames.flatMap(f=>f.logos),measured=logos.filter(p=>Number.isFinite(p.distance)),nudged=measured.filter(p=>p.distance>.15);
 return {frames:frames.length,logoDraws:logos.length,measuredDisplacements:measured.length,maxHorizontal:logos.reduce((n,p)=>Math.max(n,Math.abs(p.dx)),0),maxDisplacement:measured.reduce((n,p)=>Math.max(n,p.distance),0),nudged:nudged.length,away:nudged.filter(p=>p.away).length,alignedTargetDraws:nudged.filter(p=>p.linkAligned).length,overlaps:frames.reduce((n,f)=>n+f.overlaps,0),repeats:frames.reduce((n,f)=>n+f.repeats,0)};
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
async function checkCase(browser,url,mobile,reduced){
 const context=await browser.newContext({viewport:{width:mobile?390:1280,height:844},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference',colorScheme:'dark'});
 await context.addInitScript(observe);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await Promise.race([page.evaluate(()=>document.fonts.ready),pause(4000)]);await pause(700);
 const spec={name:reduced?'reduced-motion':mobile?'mobile':'desktop'},cdp=mobile?await context.newCDPSession(page):null;
 report.currentCase=spec;
 await reset(page);
 if(reduced){
  const before=await page.locator('#mtx').evaluate(c=>c.toDataURL());await touch(cdp,'touchStart',[{x:90,y:600}]);
  for(let i=1;i<=12;i++){await touch(cdp,'touchMove',[{x:90+i*4,y:600-i*8}]);await pause(30);}await touch(cdp,'touchEnd',[]);await pause(150);
  assert.equal(await page.locator('#mtx').evaluate(c=>c.toDataURL()),before,'reduced-motion matrix remains stationary');
  const raw=await snapshot(page);assert.equal(raw.frames.length,0);spec.stationary=true;spec.scrollPx=await page.evaluate(()=>scrollY);assert.ok(spec.scrollPx>30);
 }else{
  let chosen=null;for(let i=0;i<25&&!chosen;i++){await pause(80);chosen=await target(page);}assert.ok(chosen,'visible logo available for an actual pointer target');
  await reset(page);const x=chosen.baseCx-7,y=chosen.screenY;
  if(mobile){
   await touch(cdp,'touchStart',[{x,y}]);await pause(60);
   for(let i=1;i<=22;i++){await touch(cdp,'touchMove',[{x,y:y-i*5}]);await pause(35);}await touch(cdp,'touchEnd',[]);
  }else{
   for(let i=0;i<20;i++){
    const next=await page.evaluate(({col,key,cy})=>{const s=__interactionProbe;s.finish();const latest=s.frames.at(-1);if(!latest)return null;const list=latest.logos.filter(p=>p.col===col&&p.key===key);list.sort((a,b)=>Math.abs(a.cy-cy)-Math.abs(b.cy-cy));const p=list[0],r=document.getElementById('hero').getBoundingClientRect();return p?{...p,screenY:p.cy+r.top}:null;},chosen);
    if(next)chosen=next;await page.mouse.move(chosen.baseCx-7,chosen.screenY);await pause(35);
   }
  }
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
   assert.ok(spec.fingerDollarSamples>=3,'coral dollar paint follows touch after pointercancel');spec.nativeScrollPx=await page.evaluate(()=>scrollY);assert.ok(spec.nativeScrollPx>40);
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
