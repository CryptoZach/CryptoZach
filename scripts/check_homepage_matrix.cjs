// Exercise real homepage startup and drawing functions before deployment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');
// Generated object keys and logo data must also be valid in the full page.
let scriptCount = 0;
for (const match of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (match[1].includes('application/ld+json')) JSON.parse(match[2]);
  else { new vm.Script(match[2]); scriptCount++; }
}
assert.ok(scriptCount > 0, 'No homepage scripts found');
console.log('PASS homepage inline script syntax: ' + scriptCount);

function extract(name, endMarker) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'Missing production function: ' + name);
  return source.slice(start, end);
}
const code = extract('buildColumns', '\n\n  /* Icon positions') + '\n' +
  extract('onIconsReady', '\n\n  var resizeTimer');
for (const reduce of [false, true]) {
  for (const available of [true, false]) {
    let draws = 0;
    const state = {W:390, H:844, COLW:26, cols:[], Math, reduce, loaded:false};
    state.pickItem = () => state.loaded && available ? {t:1,d:{ok:true}} : {t:0,v:'$'};
    state.staticFrame = () => {
      draws++;
      assert.ok(state.cols.every(c => c.glyphs.every(g => g.t === (available ? 1 : 0))));
    };
    vm.createContext(state);
    vm.runInContext(code + '\nbuildColumns();', state, {timeout:1000});
    const before = state.cols.map(c => ({y:c.y, sp:c.sp, tick:c.tick}));
    assert.equal(state.cols.length, 16);
    assert.ok(state.cols.every(c => c.glyphs.length === 20 && c.glyphs.every(g => g.t === 0)));
    state.loaded = true;
    vm.runInContext('onIconsReady();', state, {timeout:1000});
    assert.ok(state.cols.every(c => c.glyphs.every(g => g.t === (available ? 1 : 0))), 'Loaded logos must replace startup fallbacks');
    assert.deepEqual(state.cols.map(c => ({y:c.y, sp:c.sp, tick:c.tick})), before, 'Readiness must preserve stream motion');
    assert.equal(draws, reduce ? 1 : 0, 'Reduced motion must repaint once');
    const glyphs = state.cols.map(c => c.glyphs);
    state.W += 26;
    vm.runInContext('buildColumns();', state, {timeout:1000});
    glyphs.forEach((value, i) => assert.equal(state.cols[i].glyphs, value, 'Resize must preserve existing glyphs'));
    console.log('PASS logo startup: reduced=' + reduce + ', images available=' + available);
  }
}

// Run the real paint loop. Judge emitted rectangles, independently of its grid.
function productionFunction(name, required = true) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0 && !required) return '';
  const end = source.indexOf('\n  }\n', start);
  assert.ok(start >= 0 && end > start, 'Missing production function: ' + name);
  return source.slice(start, end + 5);
}
const matrixMotionStart=source.indexOf('  var MATRIX_IDLE_SPEED =');
const matrixMotionEnd=source.indexOf('  function drawMatrix(',matrixMotionStart);
assert.ok(matrixMotionStart>=0&&matrixMotionEnd>matrixMotionStart,'Missing operative matrix hover motion');
const matrixMotionCode=source.slice(matrixMotionStart,matrixMotionEnd);
const paintCode = productionFunction('matrixConflictWithin') + '\n' + productionFunction('claimMatrixSpace', false) + '\n' +
  productionFunction('matrixTextBounds', false) + '\n' + productionFunction('nudgeMatrixIcon') + '\n' + productionFunction('sameMatrixItem') + '\n' +
  productionFunction('matrixGlyph') + '\n' + matrixMotionCode + '\n' + productionFunction('drawMatrix');
function seededMath(seed) {
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  return math;
}
function logo(name, wordmark = false, ar = 1, scale = 1) {
  return {t:1, d:{n:name, wm:wordmark ? 1 : 0, ar, z:scale, ok:true}};
}
const kalshi = logo('kalshi', true, 4, 0.72);
const maple = logo('maple', true, 4);
const coinbase = logo('coinbase', false, 1, 1.18);
const openai = logo('openai');
const citi = logo('citi', true);
const choices = [kalshi, maple, coinbase, openai, citi, logo('xai'),
  {t:0,v:'USDC'}, {t:0,v:'T-BILL'}, {t:0,v:'$'}, {t:0,v:'\u20BF'},
  {t:0,v:'\u039E'}, {t:0,v:'\u20A9'}];
