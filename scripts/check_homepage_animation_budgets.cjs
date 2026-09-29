// Measure the hero reef's mesh budget and the dial's and pointer's rate
// independence from the production source, before deployment.
//
// Three concerns the 2026-09-17 homepage animation audit left open after the
// startup and logo work closed (workflow queue entry
// homepage-animation-audit-startup-readiness-and-lifecycle-followup):
//   A. the coral node mesh had no explicit edge budget: 200 nodes inside one
//      55px link radius is 19,900 candidate pairs, one stroke each, and a
//      pointer held still in a gap between marks builds that cluster in about
//      eight seconds;
//   B. the dial integrated per FRAME (spin, grind, glow, sparks), so a 120 Hz
//      display turned it twice as fast as the 60 Hz design;
//   C. pointer speed was per EVENT on the dial and floored at one 60 Hz frame
//      on the hero, so a faster pointer under-reported the same hand speed.
// Section A also holds what the 2026-09-26 re-verification found left of
// finding 2 (workflow dispatch site_homepage_animation_audit_remainder_...):
// both pools admitted one past their cap (201 $, 181 branches), a $ past its
// age still took part in the frame it expired on, and the caps bounded
// strokes, not the distance checks behind them (a co-located cluster cost
// 20,100 checks for 0 strokes). It now counts checks per frame at the
// candidate seam, which reads the code the same way before and after.
// Each section drives the real function text in a vm context with stubs and
// judges behaviour, never wording. `--report` prints the measurements as JSON
// and exits 0 whatever they say, which is how the before/after evidence was
// taken; the default mode asserts and exits 1 on the first failure, which is
// what the pre-deploy gate wants. A seeded Math.random keeps runs comparable.
//
// Usage: node scripts/check_homepage_animation_budgets.cjs [index.html] [--vault vault.js] [--report]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const args = process.argv.slice(2);
const report = args.includes('--report');
const vaultIdx = args.indexOf('--vault');
const vaultPath = vaultIdx >= 0 ? args[vaultIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && (vaultIdx < 0 || i !== vaultIdx + 1));
const indexPath = positional[0] || path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(indexPath, 'utf8');
const vaultSource = vaultPath ? fs.readFileSync(vaultPath, 'utf8') : null;
const out = { index: path.basename(indexPath), vault: vaultPath ? path.basename(vaultPath) : null, A: {}, B: {}, C: {}, D: {} };
const failures = [];
function check(ok, message) {
  if (report) { if (!ok) failures.push(message); return; }
  assert.ok(ok, message);
}
function pass(message) { if (!report) console.log('PASS ' + message); }
function seededMath(seed) {
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  return math;
}
function slice(src, startMarker, endMarker, label, from = 0) {
  const start = src.indexOf(startMarker, from);
  assert.ok(start >= 0, 'Missing production seam start: ' + label);
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, 'Missing production seam end: ' + label);
  return src.slice(start, end);
}
function ratio(a, b) { return b === 0 ? Infinity : a / b; }
function within(x, lo, hi) { return Number.isFinite(x) && x >= lo && x <= hi; }

