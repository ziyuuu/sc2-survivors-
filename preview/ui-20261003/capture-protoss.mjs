import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>console.error(e.message));
 await page.goto('http://127.0.0.1:4178/preview/ui-20261003/render-battle.html');
 await page.waitForFunction(()=>window.__BATTLE_ART_READY__||window.__BATTLE_ART_ERROR__,null,{timeout:120000});
 const result=await page.evaluate(()=>window.__BATTLE_ART_READY__||window.__BATTLE_ART_ERROR__);if(typeof result==='string')throw Error(result);
 await page.screenshot({path:fileURLToPath(new URL('art/battlefield-protoss.png',root))});
 const existing=JSON.parse(await fs.readFile(new URL('art/provenance.json',root),'utf8'));existing.protoss=result;existing.attempts=[{method:'Full-game Protoss preload after Zerg capture',outcome:'page.waitForFunction for readiness exceeded 240000ms; no acceptance claimed',fallback:'Direct static render using the existing campaign map and original unit/hero model resources'}];
 await fs.writeFile(new URL('art/provenance.json',root),JSON.stringify(existing,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
