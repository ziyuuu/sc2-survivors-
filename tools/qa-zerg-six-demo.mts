import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {chromium,type Page} from '@playwright/test';
import {ZERG_SIX} from '../src/data/zerg-six';

const url=process.env.SC2_ZERG_DEMO_URL??'http://127.0.0.1:15302/preview/zerg-six-20261120/';
const viewport={width:1280,height:800};
const screenshotDir=process.env.SC2_ZERG_DEMO_QA_IMAGES;
const layoutOnly=process.env.SC2_ZERG_DEMO_LAYOUT_ONLY;
if(screenshotDir)await fs.mkdir(screenshotDir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport});
const failed=new Set<string>();
page.on('pageerror',e=>failed.add(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin))failed.add(r.status()+' '+r.url());});
const report=(p:Page)=>p.evaluate(()=>(window as any).__SC2_REPORT__?.());
const ready=async(p:Page)=>{
 await p.waitForFunction(()=>document.querySelector('.boot-error')||typeof (window as any).__SC2_ZERG_SIX_DEMO__==='function',null,{timeout:150000});
 assert.equal(await p.locator('.boot-error').count(),0,await p.locator('.boot-error').textContent({timeout:500}).catch(()=>''));
 await p.waitForFunction(()=>{
  const r=(window as any).__SC2_REPORT__?.();
  return ['ready','error'].includes(r?.readiness?.phase)||r?.phase==='battle'&&r?.assetsReady&&!r.readiness.kind;
 },null,{timeout:150000,polling:250});
 const r=await report(p);
 assert.ok(r.assetsReady&&r.readiness.phase!=='error',JSON.stringify(r.readiness));
 const continueButton=p.locator('[data-action=flow-continue]:enabled:visible');
 if(await continueButton.count())await continueButton.first().click();
};
const state=(p:Page)=>p.evaluate(()=>(window as any).__SC2_ZERG_SIX_DEMO__());
try{
 const cases=ZERG_SIX.filter(u=>!process.env.SC2_ZERG_DEMO_UNITS||process.env.SC2_ZERG_DEMO_UNITS.split(',').includes(u));
 assert.ok(cases.length);
 if(!layoutOnly)await page.goto(url+'?unit='+cases[0],{waitUntil:'commit',timeout:90000});
 for(const [i,unit] of (layoutOnly?[]:cases).entries()){  
  if(i>0){
   await Promise.all([page.waitForURL(u=>u.searchParams.get('unit')===unit),page.locator('#trial-unit').selectOption(unit)]);
  }
  await ready(page);
  console.log(unit+' stage ready');
  assert.equal(await page.locator('#trial-unit option').count(),6);
  assert.equal(await page.locator('#trial-unit').inputValue(),unit);
  const initial=await state(page);
  assert.ok(initial.entities.some(u=>u.type===unit&&u.owner==='terran'));
  if(!await page.locator('#trial-observe').evaluate(e=>(e as HTMLDetailsElement).open))await page.locator('#trial-observe summary').click();
  await page.waitForFunction(({start})=>{
   const s=(window as any).__SC2_ZERG_SIX_DEMO__();
   return s.time-start>=2.8&&s.shots>0&&s.damage>0;
  },{start:initial.time},{timeout:80000,polling:250});
  const during=await state(page),r=await report(page);
  const staleEnemyLabels=await page.evaluate(()=>{
   const d=window.__SC2_DEBUG__;
   return d?[...d.view['enemyLabels'].keys()].filter(id=>{
    const u=d.world.entities.get(id);
    return !u||u.hp<=0||!u.enemyTier;
   }):[];
  });
  assert.deepEqual(staleEnemyLabels,[],'labels belong to this scenario');
  const audio=Object.fromEntries(Object.entries(r.audio?.nativePlayed??{}).filter(([k])=>k.startsWith('sc2.zsix.')));
  console.log(JSON.stringify({unit,time:during.time,damage:during.damage,shots:during.shots,kills:during.kills,entities:during.entities.length,
   models:r.originalModelKeys??r.modelKeys,audio}));
  if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,unit+'.png'),timeout:40000});
  const before=await state(page);
  await page.locator('canvas#battle').click({position:{x:Math.round(viewport.width*.6),y:Math.round(viewport.height*.58)}});
  await page.keyboard.down('s');
  try{await page.waitForFunction(a=>{
   const b=(window as any).__SC2_ZERG_SIX_DEMO__().anchor;
   return Math.hypot(b.x-a.x,b.z-a.z)>.5;
  },before.anchor,{timeout:5000});}finally{await page.keyboard.up('s');}
 }
 await page.close();
 for(const [name,width,height] of [['landscape',844,390],['portrait',390,844]] as const){
  if(layoutOnly&&layoutOnly!==name)continue;
  const touch=await browser.newPage({viewport:{width,height},hasTouch:true});
  touch.on('pageerror',e=>failed.add(e.message));
  try{
   await touch.goto(url+'?unit=infestor',{waitUntil:'commit',timeout:90000});await ready(touch);
   const bounds=await touch.locator('#zerg-trial').boundingBox();
   assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0);
   if(name==='portrait'){
    const map=await touch.locator('#minimap-canvas').boundingBox();
    assert.ok(map&&bounds.x>=map.x+map.width-2);
   }
   await touch.locator('#trial-observe summary').tap();
   if(screenshotDir)await touch.screenshot({path:path.join(screenshotDir,name+'.png'),timeout:40000});
   console.log(name+' layout and touch selector passed');
  }finally{await touch.close();}
 }
 assert.deepEqual([...failed],[]);
}finally{await browser.close();}
