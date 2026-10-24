import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {spawnFieldPickup,collectFieldPickup,fieldArmorFactor,fieldAttackFactor} from '../src/simulation/field-events/pickups';
import {startReplacementHorde,tickReplacementHorde,replacementDensity} from '../src/simulation/field-events/hordes';
import {HORDE_KINDS,HORDE_RULES} from '../src/simulation/field-events/state';
function world(){const w=new World({difficulty:'hard',sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder']});w.start();w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
function take(w:World,kind:Parameters<typeof spawnFieldPickup>[1]){assert.equal(spawnFieldPickup(w,kind,w.anchor),true);const id=w.fieldEvents.pickups.at(-1)!.id;assert.equal(collectFieldPickup(w,id),true);assert.equal(collectFieldPickup(w,id),false);}
test('field medical restores exactly 15% max HP, not shields, and does not revive',()=>{
 const w=world(),[u,v]=w.allies();u.hp=u.maxHp*.4;u.maxShield=100;u.shield=15;v.hp=0;take(w,'medical');assert.equal(u.hp,u.maxHp*.55);assert.equal(u.shield,15);assert.equal(v.hp,0);
});
test('field attack and armor refresh 30 seconds without stacking; pause freezes expiry',()=>{
 const w=world(),u=w.allies()[0];take(w,'firepower');take(w,'armor');assert.equal(fieldAttackFactor(w,u),1.15);assert.equal(fieldArmorFactor(w,u),1.15);
 w.advance(10);take(w,'firepower');assert.equal(w.fieldEvents.attackUntil,40);w.paused=true;w.advance(40);assert.equal(w.time,10);w.paused=false;w.advance(20);assert.equal(fieldArmorFactor(w,u),1);assert.equal(fieldAttackFactor(w,u),1.15);w.advance(10);assert.equal(fieldAttackFactor(w,u),1);
});
test('field nuke adds one inventory charge without spending or striking',()=>{
 const w=world(),ammo=w.expedition.support.ammo;take(w,'nuke');assert.equal(w.expedition.support.ammo,ammo+1);assert.equal(w.effects.length,0);
});
test('root retains attacks and HP, includes existing flying enemies, excludes subsequent births',()=>{
 const w=world(),enemy=w.addUnit('hydralisk','zerg',2,0),air=w.addUnit('mutalisk','zerg',8,0),u=w.allies()[0];enemy.attackRange=20;enemy.weaponDamage=10;u.hp=u.maxHp=1e8;take(w,'root');const p={x:enemy.x,z:enemy.z},hp=u.hp,late=w.addUnit('zergling','zerg',20,0);w.advance(1);
 assert.equal(enemy.x,p.x);assert.equal(enemy.z,p.z);assert.ok(w.stats.shots>0);assert.ok(w.fieldEvents.roots.has(air.id));assert.ok(!w.fieldEvents.roots.has(late.id));assert.ok(u.hp<=hp);w.advance(4);assert.equal(w.fieldEvents.roots.size,0);
});
for(const kind of HORDE_KINDS)test('replacement '+kind+' preserves density, lasts 20s, leaves survivors and admits no late pulse',()=>{
 const w=world();w.stage=HORDE_RULES[kind].stage;w.prepareStage();assert.equal(startReplacementHorde(w,kind),true);const s=w.fieldEvents.horde!;assert.equal(s.spawned,HORDE_RULES[kind].pulse);const first=[...w.entities.values()].filter(u=>u.owner==='zerg');assert.deepEqual(first.map(u=>u.enemySpawn?.density),first.map((_,i)=>replacementDensity(i)));
 const q=w as unknown as {ambientBacklog:unknown[];releaseAmbient():void};q.ambientBacklog=[{at:0,type:'queen'},{at:21,type:'queen'}];q.releaseAmbient();assert.equal(s.replaced,1);assert.equal(q.ambientBacklog.length,1);
 w.time=20;tickReplacementHorde(w);assert.equal(w.fieldEvents.horde,null);assert.ok(first.every(u=>w.entities.get(u.id)===u));assert.equal(w.fieldEvents.lastHorde?.spawned,HORDE_RULES[kind].pulse);assert.ok(w.enemyCount()<=300);
});
test('replacement window refuses critical wave conflicts and less than 20 seconds remaining',()=>{
 const w=world();w.stage=10;w.prepareStage();const q=w as unknown as {specialPlan:{at:number}[];nextSpecial:number};q.specialPlan=[{at:10}];q.nextSpecial=0;assert.equal(startReplacementHorde(w,'ultralisks'),false);q.specialPlan=[];w.stageElapsed=w.duration-19;assert.equal(startReplacementHorde(w,'ultralisks'),false);
});
