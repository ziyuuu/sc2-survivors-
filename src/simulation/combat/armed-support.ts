import {takeArmedProc,hasArmedProc} from './armed-procs';
import {armedTargetAllowed} from './armed-targets';
import {raiderEntryClearance} from './armed-raiders';
import {tickArmedCounterattack} from './armed-counterattack';
import {tickArmedCoordination,tickArmedCalibration,tickArmedHandoffs,armedBlockade} from './armed-nodes';
import {planetaryReady,tickArmedPlanetary} from './armed-planetary';
import {prepareArmedFleet} from './armed-fleet-dispatch';
import {ARMED_CARD_BY_ID,ARMED_RULES} from '../../data/terran-armed-support';
import {SIEGE,SC2_UNITS,type UnitType} from '../../data/sc2-units';
import {PLAYER_COMBAT_FACTOR} from '../../data/player-unit-adaptations';
import {TUNING} from '../../data/game';
import {rankStats} from '../../data/ranks';
import {hitFrom} from '../observation';
import {equipmentCardDamage} from '../starship/card-effects';
import {castTactical} from './unique-support';
import {buySupport,supportLegal} from './shop-support';
import {newArmedSupport,type ArmedDeployment,type ArmedPassenger,type ArmedShot} from './armed-support-state';
import {LEGACY_ARMED,armedOrangeEligible,armedRank,armedPurchaseLegal,recordArmedPurchase,prepareBuildChoices,armedNodeLegal,type ArmedId} from '../progression/build-progress';
import {validCarrierLanding} from '../movement/carrier-landing';
import {translate} from '../movement/steering';
import {waitingBodySeats} from '../expedition-production';
import {armedNukeTargets,commitArmedNuke} from './armed-nukes';
import {armedFireModifiers} from './armed-modifiers';
import {prepareArmedPassengers,applyArmedPassenger,armedTemporaryUsed} from './armed-reinforcements';
import {isG02Bunker} from './armed-origins';
import {armedFortCard,landArmedFort,tickArmedFortAuras,tickArmedFortActions} from './armed-fortifications';
import {equipmentCardTotals} from '../starship/card-effects';
import {planArmedField,planArmedBarrage} from './armed-fire-plan';
import {armedOpenPoint} from './armed-nukes';
import {armedMemberCard,armedIndividualCard,prepareArmedMemberBatch} from './armed-member-dispatch';
import {armedFieldCard,prepareArmedField,tickArmedFields,armedItemModifiers} from './armed-fields';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';

