import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {CombatStatuses} from '../src/simulation/combat/statuses';
import type {EnemyTier} from '../src/data/enemies';

const stages=[1,4,7,10,12],close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(tier:EnemyTier='elite',level=1){
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});assert.ok(w.start());w.entities.clear();w.hive=null;w.pods=[];
 const queen=w.spawnSpecial('queen',tier,{x:0,z:0},{stage:stages[level-1],progress:(stages[level-1]-1)/18,density:1})!;
 const target=w.addUnit('marine','terran',0,4);target.hp=target.maxHp=20000;target.armor=0;target.weaponCooldown=target.nextShotAt=1e6;queen.weaponCooldown=queen.nextShotAt=1e6;queen.specialReady=0;queen.corrosiveBileReady=0;queen.abilityReady=Infinity;
 w.hash.rebuild(w.entities.values());w.enemySpecials.act(queen,1/60);const cast=w.enemySpecials.casts[0];assert.ok(cast);assert.equal(cast.kind,'bile');assert.equal(cast.damage,0);assert.ok(cast.corruptionDot!>0);
 w.updateUnit=()=>{};return {w,queen,target,cast};
}
function impact(f:ReturnType<typeof fixture>){f.w.tick=Math.round(f.cast.at*60);f.w.time=f.w.tick/60;f.w.enemySpecials.update(1/60);}
function steps(w:World,n:number){for(let i=0;i<n;i++)w.step();}
function heal(w:World,target:ReturnType<typeof fixture>['target']){const medic=w.addUnit('medivac','terran',target.x+1,target.z);medic.energy=medic.maxEnergy;target.hp=1;w.heal(medic,.1);const amount=target.hp-1;w.entities.delete(medic.id);return amount;}

for(const tier of ['elite','boss','lord'] as const)for(let level=1;level<=5;level++)test(`${tier} queen level ${level} applies real healing suppression and exactly four finite damage ticks`,()=>{
 const f=fixture(tier,level),{w,target,cast}=f,hp=target.hp;impact(f);assert.equal(target.hp,hp);
 const value=[.2,.2,.3,.35,.4][level-1];close(w.statuses.value(target.id,'corruption',w.time),value);const reduced=heal(w,target);assert.ok(reduced>0);target.hp=hp;
 const original=w.hit.bind(w),hits:number[]=[];w.hit=(body,...args)=>{const before=body.hp;original(body,...args);if(body.id===target.id&&before>body.hp)hits.push(before-body.hp);};
 steps(w,59);assert.equal(hits.length,0);steps(w,1);assert.equal(hits.length,1);steps(w,180);assert.equal(hits.length,4);for(const damage of hits)close(damage,cast.corruptionDot!);
 close(hp-target.hp,4*cast.corruptionDot!);assert.equal(w.statuses.value(target.id,'corruption',w.time),0);steps(w,120);assert.equal(hits.length,4);const plain=heal(w,target);close(reduced/plain,1-value);
});

for(const tier of ['boss','lord'] as const)test(`${tier} queen keeps the original eight-second heal independent of ten-second bile`,()=>{
 const {w,queen}=fixture(tier),ally=w.addUnit('roach','zerg',-2,0);ally.hp=1;ally.maxHp=10000;queen.specialReady=0;w.enemySpecials.act(queen,1/60);
 assert.equal(ally.hp,801);assert.equal(queen.specialReady,8);assert.equal(queen.corrosiveBileReady,10);assert.equal(w.enemySpecials.casts.length,1);
 w.time=8;w.enemySpecials.act(queen,1/60);assert.equal(ally.hp,1601);assert.equal(queen.specialReady,16);assert.equal(w.enemySpecials.casts.length,1);
 w.time=10;w.enemySpecials.act(queen,1/60);assert.equal(ally.hp,1601);assert.equal(queen.specialReady,16);assert.equal(queen.corrosiveBileReady,20);assert.equal(w.enemySpecials.casts.length,2);
});