function column(x, y, items, speed = 0) {
  return {x,y,sp:speed,len:items.length,tick:0,
    glyphs:Array.from({length:20}, (_, i) => items[i % items.length])};
}
function paintHarness(reduce = false, width = 390, seed = 103) {
  const calls = [], backgrounds = [];
  const ctx = {
    globalAlpha:1, fillStyle:{alpha:1}, font:'12px monospace',
    measureText(value) {
      const size = Number(this.font.match(/([\d.]+)px/)[1]);
      const width = value.length * size * 0.6;
      return {width, actualBoundingBoxLeft:width / 2, actualBoundingBoxRight:width / 2,
        actualBoundingBoxAscent:size * 0.75, actualBoundingBoxDescent:size * 0.25};
    },
    fillRect(x,y,w,h) { backgrounds.push({x,y,w,h,alpha:this.fillStyle.alpha * this.globalAlpha}); },
    drawImage(image,x,y,w,h) {
      const alpha=this.globalAlpha;
      assert.ok(Number.isFinite(alpha)&&alpha>=0&&alpha<=1,'Logo paint alpha must be finite and within [0,1]');
      if(alpha===0)return; // No pixels are painted; keep every positive-alpha draw observable.
      calls.push({kind:'logo',name:image.n,x,y,w,h,alpha});
    },
    fillText(value,x,y) {
      const alpha=this.fillStyle.alpha*this.globalAlpha;
      assert.ok(Number.isFinite(alpha)&&alpha>=0&&alpha<=1,'Text paint alpha must be finite and within [0,1]');
      if(alpha===0)return;
      const m = this.measureText(value);
      calls.push({kind:'text',name:value,x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,
        w:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,
        h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,alpha});
    }
  };
  const state = {FRAME_MS:1000/60,W:width,H:440,COLW:26,MATRIX_CELL:64,matrixSpace:{},cols:[],reduce,
    mctx:ctx,Math:seededMath(seed),iconPts:[],ICONPT_CAP:220,TINT_STEPS:6,active:false,warpTX:null,warpTY:null,matrixSpeed:0.48,ctaOK:false,
    GOLD:[251,191,36], FX:{'\u20A9':1},matrixTextMetrics:{},
    pal:()=>({trail:[0,0,0],fade:0.158,blue:[1,2,3],mint:[3,2,1],olive:[2,3,1]}),
    rgb:(color,alpha)=>({color,alpha}),mixc:(a)=>a,
    frameEase:(amount,step)=>1-Math.pow(1-amount,step),tintFor:(d)=>d,
    dollarWarp:()=>null,buildIconGrid(){}};
  state.pickItem = () => choices[(state.Math.random()*choices.length)|0];
  vm.createContext(state);
  vm.runInContext(paintCode+'\n'+productionFunction('buildColumns'),state,{timeout:1000});
  function draw(step = 1, boost = 0.1) {
    calls.length=0; backgrounds.length=0;
    vm.runInContext('drawMatrix(0, '+boost+', '+step+');',state,{timeout:1000});
    // Trail calls belong to the following main paint, within four vertical pixels.
    const groups=[];
    for (const call of calls) {
      const previous=groups[groups.length-1];
      if (!reduce && previous && previous.kind===call.kind && previous.name===call.name &&
          call.alpha>previous.calls[previous.calls.length-1].alpha &&
          previous.first.x===call.x && previous.first.w===call.w && previous.first.h===call.h &&
          call.y>=previous.first.y && call.y-previous.first.y<=4.001 && previous.calls.length<3) {
        previous.calls.push(call);
      } else groups.push({kind:call.kind,name:call.name,first:call,calls:[call]});
    }
    for (const group of groups) {
      if (group.calls.length>1) {
        assert.equal(group.calls.length,3,'A trail group must contain two trails and one main draw');
        const [first,second,main]=group.calls;
        assert.ok(Math.abs(second.y-first.y-2)<1e-8 && Math.abs(main.y-first.y-4)<1e-8,
          'Only explicit trail offsets may share a reservation');
        assert.ok(Math.abs(first.alpha/main.alpha-0.12)<1e-8 && Math.abs(second.alpha/main.alpha-0.24)<1e-8,
          'Coincident main draws must not be hidden inside a trail group');
      }
      const xs=group.calls.map(c=>c.x),ys=group.calls.map(c=>c.y);
      group.left=Math.min(...xs); group.top=Math.min(...ys);
      group.right=Math.max(...group.calls.map(c=>c.x+c.w));
      group.bottom=Math.max(...group.calls.map(c=>c.y+c.h));
      group.main=group.calls.reduce((a,b)=>a.alpha>=b.alpha?a:b);
    }
    return {groups,calls:calls.map(c=>({...c})),backgrounds:backgrounds.map(c=>({...c})),points:[...state.iconPts]};
  }
  return {state,draw};
}
function checkPainting(result, state, label) {
  const {groups}=result;
  for(let i=0;i<groups.length;i++) for(let j=i+1;j<groups.length;j++) {
    const a=groups[i],b=groups[j];
    assert.ok(a.right+3<=b.left-3 || b.right+3<=a.left-3 || a.bottom+3<=b.top-3 || b.bottom+3<=a.top-3,
      label+': insufficient painted clearance '+a.name+'/'+b.name);
    if(a.kind==='logo' && b.kind==='logo' && a.name===b.name) {
      const dx=Math.abs((a.left+a.right-b.left-b.right)/2);
      const dy=Math.abs((a.top+a.bottom-b.top-b.bottom)/2);
      const minX=Math.max(52,((a.right-a.left)+(b.right-b.left))/2+12);
      const minY=Math.max(44,((a.bottom-a.top)+(b.bottom-b.top))/2+12);
      assert.ok(dx>minX || dy>minY,label+': adjacent duplicate '+a.name);
    }
  }
  const eligible=groups.filter(g=>g.kind==='logo' && g.main.y+g.main.h/2>0 &&
    g.main.y+g.main.h/2<state.H && g.main.alpha>0.14);
  assert.equal(result.points.length,Math.min(eligible.length,state.ICONPT_CAP),
    label+': only accepted visible logos may be magnet targets');
  for(const point of result.points) assert.ok(eligible.some(g=>
    Math.abs(point.x-(g.main.x+g.main.w/2))<=0.51 &&
    Math.abs(point.y-(g.main.y+g.main.h/2))<=0.01),label+': target points at a suppressed logo');
}
function fixture(name, columns, expected, configure, reduce=false) {
  const h=paintHarness(reduce); h.state.cols=columns;
  if(configure)configure(h.state);
  const r=h.draw();checkPainting(r,h.state,name);
  assert.equal(r.groups.length,expected,name+': accepted-item count');
  console.log('PASS matrix spacing: '+name);
}
fixture('same-brand horizontal',[column(100,150,[openai]),column(140,150,[openai])],1);
fixture('same-brand vertical',[column(100,150,[coinbase,coinbase])],1);
fixture('same-brand diagonal',[column(100,150,[openai]),column(140,174,[openai])],1);
fixture('wide wordmarks forward',[column(100,150,[kalshi]),column(126,150,[maple])],1);
fixture('wide wordmarks reverse',[column(100,150,[maple]),column(126,150,[kalshi])],1);
fixture('wide same-brand gap',[column(100,150,[maple]),column(166,150,[maple])],1);
fixture('scaled head against square wordmark',[column(100,150,[coinbase]),column(126,150,[citi])],1);
fixture('nonneighbors remain visible',[column(100,150,[openai]),column(180,150,[openai]),column(260,150,[maple])],3);
fixture('ticker competes with wordmark',[column(100,150,[maple]),column(126,150,[{t:0,v:'T-BILL'}])],1);
fixture('warped currency competes with logo',[column(100,150,[openai]),column(180,150,[{t:0,v:'$'}])],1,
  state=>{state.dollarWarp=()=>[100,150];});
fixture('crowded reduced motion',[column(100,150,[maple]),column(126,150,[kalshi]),
  column(200,150,[openai]),column(240,170,[openai])],2,null,true);
for(const reduce of [false,true]) {
  const h=paintHarness(reduce,900);
  const columns=()=>[coinbase,{t:0,v:'$'},{t:0,v:'\u20BF'},{t:0,v:'\u039E'},
    {t:0,v:'\u20A9'},{t:0,v:'USDC'},{t:0,v:'DAI'}].map((item,i)=>column(70+i*110,150,[item]));
  h.state.cols=columns(); const sixty=h.draw(1);
  h.state.cols=columns(); const oneTwenty=h.draw(0.5);
  assert.deepEqual(sixty.calls,oneTwenty.calls,'Visual alpha must be refresh-rate independent after opaque clearing');
  assert.ok(sixty.backgrounds.some(b=>b.x===0&&b.y===0&&b.w===h.state.W&&b.h===h.state.H&&b.alpha===1),
    'Clear accumulated ink with an opaque background');
  if(reduce)assert.ok(sixty.groups.every(g=>g.calls.length===1),'Reduced motion needs no explicit trails');
  checkPainting(sixty,h.state,'refresh-rate control');
  console.log('PASS matrix direct alpha and background: reduced='+reduce);
}
// Different stream speeds must trigger and then release suppression as they cross.
{
  const h=paintHarness();
  h.state.cols=[column(100,300,[openai]),column(126,80,[openai],2)];
  h.state.cols.forEach(c=>{c.tick=-1000;}); // Isolate convergence from random mutation.
  const counts=[];
  for(let frame=0;frame<340;frame++) {
    const result=h.draw();checkPainting(result,h.state,'crossing frame'+frame);
    counts.push(result.groups.length);
  }
  assert.equal(counts[0],2,'Initially separated logos remain visible');
  assert.ok(counts.slice(195,240).every(n=>n===1),'Converging adjacent duplicates are suppressed');
  assert.equal(counts[counts.length-1],2,'Separated logos reappear after crossing');
  console.log('PASS matrix dynamic convergence and release');
}
// Let independently moving streams mutate, wrap and survive a resize.
for(const width of [390,1280]) {
  const h=paintHarness(false,width,441);
  vm.runInContext('buildColumns();',h.state,{timeout:1000});
  let maxLogos=0; const names=new Set();
  for(let frame=0;frame<100;frame++) {
    if(frame===45){h.state.W=width===390?520:780;vm.runInContext('buildColumns();',h.state,{timeout:1000});}
    const result=h.draw(frame%2?0.5:1,frame%3?0.1:0.8);
    checkPainting(result,h.state,'seeded width'+width+' frame'+frame);
    const logos=result.groups.filter(g=>g.kind==='logo'); maxLogos=Math.max(maxLogos,logos.length);
    logos.forEach(g=>names.add(g.name));
  }
  assert.ok(maxLogos>=5 && names.size>=5,'Spacing must not pass by erasing the field');
  console.log('PASS matrix motion, mutation and resize: width='+width+', brands='+names.size);
}

