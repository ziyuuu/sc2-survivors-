import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.argv[2],out=process.argv[3];await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const page=await browser.newPage({viewport:{width:1100,height:1700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>globalThis.__KTX_RESULT__||globalThis.__KTX_ERROR__,null,{timeout:120000});const result=await page.evaluate(()=>globalThis.__KTX_RESULT__??{error:globalThis.__KTX_ERROR__});assert(!result.error,result.error);assert.deepEqual(errors,[]);await fs.writeFile(out+'/ktx-result.json',JSON.stringify(result,null,2));if(!process.argv.includes('--metrics-only'))await page.screenshot({path:out+'/ktx-comparison.png',fullPage:true});console.log(JSON.stringify(result));}finally{await browser.close();}
