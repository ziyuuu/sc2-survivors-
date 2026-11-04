import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive} from '../src/persistence/archive';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {ELITES} from '../src/data/elites';
import {HEROES,type HeroId} from '../src/data/heroes';
import type {ZergEliteId} from '../src/data/zerg-elites';
import type {Race} from '../src/data/races';
import {zergEliteCombat,zergEliteBile,zergEliteQueenAbility,tickZergElite,tickZergEliteState} from '../src/simulation/combat/zerg-elite-runtime';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {acquireExpeditionHero,castExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {spawnMission} from '../src/simulation/missions/runtime';
import {tickHeroAttacks} from '../src/simulation/combat/hero-attack-upgrades';
import {zergBeforePrimary} from '../src/simulation/combat/zerg-hero-passives';
import {absorbReaper} from '../src/simulation/combat/terran-elite-runtime';

class Backend implements SaveBackend {
 raw:string|null=null;
 async read(){return [this.raw,null,null];}
 async commit(raw:string,expected?:string|null){if(expected!==undefined)assert.equal(this.raw,expected);this.raw=raw;}
}
function fixture(race:Race='zerg'){
 const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529)}),backend=new Backend();
 return {w,backend,session:new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''})};
}
function equip(w:World,template:string,slot:EquipmentSlot,binding:{elite?:ZergEliteId;hero?:HeroId}={},corrupt=false){
 const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot,binding,polluted:corrupt},`regression:${template}:${slot}`,{kind:'warehouse'});assert.ok(r.ok);
 if(corrupt){a.dust=100000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);
}
function elite(w:World,id:ZergEliteId){const u=w.allies().find(u=>u.eliteId===id)??w.addUnit(ELITES[id].family,'terran',0,0);u.eliteId=id;u.modelKey=ELITES[id].model;if(u.unitType==='lurker')u.nativeMode=u.desiredNativeMode='lurker_burrowed';w.refreshStats(u,true);return u;}
async function roundTrip(f:ReturnType<typeof fixture>){
 const {w,backend,session}=f;w.endStage();assert.equal(w.phase,'reward');await session.saveNow();assert.equal(session.saveFailed,false);
 const saved=readArchive(backend.raw!).bundle;assert.ok(saved.run);assert.doesNotThrow(()=>readArchive(session.exportJSON()));
 const copy=new World({race:w.selectedRace,seed:529,sandbox:w.sandbox,waves:false,terrain:w.terrain??false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});copy.restoreRun(saved.run);assert.equal(copy.phase,'reward');assert.equal(copy.rngState,w.rngState);assert.deepEqual(copy.wallet,w.wallet);return copy;
}
for(const id of ['ravager.2','queen.2','baneling.2','ravager.3','lurker.1','hydralisk.2'] as const)for(const equipped of [false,true])test(`checkpoint retains ${id} pending payload, equipment=${equipped}`,async()=>{
 const f=fixture(),{w}=f,area=id==='lurker.1'||id==='hydralisk.2';
 if(equipped){if(area)equip(w,'special.doom.3','offense1');else for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.orange.elite.5',slot,{elite:id});}
 assert.ok(w.start());const u=elite(w,id),target=w.addUnit('roach','zerg',u.x,u.z+1);target.hp=target.maxHp=1e7;u.attackFacing=0;w.hash.rebuild(w.entities.values());
 if(id.startsWith('ravager')){w.expedition.tech.bile=1;u.bileCooldown=0;zergEliteBile(w,u,0);assert.equal(w.zergElites.biles.length,1);if(id==='ravager.3'){tickZergEliteState(w);w.time=w.zergElites.biles[0].impactAt;tickZergEliteState(w);}}
 else if(id==='queen.2'){const patient=w.allies().find(a=>a.id!==u.id)!;patient.x=u.x+1;patient.z=u.z;patient.hp=patient.maxHp/2;u.energy=100;assert.ok(zergEliteQueenAbility(w,u));}
 else {w.fire(u,target);if(id==='hydralisk.2'){w.time=.1;tickWeaponFlights(w,.1);}}
 const before=structuredClone(w.zergElites);assert.ok(before.areas.length+before.biles.length+before.heals.length+before.lines.length);
 // A shop gear change must not make a previously committed effect unsaveable.
 w.endStage();if(equipped&&area)for(const slot of ATTRIBUTE_SLOTS)if(w.starship.account.equipped.zerg[slot])assert.ok(w.unequipItem(slot).ok);
 const copy=await roundTrip(f);assert.deepEqual(copy.zergElites,before);
 const bad=copy.captureRun(),packet=bad.state.zergElites.areas[0]??bad.state.zergElites.biles[0]??bad.state.zergElites.lines[0];
 if(packet)packet.damage+=1;else bad.state.zergElites.heals[0].amount+=1;assert.throws(()=>copy.restoreRun(bad));
});
test('checkpoint preserves an existing elite barrier after maximum life decreases',async()=>{
 const f=fixture(),{w}=f;equip(w,'attribute.4','defense1');w.start();const u=elite(w,'mutalisk.3');
 for(let n=0;n<481;n++){w.time=n/60;tickZergElite(w,u,1/60);}assert.equal(zergEliteCombat(u).charge,1);
 const enemy=w.addUnit('mutalisk','zerg',u.x+3,u.z);enemy.hp=enemy.maxHp=1e7;w.hash.rebuild(w.entities.values());w.fire(u,enemy);
 const barrier=zergEliteCombat(u).barrier;w.endStage();assert.ok(w.unequipItem('defense1').ok);assert.ok(barrier>u.maxHp*.8);
 const copy=await roundTrip(f);assert.equal(copy.entities.get(u.id)!.zergEliteCombat!.barrier,barrier);
 const bad=copy.captureRun();bad.state.entities.get(u.id)!.zergEliteCombat!.barrier*=2;assert.throws(()=>copy.restoreRun(bad),/有限状态越界/);
});
function heroFixture(hero:HeroId,kind:'none'|'normal'|'corrupted',rank=3){const f=fixture(HEROES[hero].race),{w}=f;
 if(kind!=='none')for(const slot of ATTRIBUTE_SLOTS.slice(0,6))equip(w,`set.orange.${kind==='corrupted'?'corrupted_hero':'hero'}.5`,slot,{hero},kind==='corrupted');
 assert.ok(w.start());if(kind==='none')while((w.heroes.get(hero)?.rank??0)<rank)assert.ok(acquireExpeditionHero(w,hero,()=>true));
 const u=w.heroEntity(hero)!;assert.ok(u);u.x=u.z=0;u.prev={x:0,z:0};w.heroes.get(hero)!.skillReady=0;return {...f,u};
}
for(const kind of ['none','normal','corrupted'] as const)test(`Swann ${kind} frozen targets survive gear changes`,async()=>{
 const f=heroFixture('swann',kind),{w}=f;for(let n=0;n<12;n++){const p=w.addUnit('hellion','terran',Math.sin(n)*3,Math.cos(n)*3);p.hp=p.maxHp/2;}
 w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'swann'));const count=w.heroCasts[0].frozenTargets!.length;assert.ok(kind==='corrupted'?count>=12:count===(kind==='none'?7:10));
 w.endStage();for(const slot of ATTRIBUTE_SLOTS)if(w.starship.account.equipped.terran[slot])w.unequipItem(slot);
 const copy=await roundTrip(f);assert.equal(copy.heroCasts[0].frozenTargets!.length,count);
 const bad=copy.captureRun();bad.state.heroCasts[0].frozenTargets!.push({...bad.state.heroCasts[0].frozenTargets![0]});assert.throws(()=>copy.restoreRun(bad),/英雄弹体/);
});
for(const kind of ['none','corrupted'] as const)test(`Niadra ${kind} revival charges persist without duplication`,async()=>{
 const f=heroFixture('niadra',kind,5),{w}=f;w.expedition.familySlots.push('roach');for(let n=0;n<6;n++)w.addUnit('roach','terran',Math.sin(n)*3,Math.cos(n)*3);
 w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'niadra'));assert.equal(w.zergHeroes.revivals[0].charges,kind==='none'?4:5);
 const copy=await roundTrip(f);assert.equal(JSON.stringify(copy.zergHeroes.revivals),JSON.stringify(w.zergHeroes.revivals));
 const bad=copy.captureRun();bad.state.zergHeroes.revivals[0].charges=6;assert.throws(()=>copy.restoreRun(bad),/复生登记/);
});
test('real kill receipts grow a hero above rank five and the active cast round trips',async()=>{
 const f=heroFixture('raynor','normal'),{w,u}=f,source=w.allies().find(a=>!a.heroId)!;let kills=0;
 while(u.rank<6){assert.ok(kills++<20);const e=w.addUnit('zergling','zerg',25,w.nextId%10);e.hp=e.maxHp=1;e.enemyTier='boss';w.hit(e,100,[],1,'terran',0,1,source.id);}
 const target=w.addUnit('roach','zerg',0,3);target.hp=target.maxHp=1e7;w.hash.rebuild(w.entities.values());w.fire(u,target);assert.ok(w.heroAttacks.packets.some(p=>p.rank===6));assert.ok(castExpeditionHero(w,'raynor'));
 const copy=await roundTrip(f);assert.equal(copy.heroCasts.find(c=>c.source===u.id)!.rank,6);assert.equal(copy.heroes.get('raynor')!.rank,6);assert.ok(copy.heroAttacks.packets.some(p=>p.rank===6));
 const bad=copy.captureRun();bad.state.heroCasts[0].rank=Infinity;assert.throws(()=>copy.restoreRun(bad));
});
test('late rescue spawns legitimate temporary zergling pairs which save and restore at intermission',async()=>{
 const w=new World({seed:529,race:'zerg',difficulty:'normal',waves:false,terrain:campaignTerrain(chooseCampaignMap(529)),obstacles:[],equipmentAccount:newEquipmentAccount(529)}),backend=new Backend(),session=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});
 assert.ok(w.start());w.stage=14;w.prepareStage();w.tick=Math.round((w.duration-4)*60);w.time=w.tick/60;w.stageElapsed=w.duration-4;assert.ok(spawnMission(w,'rescue'));
 for(let n=0;n<240;n++)w.step();assert.equal(w.phase,'reward');const escorts=[...w.entities.values()].filter(u=>u.hp>0&&u.temporary&&u.mission?.holdout&&u.pairId);assert.ok(escorts.length>=4);
 const copy=await roundTrip({w,backend,session});assert.deepEqual(copy.missions.active?.rescue,w.missions.active?.rescue);
 for(const mutate of [(u:typeof escorts[number])=>{u.pairId='arbitrary';},(u:typeof escorts[number])=>{u.mission!.taskId='wrong';},(u:typeof escorts[number])=>{u.temporary=false;}]){
  const bad=copy.captureRun();mutate(bad.state.entities.get(escorts[0].id)!);assert.throws(()=>copy.restoreRun(bad),/双生编制/);
 }
});

