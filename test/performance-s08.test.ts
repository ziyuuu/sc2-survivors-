import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {CombatStatuses} from '../src/simulation/combat/statuses';
import {healExpedition} from '../src/simulation/combat/expedition-combat';
import {medicalTargets} from '../src/simulation/combat/support-targets';
import {tickTeamAuras} from '../src/simulation/combat/team-auras';
import {tickZergHeroState} from '../src/simulation/combat/zerg-hero-passives';
import {tickEliteSupport} from '../src/simulation/combat/elite-support';
function world(){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.hive=null;w.expansionHives.clear();return w;}
test('status refresh tickets cannot expire a replacement or another source',()=>{
 const s=new CombatStatuses();s.apply(1,1,'bleed',.2,1,0);s.apply(1,1,'bleed',.5,3,.5);s.apply(1,2,'bleed',.3,2,0);
 s.tick(1);assert.equal(s.count,2);assert.equal(s.value(1,'bleed',1),.5);s.tick(2);assert.equal(s.count,1);
 const restored=new CombatStatuses();restored.restore(structuredClone(s.snapshot()));restored.tick(3.5);assert.equal(restored.count,0);assert.equal(restored.snapshot().serial,3);
});
test('removing and reusing a target ID keeps new statuses past old expiry',()=>{
 const s=new CombatStatuses();s.apply(1,1,'neural',.2,1,0);s.removeTarget(1);s.apply(1,1,'neural',.6,3,.5);s.tick(1);assert.equal(s.value(1,'neural',1),.6);s.tick(3.5);assert.equal(s.count,0);
});
test('an empty-energy medic retains its preferred movement patient without healing',()=>{
 const w=world(),u=w.addUnit('medivac','terran',0,0),a=w.addUnit('marine','terran',0,1),b=w.addUnit('marine','terran',1,0);a.hp=a.maxHp*.4;b.hp=b.maxHp*.45;u.healTarget=b.id;u.energy=0;
 assert.equal(healExpedition(w,u,1/60),b);assert.equal(u.healTarget,null);assert.deepEqual(u.healTargets,[]);assert.equal(a.hp,a.maxHp*.4);assert.equal(b.hp,b.maxHp*.45);
});
test('bounded selection keeps sticky patient outside the top three, then stable ID order',()=>{
 const w=world(),u=w.addUnit('medivac','terran',0,0),a=Array.from({length:9},(_,i)=>{const p=w.addUnit('marine','terran',i*.1,1);p.hp=p.maxHp*(.4+i*.005);return p;});w.entities=new Map([...w.entities].reverse());
 assert.deepEqual(medicalTargets(w,u,8,3,a[8].id).map(p=>p.id),[a[8].id,a[0].id,a[1].id]);
 a[8].hp=a[8].maxHp;assert.deepEqual(medicalTargets(w,u,8,3,a[8].id).map(p=>p.id),a.slice(0,3).map(p=>p.id));
});
test('a new wound or changed owner is visible on the next call in the same tick',()=>{
 const w=world(),u=w.addUnit('medivac','terran',0,0),a=w.addUnit('marine','terran',0,1),b=w.addUnit('marine','terran',1,1);
 assert.deepEqual(medicalTargets(w,u,8,1),[]);b.hp=1;assert.equal(medicalTargets(w,u,8,1)[0],b);b.owner='zerg';a.hp=2;assert.equal(medicalTargets(w,u,8,1)[0],a);
});
test('aura cleanup continues with no regen source, and same-tick promotion starts regeneration',()=>{
 const w=world(),p=w.addUnit('marine','terran',0,1),q=w.addUnit('queen','terran',0,0);p.hp=p.maxHp/2;w.teamAuras.blood=[{source:q.id,target:p.id,until:-1,spent:0,spentAt:0}];
 const hp=p.hp;tickTeamAuras(w,1/60);assert.equal(p.hp,hp);assert.equal(w.teamAuras.blood.length,0);
 q.eliteId='queen.1';w.refreshStats(q,true);tickTeamAuras(w,1/60);assert.ok(p.hp>hp);q.hp=0;const after=p.hp;tickTeamAuras(w,1/60);assert.equal(p.hp,after);
});
test('infection pools that are not due skip recipients but still expire and clean infections',()=>{
 const w=world();w.zergHeroes.infections=[{source:1,target:2,rank:1,until:0}];w.zergHeroes.pools=[{id:3,source:1,rank:1,point:{x:0,z:0},until:2,next:2}];let scans=0;const allies=w.allies.bind(w);w.allies=()=>{scans++;return allies();};
 tickZergHeroState(w);assert.equal(scans,0);assert.equal(w.zergHeroes.infections.length,0);assert.equal(w.zergHeroes.pools[0].next,2);
 w.time=3;tickZergHeroState(w);assert.equal(w.zergHeroes.pools.length,0);
});
test('barrier-only support still cleans receipts without enumerating enemy visibility',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0);w.eliteSupport.barriers=[{source:u.id,target:u.id,amount:10,until:0,cap:.5}];for(let i=0;i<30;i++)w.addUnit('roach','zerg',i,3);
 let visibility=0;w.visibleTo=()=>{visibility++;return true;};tickEliteSupport(w);assert.equal(w.eliteSupport.barriers.length,0);assert.equal(visibility,0);
});
