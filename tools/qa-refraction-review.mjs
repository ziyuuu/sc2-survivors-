import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root='reports/local/refraction-science-20261013',label=process.argv[2]??'gallery-qa-r1';assert.match(label,/^gallery-qa-r\d+$/);const out=root+'/'+label;
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),report={selections:[],screens:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
async function decoded(){await page.locator('#left').evaluate(async e=>{await e.decode();if(!e.naturalWidth)throw Error('Left image empty');});await page.locator('#right').evaluate(async e=>{await e.decode();if(!e.naturalWidth)throw Error('Right image empty');});}
try{
 await page.goto('http://127.0.0.1:4392/gallery/');await page.locator('#record option').first().waitFor({state:'attached'});
 for(const category of ['native','isolated']){
  await page.locator('#'+category).click();
  const groups=await page.locator('#group option').evaluateAll(es=>es.map(e=>e.value));
  for(const group of groups){await page.locator('#group').selectOption(group);await decoded();const first=await page.locator('#left').getAttribute('src');await page.locator('#next').click();await decoded();await page.locator('#prev').click();await decoded();assert.equal(await page.locator('#left').getAttribute('src'),first);report.selections.push({category,group,options:await page.locator('#record option').count()});}
 }
 await page.locator('#native').click();await page.locator('#group').selectOption('science_vessel.1');await decoded();
 for(const viewport of [{width:1440,height:1000},{width:390,height:892}]){await page.setViewportSize(viewport);await decoded();const size=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert.ok(size.width<=size.viewport,JSON.stringify(size));const file='layout-'+viewport.width+'.png';await page.screenshot({path:out+'/'+file,fullPage:true});report.screens.push({file,viewport,...size});}
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