// Exercise the registered production handlers through native gesture sequences.
const heroInputStart = source.indexOf('  var heroTouchId =');
const heroInputEnd = source.indexOf('  var ambient = 0, previousFrame = null, pileSteps = 0;', heroInputStart);
assert.ok(heroInputStart >= 0 && heroInputEnd > heroInputStart, 'Missing hero touch lifecycle');
const heroInputCode = source.slice(heroInputStart, heroInputEnd);
function heroInputHarness(reduce = false, sharedState = {}) {
  let now = 1000;
  const handlers = {}, documentHandlers = {}, windowHandlers = {}, bursts = [], rect = {left:0,top:100,width:390,height:900};
  const state = Object.assign(sharedState, {reduce,FRAME_MS:1000/60,W:390,H:900,Math,performance:{now:()=>now},
    active:false,vel:0,pmx:-1,pmy:-1,mx:-1,my:-1,pcx:-1,pcy:-1,
    warpX:null,warpY:null,warpTX:null,warpTY:null,lastMove:0,lastSpawn:0,
    spawnCluster(...args){bursts.push(args);},
    document:{addEventListener(type,fn,options){documentHandlers[type]={fn,options};}},
    window:{addEventListener(type,fn,options){windowHandlers[type]={fn,options};}},
    hero:{getBoundingClientRect:()=>rect,addEventListener(type,fn,options){handlers[type]={fn,options};}}});
  vm.createContext(state); vm.runInContext(matrixMotionCode+'\n'+heroInputCode,state,{timeout:1000});
  function send(type,event={},elapsed=60) {
    now += elapsed;
    const e={pointerType:'touch',clientX:80,clientY:240,touches:[],
      preventDefault(){throw Error('Hero must not cancel native gestures');},...event};
    if(documentHandlers[type])documentHandlers[type].fn(e);
    if(handlers[type])handlers[type].fn(e);
  }
  return {state,handlers,documentHandlers,windowHandlers,bursts,rect,send};
}
const finger = (identifier=7,clientX=80,clientY=240) => ({identifier,clientX,clientY});
{
  const h=heroInputHarness();
  h.send('pointerdown'); assert.equal(h.bursts.length,0,'Touch must not start twice through pointer and touch events');
  h.send('touchstart',{touches:[finger()]});
  assert.equal(h.bursts.length,1,'Tap starts a coral burst');
  h.send('pointercancel');
  h.send('touchmove',{touches:[finger(7,90,260)]});
  assert.equal(h.bursts.length,2,'Native pan cancellation must not stop finger drag');
  assert.equal(h.state.active,true);
  assert.deepEqual(h.bursts[1].slice(0,2),[90,160]);
  h.rect.top=50;
  h.send('touchmove',{touches:[finger(7,90,270)]});
  assert.deepEqual(h.bursts[2].slice(0,2),[90,220],'Follow the finger in the scrolled hero coordinate space');
  h.send('pointermove'); assert.equal(h.bursts.length,3,'Compatibility pointer moves must not double emission');
  h.send('touchmove',{touches:[finger(7,95,271)]},10);
  h.send('touchmove',{touches:[finger(7,96,272)]},10);
  assert.equal(h.bursts.length,4,'Burst rate remains bounded while touch position updates');
  for(const type of ['touchstart','touchmove','touchend','touchcancel']) assert.equal(h.handlers[type].options.passive,true);
  h.send('touchend'); assert.equal(h.state.active,false); assert.equal(h.state.warpTX,null);
  const count=h.bursts.length;
  h.send('touchmove',{touches:[finger()]}); assert.equal(h.bursts.length,count,'Ended gestures cannot leave an active magnet');
  console.log('PASS hero touch: drag after native pan cancellation, scroll coordinates, rate and cleanup');
}
{
  const h=heroInputHarness();
  h.send('touchstart',{touches:[finger()]});
  h.send('touchstart',{touches:[finger(),finger(8,220,250)]});
  assert.equal(h.state.active,false,'Pinch releases decorative interaction');
  h.send('touchmove',{touches:[finger(),finger(8,250,270)]});
  h.send('touchend',{touches:[finger(8)]});
  h.send('touchmove',{touches:[finger(8,110,300)]});
  assert.equal(h.bursts.length,1,'A remaining pinch finger must not become a new drag');
  // The last finger lifts outside the hero; no all-fingers-up event reaches it.
  h.send('touchstart',{touches:[finger(9)]});
  assert.equal(h.state.active,true,'A fresh touch recovers after an outside-hero pinch end');
  h.send('touchmove',{touches:[finger(10,110,300)]});
  assert.equal(h.bursts.length,2,'Only the tracked touch identifier can drive the effect');
  h.send('touchcancel'); assert.equal(h.state.active,false);
  console.log('PASS hero touch: pinch, identifiers and cancellation');
}
{
  const h=heroInputHarness();
  h.send('touchstart',{touches:[finger()]});
  h.send('touchmove',{touches:[finger(7,400,250)]});
  assert.equal(h.state.active,false,'Outside contact stops the effect');
  h.send('touchmove',{touches:[finger(7,100,250)]});
  assert.equal(h.state.active,true,'Reentering the hero resumes the same drag');
  h.send('touchend');
  h.send('pointermove',{pointerType:'mouse',clientX:50,clientY:200});
  assert.equal(h.state.active,true,'Mouse hover remains interactive');
  h.send('pointerleave',{pointerType:'mouse'}); assert.equal(h.state.active,false);
  const quiet=heroInputHarness(true);
  quiet.send('touchstart',{touches:[finger()]}); quiet.send('touchmove',{touches:[finger(7,100,270)]});
  quiet.send('pointermove',{pointerType:'mouse'});
  assert.equal(quiet.bursts.length,0,'Reduced motion must not accumulate hidden bursts');
  console.log('PASS hero touch: bounds, mouse hover and reduced motion');
}

