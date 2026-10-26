import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';

const stage=process.argv[2]??'after',root=path.resolve('.cache/t01-set-layout-20261025/'+stage),profile=root+'/profile';
await fs.mkdir(profile,{recursive:true});
const data=JSON.parse(await fs.readFile('tools/t01/prototype.generated.json','utf8')),server=await serveT01();
const assets=JSON.parse(await fs.readFile(server.build.out+'/asset-manifest.json','utf8')).assets;
const report={checks:[],screens:[],errors:[]};let browser,child;
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];page.on('pageerror',e=>report.errors.push(e.message));
 for(const race of ['terran','zerg','protoss'])for(const [device,size]of Object.entries({desktop:{width:1440,height:900},landscape:{width:844,height:390},portrait:{width:390,height:844}})){
  const t=data.templates.find(t=>t.id===`ui:starship:warehouse:quality-5:${race}`);assert.ok(t);
  const body=t.html.replace(/t01-asset:([\w.:-]+)/g,(_,id)=>server.url+'/'+assets[id].url.replace(/^\//,''));
  await page.setViewportSize(size);await page.setContent('<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+data.css+'</style><body>'+body+'</body></html>');
  await page.evaluate(t=>{document.body.className=t.bodyClass;Object.assign(document.body.dataset,t.bodyData);},t);
  await page.evaluate(()=>{const e=document.querySelector('.equipment-set')??document.querySelector('.equipment-brief');e.scrollIntoView({block:'start'});});
  const s=await page.locator('.equipment-inspector').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,text:e.innerText,groups:e.querySelectorAll('.set-bonus-step').length}));
  assert.ok(s.scrollWidth<=s.width+1,'Inspector horizontal overflow');if(stage!=='before'){assert.ok(s.groups>=3);assert.ok(s.text.includes('件套'));assert.ok(s.text.includes('未激活'));}
  const file=root+'/'+race+'-'+device+'.png';await page.screenshot({path:file});report.screens.push(file);report.checks.push({race,device,...s});
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({stage,pass:report.pass,checks:report.checks.length,failure:report.failure}));}
