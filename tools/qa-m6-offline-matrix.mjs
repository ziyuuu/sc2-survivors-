import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='reports/local/qa-m6-offline-matrix';
await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),artifact:path.resolve('dist/SC2-Survivors-Demo.html'),cases:[],errors:[]};
const cases=[
 {race:'terran',difficulty:'normal',raceName:'人族',difficultyName:'普通'},
 {race:'zerg',difficulty:'hard',raceName:'虫族',difficultyName:'困难'},
 {race:'protoss',difficulty:'hell',raceName:'神族',difficultyName:'地狱'},
];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const config of cases){
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  await context.setOffline(true);
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  try{
   await page.goto(pathToFileURL(report.artifact).href,{timeout:240000});
   await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
   await page.locator('[data-action=menu-new]').click();
   await page.locator('[data-action=menu-race][data-race='+config.race+']').click();
   await page.locator('[data-action=menu-race-next]').click();
   await page.locator('[data-action=menu-difficulty][data-difficulty='+config.difficulty+']').click();
   await page.locator('[data-action=menu-difficulty-next]').click();
   await page.locator('[data-action=menu-start]').click();
   await page.waitForFunction(()=>window.__SC2_REPORT__?.()?.readiness?.phase==='ready',null,{timeout:240000});
   await page.locator('[data-action=flow-continue]').click();
   await page.waitForFunction(()=>window.__SC2_REPORT__?.()?.phase==='battle',null,{timeout:30000});
   let state=await page.evaluate(()=>window.__SC2_REPORT__());
   assert.equal(state.expedition.race,config.race);
   assert.equal(state.errors.length,0);
   assert.match(await page.locator('#mission').innerText(),new RegExp(config.difficultyName));
   await page.locator('#topbar [data-action=pause]').click();
   await page.locator('[data-action=save-now]').click();
   await page.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'),null,{timeout:30000});
   const before=await page.evaluate(()=>window.__SC2_REPORT__().time);
   await page.reload({timeout:240000});
   await page.waitForFunction(()=>window.__SC2_REPORT__?.()?.phase==='menu',null,{timeout:240000});
   await page.locator('[data-action=menu-load]').click();
   await page.locator('[data-action=menu-load-local]').click();
   assert.match(await page.locator('.m3-summary').innerText(),new RegExp(config.raceName+'／'+config.difficultyName));
   await page.locator('[data-action=menu-load-ready]').click();
   await page.waitForFunction(()=>window.__SC2_REPORT__?.()?.readiness?.phase==='ready',null,{timeout:240000});
   await page.locator('[data-action=flow-continue]').click();
   await page.waitForFunction(()=>window.__SC2_REPORT__?.()?.phase==='battle',null,{timeout:30000});
   state=await page.evaluate(()=>window.__SC2_REPORT__());
   assert.equal(state.expedition.race,config.race);
   assert.equal(state.time,before);
   assert.equal(state.errors.length,0);
   assert.match(await page.locator('#mission').innerText(),new RegExp(config.difficultyName));
   report.cases.push({race:config.race,difficulty:config.difficulty,passed:true,assets:state.models,errors});
   if(errors.length)throw Error(errors.join(' | '));
  }finally{await context.close();}
 }
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
 await browser.close();
 console.log(JSON.stringify({cases:report.cases,errors:report.errors,failure:report.failure??null}));
}