// Drive the served input handlers all the way through actual logo paint calls.
// These fail when a helper exists but is disconnected from input or rendering.
for (const input of ['mouse', 'touch']) {
  const paint=paintHarness(), h=heroInputHarness(false,paint.state);
  paint.state.cols=[column(100,150,[openai]),column(260,150,[maple])];
  paint.state.cols.forEach(c=>{c.tick=-1000;});
  const center=result=>{const g=result.groups.find(g=>g.name==='openai');assert.ok(g,'Touched logo must stay visible');return {x:g.main.x+g.main.w/2,y:g.main.y+g.main.h/2};};
  const initial=paint.draw(),before=center(initial);
  const farBefore=initial.groups.find(g=>g.name==='maple').main;
  if(input==='mouse')h.send('pointermove',{pointerType:'mouse',clientX:94,clientY:250});
  else {
    h.send('touchstart',{touches:[finger(7,80,250)]});
    h.send('pointercancel');
    h.send('touchmove',{touches:[finger(7,94,250)]});
  }
  let result;
  for(let frame=0;frame<20;frame++) {
    result=paint.draw();checkPainting(result,paint.state,input+' nudge frame'+frame);
  }
  const moved=center(result),delta=Math.hypot(moved.x-before.x,moved.y-before.y);
  assert.ok(delta>2 && delta<=8.01,input+': pointer contact must move the actual painted icon slightly');
  assert.ok(moved.x>before.x,input+': icon deflects away from contact');
  const far=result.groups.find(g=>g.name==='maple');
  assert.equal(far.main.x,farBefore.x,'Distant logos stay on their rain columns');
  assert.equal(far.main.y,farBefore.y,'Distant logos have no vertical deflection');
  if(input==='mouse')h.send('pointerleave',{pointerType:'mouse'});else h.send('touchend');
  const firstReturn=center(paint.draw());
  assert.ok(firstReturn.x>before.x && firstReturn.x<moved.x,'Release settles smoothly, without snapping');
  for(let frame=0;frame<60;frame++)paint.draw();
  const settled=center(paint.draw());
  assert.ok(Math.hypot(settled.x-before.x,settled.y-before.y)<0.01,'Released logos return to their original stream');
  console.log('PASS matrix nudge: '+input+' input reaches paint, local displacement, target alignment and smooth release');
}
{
  const results=[];
  for(const step of [1,0.5]) {
    const h=paintHarness();h.state.cols=[column(100,150,[openai])];h.state.cols[0].tick=-1000;
    Object.assign(h.state,{active:true,warpTX:100,warpTY:150});
    for(let frame=0;frame<10/step;frame++)h.draw(step);
    const n=h.state.cols[0].nudges[0];
    assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y),'Exact-center contact cannot divide by zero');
    assert.ok(Math.hypot(n.x,n.y)<=8,'Displacement is bounded to eight CSS pixels');
    results.push({x:n.x,y:n.y});
  }
  assert.ok(Math.hypot(results[0].x-results[1].x,results[0].y-results[1].y)<1e-8,'Same elapsed time at 60/120 Hz gives the same nudge');
  const quiet=paintHarness(true);quiet.state.cols=[column(100,150,[openai])];
  Object.assign(quiet.state,{active:true,warpTX:94,warpTY:150});
  const still=quiet.draw();checkPainting(still,quiet.state,'reduced motion nudge');
  assert.equal(still.groups[0].main.x+still.groups[0].main.w/2,100,'Reduced motion keeps the icon stationary');
  console.log('PASS matrix nudge: center contact, displacement cap, refresh-rate independence and reduced motion');
}
for(const width of [390,1280]) {
  const h=paintHarness(false,width,441);
  vm.runInContext('buildColumns();',h.state,{timeout:1000});
  let displaced=0,maxLogos=0;
  for(let frame=0;frame<120;frame++) {
    Object.assign(h.state,{active:frame<100,warpTX:(frame*17)%h.state.W,warpTY:80+(frame*3)%240});
    if(frame===50){h.state.W=width===390?520:780;vm.runInContext('buildColumns();',h.state,{timeout:1000});}
    const result=h.draw(frame%2?0.5:1);
    checkPainting(result,h.state,'active nudge width'+width+' frame'+frame);
    displaced+=h.state.cols.filter(c=>(c.nudges||[]).some(n=>n&&Math.hypot(n.x,n.y)>0.5)).length;
    maxLogos=Math.max(maxLogos,result.groups.filter(g=>g.kind==='logo').length);
  }
  assert.ok(displaced>10&&maxLogos>=5,'Interaction checks need actual displaced icons in a populated field');
  console.log('PASS matrix nudge: moving contact, spacing, no adjacent duplicates and resize, width='+width);
}

// Stable ownership: pointer deflection cannot alternate which crowded logo owns a slot.
{
  const h=paintHarness(false,900,301), stable=[];
  for(let i=0;i<12;i++) stable.push(column(70+i*50,150,[logo('stable-'+i)]));
  h.state.cols=stable.concat(stable.slice(0,6).map((c,i)=>column(c.x+20,150,[logo('contender-'+i)])));
  h.state.cols.forEach(c=>{c.tick=-10000;});
  for(let i=0;i<45;i++)h.draw();
  const initial=h.draw(), owners=initial.groups.filter(g=>g.kind==='logo').map(g=>g.name).sort();
  assert.ok(owners.length>=8,'Stable-owner fixture needs a populated, crowded field');
  let displaced=0;
  for(let frame=0;frame<160;frame++) {
    Object.assign(h.state,{active:frame<120,warpTX:60+(frame*31)%620,warpTY:145+12*Math.sin(frame*.8)});
    const result=h.draw(frame%2?.5:1);checkPainting(result,h.state,'stable hover '+frame);
    assert.deepEqual(result.groups.filter(g=>g.kind==='logo').map(g=>g.name).sort(),owners,
      'Pointer sweeps cannot blink accepted logos or promote their suppressed neighbors');
    displaced+=h.state.cols.filter(c=>(c.nudges||[]).some(n=>n&&Math.hypot(n.x,n.y)>.3)).length;
  }
  assert.ok(displaced>30,'Stable ownership must include genuine pointer deflection');
  // An earlier array position gets no right to evict an already visible mark.
  const survivor=initial.groups.find(g=>g.kind==='logo');
  const newcomer=column(survivor.main.x+survivor.main.w/2,150,[logo('late-claimant')]);
  newcomer.tick=-10000;h.state.cols.unshift(newcomer);
  for(let frame=0;frame<45;frame++) {
    const result=h.draw();checkPainting(result,h.state,'retained owner '+frame);
    assert.deepEqual(result.groups.filter(g=>g.kind==='logo').map(g=>g.name).sort(),owners,
      'An incoming earlier column cannot replace a retained visible owner');
  }
  console.log('PASS matrix continuity: fixed crowded logos retain ownership through pointer sweeps and new contenders');
}

// Warped currency is a lower-priority overlay regardless of its column order.
{
  const h=paintHarness(), cash=column(25,150,[{t:0,v:'$'}]), mark=column(130,150,[openai]);
  cash.tick=mark.tick=-10000;h.state.cols=[cash,mark];
  Object.assign(h.state,{active:true,warpTX:125,warpTY:150});
  let overlapTarget=true,outsideDraws=0;
  h.state.dollarWarp=()=>[overlapTarget?130:330,150];
  for(let frame=0;frame<100;frame++) {
    overlapTarget=frame%2===0;
    const result=h.draw();checkPainting(result,h.state,'currency priority '+frame);
    if(frame<35)continue;
    assert.ok(result.groups.some(g=>g.kind==='logo'&&g.name==='openai'),
      'Warped dollars cannot evict an established logo');
    const dollars=result.groups.filter(g=>g.kind==='text'&&g.name==='$');
    if(overlapTarget)assert.equal(dollars.length,0,'Currency yields conflicting space to the logo');
    else {assert.ok(dollars.length>0,'Free currency paint must remain visible');outsideDraws++;}
  }
  assert.ok(outsideDraws>20);
  console.log('PASS matrix continuity: warped currency yields to logos without disappearing outside conflicts');
}

