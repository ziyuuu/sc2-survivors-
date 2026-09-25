import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CombatStatuses} from '../src/simulation/combat/statuses';
import {World} from '../src/simulation/world';
import {statusReadout} from '../src/ui/unit-identity';

test('status sources keep independent expiries and strongest active value wins',()=>{
 const statuses=new CombatStatuses();statuses.apply(1,10,'bleed',.2,3,0);statuses.apply(1,11,'bleed',.4,1,0);
 assert.equal(statuses.value(1,'bleed',0),.4);statuses.tick(1);assert.equal(statuses.value(1,'bleed',1),.2);
 statuses.apply(1,10,'bleed',.3,3,1);statuses.tick(3);assert.equal(statuses.value(1,'bleed',3),.3);
 statuses.tick(4);assert.equal(statuses.value(1,'bleed',4),0);assert.equal(statuses.count,0);
});

test('unit status text reports active effects and expires with simulation time',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const marine=w.allies()[0];w.statuses.apply(marine.id,10,'bleed',.2,3,w.time);w.statuses.apply(marine.id,11,'bleed',.4,1,w.time);w.statuses.apply(marine.id,12,'acidArmor',2,2,w.time);
 assert.match(statusReadout(w,marine).detail,/裂伤 1s/);assert.match(statusReadout(w,marine).detail,/酸蚀 2s/);
 w.statuses.tick(1);w.time=1;assert.match(statusReadout(w,marine).detail,/裂伤 2s/);
 w.statuses.tick(3);w.time=3;assert.equal(statusReadout(w,marine).detail,'');
});

test('healing suppression reduces restored HP and charges energy only for actual healing',()=>{
 const run=(suppressed:boolean)=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine','medivac']});w.start();const marine=w.allies().find(u=>u.unitType==='marine')!,medic=w.allies().find(u=>u.unitType==='medivac')!;marine.hp=1;marine.x=medic.x+1;medic.energyRegen=0;w.hash.rebuild(w.entities.values());if(suppressed)w.statuses.apply(marine.id,999,'bleed',.4,3,w.time);const before=medic.energy;w.heal(medic,.1);return {healed:w.stats.healed,used:before-medic.energy};};
 const plain=run(false),weak=run(true);assert.ok(Math.abs(weak.healed/plain.healed-.6)<1e-8);assert.ok(Math.abs(weak.used/plain.used-.6)<1e-8);
});

test('rank-II roach applies armor corrosion after its direct hit',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();w.stage=4;const marine=w.allies()[0],roach=w.spawnSpecial('roach','elite',{x:3,z:0})!;marine.hp=marine.maxHp=1000;marine.armor=2;
 const before=marine.hp;w.fire(roach,marine);assert.ok(marine.hp<before);assert.equal(w.statuses.value(marine.id,'acidArmor',w.time),1);
 const hp=marine.hp;w.hit(marine,10,[],1,'zerg');assert.equal(hp-marine.hp,9);
});

test('one bile volley hits once through overlapping points and creates one periodic zone',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();const marine=w.allies()[0],ravager=w.spawnSpecial('ravager','elite',{x:4,z:0})!;marine.hp=marine.maxHp=500;marine.moveSpeed=0;ravager.specialReady=100;ravager.weaponCooldown=100;
 w.hash.rebuild(w.entities.values());w.enemySpecials.casts.push({id:1,source:ravager.id,tier:'elite',kind:'bile',origin:{x:4,z:0},point:{x:0,z:0},points:[{x:0,z:0},{x:0,z:0}],angle:0,at:0,damage:60,count:2,range:9,radius:1,level:3,percent:0});
 w.enemySpecials.update(1/60);assert.equal(marine.hp,440);assert.equal(w.corrosionZones.length,1);assert.equal(w.statuses.value(marine.id,'corruption',w.time),.3);
 w.updateUnit=()=>{};w.advance(.5);assert.ok(Math.abs(marine.hp-(440-3))<1e-6);assert.ok(w.zoneSlowed.has(marine.id));
});