test('overlapping queen bile points apply one status and one tick stream',()=>{const f=fixture();f.cast.points=[f.cast.point,f.cast.point,f.cast.point];impact(f);assert.equal(f.w.statuses.list(f.target.id,f.w.time).length,1);const hp=f.target.hp;steps(f.w,240);close(hp-f.target.hp,4*f.cast.corruptionDot!);});
test('queen damage consumes shields and armor through native hit settlement',()=>{const f=fixture('boss',5);f.target.armor=.5;f.target.shield=f.target.maxShield=100;impact(f);const hp=f.target.hp,shield=f.target.shield;steps(f.w,60);assert.equal(f.target.hp,hp);assert.ok(f.target.shield<shield);});
test('committed queen bile and damage survive source death and removal',()=>{const f=fixture();const source=f.queen.id;f.queen.hp=0;f.w.entities.delete(source);impact(f);assert.equal(f.w.statuses.list(f.target.id,f.w.time)[0].source,source);const hp=f.target.hp;steps(f.w,240);close(hp-f.target.hp,4*f.cast.corruptionDot!);});
test('committed queen corrosion retains allegiance after its source is captured',()=>{const f=fixture();f.queen.owner='terran';impact(f);const hp=f.target.hp;steps(f.w,240);close(hp-f.target.hp,4*f.cast.corruptionDot!);});
test('a dead target receives no later queen damage settlements',()=>{const f=fixture();impact(f);f.target.hp=0;let calls=0;const original=f.w.hit.bind(f.w);f.w.hit=(body,...args)=>{if(body.id===f.target.id)calls++;original(body,...args);};steps(f.w,300);assert.equal(calls,0);});
test('restoring after the first queen tick keeps only the three unpaid ticks and both cooldowns',()=>{
 const f=fixture('boss',2);impact(f);steps(f.w,60);const snap=f.w.captureRun(),copy=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});copy.start();copy.restoreRun(snap);copy.updateUnit=()=>{};copy.paused=false;
 const target=copy.entities.get(f.target.id)!,queen=copy.entities.get(f.queen.id)!,hp=target.hp;assert.equal(queen.corrosiveBileReady,f.queen.corrosiveBileReady);assert.equal(queen.specialReady,f.queen.specialReady);steps(copy,300);close(hp-target.hp,3*f.cast.corruptionDot!);assert.equal(copy.statuses.value(target.id,'corruption',copy.time),0);
});
test('restoring a queen volley before impact retains its damage payload',()=>{const f=fixture('lord',3),copy=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});copy.start();copy.restoreRun(f.w.captureRun());copy.updateUnit=()=>{};copy.paused=false;copy.tick=Math.round(f.cast.at*60);copy.time=copy.tick/60;copy.hash.rebuild(copy.entities.values());copy.enemySpecials.update(1/60);const target=copy.entities.get(f.target.id)!,hp=target.hp;steps(copy,240);close(hp-target.hp,4*f.cast.corruptionDot!);});
test('refreshing a source replaces its tick schedule and independent sources retain their own ticks',()=>{
 const s=new CombatStatuses(),attach=(source:number,now:number)=>{const status=s.apply(1,source,'corruption',.2,4,now);status.periodic={damage:1,owner:'zerg',interval:1,nextTick:now+1};};attach(2,0);const hits:number[]=[];s.tick(1,t=>hits.push(t.source));attach(2,1);attach(3,1);s.tick(5,t=>hits.push(t.source));assert.equal(hits.filter(id=>id===2).length,5);assert.equal(hits.filter(id=>id===3).length,4);assert.equal(s.count,0);
});
test('malformed periodic corrosion is rejected during atomic World restore',()=>{const f=fixture();impact(f);const before=f.w.captureRun();for(const bad of [NaN,-1,Infinity]){const forged=structuredClone(before);forged.statuses.entries[0].periodic!.damage=bad;assert.throws(()=>f.w.restoreRun(forged),/持续腐蚀/);assert.deepEqual(f.w.captureRun(),before);}});
