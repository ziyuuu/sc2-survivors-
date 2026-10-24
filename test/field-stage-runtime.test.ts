import {barrageIntersection} from '../src/simulation/special-stages/dodge';
import {DODGE_HIT_RADIUS} from '../src/simulation/special-stages/dodge-patterns';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {FIELD_PICKUPS,HORDE_KINDS,HORDE_RULES} from '../src/simulation/field-events/state';
import {spawnFieldPickup,collectFieldPickup,fieldRooted} from '../src/simulation/field-events/pickups';
import {startReplacementHorde,tickReplacementHorde} from '../src/simulation/field-events/hordes';
import {beginSpecialStage,markSpecialReady,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {barragePosition} from '../src/simulation/special-stages/dodge-patterns';
import type {UnitType} from '../src/data/sc2-units';
function fixture(initial:UnitType[]=['marine','marauder','reaper','hellion']){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial,equipmentAccount:newEquipmentAccount()});w.start();w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
function take(w:World,kind:typeof FIELD_PICKUPS[number]){assert.ok(spawnFieldPickup(w,kind,w.anchor));assert.ok(collectFieldPickup(w,w.fieldEvents.pickups.at(-1)!.id));}
test('field firepower and armor affect real weapon and shield damage once, fixed skill damage is unchanged',()=>{
 const w=fixture(),u=w.allies()[0],target=w.addUnit('roach','zerg',5,0);target.hp=target.maxHp=1e6;target.armor=0;
 const hit=(weapon:boolean)=>{const hp=target.hp;w.hit(target,100,[],1,'terran',0,1,u.id,false,false,0,weapon);return hp-target.hp;};
 const original=hit(true),skill=hit(false);take(w,'firepower');assert.ok(Math.abs(hit(true)-original*1.15)<1e-8);assert.equal(hit(false),skill);
 u.armor=20;u.hp=u.maxHp=1000;u.maxShield=200;u.shield=200;u.shieldArmor=10;take(w,'armor');w.hit(u,100,[],1,'zerg',0,0,target.id);assert.equal(u.shield,111.5);u.shield=0;w.hit(u,100,[],1,'zerg',0,0,target.id);assert.equal(u.hp,923);
});
test('field root prevents the real boss charge and identity replacement never inherits root',()=>{
 const w=fixture(),u=w.addUnit('ultralisk','zerg',5,0,1,'boss',4);u.hp=u.maxHp=1e8;
 for(const a of w.allies()){a.hp=a.maxHp=1e9;a.nextShotAt=Infinity;}
 const source=w.enemySpecials as unknown as {charges:Map<number,unknown>};source.charges.set(u.id,{source:u.id,remaining:8,angle:Math.PI/2,damage:10,hits:new Set(),level:1,percent:0,owner:'zerg'});
 take(w,'root');const p={x:u.x,z:u.z};w.advance(1);assert.deepEqual({x:u.x,z:u.z},p);assert.equal(fieldRooted(w,u),true);
 const replacement={...u,bornAt:u.bornAt+1};w.entities.set(u.id,replacement);assert.equal(fieldRooted(w,replacement),false);
});
test('rooted ranged enemy continues committing ordinary attacks',()=>{
 const w=fixture(['marine']),ally=w.allies()[0],enemy=w.addUnit('hydralisk','zerg',2,0);ally.hp=ally.maxHp=1e8;ally.nextShotAt=Infinity;enemy.hp=enemy.maxHp=1e8;enemy.attackRange=20;
 take(w,'root');const hp=ally.hp,p={x:enemy.x,z:enemy.z};w.advance(2);assert.ok(ally.hp<hp);assert.deepEqual({x:enemy.x,z:enemy.z},p);
});
test('field nuke uses the original explicit strategic command and spends only its one added charge',()=>{
 const w=fixture(),enemy=w.addUnit('roach','zerg',5,0);enemy.hp=enemy.maxHp=1e8;take(w,'nuke');const ammo=w.expedition.support.ammo;
 assert.ok(w.commitStrategicStrike({x:5,z:0}));assert.equal(w.expedition.support.ammo,ammo-1);assert.equal(w.commitStrategicStrike({x:5,z:0}),false);const hp=enemy.hp;w.advance(3.1);assert.ok(enemy.hp<hp-2900);
});
for(const kind of HORDE_KINDS)test(`${kind} admits its approved cumulative population in 20 seconds and stops without queueing`,()=>{
 const w=fixture();w.stage=HORDE_RULES[kind].stage;w.prepareStage();assert.ok(startReplacementHorde(w,kind));const h=w.fieldEvents.horde!;
 for(let i=1;i<10;i++){w.time=i*2;w.stageElapsed=w.time;tickReplacementHorde(w);}
 assert.equal(h.spawned,HORDE_RULES[kind].total,kind);assert.ok(w.enemyCount()<=300);const count=w.entities.size;w.time=20;tickReplacementHorde(w);assert.equal(w.fieldEvents.horde,null);w.time=80;tickReplacementHorde(w);assert.equal(w.entities.size,count);
});
test('replacement horde retains rescue guard identities within the next pulse budget',()=>{
 const w=fixture();w.stage=10;w.prepareStage();assert.ok(startReplacementHorde(w,'ultralisks'));
 const p=w.spawnPod('marine',{x:15,z:15});
 assert.ok(p);if(!p)return;p.status='active';p.guardTypes=['zergling','roach','hydralisk'];p.guardianIds.clear();
 (w as unknown as {releasePodGuards(p:typeof p):void}).releasePodGuards(p);
 assert.equal(p.guardianIds.size,0);w.time=2;tickReplacementHorde(w);assert.equal(w.fieldEvents.horde?.spawned,6);assert.equal(p.guardianIds.size,3);assert.ok([...p.guardianIds].every(id=>w.entities.get(id)?.unitType==='ultralisk'&&w.entities.get(id)?.guardianPod===p.id));
});
test('dodge carries ranks back while preserving original cooldowns, generation and committed attack state',()=>{
 const w=fixture(),u=w.allies()[0];u.nextShotAt=20;u.abilityReady=30;u.windup=.25;u.pendingTarget=900;u.bornAt=-3;const before={next:u.nextShotAt,ability:u.abilityReady,windup:u.windup,target:u.pendingTarget,born:u.bornAt};
 assert.ok(beginSpecialStage(w,'dodge','fixture'));markSpecialReady(w);const a=w.specialStages.active!;a.nextPattern=Infinity;w.advance(60);assert.equal(w.specialStages.last?.result,'success');
 assert.deepEqual({next:u.nextShotAt,ability:u.abilityReady,windup:u.windup,target:u.pendingTarget,born:u.bornAt},before);
});
for(const type of ['thor','queen','zealot'] as const)test(`dodge full 60-second predictive route with four ${type} bodies and no invincibility`,()=>{
 const w=fixture([type,type,type,type]);assert.ok(beginSpecialStage(w,'dodge','fixture'));markSpecialReady(w);
 const a=w.specialStages.active!,units=w.allies(),speed=Math.min(...units.map(u=>u.moveSpeed)),spacing=Math.max(1.2,...units.map(u=>u.unitRadius*2+.25)),radius=Math.max(...units.map(u=>u.unitRadius)),bound=18-spacing/2-radius;
 const goalZ=type==='thor'?-4:0,weight=type==='thor'?1.2:type==='queen'?20:50,patterns=new Set<string>();let previous={x:0,z:0},peak=0;
 // Fixed-step input controller sees current projectiles and their analytic paths.
 // These are reproducible route proofs, not human difficulty or natural-run acceptance.
 while(w.specialStages.active&&a.clock<3600){
  if(a.cue){patterns.add(a.cue.pattern!);assert.equal(a.cue.axis,'z');assert.equal(a.cue.side,-1);}
  if(a.clock%6===0){let best=Infinity,dir={x:0,z:0};const times=[.05,.1,.15,.2,.3,.4,.55,.7,.9,1.2],frames=times.map(t=>a.barrage.map(b=>({...barragePosition(b,a.clock+t*60),radius:b.radius})));
   for(let k=-1;k<24;k++){
    const v=k<0?{x:0,z:0}:{x:Math.sin(k*Math.PI/12),z:Math.cos(k*Math.PI/12)};let score=0;
    for(let i=0;i<times.length;i++){
     const t=times[i],x=Math.max(-bound,Math.min(bound,w.anchor.x+v.x*speed*t)),z=Math.max(-bound,Math.min(bound,w.anchor.z+v.z*speed*t));
     for(const [j,q] of frames[i].entries()){
      const before=i?times[i-1]:0,prior=i?frames[i-1][j]:a.barrage[j],u0={x:Math.max(-bound,Math.min(bound,w.anchor.x+v.x*speed*before)),z:Math.max(-bound,Math.min(bound,w.anchor.z+v.z*speed*before))};
      const clear=Math.hypot(x-q.x,z-q.z)-DODGE_HIT_RADIUS-q.radius;
      if(barrageIntersection(prior,q,u0,{x,z},DODGE_HIT_RADIUS+q.radius+.08))score+=10000/(t+.1);else if(clear<1.6)score+=(1.6-clear)**2*15/(t+.4);
     }
     score+=Math.max(0,Math.abs(x)-12)+Math.max(0,Math.abs(z)-10)*1.2+Math.abs(z-goalZ)*weight;
    }
    score+=(v.x-previous.x)**2+(v.z-previous.z)**2;if(score<best){best=score;dir=v;}
   }
   w.input=previous=dir;
  }
  w.step();peak=Math.max(peak,a.barrage.length+4);
 }
 assert.equal(w.specialStages.last?.result,'success',JSON.stringify({hits:a.hits,clock:a.clock,kind:type}));assert.equal(a.clock,3600);assert.equal(patterns.size,5);assert.ok(a.hits<5);assert.ok(peak<300);assert.ok(w.allies().every(u=>u.hp===u.maxHp));
});
