import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const results=[];
try{for(const mode of ['desktop','constrained-desktop']){const c=await b.newContext({viewport:{width:1280,height:800},deviceScaleFactor:mode==='desktop'?2:3});const p=await c.newPage();await p.addInitScript(mode=>{globalThis.__name=v=>v;if(mode==='constrained-desktop'){Object.defineProperty(navigator,'deviceMemory',{get:()=>2});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});}},mode);
 await p.goto('http://127.0.0.1:18883/quality-lab.html');await p.waitForFunction(()=>globalThis.__QUALITY_APP__,null,{timeout:180000});
 const data=await p.evaluate(()=>({graphics:__SC2_REPORT__().graphics,resolution:__SC2_REPORT__().resolution,probe:__QUALITY_APP__.deviceProbeReport,pointer:matchMedia('(pointer:coarse)').matches}));assert.equal(data.graphics.preset,'auto');if(mode==='constrained-desktop'){assert.equal(data.pointer,false);assert.equal(data.graphics.tier,'low');assert.equal(data.resolution.renderPixelRatio,.7);}
 await p.reload();await p.waitForFunction(()=>globalThis.__QUALITY_APP__,null,{timeout:180000});const cached=await p.evaluate(()=>__QUALITY_APP__.deviceProbeReport);assert.equal(cached.cached,true);results.push({mode,...data,cached});await c.close();}
 await fs.writeFile('reports/local/quality-20261028/device.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await b.close();}