/* ── A. the reef mesh: how many strokes can one frame ask for? ──────────── */
{
  const gridCode = slice(source, '  /* Icon positions this frame', '  /* Express motion in 60 Hz steps', 'icon grid');
  const easeCode = slice(source, '  var FRAME_MS = 1000 / 60;', '  /* Reserve actual ink bounds', 'frameEase');
  const coralCode = slice(source, '  /* ══ CORAL REEF', '  /* ══ STACKED $', 'coral reef');
  const capMatch = source.match(/var MESH_EDGE_CAP = (\d+)/);
  const degMatch = source.match(/MESH_DEGREE_CAP = (\d+)/);
  const scanMatch = source.match(/MESH_SCAN_CAP = (\d+)/);
  const poolMatch = source.match(/var MAXB = (\d+), MAXN = (\d+)/);
  out.A.meshEdgeCap = capMatch ? Number(capMatch[1]) : null;
  out.A.meshDegreeCap = degMatch ? Number(degMatch[1]) : null;
  out.A.meshScanCap = scanMatch ? Number(scanMatch[1]) : null;
  out.A.maxBranches = poolMatch ? Number(poolMatch[1]) : null;
  out.A.maxNodes = poolMatch ? Number(poolMatch[2]) : null;
  const W = 1440, H = 800, FPS = 60, DT = 1000 / FPS;
  /* A distance CHECK is one candidate pair the mesh examines, linked or not.
     The stroke caps bound only the linked ones, so a cluster of co-located $
     (an absorbed $ snaps onto its mark) is rejected pair by pair at no stroke
     cost and was never bounded. The counter goes in at the candidate seam, so
     the same instrument reads the code before and after a scan bound exists. */
  const CANDIDATE_SEAM = 'var B = ob[b1];';
  const seamAt = coralCode.indexOf(CANDIDATE_SEAM);
  assert.ok(seamAt >= 0 && coralCode.indexOf(CANDIDATE_SEAM, seamAt + 1) < 0, 'The mesh candidate seam must appear exactly once: ' + CANDIDATE_SEAM);
  const countedCoral = coralCode.replace(CANDIDATE_SEAM, CANDIDATE_SEAM + ' __check(A);');
  /* The same code with the scan bound lifted: the control that shows whether
     the bound shapes a frame at all. */
  const unboundedCoral = scanMatch ? countedCoral.replace(/MESH_SCAN_CAP = \d+/, 'MESH_SCAN_CAP = 1e9') : countedCoral;

  function harness(seed, code) {
    let inMesh = 0;
    const counts = { mesh: 0, total: 0, checks: 0, perNode: new Map() };
    const rctx = {
      lineCap: 'butt', lineWidth: 1, strokeStyle: null, fillStyle: null, font: '', shadowColor: null,
      shadowBlur: 0, textAlign: '', textBaseline: '',
      clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, arc() {},
      fill() {}, save() {}, restore() {}, fillText() {},
      stroke() { counts.total++; if (inMesh) counts.mesh++; }
    };
    const state = {
      W, H, rctx, Math: seededMath(seed), window: {}, performance: { now: () => 0 },
      pal: () => ({ olive: [1, 2, 3], blue: [4, 5, 6], mint: [7, 8, 9] }),
      rgb: (c, a) => ({ c, a }), mixc: (a) => a,
      __enter() { inMesh++; }, __exit() { inMesh--; },
      __check(A) { if (!inMesh) return; counts.checks++; counts.perNode.set(A, (counts.perNode.get(A) || 0) + 1); }
    };
    vm.createContext(state);
    vm.runInContext(gridCode + '\n' + easeCode + '\n' + (code || countedCoral), state, { timeout: 5000 });
    vm.runInContext('var __mesh = drawNodeMesh; drawNodeMesh = function(P){ __enter(); try { return __mesh(P); } finally { __exit(); } };', state);
    function reset() { counts.mesh = 0; counts.total = 0; counts.checks = 0; counts.perNode.clear(); }
    function scanMax() { let m = 0; for (const v of counts.perNode.values()) if (v > m) m = v; return m; }
    return {
      state, counts, scanMax,
      tick(now) { reset(); vm.runInContext('drawReef(' + now + ', 1)', state, { timeout: 5000 }); },
      meshOnly() { reset(); vm.runInContext('drawNodeMesh(pal())', state, { timeout: 5000 }); }
    };
  }
  /* Independent of the production grid: every pair the mesh WOULD link. */
  function candidates(nodes) {
    let pairs = 0, maxDeg = 0;
    const deg = new Array(nodes.length).fill(0);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = dx * dx + dy * dy;
      if (d2 > 3025 || d2 < 25) continue;
      pairs++; deg[i]++; deg[j]++;
    }
    for (const d of deg) if (d > maxDeg) maxDeg = d;
    return { pairs, maxDeg };
  }
  function marks(state, n) {
    const pts = [];
    for (let y = 40, i = 0; y < H && pts.length < n; y += 52) for (let x = 30; x < W && pts.length < n; x += 78, i++) pts.push({ x, y, i, a: 1 });
    state.iconPts = pts;
    vm.runInContext('buildIconGrid()', state);
  }
  function run(name, seconds, opts, code) {
    const h = harness(opts.seed || 11, code);
    const s = h.state;
    if (opts.marks) marks(s, 220);
    s.active = !!opts.pointer; s.fade = opts.pointer ? 0.46 : 0.46;
    let ambient = 0, lastSpawn = 0, pmx = -1, pmy = -1, lastMove = 0, vel = 0;
    const rows = [];
    for (let f = 0; f < seconds * FPS; f++) {
      const now = 1000 + f * DT;
      if (opts.pointer) {
        const p = opts.pointer(now, s.Math);
        if (pmx >= 0) { const dt = Math.max(16, now - lastMove); vel = Math.hypot(p.x - pmx, p.y - pmy) / dt * 10; }
        pmx = p.x; pmy = p.y; lastMove = now;
        if (now - lastSpawn > 40) { lastSpawn = now; vm.runInContext('spawnCluster(' + p.x + ',' + p.y + ',' + vel + ',' + now + ', false)', s); }
      } else if (now - ambient > 620) {
        ambient = now;
        vm.runInContext('spawnCluster(rnd(W*0.06, W*0.94), rnd(H*0.12, H*0.88), 0.2, ' + now + ')', s);
      }
      h.tick(now);
      const c = candidates(s.nodes);
      rows.push({ nodes: s.nodes.length, branches: s.branches.length, mesh: h.counts.mesh, total: h.counts.total, pairs: c.pairs, maxDeg: c.maxDeg, checks: h.counts.checks, scan: h.scanMax() });
    }
    const sorted = key => rows.map(r => r[key]).sort((a, b) => a - b);
    const quantile = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
    const mesh = sorted('mesh'), checks = sorted('checks');
    const peak = rows.reduce((m, r) => r.mesh > m.mesh ? r : m, rows[0]);
    const peakPairs = rows.reduce((m, r) => r.pairs > m.pairs ? r : m, rows[0]);
    const summary = {
      seconds, frames: rows.length, maxNodes: Math.max(...rows.map(r => r.nodes)),
      maxBranches: Math.max(...rows.map(r => r.branches)),
      meshEdgesMax: peak.mesh, meshEdgesP50: quantile(mesh, 0.5), meshEdgesP99: quantile(mesh, 0.99),
      meshChecksMax: checks[checks.length - 1], meshChecksP50: quantile(checks, 0.5), meshChecksP99: quantile(checks, 0.99),
      meshScanPerNodeMax: Math.max(...rows.map(r => r.scan)),
      strokesMaxFrame: Math.max(...rows.map(r => r.total)),
      candidatePairsMax: peakPairs.pairs, candidateMaxDegree: Math.max(...rows.map(r => r.maxDeg)),
      frameOfPeak: rows.indexOf(peak)
    };
    if (!code) out.A[name] = summary;
    Object.defineProperty(summary, 'meshPerFrame', { value: rows.map(r => r.mesh) });
    return summary;
  }
  /* Past both pools at one point: the shape a cluster of absorbed $ takes on its
     mark, every pair inside the 5px floor, so every pair is examined and none is
     drawn. Adding twice the pool also shows where each pool actually stops. */
  function coLocated() {
    const h = harness(11);
    const s = h.state;
    const adds = 2 * (out.A.maxNodes || 200);
    for (let i = 0; i < adds; i++) vm.runInContext('addNode(720, 400, 0, 1000)', s);
    for (let i = 0; i < 2 * (out.A.maxBranches || 180); i++) vm.runInContext('spawnBranch(720, 400, 0, 0)', s);
    s.fade = 0.46;
    h.meshOnly();
    const n = s.nodes.length;
    return { adds, nodes: n, branches: s.branches.length, meshChecks: h.counts.checks, meshEdges: h.counts.mesh, meshScanPerNodeMax: h.scanMax(), unboundedChecks: n * (n - 1) / 2 };
  }
  /* A $ past its age on this frame must take no part in it: two $ 30px apart,
     one expired at the frame's time, would otherwise link once and then be
     removed only after the mesh was drawn. */
  function expiredNode() {
    const h = harness(11);
    const s = h.state;
    s.fade = 0.46;
    vm.runInContext('addNode(700, 400, 0, 0); nodes[0].maxAge = 3000; addNode(730, 400, 0, 4000); nodes[1].maxAge = 8000;', s);
    h.tick(5000);
    return { meshEdges: h.counts.mesh, meshChecks: h.counts.checks, nodesAfter: s.nodes.length };
  }
  const idle = run('idle', 20, {});
  const sweep = run('sweep', 8, { pointer: (t) => ({ x: 120 + ((t - 1000) * 0.3) % (W - 240), y: H / 2 + 60 * Math.sin(t / 500) }) });
  const wiggle = run('wiggleInGap', 10, { pointer: (t, M) => ({ x: W / 2 + (M.random() - 0.5) * 4, y: H / 2 + (M.random() - 0.5) * 4 }) });
  const wiggleMarks = run('wiggleOnMarks', 10, { marks: true, pointer: (t, M) => ({ x: 420 + (M.random() - 0.5) * 4, y: 300 + (M.random() - 0.5) * 4 }) });
  /* The fixture must be able to ask for more than the budget, or the budget is
     never exercised: a vacuity control on the scenario, not on the code. */
  check(wiggle.candidatePairsMax > 2000, 'Fixture vacuity: the gap wiggle must build a dense cluster (candidate pairs ' + wiggle.candidatePairsMax + ')');
  check(out.A.meshEdgeCap !== null && out.A.meshDegreeCap !== null, 'The mesh must declare MESH_EDGE_CAP and MESH_DEGREE_CAP');
  const cap = out.A.meshEdgeCap || Infinity;
  for (const [name, s] of [['idle', idle], ['sweep', sweep], ['wiggleInGap', wiggle], ['wiggleOnMarks', wiggleMarks]]) {
    check(s.meshEdgesMax <= cap, name + ': mesh edges per frame ' + s.meshEdgesMax + ' exceed MESH_EDGE_CAP ' + cap);
  }
  check(wiggle.candidatePairsMax > cap, 'Fixture vacuity: the gap wiggle must exceed the cap without it (candidates ' + wiggle.candidatePairsMax + ' vs cap ' + cap + ')');
  /* Ordinary motion never reaches the global ceiling; only the degree cap
     shapes it, and that cap was chosen where the idle median did not move
     (453 before, 451 after at degree 16) while the stationary-pointer peak fell
     from 8,687 to 1,529, under the 1,888 an ordinary sweep already cost. */
  check(idle.meshEdgesMax < cap && sweep.meshEdgesMax < cap, 'Idle and sweep frames must never reach the global ceiling (idle ' + idle.meshEdgesMax + ', sweep ' + sweep.meshEdgesMax + ', cap ' + cap + ')');
  check(idle.meshEdgesP50 > 300, 'Fixture vacuity: the idle reef must still draw a mesh (p50 ' + idle.meshEdgesP50 + ')');
  pass('reef mesh budget: cap ' + cap + ', degree ' + out.A.meshDegreeCap + '; idle max ' + idle.meshEdgesMax + ', sweep max ' + sweep.meshEdgesMax + ', gap wiggle max ' + wiggle.meshEdgesMax + ' of ' + wiggle.candidatePairsMax + ' candidates, on marks ' + wiggleMarks.meshEdgesMax + ' of ' + wiggleMarks.candidatePairsMax);

  /* The pools: MAXN and MAXB are the most the arrays may hold, never one more. */
  check(out.A.maxNodes !== null && out.A.maxBranches !== null, 'The reef must declare MAXB and MAXN');
  const cluster = coLocated();
  out.A.coLocated = cluster;
  check(cluster.adds > (out.A.maxNodes || 0), 'Fixture vacuity: the cluster must add more $ than the pool holds (' + cluster.adds + ')');
  check(cluster.nodes === out.A.maxNodes, 'The node pool must stop at MAXN ' + out.A.maxNodes + ' (held ' + cluster.nodes + ')');
  check(cluster.branches === out.A.maxBranches, 'The branch pool must stop at MAXB ' + out.A.maxBranches + ' (held ' + cluster.branches + ')');
  for (const [name, s] of [['idle', idle], ['sweep', sweep], ['wiggleInGap', wiggle], ['wiggleOnMarks', wiggleMarks]]) {
    check(s.maxNodes <= out.A.maxNodes && s.maxBranches <= out.A.maxBranches, name + ': pools exceeded (nodes ' + s.maxNodes + ' of ' + out.A.maxNodes + ', branches ' + s.maxBranches + ' of ' + out.A.maxBranches + ')');
  }

  /* The scan: checks per frame are bounded by MESH_SCAN_CAP per node, so the
     worst frame costs at most MAXN x MESH_SCAN_CAP examinations. */
  check(out.A.meshScanCap !== null, 'The mesh must declare MESH_SCAN_CAP, a bound on the candidates one $ examines per frame');
  const scanCap = out.A.meshScanCap || Infinity;
  const checkBound = scanCap * (out.A.maxNodes || 0);
  out.A.meshChecksBound = Number.isFinite(checkBound) ? checkBound : null;
  check(cluster.unboundedChecks > checkBound, 'Fixture vacuity: the co-located cluster must ask for more checks than the bound (' + cluster.unboundedChecks + ' vs ' + checkBound + ')');
  check(cluster.meshChecks <= checkBound && cluster.meshScanPerNodeMax <= scanCap, 'Co-located cluster: ' + cluster.meshChecks + ' checks (bound ' + checkBound + '), ' + cluster.meshScanPerNodeMax + ' by one $ (cap ' + scanCap + ')');
  for (const [name, s] of [['idle', idle], ['sweep', sweep], ['wiggleInGap', wiggle], ['wiggleOnMarks', wiggleMarks]]) {
    check(s.meshChecksMax <= checkBound && s.meshScanPerNodeMax <= scanCap, name + ': ' + s.meshChecksMax + ' checks in one frame (bound ' + checkBound + '), ' + s.meshScanPerNodeMax + ' by one $ (cap ' + scanCap + ')');
  }
  /* Ordinary motion must not feel the scan bound: the same seeded idle and
     sweep, with the bound lifted, draw the same mesh on every frame. */
  if (out.A.meshScanCap !== null) {
    const differs = (a, b) => a.meshPerFrame.reduce((n, v, i) => n + (v !== b.meshPerFrame[i] ? 1 : 0), 0);
    const idleFree = run('idle', 20, {}, unboundedCoral);
    const sweepFree = run('sweep', 8, { pointer: (t) => ({ x: 120 + ((t - 1000) * 0.3) % (W - 240), y: H / 2 + 60 * Math.sin(t / 500) }) }, unboundedCoral);
    out.A.scanBoundControl = { idleFramesChanged: differs(idle, idleFree), sweepFramesChanged: differs(sweep, sweepFree), idleChecksMaxUnbounded: idleFree.meshChecksMax, sweepChecksMaxUnbounded: sweepFree.meshChecksMax };
    check(out.A.scanBoundControl.idleFramesChanged === 0 && out.A.scanBoundControl.sweepFramesChanged === 0, 'The scan bound must not change an ordinary frame (idle ' + out.A.scanBoundControl.idleFramesChanged + ', sweep ' + out.A.scanBoundControl.sweepFramesChanged + ' frames changed)');
  }

  /* Expiry runs before the neighbour, absorb, pull and mesh passes. */
  const expired = expiredNode();
  out.A.expiredNode = expired;
  check(expired.nodesAfter === 1, 'Fixture: the expired $ must be removed on its frame (held ' + expired.nodesAfter + ')');
  check(expired.meshEdges === 0, 'An expired $ must take no part in the mesh on the frame it expires (' + expired.meshEdges + ' link(s) drawn)');
  pass('reef pools and scan: nodes ' + cluster.nodes + ' of MAXN ' + out.A.maxNodes + ', branches ' + cluster.branches + ' of MAXB ' + out.A.maxBranches + '; co-located cluster ' + cluster.meshChecks + ' checks of ' + cluster.unboundedChecks + ' unbounded (bound ' + checkBound + '); worst ordinary frame idle ' + idle.meshChecksMax + ', sweep ' + sweep.meshChecksMax + ', gap wiggle ' + wiggle.meshChecksMax + ', on marks ' + wiggleMarks.meshChecksMax + ' checks');
}

