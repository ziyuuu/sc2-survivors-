import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const out='reports/local/armed-support-design-20261111',base=process.env.SC2_QA_URL??'http://127.0.0.1:5194';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const report={scope:'Verified source models; prototype inspection, not combat approval.',models:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:960,height:720}});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.route('**/armed-model-empty',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:#15242d"><div id="model" style="width:960px;height:720px"></div></body></html>'}));
 await page.goto(base+'/armed-model-empty');
 await page.evaluate(async()=>{const {createViewer}=await import('/src/ui/model-viewer.mjs');window.armedViewer=await createViewer(document.querySelector('#model'));});
 for(const [id,clip]of [['model.fort.bunker','Stand'],['model.fort.supply_depot','Stand'],['model.fort.command_center','Stand A'],['model.fort.command_center','Stand B'],['model.battlecruiser','Stand']]){
  const result=await page.evaluate(async({id,clip})=>{const {assetUrl}=await import('/src/assets/manifest.ts');const url=assetUrl(id);if(!url)throw Error('Unregistered '+id);const result=await window.armedViewer.load('/'+url.replace(/^\//,''));const at=result.animations.indexOf(clip);if(at<0)throw Error('Missing '+clip);window.armedViewer.play(at);return result;},{id,clip});
  await page.waitForTimeout(300);const screenshot=`${out}/${id}-${clip.replaceAll(' ','-')}.png`;await page.screenshot({path:screenshot});report.models.push({id,clip,screenshot,...result});
 }
 await page.evaluate(()=>window.armedViewer.dispose());
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await browser.close();await fs.writeFile(out+'/model-candidates.json',JSON.stringify(report,null,2));console.log(JSON.stringify({models:report.models.length,errors:report.errors,failure:report.failure}));}
