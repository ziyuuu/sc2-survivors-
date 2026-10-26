import type {World} from '../../src/simulation/world';
import type {Case} from './catalogue';
import {prepareCardQuote} from './card-fixture';
import {purchaseOffer,refreshOffers} from '../../src/simulation/expedition-economy';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {initializeCarrierSubsystem} from '../../src/simulation/combat/carriers';
import {unitData} from '../../src/simulation/combat/expedition-combat';
import type {Entity} from '../../src/simulation/types';
import {setDiagnosticHealthLock,diagnosticHealthLock} from '../../src/diagnostics/combat-lock';
type TimedAction={at:number;label:string;run:()=>void};
type EffectPlan={started:number;actions:TimedAction[];done:{at:number;label:string}[];targets:number[];effect:any;delivery:boolean;actorId:number;pods:Set<number>;shopRefresh?:unknown;followAt?:number;following?:string;finishedMission?:string;clearedTarget?:boolean;parasiteWitness?:{id:number;before?:number;after?:number;markDamage?:number;at?:number}};
const plans=new WeakMap<World,EffectPlan>();
export const cardEffectSeconds=(effect:{kind:string;item?:string})=>effect.kind==='funShop'?({nydus:40,tavern:55,bait:45} as Record<string,number>)[effect.item??'']??35:35;
class CardTerrain extends FlatTerrain{
 override connectedLocations(){const points=[];for(let z=-6;z<=6;z+=3)for(let x=-6;x<=6;x+=3)points.push({x,z});return points;}
}
function freezeTarget(u:Entity){u.hp=u.maxHp=1e8;u.weaponCooldown=u.nextShotAt=1e6;u.moveSpeed=0;return u;}
export function prepareCardEffect(w:World,c:Case){
 const q=prepareCardQuote(w,c),data=c.data as {variant?:Parameters<typeof purchaseOffer>[2]};
 const effect=q.expeditionEffect,naturalEvent=effect.kind==='funShop'&&['tavern','bait'].includes(effect.item);
 const beforePurchase={wallet:{...w.wallet},cards:{...w.expedition.cardTotals},levels:{...w.funShop.levels}};
 const stats=(u:Entity)=>({maxHp:u.maxHp,hp:u.hp,weaponDamage:u.weaponDamage,pandora:u.pandora,scale:structuredClone(u.nativeStatScale)});
 const oldEnemy=effect.kind==='funShop'&&effect.item==='pandora'?w.addUnit('roach','zerg',8,4):null,oldBefore=oldEnemy?stats(oldEnemy):null;
 if(!purchaseOffer(w,q.offerId,data.variant??undefined))throw Error('Native card effect purchase failed');
 let pandoraWitness:unknown=null;
 if(oldEnemy){w.refreshStats(oldEnemy);const fresh=w.addUnit('roach','zerg',10,4);pandoraWitness={existingBefore:oldBefore,existingAfter:stats(oldEnemy),newAfter:stats(fresh),walletBefore:beforePurchase.wallet,walletAfter:{...w.wallet},sameStage:w.stage,sameTime:w.time};}
 if(effect.kind==='funShop'&&effect.item==='dice'){
  const actorId=w.allies()[0].id;
  plans.set(w,{started:w.time,actions:[],done:[],targets:[],effect,delivery:false,actorId,pods:new Set()});
  return {actorId,targetId:null,patientId:null,immediate:true,receipt:{id:q.id,effect,purchase:q.purchaseReceipt,beforePurchase,controlledStart:true,phase:'reward',description:'保留真实购买后的关间，触发调用原生刷新并显示新货架'}};
 }
 w.paused=false;if(!w.skipReward()||w.phase!=='battle')throw Error('Native post-purchase departure failed');
 // Retain actual purchased drop pods and production jobs through departure.
 w.terrain=new CardTerrain();w.obstacles=[];for(const[id,u]of w.entities)if(u.owner==='zerg')w.entities.delete(id);w.hive=null;w.expansionHives.clear();w.swarm.pending=[];
 Object.assign(w,{waves:[],specialPlan:[],eventPlan:[],nextWave:Infinity,nextExpansionAt:Infinity});w.missions.enabled=naturalEvent&&effect.kind==='funShop'&&effect.item==='tavern';w.encounters.enabled=naturalEvent;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:!(effect.kind==='funShop'&&effect.item==='tavern'),pending:false});
 if(naturalEvent&&w.diagnosticRun)throw Error('Natural-event card requires a non-sandbox World with waves enabled; unrelated waves are suppressed by the controlled schedule, not diagnosticRun.');
 Object.assign(w.anchor,{x:0,z:0});w.trail=[{x:0,z:0}];const allies=w.allies();for(const[i,u]of allies.entries()){u.x=(i%3-1)*2;u.z=-Math.floor(i/3)*2;u.prev={x:u.x,z:u.z};u.hp*=.55;u.shield=(u.shield??0)*.5;u.energy*=.2;}
 let actor=allies.find(u=>u.heroId||u.eliteId)??allies[0];if(!actor)throw Error('Post-card actor absent');
 const target=w.addUnit(unitData(actor).targetType==='air'?'mutalisk':'roach','zerg',0,4),nativeTarget={maxHp:target.maxHp,weaponDamage:target.weaponDamage,pandora:target.pandora};freezeTarget(target);
 const patient=w.addUnit(c.race==='terran'?'tank':c.race==='zerg'?'roach':'stalker','terran',-2,0);patient.hp=patient.maxHp*.1;patient.shield=0;patient.weaponCooldown=patient.nextShotAt=1e6;
 const delivery=effect.kind==='supply'&&effect.mode==='pod'||effect.kind==='card'&&effect.effect==='production',plan:EffectPlan={started:w.time,actions:[],done:[],targets:[target.id],effect,delivery,actorId:actor.id,pods:new Set()};plans.set(w,plan);
 if(effect.kind==='funShop'&&['bait','tavern'].includes(effect.item)){
  if(!setDiagnosticHealthLock(w,true))throw Error('Isolated bait health lock unavailable');
  plan.done.push({at:0,label:'随机事件观察启用既有诊断锁血：保留真实命中、伤害及阻止死亡次数，可在检测工具关闭；任务目标仍按原生规则受伤，不作难度或平衡结果'});
 }
 // These melee hero casts require a nearby ground target. Preserve their
 // native range check instead of treating a distant fixture as a rejected skill.
 if(effect.kind==='hero'&&['dehaka','zeratul'].includes(effect.heroId)){
  target.x=actor.x;target.z=actor.z+1.5;target.prev={x:target.x,z:target.z};
  plan.done.push({at:0,label:'近战英雄的地面目标置于身前1.5米，保留原生施法范围校验'});
 }
 // Automatic production is unrelated to other card effects. Its rescue guards
 // must not turn an effect inspection into an uncontrolled stage-18 battle.
 if(!(effect.kind==='card'&&effect.effect==='production'))for(const g of w.expedition.building!.groups)g.enabled=false;
 const schedule=(at:number,label:string,run:()=>void)=>plan.actions.push({at,label,run});
 const spawnVictims=(n:number)=>{for(let i=0;i<n;i++)plan.targets.push(freezeTarget(w.addUnit('roach','zerg',(i%4-1.5)*1.2,4+Math.floor(i/4)*1.2)).id);};
 const killVictims=()=>{for(const id of plan.targets.slice(1)){const v=w.entities.get(id);if(v&&v.hp>0)w.hit(v,1e12,[],1,'terran',0,1,actor.id,true);}};
 if(effect.kind==='support'){
  if(effect.support==='terran.ricochet')spawnVictims(4);
  if(['zerg.hatch','zerg.consume'].includes(effect.support)){spawnVictims(effect.support==='zerg.hatch'?12:2);schedule(.5,'真实击杀触发尸骸效果',killVictims);}
  if(effect.support==='zerg.parasite'){
   const witness=freezeTarget(w.addUnit('roach','zerg',2.2,4));
   plan.parasiteWitness={id:witness.id};
   schedule(2,'实际普攻植入后击杀宿主，记录邻近敌人原生酸爆伤害',()=>{
    const mark=w.expedition.support.unique.parasites[target.id];
    if(!mark||mark.until<w.time)throw Error('Parasite host must have a live native primary-hit mark before scheduled death');
    Object.assign(plan.parasiteWitness!,{before:witness.hp,markDamage:mark.damage,at:w.time-plan.started});
    if(target.hp>0)w.hit(target,1e12,[],1,'terran',0,1,actor.id,true);
    plan.parasiteWitness!.after=witness.hp;
   });
  }
  if(effect.support==='mines')schedule(.2,'目标移到原生布置陷阱旁',()=>{const m=w.expedition.support.mines[0];if(!m)throw Error('Native mine absent');Object.assign(target,{x:m.point.x,z:m.point.z,prev:{...m.point}});w.hash.rebuild(w.entities.values());});
  if(effect.support==='protoss.reserve'){for(const u of w.allies())u.shield=u.maxShield;schedule(6,'原生溢出储盾后受击',()=>w.hit(actor,10,[],1,'zerg',0,0,target.id,false,false,0,true));}
 }
 if(effect.kind==='funShop'){
  if(effect.item==='gland'){spawnVictims(24);schedule(.5,'实际击杀抽取虫后腺体效果，保留种子概率',killVictims);}
  if(effect.item==='nydus')spawnVictims(5);
  if(effect.item==='eye')target.cloaked=true;
 }
 initializeCarrierSubsystem(w);w.hash.rebuild(w.entities.values());return {actorId:actor.id,targetId:target.id,patientId:patient.id,immediate:false,receipt:{id:q.id,effect,purchase:q.purchaseReceipt,beforePurchase,nativeTarget,pandoraWitness,controlledStart:true,naturalEvent,diagnosticRun:w.diagnosticRun,terrain:'FlatTerrain with bounded connected spawn locations',scheduled:plan.actions.map(a=>({at:a.at,label:a.label})),deliveryPods:w.pods.map(p=>p.id)}};
}
export function stepCardEffectFixture(w:World){
 const p=plans.get(w);if(!p)return;
 if(p.effect.kind==='funShop'&&p.effect.item==='tavern'){
  const m=w.missions.active;
  if(m?.kind==='escort'&&w.time>=(p.followAt??0)){
   if(!p.clearedTarget){
    for(const id of p.targets){const u=w.entities.get(id);if(u&&u.hp>0)w.hit(u,1e12,[],1,'terran',0,1,p.actorId,true);}
    p.clearedTarget=true;p.done.push({at:w.time-p.started,label:'护送出现后原生击杀无关的固定射击靶，避免远程部队按战斗站位留在射程内；任务目标与护送敌军保持原生'});
   }
   const target=m.bodyIds.map(id=>w.missions.bodies.get(id)).find(b=>b?.role==='worker'&&!b.resolved&&b.hp>0);
   if(target){w.issueMove({x:target.x,z:target.z+1});p.followAt=w.time+.5;
    if(p.following!==m.id){p.following=m.id;p.done.push({at:w.time-p.started,label:'真实酒馆事件出现后，通过原生移动命令靠近并跟随护送农民；不直接改任务阶段/进度'});}
   }
  }
  if(w.missions.lastResult&&p.finishedMission!==w.missions.lastResult.id){p.finishedMission=w.missions.lastResult.id;p.done.push({at:w.time-p.started,label:'原生任务结束：'+w.missions.lastResult.kind+' / '+w.missions.lastResult.result});}
 }
 if(p.delivery){
  for(const pod of w.pods)if(!p.pods.has(pod.id)){p.pods.add(pod.id);p.done.push({at:w.time-p.started,label:`受控投放位置：运输${pod.id}由${pod.x},${pod.z}移至0,-5`});pod.x=0;pod.z=-5;}
  for(const u of w.entities.values())if(u.owner==='zerg'&&u.guardOrigin&&u.hp>0){w.hit(u,1e12,[],1,'terran',0,1,p.actorId,true);p.done.push({at:w.time-p.started,label:'受控清理实际生成的护仓敌军 '+u.id});}
 }
 while(p.actions[0]&&p.actions[0].at<=w.time-p.started+1e-7){const a=p.actions.shift()!;a.run();p.done.push({at:w.time-p.started,label:a.label});}
}
export function cardEffectSnapshot(w:World){const p=plans.get(w);return {diagnostic:diagnosticHealthLock(w),effect:p?.effect,parasiteWitness:p?.parasiteWitness?{...p.parasiteWitness}:undefined,shopRefresh:p?.shopRefresh,actions:p?.done,pending:p?.actions.map(a=>({at:a.at,label:a.label})),support:structuredClone(w.expedition.support),fun:structuredClone(w.funShop),eventPacing:structuredClone(w.fieldEvents.pacing),eventActive:{mission:w.missions.active?.kind,encounter:w.encounters.active?.kind,short:w.encounters.expanded.short?.kind,queen:w.encounters.expanded.queen?.kind,horde:w.fieldEvents.horde?.kind},mission:{active:w.missions.active?structuredClone(w.missions.active):null,last:w.missions.lastResult?{...w.missions.lastResult}:null,bodies:[...w.missions.bodies.values()].map(b=>({...b}))},horde:{active:w.fieldEvents.horde?{...w.fieldEvents.horde}:null,last:w.fieldEvents.lastHorde?{...w.fieldEvents.lastHorde}:null},pods:structuredClone(w.pods),fortifications:[...w.fortifications.values()].map(v=>({...v})),bodies:[...w.entities.values()].map(u=>({id:u.id,unitType:u.unitType,rank:u.rank,heroId:u.heroId,eliteId:u.eliteId,temporaryKind:u.temporaryKind,hp:u.hp,shield:u.shield,action:u.action,shots:u.shotSequence,energy:u.energy,pandora:u.pandora,cloaked:u.cloaked,visible:w.visibleTo(u,'terran')}))};}
export function triggerCardEffect(w:World,c:Case,actorId:number|null,targetId:number|null){
 const effect=(c.data as {effect:any}).effect,target=targetId===null?undefined:w.entities.get(targetId),actor=actorId===null?undefined:w.entities.get(actorId);
 if(effect.kind==='funShop'&&effect.item==='dice'){
  const p=plans.get(w)!;const before={revision:w.expedition.shopRevision,page:w.expedition.shopPage,offers:w.rewards.map(r=>({id:r.id,offerId:r.offerId,rarity:r.rarity,sold:r.sold})),wallet:{...w.wallet}};
  if(!refreshOffers(w))throw Error('Native post-dice shop refresh rejected');
  p.shopRefresh={before,after:{revision:w.expedition.shopRevision,page:w.expedition.shopPage,offers:w.rewards.map(r=>({id:r.id,offerId:r.offerId,rarity:r.rarity,sold:r.sold})),wallet:{...w.wallet}},level:w.funShop.levels.dice};
  p.done.push({at:w.time-p.started,label:'购买骰子后实际调用原生刷新，记录全新货架及修订号；单次品质不作为概率证明'});return;
 }
 if(effect.kind==='support'){
  if(effect.support==='strategic'&&!w.commitStrategicStrike(target?{x:target.x,z:target.z}:{x:0,z:4}))throw Error('Strategic card trigger rejected');
  if(['terran.overdrive','zerg.evolve','protoss.prism'].includes(effect.support)&&!w.castTactical(target??{x:0,z:4}))throw Error('Tactical card trigger rejected');
  if(effect.support==='protoss.counter'&&actor)w.hit(actor,(actor.shield??0)+1,[],1,'zerg',0,0,targetId??undefined,false,false,0,true);
 }
 if(effect.kind==='hero'&&actor?.heroId){w.heroes.get(actor.heroId)!.skillReady=0;const p=[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}];if(!w.castHero(actor.heroId,{ground:p,air:p,occludedGround:[],occludedAir:[]}))throw Error('Purchased hero cast rejected');}
}
