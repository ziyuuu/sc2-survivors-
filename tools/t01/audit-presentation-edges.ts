/** Native read-only diagnostic fixtures for paths outside the ordinary audio matrix. */
import fs from 'node:fs';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {CombatAudioRouter,weaponSoundKey} from '../../src/render/effects/combat-audio-router';
import {equipmentPresentation,equipmentPresentationReceipts,type EquipmentPresentationKind} from '../../src/simulation/starship/presentation';
import {equipmentEffectRequests} from '../../src/render/effects/equipment-effects';
import {makeMissionBody} from '../../src/simulation/missions/runtime';
import {callFleet,tickFleetCall} from '../../src/simulation/missions/fleet';
import {tickWeaponFlights} from '../../src/simulation/combat/weapon-flight';
import {createEquipmentProjections,retireEquipmentProjection} from '../../src/simulation/starship/projections';
import {SOUND_DATA} from '../../src/render/effects/audio-source-data';
import type {MissionRecord} from '../../src/simulation/missions/state';
import type {VisualEvent} from '../../src/simulation/types';
import {Scene} from 'three';
import {ApprovedGunEffects} from '../../src/render/effects/confirmed-hero/approved-gun-effects';
import {fleetGunWorld} from '../../src/render/effects/mission-feedback';
import {TERRAN_HERO_IDS} from '../../src/data/terran-heroes';

