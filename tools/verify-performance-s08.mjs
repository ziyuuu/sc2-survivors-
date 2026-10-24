import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import * as old from '../reports/local/performance-s08-20261020/baseline-logic/main.mjs';
const current=await import('../reports/local/performance-s08-20261020/candidate'+(process.env.SC2_BATCH_REVISION??'')+'-logic/main.mjs');
import {setup,snapshot,hero} from './performance-s08-cases.mjs';
const root='reports/local/performance-s08-20261020',checks=[],same=(name,a,b)=>{assert.deepEqual(b,a,name);checks.push(name);};
const medical=['medivac','science_vessel','medivac.1','medivac.2','medivac.3','science_vessel.1','science_vessel.2','science_vessel.3'].map(x=>'medical-'+x);
for(const name of [...medical,'swann','niadra','artanis','purifier_flagship','guardian','auras-none','auras-queen','auras-niadra','pools-empty','pools-wait','pools-due','support-empty','support-hellion','support-barrier','support-fire','weapon']){
 for(const n of [0,16,100,300])for(const variant of ['wounded','full','zero-energy','reverse','ties','mixed']){
  const [a,b]=[old,current].map(lib=>setup(lib,name,n,529+n,variant));
  const r1=a.call(),r2=b.call();same(name+'/'+n+'/'+variant,{result:r1,state:snapshot(old,a.w),observed:a.observed},{result:r2,state:snapshot(current,b.w),observed:b.observed});
 }
}
// Every new query must see damage, healing, conversion, identity replacement and new sources in the same tick.
for(const name of [...medical,'swann','niadra','artanis','purifier_flagship','auras-none','auras-queen','auras-niadra','pools-due']){
 const pair=[old,current].map(lib=>setup(lib,name,20,17,'ties'));
 for(let step=0;step<6;step++){for(const [i,c] of pair.entries()){const lib=i?current:old;
   if(step===1){c.targets[0].hp=0;c.targets[1].owner='zerg';c.targets[19].hp=c.targets[19].maxHp*.01;c.targets[19].shield=0;}
   if(step===2){const p=c.w.addUnit('marine','terran',0,1);p.hp=1;c.targets.push(p);if(c.source)c.source.energy=100;}
   if(step===3){if(c.source)c.source.hp=0;const q=c.w.addUnit('queen','terran',0,0);q.eliteId='queen.1';c.w.refreshStats(q,true);hero(lib,c.w,'niadra');}
   if(step===4){if(c.source){c.source.hp=c.source.maxHp;c.source.owner='zerg';}for(const p of c.targets)p.hp=p.maxHp;}
   if(step===5){c.w.time+=1;c.w.tick+=60;}
   c.result=c.call();
  }same(name+'/mutation/'+step,{result:pair[0].result,state:snapshot(old,pair[0].w),observed:pair[0].observed},{result:pair[1].result,state:snapshot(current,pair[1].w),observed:pair[1].observed});
 }
}
for(const seed of [1,17,529]){const [a,b]=[new old.CombatStatuses(),new current.CombatStatuses()];for(let step=0;step<1200;step++){
 const now=step/30,target=(step*13+seed)%23,source=(step*7+seed)%19,kind=['bleed','corruption','acidArmor','neural','bloodlust'][step%5];
 for(const s of [a,b]){s.apply(target,source,kind,(step%11)/10,(step%31)/10,now);if(step%7===0)s.apply(target,source,kind,.7,2,now);if(step%13===0)s.removeTarget(target);s.tick(now);if(step%101===0)s.restore(structuredClone(s.snapshot()));}
 if(step%30===0)same('statuses/'+seed+'/'+step,{snapshot:a.snapshot(),count:a.count,values:[a.list(target,now),a.value(target,kind,now)]},{snapshot:b.snapshot(),count:b.count,values:[b.list(target,now),b.value(target,kind,now)]});
 }a.tick(1000);b.tick(1000);same('statuses/drain/'+seed,a.snapshot(),b.snapshot());}
{
 const pair=[old,current].map(lib=>setup(lib,'weapon',0,529));
 for(const key of Object.keys(old.SOURCE_WEAPONS)){for(const c of pair)c.source.activeWeapon=key;same('weapon-effect/'+key,old.expeditionWeaponBonuses(pair[0].w,pair[0].source),current.expeditionWeaponBonuses(pair[1].w,pair[1].source));}
 for(const c of pair){c.source.activeWeapon=undefined;c.w.runConfig.frozenTalents.levels={advanced_arms:3,quick_siege:3,headshot:2,bio_shield:2};}
 for(const [kind,patch] of Object.entries({ordinary:{unitType:'marine'},elite:{eliteId:'marine.1'},hero:{heroId:'raynor'},siege:{heroId:undefined,eliteId:undefined,unitType:'tank',mode:'siege'},tactical:{tacticalTier:5,tacticalDirection:'mobility'},conversion:{owner:'zerg',team:'enemy'},restore:{owner:'terran',team:'player',mode:'tank'}})){
  for(const c of pair)Object.assign(c.source,patch);for(const ability of [undefined,'hero','blink'])same('dynamic-control/'+kind+'/'+ability,old.talentModifiers(pair[0].w,pair[0].source,ability),current.talentModifiers(pair[1].w,pair[1].source,ability));
 }
}
for(const name of ['medical-medivac','medical-medivac.2','swann','niadra','artanis','auras-queen','support-hellion','pools-due']){
 const pair=[old,current].map(lib=>setup(lib,name,16,23));
 for(const c of pair){c.w.phase='battle';c.w.paused=false;c.w.time=0;c.w.tick=0;for(const p of c.w.entities.values()){p.hp=p.maxHp*.5;p.stoppedUntil=p.nextShotAt=1e9;}if(c.source)c.source.stoppedUntil=0;}
 for(let tick=0;tick<180;tick++)for(const c of pair){for(const p of c.targets)if(p.owner==='terran'){assert.ok(p.hp>0,name+' live recipient');p.hp=p.maxHp*.25;p.shield=(p.maxShield??0)*.25;}const before=c.w.tick;c.w.step();assert.equal(c.w.tick,before+1);assert.equal(c.w.phase,'battle');}
 same('world/'+name,{state:snapshot(old,pair[0].w),observed:pair[0].observed},{state:snapshot(current,pair[1].w),observed:pair[1].observed});
}
await fs.writeFile(root+'/equivalence.json',JSON.stringify({pass:true,checks,methods:['Whole run/status/equipment/event state and observation receipts compared.','Same-tick source/recipient mutation cases; no cross-tick target caching.','Eight Worlds each advance 180 real fixed steps; allied maxima remain native, diagnostic wounds set to 25% before each tick, every allied recipient remains alive and phase remains battle. Enemy pressure fixtures retain parked high health.']},null,2));console.log(JSON.stringify({pass:true,checks:checks.length}));
