import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const out='reports/local/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={date:new Date().toISOString(),workingDirectory:process.cwd(),scope:'Resolution, material loading, settings and DOM checks; local screenshots only, no human visual approval.',runs:[],errors:[]};
const cases=[{width:1440,height:900,dpr:1.25},{width:1920,height:1080,dpr:2},{width:390,height:844,dpr:3,mobile:true},{width:844,height:390,dpr:3,mobile:true},{width:1920,height:1080,dpr:2,offline:true}];
try{for(const test of cases){
 const context=await browser.newContext({viewport:{width:test.width,height:test.height},deviceScaleFactor:test.dpr,isMobile:!!test.mobile,hasTouch:!!test.mobile});if(test.offline)await context.setOffline(true);
 const page=await context.newPage(),requests=[];page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{if(test.offline&&/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(test.offline?pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href:'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:60000});
 const defaults=await page.evaluate(()=>window.__SC2_REPORT__());assert.equal(defaults.resolution.quality,test.mobile?'balanced':'native');assert.equal(defaults.resolution.antialias,true);assert.equal(defaults.models,8);assert.equal(defaults.originalAnimationModels,8);
 const expected=test.mobile?1.5:test.dpr;assert.equal(defaults.resolution.width,Math.floor(test.width*expected));assert.equal(defaults.resolution.height,Math.floor(test.height*expected));
 const materials=test.offline?await page.evaluate(()=>['marine','hellion','tank','medivac','zergling','roach','baneling','ravager'].map(type=>{const data=atob(window.__SC2_EMBEDDED__['model.'+type].split(',')[1]),bytes=Uint8Array.from(data,c=>c.charCodeAt(0)),v=new DataView(bytes.buffer),g=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+v.getUint32(12,true))));return {type,normal:g.materials.some(m=>m.normalTexture),specular:g.materials.some(m=>m.extensions?.KHR_materials_specular?.specularColorTexture)};})):await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu].filter(([type])=>['marine','hellion','tank','medivac','zergling','roach','baneling','ravager'].includes(type)).map(([type,b])=>{const materials=b.meshes.flatMap(m=>Array.isArray(m.material)?m.material:[m.material]);return {type,normal:materials.some(m=>m.normalMap),specular:materials.some(m=>m.specularColorMap),anisotropy:Math.max(...materials.map(m=>m.map?.anisotropy??0))};}));
 assert.equal(materials.length,8);assert.ok(materials.every(m=>m.normal&&m.specular));
 await page.getByLabel('画质',{exact:true}).selectOption('performance');assert.ok((await page.evaluate(()=>window.__SC2_REPORT__().resolution.renderPixelRatio))<=1);
 await page.getByLabel('画质',{exact:true}).selectOption(test.mobile?'balanced':'native');
 await page.reload();await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:60000});assert.equal(await page.getByLabel('画质',{exact:true}).inputValue(),test.mobile?'balanced':'native');
 await page.locator('[data-action=start]').click();await page.waitForTimeout(250);
 const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,selection:String(getSelection()),scroll:[scrollX,scrollY],units:document.querySelectorAll('#roster .soldier:not(.empty)').length}));assert.equal(layout.units,1);assert.equal(layout.overflow,false);assert.equal(layout.selection,'');assert.deepEqual(layout.scroll,[0,0]);
 await page.screenshot({path:out+'/quality-'+(test.offline?'offline':test.width+'x'+test.height)+'-battle.png'});
 await page.getByRole('button',{name:'暂停',exact:true}).click();const paused=await page.evaluate(()=>window.__SC2_REPORT__().time);
 await page.getByLabel('画质',{exact:true}).selectOption('native');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().time),paused);
 await page.getByLabel('画质',{exact:true}).selectOption(test.mobile?'balanced':'native');
 assert.deepEqual(requests,[]);if(test.offline)assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
 report.runs.push({test,defaults:defaults.resolution,materials,settingsPersist:true,pauseFreezesSimulation:true,layout,networkRequests:requests.length});console.log(JSON.stringify(report.runs.at(-1)));await context.close();
 }assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);console.error(report.failure);process.exitCode=1;}finally{await fs.writeFile(out+'/QUALITY.json',JSON.stringify(report,null,2));await browser.close();}