/* ── B. the dial: the same seconds must move the same degrees at any refresh rate ── */
function dialSections(src, label) {
  const dial = slice(src, 'function vaultMountDial(cv, opts){', '\n}\n', label + ' vaultMountDial');
  const frameStart = dial.indexOf('  function frame(');
  assert.ok(frameStart >= 0, label + ': missing dial frame');
  const frameEnd = dial.indexOf('\n  }\n', frameStart);
  const frame = dial.slice(frameStart, frameEnd + 5);
  const sparkLoop = dial.indexOf('    for (var si = sparks.length - 1');
  const sparkHead = dial.lastIndexOf("    ctx.lineCap = 'round';", sparkLoop);
  const sparkEnd = dial.indexOf("    ctx.lineCap = 'butt';", sparkLoop);
  assert.ok(sparkLoop >= 0 && sparkHead >= 0 && sparkEnd > sparkLoop, label + ': missing spark loop seam');
  const sparks = dial.slice(sparkHead, sparkEnd);
  const grind = slice(dial, '    /* is the cursor riding the rim? */', '\n    if (grind > 0.015){', label + ' grind block');
  const glow = dial.match(/    coreGlow = cur \? [^\n]*\n/);
  assert.ok(glow, label + ': missing coreGlow integrator');
  const bolt = dial.match(/        boltDing\[b\] = dv \* [^\n]*\n/) ||
    dial.match(/      boltDing\[b\] = boltDing\[b\] > [^\n]*\n/);
  assert.ok(bolt, label + ': missing boltDing decay');
  let track;
  if (dial.includes('    var track = function(e){')) {
    track = slice(dial, '    var track = function(e){', '\n    };\n', label + ' track') + '\n    };';
  } else {
    const body = slice(dial, "    cv.addEventListener('pointermove', function(e){", '\n    }, {passive:true});', label + ' pointermove');
    track = '    var track = function(e){' + body.slice(body.indexOf('{') + 1) + '\n    };';
  }
  const frameMs = dial.match(/var DIAL_FRAME_MS = ([^;]+);/);
  return { frame, sparks, grind, glow: glow[0], bolt: bolt[0], track, frameMs: frameMs ? frameMs[1] : null, stopResets: /previousFrame = null/.test(dial) };
}
function dialMeasure(src, label) {
  const d = dialSections(src, label);
  const R = 505 * 0.385, size = 505;
  const base = () => ({
    Math: seededMath(7), TAU: Math.PI * 2, R, size, SPIN_SCALE: 1, COARSE_DIAL: false, reduce: false,
    spin: 0, strike: 0, grind: 0, grindA: 0, grindDir: 0, lastA: null, dirHeld: 0, gMoving: false, curSpeed: 1,
    sparks: [], SPARK_MAX: 340, coreGlow: 0, cur: null, raf: 0, previousFrame: null, sparkDebt: 0, dragId: null, lastTrack: 0,
    DIAL_FRAME_MS: 1000 / 60, boltDing: new Array(19).fill(0),
    RED: [255, 92, 38], YEL: [255, 214, 96], ROYAL: [58, 96, 232], TEAL: [42, 214, 196], TEAL_PALE: [168, 245, 236],
    rgbaA: () => 'x', cv: { classList: { contains: () => false, toggle() {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: size, height: size }) },
    stage: null, draw() {}, awake: () => false, requestAnimationFrame: () => 0, performance: { now: () => 0 },
    ctx: { lineCap: '', lineWidth: 1, strokeStyle: null, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }
  });
  const res = { frameNormalized: !!d.frameMs, stopResetsClock: d.stopResets };
  /* spin: one simulated second at each refresh rate, wheel free and dragged */
  res.spinPerSecond = {};
  for (const mode of [['free', 0, 0], ['with', 1, 1], ['against', 1, -1]]) {
    const row = {};
    for (const fps of [60, 120, 144]) {
      const s = base(); s.grind = mode[1]; s.grindDir = mode[2];
      vm.createContext(s); vm.runInContext(d.frame, s);
      let clock = 1000;
      for (let i = 0; i < fps; i++) { clock += 1000 / fps; s.performance.now = () => clock; vm.runInContext('frame(' + clock + ')', s); }
      row[fps] = s.spin;
    }
    res.spinPerSecond[mode[0]] = row;
  }
  /* sparks: one spark's lifetime and travel in wall-clock terms */
  res.spark = {};
  for (const fps of [60, 120]) {
    const s = base();
    s.sparks = [{ x: 0, y: 0, px: 0, py: 0, vx: 2, vy: -1, life: 1, hot: false, arc: true, decay: 0.04 }];
    vm.createContext(s); vm.runInContext('function sparkTick(step){\n' + d.sparks + '\n}', s);
    let ticks = 0, lastX = 0;
    while (s.sparks.length && ticks < 10000) { lastX = s.sparks[0].x; vm.runInContext('sparkTick(' + (60 / fps) + ')', s); ticks++; }
    res.spark[fps] = { lifetimeMs: ticks * 1000 / fps, travelX: lastX };
  }
  /* grind: milliseconds for the contact glow to reach full, then to fade; and
     sparks thrown per second while the pointer travels the rim at 1 rad/s */
  res.grind = {};
  for (const fps of [60, 120]) {
    const s = base();
    vm.createContext(s); vm.runInContext('function grindTick(step){\n' + d.grind + '\n}', s);
    const onRim = (a) => ({ x: size / 2 + Math.cos(a) * R * 0.95, y: size / 2 + Math.sin(a) * R * 0.95 });
    s.cur = onRim(0);
    let ticks = 0;
    while (s.grind < 1 && ticks < 10000) { vm.runInContext('grindTick(' + (60 / fps) + ')', s); ticks++; }
    const riseMs = ticks * 1000 / fps;
    let a = 0; s.sparks.length = 0;
    for (let i = 0; i < fps; i++) { a -= 1 / fps; s.cur = onRim(a); vm.runInContext('grindTick(' + (60 / fps) + ')', s); }
    const sparksPerSecond = s.sparks.length;
    s.cur = null; ticks = 0;
    while (s.grind > 0 && ticks < 10000) { vm.runInContext('grindTick(' + (60 / fps) + ')', s); ticks++; }
    res.grind[fps] = { riseMs, sparksPerSecondAgainst: sparksPerSecond, fallMs: ticks * 1000 / fps };
  }
  res.glow = {};
  for (const fps of [60, 120]) {
    const s = base(); s.cur = { x: 1, y: 1 };
    vm.createContext(s); vm.runInContext('function glowTick(step){\n' + d.glow + '\n}', s);
    let ticks = 0;
    while (s.coreGlow < 1 && ticks < 10000) { vm.runInContext('glowTick(' + (60 / fps) + ')', s); ticks++; }
    res.glow[fps] = { riseMs: ticks * 1000 / fps };
  }
  res.bolt = {};
  for (const fps of [60, 120]) {
    const s = base(); s.b = 0; s.boltDing[0] = 1;
    vm.createContext(s); vm.runInContext('function boltTick(step){ var dv = boltDing[b];\n' + d.bolt + '\n}', s);
    let ticks = 0;
    while (s.boltDing[0] > 0.02 && ticks < 10000) { vm.runInContext('boltTick(' + (60 / fps) + ')', s); ticks++; }
    res.bolt[fps] = { fadeMs: ticks * 1000 / fps };
  }
  /* C (dial half): the same 180 logical px/s of hand travel, sampled at each event rate */
  res.trackSpeed = {};
  for (const hz of [60, 120, 240]) {
    const s = base();
    vm.createContext(s); vm.runInContext(d.track, s);
    let clock = 1000;
    for (let i = 0; i <= hz / 2; i++) {
      clock += 1000 / hz; s.performance.now = () => clock;
      const x = 100 + 180 * (i / hz);
      vm.runInContext('track({isPrimary:true, pointerId:1, clientX:' + x + ', clientY:100, timeStamp:' + clock + '})', s);
    }
    res.trackSpeed[hz] = s.curSpeed;
  }
  return res;
}
{
  out.B.index = dialMeasure(source, 'index.html');
  if (vaultSource) out.B.vault = dialMeasure(vaultSource, 'vault.js');
  for (const [label, r] of Object.entries(out.B)) {
    for (const mode of ['free', 'with', 'against']) {
      const row = r.spinPerSecond[mode];
      check(within(ratio(row[120], row[60]), 0.97, 1.03) && within(ratio(row[144], row[60]), 0.97, 1.03), label + ' dial spin per second must not depend on refresh rate (' + mode + ': 60Hz ' + row[60].toFixed(4) + ', 120Hz ' + row[120].toFixed(4) + ', 144Hz ' + row[144].toFixed(4) + ')');
    }
    check(within(ratio(r.spark[120].lifetimeMs, r.spark[60].lifetimeMs), 0.9, 1.1), label + ' spark lifetime must be wall-clock (60Hz ' + r.spark[60].lifetimeMs + 'ms, 120Hz ' + r.spark[120].lifetimeMs + 'ms)');
    check(within(ratio(r.spark[120].travelX, r.spark[60].travelX), 0.85, 1.15), label + ' spark travel must be wall-clock (60Hz ' + r.spark[60].travelX.toFixed(1) + ', 120Hz ' + r.spark[120].travelX.toFixed(1) + ')');
    check(within(ratio(r.grind[120].riseMs, r.grind[60].riseMs), 0.85, 1.15) && within(ratio(r.grind[120].fallMs, r.grind[60].fallMs), 0.85, 1.15), label + ' grind rise and fall must be wall-clock (rise 60Hz ' + r.grind[60].riseMs + 'ms vs 120Hz ' + r.grind[120].riseMs + 'ms; fall ' + r.grind[60].fallMs + ' vs ' + r.grind[120].fallMs + ')');
    check(within(ratio(r.grind[120].sparksPerSecondAgainst, r.grind[60].sparksPerSecondAgainst), 0.75, 1.25), label + ' sparks per second must not depend on refresh rate (60Hz ' + r.grind[60].sparksPerSecondAgainst + ', 120Hz ' + r.grind[120].sparksPerSecondAgainst + ')');
    check(within(ratio(r.glow[120].riseMs, r.glow[60].riseMs), 0.85, 1.15), label + ' core glow rise must be wall-clock (60Hz ' + r.glow[60].riseMs + 'ms, 120Hz ' + r.glow[120].riseMs + 'ms)');
    check(within(ratio(r.bolt[120].fadeMs, r.bolt[60].fadeMs), 0.85, 1.15), label + ' bolt ding fade must be wall-clock (60Hz ' + r.bolt[60].fadeMs + 'ms, 120Hz ' + r.bolt[120].fadeMs + 'ms)');
    check(r.stopResetsClock, label + ' dial stop must reset its frame clock so a resume does not integrate the pause');
    check(within(ratio(r.trackSpeed[120], r.trackSpeed[60]), 0.9, 1.1) && within(ratio(r.trackSpeed[240], r.trackSpeed[60]), 0.9, 1.1), label + ' rim speed must not depend on pointer event rate (60Hz ' + r.trackSpeed[60].toFixed(3) + ', 120Hz ' + r.trackSpeed[120].toFixed(3) + ', 240Hz ' + r.trackSpeed[240].toFixed(3) + ')');
    pass(label + ' dial: spin/s free 60Hz ' + r.spinPerSecond.free[60].toFixed(4) + ' vs 120Hz ' + r.spinPerSecond.free[120].toFixed(4) + '; spark life ' + r.spark[60].lifetimeMs.toFixed(0) + 'ms vs ' + r.spark[120].lifetimeMs.toFixed(0) + 'ms; rim speed 60/120/240Hz ' + r.trackSpeed[60].toFixed(2) + '/' + r.trackSpeed[120].toFixed(2) + '/' + r.trackSpeed[240].toFixed(2));
  }
}

