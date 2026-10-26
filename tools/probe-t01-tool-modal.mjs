import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu']});
const page=await browser.newPage({viewport:{width:1000,height:700}}),rows=[];
try{
 for(const mode of ['body','body-popover','dialog-popover']){
  await page.setContent('<style>dialog{width:350px;overflow:auto}#tool{position:fixed;inset:10px 10px auto auto;margin:0;padding:10px}button{padding:10px}</style><dialog id="modal"><button id="native">Native action</button></dialog><aside id="tool"><button id="control">Tool action</button></aside>');
  await page.evaluate(mode=>{const m=document.querySelector('#modal'),t=document.querySelector('#tool');window.clicked=false;document.querySelector('#control').onclick=()=>window.clicked=true;m.showModal();if(mode==='dialog-popover')m.append(t);if(mode!=='body'){t.popover='manual';t.showPopover();}},mode);
  let error;try{await page.locator('#control').click({timeout:1500});}catch(e){error=String(e).slice(0,180);}
  rows.push({mode,clicked:await page.evaluate(()=>window.clicked),error});
 }
 await fs.writeFile('reports/local/t01-20261024/tool-modal-probe.json',JSON.stringify({scope:'Minimal DOM interaction experiment; not native game/GPU acceptance.',rows},null,2));console.log(JSON.stringify(rows));
}finally{await browser.close();}