// Read the production transition state, including the zero-opacity identity boundary.
{
  function transition(step) {
    const h=paintHarness();h.state.testColumn=column(100,150,[openai]);
    h.state.testItem=openai;h.state.testStep=step;
    const tick=()=>{
      const result=vm.runInContext('matrixGlyph(testColumn,0,testItem,testStep)',h.state,{timeout:1000});
      assert.ok(result&&result.item&&Number.isFinite(result.alpha));
      assert.ok(result.alpha>=0&&result.alpha<=1,'Transition opacity is bounded');
      const row={name:result.item.t===1?result.item.d.n:result.item.v,alpha:result.alpha};
      result.visible=true; // Model a slot whose reservation is accepted, including at alpha zero.
      return row;
    };
    for(let i=0;i<60/step;i++)tick();
    const initial=tick();assert.equal(initial.name,'openai');assert.equal(initial.alpha,1);
    h.state.testItem=maple;
    const rows=[];
    for(let i=1;i<=44/step;i++)rows.push({...tick(),time:i*step});
    const changed=rows.findIndex(r=>r.name==='maple');
    assert.ok(changed>0,'An existing mark fades out before its identity changes');
    assert.ok(rows.slice(0,changed).every(r=>r.name==='openai'));
    assert.ok(rows.slice(changed).every(r=>r.name==='maple'));
    assert.ok(rows[changed].alpha<=1e-8,'The brand changes only while fully transparent');
    assert.ok(rows.slice(0,changed).filter(r=>r.alpha>0&&r.alpha<1).length>=3,'Old mark needs intermediate fade values');
    assert.ok(rows.slice(changed).filter(r=>r.alpha>0&&r.alpha<1).length>=3,'New mark needs intermediate fade values');
    for(let i=1;i<changed;i++)assert.ok(rows[i].alpha<=rows[i-1].alpha+1e-12,'Fade-out must be monotonic');
    for(let i=changed+1;i<rows.length;i++)assert.ok(rows[i].alpha>=rows[i-1].alpha-1e-12,'Fade-in must be monotonic');
    assert.equal(rows.at(-1).alpha,1,'Replacement eventually becomes fully visible');
    return rows;
  }
  const sixty=transition(1),oneTwenty=transition(.5);
  for(const elapsed of [6,10,20,36,44]) {
    const a=sixty.find(r=>r.time===elapsed),b=oneTwenty.find(r=>r.time===elapsed);
    assert.equal(a.name,b.name,'Refresh rate cannot change transition identity at equal elapsed time');
    assert.ok(Math.abs(a.alpha-b.alpha)<1e-8,'Fade timing uses elapsed time, not frame count');
  }
  console.log('PASS matrix transitions: old/new intermediate fades, transparent identity switch and elapsed-time equivalence');
}

// Rain alone slows on mouse hover, with a finite and refresh-independent easing window.
{
  const h=paintHarness(false,900);
  const advance=(steps=1)=>vm.runInContext('matrixMotion('+steps+');',h.state,{timeout:1000});
  for(let i=0;i<60;i++)assert.equal(advance(),.48,'Idle speed stays at the current baseline');
  h.state.matrixHovered=true;
  const first=advance();assert.ok(first<.48&&first>.475,'Hover begins gently rather than snapping to the lower rate');
  for(let i=1;i<15;i++)advance();
  assert.ok(Math.abs(h.state.matrixSpeed-.384)<1e-10,'Halfway through500ms, smoothstep is halfway through the40% slowdown');
  for(let i=15;i<24;i++)advance();
  assert.ok(h.state.matrixSpeed>.288&&h.state.matrixSpeed<.32,'Hover is close to its target at400ms, with easing still active');
  for(let i=24;i<30;i++)advance();
  assert.ok(Math.abs(h.state.matrixSpeed-.288)<1e-10,'Hover reaches exactly60% of idle by500ms');
  for(const [x,y]of [[-10000,-10000],[350,240],[50,0]]){
    Object.assign(h.state,{active:true,warpTX:x,warpTY:y,ctaOK:true,ctaL:250,ctaR:450,ctaTop:220,ctaBottom:260});
    assert.ok(Math.abs(advance()-.288)<1e-10,'CTA and pointer proximity cannot accelerate hovered rain');
  }
  h.state.matrixHovered=false;
  const firstReturn=advance();assert.ok(firstReturn>.288&&firstReturn<.293,'Mouse leave eases back rather than snapping');
  for(let i=1;i<30;i++)advance();assert.ok(Math.abs(h.state.matrixSpeed-.48)<1e-10,'Release restores the unchanged idle rate in500ms');
  for(const fps of [30,60,120,144]){
    const f=paintHarness(false,900);f.state.matrixHovered=true;
    const step=60/fps;
    for(let i=0;i<fps/2;i++)vm.runInContext('matrixMotion('+step+');',f.state,{timeout:1000});
    assert.ok(Math.abs(f.state.matrixSpeed-.288)<1e-10,'Equal elapsed time gives equal hover speed at'+fps+'Hz');
  }
  h.state.matrixHovered=true;for(let i=0;i<10;i++)advance();
  const interrupted=h.state.matrixSpeed;h.state.matrixHovered=false;
  assert.ok(advance()>interrupted&&h.state.matrixSpeed<interrupted+.002,'An interrupted transition restarts smoothly from its actual current speed');
  for(let i=0;i<35;i++){const v=advance();assert.ok(v>=.288&&v<=.48,'Transitions stay within hover and idle limits');}
  function tone(hovered,boost){
    const h=paintHarness(false,900),mark=logo('tone'),blank={t:0,v:'T'};
    h.state.cols=[column(80,250,[blank,blank,blank,blank,blank,mark])];h.state.cols[0].tick=-10000;
    Object.assign(h.state,{matrixHovered:hovered,active:hovered,warpTX:350,warpTY:240});
    let result;for(let i=0;i<45;i++)result=h.draw(1,boost);
    const g=result.groups.find(g=>g.kind==='logo'&&g.name==='tone');assert.ok(g,'Opacity comparison needs a visible non-head logo');return g.main.alpha;
  }
  assert.ok(Math.abs(tone(false,.1)-tone(true,1))<1e-10,'Hover slowing cannot pump logo brightness or change its fade clock');
  console.log('PASS matrix hover motion:40% slowdown,500ms easing, release, reversal, refresh independence and stable alpha');
}

// Exercise the actual event listeners, including modality changes on hybrid devices.
{
  const p=paintHarness(false,390),h=heroInputHarness(false,p.state);
  const advance=(frames=35)=>{for(let i=0;i<frames;i++)vm.runInContext('matrixMotion(1)',h.state,{timeout:1000});return h.state.matrixSpeed;};
  h.send('pointerenter',{pointerType:'mouse'});assert.ok(Math.abs(advance()-.288)<1e-10,'Mouse entry alone arms hover slowing');
  h.send('pointerup',{pointerType:'mouse'});assert.ok(Math.abs(advance()-.288)<1e-10,'Mouse release inside keeps real hover');
  h.send('pointerleave',{pointerType:'mouse'});assert.ok(Math.abs(advance()-.48)<1e-10,'Leaving the hero restores idle');
  h.send('pointermove',{pointerType:'mouse'});advance();
  h.send('touchstart',{touches:[finger()]});assert.equal(h.state.matrixSpeed,.48,'Touch immediately clears an old mouse slowdown');
  h.send('pointercancel');
  for(let i=0;i<12;i++){h.send('touchmove',{touches:[finger(7,80+i*3,250+i)]});assert.equal(advance(1),.48,'Finger drag keeps rain speed steady after native cancellation');}
  assert.ok(h.state.active&&h.bursts.length>2,'Touch still drives responsive coral and nudge targets');
  h.send('pointermove',{pointerType:'mouse'});assert.equal(advance(),.48,'A mouse event while a finger is down cannot rearm hover');
  h.send('touchend');assert.equal(advance(),.48,'Touch release cannot latch hover');
  h.send('pointermove',{pointerType:'mouse',sourceCapabilities:{firesTouchEvents:true}});assert.equal(advance(),.48,'Compatibility touch mouse events cannot arm slowdown');
  h.send('pointermove',{pointerType:'mouse'});assert.ok(Math.abs(advance()-.288)<1e-10,'A fresh real mouse recovers hover on a hybrid device');
  h.send('pointermove',{pointerType:'pen'});assert.equal(h.state.matrixSpeed,.48,'Pen input has no persistent mouse hover rate');
  h.send('pointermove',{pointerType:'mouse'});advance();h.documentHandlers.touchstart.fn({touches:[finger()]});
  assert.equal(h.state.matrixSpeed,.48,'A touch beginning outside the hero also clears stale mouse hover');
  assert.equal(h.documentHandlers.touchstart.options.passive,true,'Global touch reset cannot block scrolling');
  h.send('pointermove',{pointerType:'mouse'});advance();h.windowHandlers.blur.fn();assert.equal(h.state.matrixSpeed,.48,'Window blur clears stale hover speed');
  const quiet=heroInputHarness(true);quiet.send('pointerenter',{pointerType:'mouse'});quiet.send('pointermove',{pointerType:'mouse'});
  assert.equal(quiet.state.matrixHovered,false,'Reduced motion cannot arm hover animation');
  console.log('PASS matrix hover input:mouse lifecycle, touch/pen steady speed, hybrid recovery, compatibility events and blur');
}