/* ── C (hero half). the same 240 px/s of hand travel, sampled at each event rate ── */
{
  const code = slice(source, '  function trackHeroInput(', '\n  }\n', 'trackHeroInput') + '\n  }';
  const W = 1440, H = 800;
  out.C.heroVel = {}; out.C.heroSpawnV = {};
  for (const hz of [60, 120, 240]) {
    const spawns = [];
    let clock = 1000;
    const s = {
      reduce: false, W, H, Math, hero: { getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }) },
      performance: { now: () => clock }, pmx: -1, pmy: -1, mx: -1, my: -1, lastMove: 0, warpTX: null, warpTY: null,
      pcx: -1, pcy: -1, active: false, lastSpawn: 0, vel: 0, matrixHovered: false,
      spawnCluster: (x, y, v) => spawns.push(v), stopHeroInput() {}
    };
    vm.createContext(s); vm.runInContext(code, s);
    for (let i = 0; i <= hz / 2; i++) {
      clock += 1000 / hz;
      const x = 200 + 240 * (i / hz);
      vm.runInContext('trackHeroInput(' + x + ', 400, false, false)', s);
    }
    out.C.heroVel[hz] = s.vel;
    out.C.heroSpawnV[hz] = spawns.length ? spawns.reduce((a, b) => a + b, 0) / spawns.length : 0;
  }
  const v = out.C.heroVel;
  check(within(ratio(v[120], v[60]), 0.9, 1.1) && within(ratio(v[240], v[60]), 0.9, 1.1), 'Hero pointer velocity must not depend on event rate (60Hz ' + v[60].toFixed(3) + ', 120Hz ' + v[120].toFixed(3) + ', 240Hz ' + v[240].toFixed(3) + ')');
  pass('hero pointer velocity at 240 px/s: 60/120/240Hz events ' + v[60].toFixed(2) + '/' + v[120].toFixed(2) + '/' + v[240].toFixed(2));
}