const fresh=()=>{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});w.entities.clear();w.visualEvents=[];w.phase='battle';w.paused=false;w.starship.enabled=true;w.anchor={x:0,z:0,facing:0};return w;};
const compact=(w:World,r:CombatAudioRouter)=>{const f=r.update(w);return {at:w.time,cues:f.cues.map(c=>c.bank),channels:f.channels.map(c=>c.bank),mechanics:{tick:w.tick,nextId:w.nextId,stats:w.stats,entities:[...w.entities.values()].map(u=>({id:u.id,type:u.unitType,hp:u.hp,maxHp:u.maxHp,shield:u.shield,damage:u.weaponDamage,cooldown:u.weaponCooldown,ready:u.nextShotAt,deadAt:u.deadAt,x:u.x,z:u.z})),flights:w.weaponFlights.map(p=>({id:p.id,target:p.target,damage:p.damage,hits:p.hits,start:p.start,point:{...p.point}})),missionBodies:[...w.missions.bodies.values()].map(b=>({id:b.id,hp:b.hp,resolved:b.resolved})),fleet:{cooldown:w.missions.fleet.cooldown,flights:w.missions.fleet.flights.map(f=>({source:f.source.id,target:f.target,at:f.at})),ships:[...w.missions.fleet.ships]}},events:w.visualEvents.map(e=>({kind:e.kind,unitType:e.unitType,heroId:e.heroId,modelKey:e.modelKey,castId:e.castId,sound:e.supportSound,missionDeath:e.missionDeath}))};};
const equipment:any[]=[];
const kinds:EquipmentPresentationKind[]=['projection-birth','projection-end','boost-start','boost-end','recall-from','recall-to','rewind','capture','evolve','reinforcement','expiry','fort-deploy','fort-shot','fort-end','derived-hit','hero-extra','growth','cooldown-reset','heal'];
for(const kind of kinds){const w=fresh(),r=new CombatAudioRouter(),u=w.addUnit('marine','terran',0,0),t=w.addUnit('roach','zerg',3,0);r.resumeAt(w);equipmentPresentation(w,kind,u,t,'turret_terran',2);equipment.push({kind,fx:equipmentEffectRequests(w,()=>0).map(q=>q.model),...compact(w,r),note:kind==='fort-shot'?'Isolated receipt; normal fort attack audio is separately owned by w.effects.':undefined});}
const missionDeaths:any[]=[];
for(const [role,model,owner]of [['worker','scv','terran'],['worker','drone','terran'],['worker','probe','terran'],['hive','hatchery','zerg'],['repair','factory','terran'],['egg','egg','zerg']]as const){
 const w=fresh(),r=new CombatAudioRouter(),m={id:'audit',kind:role==='worker'?'escort':role==='hive'?'hives':role==='egg'?'eggs':'repair',phase:'active',stage:10,age:0,bodyIds:[],enemyIds:[],queue:[],progress:0,completed:0,total:1,nextSpawn:0,receipts:[]} as MissionRecord;w.missions.active=m;
 const b=makeMissionBody(w,m,role,{x:0,z:0},2,model,owner,.6),enemy=w.addUnit('zergling',owner==='terran'?'zerg':'terran',1,0);enemy.mission={taskId:m.id,sourceId:0,noLoot:true,escortOnly:role==='worker',pulse:false,nextAction:0};r.resumeAt(w);w.hit(b,100,[],1,enemy.owner,0,1,enemy.id);
 const e=w.visualEvents.find(e=>e.kind==='death');missionDeaths.push({role,model,hp:b.hp,resolved:b.resolved,...compact(w,r),eligibleUnitCorpse:!!e?.unitType,eligibleMissionEgg:e?.missionDeath==='egg'});
}
const w=fresh(),r=new CombatAudioRouter();w.missions.fleet.unlocked=true;const called=callFleet(w,{x:0,z:0});w.tick++;w.time=w.tick/60;tickFleetCall(w);w.missions.fleet.pending=null;const ship=[...w.entities.values()].find(u=>u.mission?.fleet)!,target=w.addUnit('roach','zerg',ship.x+3,ship.z);target.hp=target.maxHp=1e7;r.resumeAt(w);w.fire(ship,target);const fleet:any={called,unitHeroId:ship.heroId,weaponSoundKey:weaponSoundKey(ship),weaponProfile:!!SOUND_DATA.weapons[weaponSoundKey(ship)],attack:compact(w,r),flights:w.weaponFlights.length,heroPackets:w.heroAttackEvents.length};
// ConfirmedHeroEffects constructs an AttackEffects/ApprovedGunEffects per Terran hero,
// and every instance receives fleetGunWorld(w). No GPU or raster output is asserted.
w.time+=.02;const drawRows:any[]=[];for(const hero of TERRAN_HERO_IDS){let emitted=0;const gun=new ApprovedGunEffects(new Scene(),{heroQuality:'full',emit(){emitted++;}}as any);gun.render(fleetGunWorld(w,hero),()=>true,new Map());drawRows.push({owner:hero,cores:gun.stats.flights,segments:gun.segments.size,emitted});}fleet.renderSubmissions=drawRows;
w.time+=.18;w.tick+=12;tickWeaponFlights(w,.2);fleet.impact=compact(w,r);
r.resumeAt(w);const state=w.missions.fleet.ships.get(ship.id)!;state.ready=w.tick;tickFleetCall(w);fleet.skillCharge=compact(w,r);w.tick=state.cast!.at;w.time=w.tick/60;tickFleetCall(w);fleet.skillLaunch=compact(w,r);w.tick=w.missions.fleet.flights[0].at;w.time=w.tick/60;tickFleetCall(w);fleet.skillImpact=compact(w,r);
const plainEvents:any[]=[];
for(const kind of ['pod-land','pod-open','pod-destroy','egg-expired','drone-death','hero-hatch','hero-essence','hero-revive','queen-inject','squad-transfer']as VisualEvent['kind'][]){const w=fresh(),r=new CombatAudioRouter(),u=w.addUnit('marine','terran',0,0);r.resumeAt(w);w.visual(kind,u);plainEvents.push({kind,...compact(w,r),scope:'Isolated event route; passive/native fixture scope must be considered before calling absence a bug.'});}
const p=fresh(),pr=new CombatAudioRouter(),source=p.addUnit('marine','terran',0,0);pr.resumeAt(p);const clone=createEquipmentProjections(p,source,1,'phantom',8,.5,.5)[0];const projection:any={created:!!clone,birth:compact(p,pr)};if(clone){retireEquipmentProjection(p,clone.id);projection.retire={hp:clone.hp,deadAt:clone.deadAt,fx:equipmentEffectRequests(p,()=>0).map(q=>q.model),receipts:equipmentPresentationReceipts(p).map(e=>e.kind),...compact(p,pr)};}
const expiry:any[]=[];for(const kind of ['fun-brood','hero-baneling']as const){const w=fresh(),r=new CombatAudioRouter(),u=w.addUnit(kind==='fun-brood'?'zergling':'baneling','terran',0,0);u.temporary=true;u.temporaryKind=kind;w.time=1;u.temporaryUntil=w.time;const method=(w as any).updateUnit; r.resumeAt(w);if(method)method.call(w,u,1/60);expiry.push({kind,methodAvailable:!!method,exists:w.entities.has(u.id),hp:u.hp,...compact(w,r)});}
const funDeaths:any[]=[];for(const [type,model]of [['roach','fun-nydus'],['marine','fun-infested-marine'],['marine','fun-infested-marine.timeout'],['queen','fun-cocoon']]as const){const w=fresh(),r=new CombatAudioRouter(),u=w.addUnit(type,'zerg',0,0);u.modelKey=model;r.resumeAt(w);w.hit(u,1e6,[],1,'terran',0,1);funDeaths.push({model,...compact(w,r)});}
const result={equipment,missionDeaths,fleet,plainEvents,projection,expiry,funDeaths};fs.writeFileSync('.cache/t01-full-audit-20261026/edges.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
