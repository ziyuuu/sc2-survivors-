import type {boot} from '../src/app/bootstrap';
import {grantEquipment,equip,cleanseEquipment,newEquipmentAccount} from '../src/simulation/starship/inventory';
import type {EquipmentAccount,EquipmentSlot} from '../src/simulation/starship/types';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {equipmentPresentationReceipts} from '../src/simulation/starship/presentation';
import {createEquipmentProjections} from '../src/simulation/starship/projections';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import {tickEquipmentCombat} from '../src/simulation/starship/combat';
import {tickEquipmentControls} from '../src/simulation/starship/controls';
import {tickEquipmentSupport} from '../src/simulation/starship/support';
import {activeEquipmentEffects} from '../src/simulation/starship/modules';
import {HEROES,type HeroId} from '../src/data/heroes';
import {castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {tickEquipmentHeroes} from '../src/simulation/starship/hero-advancements';
import {tickZergHeroState} from '../src/simulation/combat/zerg-hero-passives';
import {tickProtossHeroState} from '../src/simulation/combat/protoss-hero-passives';
import {tickEquipmentFortifications} from '../src/simulation/starship/fortifications';
import type {Race} from '../src/data/races';

export function equipmentEffectsLoadout(account:EquipmentAccount){
 for(const race of ['terran','zerg','protoss'] as const){
  const put=(template:string,slot:EquipmentSlot)=>{const t=EQUIPMENT_TEMPLATES[template],r=grantEquipment(account,{template,race,slot,polluted:t.pollution==='required'},`fx-lab:${race}:${slot}`,{kind:'warehouse'});if(!r.ok)throw Error(r.error);if(r.value.pollution==='uncleansed'){account.dust=10000;const c=cleanseEquipment(account,r.value.id);if(!c.ok)throw Error(c.error);}const e=equip(account,race,r.value.id,slot);if(!e.ok)throw Error(e.error);};
  for(const slot of ATTRIBUTE_SLOTS.slice(0,4))put('set.advanced.phantom.4',slot);
  for(const slot of ATTRIBUTE_SLOTS.slice(4))put('set.advanced.scorched.4',slot);
  put('module.konstant.4','control');put('module.incendiary.4','support');
 }
}
/** Deliberate diagnostic fixtures, never enabled by the formal entry point. */
export function installEquipmentEffectsLab(app:Awaited<ReturnType<typeof boot>>){
 const {world:w,view,hud,readiness}=app;
 const native=()=> (window as any).__DIFFICULTY_R2__;
 const prepare=async()=>{w.changed();await readiness.prepare('reinforcement');if(readiness.state.phase==='error')throw Error(readiness.state.error??'Preparation failed');view.render(0,1);hud.update();};
 const summary=()=>({time:w.time,tick:w.tick,rng:w.rngState,phase:w.phase,receipts:equipmentPresentationReceipts(w),burnZones:w.starship.burnZones,bodies:[...w.entities.values()].map(u=>({id:u.id,type:u.unitType,hp:u.hp,x:u.x,z:u.z,deadAt:u.deadAt,temporary:u.temporary})),projections:[...w.starship.projections].map(([id,p])=>({id,kind:p.kind,until:p.until,hp:w.entities.get(id)?.hp})),render:view.report()});
 const fixture=async(birthOnly=false)=>{
  native().freeze();for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);w.hive=null;w.expansionHives.clear();w.pods=[];w.swarm.pending=[];w.effects=[];w.visualEvents=[];w.weaponFlights=[];w.paused=false;
  const u=w.allies().find(u=>!u.heroId&&!u.summonKind)!,point=w.freePosition('zergling',{x:u.x+2,z:u.z+3},0,4);if(!point)throw Error('No fixture landing');
  const target=w.addUnit('zergling','zerg',point.x,point.z);target.hp=target.maxHp=1e6;target.armor=0;w.starship.account.rng=1;u.shotInterval=u.attackPeriod;w.fire(u,target);
  if(!w.starship.projections.size)throw Error('Native phantom attack did not commit');
  const carrierPoint=w.freePosition('carrier',{x:w.anchor.x-6,z:w.anchor.z},0,6);if(!carrierPoint)throw Error('No carrier landing');const carrier=w.addUnit('carrier','terran',carrierPoint.x,carrierPoint.z);initializeCarrierSubsystem(w);createEquipmentProjections(w,carrier,1,'phase',30,.5,.5);
  if(birthOnly){w.time+=.35;view.setCameraMode('fixed');view.setCameraPitch(50);view.setCameraZoom(.9);await prepare();return summary();}
  // A real due equipment cycle resolves against a real engagement target.
  w.time+=20;w.tick+=1200;u.attackTarget=target.id;tickEquipmentCombat(w);tickEquipmentSupport(w);
  const victim=w.allies().find(v=>v.id!==u.id&&!v.heroId&&!v.summonKind&&!v.temporary)!;if(victim){w.rngState=1;w.hit(victim,1e9,[],1,'zerg',0,1,target.id);}
  w.time+=.35;view.setCameraMode('fixed');view.setCameraPitch(50);view.setCameraZoom(.9);w.announce('装备表现诊断 · 人工布置／跳时 · 非自然对局');await prepare();return summary();
 };
 const sample=async(seconds:number)=>{native().freeze();w.time+=seconds;w.tick+=Math.round(seconds*60);tickEquipmentControls(w);view.render(0,1);hud.update();return summary();};
 const heroFixture=async(hero:HeroId,polluted=false)=>{
  native().freeze();w.resetRun();w.starship.account=newEquipmentAccount(529);w.selectRace(HEROES[hero].race);view.resetRun();
  const account=w.starship.account;
  for(const slot of ATTRIBUTE_SLOTS.slice(0,6)){const granted=grantEquipment(account,{template:`set.orange.${polluted?'corrupted_hero':'hero'}.5`,race:HEROES[hero].race,slot,binding:{hero},polluted},`hero-fx:${hero}:${slot}`,{kind:'warehouse'});if(!granted.ok)throw Error(granted.error);if(polluted){account.dust=1e6;const result=cleanseEquipment(account,granted.value.id);if(!result.ok)throw Error(result.error);}const result=w.equipItem(granted.value.id,slot);if(!result.ok)throw Error(result.error);}
  if(!w.start())throw Error('Hero fixture start rejected');const u=w.heroEntity(hero);if(!u)throw Error('Bound hero did not enter');
  for(const [id,body] of w.entities)if(body.owner==='zerg'||body.heroId&&id!==u.id)w.entities.delete(id);w.hive=null;w.expansionHives.clear();w.pods=[];w.swarm.pending=[];w.effects=[];w.visualEvents=[];w.weaponFlights=[];w.paused=false;w.heroCasts=[];
  const cx=w.anchor.x,cz=w.anchor.z;u.x=cx;u.z=cz;u.prev={x:cx,z:cz};w.heroes.get(hero)!.skillReady=0;
  for(let i=0;i<5;i++){const p=w.freePosition('zergling',{x:cx+(i-2)*.65,z:cz+3.5},0,2);if(!p)throw Error('Hero fixture target landing');const e=w.addUnit('zergling','zerg',p.x,p.z);e.hp=e.maxHp=1e8;e.armor=0;e.shield=e.maxShield=0;if(hero==='nova'&&!polluted&&i===0)e.hp=1;}
  if(hero==='swann')for(let i=0;i<12;i++){const p=w.freePosition('tank',{x:cx+Math.sin(i)*3,z:cz+Math.cos(i)*3},0,2);if(p){const a=w.addUnit('tank','terran',p.x,p.z);a.hp=1;}}
  initializeCarrierSubsystem(w);w.hash.rebuild(w.entities.values());const polygon=[{x:cx-30,z:cz-30},{x:cx+30,z:cz-30},{x:cx+30,z:cz+30},{x:cx-30,z:cz+30}],battleView={ground:polygon,air:polygon,occludedGround:[],occludedAir:[]};w.starship.battleView=()=>battleView;
  view.setCameraMode('fixed');view.setCameraPitch(50);view.setCameraZoom(.9);await prepare();
  if(!castExpeditionHero(w,hero,battleView))throw Error('Native skill rejected: '+hero);view.render(0,1);return {...summary(),hero,polluted,targets:[...w.entities.values()].filter(e=>e.owner==='zerg').map(e=>({id:e.id,hp:e.hp})),equipment:activeEquipmentEffects(w).map(e=>({key:e.key,values:e.values}))};
 };
 const heroAdvance=async(until:number)=>{native().freeze();while(w.time<until-1e-8){w.time=Math.min(until,w.time+1/60);w.tick++;resolveExpeditionHeroCasts(w);tickEquipmentHeroes(w);tickZergHeroState(w);tickProtossHeroState(w);if(w.tick%4===0)view.render(0,1);}await prepare();return {...summary(),casts:w.heroCasts.map(c=>({id:c.id,hero:c.hero,at:c.at,point:c.point})),jobs:w.starship.hero.jobs.map(j=>({kind:j.kind,at:j.at,until:j.until})),targets:[...w.entities.values()].filter(e=>e.owner==='zerg').map(e=>({id:e.id,hp:e.hp})),protected:[...w.entities.values()].filter(e=>(e.heroCombat?.protectedUntil??0)>w.time).map(e=>e.id)};};
 const fortFixture=async(race:Race)=>{
  native().freeze();w.resetRun();w.starship.account=newEquipmentAccount(529);w.selectRace(race);view.resetRun();
  for(const slot of ATTRIBUTE_SLOTS.slice(0,4)){const g=grantEquipment(w.starship.account,{template:'set.advanced.bunker.4',race,slot},`fort:${race}:${slot}`,{kind:'warehouse'});if(!g.ok)throw Error(g.error);if(!w.equipItem(g.value.id,slot).ok)throw Error('Fort equipment rejected');}
  await view.prepareNewRunAssets(race,null);if(!w.start()||w.starship.forts.size!==5)throw Error('Native fort deployment did not commit');for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);w.hive=null;w.expansionHives.clear();w.pods=[];w.swarm.pending=[];w.paused=false;
  for(const id of w.starship.forts.keys()){const fort=w.fortifications.get(id)!;if(fort.kind==='cover')continue;const p=w.freePosition('zergling',{x:fort.x,z:fort.z+3},0,3);if(!p)throw Error('Fort target landing');const target=w.addUnit('zergling','zerg',p.x,p.z);target.hp=target.maxHp=1e6;}
  w.hash.rebuild(w.entities.values());await prepare();tickEquipmentFortifications(w,0);w.time+=.05;w.tick+=3;view.setCameraMode('fixed');view.setCameraPitch(50);view.setCameraZoom(.9);view.render(0,1);return {...summary(),forts:[...w.fortifications.values()]};
 };
 const fortDeath=()=>{for(const id of w.starship.forts.keys()){const fort=w.fortifications.get(id);if(fort?.hp)w.hit(fort,1e9,[],1,'zerg',0,1);}w.time+=.2;w.tick+=12;view.render(0,1);return summary();};
 const eggFixture=async()=>{
  if(w.phase!=='battle')throw Error('请先开始一局，再观察虫卵');
  native().freeze();for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);w.hive=null;w.expansionHives.clear();w.pods=[];w.swarm.pending=[];w.economicTargets.clear();w.effects=[];w.visualEvents=[];w.weaponFlights=[];
  const egg=w.spawnEconomic('egg',{x:w.anchor.x,z:w.anchor.z+2});
  view.setCameraMode('fixed');view.setCameraPitch(50);view.setCameraZoom(1.6);w.announce('紫色救援虫卵 · 外观预览 · 保留工人救援规则');await prepare();
  return {egg:{...egg},workers:w.workers,time:w.time,rng:w.rngState};
 };
 (window as any).__EQUIPMENT_EFFECTS__={...app,fixture,sample,heroFixture,heroAdvance,fortFixture,fortDeath,eggFixture,summary,effects:()=>activeEquipmentEffects(w)};
}
