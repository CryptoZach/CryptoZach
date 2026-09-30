'use strict';
// test_homepage_open_home.cjs: drives openHome() from check_homepage_interactions.cjs through every
// outcome it promises, against synthetic pages that lose their execution context on cue.
//
// WHY. Deploy run 36633453209 (2026-09-29, commit bee02467) failed at the gate's first read after goto
// with "Execution context was destroyed, most likely because of a navigation", and the same commit
// passed on rerun. openHome() waits for the load event and absorbs one such loss per run. A retry that
// also absorbed a real navigation would hide a defect, so the arms that must FAIL matter as much as the
// one that must pass.
//
// DETERMINISTIC TRIGGER. The test page redefines document.fonts, so the gate's own read
// (document.fonts.ready) is what schedules the navigation, while a slow font keeps that promise pending.
// The read is therefore always in flight when the document is replaced, however loaded the machine is;
// no timer races the read.
//
//   C1  CONTROL: the sequence the gate used before (goto at DOMContentLoaded, then fonts.ready) throws
//       the CI error on a page replaced during that read.
//   O1  a plain page: openHome reads once and records nothing.
//   O2  a page replaced once during the read: openHome records one loss on the same URL and completes.
//   O3  a page that moves to another URL during every read: openHome fails.
//   O4  a page replaced on every read: openHome fails on the second loss of the same load.
//   O5  a second lost context in the same run fails, even when each page would pass alone.
//   O6  a homepage URL that ends on another URL (a server redirect): openHome fails on its URL check.
//   O7  a page that rewrites only its #fragment on load (as script.js does for jump links) passes.
//
// Run: node scripts/test_homepage_open_home.cjs
// (Playwright's chromium as the gate uses it; CHROME_EXECUTABLE_PATH and PLAYWRIGHT_PACKAGE_ROOT work
// the same way here as in the gate.)
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');

// The gate hashes <root>/index.html when it is required, so hand it a throwaway root.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'open-home-'));
fs.writeFileSync(path.join(tmp,'index.html'),'<!doctype html><title>root</title>\n');
process.argv[2]=tmp;
const gate=require('./check_homepage_interactions.cjs');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE_ROOT||process.cwd(),'package.json'))('playwright');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const FONT_DELAY_MS=Number(process.env.OPEN_HOME_FONT_DELAY_MS||2500);

function pageHtml(mode){
 // Slow fonts keep document.fonts.ready pending from the first script on and again from the load event,
 // so the gate's read is always waiting when the page acts. The page acts only on the read itself: the
 // redefined document.fonts getter, which the page's own font loads bypass through the saved set.
 return `<!doctype html><meta charset=utf-8><title>${mode}</title><body><p>text</p><script>
(function(){
 var fontSet=document.fonts,n=0;
 function slow(){var f=new FontFace('Slow'+(++n),'url(/slow.woff2?'+n+'-'+Math.random()+')');fontSet.add(f);f.load().catch(function(){});}
 slow();addEventListener('load',slow);
 var mode=${JSON.stringify(mode)};if(mode==='plain')return;
 if(mode==='hash'){addEventListener('load',function(){history.replaceState(null,'','#top');});return;}
 Object.defineProperty(document,'fonts',{configurable:true,get:function(){
  var once=mode==='once'&&!sessionStorage.getItem('replaced');
  if(once)sessionStorage.setItem('replaced','1');
  if(mode==='always'||once)setTimeout(function(){location.replace(location.href);},0);
  if(mode==='leave')setTimeout(function(){location.replace('/elsewhere');},0);
  return fontSet;
 }});
})();
</script>`;
}

const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/slow.woff2'){setTimeout(()=>res.writeHead(404,{'Cache-Control':'no-store'}).end(),FONT_DELAY_MS);return;}
 if(u.searchParams.get('mode')==='redirect'){res.writeHead(302,{'Location':'/elsewhere','Cache-Control':'no-store'}).end();return;}
 if(u.pathname==='/elsewhere'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end('<!doctype html><title>elsewhere</title>');return;}
 res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(pageHtml(u.searchParams.get('mode')||'plain'));
});

let failed=0;
async function arm(name,fn){
 try{await fn();console.log('PASS '+name);}
 catch(e){failed++;console.log('FAIL '+name+'  '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | '));}
}
// Each load gets a fresh context, so sessionStorage (the once-only switch) starts empty.
async function inPage(browser,fn){const ctx=await browser.newContext();try{return await fn(await ctx.newPage());}finally{await ctx.close();}}
const losses=()=>gate.report.contextLosses||[];

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 const at=mode=>base+'?mode='+mode;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
 try{
  await arm('C1 control: the old sequence throws the CI error on a page replaced during its read',()=>inPage(browser,async page=>{
   await assert.rejects(async()=>{await page.goto(at('once'),{waitUntil:'domcontentloaded'});await Promise.race([page.evaluate(()=>document.fonts.ready),pause(4000)]);},
    /Execution context was destroyed/);
  }));
  await arm('O1 a plain page: one read, nothing recorded',()=>inPage(browser,async page=>{
   gate.report.contextLosses=[];await gate.openHome(page,at('plain'),0);assert.equal(losses().length,0);
  }));
  await arm('O2 replaced once during the read: one loss recorded on the same URL, and the load completes',()=>inPage(browser,async page=>{
   gate.report.contextLosses=[];await gate.openHome(page,at('once'),0);
   assert.equal(losses().length,1,JSON.stringify(losses()));assert.equal(losses()[0].url,at('once'));
   assert.match(losses()[0].error,/Execution context was destroyed/);
  }));
  await arm('O3 moves to another URL during every read: fails',()=>inPage(browser,async page=>{
   gate.report.contextLosses=[];await assert.rejects(gate.openHome(page,at('leave'),0),/Execution context was destroyed|stays on its own URL/);
  }));
  await arm('O4 replaced on every read: fails on the second loss of the same load',()=>inPage(browser,async page=>{
   gate.report.contextLosses=[];await assert.rejects(gate.openHome(page,at('always'),0),/Execution context was destroyed/);
   assert.equal(losses().length,1,'the first loss is recorded before the second fails: '+JSON.stringify(losses()));
  }));
  await arm('O5 a second lost context in one run fails, although each page passes alone',async()=>{
   gate.report.contextLosses=[];
   await inPage(browser,page=>gate.openHome(page,at('once'),0));
   await inPage(browser,page=>assert.rejects(gate.openHome(page,at('once'),0),/second means the page navigates/));
  });
  await arm('O6 a homepage URL that ends on another URL fails its URL check',()=>inPage(browser,async page=>{
   gate.report.contextLosses=[];await assert.rejects(gate.openHome(page,at('redirect'),0),/stays on its own URL/);
   assert.equal(losses().length,0,'a redirect is not a lost context');
  }));
  await arm('O7 a page that rewrites only its #fragment on load passes',()=>inPage(browser,async page=>{
   gate.report.contextLosses=[];await gate.openHome(page,at('hash'),0);
   assert.ok(page.url().endsWith('#top'),'the fixture really rewrote its fragment: '+page.url());assert.equal(losses().length,0);
  }));
 }finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});
 }
 console.log(failed?failed+' arm(s) FAILED':'all 8 arms passed');
 process.exitCode=failed?1:0;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
