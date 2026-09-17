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
  productionFunction('matrixTextBounds', false) + '\n' + productionFunction('drawMatrix');
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
    mctx:ctx,Math:seededMath(seed),iconPts:[],ICONPT_CAP:220,TINT_STEPS:6,
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
