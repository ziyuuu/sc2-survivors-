import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const revision=process.env.SC2_BATCH_REVISION??'';
const run=process.argv[2]??'components-r1',root=path.resolve('reports/local/performance-s03-l01-f03-20261019',run);await fs.mkdir(root,{recursive:false});await fs.copyFile('tools/qa-performance-s03-l01-f03.mjs',root+'/runner.mjs');
const report={run,started:new Date().toISOString(),modes:{},errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
try{for(const mode of ['baseline','web']){
 const page=await browser.newPage({viewport:{width:800,height:600},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push({mode,message:e.message}));page.on('console',e=>{if(e.type()==='error')report.errors.push({mode,message:e.text()});});
 await page.goto('http://127.0.0.1:4436/performance-s03-l01-f03-20261019'+(mode==='baseline'?'-baseline':'')+revision+'/');await page.waitForFunction(()=>window.__BATCH__);
 const r=report.modes[mode]={build:JSON.parse(await fs.readFile('preview/performance-s03-l01-f03-20261019'+(mode==='baseline'?'-baseline':'')+revision+'/build-inputs.json')),device:await page.evaluate(()=>window.__BATCH__.device()),cache:await page.evaluate(()=>window.__BATCH__.cacheProbe()),maps:[],mines:await page.evaluate(()=>window.__BATCH__.mines()),effects:[]};
 for(const theme of ['char','mar-sara','ice','frontier','industrial'])r.maps.push(await page.evaluate(theme=>window.__BATCH__.mapCheck({version:3,seed:529,theme}),theme));
 for(const effect of ['empty','charge','empty','ray','empty','shield','growth','empty','charge','restore']){
  const data=await page.evaluate(async effect=>effect==='restore'?window.__BATCH__.restore():window.__BATCH__.effect(effect),effect);const pixels=Buffer.from(data.pixels.split(',')[1],'base64');delete data.pixels;data.pixelHash=hash(pixels);data.file=root+'/'+mode+'-'+r.effects.length+'-'+effect+'.png';await fs.writeFile(data.file,pixels);if(effect==='empty')data.sustained=await page.evaluate(()=>window.__BATCH__.emptyFrames());r.effects.push(data);
 }
 await page.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
}}finally{await browser.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({run,errors:report.errors,modes:Object.fromEntries(Object.entries(report.modes).map(([mode,r])=>[mode,{mines:r.mines.map(m=>({hit:m.hit,ticks:m.ticks,legal:m.legal})),maps:r.maps.map(m=>({theme:m.recipe.theme,reads:m.reads,ms:m.ms})),effects:r.effects.map(e=>({mode:e.mode,active:e.active,uploads:e.uploads.length,bytes:e.uploads.reduce((n,u)=>n+u.bytes,0),sustained:e.sustained?.uploads.length}))}]))}));
