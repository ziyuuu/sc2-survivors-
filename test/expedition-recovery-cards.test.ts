import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import {SOURCE_ABILITIES} from '../src/data/expansion-units';
import {draftContext} from '../src/simulation/expedition-economy';
import {sourceDetails,tickExpeditionRecovery,tickAutoAbilities} from '../src/simulation/combat/expedition-combat';
const world=()=>{const w=new World({rulesVersion:THREE_RACE_RULES,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('recovery draft eligibility includes native life and shield regeneration without labeling it team support',()=>{
 const ctx=draftContext(world());for(const f of ['reaper','roach','zealot','stalker','medivac','science_vessel','queen'] as const)assert.equal(ctx.familyInfo(f).canSupport,true,f);
 assert.equal(ctx.familyInfo('marine').canSupport,false);assert.equal(ctx.familyInfo('viking').canSupport,false);
 assert.ok(!ctx.familyInfo('roach').capabilities?.includes('support'));
});
test('recovery card multiplies native regeneration once and keeps Reaper enemy-damage delay',()=>{
 const w=world(),r=w.addUnit('reaper','terran',0,0),roach=w.addUnit('roach','terran',1,0);w.expedition!.cardTotals['recovery.reaper']=.4;w.expedition!.cardTotals['recovery.roach']=.4;for(const u of [r,roach]){u.hp-=30;for(let i=0;i<4;i++)w.refreshStats(u);}
 r.lastDamagedAt=0;w.time=1;const before=r.hp;tickExpeditionRecovery(w,r,1);assert.equal(r.hp,before);w.time=10;tickExpeditionRecovery(w,r,1);close(r.hp-before,2.8*1.4);
 const previous=roach.hp;tickExpeditionRecovery(w,roach,1);close(roach.hp-previous,sourceDetails('roach').lifeRegen*1.4*1.4);
});
test('native shield recovery card restores only shields once, and a non-regenerating body gets no free HP',()=>{
 const w=world(),s=w.addUnit('stalker','terran',0,0),m=w.addUnit('marine','terran',1,0);w.expedition!.cardTotals['recovery.stalker']=.4;w.expedition!.cardTotals['recovery.marine']=.4;
 s.shield=0;s.hp-=10;m.hp-=10;w.refreshStats(s);w.refreshStats(s);w.refreshStats(m);w.time=20;s.lastDamagedAt=0;const hp=s.hp,mhp=m.hp;tickExpeditionRecovery(w,s,1);tickExpeditionRecovery(w,m,1);close(s.shield!,2.8*1.4);assert.equal(s.hp,hp);assert.equal(m.hp,mhp);
});
test('Queen recovery card scales its separate transfusion and passive regeneration each once',()=>{
 const w=world(),q=w.addUnit('queen','terran',0,0),p=w.addUnit('roach','terran',1,0);w.expedition!.cardTotals['recovery.queen']=.4;w.refreshStats(q);q.hp=50;q.energy=100;p.maxHp=1000;p.hp=1;
 tickExpeditionRecovery(w,q,1);close(q.hp-50,sourceDetails('queen').lifeRegen*1.4*1.4);tickAutoAbilities(w,q);close(p.hp-1,SOURCE_ABILITIES.transfusion.instantHealing*1.4);
});
