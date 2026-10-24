import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {setup,snapshot,labels} from './performance-r02-cases.mjs';
const root='reports/local/performance-r02-20261020',a=await import('../'+root+'/baseline-logic/main.mjs'),b=await import('../'+root+'/candidate-logic/main.mjs'),report={checks:0,pickup:[],steps:[],labels:[],boundaries:[]};
const equal=(old,now,name)=>{assert.deepEqual(now,old,name);report.checks++;},state=c=>snapshot(c.lib,c.w);
try{
 for(const n of [0,1,18,96])for(const pack of [0,63,64])for(const near of [false,true]){
  const opts={n,pack,near,warehouse:120},x=setup(a,opts),y=setup(b,opts);
  assert.equal(b.equipmentGroundDrops(y.w).length,n);equal(snapshot(a,x.w),snapshot(b,y.w),'initial');
  for(let i=0;i<3;i++){x.call();y.call();equal(snapshot(a,x.w),snapshot(b,y.w),'pickup');}
  if(pack===64){for(const [lib,c]of [[a,x],[b,y]]){const id=lib.itemsAt(c.w.starship.account,'backpack')[0].id;assert.ok(lib.discardEquipment(c.w.starship.account,id).ok);c.call();}equal(snapshot(a,x.w),snapshot(b,y.w),'space freed');}
  assert.equal(b.itemsAt(y.w.starship.account,'backpack').length,pack===64?(near&&n>0?64:63):near?Math.min(64,pack+n):pack);report.pickup.push({...opts,exact:true,remaining:b.itemsAt(y.w.starship.account,'ground').length,backpack:b.itemsAt(y.w.starship.account,'backpack').length});
 }
 for(const gear of [false,'radius',true])for(const talent of [0,2])for(const wall of [false,true]){
  const opts={n:18,near:true,resource:181,gear,talent,wall},x=setup(a,opts),y=setup(b,opts);
  for(let i=0;i<180;i++){x.step();y.step();if(i%15===14)equal(snapshot(a,x.w),snapshot(b,y.w),'resource step '+i);}
  assert.equal(y.w.tick,180);report.steps.push({...opts,exact:true,wallet:y.w.wallet,gearRng:y.w.starship.account.rng,remaining:y.w.pickups.length});
 }
 for(let seed=1;seed<=100;seed++)for(const n of [0,18,96,1000])for(const width of [390,1440]){
  const input=labels(n,seed,width,900),occluded=[{left:0,top:0,right:width,bottom:95},{left:width-180,top:600,right:width,bottom:900}],old=a.layoutEquipmentLabels(input,width,900,occluded),now=b.layoutEquipmentLabels(input,width,900,occluded);
  equal(old,now,'label '+seed+'/'+n+'/'+width);
 }report.labels.push({seeds:100,counts:[0,18,96,1000],widths:[390,1440],exact:true});
 // Both labels are equally far from a suppressed name; stable sort formerly chose the first.
 for(const dx of [0,1e-10,-1e-10]){const input=[{id:'a',x:200,y:200,width:145,quality:5,distance:1,name:'A'},{id:'b',x:400,y:200,width:145,quality:5,distance:2,name:'B'},{id:'c',x:300+dx,y:290,width:145,quality:1,distance:3,name:'C'}],occluded=[{left:0,top:230,right:900,bottom:400}];equal(a.layoutEquipmentLabels(input,900,700,occluded),b.layoutEquipmentLabels(input,900,700,occluded),'stable tie');}
 for(const name of ['boundary','wall','paused','decision','old-map','ended','ui-pause']){
  const pair=[a,b].map(lib=>{const c=setup(lib,{n:1});c.lib=lib;const w=c.w,id=lib.itemsAt(w.starship.account,'ground')[0].id,loc=w.starship.account.locations[id];loc.x=2.5;loc.z=0;
   if(name==='boundary')loc.x+=1e-12;if(name==='wall')w.obstacles=[{x:1.25,z:0,w:.001,h:5}];if(name==='paused'||name==='ui-pause')w.paused=true;if(name==='decision')w.acquireInterfacePause();if(name==='old-map')w.terrain=new lib.FlatTerrain();if(name==='ended')w.starship.account.run.ended=true;c.id=id;return c;});
  const results=pair.map(c=>name==='ui-pause'?c.lib.collectWorldEquipment(c.w,c.id):c.call());equal(results[0],results[1],name+' returns');
  // Runtime terrain references are independently constructed; compare only observed map identity eligibility.
  for(const c of pair){c.w.terrain=undefined;for(const m of c.w.starship.loot.ground.values())m.terrain=undefined;}
  equal(state(pair[0]),state(pair[1]),name+' state');report.boundaries.push({name,exact:true});
 }
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(root+'/equivalence.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks,failure:report.failure}));}
