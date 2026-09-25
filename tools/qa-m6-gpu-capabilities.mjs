import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';

const out='reports/local/qa-m6-gpu-capabilities';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={at:new Date().toISOString(),browser:browser.version(),hostCPU:os.cpus()[0]?.model,hostLogicalCores:os.cpus().length};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/',{timeout:120000});
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:120000});
 report.webgl=await page.evaluate(()=>{
  const canvas=document.querySelector('canvas');
  const gl=canvas?.getContext('webgl2')??canvas?.getContext('webgl');
  if(!gl)return null;
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {version:gl.getParameter(gl.VERSION),vendor:gl.getParameter(gl.VENDOR),
   renderer:gl.getParameter(gl.RENDERER),
   unmaskedVendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,
   unmaskedRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,
   maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),
   maxVertexAttribs:gl.getParameter(gl.MAX_VERTEX_ATTRIBS)};
 });
 await page.close();
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
