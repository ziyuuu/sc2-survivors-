import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const root=path.resolve('reports/local/performance-a02-20261020/binding-1');
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={status:'running',rows:[],errors:[],scope:'Fresh browser loads bind the unchanged baseline/final files to actual root /main.js responses routed by HTTP Referer. Supplements final-1 missing response hash; does not relabel its failed terminal assertion or repeat its scenario matrix.'};
const hash=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const variant of ['baseline-r2','candidate-r2']){
  const folder='performance-a02-20261020-'+variant,context=await browser.newContext(),page=await context.newPage();
  const row={variant,url:'http://127.0.0.1:4439/'+folder+'/'},jobs=[];
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',response=>{if(new URL(response.url()).pathname==='/main.js')jobs.push(response.body().then(bytes=>Object.assign(row,{responseUrl:response.url(),referer:response.request().headers().referer,status:response.status(),bytes:bytes.length,sha256:hash(bytes)})));});
  await page.goto(row.url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.A02,null,{timeout:120000});await Promise.all(jobs);
  const build=JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json'));
  row.expectedSha256=build.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
  assert.equal(row.status,200);assert.equal(row.referer,row.url);assert.equal(row.sha256,row.expectedSha256);
  row.surface=await page.evaluate(()=>({a02:!!window.A02,b02:!!window.__B02__,worldTime:window.A02.world.time,phase:window.A02.world.phase}));
  report.rows.push(row);await context.close();
 }
 assert.equal(report.errors.length,0);report.status='pass';
}catch(error){report.status='failed';report.failure=String(error.stack??error);process.exitCode=1;}
finally{await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