/** Added only when an executor is connected; unfinished candidates are never sold. */
const implemented=new Set<ArmedId>(['N06','N07','N08','N09','O01','O03','B06','O02','W06','W07','W08','W09','G04','G06','G09','B02','P03','P04','W01','W02','W03','W04','W05','G01','G02','G03','G05','G07','G08','B01','B03','B04','B05','B07','B08','B09','P01','P02','P05','P06','N01','N02','N03','N04','N05']);
export const armedStageKey=(w:World)=>`${w.runId}:${w.endless?'endless:'+w.endless.round:w.stage}`;
export function armedRuntimeReady(w:World,id:ArmedId){return w.expedition.race==='terran'&&implemented.has(id);}
export function armedOfferLegal(w:World,id:ArmedId){
 if(!armedRuntimeReady(w,id)||!(id.startsWith('O')?armedOrangeEligible(w.expedition):armedPurchaseLegal(w.expedition.support,id)))return false;
 const legacy=LEGACY_ARMED[id as keyof typeof LEGACY_ARMED];return !legacy||supportLegal(w,legacy);
}
export function applyArmedPurchase(w:World,id:ArmedId,offerId:string){
 if(!armedOfferLegal(w,id))return false;
 const s=w.expedition,a=s.support.armed,previous=armedRank(s.support,id);
 if(a?.purchases.some(p=>p.offerId===offerId))return false;
 const legacy=LEGACY_ARMED[id as keyof typeof LEGACY_ARMED];if(legacy&&!buySupport(w,legacy))return false;
 s.support.armed??=newArmedSupport();recordArmedPurchase(s,id,offerId,previous);
 prepareBuildChoices(s,w.random,id=>armedRuntimeReady(w,id));return true;
}
export function pendingBuildChoice(w:World){
 const b=w.expedition.build;
 if(w.phase!=='reward'||!b||b.main&&b.main!=='armed')return;
 const m=b.milestones.find(m=>m.branch==='armed'&&!m.claimed);
 if(m?.offers.length===2&&m.deferredWindow!==w.expedition.draftWindow)return m;
}
export function deferBuildChoice(w:World,id:string,revision:number){const m=pendingBuildChoice(w);if(!m||m.id!==id||w.expedition.shopRevision!==revision)return false;m.deferredWindow=w.expedition.draftWindow;w.expedition.shopRevision++;w.changed();return true;}
export function prepareArmedChoices(w:World){prepareBuildChoices(w.expedition,w.random,id=>armedRuntimeReady(w,id));}
export function claimBuildChoice(w:World,milestoneId:string,revision:number,id:ArmedId){
 const s=w.expedition,b=s.build,m=b?.milestones.find(m=>m.id===milestoneId);
 if(w.phase!=='reward'||s.shopRevision!==revision||!b||!m||pendingBuildChoice(w)!==m||m.claimed||!m.offers.includes(id)||!armedRuntimeReady(w,id)||!armedNodeLegal(s,id))return false;
 const a=s.support.armed??=newArmedSupport();if(armedRank(s.support,id))a.nodeReserves[id]=(a.nodeReserves[id]??0)+1;else a.ranks[id]=1;
 m.claimed=id;
 if(b.main===null){b.main=m.branch;b.milestones=b.milestones.filter(other=>other.branch===b.main);}
 s.shopRevision++;prepareBuildChoices(s,w.random,id=>armedRuntimeReady(w,id));w.changed();return true;
}
export function armedTrainingSeconds(w:World,seconds:number,baseSeconds=seconds){
 const rank=armedRank(w.expedition.support,'W03');if(!rank)return seconds;
 return Math.min(seconds,Math.max(seconds*ARMED_CARD_BY_ID.W03.params.timeFactor[rank-1],baseSeconds*ARMED_CARD_BY_ID.W03.params.floor));
}
export function armedFormalReservations(w:World,f:UnitType){return w.expedition.support.armed?.deployments.reduce((n,d)=>n+(d.phase==='ended'?0:d.passengers.filter(p=>p.formal&&p.family===f&&p.entityId===null&&!p.cancelled).length),0)??0;}
export function armedFormalFree(w:World,f:UnitType){return Math.max(0,w.familyMemberCap(f)-w.familySeatCount(f)-waitingBodySeats(w,f,f==='zergling'?2:1)-armedFormalReservations(w,f));}
const node=(w:World,id:ArmedId)=>armedRank(w.expedition.support,id)>0;
function supportBody(d:ArmedDeployment):Body{return {id:d.id,...d.point,hp:d.hp,maxHp:d.maxHp,armor:d.armor,unitRadius:d.radius,owner:'terran',race:'terran',team:'player',flying:false,attributes:['Mechanical','Structure']};}
function landingPoint(w:World,origin:Point,id?:number,radius=1.25,reserved:readonly Point[]=[],accept?:(p:Point)=>boolean){
 const facing=Math.atan2(w.anchor.x-origin.x,w.anchor.z-origin.z);
 for(let r=2.2;r<=12;r+=.5)for(let i=0;i<16;i++){const angle=facing+i*Math.PI/8,p={x:origin.x+Math.sin(angle)*r,z:origin.z+Math.cos(angle)*r};if(accept&&!accept(p))continue;if(validCarrierLanding(w,'marine',p,id,radius)&&reserved.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>radius*2+2.2)&&![...w.entities.values()].some(u=>u.hp>0&&!u.flying&&Math.hypot(p.x-u.x,p.z-u.z)<radius+u.unitRadius+.12))return p;}
 return null;
}
function armedAirEntry(d:ArmedDeployment){return armedIndividualCard(d.cardId)&&d.passengers.length>0&&SC2_UNITS[d.passengers[0].family].flying;}
function armedLandingClear(w:World,d:ArmedDeployment){if(armedAirEntry(d))return Math.abs(d.point.x)+d.radius<w.mapHalf&&Math.abs(d.point.z)+d.radius<w.mapHalf&&![...w.entities.values()].some(u=>u.hp>0&&u.flying&&Math.hypot(u.x-d.point.x,u.z-d.point.z)<u.unitRadius+d.radius+.12);return validCarrierLanding(w,'marine',d.point,d.id,d.radius)&&![...w.entities.values()].some(u=>u.hp>0&&!u.flying&&Math.hypot(d.point.x-u.x,d.point.z-u.z)<d.radius+u.unitRadius+.12);}
function enemies(w:World,ground=false){return [...w.entities.values()].filter(u=>armedTargetAllowed(w,u)&&(!ground||!u.flying)&&w.visibleTo(u,'terran')).sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id);}
function startReady(w:World,id:ArmedId,seconds:number){const a=w.expedition.support.armed!,reserve=ARMED_CARD_BY_ID[id].purchase==='reserve'&&w.tick<(a.readyTick[id]??0)&&(a.reserves[id]??0)>0;if(reserve)a.reserves[id]!--;else a.readyTick[id]=w.tick+Math.ceil(seconds*60);return a.nextCast++;}
function canDispatch(w:World,id:ArmedId){const a=w.expedition.support.armed,reservable=ARMED_CARD_BY_ID[id].purchase==='reserve';return !!a&&armedRank(w.expedition.support,id)>0&&(w.tick>=(a.readyTick[id]??0)||reservable&&(a.reserves[id]??0)>0)&&!a.deployments.some(d=>d.cardId===id&&d.phase!=='ended')&&(!reservable||!w.allies().some(u=>u.armed?.cardId===id));}
export function reserveArmedDispatch(w:World,id:ArmedId):number|null {
 const a=w.expedition.support.armed;if(!a||!canDispatch(w,id)||w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return null;
 const rank=armedRank(w.expedition.support,id);
 if(['G04','P03','G05'].includes(id)&&node(w,'N08')&&!a.nodes?.control&&((a.fields??[]).some(f=>f.cardId==='B02'&&!f.captured&&w.tick-f.createdTick<30)||a.deployments.some(d=>d.cardId==='W05'&&d.phase==='falling'&&w.tick-d.createdTick<30)))return null;
 if(armedFieldCard(id)){const fields=prepareArmedField(w,id,armedStageKey(w));if(!fields)return null;const castId=startReady(w,id,ARMED_CARD_BY_ID[id].params.cd);for(const f of fields)f.id=w.nextId++;if(id==='G04'||id==='P03')armedBlockade(w,id,fields);(a.fields??=[]).push(...fields);return castId;}
 if(id==='O03'){const p=ARMED_CARD_BY_ID.O03.params;if(!planetaryReady(w,armedStageKey(w)))return null;const point=landingPoint(w,w.anchor,undefined,2.5);if(!point)return null;const castId=startReady(w,id,p.cd),gear=equipmentCardTotals(w),hp=p.hp*(1+gear.health),landTick=w.tick+Math.ceil(p.land*60);a.deployments.push({id:w.nextId++,castId,cardId:id,slot:0,stageKey:armedStageKey(w),point,createdTick:w.tick,landTick,openTick:landTick,doorOpened:false,lifeTicks:p.lifetime*60,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers:[],impactDone:false,hp,maxHp:hp,armor:p.armor*(1+gear.armorPercent),radius:2.5,rank:1,chargeDamage:0,charges:0,pierceReadyTick:0});return castId;}
 if(id==='W07'||id==='P04'){
  const p=ARMED_CARD_BY_ID[id].params,target=id==='W07'?enemies(w,true)[0]:w.allies()[0];if(!target)return null;const radius=id==='W07'?1:.8,point=landingPoint(w,id==='W07'?target:w.anchor,undefined,radius);if(!point)return null;
  const castId=startReady(w,id,p.cd),gear=equipmentCardTotals(w),land=id==='W07'?ARMED_CARD_BY_ID.W07.params.land:Math.ceil(ARMED_CARD_BY_ID.P04.params.arrive*60),hp=(id==='W07'?ARMED_CARD_BY_ID.W07.params.hp[rank-1]:ARMED_CARD_BY_ID.P04.params.hp)*(1+gear.health),item=armedItemModifiers(w);
  a.deployments.push({id:w.nextId++,castId,cardId:id,slot:0,stageKey:armedStageKey(w),point,createdTick:w.tick,landTick:w.tick+land,openTick:w.tick+land,doorOpened:false,lifeTicks:p.lifetime*60,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers:[],impactDone:false,hp,maxHp:hp,armor:p.armor*(1+gear.armorPercent),radius,rank,impactRadius:id==='P04'?ARMED_CARD_BY_ID.P04.params.radius*item.radius:undefined,shieldFactor:id==='P04'?(item.enhanced?ARMED_CARD_BY_ID.N04.params.shield:1):undefined});if(id==='P04')item.commit();return castId;
 }
 if(id==='B06'||id==='O02'){const batch=prepareArmedFleet(w,id,armedStageKey(w),(origin,ignore,radius,reserved)=>landingPoint(w,origin,ignore,radius,reserved));if(!batch)return null;const castId=startReady(w,id,batch.seconds);if(batch.reserveExtra)a.nodeReserves.N02!--;w.nextId+=batch.deployments.length;a.deployments.push(...batch.deployments);if(batch.shots.length)a.volleys.push({id:castId,cardId:id,stageKey:armedStageKey(w),shots:batch.shots,nextIndex:0});return castId;}
 if(armedMemberCard(id)){
  const batch=prepareArmedMemberBatch(w,id,(origin,ignoreId,radius=1.25,reserved)=>
   landingPoint(w,origin,ignoreId,radius,reserved,id==='G05'?raiderEntryClearance(w,radius):undefined),armedStageKey(w));
  if(!batch)return null;
  const castId=startReady(w,id,batch.seconds);
  if(batch.reserveExtra)a.nodeReserves.N02!--;
  w.nextId+=batch.deployments.length;
  if(id==='G05')armedBlockade(w,'G05',[],batch.deployments);
  if(id==='G06'){batch.deployments[0].impactDamage=equipmentCardDamage(w,ARMED_CARD_BY_ID.G06.params.damage);batch.deployments[0].impactRadius=ARMED_CARD_BY_ID.G06.params.radius;}
  a.deployments.push(...batch.deployments);
  return castId;
 }
 if(id==='P01'){const targets=armedNukeTargets(w);if(!targets.length)return null;const target=targets[Math.min(targets.length-1,Math.floor(w.random()*targets.length))],castId=a.nextCast;return commitArmedNuke(w,'P01',target)?castId:null;}
 if(id==='B04'||id==='P06'){const targets=enemies(w,true).filter(p=>armedOpenPoint(w,p));if(!targets.length)return null;const target=id==='P06'?targets[Math.min(targets.length-1,Math.floor(w.random()*targets.length))]:targets[0],shots=planArmedField(w,id,target),castId=startReady(w,id,ARMED_CARD_BY_ID[id].params.cd);a.volleys.push({id:castId,cardId:id,stageKey:armedStageKey(w),shots,nextIndex:0});return castId;}
 if(id==='W05'||id==='P05'||id==='B05'){
  const target=enemies(w,true)[0];if(id!=='B05'&&!target)return null;
  const p=ARMED_CARD_BY_ID[id].params,count=id==='P05'?4:id==='B05'?2:1,radius=id==='P05'?ARMED_CARD_BY_ID.P05.params.collision:1.25,points:Point[]=[],families=w.expedition.familySlots.filter(f=>w.isFamilyAvailable(f));if(id==='B05'&&!families.length)return null;
  const length=target?Math.hypot(target.x-w.anchor.x,target.z-w.anchor.z):0,f=target&&length>0?{x:(target.x-w.anchor.x)/length,z:(target.z-w.anchor.z)/length}:{x:Math.sin(w.anchor.facing),z:Math.cos(w.anchor.facing)};for(let slot=0;slot<count;slot++){const origin=id==='B05'?{x:w.anchor.x-f.x*4+f.z*(slot?4:-4),z:w.anchor.z-f.z*4-f.x*(slot?4:-4)}:{x:target.x+f.z*(slot-(count-1)/2)*3.8,z:target.z-f.x*(slot-(count-1)/2)*3.8},point=landingPoint(w,origin,undefined,radius,points);if(!point)return null;points.push(point);}
  const extra=id==='B05'&&node(w,'N02')?1:0,reserveExtra=extra&&(a.nodeReserves.N02??0)>0?1:0,passengers:ArmedPassenger[][]=Array.from({length:count},()=>[]),remaining=new Map(families.map(f=>[f,armedFormalFree(w,f)]));
  if(id==='B05')for(let i=0;i<6+extra+reserveExtra;i++){const family=families[i%families.length],formal=i<6+extra&&(remaining.get(family)??0)>0;if(formal)remaining.set(family,remaining.get(family)!-1);const slot=Math.min(1,Math.floor(i/3)),index=passengers[slot].length;passengers[slot].push({family,rank:Math.min(5,(formal?2:3)+extra),formal,exitTick:w.tick+ARMED_CARD_BY_ID.B05.params.land[slot]+(index<3?ARMED_CARD_BY_ID.B05.params.exit[index]:ARMED_CARD_BY_ID.B05.params.exit[2]+(index-2)*6),lifeTicks:formal?0:i>=6?960:ARMED_CARD_BY_ID.B05.params.tempLife*60,entityId:null,cancelled:false});}
  if(armedTemporaryUsed(w)+passengers.flat().filter(p=>!p.formal).length>(node(w,'N03')?24:18))return null;
  const castId=startReady(w,id,p.cd*(extra?.8:1)),gear=equipmentCardTotals(w),item=armedItemModifiers(w);if(id==='W05')item.commit();if(reserveExtra)a.nodeReserves.N02!--;
  for(let slot=0;slot<count;slot++){const land=id==='P05'?ARMED_CARD_BY_ID.P05.params.land[slot]:id==='B05'?ARMED_CARD_BY_ID.B05.params.land[slot]:ARMED_CARD_BY_ID.W05.params.land,baseHp=id==='P05'?ARMED_CARD_BY_ID.P05.params.hp:id==='B05'?w.config.podHp:ARMED_CARD_BY_ID.W05.params.hp[rank-1],armor=id==='P05'?ARMED_CARD_BY_ID.P05.params.armor:id==='B05'?TUNING.podArmor:ARMED_CARD_BY_ID.W05.params.armor,hp=baseHp*(1+gear.health),life=id==='B05'?ARMED_CARD_BY_ID.B05.params.campLife:ARMED_CARD_BY_ID[id].params.lifetime;
   a.deployments.push({id:w.nextId++,castId,cardId:id,slot,stageKey:armedStageKey(w),point:points[slot],createdTick:w.tick,landTick:w.tick+land,openTick:w.tick+land+(id==='B05'?12:0),doorOpened:false,lifeTicks:life*60,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers:passengers[slot],impactDone:false,hp,maxHp:hp,armor:armor*(1+gear.armorPercent),radius,rank,tauntRadius:id==='W05'?(item.enhanced?ARMED_CARD_BY_ID.N04.params.taunt:ARMED_CARD_BY_ID.W05.params.tauntRadius)*item.radius:undefined});
  }return castId;
 }
 if(id==='G03'){
  const p=ARMED_CARD_BY_ID.G03.params,remaining=new Map(w.expedition.familySlots.map(f=>[f,armedFormalFree(w,f)])),losses=[...a.losses].reverse().filter(l=>{const left=remaining.get(l.family)??0;if(left<=0)return false;remaining.set(l.family,left-1);return true;}).slice(0,p.count);if(!losses.length)return null;
  const point=landingPoint(w,{x:w.anchor.x-Math.sin(w.anchor.facing)*4,z:w.anchor.z-Math.cos(w.anchor.facing)*4});if(!point)return null;const extra=node(w,'N02')?1:0,reserveExtra=extra&&(a.nodeReserves.N02??0)>0?1:0,passengers:ArmedPassenger[]=losses.map((l,index)=>({family:l.family,rank:Math.min(5,Math.max(1,l.rank-p.rankLoss)+extra),formal:true,exitTick:w.tick+p.exit[index],lifeTicks:0,entityId:null,cancelled:false}));
  for(let i=0;i<extra+reserveExtra;i++){const source=passengers.at(-1)!,formal=i<extra&&(remaining.get(source.family as UnitType)??0)>0;if(formal)remaining.set(source.family as UnitType,remaining.get(source.family as UnitType)!-1);passengers.push({...source,formal,exitTick:passengers.at(-1)!.exitTick+6,lifeTicks:formal?0:960});}
  if(armedTemporaryUsed(w)+passengers.filter(p=>!p.formal).length>(node(w,'N03')?24:18))return null;const castId=startReady(w,id,p.cd*(extra?.8:1));if(reserveExtra)a.nodeReserves.N02!--;a.losses=a.losses.filter(l=>!losses.includes(l));a.deployments.push({id:w.nextId++,castId,cardId:id,slot:0,stageKey:armedStageKey(w),point,createdTick:w.tick,landTick:w.tick,openTick:w.tick+12,doorOpened:false,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers,impactDone:false,hp:1,maxHp:1,armor:0,radius:1.25,rank});return castId;
 }
 if(id==='W01'||id==='W02'){
  const config=id==='W01'?ARMED_CARD_BY_ID.W01.params:ARMED_CARD_BY_ID.W02.params,foes=enemies(w,true);
  if(id==='W01'&&!foes.length)return null;
  const family:UnitType|undefined=id==='W01'?'marine':w.expedition.familySlots.find(f=>w.isFamilyAvailable(f)&&armedFormalFree(w,f)>0);
  if(!family)return null;
  const extra=node(w,'N02')?1:0,reserveExtra=extra&&(a.nodeReserves.N02??0)>0?1:0,count=(id==='W01'?3:1)+extra+reserveExtra,cap=node(w,'N03')?24:18,formalCount=id==='W02'?Math.min(count-reserveExtra,armedFormalFree(w,family)):0;
  if(armedTemporaryUsed(w)+count-formalCount>cap)return null;
  const point=landingPoint(w,id==='W01'?foes[0]:{x:w.anchor.x-Math.sin(w.anchor.facing)*4,z:w.anchor.z-Math.cos(w.anchor.facing)*4});if(!point)return null;
  const castId=startReady(w,id,config.cd*(node(w,'N02')?.8:1)),landTick=w.tick+(id==='W01'?12:0),passengers:ArmedPassenger[]=[];
  for(let index=0;index<count;index++){const formal=index<formalCount,exitTick=w.tick+(id==='W01'?18+index*6:24+index*6);passengers.push({family,rank:Math.min(5,rank+extra),formal,exitTick,lifeTicks:formal?0:id==='W01'?ARMED_CARD_BY_ID.W01.params.lifetime*60:960,entityId:null,cancelled:false,hpFactor:id==='W01'?ARMED_CARD_BY_ID.W01.params.hpFactor[rank-1]:1});}
  if(reserveExtra)a.nodeReserves.N02!--;
  const dense=node(w,'N01'),d:ArmedDeployment={id:w.nextId++,castId,cardId:id,slot:0,stageKey:armedStageKey(w),point,createdTick:w.tick,landTick,openTick:w.tick+(id==='W01'?18:12),doorOpened:false,endTick:Number.MAX_SAFE_INTEGER,phase:'falling',passengers,impactDone:false,hp:1,maxHp:1,armor:0,radius:1.25,rank};
  if(id==='W01'){const modifiers=armedFireModifiers(w,id);d.impactDamage=equipmentCardDamage(w,ARMED_CARD_BY_ID.W01.params.damage[rank-1]*modifiers.damage);d.impactRadius=ARMED_CARD_BY_ID.W01.params.radius*modifiers.radius;d.pushDistance=modifiers.dense?ARMED_CARD_BY_ID.N01.params.push:0;}
  a.deployments.push(d);return castId;
 }
 if(id==='W04'){
  const target=enemies(w,true)[0];if(!target)return null;
  const p=ARMED_CARD_BY_ID.W04.params,modifiers=armedFireModifiers(w,id),dense=modifiers.dense,castId=startReady(w,id,p.cd),dx=target.x-w.anchor.x,dz=target.z-w.anchor.z,len=Math.hypot(dx,dz),f=len?{x:dx/len,z:dz/len}:{x:Math.sin(w.anchor.facing),z:Math.cos(w.anchor.facing)},factor=rankStats(1).damage*PLAYER_COMBAT_FACTOR*p.weaponFactor[rank-1]*modifiers.damage,splash=SIEGE.splash.map(s=>({radius:s.radius*modifiers.radius,fraction:s.fraction}));
  const shots:ArmedShot[]=p.ticks.map((tick,index)=>({point:{x:target.x+index*f.x,z:target.z+index*f.z},tick:w.tick+(dense?p.ticks[0]+index*Math.ceil((p.ticks[1]-p.ticks[0])/1.35):tick),damage:equipmentCardDamage(w,SIEGE.damage*factor),bonuses:SIEGE.bonus.map(b=>({...b,amount:equipmentCardDamage(w,b.amount*factor)})),radius:splash.at(-1)!.radius,splash,kind:'siege'}));
  a.volleys.push({id:castId,cardId:id,stageKey:armedStageKey(w),shots,nextIndex:0});return castId;
 }
 return null;
}
function impact(w:World,shot:ArmedShot,cardId:ArmedId,castId:number){
 for(const b of [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])]){if(b.owner!=='zerg'||b.hp<=0||shot.kind==='thor-air'&&!b.flying||!['nuke','thor-air'].includes(shot.kind)&&b.flying)continue;const distance=Math.hypot(b.x-shot.point.x,b.z-shot.point.z),band=shot.splash?.find(s=>distance<=s.radius+b.unitRadius*.25),fraction=shot.splash?band?.fraction??0:distance<=shot.radius+b.unitRadius?1:0;if(fraction){hitFrom(w,'armed.'+cardId,b,shot.damage*fraction,(shot.bonuses??[]).map(b=>({...b,amount:b.amount*fraction})),1,'terran',0);const u=w.entities.get(b.id);if(shot.suppressTicks&&u?.hp&&!u.enemyTier){const status=w.expedition.support.armed!.unitStatus[u.id]??={};status.suppressUntil=Math.max(status.suppressUntil??0,w.tick+shot.suppressTicks);}if(shot.kind==='barrier'&&u?.hp&&!u.enemyTier){const status=w.expedition.support.armed!.unitStatus[u.id]??={};if(w.tick>=(status.stopReadyTick??0)){status.stopReadyTick=w.tick+ARMED_CARD_BY_ID.P06.params.stopGap*60;status.stoppedUntil=w.tick+ARMED_CARD_BY_ID.P06.params.stop*60;u.stoppedUntil=Math.max(u.stoppedUntil??0,status.stoppedUntil/60);}}}}
 if(shot.kind==='pod')return;
 const thor=shot.kind.startsWith('thor'),body={id:0,x:shot.point.x,z:shot.point.z,hp:0,maxHp:0,armor:0,unitRadius:0,owner:'terran' as const,flying:shot.kind==='thor-air',attributes:[],unitType:thor?'thor' as const:'tank' as const,race:'terran' as const,mode:thor?'tank' as const:'siege' as const,rank:thor?5:1,activeWeapon:shot.kind==='thor-air'?'JavelinMissileLaunchers':undefined};
 const end={x:shot.point.x,z:shot.point.z,flying:shot.kind==='thor-air'};
 if(shot.kind!=='nuke')w.visual('attack',{...body,x:body.x-1.5,z:body.z-2},end,castId);
 w.visual(shot.kind==='nuke'?'strategic-impact':'projectile-impact',body,end,castId,undefined,{supportRadius:shot.radius,supportSound:shot.kind==='nuke'?'nuke':thor?'thor-ground':'tank-siege'});
}
export function endArmedDeployment(w:World,d:ArmedDeployment){if(d.phase==='ended')return;d.phase='ended';d.endedAt=w.tick;for(const p of d.passengers)if(p.entityId===null)p.cancelled=true;w.fortifications.delete(d.id);}
export function armedFortDestroyed(w:World,id:number){const d=w.expedition.support.armed?.deployments.find(d=>d.id===id&&d.phase==='active');if(d){d.hp=0;endArmedDeployment(w,d);}}
export function clearArmedStage(w:World){const a=w.expedition.support.armed;if(!a)return;for(const d of a.deployments)endArmedDeployment(w,d);a.volleys=[];a.barrage=undefined;a.procs={pending:{},cycles:{}};a.fields=[];a.rear=undefined;a.hold=undefined;a.nodes={};if(a.counter){a.counter.activation=undefined;a.counter.invulnerableUntil=0;a.counter.temporaryHero=undefined;}a.crewSources={};a.unitStatus={};for(const u of w.allies())w.refreshStats(u);for(const u of w.entities.values())if(u.temporaryKind==='armed'&&u.hp>0){if(u.armed?.cardId==='G05')(a.raiderReceipts??=[]).push(`${u.id}:${u.bornAt}`);w.expireUnit(u);}a.raiderReceipts=[];if(w.expedition.race==='terran'){for(const f of w.fortifications.values())if(isG02Bunker(f,armedRank(w.expedition.support,'G02')))w.fortifications.delete(f.id);const unique=w.expedition.support.unique;unique.landing=null;unique.packets=unique.packets.filter(p=>!['missile','bunker'].includes(p.kind));}}
/** Called after committing a zero-delay volley as well as from the fixed step. */
export function resolveArmedVolleys(w:World){const a=w.expedition.support.armed;if(!a)return;const key=armedStageKey(w);for(const v of a.volleys){if(v.stageKey!==key){v.nextIndex=v.shots.length;continue;}while(v.nextIndex<v.shots.length&&v.shots[v.nextIndex].tick<=w.tick){const shot=v.shots[v.nextIndex++];impact(w,shot,v.cardId,v.id);}}a.volleys=a.volleys.filter(v=>v.nextIndex<v.shots.length);}
function tickArmedBarrage(w:World){const a=w.expedition.support.armed!,clock=a.barrage;if(!a.ranks.B01||!clock||!clock.remainingRows||clock.activeUntil<w.tick||clock.nextRowTick>w.tick)return;const target=enemies(w)[0];if(!target)return;const {shots,period}=planArmedBarrage(w,target),id=a.nextCast++;clock.nextRowTick=w.tick+period;clock.remainingRows--;a.volleys.push({id,cardId:'B01',stageKey:armedStageKey(w),shots,nextIndex:0});}
export function tickArmedSupport(w:World){
 const a=w.expedition.support.armed;if(!a||w.expedition.race!=='terran'||w.specialStages.active||w.missions.fleet.ceasefire)return;
 const key=armedStageKey(w);
 for(const d of a.deployments){if(d.phase==='ended')continue;if(armedFortCard(d.cardId)&&d.phase==='active')d.hp=w.fortifications.get(d.id)?.hp??0;if(d.stageKey!==key||w.tick>=d.endTick||d.hp<=0){endArmedDeployment(w,d);continue;}
  if(d.phase==='falling'&&w.tick>=d.landTick){if(!armedLandingClear(w,d)){const alternate=armedAirEntry(d)?w.freePosition(d.passengers[0].family,d.point,0,8):landingPoint(w,d.point,d.id,d.radius);if(!alternate)continue;d.point=alternate;}const delay=w.tick-d.landTick;for(const p of d.passengers)p.exitTick+=delay;d.openTick+=delay;d.landTick=w.tick;d.phase='active';landArmedFort(w,d);if(!['G05','B03'].includes(d.cardId))w.visual('pod-land',supportBody(d),d.point,d.castId,undefined,{supportSound:'podTerran'});}
  if(d.phase!=='active')continue;
  if(!d.doorOpened&&d.passengers.length&&(!armedIndividualCard(d.cardId)||d.cardId==='G06')&&w.tick>=d.openTick){d.doorOpened=true;w.visual('pod-open',supportBody(d),d.point,d.castId);}
  if(!d.impactDone){d.impactDone=true;if(d.impactDamage)impact(w,{point:d.point,tick:w.tick,damage:d.impactDamage,radius:d.impactRadius!,kind:'pod'},d.cardId,d.castId);if(d.pushDistance)for(const u of enemies(w,true)){const dx=u.x-d.point.x,dz=u.z-d.point.z,length=Math.hypot(dx,dz);if(!u.enemyTier&&length>0&&length<=d.impactRadius!+u.unitRadius)translate(u,{x:dx/length*d.pushDistance,z:dz/length*d.pushDistance},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);}}
  for(const p of d.passengers){if(p.cancelled||p.entityId!==null||w.tick<p.exitTick)continue;
   let point=w.freePosition(p.family,p.origin??d.point,armedIndividualCard(d.cardId)?0:1.6,7);
   if(d.cardId==='G05'){
    // Enemies may have moved into a reserved flank since dispatch or a save.
    const clear=raiderEntryClearance(w,d.radius);
    if(!point||!clear(point))point=landingPoint(w,d.point,d.id,d.radius,[],clear);
    if(point)d.point=point;
   }
   if(!point)break;
   prepareArmedPassengers(w,[p]);
   // Mark the passenger before creation; spawning is synchronous and cannot fail.
   p.entityId=w.nextId;const u=p.formal?w.addFamilyMember(p.family as UnitType,point,p.rank):w.addUnit(p.family,'terran',point.x,point.z,p.rank);p.entityId=u.id;d.lastExitTick=w.tick;
   applyArmedPassenger(w,u,p,d.cardId,d.castId,d.id);
  }
  if(!armedFortCard(d.cardId)&&d.passengers.every(p=>p.entityId!==null||p.cancelled))endArmedDeployment(w,d);
 }
 a.deployments=a.deployments.filter(d=>d.phase!=='ended'||w.tick-(d.endedAt??w.tick)<420);
 tickArmedCoordination(w,id=>canDispatch(w,id),id=>reserveArmedDispatch(w,id));
 tickArmedFortAuras(w);tickArmedFields(w,key);tickArmedFortActions(w);tickArmedPlanetary(w);tickArmedCounterattack(w);
 if(a.ranks.O03)planetaryReady(w,key);
 for(const id of ['W01','W02','W04','W05','W06','W07','W08','W09','G03','B02','G04','G05','G06','G09','B03','B04','B05','B06','B08','P01','P02','P03','P04','P05','P06','O02','O03'] as const)if(hasArmedProc(w,id)&&reserveArmedDispatch(w,id)!==null)takeArmedProc(w,id);
 if(a.ranks.B09&&takeArmedProc(w,'B09')&&enemies(w).length&&castTactical(w,undefined,true))a.readyTick.B09=w.tick+ARMED_CARD_BY_ID.B09.params.cd*60;
 tickArmedBarrage(w);tickArmedCalibration(w);tickArmedHandoffs(w);
 resolveArmedVolleys(w);
}