// Judge the actual drawing sequence, including a larger replacement that must wait.
{
  const h=paintHarness(), changing=column(100,150,[openai]), neighbor=column(151,150,[coinbase]);
  changing.tick=neighbor.tick=-10000;h.state.cols=[changing,neighbor];
  const before=h.draw();assert.equal(before.groups.filter(g=>g.kind==='logo').length,2);
  changing.glyphs=changing.glyphs.map(()=>logo('openai'));
  assert.equal(h.draw().groups.find(g=>g.name==='openai').main.alpha,
    before.groups.find(g=>g.name==='openai').main.alpha,'Identical brand selections cannot cause a gratuitous fade');
  changing.glyphs=changing.glyphs.map(()=>maple);
  const old=[];
  for(let frame=0;frame<40;frame++) {
    const result=h.draw();checkPainting(result,h.state,'actual fade waiting '+frame);
    assert.ok(result.groups.some(g=>g.name==='coinbase'),'A wider replacement cannot blink an established neighbor');
    assert.ok(!result.groups.some(g=>g.name==='maple'),'Conflicting replacement remains hidden');
    const previous=result.groups.find(g=>g.name==='openai');if(previous)old.push(previous.main.alpha);
  }
  assert.ok(old.length>=8&&old.at(-1)<old[0]*.2,'Actual old-logo paint fades down over multiple frames');
  for(let i=1;i<old.length;i++)assert.ok(old[i]<old[i-1],'Outgoing logo opacity decreases continuously');
  neighbor.y=600;
  const next=[];
  for(let frame=0;frame<24;frame++) {
    const result=h.draw();checkPainting(result,h.state,'actual fade entering '+frame);
    const replacement=result.groups.find(g=>g.name==='maple');if(replacement)next.push(replacement.main.alpha);
  }
  assert.ok(next.length>=12&&next[0]<.1&&next.at(-1)>.8,'Actual new-logo paint fades up after the space becomes free');
  for(let i=1;i<next.length;i++)assert.ok(next[i]>=next[i-1],'Incoming logo opacity increases continuously');
  console.log('PASS matrix painted transitions: same-brand stability, visible old fade, blocked replacement and new fade');
}

