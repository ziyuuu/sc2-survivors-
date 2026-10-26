import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Entity} from '../src/simulation/types';
import type {SpecialType,EnemyTier} from '../src/data/enemies';
import type {StatusKind} from '../src/simulation/combat/statuses';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const stages=[1,4,7,10,12];
function fixture(type:SpecialType,tier:EnemyTier,level:number){
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});assert.ok(w.start());w.entities.clear();w.hive=null;w.pods=[];
 const u=w.spawnSpecial(type,tier,{x:0,z:0},{stage:stages[level-1],progress:(stages[level-1]-1)/18,density:1})!;
 const t=w.addUnit('marine','terran',0,type==='zergling'?3:4);t.hp=t.maxHp=20000;t.armor=0;t.moveSpeed=0;t.weaponCooldown=t.nextShotAt=1e6;u.specialReady=0;u.weaponCooldown=u.nextShotAt=1e6;u.abilityReady=Infinity;
 w.hash.rebuild(w.entities.values());w.enemySpecials.act(u,1/60);const cast=w.enemySpecials.casts[0];assert.ok(cast);assert.ok(cast.damage>0);
 w.time=cast.at;w.enemySpecials.update(1/60);
 for(let n=0;n<60&&w.statuses.count===0;n++){w.time+=1/60;w.enemySpecials.update(1/60);w.enemySpecials.act(u,1/60);}
 assert.ok(t.hp<t.maxHp,'Actual skill hit must precede the status checks');return {w,u,t,cast};
}
function healingPair(w:World,t:Entity,kind:StatusKind,until:number){
 const medic=w.addUnit('medivac','terran',t.x+1,t.z);const heal=()=>{t.hp=1;medic.energy=medic.maxEnergy;const energy=medic.energy;w.heal(medic,.1);return {hp:t.hp-1,energy:energy-medic.energy};};
 assert.ok(w.statuses.value(t.id,kind,w.time)>0);const affected=heal();w.time=until;w.statuses.tick(w.time);assert.equal(w.statuses.value(t.id,kind,w.time),0);const plain=heal();assert.ok(plain.hp>0);return {affected,plain};
}
function firingInterval(w:World,t:Entity,u:Entity){
 t.stoppedUntil=0;t.windup=0;t.weaponCooldown=0;t.nextShotAt=0;t.attackLock=0;t.attackTarget=u.id;t.thinkAt=w.time+100;
 t.facing=t.attackFacing=Math.atan2(u.x-t.x,u.z-t.z);w.tick=1;w.updateUnit(t,1/60);assert.equal(t.pendingTarget,u.id);return t.shotInterval;
}
for(let level=2;level<=5;level++){
 test(`native enemy fan level ${level} slows the actual attack interval and expires`,()=>{
  const {w,u,t}=fixture('hydralisk','elite',level),value=[0,.1,.15,.2,.3][level-1];close(w.statuses.value(t.id,'neural',w.time),value);
  const until=w.statuses.list(t.id,w.time).find(s=>s.kind==='neural')!.until,slowed=firingInterval(w,t,u);
  w.time=until;w.statuses.tick(w.time);const normal=firingInterval(w,t,u);close(slowed/normal,1/(1-value));assert.equal(w.statuses.value(t.id,'neural',w.time),0);
 });
 test(`native enemy charge level ${level} suppresses real healing and applies finite bloodlust`,()=>{
  const {w,u,t}=fixture('zergling','elite',level),value=[0,.2,.25,.3,.4][level-1];close(w.statuses.value(t.id,'bleed',w.time),value);
  close(w.enemyAttackSpeedFactor(u),level>=3?1.25:1);
  const until=w.statuses.list(t.id,w.time).find(s=>s.kind==='bleed')!.until,{affected,plain}=healingPair(w,t,'bleed',until);close(affected.hp/plain.hp,1-value);close(affected.energy/plain.energy,1-value);
  close(w.enemyAttackSpeedFactor(u),1);
 });
 test(`native enemy bile level ${level} suppresses actual healing and stops at expiry`,()=>{
  const {w,t}=fixture('ravager','elite',level),value=[0,.2,.3,.35,.4][level-1];close(w.statuses.value(t.id,'corruption',w.time),value);
  const until=w.statuses.list(t.id,w.time).find(s=>s.kind==='corruption')!.until,{affected,plain}=healingPair(w,t,'corruption',until);close(affected.hp/plain.hp,1-value);close(affected.energy/plain.energy,1-value);
 });
 test(`native lord cone level ${level} reduces armor for real follow-up damage then restores it`,()=>{
  const {w,u,t}=fixture('roach','lord',level),value=[0,1,1.5,2,3][level-1];close(w.statuses.value(t.id,'acidArmor',w.time),value);t.armor=5;
  const until=w.statuses.list(t.id,w.time).find(s=>s.kind==='acidArmor')!.until,before=t.hp;w.hit(t,20,[],1,'zerg',0,0,u.id);close(before-t.hp,15+value);
  w.time=until;w.statuses.tick(w.time);const restored=t.hp;w.hit(t,20,[],1,'zerg',0,0,u.id);close(restored-t.hp,15);
 });
}
