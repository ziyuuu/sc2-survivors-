import {test} from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {LAB_CASES,prepareLabCase,runLabShop,labShopShelf,labHitEvents} from '../src/diagnostics/fun-lab-cases';
import {markSpecialReady} from '../src/simulation/special-stages/runtime';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {collectFieldPickup} from '../src/simulation/field-events/pickups';
const fixture=()=>new World({seed:529,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount()});
test('all 39 practice entries admit through real rules after switching from the previous scene',()=>{
 const w=fixture();assert.equal(new Set(LAB_CASES.map(c=>c.id)).size,39);
 for(const c of LAB_CASES){assert.doesNotThrow(()=>prepareLabCase(w,c.id),c.id);setDiagnosticHealthLock(w,true);markSpecialReady(w);for(let i=0;i<60;i++)w.step();assert.notEqual(w.phase,'lost',c.id);}
});
test('practice items use ordinary movement collection rather than a diagnostic-only shortcut',()=>{
 const w=fixture();prepareLabCase(w,'pickup:medical');assert.equal(w.diagnosticRun,false);const old=w.allies().map(u=>u.hp),item=w.fieldEvents.pickups[0];Object.assign(w.anchor,item);w.step();assert.equal(w.fieldEvents.pickups.length,0);assert.ok(w.allies().every((u,i)=>u.hp>old[i]));assert.equal(collectFieldPickup(w,item.id),false);
});
test('isolated practice stays isolated after the natural-event grace period',()=>{
 const w=fixture();prepareLabCase(w,'pickup:medical');setDiagnosticHealthLock(w,true);w.random=()=>0;
 for(let i=0;i<31*60;i++)w.step();
 assert.ok(w.time>30);assert.equal(w.fieldEvents.pacing.started,false);assert.equal(w.fieldEvents.pacing.pending,false);
 assert.equal(w.missions.active,null);assert.equal(w.encounters.active,null);assert.equal(w.encounters.expanded.short,null);assert.equal(w.encounters.expanded.queen,null);assert.equal(w.fieldEvents.horde,null);
});
test('practice purchases charge the native quoted price and remain active in the battlefield',()=>{
 const w=fixture();for(const id of ['gland','eye','nydus','tavern','bait','dice','pandora'] as const){prepareLabCase(w,'shop:'+id);const r=w.rewards[0],before={...w.wallet};assert.ok(w.choose(r.offerId!));assert.equal(w.wallet.minerals,before.minerals-r.minerals+(id==='pandora'?3000:0));assert.equal(w.wallet.gas,before.gas-r.gas+(id==='pandora'?1500:0));assert.ok(runLabShop(w,id));assert.equal(w.funShop.levels[id],1);}
});
test('reset clears trial purchases, enemies, pickups and completion instead of accumulating rewards',()=>{
 const w=fixture();prepareLabCase(w,'shop:dice');assert.ok(w.choose(w.rewards[0].offerId!));assert.ok(labShopShelf(w,'dice'));assert.ok(w.choose(w.rewards[0].offerId!));assert.equal(w.funShop.levels.dice,2);prepareLabCase(w,'special:dodge');assert.equal(w.funShop.levels.dice,0);assert.equal(w.fieldEvents.pickups.length,0);assert.equal(w.specialStages.last,null);assert.equal(w.specialStages.active?.hits,0);assert.equal(w.specialStages.active?.participants.length,4);
});
test('the lab counts shield impacts once and keeps feedback after invincibility reaches one HP',()=>{
 const w=fixture();prepareLabCase(w,'wings:elytra');setDiagnosticHealthLock(w,true);const u=w.allies()[0],enemy=w.addUnit('hydralisk','zerg',2,0);u.armor=u.shieldArmor=0;u.hp=100;u.shield=10;
 let serial=Math.max(0,...w.visualEvents.map(e=>e.serial));w.hit(u,20,[],1,'zerg',0,0,enemy.id);const first=labHitEvents(w,serial);assert.equal(first.hits,1);assert.ok(u.hp<100);assert.equal(u.shield,0);
 u.hp=1;serial=first.serial;w.time+=1/60;w.hit(u,200,[],1,'zerg',0,0,enemy.id);const next=labHitEvents(w,serial);assert.equal(u.hp,1);assert.equal(next.hits,1);assert.ok(w.visualEvents.some(e=>e.serial>serial&&e.kind==='hit'));assert.equal(labHitEvents(w,next.serial).hits,0);
 w.time+=1/60;w.visual('hit',u);assert.equal(labHitEvents(w,next.serial).hits,0,'healing pulses are not impacts');
});
