// Artifact-only browser checks. Never starts or tests app/, SAP or Signavio.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const htmlURL = new URL('../design/issue-12-wireframes.html', import.meta.url);
const svgURL = new URL('../design/issue-12-process-adaptation.svg', import.meta.url);
const source = await readFile(htmlURL, 'utf8');
const inline = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inline.length, 1);
const scratch = await mkdtemp(join(process.env.ISSUE12_QA_TMP || tmpdir(), 'issue12-artifact-'));
const syntaxFile = join(scratch,'wireframe-syntax.js');
await writeFile(syntaxFile, inline[0][1]);
const syntax = spawnSync(process.execPath, ['--check', syntaxFile], { encoding:'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
let playwright;
try { playwright = await import('playwright'); }
catch {
  assert.ok(process.env.PLAYWRIGHT_MODULE_PATH, 'Install Playwright or supply PLAYWRIGHT_MODULE_PATH');
  playwright = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH.replace(/\/$/, '')+'/index.mjs').href);
}
const browser = await playwright.chromium.launch({ headless:true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath:process.env.CHROME_EXECUTABLE_PATH } : {}) });
const network = [], errors = [];
let passed = 0;
async function check(name, run) { await run(); passed++; console.log('PASS '+name); }
async function page(width=1366) {
  const context=await browser.newContext({ viewport:{width,height:900} });
  await context.route(/^https?:/, route=>{network.push(route.request().url()); return route.abort();});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(htmlURL.href);return {p,context};
}
async function setup(p, scenario) {
  if (!await p.locator('#setup').evaluate(e=>e.open)) await p.locator('#setup summary').click();
  await p.locator('#scenario').selectOption(scenario);
  await p.locator('#setup summary').click();
}
async function select(p,key='DEMO0001') {
  await p.locator('#load').click();
  await p.locator(`input[name="record"][value="${key}"]`).check();
  assert.equal(await p.locator('#explain').evaluate(e=>e===document.activeElement),true,'Selection must leave useful focus, not BODY');
  await p.locator('#explain').click();
}
async function resolve(p,outcome) {
  if (!await p.locator('#setup').evaluate(e=>e.open)) await p.locator('#setup summary').click();
  await p.locator('#resolution').selectOption(outcome);await p.locator('#resolve').click();
  await p.locator('#setup summary').click();
}
async function layout(p) {
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Page overflow');
  assert.equal(await p.locator('.screen:visible').count(),1);
  for(const e of await p.locator('button:visible,select:visible,.amount:visible').all()){
    const b=await e.boundingBox(),width=await p.evaluate(()=>innerWidth);assert.ok(b.x>=0&&b.x+b.width<=width+1,'Clipped control/card');
  }
  assert.deepEqual(await p.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0],'Wireframe must not prove persistence by using browser storage');
}
async function shot(p,name) {
  if(process.env.CAPTURE_ISSUE12==='1') await p.screenshot({path:fileURLToPath(new URL(`issue-12-${name}.png`,import.meta.url)),fullPage:true});
}
async function confirm(p,choice='later') {
  await p.locator('#continue').click();await p.locator(`input[name="intent"][value="${choice}"]`).check();
  await p.locator('#confirm').click();assert.equal(await p.locator('#title-3').innerText(),'Historical receipt (simulation)');
  assert.match(await p.locator('#receipt-notice').innerText(),/page’s memory, not application persistence/);
}
const scenarios=['partial','not-checked','unavailable','absent','complete','conflict','pending','empty','failed','invalid'];
try {
  console.log(`Artifact QA only; Node ${process.version}; Chrome/Chromium ${browser.version()}; widths 1280/1366/390; synthetic memory-only interactions.`);
  for(const width of [1280,1366,390])for(const scenario of scenarios){
    await check(`design scenario ${scenario} at ${width}px`,async()=>{
      const {p,context}=await page(width);
      try{
        await setup(p,scenario);
        if(['empty','failed','invalid'].includes(scenario)){
          await p.locator('#load').click();
          assert.equal(await p.locator('#explain').isDisabled(),true);assert.equal(await p.locator('#record-options').isVisible(),false);
          if(scenario==='empty'){assert.equal(await p.locator('#empty').isVisible(),true);assert.equal(await p.locator('#read-failure').isVisible(),false);}
          else{assert.equal(await p.locator('#read-failure').isVisible(),true);assert.equal(await p.locator('#empty').isVisible(),false);}
          await layout(p);if(width===390&&scenario==='failed')await shot(p,'wireframe-failure-mobile');
          await p.locator('#connection').click();assert.equal(await p.locator('#load').evaluate(e=>e===document.activeElement),true);
          await p.locator('#load').click();await p.locator('#retry').click();
          await p.locator('input[name="record"]').first().check();await p.locator('#explain').click();
        }else await select(p);
        await layout(p);
        if(scenario==='pending'){
          assert.equal(await p.locator('#continue').isDisabled(),true);assert.match(await p.locator('#update-status').innerText(),/Checking updated/);
          if(width===390)await shot(p,'wireframe-pending-mobile');
          await p.locator('#confirm').evaluate(e=>{e.disabled=false;e.click();});assert.equal(await p.locator('#reopen').isVisible(),false);
          await resolve(p,'partial');assert.equal(await p.locator('#screen-2').isVisible(),true);
        }
        assert.match(await p.locator('#explanation').innerText(),/250\.000.*USD/);
        assert.match(await p.locator('#context').innerText(),/Not a payment or service-coverage date/);
        if(width===1366&&scenario==='partial')await shot(p,'wireframe-explain-desktop');
        await p.locator('#continue').click();
        if(scenario==='conflict'){
          assert.equal(await p.locator('input[value="keep"]').isDisabled(),true);assert.equal(await p.locator('input[value="review"]').isDisabled(),true);
          if(width===1366)await shot(p,'wireframe-conflict-desktop');
        }
        const choice=scenario==='conflict'?'help':scenario==='not-checked'?'keep':scenario==='partial'?'review':'later';
        await p.locator(`input[name="intent"][value="${choice}"]`).check();await p.locator('#confirm').click();
        assert.match(await p.locator('#title-3').innerText(),/Historical receipt/);await layout(p);
        if(width===390&&scenario==='partial')await shot(p,'wireframe-receipt-mobile');
        const summary=await p.locator('#summary').innerText();await p.locator('#return-list').click();await p.locator('#reopen').click();
        assert.equal(await p.locator('#summary').innerText(),summary);
        await p.locator('#reset').click();await p.locator('#cancel-reset').click();assert.equal(await p.locator('#summary').innerText(),summary);
        await p.locator('#reset').click();await p.locator('#confirm-reset').click();assert.equal(await p.locator('#reopen').isVisible(),false);
      }finally{await context.close();}
    });
  }
  for(const outcome of ['partial','conflict','unavailable'])await check('decision refresh clears old choice; resolution '+outcome,async()=>{
    const {p,context}=await page();try{
      await select(p);await p.locator('#continue').click();await p.locator('input[value="keep"]').check();await p.locator('#refresh-decision').click();
      assert.equal(await p.locator('#screen-2').isVisible(),true);assert.equal(await p.locator('input[name="intent"]:checked').count(),0);
      assert.equal(await p.locator('#update-status').evaluate(e=>e===document.activeElement),true);
      for(const id of ['continue','confirm'])await p.locator('#'+id).evaluate(e=>{e.disabled=false;e.click();});
      assert.equal(await p.locator('#screen-3').isVisible(),false);assert.equal(await p.locator('#reopen').isVisible(),false);
      await resolve(p,outcome);await confirm(p,outcome==='conflict'?'help':'later');assert.match(await p.locator('#summary').innerText(),new RegExp(outcome));
    }finally{await context.close();}
  });
  await check('correction / negative exact amount / obsolete manual result',async()=>{
    const {p,context}=await page(390);try{
      await select(p);await p.locator('#refresh-cost').click();await p.locator('#back-list').click();
      await p.locator('input[value="DEMO0002"]').check();await resolve(p,'conflict');await p.locator('#explain').click();
      assert.match(await p.locator('#explanation').innerText(),/-18\.750.*EUR/);assert.equal(await p.locator('#conflict').isVisible(),false);
      await layout(p);await confirm(p,'keep');
    }finally{await context.close();}
  });
  await check('historical provenance survives another failed scenario',async()=>{
    const {p,context}=await page();try{
      await select(p);await confirm(p,'review');const summary=await p.locator('#summary').innerText();
      await setup(p,'failed');await p.locator('#load').click();await p.locator('#reopen').click();
      assert.equal(await p.locator('#summary').innerText(),summary);assert.match(await p.locator('#provenance').innerText(),/Historical.*original synthetic/);
    }finally{await context.close();}
  });
  await check('another selection is explicitly not recorded in the old receipt',async()=>{
    const {p,context}=await page();try{
      await select(p);await confirm(p,'review');const summary=await p.locator('#summary').innerText();
      await p.locator('#return-list').click();await p.locator('input[value="DEMO0002"]').check();await p.locator('#explain').click();await p.locator('#continue').click();
      assert.equal(await p.locator('#summary').innerText(),summary);assert.match(await p.locator('#receipt-notice').innerText(),/DEMO0002 is NOT recorded/);
    }finally{await context.close();}
  });
  await check('keyboard select / explain / confirm / return routes',async()=>{
    const {p,context}=await page();
    async function tabTo(id){for(let i=0;i<24;i++){if(await p.evaluate(id=>document.activeElement.id===id,id))return;await p.keyboard.press('Tab');}assert.fail('Cannot tab to '+id);}
    try{
      await tabTo('load');await p.keyboard.press('Enter');await p.keyboard.press('Tab');await p.keyboard.press('Space');
      assert.equal(await p.locator('#explain').evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Enter');
      await tabTo('continue');await p.keyboard.press('Enter');await p.keyboard.press('Tab');await p.keyboard.press('Space');
      await tabTo('confirm');await p.keyboard.press('Enter');assert.equal(await p.locator('#title-3').evaluate(e=>e===document.activeElement),true);
      await tabTo('return-list');await p.keyboard.press('Enter');assert.equal(await p.locator('#title-1').evaluate(e=>e===document.activeElement),true);
    }finally{await context.close();}
  });
  await check('HTML structure / no external resources / readable palette contrast',async()=>{
    const {p,context}=await page();try{
      const ids=await p.locator('[id]').evaluateAll(es=>es.map(e=>e.id));assert.equal(ids.length,new Set(ids).size);
      assert.equal(await p.locator('main > section.screen').count(),3);assert.equal(await p.locator('script[src],link[href],img,iframe').count(),0);
      const ratios=await p.evaluate(()=>{
        const c=h=>h.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
        const l=h=>c(h).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
        return [['292237','ffffff'],['5d536e','ffffff'],['ffffff','542c83'],['6c3c00','fff8e7'],['8c1837','fff1f4']].map(([a,b])=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05));
      });assert.ok(ratios.every(x=>x>=4.5));console.log('Measured text contrast ratios: '+ratios.map(x=>x.toFixed(2)).join(', '));
      await shot(p,'wireframe-select-desktop');
    }finally{await context.close();}
  });
  await check('complete process SVG renders with all text within its canvas',async()=>{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage();
    try{
      await p.goto(svgURL.href);assert.match(await p.locator('svg title').textContent(),/Billing Review Lite/);
      const outside=await p.locator('svg text').evaluateAll(es=>{const root=document.querySelector('svg').getBoundingClientRect();return es.filter(e=>{const b=e.getBoundingClientRect();return b.left<root.left||b.right>root.right||b.top<root.top||b.bottom>root.bottom;}).map(e=>e.textContent);});
      assert.deepEqual(outside,[]);
      // Standalone SVG has no HTML body: capture its complete canvas with a
      // matching viewport instead of Playwright's HTML full-page calculation.
      if(process.env.CAPTURE_ISSUE12==='1'){
        await p.setViewportSize({width:1440,height:1840});
        await p.screenshot({path:fileURLToPath(new URL('issue-12-process-adaptation.png',import.meta.url)),fullPage:false});
      }
    }finally{await context.close();}
  });
  assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
  console.log(`All ${passed} artifact groups passed. External requests: 0. Browser storage records: 0. Application acceptance suite not run. No human walkthrough or Signavio action claimed.`);
}finally{await browser.close();}
