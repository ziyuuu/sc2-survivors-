import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage(),events=[];
page.on('pageerror',e=>events.push(String(e)));page.on('console',e=>{if(e.type()==='error')events.push(e.text());});
page.on('requestfailed',r=>events.push({url:r.url(),error:r.failure()}));
try{await page.goto('http://127.0.0.1:12192/');await page.waitForTimeout(10000);const result={events,body:await page.locator('body').innerText(),report:await page.evaluate(()=>window.__SC2_REPORT__?.())};await fs.writeFile('reports/local/p6-20261006/boot-probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await browser.close();}
