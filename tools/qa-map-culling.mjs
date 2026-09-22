import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.SC2_CULL_OUT??'reports/local/qa-v14-culling';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Local frozen-frame numeric reference: exact same camera, original map and native DPR1. Compare view-culling with every opened original placement drawn. Screenshots stay local; this is culling regression, not original-client visual approval.',cases:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:180000});await p.getByLabel('画质',{exact:true}).selectOption('native');await p.getByRole('button',{name:/部署小队/}).click();
 await p.addStyleTag({content:'body > :not(#battle) {visibility:hidden!important}'});
 const points=await p.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.paused=true;w.entities.clear();w.economicTargets.clear();w.buildings.clear();w.pods=[];w.effects=[];w.pickups=[];w.rewardDrops=[];w.visualEvents=[];w.hive=null;w.cancelOrder();v.corpses.clear();v.anchor.visible=false;const d=w.terrain.definition;return [{x:0,z:0,stage:1,name:'origin'},...d.ramps.map((r,i)=>{const a=r.mid.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g).map(Number);return {x:a[4]-d.origin[0],z:d.origin[1]-a[5],stage:12,name:'ramp-'+(i+1)};})];});
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  await p.setViewportSize({width,height});
  for(const point of points){
   const name=`${width}x${height}-${point.name}`;
   const culled=await p.evaluate(point=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.stage=point.stage;w.terrain.setStage(point.stage);w.anchor={x:point.x,z:point.z,facing:0};v.cameraTarget.set(point.x,w.terrain.height(point),point.z);v.terrainUpdate=()=>v.mapView.update(v.camera);v.render(0,1);return v.report();},point);
   await p.waitForTimeout(100);await p.locator('#battle').screenshot({path:out+'/'+name+'-culled.png'});
   const reference=await p.evaluate(()=>{const v=window.__SC2_DEBUG__.view;v.terrainUpdate=()=>v.mapView.update();v.render(0,1);return v.report();});
   await p.waitForTimeout(100);await p.locator('#battle').screenshot({path:out+'/'+name+'-all.png'});
   assert.ok(culled.map.visibleInstances<=reference.map.visibleInstances);
   report.cases.push({name,width,height,point,culled:culled.map,reference:reference.map,drawCalls:[culled.drawCalls,reference.drawCalls],resolution:culled.resolution});
  }console.log('Culling capture',width,height,'complete');
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}finally{await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));await browser.close();}