for(const hero of ['stukov','artanis','nova'] as const)test(`rank-six ${hero} passive receipts survive checkpoint export and restore`,async()=>{
 const f=heroFixture(hero,'normal'),{w,u}=f,source=w.allies().find(a=>!a.heroId)!;let kills=0;
 while(u.rank<6){assert.ok(kills++<20);const e=w.addUnit('zergling','zerg',25,w.nextId%10);e.hp=e.maxHp=1;e.enemyTier='boss';w.hit(e,100,[],1,'terran',0,1,source.id);}
 const target=w.addUnit('roach','zerg',0,1);target.hp=target.maxHp=1e7;w.hash.rebuild(w.entities.values());
 if(hero==='stukov'){zergBeforePrimary(w,u,target);assert.equal(w.zergHeroes.infections[0].rank,6);}
 if(hero==='artanis'){source.shield=0;assert.ok(castExpeditionHero(w,hero));assert.equal(w.protossHeroes.shields[0].rank,6);}
 if(hero==='nova'){w.fire(u,target);w.time=.2;tickHeroAttacks(w);assert.ok(w.heroAttacks.dots.some(d=>d.rank===6));}
 const copy=await roundTrip(f);assert.equal(copy.heroes.get(hero)!.rank,6);
 if(hero==='stukov')assert.deepEqual(copy.zergHeroes.infections,w.zergHeroes.infections);
 if(hero==='artanis')assert.deepEqual(copy.protossHeroes.shields,w.protossHeroes.shields);
 if(hero==='nova')assert.equal(copy.heroAttacks.dots[0].rank,6);
});

