/** Real purchases, combined native effects and rendering without presentation mutating combat. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {writeArchive} from '../src/persistence/archive';
import {TERRAN_PATHS,terranShelf} from './qa-terran-budget.mts';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import type {BuildBranch,BuildCardId} from '../src/simulation/progression/build-progress';

const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-rules-dps-20261119',base=process.env.SC2_QA_URL??'http://127.0.0.1:15319';await fs.mkdir(out,{recursive:true});
function fixture(branch:BuildBranch,points:number,mixed=false){
 const w=new World({race:'terran',seed:171145,waves:false,terrain:new FlatTerrain(),obstacles:[]});assert.ok(w.start());w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 w.expedition.familySlots=['marine','reaper','marauder','tank','viking'];
 for(const [i,type] of w.expedition.familySlots.entries())w.addUnit(type,'terran',(i-2)*1.6,0,3);
 if(points===12){w.acquireHero('raynor');const h=w.heroEntity('raynor')!;h.x=0;h.z=-2;}
 w.wallet={minerals:100000,gas:100000};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;
 const cards:BuildCardId[]=[];
 const buy=(id:BuildCardId)=>{const r=terranShelf(w,id),old=w.random;w.random=()=>0;try{assert.ok(w.purchaseShopOffer(w.draftWindowKey,r.offerId),id);cards.push(id);const node=pendingBuildChoice(w);if(node){assert.ok(w.claimBuildChoice(node.id,w.expedition.shopRevision,node.offers[0]));cards.push(node.offers[0]);}}finally{w.random=old;}};
 for(const id of TERRAN_PATHS[branch].slice(0,points))buy(id);
 if(mixed){
  if(branch==='doomsday')buy('M-P03');
  const side:Record<BuildBranch,BuildCardId[]>={armed:['W01','G01','G04'],doomsday:['M-G02','M-B01','M-B04'],bio:['BIO-W01','BIO-W02','BIO-B02','BIO-B04']};
  for(const b of ['armed','doomsday','bio'] as BuildBranch[])if(b!==branch)for(const id of side[b])buy(id);
 }
 w.phase='battle';w.paused=true;w.time=w.stageElapsed=w.tick=0;w.anchor={x:0,z:0,facing:0};
 for(const u of w.allies()){u.hp=u.maxHp*.7;u.weaponCooldown=0;u.lastShotAt=-100;u.attackTarget=u.pendingTarget=null;}
 for(let i=0;i<6;i++){const e=w.addUnit(i<4?'roach':'mutalisk','zerg',(i%3-1)*2,4+Math.floor(i/3)*2);e.hp=e.maxHp=50000;e.armor=3;e.moveSpeed=0;e.weaponDamage=8;e.attackPeriod=2;}
 w.hash.rebuild(w.entities.values());return {branch,points,mixed,cards,archive:writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})};
}
const report:any={scope:'Twelve cumulative purchase paths (3/6/9/12) and three legal main/side combinations; actual free nodes, 15 seconds of native combat, rendered every three simulation steps; presentation-only rerender comparison and scene retirement.',scenes:[],errors:[]};
if(process.env.SC2_STACK_RESUME)report.scenes=JSON.parse(await fs.readFile(out+'/stacking.json','utf8')).scenes;
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:1440,height:900}});
await page.addInitScript({content:'globalThis.__name = value => value;'});
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});page.on('console',m=>{if(m.type()==='error'&&/Shader Error|GL_INVALID_OPERATION/.test(m.text()))report.errors.push(m.text());});
try{
 await page.goto(base+'/preview/doomsday-showcase-20261117/?card=M-W01&variant=0',{timeout:180000});await page.waitForFunction(()=>(window as any).doomsdayShowcase?.report().ready,null,{timeout:300000});
 for(const branch of ['armed','doomsday','bio'] as BuildBranch[])for(const points of [3,6,9,12,13]){
  const mixed=points===13,setup=fixture(branch,mixed?12:points,mixed),key=branch+'-'+(mixed?'mixed':points);console.log(key+' loading');
  if(process.env.SC2_STACK_CASE&&!new RegExp(process.env.SC2_STACK_CASE).test(key))continue;
  if(report.scenes.some((scene:any)=>scene.key===key))continue;
  const result=await page.evaluate(async setup=>{
   const q=(window as any).doomsdayShowcase,w=q.world,v=q.view;
   const {readArchive}=await import('/src/persistence/archive.ts'),{bioSurface}=await import('/src/render/materials/bio-armor.ts'),{doomsdayRefitStyle}=await import('/src/simulation/combat/doomsday-presentation.ts');
   const snapshot=readArchive(setup.archive).bundle.run!;w.restoreRun(snapshot);w.paused=true;v.resetRun();q.audio.resumeAt(w);await v.prepareSnapshotAssets(snapshot);await v.prepareCurrentAssets();await v.warmPresentationBatches();v.initialAssetsLoaded=true;
   const counts:Record<string,number>={},renderMax:Record<string,number>={};let serial=0,overlapFrames=0,styleUnion=0;
   w.paused=false;
   for(let i=0;i<900;i++){
    w.step();
    for(const e of w.visualEvents)if(e.serial>serial){const name=e.bioResponse??e.bioEffect??e.doomsdayEffect??e.supportVisual??e.kind;counts[name]=(counts[name]??0)+1;serial=Math.max(serial,e.serial);styleUnion|=e.doomsdayStyle??0;}
    if(i%3===0){
     v.render(1/60,1);const r=v.report(),bio=r.nonHeroes.bio;
     for(const [k,n] of Object.entries(bio))if(typeof n==='number')renderMax[k]=Math.max(renderMax[k]??0,n);
     for(const [k,n] of Object.entries(bio.organs))if(typeof n==='number')renderMax['organ:'+k]=Math.max(renderMax['organ:'+k]??0,n);
     // W02 venom lives in NonHeroEffects.drawVenom, outside BioBattleEffects.report.
     const venom=[...w.entities.values()].filter((u:any)=>u.hp>0&&!u.heldBy&&u.bio?.poisons?.some((p:any)=>p.kind==='venom'&&p.end>w.time)).length;
     if(venom&&r.nonHeroes.statuses>0)renderMax.venom=Math.max(renderMax.venom??0,Math.min(venom,r.nonHeroes.statuses));
     renderMax.doomsday=Math.max(renderMax.doomsday??0,r.doomsday.objects);renderMax.armedForts=Math.max(renderMax.armedForts??0,r.armedForts.length);
     if(r.doomsday.objects>0&&(venom&&r.nonHeroes.statuses>0||Object.values(bio).some(n=>typeof n==='number'&&n>0)))overlapFrames++;
    }
   }
   w.paused=true;const before=JSON.stringify(w.captureRun());for(let i=0;i<30;i++)v.render(1/60,1);const stable=before===JSON.stringify(w.captureRun());
   return {counts,renderMax,overlapFrames,styleUnion,stable,phase:w.phase,time:w.time,render:v.report(),materials:w.allies().map((u:any)=>({id:u.id,type:u.unitType,bio:bioSurface(w,u),refit:doomsdayRefitStyle(w,u)})),build:w.expedition.build};
  },setup);
  report.lastScene={key,cards:setup.cards,...result};
  assert.equal(result.stable,true,key+' rendering changed native state');assert.equal(result.phase,'battle');assert.equal(result.time,15);assert.deepEqual(result.render.errors,[]);assert.ok((result.counts.attack??0)>0);
  if(branch==='bio'||mixed)assert.ok(Object.keys(result.renderMax).some(k=>!['doomsday','armedForts'].includes(k)&&result.renderMax[k]>0),key+' bio effects missing');
  if(branch==='doomsday'&&points>=9||mixed)assert.ok(result.renderMax.doomsday>0,key+' mechanical effects missing');
  if(branch==='doomsday'&&mixed)assert.ok(result.materials.some((u:any)=>u.bio!==undefined&&u.refit?.[0]===1&&u.refit?.[1]===1),'nano, phase and biological surface must coexist');
  assert.equal(result.build.main,branch);
  await page.evaluate(({branch,mixed,points,cards})=>{
   // The host page is a single-card replay. Its original M-W01 caption does not
   // describe these restored multi-card fixtures; show the actual setup instead.
   let style=document.querySelector<HTMLStyleElement>('#qa-stacking-style');
   if(!style){style=document.createElement('style');style.id='qa-stacking-style';style.textContent='#showcase{visibility:hidden}#qa-stacking-label{position:fixed;left:12px;right:12px;top:12px;z-index:100;background:#0b1e2b;border:1px solid #49718a;color:#e5f5ff;padding:12px;font:15px/1.6 system-ui;white-space:pre-wrap;pointer-events:none}';document.head.append(style);}
   let label=document.querySelector<HTMLElement>('#qa-stacking-label');if(!label){label=document.createElement('aside');label.id='qa-stacking-label';document.body.append(label);}
   const names={armed:'武装支援',doomsday:'末日兵器',bio:'生化协同'},belongs=(id:string)=>id.startsWith('BIO-')?'bio':id.startsWith('M-')?'doomsday':'armed';
   label.textContent=`${names[branch as keyof typeof names]}主分支 · ${mixed?'混买叠加测试':points+'次购买累计测试'} · 15秒\n`+(mixed?'紫卡与紫橙节点仅属于主分支；副分支只购买白／绿／蓝普通牌。\n':'')+Object.entries(names).map(([b,name])=>`${name}：${cards.filter((id:string)=>belongs(id)===b).join('、')||'未购牌'}`).join('　|　');
  },setup);
  await page.screenshot({path:out+'/stack-'+key+'.png'});report.scenes.push({key,cards:setup.cards,...result});delete report.lastScene;console.log(key+' passed');
 }
 await page.evaluate(()=>{const q=(window as any).doomsdayShowcase;q.world.expedition.bio=undefined;q.world.expedition.doomsday=undefined;q.world.expedition.support.armed=undefined;q.world.entities.clear();q.world.visualEvents=[];q.view.resetRun();q.view.render(1/60,1);});
 report.retired=await page.evaluate(()=>{const r=(window as any).doomsdayShowcase.view.report();return {doomsday:r.doomsday,bio:r.nonHeroes.bio};});assert.equal(report.retired.doomsday.objects,0);assert.ok(Object.values(report.retired.bio.organs).every(n=>n===0));assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String((e as Error).stack??e);console.error(report.failure);process.exitCode=1;await page.screenshot({path:out+'/stack-failure.png'}).catch(()=>{});}finally{await browser.close();await fs.writeFile(out+'/stacking.json',JSON.stringify(report,null,2));console.log(JSON.stringify({scenes:report.scenes.length,errors:report.errors,failure:report.failure}));}
