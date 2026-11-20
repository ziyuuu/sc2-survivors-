import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {tickSix,tickRavenTurrets} from '../src/simulation/combat/terran-six';
import {TERRAN_SIX_NATIVE as N} from '../src/data/expansion-units';
import type {Fortification} from '../src/simulation/types';
import {spawnMission} from '../src/simulation/missions/runtime';

function battle(){
 const w=new World({race:'terran',difficulty:'hard',seed:191120,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());
 w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 w.anchor.x=w.anchor.z=0;w.anchorStoppedFor=2;return w;
}
function turret(w:World){
 const f:Fortification={id:w.nextId++,x:0,z:0,kind:'turret_terran',owner:'terran',team:'player',race:'terran',hp:100,maxHp:100,armor:1,unitRadius:.5,flying:false,attributes:['Armored','Mechanical','Structure'],nextActionAt:0,ravenUntil:N.raven.turretLife};
 w.fortifications.set(f.id,f);return f;
}

test('a Raven turret never enters the endless repair-building path or changes its weapon clock there',()=>{
 const w=battle(),f=turret(w),patient=w.addUnit('tank','terran',1,0);patient.hp=patient.maxHp/2;
 w.endless={round:1,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};
 const before=patient.hp;
 (w as unknown as {updateFortifications():void}).updateFortifications();
 assert.equal(patient.hp,before);assert.equal(f.nextActionAt,0);assert.equal(w.stats.healed,0);
 const target=w.addUnit('roach','zerg',3,0);target.hp=target.maxHp=3000;target.armor=0;
 w.hash.rebuild([...w.entities.values(),...w.fortifications.values()]);const hp=target.hp;tickRavenTurrets(w);
 assert.ok(target.hp<hp);assert.ok(f.nextActionAt>0);assert.equal(patient.hp,before);
});

test('stopped six-unit casters cannot spend energy, mark enemies, deploy turrets or finish a pending Yamato',()=>{
 const w=battle(),g=w.addUnit('ghost','terran',0,0),r=w.addUnit('raven','terran',0,-1),c=w.addUnit('battlecruiser','terran',0,-2);
 const target=w.addUnit('queen','zerg',2,0);target.enemyTier='boss';target.hp=target.maxHp=3000;
 for(const u of [g,r,c]){u.stoppedUntil=10;u.energy=u.maxEnergy;}
 c.six={yamato:{target:target.id,at:0}};w.hash.rebuild([...w.entities.values()]);const energy=[g.energy,r.energy];
 for(const u of [g,r,c])w.updateUnit(u,1/60);
 assert.equal(w.weaponFlights.length,0);assert.equal(w.fortifications.size,0);assert.equal(target.six?.jammed,undefined);
 assert.deepEqual([g.energy,r.energy],energy);assert.equal(c.six.yamato,undefined);
});

test('Raven turret lifetime continues through the fleet ceasefire without firing',()=>{
 const w=battle();w.missions.enabled=true;w.stage=10;w.prepareStage();assert.ok(spawnMission(w,'fleet'));
 const m=w.missions.active!,tower=w.missions.bodies.get(m.bodyIds[0])!;m.queue=[];
 w.anchor.x=tower.x;w.anchor.z=tower.z;
 const f=turret(w),ally=w.addUnit('marine','terran',tower.x+3,tower.z),target=w.addUnit('roach','zerg',tower.x+7,tower.z);
 f.x=tower.x+3;f.z=tower.z;ally.stoppedUntil=target.stoppedUntil=100;f.ravenUntil=.025;
 w.hash.rebuild([...w.entities.values(),...w.fortifications.values()]);const hp=target.hp;
 w.step();assert.equal(w.missions.fleet.ceasefire,true);assert.equal(target.hp,hp);w.step();
 assert.equal(w.fortifications.has(f.id),false);assert.equal(target.hp,hp);
});

test('a cruiser rechecks jump safety at completion and preserves its spent cooldown when the destination becomes hostile',()=>{
 const w=battle(),c=w.addUnit('battlecruiser','terran',20,0);w.hash.rebuild([...w.entities.values()]);tickSix(w,c);assert.ok(c.six?.jump);
 const point={...c.six.jump.point},ready=c.six.jumpReady;w.addUnit('roach','zerg',point.x,point.z);
 w.hash.rebuild([...w.entities.values()]);w.time=c.six.jump.at+.1;w.tick=Math.round(w.time*60);tickSix(w,c);
 assert.equal(c.x,20);assert.equal(c.z,0);assert.equal(c.six.jump,undefined);assert.equal(c.six.jumpReady,ready);
});

test('Liberators can share a durable boss zone but do not reserve another ground volley for a nearly defeated boss',()=>{
 for(const hp of [30000,1]){
  const w=battle(),a=w.addUnit('liberator','terran',0,0),b=w.addUnit('liberator','terran',0,.1),target=w.addUnit('roach','zerg',3,0);
  target.enemyTier='boss';target.hp=hp;target.maxHp=30000;w.hash.rebuild([...w.entities.values()]);tickSix(w,a);tickSix(w,b);
  assert.ok(a.six?.zone);assert.equal(!!b.six?.zone,hp===30000);
 }
});
