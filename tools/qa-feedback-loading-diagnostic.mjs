import {chromium} from '@playwright/test';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const p=await b.newPage();p.on('pageerror',e=>console.log('ERROR',e.message));await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=zerg]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await p.locator(s).click();
for(let i=0;i<3;i++){await p.waitForTimeout(5000);console.log(JSON.stringify(await p.evaluate(()=>({ready:window.__SC2_REPORT__().readiness,phase:window.__SC2_REPORT__().phase,errors:window.__SC2_DEBUG__?.view.modelErrors,text:document.body.innerText.slice(-1000)}))));}
await p.screenshot({path:'reports/local/feedback-loading-diagnostic.png'});await b.close();
