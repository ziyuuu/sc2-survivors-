import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
await fs.mkdir('reports/local/qa',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run']});
for(const [name,url] of [['development','http://127.0.0.1:5173/'],['offline',pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href]]){
 const context=await browser.newContext({viewport:{width:1440,height:900}});if(name==='offline')await context.setOffline(true);const page=await context.newPage();const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>requests.push({url:r.url().slice(0,140),failure:r.failure()}));
 await page.goto(url);await page.waitForFunction(()=>typeof window.__SC2_REPORT__==='function'&&window.__SC2_REPORT__().assetsReady,{timeout:60000});
 await page.screenshot({path:`reports/local/qa/${name}-title.png`});await page.getByRole('button',{name:/部署小队/}).click();await page.waitForTimeout(1500);
 await page.screenshot({path:`reports/local/qa/${name}-battle.png`});console.log(name,JSON.stringify(await page.evaluate(()=>window.__SC2_REPORT__())),JSON.stringify({errors,requests}));
 await fs.writeFile(`reports/local/qa/${name}-smoke.json`,JSON.stringify({report:await page.evaluate(()=>window.__SC2_REPORT__()),errors,requests},null,2));await context.close();
}await browser.close();
