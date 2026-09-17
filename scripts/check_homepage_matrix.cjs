// Exercise the homepage functions that previously retained fallback-only glyphs.
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
