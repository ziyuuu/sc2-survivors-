/** UI-only local reproduction: actual ship view + World host; no WebGL/gameplay or player storage. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import http from 'node:http';
import {chromium} from '@playwright/test';
const out=path.resolve('reports/local/player-feedback-20261105');await fs.mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:`
import {World} from './src/simulation/world';
import {newEquipmentAccount,grantEquipment,canEquip} from './src/simulation/starship/inventory';
import {mountStarshipUI} from './src/ui/starship/legacy-view';
import {createWorldStarshipHost} from './src/ui/starship/world-host';
import './src/ui/starship/legacy-r12.css';
let w,ui,host,old,candidate;
const art='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>');
window.setup=(phase,template,extra=false)=>{
ui?.dispose();host?.dispose();w=new World({seed:529,race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
const a=w.starship.account,g=(template,slot='offense1')=>{const r=grantEquipment(a,{template,race:'terran',slot,polluted:false},'fixture:'+a.serial,a.run?{kind:'backpack',run:a.run.id}:{kind:'warehouse'});if(!r.ok)throw Error(r.error);return r.value;};
old=g(template);w.equipItem(old.id,old.slot);if(phase==='intermission'){w.start();w.endStage();}candidate=g(template==='attribute.3'?'attribute.3':'attribute.4');if(extra)g('attribute.2','defense1');
host=createWorldStarshipHost(w,{resolveImage:()=>art});ui=mountStarshipUI(document.querySelector('#root'),host,{initialPage:'loadout'});return window.state();};
window.state=()=>({phase:host.phase(),old:old.id,candidate:candidate.id,equipped:{...w.starship.account.equipped.terran},revision:w.starship.account.revision,manual:canEquip(w.starship.account,'terran',candidate.id,candidate.slot).ok,plan:ui.controller.previewAutoEquip().map(i=>i.id)});
window.manual=()=>ui.controller.execute({id:'manual',revision:w.starship.account.revision,managementRevision:host.management.revision,command:{type:'equip',id:candidate.id,slot:candidate.slot}});
window.unwear=()=>ui.controller.execute({id:'unwear',revision:w.starship.account.revision,managementRevision:host.management.revision,command:{type:'unequip',slot:old.slot}});
window.openWarehouse=()=>ui.open('warehouse');
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',write:false,outdir:out,entryNames:'fixture',logLevel:'silent',loader:{'.woff2':'dataurl','.png':'dataurl','.svg':'dataurl'},target:'es2022'});
const files=new Map(bundle.outputFiles.map(f=>['/'+path.basename(f.path),f.contents]));
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><link rel="stylesheet" href="/fixture.css"><body style="background:#07101a;margin:0"><main id="root"></main><script type="module" src="/fixture.js"></script></body></html>');return;}const f=files.get(req.url);res.setHeader('content-type',req.url.endsWith('.css')?'text/css':'text/javascript');res.statusCode=f?200:404;res.end(f);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={scope:'Windows Chrome isolated UI-only fixture, production StarshipUI/WorldHost; blank artwork, no battle renderer or player data.',cases:[],errors:[]};
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof window.setup==='function');
for(const phase of ['outside','intermission'])for(const template of ['attribute.1','attribute.3','set.training.2','special.doom.3']){
 const before=await page.evaluate(([p,t])=>window.setup(p,t),[phase,template]);const button=page.locator('[data-act="auto-equip"]:visible').first();await button.waitFor();const disabled=await button.isDisabled();assert.equal(disabled,template!=='attribute.1');
 if(!disabled){await button.click();assert.equal((await page.evaluate(()=>window.state())).equipped.offense1,before.candidate);}
 if(phase==='outside'&&template==='set.training.2'){
 await page.screenshot({path:path.join(out,'outside-set-disabled.png')});
 await page.evaluate(()=>window.openWarehouse());assert.ok(await page.locator('[data-act="auto-equip"]:visible').isDisabled());
 const removed=await page.evaluate(()=>window.unwear());assert.ok(removed.ok);await page.waitForFunction(()=>!document.querySelector('[data-act="auto-equip"]').disabled);await page.locator('[data-act="auto-equip"]:visible').click();assert.equal((await page.evaluate(()=>window.state())).equipped.offense1,before.candidate);
 }
 if(template==='special.doom.3'){assert.equal(before.manual,true);assert.ok((await page.evaluate(()=>window.manual())).ok);}
 report.cases.push({phase,template,before,disabled,after:await page.evaluate(()=>window.state())});
}
const mixed=await page.evaluate(()=>window.setup('outside','set.training.2',true));await page.locator('[data-act="auto-equip"]:visible').click();const mixedAfter=await page.evaluate(()=>window.state());assert.equal(mixedAfter.equipped.offense1,mixed.old);assert.ok(mixedAfter.equipped.defense1);report.cases.push({name:'protected slot does not block another empty slot',before:mixed,after:mixedAfter});
assert.deepEqual(report.errors,[]);await context.close();report.passed=true;
}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,errors:report.errors}));
