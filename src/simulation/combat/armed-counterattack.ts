import {armedProcChance} from './armed-procs';
import {ARMED_CARD_BY_ID as C} from '../../data/terran-armed-support';
import {HEROES,HERO_IDS_BY_RACE,type HeroId} from '../../data/heroes';
import {SIEGE} from '../../data/sc2-units';
import {PLAYER_COMBAT_FACTOR} from '../../data/player-unit-adaptations';
import {rankStats} from '../../data/ranks';
import {armedRank} from '../progression/build-progress';
import {worldContent} from '../progression/run-content';
import {heroModelReady,refreshExpeditionHero,castEquipmentHero} from './expedition-heroes';
import {commitArmedNuke,armedNukeTargets} from './armed-nukes';
import {armedFormalFree,armedStageKey} from './armed-support';
import {equipmentCardDamage} from '../starship/card-effects';
import {grantArmedShield} from './armed-fields';
import type {ArmedFormalLoss} from './armed-support-state';
import type {HeroRecord} from '../types';
import type {World} from '../world';

export interface ArmedCounterattack {
 losses:ArmedFormalLoss[];
 invulnerableUntil:number;
 activation?:{id:number;stageKey:string;startedTick:number;finished:boolean;targets:{id:number;generation:number}[];losses:ArmedFormalLoss[];hero:HeroId;heroPending:boolean};
 temporaryHero?:HeroRecord;
}
export function counterHeroCandidates(heroes?:readonly HeroId[]){const planned=heroes?.filter(id=>HEROES[id].race==='terran'&&heroModelReady(id));return planned?.length?planned:HERO_IDS_BY_RACE.terran.filter(heroModelReady);}
export function armedCounterHeroPool(w:World){return counterHeroCandidates(worldContent(w)?.heroes);}
export function armedCounterLoss(w:World,loss:ArmedFormalLoss){if(!armedRank(w.expedition.support,'O01'))return;const a=w.expedition.support.armed!,c=a.counter??={losses:[],invulnerableUntil:0};if(c.losses.length<C.O01.params.deaths)c.losses.push({...loss});beginCounterattack(w);}
function beginCounterattack(w:World){const a=w.expedition.support.armed!,c=a.counter,p=C.O01.params;if(!c||c.losses.length<p.deaths||w.tick<(a.readyTick.O01??0)||c.activation&&!c.activation.finished)return false;if(w.random()>=armedProcChance('O01'))return false;const pool=armedCounterHeroPool(w);if(!pool.length)return false;
 const id=a.nextCast++,targets=armedNukeTargets(w).sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id),hero=pool[Math.min(pool.length-1,Math.floor(w.random()*pool.length))],startedTick=w.tick,losses=c.losses.splice(0,p.deaths);
 c.activation={id,stageKey:armedStageKey(w),startedTick,finished:false,targets:targets.map(e=>({id:e.id,generation:e.bornAt})),losses,hero,heroPending:false};c.invulnerableUntil=w.tick+p.invulnerable*60;a.readyTick.O01=w.tick+p.cd*60;
 for(const u of w.allies())w.visual('barrier-start',u);
 if(targets.length){commitArmedNuke(w,'O01',targets[0]);const factor=rankStats(5).damage*PLAYER_COMBAT_FACTOR*p.tankFactor;a.volleys.push({id,cardId:'O01',stageKey:armedStageKey(w),nextIndex:0,shots:Array.from({length:p.tankCount},(_,i)=>({tick:startedTick+p.tankTick,point:{x:targets[0].x+(i-2)*SIEGE.splash.at(-1)!.radius,z:targets[0].z},damage:equipmentCardDamage(w,SIEGE.damage*factor),bonuses:SIEGE.bonus.map(b=>({...b,amount:equipmentCardDamage(w,b.amount*factor)})),radius:SIEGE.splash.at(-1)!.radius,splash:SIEGE.splash.map(b=>({...b})),kind:'siege'}))});}
 return true;
}
function spawnCounterHero(w:World){const a=w.expedition.support.armed!,c=a.counter!,activation=c.activation!,p=C.O01.params;if(!activation.heroPending)return;const h=HEROES[activation.hero],position=w.freePosition(h.baseFamily,w.anchor);if(!position)return;activation.heroPending=false;
 const u=w.addUnit(h.baseFamily,'terran',position.x,position.z,p.heroRank);u.heroId=activation.hero;u.modelKey=h.model;u.temporary=true;u.temporaryKind='armed';u.temporaryUntil=w.time+p.heroLife;u.armed={cardId:'O01',castId:activation.id,deploymentId:u.id,hpFactor:1};refreshExpeditionHero(w,u,true);c.temporaryHero={id:activation.hero,rank:p.heroRank,entityId:u.id,skillReady:w.time,revivePaid:false,awaitingSpawn:false};grantArmedShield(w,u,'O01',Math.max(p.shieldMin,u.maxHp*p.shield),w.tick+p.shieldLife*60);w.visual('pod-open',u);
}
export function tickArmedCounterattack(w:World){const a=w.expedition.support.armed,c=a?.counter;if(!a||!c||!armedRank(w.expedition.support,'O01'))return;const activation=c.activation,p=C.O01.params;
 if(activation&&activation.stageKey===armedStageKey(w)&&!activation.finished&&w.tick>=activation.startedTick+p.finishTick){
  // Commit the phase before deaths/drop handlers, so re-entry cannot clear twice.
  activation.finished=true;activation.heroPending=true;
  for(const snapshot of activation.targets){const enemy=w.entities.get(snapshot.id);if(!enemy||enemy.hp<=0||enemy.bornAt!==snapshot.generation)continue;
   const source={...enemy,id:0,unitType:'thor' as const,heroId:undefined,eliteId:undefined,owner:'terran' as const,race:'terran' as const,team:'player' as const,x:w.anchor.x+(snapshot.id%3-1)*2,z:w.anchor.z,flying:false,rank:5,mode:'tank' as const};w.visual('attack',source,enemy,activation.id);w.hit(enemy,1e100,[],1,'terran',0,1,0);w.visual('projectile-impact',source,enemy,activation.id,undefined,{supportSound:'thor-ground'});
  }
  let refilled=0;for(const loss of activation.losses){if(refilled>=p.refill||!w.expedition.familySlots.includes(loss.family)||armedFormalFree(w,loss.family)<=0)continue;const position=w.freePosition(loss.family,w.anchor);if(!position)continue;w.addFamilyMember(loss.family,position,loss.rank);refilled++;}
  for(const u of w.allies())if(!u.summonKind)grantArmedShield(w,u,'O01',Math.max(p.shieldMin,u.maxHp*p.shield),w.tick+p.shieldLife*60);
 }
 if(activation?.stageKey===armedStageKey(w))spawnCounterHero(w);
 const record=c.temporaryHero,u=record?.entityId? w.entities.get(record.entityId):undefined;if(record&&u?.hp&&u.heroId===record.id&&u.armed?.cardId==='O01')castEquipmentHero(w,u,record);
}
