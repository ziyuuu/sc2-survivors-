/** Local Chromium structural/render smoke. No screenshot upload and no claim of human visual QA. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const models=[...await read('tools/three-race-models.json'),...await read('tools/three-race-elite-models.json')];
const report={at:new Date().toISOString(),humanVisual:false,checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:640,height:480}});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||/PropertyBinding.*(?:No target|not found|Can not|Cannot)/i.test(m.text()))report.errors.push(m.text());});
 await page.route('**/qa-models-empty',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><div id="model" style="width:640px;height:480px"></div></body></html>'}));
 await page.goto((process.env.SC2_QA_URL??'http://127.0.0.1:5173')+'/qa-models-empty');
 await page.evaluate(async()=>{const {createViewer}=await import('/src/ui/model-viewer.mjs');window.modelViewer=await createViewer(document.getElementById('model'));});
 for(const model of models){
  const result=await page.evaluate(async id=>{const v=window.modelViewer,r=await v.load('/assets/animated/'+id+'.glb');for(let i=0;i<r.animations.length;i++){v.play(i);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}return {id,meshes:r.meshes,skins:r.skins,animations:r.animations.length};},model.id);
  report.checks.push(result);console.log(`${result.id}: ${result.animations} animations exercised`);
 }
 await page.evaluate(()=>window.modelViewer.dispose());
 if(report.errors.length)throw Error('Browser model errors');
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await browser.close();await fs.writeFile('reports/local/qa-three-race-models.json',JSON.stringify(report,null,2));console.log(`Model smoke ${report.checks.length}/${models.length}; ${report.errors.length} errors. No human visual approval.`);}
