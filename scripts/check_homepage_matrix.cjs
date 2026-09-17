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
const paintCode = productionFunction('claimMatrixSpace', false) + '\n' +
  productionFunction('matrixTextBounds', false) + '\n' + productionFunction('nudgeMatrixIcon') + '\n' + productionFunction('drawMatrix');
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
    drawImage(image,x,y,w,h) { calls.push({kind:'logo',name:image.n,x,y,w,h,alpha:this.globalAlpha}); },
    fillText(value,x,y) {
      const m = this.measureText(value);
      calls.push({kind:'text',name:value,x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,
        w:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,
        h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,alpha:this.fillStyle.alpha*this.globalAlpha});
    }
  };
  const state = {W:width,H:440,COLW:26,MATRIX_CELL:64,matrixSpace:{},cols:[],reduce,
    mctx:ctx,Math:seededMath(seed),iconPts:[],ICONPT_CAP:220,TINT_STEPS:6,active:false,warpTX:null,warpTY:null,
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
  h.state.cols=[column(100,150,[openai]),column(126,60,[openai],2)];
  h.state.cols.forEach(c=>{c.tick=-1000;}); // Isolate convergence from random mutation.
  const counts=[];
  for(let frame=0;frame<90;frame++) {
    const result=h.draw();checkPainting(result,h.state,'crossing frame'+frame);
    counts.push(result.groups.length);
  }
  assert.equal(counts[0],2,'Initially separated logos remain visible');
  assert.ok(counts.slice(25,45).every(n=>n===1),'Converging adjacent duplicates are suppressed');
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
  const handlers = {}, bursts = [], rect = {left:0,top:100,width:390,height:900};
  const state = Object.assign(sharedState, {reduce,W:390,H:900,Math,performance:{now:()=>now},
    active:false,vel:0,pmx:-1,pmy:-1,mx:-1,my:-1,pcx:-1,pcy:-1,
    warpX:null,warpY:null,warpTX:null,warpTY:null,lastMove:0,lastSpawn:0,
    spawnCluster(...args){bursts.push(args);},
    hero:{getBoundingClientRect:()=>rect,addEventListener(type,fn,options){handlers[type]={fn,options};}}});
  vm.createContext(state); vm.runInContext(heroInputCode,state,{timeout:1000});
  function send(type,event={},elapsed=60) {
    now += elapsed;
    const e={pointerType:'touch',clientX:80,clientY:240,touches:[],
      preventDefault(){throw Error('Hero must not cancel native gestures');},...event};
    if(handlers[type])handlers[type].fn(e);
  }
  return {state,handlers,bursts,rect,send};
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
