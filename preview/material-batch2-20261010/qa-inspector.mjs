import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {labServer} from './server.mjs';
const out='reports/local/material-batch2-20261010/inspector-r1';await fs.mkdir(out,{recursive:true});
const source=`import {createViewer} from './src/ui/model-viewer.mjs';import {configurePlatformAssetUrl} from './src/assets/manifest';import {identities} from './preview/visual-plan-validation-20261009/catalog';const manifest=await(await fetch('./asset-manifest.json')).json();configurePlatformAssetUrl(id=>manifest.assets[id]?.url?'/'+manifest.assets[id].url:null);window.viewer=await createViewer(document.querySelector('#host'));window.identities=identities;window.ready=true;`;
const b=await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'material-inspector.ts'},bundle:true,write:false,metafile:true,format:'esm',target:'es2022'});
await fs.writeFile(out+'/main.js',b.outputFiles[0].contents);await fs.writeFile(out+'/index.html','<!doctype html><meta charset="utf-8"><div id="host" style="width:960px;height:640px"></div><script type="module" src="./main.js"></script>');
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));await fs.copyFile('dist/web/'+release.manifest,out+'/asset-manifest.json');
const stamp=[];for(const f of Object.keys(b.metafile.inputs).filter(f=>f.startsWith('src/')))stamp.push({file:f,sha256:createHash('sha256').update(await fs.readFile(f)).digest('hex')});
const server=labServer(out);await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:980,height:680}}),report={sources:stamp,checks:[],errors:[]};page.setDefaultTimeout(300000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
try{await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);for(const id of ['marine','marine.1','baneling.1','immortal.2','carrier.1','science_vessel.1','ultralisk','nova','artanis','fenix','viking.1','hellion.1']){
 const check=await page.evaluate(async id=>{const identity=window.identities.find(i=>i.id===id),unit={unitType:identity.family,race:identity.race,eliteId:identity.elite,heroId:identity.hero,modelKey:identity.model,flying:['viking','carrier','science_vessel'].includes(identity.family),nativeMode:identity.family==='viking'?'viking_assault':identity.family==='hellion'?'hellbat':undefined,hp:100,maxHp:100,team:'player'};const result=await window.viewer.loadIdentity(unit);for(const name of ['Stand','Walk','Attack','Death']){const i=result.animations.indexOf(name);if(i<0)continue;window.viewer.play(i);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}return {id,...result};},id);
 assert.ok(check.sourceSurfaces>0);assert.deepEqual(report.errors,[]);await page.screenshot({path:out+'/'+id+'.png'});report.checks.push(check);
 }report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}finally{await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,failure:report.failure}));