test('gear-raised ordinary zergling ranks remain legal in their pair checkpoint',async()=>{
 const f=fixture(),{w}=f;for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.orange.survivor.5',slot);w.start();assert.equal(w.soldierCap('zergling'),8);
 for(let n=0;n<100&&w.ordinaryUnits('zergling').some(u=>u.rank<8);n++)w.reinforce('zergling',{x:n%10,z:Math.floor(n/10)});
 assert.ok(w.expedition.zerglingPairs.some(p=>p.rank===8));const copy=await roundTrip(f);assert.equal(Math.max(...copy.expedition.zerglingPairs.map(p=>p.rank)),8);
 const bad=copy.captureRun();bad.state.expedition.zerglingPairs[0].rank=1.5;assert.throws(()=>copy.restoreRun(bad),/双生编制/);
});

for(const kind of ['niadra','reaper'] as const)test(`rank-eight ordinary bodies remain valid in ${kind} frozen receipts`,async()=>{
 const f=fixture(kind==='niadra'?'zerg':'terran'),{w}=f,family=kind==='niadra'?'roach':'reaper';
 for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.orange.survivor.5',slot);w.start();w.expedition.familySlots.push(family);
 for(let n=0;n<100&&(w.familySeatCount(family)<w.familyCap(family)||w.ordinaryUnits(family).some(u=>u.rank<8));n++)w.reinforce(family,{x:n%10,z:Math.floor(n/10)});
 const member=w.ordinaryUnits(family).find(u=>u.rank===8)!;assert.ok(member);
 if(kind==='niadra'){assert.ok(acquireExpeditionHero(w,'niadra',()=>true));const hero=w.heroEntity('niadra')!;hero.x=member.x;hero.z=member.z;w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'niadra'));assert.ok(w.zergHeroes.revivals[0].seats.some(s=>s.members.some(u=>u.rank===8)));}
 else {const hunter=w.addUnit('reaper','terran',member.x,member.z);hunter.eliteId='reaper.3';hunter.modelKey=ELITES['reaper.3'].model;w.refreshStats(hunter,true);assert.ok(absorbReaper(w,hunter,member));assert.equal(w.terranElites.absorptions.at(-1)!.rank,8);}
 const copy=await roundTrip(f);assert.equal(JSON.stringify(kind==='niadra'?copy.zergHeroes.revivals:copy.terranElites.absorptions),JSON.stringify(kind==='niadra'?w.zergHeroes.revivals:w.terranElites.absorptions));
 const bad=copy.captureRun();if(kind==='niadra')bad.state.zergHeroes.revivals[0].seats[0].members[0].rank=1.5;else bad.state.terranElites.absorptions[0].rank=Infinity;assert.throws(()=>copy.restoreRun(bad));
});
