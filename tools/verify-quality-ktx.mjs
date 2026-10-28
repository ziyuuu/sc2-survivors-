import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const root='reports/local/quality-20261028';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
try{const page=await browser.newPage({viewport:{width:1150,height:1500}});await page.goto('http://127.0.0.1:18883/ktx-sample/');await page.waitForFunction(()=>globalThis.__KTX_RESULT__||globalThis.__KTX_ERROR__,null,{timeout:90000});const result=await page.evaluate(()=>globalThis.__KTX_RESULT__??{error:globalThis.__KTX_ERROR__});if(result.error)throw Error(result.error);await fs.writeFile(root+'/ktx-result.json',JSON.stringify(result,null,2));await page.screenshot({path:root+'/ktx-comparison.png',fullPage:true});console.log(JSON.stringify(result));}finally{await browser.close();}