// Exercise the real dial handlers and the hit surface delivered in this page.
// Native browser tests separately prove page scrolling and pinch recognition.
{
  const dialStyle = source.match(/#dial-gesture-rim\s*\{([^}]+)\}/);
  assert.ok(dialStyle, 'The dial rim needs its own pre-gesture touch policy');
  assert.match(dialStyle[1], /(?:^|;)\s*touch-action\s*:\s*pinch-zoom\s*(?:;|$)/,
    'A rim drag must retain vertical movement while allowing native pinch zoom');
  assert.match(dialStyle[1], /(?:^|;)\s*pointer-events\s*:\s*stroke\s*(?:;|$)/,
    'Only the annular stroke may claim a dial gesture');
  const dialOverlayStyle = source.match(/\.dialgesture\s*\{([^}]+)\}/);
  assert.ok(dialOverlayStyle, 'Missing dial gesture overlay style');
  assert.match(dialOverlayStyle[1], /(?:^|;)\s*pointer-events\s*:\s*none\s*(?:;|$)/,
    'The invisible overlay box must pass center and corner gestures through');
  assert.match(dialOverlayStyle[1], /(?:^|;)\s*touch-action\s*:\s*pinch-zoom\s*(?:;|$)/,
    'The outer SVG box must own rim drags; policy on a graphics circle alone is ignored');
  assert.match(source, /#dial\s*\{\s*touch-action\s*:\s*auto\s*\}/,
    'The canvas center and corners must allow normal page gestures');
  const dialMarkup = source.match(/<div\s+class="dialstage">([\s\S]*?)<\/div>/);
  assert.ok(dialMarkup, 'Missing dial gesture stage in served markup');
  assert.match(dialMarkup[1], /<canvas\s+id="dial"(?=\s|>)/, 'Stage must contain the actual dial canvas');
  assert.match(dialMarkup[1], /<svg\s+class="dialgesture"(?=\s)[^>]*viewBox="0 0 100 100"/,
    'The overlay must share the canvas coordinate bounds');
  const dialCircle = dialMarkup[1].match(/<circle\b[^>]*\bid="dial-gesture-rim"[^>]*>/);
  assert.ok(dialCircle, 'Missing actual hit-testable rim');
  const attribute = name => {
    const match = dialCircle[0].match(new RegExp('\\b' + name + '="([^" ]+)"'));
    assert.ok(match, 'Missing dial rim attribute: ' + name);
    return match[1];
  };
  assert.equal(attribute('fill'), 'none', 'Dial center cannot be a filled hit target');
  assert.equal(attribute('stroke'), 'transparent', 'Gesture layer must not alter the drawing');
  assert.equal(Number(attribute('cx')), 50);
  assert.equal(Number(attribute('cy')), 50);
  const radius = Number(attribute('r')), band = Number(attribute('stroke-width'));
  assert.ok(radius - band / 2 > 20 && radius - band / 2 < 30 &&
    radius + band / 2 > 45 && radius + band / 2 < 50,
    'The touch annulus must cover the visible rim and exclude the center and corners');

  const dialStart = source.indexOf('  if (!compact){\n    var stage = cv.closest');
  const dialEnd = source.indexOf('\n  /* The rect read is the other half', dialStart);
  assert.ok(dialStart >= 0 && dialEnd > dialStart, 'Missing production dial input handlers');
  const dialInputCode = source.slice(dialStart, dialEnd);
  function dialInputHarness(compact = false) {
    let now = 1000, nextTimer = 0;
    const handlers = {}, timers = new Map(), captured = new Set(), rim = {};
    const stage = {
      querySelector(selector){assert.equal(selector, '#dial-gesture-rim'); return rim;},
      addEventListener(type, handler){handlers[type] = handler;},
      setPointerCapture(id){captured.add(id);},
      hasPointerCapture(id){return captured.has(id);},
      releasePointerCapture(id){captured.delete(id);}
    };
    const canvas = {closest(){return stage;},
      getBoundingClientRect(){return {left:10,top:20,width:100,height:100};}};
    const state = {compact,cv:canvas,size:200,cur:null,curSpeed:0,Math,
      performance:{now:()=>now},
      setTimeout(fn, delay){const id=++nextTimer; timers.set(id,{at:now+delay,fn}); return id;},
      clearTimeout(id){timers.delete(id);}
    };
    vm.createContext(state);
    vm.runInContext(dialInputCode,state,{timeout:1000});
    return {state,captured,handlers,canvas,rim,timers,
      fire(type, props={}){
        assert.ok(handlers[type], 'Missing registered dial handler: ' + type);
        handlers[type]({type,pointerId:1,isPrimary:true,pointerType:'touch',
          clientX:95,clientY:70,target:rim,...props});
      },
      advance(ms){
        now+=ms;
        for(const [id,timer] of timers) if(timer.at<=now){timers.delete(id); timer.fn();}
      }
    };
  }
  const dialCases = {
    'rim capture and logical coordinates'(h){
      h.fire('pointerdown');
      assert.ok(h.captured.has(1), 'A rim press must capture its primary pointer');
      assert.equal(h.state.cur.x,170); assert.equal(h.state.cur.y,100);
    },
    'continuous primary drag'(h){
      h.fire('pointerdown');
      h.fire('pointermove',{clientX:90,clientY:80});
      h.fire('pointermove',{clientX:85,clientY:90});
      assert.equal(h.state.cur.x,150); assert.equal(h.state.cur.y,140);
      assert.ok(h.state.curSpeed>0, 'Movement must reach the production grind state');
      h.fire('pointermove',{pointerId:2,isPrimary:false,clientX:1});
      h.fire('pointerup',{pointerId:2,isPrimary:false});
      assert.equal(h.state.cur.x,150, 'A second touch cannot replace the primary contact');
      assert.ok(h.captured.has(1), 'A second touch cannot release the primary drag');
    },
    'capture survives pointer leaving'(h){
      h.fire('pointerdown'); h.advance(300); h.fire('pointerleave');
      assert.ok(h.state.cur && h.captured.has(1), 'Leaving the ring cannot end a captured drag');
    },
    'cancel and release cleanup'(h){
      h.fire('pointerdown'); h.fire('pointercancel');
      assert.equal(h.state.cur,null, 'Native pinch cancellation must clear contact immediately');
      assert.equal(h.captured.size,0);
      h.fire('pointerdown'); h.advance(300); h.fire('pointerup');
      assert.equal(h.state.cur,null); assert.equal(h.captured.size,0);
    },
    'center remains uncaptured'(h){
      h.fire('pointerdown',{target:h.canvas});
      assert.equal(h.captured.size,0, 'The scrollable center cannot capture the gesture');
    },
    'tap glow and renewed contact'(h){
      h.fire('pointerdown'); h.fire('pointerup');
      h.advance(100); assert.ok(h.state.cur, 'A short tap still needs visible feedback');
      h.fire('pointerdown'); h.advance(200);
      assert.ok(h.state.cur, 'The previous tap timer cannot clear a renewed contact');
      h.fire('pointerup'); h.advance(70);
      assert.equal(h.state.cur,null, 'Tap feedback must end after its floor');
    },
    'unexpected lost capture releases drag'(h){
      h.fire('pointerdown'); h.advance(300); h.captured.clear(); h.fire('lostpointercapture');
      assert.equal(h.state.cur,null);
      h.fire('pointerdown',{pointerId:3});
      assert.ok(h.captured.has(3), 'A lost pointer cannot block later drags');
    },
    'compact dial keeps no drag handlers'(){
      assert.deepEqual(Object.keys(dialInputHarness(true).handlers),[]);
    }
  };
  for(const [name, run] of Object.entries(dialCases)){
    run(dialInputHarness());
    console.log('PASS dial touch: ' + name);
  }
}
// Relative stream motion retires a logo before contact, including duplicate-only conflicts.
for(const duplicateOnly of [false,true]) {
  const h=paintHarness(false,500,631), loserX=duplicateOnly?150:126;
  const winner=logo('collision-owner'),loser=duplicateOnly?winner:logo('collision-loser');
  h.state.cols=[column(100,280,[winner]),column(loserX,60,[loser],2)];
  h.state.cols.forEach(c=>{c.tick=-10000;});
  const rows=[];
  for(let frame=0;frame<340;frame++) {
    const r=h.draw();checkPainting(r,h.state,'collision fade '+duplicateOnly+' '+frame);
    const g=r.groups.find(g=>g.kind==='logo'&&Math.abs(g.main.x+g.main.w/2-loserX)<1);
    rows.push(g?g.main.alpha:0);
  }
  assert.ok(rows[0]>.8,'Crossing fixture begins with a genuinely visible full-strength loser');
  const firstExit=rows.findIndex((a,i)=>i>0&&a===0&&rows[i-1]>0);
  assert.ok(firstExit>10,'The existing logo must retire while the streams cross');
  assert.ok(rows[firstExit-1]<.09,'Last collision-retirement paint must be nearly transparent, not an abrupt cut');
  assert.ok(rows.slice(firstExit-16,firstExit).filter(a=>a>0&&a<.8).length>=8,'Collision retirement needs an actual multi-frame fade');
  for(let i=1;i<=firstExit;i++)assert.ok(rows[i-1]-rows[i]<.09,'Collision exit cannot erase a high-alpha logo in one frame');
  assert.ok(rows.slice(firstExit,firstExit+18).every(a=>a===0),'Retired mark stays hidden through its collision');
  const returnAt=rows.findIndex((a,i)=>i>firstExit&&a>0);
  assert.ok(returnAt>firstExit+18,'Separated stream eventually becomes eligible again');
  assert.ok(rows[returnAt]<.12,'Readmission begins with a faint frame');
  assert.ok(rows.slice(returnAt,returnAt+12).every(a=>a>0),'A returned logo cannot flash for one or two frames');
  assert.ok(rows.at(-1)>.8,'Prediction cannot permanently erase separated logos');
  console.log('PASS matrix collision retirement: '+(duplicateOnly?'same-brand proximity without ink overlap':'converging ink envelopes'));
}

// A prospective short-lived slot stays hidden, rather than starting a doomed fade-in.
{
  const h=paintHarness(),winner=logo('admission-owner'),loser=logo('admission-loser');
  h.state.cols=[column(100,180,[winner]),column(126,90,[loser],2)];
  h.state.cols.forEach(c=>{c.tick=-10000;});
  let count=0;
  for(let frame=0;frame<100;frame++) {
    const r=h.draw();checkPainting(r,h.state,'short admission '+frame);
    assert.ok(r.groups.some(g=>g.kind==='logo'&&g.name==='admission-owner'),'Owner remains visible');
    count+=r.groups.filter(g=>g.kind==='logo'&&g.name==='admission-loser').length;
  }
  assert.equal(count,0,'Do not admit a moving logo whose projected clear interval cannot cover a useful fade-in and exit');
  console.log('PASS matrix collision admission: projected short intervals never flash');
}

// Retirement is sticky even when its original obstacle disappears during the fade.
{
  const h=paintHarness(false,500),winner=logo('sticky-owner'),loser=logo('sticky-loser');
  const moving=column(126,60,[loser],2);
  h.state.cols=[column(100,280,[winner]),moving];h.state.cols.forEach(c=>{c.tick=-10000;});
  let retiring=false;
  for(let frame=0;frame<180;frame++) {
    const r=h.draw();checkPainting(r,h.state,'sticky trigger '+frame);
    if(moving.marks[0]?.retiring){retiring=true;break;}
  }
  assert.ok(retiring,'Fixture must trigger the production retirement state');
  h.state.cols=[moving];
  const rows=[];
  for(let frame=0;frame<70;frame++) {
    const r=h.draw();checkPainting(r,h.state,'sticky exit '+frame);
    rows.push(r.groups.find(g=>g.kind==='logo')?.main.alpha||0);
  }
  const zero=rows.indexOf(0);assert.ok(zero>0&&zero<16);
  for(let i=1;i<=zero;i++)assert.ok(rows[i]<=rows[i-1]+1e-10,'Removing the obstacle cannot reverse an in-progress fade');
  const resume=rows.findIndex((a,i)=>i>zero&&a>0);assert.ok(resume-zero>=16,'A completed retirement retains a short stable cooldown');
  assert.ok(rows[resume]<.12&&rows.at(-1)>.8,'Cooldown ends in a fresh, complete fade-in');
  console.log('PASS matrix collision retirement: sticky fade and bounded readmission cooldown');
}

