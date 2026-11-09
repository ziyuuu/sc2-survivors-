import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveTutorial} from './serve-tutorial-candidate.mjs';

const out='reports/local/tutorial-20261105/ui-restore';
await fs.mkdir(out,{recursive:true});
const build=JSON.parse(await fs.readFile('reports/local/tutorial-20261105/browser/build.json','utf8'));
const subtitles=[...(await fs.readFile('src/data/tutorial.ts','utf8')).matchAll(/(?:invite|move|drone|resources|rescue|operations|identify|equip|boss|extract|flagship):'([^']+)'/g)].map(x=>x[1]).concat('这是旗舰模块，撤离后可以安装。');
const report={build,scope:'UI restoration only. One isolated Zerg account, real entry and endStage port to prepare intermission; saved/reopened at three viewport sizes with Chrome touch media emulation. No campaign-completion, new guided-mechanics or physical-device claim.',cases:[],errors:[]};
const server=await serveTutorial({port:0,diagnostic:true}),origin='http://127.0.0.1:'+server.address().port;
let browser,context,page;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling','--autoplay-policy=no-user-gesture-required']});
 context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.addInitScript(()=>localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium',probeVersion:1})));
 const cases=[{name:'desktop',width:1440,height:900,touch:false,panel:410},{name:'landscape',width:844,height:390,touch:true,panel:260},{name:'portrait',width:390,height:844,touch:true,panel:244}];
 for(const [index,c] of cases.entries()){
  page=await context.newPage();await page.setViewportSize({width:c.width,height:c.height});
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:c.touch,maxTouchPoints:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  const click=async a=>page.locator('[data-action="'+a+'"]:visible').first().click();
  const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(globalThis.__TUTORIAL_APP__?.readiness.state.phase),null,{timeout:240000});assert.equal(await page.evaluate(()=>globalThis.__TUTORIAL_APP__.readiness.state.phase),'ready');await click('flow-continue');await page.waitForFunction(()=>!globalThis.__TUTORIAL_APP__.readiness.state.kind);};
  await page.goto(origin+'/qa.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>globalThis.__TUTORIAL_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
  if(!index){
   await click('menu-new');await page.locator('[data-action="menu-race"][data-race="zerg"]').click();await click('menu-race-next');await click('menu-difficulty-next');await click('menu-start');await ready();
   await page.waitForSelector('.tutorial-comms:not([hidden])');await page.waitForFunction(()=>document.querySelector('.tutorial-comms img')?.naturalWidth>0);
   await page.screenshot({path:out+'/desktop-invitation.png'});
   await page.locator('[data-tutorial=accept]').click();
   await page.evaluate(()=>{const w=globalThis.__TUTORIAL_APP__.world;w.endStage();});
  }else{await click('save-continue');await ready();}
  await page.waitForSelector('.tutorial-comms:not([hidden])');await page.waitForFunction(()=>document.querySelector('.tutorial-comms img')?.naturalWidth>0);await page.waitForTimeout(150);
  const metrics=await page.evaluate(()=>{
   const root=document.querySelector('.tutorial-comms'),p=root.querySelector('p'),img=root.querySelector('img'),r=root.getBoundingClientRect();
   const measure=()=>Object.fromEntries(['.im-heading','.im-choice-grid','.im-footer'].flatMap(s=>{const e=document.querySelector(s);if(!e?.getClientRects().length)return [];const a=e.getBoundingClientRect();return [[s,{x:a.x,y:a.y,width:a.width,height:a.height}]];}));
   const visible=measure();root.hidden=true;const hidden=measure();root.hidden=false;
   return {touch:matchMedia('(pointer:coarse)').matches,panel:{x:r.x,y:r.y,right:r.right,width:r.width,height:r.height},textVisible:!!p.getClientRects().length,portraitVisible:!!img.getClientRects().length&&img.naturalWidth>0,nameVisible:!!root.querySelector('strong').getClientRects().length,font:parseFloat(getComputedStyle(p).fontSize),layout:{visible,hidden}};
  });
  assert.equal(metrics.touch,c.touch);assert.equal(metrics.panel.width,c.panel);assert.equal(metrics.panel.y,4);assert.equal(c.width-metrics.panel.right,c.touch?8:12);assert.ok(metrics.textVisible&&metrics.portraitVisible&&metrics.nameVisible);assert.deepEqual(metrics.layout.visible,metrics.layout.hidden);
  if(c.name==='portrait'){
   const lines=await page.evaluate(texts=>{const p=document.querySelector('.tutorial-comms p'),original=p.textContent;const result=texts.map(text=>{p.textContent=text;const css=getComputedStyle(p);return {text,font:parseFloat(css.fontSize),lines:Math.round(p.getBoundingClientRect().height/parseFloat(css.lineHeight)),clamped:css.webkitLineClamp!=='none'};});p.textContent=original;return result;},subtitles);
   assert.equal(lines.length,34);assert.ok(lines.every(x=>x.font===12&&x.lines<=2&&!x.clamped));report.portraitSubtitles=lines;
  }
  await page.screenshot({path:out+'/'+c.name+'-restored.png'});report.cases.push({...c,metrics});
  await page.evaluate(()=>globalThis.__TUTORIAL_APP__.session.saveNow());await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=error.stack;await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(error);process.exitCode=1;}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await context?.close();await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,errors:report.errors,failure:report.failure}));}