/* ── D. a coarse pointer seeds the field like a fine one; only a touch EVENT bursts ──
   The burst in spawnCluster was keyed on (pointer: coarse) as well as the touch
   event, so every phone seeded the 26 startup clusters and the idle drip at
   2.74x the desktop's branch count before a finger landed. Same seed, same 26
   startup calls, a coarse and a fine device: the counts must match, and a
   touch event must still get its burst. */
{
  const gridCode = slice(source, '  /* Icon positions this frame', '  /* Express motion in 60 Hz steps', 'icon grid');
  const easeCode = slice(source, '  var FRAME_MS = 1000 / 60;', '  /* Reserve actual ink bounds', 'frameEase');
  const coralCode = slice(source, '  /* ══ CORAL REEF', '  /* ══ STACKED $', 'coral reef');
  function seeded(coarse, touchEvent) {
    const state = {
      W: 1440, H: 800, Math: seededMath(5), performance: { now: () => 0 },
      window: { matchMedia: (q) => ({ matches: coarse && /pointer:\s*coarse/.test(q) }) },
      rctx: {}, pal: () => ({}), rgb: () => '', mixc: (a) => a
    };
    vm.createContext(state);
    vm.runInContext(gridCode + '\n' + easeCode + '\n' + coralCode, state, { timeout: 5000 });
    for (let i = 0; i < 26; i++) {
      vm.runInContext('spawnCluster(rnd(W*0.05, W*0.95), rnd(H*0.1, H*0.9), 0.2, 0' + (touchEvent ? ', true' : '') + ')', state);
    }
    return state.branches.length;
  }
  const fine = seeded(false, false), coarse = seeded(true, false), touch = seeded(false, true);
  out.D = { startupBranchesFine: fine, startupBranchesCoarse: coarse, startupBranchesTouchEvents: touch, coarseToFine: Number((coarse / fine).toFixed(3)) };
  check(fine > 0, 'Fixture vacuity: the startup seeding must spawn branches (' + fine + ')');
  check(coarse === fine, 'A coarse pointer must seed the startup field like a fine one (fine ' + fine + ', coarse ' + coarse + ' branches)');
  check(touch > 2 * fine, 'A touch event must still get its burst (touch ' + touch + ' vs fine ' + fine + ' branches)');
  pass('startup seeding: fine ' + fine + ', coarse ' + coarse + ', touch events ' + touch + ' branches from 26 clusters');
}

if (report) {
  out.failures = failures;
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log('PASS homepage animation budgets: mesh capped, dial and pointer rate-independent');
}