// Execute the complete production shell closure with an observable RAF queue.
const shellSource=source.match(/<script\s+id="selected-work-shell-reaction"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(shellSource,'Missing operative selected-work shell reaction script');
function shellLifecycle(reduce=false){
 const events=()=>{const handlers=new Map();return {
  addEventListener(type,fn){const list=handlers.get(type)||[];list.push(fn);handlers.set(type,list);},
  emit(type,event={}){for(const fn of handlers.get(type)||[])fn(event);}
 };};
 const attrs=(values={})=>({getAttribute:key=>values[key]??null,setAttribute(key,value){values[key]=String(value);}});
 const nodes=new Map(),bases=new Map();
 for(const variant of ['desktop','mobile'])for(const kind of ['mesh','glints']){
  const id='selected-work-shell-'+kind+'-'+variant;
  const match=source.match(new RegExp('<path\\s+id="'+id+'"[^>]*\\sd="([^"]+)"'));
  assert.ok(match,'Missing original shell path '+id);bases.set(id,match[1]);nodes.set('#'+id,attrs({d:match[1]}));
 }
 const response=attrs({opacity:'0'}),contact=attrs(),classes=new Set();
 nodes.set('.signal-shell__response',response);nodes.set('#selected-work-shell-contact',contact);
 const svg={querySelector:selector=>nodes.get(selector)};
 const host=Object.assign(events(),{querySelector:selector=>selector==='.signal-shell'?svg:null,
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
  getBoundingClientRect:()=>({left:20,top:50,width:850,height:320})});
 const doc=Object.assign(events(),{hidden:false,querySelector:selector=>selector==='.signal'?host:null});
 const motion=Object.assign(events(),{matches:reduce}),compact=Object.assign(events(),{matches:false});
 const win=Object.assign(events(),{matchMedia:q=>q.includes('reduced')?motion:compact});
 const pending=new Map();let next=1,now=0,calls=0,cancelled=0,intersection;
 const state={window:win,document:doc,Math,performance:{now:()=>now},
  requestAnimationFrame(fn){const id=next++;pending.set(id,fn);return id;},
  cancelAnimationFrame(id){if(pending.delete(id))cancelled++;},
  IntersectionObserver:function(fn){intersection=fn;this.observe=()=>{};}};
 win.IntersectionObserver=state.IntersectionObserver;
 vm.runInNewContext(shellSource[1],state,{timeout:1000});
 function advance(frames=1){for(let i=0;i<frames;i++){now+=1000/60;const work=[...pending.values()];pending.clear();for(const fn of work){calls++;fn(now);}}}
 const pointer={pointerType:'mouse',button:0,clientX:445,clientY:210};
 const changed=()=>[...bases].some(([id,base])=>nodes.get('#'+id).getAttribute('d')!==base);
 const clean=()=>!changed()&&!classes.has('is-shell-active')&&Number(response.getAttribute('opacity'))===0;
 return {host,doc,win,motion,pointer,pending,advance,changed,clean,classes,
  visible(value){intersection([{isIntersecting:value}]);},
  counts:()=>({calls,cancelled}),touch(type,touches){const event={touches};doc.emit(type,event);host.emit(type,event);}};
}
{
 const h=shellLifecycle();assert.equal(h.pending.size,0,'Idle shell schedules no animation work');
 h.host.emit('pointermove',h.pointer);h.advance(30);assert.ok(h.changed(),'Hover changes the actual production mesh');
 h.advance(180);assert.equal(h.pending.size,0,'A stationary hover settles and stops requesting frames');
 const settledCalls=h.counts().calls;h.advance(10);assert.equal(h.counts().calls,settledCalls,'Stopped hover does no hidden frame work');
 h.host.emit('pointerdown',h.pointer);h.advance(10);h.host.emit('pointerleave',h.pointer);h.advance(120);
 assert.ok(h.clean(),'Released shell restores exact source geometry and removes glow');
 assert.equal(h.pending.size,0,'Released shell stops its RAF loop within two seconds');
 h.host.emit('pointerdown',h.pointer);h.advance(8);assert.ok(h.pending.size>0&&h.changed());
 h.doc.hidden=true;h.doc.emit('visibilitychange');
 assert.ok(h.clean(),'Hidden-tab transition restores shell geometry immediately');assert.equal(h.pending.size,0,'Hidden-tab transition cancels outstanding shell RAF');
 const hiddenCalls=h.counts().calls;h.advance(20);assert.equal(h.counts().calls,hiddenCalls,'Hidden shell executes no queued animation callback');
 h.doc.hidden=false;h.doc.emit('visibilitychange');h.host.emit('pointermove',h.pointer);h.advance(8);
 h.visible(false);assert.ok(h.clean(),'Offscreen transition restores shell geometry immediately');assert.equal(h.pending.size,0,'Offscreen shell resets and cancels outstanding work');
 h.host.emit('pointermove',h.pointer);assert.equal(h.pending.size,0,'Offscreen input cannot restart the frame loop');
 console.log('PASS shell lifecycle: idle, stationary hover, release, hidden tab and offscreen stop');
}
{
 const h=shellLifecycle();h.touch('touchstart',[{identifier:3,clientX:400,clientY:200}]);h.advance(12);assert.ok(h.changed());
 h.touch('touchstart',[{identifier:3,clientX:400,clientY:200},{identifier:8,clientX:450,clientY:210}]);
 assert.ok(h.clean(),'Multitouch resets shell geometry immediately');assert.equal(h.pending.size,0,'Multitouch immediately clears deformation and cancels animation');
 h.touch('touchmove',[{identifier:3,clientX:420,clientY:190}]);assert.equal(h.pending.size,0,'Partially ended pinch cannot restart a stale gesture');
 h.touch('touchend',[]);h.touch('touchstart',[{identifier:9,clientX:450,clientY:220}]);h.advance(12);
 assert.ok(h.changed(),'A fresh single touch recovers after pinch release');
 console.log('PASS shell lifecycle: multitouch reset and fresh-touch recovery');
}
{
 const h=shellLifecycle(true);h.host.emit('pointermove',h.pointer);h.host.emit('pointerdown',h.pointer);h.advance(60);
 assert.ok(h.classes.has('is-shell-active'),'Reduced motion still exposes static contact feedback');
 assert.equal(h.pending.size,0);assert.equal(h.counts().calls,0,'Reduced motion never starts the spring RAF');assert.ok(!h.changed());
 h.host.emit('pointerleave',h.pointer);assert.ok(h.clean());
 h.motion.matches=false;h.motion.emit('change');h.host.emit('pointerdown',h.pointer);h.advance(8);assert.ok(h.changed());
 h.motion.matches=true;h.motion.emit('change');assert.ok(h.clean());assert.equal(h.pending.size,0,'Enabling reduced motion cancels an in-flight spring');
 console.log('PASS shell lifecycle: reduced motion zero RAF and preference-change cancellation');
}
