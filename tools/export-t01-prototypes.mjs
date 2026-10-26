// Build-time extraction of current UI markup. The delivered prototype uses only
// these display templates and a local navigation router, never the game session.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const refreshStarship=process.argv.includes('--refresh-starship');
const refreshEquipment=process.argv.includes('--refresh-equipment');
const root=path.resolve(refreshEquipment?'.cache/t01-set-layout-20261025/prototype-export':refreshStarship?'.cache/t01-equipment-ui-20261025/prototype-export':'.cache/t01-gallery-20261025/prototype-export');await fs.mkdir(root,{recursive:true});
execFileSync(process.execPath,['tools/build-t01.mjs','--legacy'],{stdio:'inherit'});
const server=await serveT01(),profile=root+'/profile',resultPath=root+'/templates.json';let browser,child,timer;
const manifest=JSON.parse(await fs.readFile(server.build.out+'/asset-manifest.json','utf8')).assets;
let templates=[];try{templates=JSON.parse(await fs.readFile(resultPath,'utf8'));}catch{if(refreshStarship||refreshEquipment)templates=JSON.parse(await fs.readFile('tools/t01/prototype.generated.json','utf8')).templates.filter(c=>refreshEquipment?!['starship','ship-operation','backpack','settlement'].includes(c.action):c.action!=='starship');}
const report={total:0,completed:templates.length,failures:[],errors:[]};
try{
 await fs.mkdir(profile,{recursive:true});child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1440,height:900});const focus=await browser.contexts()[0].newCDPSession(page);await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(server.url+'/combined.html');await page.bringToFront();await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
 const cases=await page.evaluate(()=>T01.catalogue.static);report.total=cases.length;templates=templates.filter(t=>cases.some(c=>c.id===t.id));
 timer=setInterval(()=>console.log(JSON.stringify({done:templates.length,total:cases.length,current:report.current,failures:report.failures.length})),25000);
 for(const c of cases){if(templates.some(t=>t.id===c.id))continue;report.current=c.id;
  try{
   await page.evaluate(id=>T01.load(id),c.id);
   await page.evaluate(async()=>{const images=[...document.images],loading=images.map(i=>i.loading);images.forEach(i=>i.loading='eager');try{await Promise.all(images.map(i=>i.decode().catch(()=>{})));}finally{images.forEach((i,n)=>i.loading=loading[n]);}});
   const data=await page.evaluate(async({manifest})=>{
    const replacements=new Map(Object.entries(window.__T01_PROTOTYPE_URLS__??{})),byPath=new Map(Object.entries(manifest).map(([id,a])=>[new URL(a.url,location.href).pathname,id])),byHash=new Map(Object.entries(manifest).map(([id,a])=>[a.sha256,id]));
    for(const[id,url]of Object.entries(window.__SC2_EMBEDDED__??{}))replacements.set(url,'t01-asset:'+id);
    const resolve=url=>{if(replacements.has(url))return replacements.get(url);try{const id=byPath.get(new URL(url,location.href).pathname);if(id)return 't01-asset:'+id;}catch{}return url;};
    const clone=document.body.cloneNode(true);clone.querySelectorAll('script,canvas,#t01-tool,#opening,.sc2-opening,.sc2-loading').forEach(e=>e.remove());
    clone.querySelectorAll('[inert]').forEach(e=>e.removeAttribute('inert'));
    for(const e of clone.querySelectorAll('*'))for(const a of [...e.attributes])if(/^on/i.test(a.name))e.removeAttribute(a.name);
    // Serialize property-based form state, not merely the initial attributes.
    const actual=[...document.querySelectorAll('input,select,textarea')].filter(e=>!e.closest('#t01-tool'));
    const copied=[...clone.querySelectorAll('input,select,textarea')];
    copied.forEach((e,i)=>{const a=actual[i];if(!a)return;if(e.tagName==='INPUT'){e.setAttribute('value',a.value);e.toggleAttribute('checked',a.checked);}else if(e.tagName==='TEXTAREA')e.textContent=a.value;else [...e.options].forEach(o=>o.toggleAttribute('selected',o.value===a.value));});
    for(const e of clone.querySelectorAll('[src],[href]'))for(const name of ['src','href'])if(e.hasAttribute(name)){const raw=e.getAttribute(name),url=resolve(raw);if(url!==raw)e.setAttribute(name,url);}
    let html=clone.innerHTML;
    for(const [url,value]of replacements)html=html.replaceAll(url,value);
    for(const [id,a]of Object.entries(manifest))for(const url of [new URL(a.url,location.href).href,a.url])html=html.replaceAll(url,'t01-asset:'+id);
    // Native map previews are display data. No WebGL canvas or game code enters
    // the prototype; transient preview blobs become bounded data URLs.
    for(const url of [...new Set(html.match(/blob:[^"'\s)<>]+/g)??[])]){
     const blob=await(await fetch(url.replaceAll('&amp;','&'))).blob(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join(''),id=byHash.get(hash);
     const value=id?'t01-asset:'+id:await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob);});html=html.replaceAll(url,value);(window.__T01_PROTOTYPE_URLS__??={})[url]=value;
    }
    const assets=[...new Set([...html.matchAll(/t01-asset:([\w.:-]+)/g)].map(m=>m[1]))];
    return {html,bodyClass:document.body.className,bodyData:{...document.body.dataset},assets};
   },{manifest});
   assert.ok(data.html.length>500,c.id);assert.ok(!data.html.includes('blob:'),'Unresolved transient blob '+c.id);templates.push({...c,...data});report.completed=templates.length;
   await fs.writeFile(resultPath,JSON.stringify(templates));
  }catch(e){report.failures.push({id:c.id,error:String(e)});await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));}
 }
 assert.equal(templates.length,cases.length,JSON.stringify(report.failures));
 templates=cases.map(c=>templates.find(t=>t.id===c.id));
 const css=await fs.readFile(server.build.out+'/combined.css','utf8');
 await fs.writeFile('tools/t01/prototype.generated.json',JSON.stringify({version:1,scope:'Current UI display templates. Local prototype navigation only; no game session, purchases, combat, or persistence in the prototype frame.',css,templates}));
 report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,done:templates.length,failed:report.failures.length,failure:report.failure}));}
