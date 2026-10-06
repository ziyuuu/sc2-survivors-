import {observeRecovery,observeAmount} from '../observation';
import {preserveTeamWounds} from './team-auras';
import {zergEliteFriendlyAura} from './zerg-elite-runtime';
import {eliteFriendlyAura} from './terran-elite-runtime';
import {isProtossHero,protossHeroGrowth,PROTOSS_HERO_RULES as P} from '../../data/protoss-heroes';
import {protossState,protossStats,registerShieldReconstruction,protossShieldArmor} from './protoss-hero-passives';
import {permanentBattleBody} from './hero-ground-auras';
import {isZergHero,zergHeroGrowth} from '../../data/zerg-heroes';
import {zergState,dehakaStats,dehakaDevour,registerZergRevival,permanentBiological} from './zerg-hero-passives';
import {canRegisterZergRevivalSeat} from './zerg-hero-revival';
import {groundHeroBuff} from './hero-ground-auras';
import {isRevisedHero,terranHeroGrowth} from '../../data/terran-heroes';
import {heroAura,heroState,permanentMechanical} from './terran-hero-passives';
import {validBattleView,pointInBattleView,type BattleView} from './battle-view';
import {uniqueActiveStats} from './unique-support';
import {teamCardEffects} from '../progression/team-cards';
import {PLAYER_COMBAT_FACTOR as POWER} from '../../data/player-unit-adaptations';
import {HEROES,HERO_BASIC_ATTACK,HERO_IDS_BY_RACE,HERO_SKILL_FLIGHT,heroStats,type HeroId} from '../../data/heroes';
import {RUNTIME_ASSETS} from '../../assets/runtime.generated';
import {TUNING} from '../../data/game';
import {FASTER,SC2_UNITS,type UnitType} from '../../data/sc2-units';
import {SOURCE_UNIT_DETAILS} from '../../data/expansion-units';
import {talentModifiers} from './expedition-combat';
import type {World} from '../world';
import type {Body,Entity,HeroCast,HeroRecord,Point} from '../types';

type ExtendedCast=HeroCast;
type ControlledEntity=Entity&{cloaked?:boolean;stoppedUntil?:number;attackSlowUntil?:number;attackSlowFactor?:number};
export const heroModelReady=(id:HeroId)=>RUNTIME_ASSETS.some(asset=>asset.id===`model.${HEROES[id].model}`&&asset.status==='available');
export function heroAtSlot(w:Pick<World,'heroes'>,slot:number):HeroId|undefined{return Number.isInteger(slot)&&slot>=0&&slot<3?[...w.heroes.keys()][slot]:undefined;}
export function canAcquireExpeditionHero(w:World,id:HeroId,available=heroModelReady):boolean{
 if(!w.expedition||!Object.hasOwn(HEROES,id)||HEROES[id].race!==w.expedition.race)return false;
 const owned=w.heroes.get(id);return owned?owned.rank<5:w.heroes.size<3&&available(id);
}
export function refreshExpeditionHero(w:World,u:Entity,fill=false):boolean{
 if(!w.expedition||!u.heroId)return false;
 const oldPools={hp:u.hp,maxHp:u.maxHp,shield:u.shield??0,maxShield:u.maxShield??0,factor:u.teamAuraFactors},ground=groundHeroBuff(w,u);const ea=eliteFriendlyAura(w,u),za=zergEliteFriendlyAura(w,u),oldEliteHp=(u.eliteHpAuraFactor??1)*(u.zergEliteHpAuraFactor??1);const data=HEROES[u.heroId],revised=isRevisedHero(u.heroId)||isZergHero(u.heroId)||isProtossHero(u.heroId),modern=isProtossHero(u.heroId)?protossHeroGrowth(u.rank):isZergHero(u.heroId)?zergHeroGrowth(u.rank):terranHeroGrowth(u.rank),growth=revised?{health:modern.health,armor:modern.armor,damage:modern.damage,attackSpeed:1/modern.period}:heroStats(u.rank),power=revised?1:POWER,adapt=isProtossHero(u.heroId)?protossStats(w,u):dehakaStats(u),aura=heroAura(w,u),lostHp=(u.maxHp-u.hp)/oldEliteHp,lostShield=(u.maxShield??0)-(u.shield??0),lostTalentShield=(u.maxTalentShield??0)-(u.talentShield??0);
 u.race=data.race;u.team='player';u.owner='terran';u.attributes=[...data.attributes];if(u.flying!==!!data.flying)w.hash.invalidatePlanes();u.flying=!!data.flying;
 const talents=talentModifiers(w,u),team=teamCardEffects(w.expedition);
 u.maxHp=data.hp*(1+team.health+aura.health)*power*growth.health*adapt.health*(1+(talents.maxHpPct??0))*Math.max(ea.hp,za.hp);u.hp=fill?u.maxHp:Math.max(0,Math.min(u.maxHp,u.maxHp-lostHp*ea.hp*za.hp));u.eliteHpAuraFactor=ea.hp;u.zergEliteHpAuraFactor=za.hp;
 const shieldSource=SOURCE_UNIT_DETAILS[data.baseFamily==='purifier_flagship'?'carrier':data.baseFamily as UnitType];
 u.shieldArmor=((talents.shieldArmorFlat??0)+team.armor)*power*(1+ground.shieldArmorPct)+protossShieldArmor(w,u)+za.shieldArmor;u.shieldRegen=data.shield>0?(shieldSource?.shieldRegen??2)*FASTER:0;u.shieldDelay=data.shield>0?(shieldSource?.shieldDelay??10)/FASTER:0;
 u.maxShield=data.shield*(1+team.health+aura.shield)*power*growth.health*(1+(talents.maxShieldPct??0))+(data.race==='protoss'?u.maxHp*(talents.shieldFromHpPct??0):0);u.maxShield*=za.shield;u.shield=fill?u.maxShield:Math.max(0,Math.min(u.maxShield,u.maxShield-lostShield));
 u.maxTalentShield=data.race!=='protoss'&&u.attributes.includes('Biological')?u.maxHp*(talents.shieldFromHpPct??0):0;u.talentShield=fill?u.maxTalentShield:Math.max(0,Math.min(u.maxTalentShield,u.maxTalentShield-lostTalentShield));
 u.armor=((data.armor+growth.armor)*(1+(talents.armorPct??0))+team.armor+aura.armor)*power;u.armor+=adapt.armor+uniqueActiveStats(w,u).armor+ea.armor;u.armor=u.armor*(1+ground.armorPct)+ground.armor+za.armor;u.moveSpeed=data.speed*power*(1+(talents.moveSpeedPct??0)+uniqueActiveStats(w,u).move+aura.move)*ea.move*za.move;u.weaponDamage=data.damage*(1+team.damage+aura.damage)*power*(revised?1:HERO_BASIC_ATTACK.damage)*growth.damage*adapt.damage*(1+(talents.weaponDamagePct??0));u.attackPeriod=data.period/(1+team.speed+uniqueActiveStats(w,u).speed+aura.speed)/power/(revised?1:HERO_BASIC_ATTACK.frequency)/growth.attackSpeed/(1+(talents.attackSpeedPct??0))/(isProtossHero(u.heroId)?protossStats(w,u).speed:1)/za.speed;u.attackRange=(data.range+(u.heroId==='dehaka'&&(u.zergCombat?.flyingUntil??0)>w.time?1:0))*(1+(talents.rangePct??0));
 preserveTeamWounds(u,oldPools,{hp:(1+team.health+aura.health)/(1+team.health)*Math.max(ea.hp,za.hp),shield:(1+team.health+aura.shield)/(1+team.health)*za.shield},fill);
 u.maxEnergy=0;u.energy=0;u.energyRegen=0;u.healRate=0;
 if(isZergHero(u.heroId))zergState(u);
 if(isProtossHero(u.heroId)){protossState(u);u.cloaked=data.innateCloak||(u.protossCombat!.veilUntil>w.time);}
 if(revised){heroState(u);u.cloaked??=false;}else (u as ControlledEntity).cloaked=data.innateCloak;
 return true;
}
export function deployExpeditionHero(w:World,record:HeroRecord,revival:boolean):boolean{
 const data=HEROES[record.id],position=w.freePosition(data.baseFamily,w.anchor);if(!position)return false;
 const u=w.addUnit(data.baseFamily,'terran',position.x,position.z,record.rank);
 u.heroId=record.id;u.modelKey=data.model;u.slot=100+[...w.heroes.keys()].indexOf(record.id);u.unitRadius=(data.flying?SC2_UNITS[data.baseFamily].unitRadius:.45)*TUNING.unitScale;
 record.entityId=u.id;refreshExpeditionHero(w,u,true);record.awaitingSpawn=false;record.revivePaid=false;
 if(revival){record.skillReady=w.time+data.cooldown;observeAmount(w,u,'revivals',1);}
 return true;
}
export function acquireExpeditionHero(w:World,id:HeroId,available=heroModelReady):boolean{
 if(!canAcquireExpeditionHero(w,id,available))return false;
 let record=w.heroes.get(id);
 if(record){record.rank++;const u=w.heroEntity(id);if(u&&u.hp>0){u.rank=record.rank;refreshExpeditionHero(w,u);}}
 else{record={id,rank:1,entityId:null,skillReady:w.time,revivePaid:false,awaitingSpawn:true};w.heroes.set(id,record);deployExpeditionHero(w,record,false);}
 for(const ally of w.allies())w.refreshStats(ally);w.changed();return true;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function visible(w:World,target:Body):boolean{
 const entity=w.entities.get(target.id) as ControlledEntity|undefined;
 return !entity?.cloaked||!!w.expedition?.detectionFields.some(field=>field.team==='player'&&field.until>w.time&&distance(field,target)<=field.radius+target.unitRadius);
}
function validEnemy(w:World,id:HeroId,source:Entity,target:Body):boolean{
 if(target.owner!=='zerg'||target.hp<=0||!visible(w,target)||w.edgeDistance(source,target)>HEROES[id].skillRange||!w.hasAttackLine(source,target))return false;
 if(['dehaka','zeratul','zagara'].includes(id)&&(target.flying||target.attributes.includes('Structure')))return false;
 if(id==='vorazun'&&target.attributes.includes('Structure'))return false;
 return id!=='nova'||!target.attributes.includes('Structure');
}
function alliesFor(w:World,id:HeroId,source:Entity):Entity[]{
 if(id==='niadra')return w.allies().filter(a=>a.id!==source.id&&permanentBiological(a)&&(a.hp<a.maxHp||canRegisterZergRevivalSeat(w,source,a))&&w.edgeDistance(source,a)<=6&&w.hasAttackLine(source,a)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);
 if(id==='swann')return w.allies().filter(a=>a.id!==source.id&&permanentMechanical(a)&&w.edgeDistance(source,a)<=7&&w.hasAttackLine(source,a)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);

 return w.allies().filter(ally=>{
  if(ally.hp<=0||w.edgeDistance(source,ally)>HEROES[id].skillRange||!w.hasAttackLine(source,ally))return false;
  if(id==='artanis')return permanentBattleBody(ally)&&(ally.maxShield??0)>0;
  return ally.id!==source.id&&ally.hp<ally.maxHp&&ally.attributes.includes('Biological');
 }).sort((a,b)=>{
  const ratio=(u:Entity)=>id==='artanis'?(u.shield??0)/Math.max(1,u.maxShield??0):u.hp/u.maxHp;
  return ratio(a)-ratio(b)||a.id-b.id;
 });
}
function castTarget(w:World,id:HeroId):Body|undefined{
 const source=w.heroEntity(id);if(!source||source.hp<=0)return;
 if(['swann','niadra','artanis'].includes(id))return alliesFor(w,id,source)[0];
 let chosen:Body|undefined,score=Infinity;
 w.hash.query(source,HEROES[id].skillRange+3,target=>{
  if(!validEnemy(w,id,source,target))return;
  const dx=target.x-source.x,dz=target.z-source.z,dist=Math.hypot(dx,dz),forward=dx*w.marchDirection.x+dz*w.marchDirection.z;
  const candidate=dist-Math.max(0,forward)*.2;if(candidate<score||candidate===score&&target.id<(chosen?.id??Infinity)){chosen=target;score=candidate;}
 },'zerg');
 // Static hives are not stored in the moving-entity spatial hash.
 for(const target of [w.hive,...w.expansionHives.values()]){
  if(!target||!validEnemy(w,id,source,target))continue;
  const dx=target.x-source.x,dz=target.z-source.z,dist=Math.hypot(dx,dz),forward=dx*w.marchDirection.x+dz*w.marchDirection.z;
  const candidate=dist-Math.max(0,forward)*.2;if(candidate<score||candidate===score&&target.id<(chosen?.id??Infinity)){chosen=target;score=candidate;}
 }
 return chosen;
}
export function canCastExpeditionHero(w:World,id:HeroId,battleView?:BattleView):boolean{
 const record=w.heroes.get(id),source=w.heroEntity(id);
 return !!w.expedition&&w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!!record&&!!source&&source.hp>0&&((source as ControlledEntity).stoppedUntil??0)<=w.time&&w.time+1e-8>=record.skillReady&&!w.heroCasts.some(cast=>cast.hero===id&&(cast as ExtendedCast).phase!=='dot')&&(id==='tosh'?validBattleView(battleView)&&toshTargets(w,source!,battleView).length>0:!!castTarget(w,id));
}
function toshTargets(w:World,source:Entity,view:BattleView){return [...w.entities.values(),...(w.hive?[w.hive]:[]),...w.expansionHives.values()].filter(b=>b.owner==='zerg'&&b.hp>0&&visible(w,b)&&pointInBattleView(view,b)&&w.hasAttackLine(source,b)).sort((a,b)=>a.id-b.id);}
export function castExpeditionHero(w:World,id:HeroId,battleView?:BattleView):boolean{
 if(!canCastExpeditionHero(w,id,battleView))return false;
 const record=w.heroes.get(id)!,source=w.heroEntity(id)!,target=(id==='tosh'?toshTargets(w,source,battleView!)[0]:castTarget(w,id))!,data=HEROES[id],serial=w.nextId++;
 const talents=talentModifiers(w,source,'hero');record.skillReady=w.time+data.cooldown*(1-(talents.abilityCooldownReductionPct??0));source.lastSkillAt=w.time;
 const base:ExtendedCast={beganAt:w.time,rank:record.rank,id:serial,hero:id,source:source.id,target:target.id,origin:{x:source.x,z:source.z},point:{x:target.x,z:target.z},at:w.time+data.delay,damage:data.skillDamage*(isProtossHero(id)?protossHeroGrowth(record.rank).skill/9200:isZergHero(id)?zergHeroGrowth(record.rank).skill/9200:isRevisedHero(id)?terranHeroGrowth(record.rank).skill/9200:heroStats(record.rank).skill)*(1+(talents.abilityDamagePct??0)),phase:'impact'};
 source.attackFacing=Math.atan2(target.x-source.x,target.z-source.z);source.action='skill';
 if(id==='artanis'){registerShieldReconstruction(w,source,serial,record.rank,alliesFor(w,id,source).slice(0,7));base.frozenTargets=alliesFor(w,id,source).slice(0,7).map(a=>({id:a.id,maxHp:a.maxShield!}));}
 if(id==='niadra'){registerZergRevival(w,source,serial,record.rank);base.frozenTargets=alliesFor(w,id,source).slice(0,7).map(a=>({id:a.id,maxHp:a.maxHp}));base.at=w.time+.3;}
 if(id==='nova')heroState(source).charge=1;
 if(id==='swann'){const targets=alliesFor(w,id,source).slice(0,7);base.frozenTargets=targets.map(a=>({id:a.id,maxHp:a.maxHp}));for(const a of targets)heroState(a).protectedUntil=Math.max(heroState(a).protectedUntil,w.time+5);for(let pulse=1;pulse<=4;pulse++)w.heroCasts.push({...base,at:w.time+pulse,damage:(.25+.0625*(record.rank-1))/4,phase:'channel'});}
 else if(id==='tosh'){base.frozenTargets=toshTargets(w,source,battleView!).map(a=>({id:a.id,maxHp:a.maxHp}));base.battleView=structuredClone(battleView!);w.heroCasts.push(base);}
 else if(id==='raynor'||id==='kerrigan'||id==='alarak')w.heroCasts.push({...base,phase:'line-travel',progress:0,hitIds:[]});
 else if(id==='hots_leviathan')for(let pulse=0;pulse<3;pulse++)w.heroCasts.push({...base,id:pulse===0?serial:w.nextId++,at:base.at+pulse*.8,phase:'area-pulse',launched:pulse>0,pulseIndex:pulse});
 else if(id==='zagara'){
  const angle=Math.atan2(target.x-source.x,target.z-source.z),length=Math.min(data.skillRange,distance(source,target));
  for(let pulse=0;pulse<3;pulse++){const direction=angle+(pulse-1)*Math.PI/15;w.heroCasts.push({...base,id:pulse===0?serial:w.nextId++,point:{x:source.x+Math.sin(direction)*length,z:source.z+Math.cos(direction)*length},at:base.at+pulse*.12});}
 }else w.heroCasts.push(base);
 if(id==='purifier_flagship')w.effect('hero-warning',source,base.point,data.radius,1);
 resolveExpeditionHeroCasts(w);w.changed();return true;
}
function restoreHealth(w:World,source:Entity,target:Entity,amount:number,castId?:number){
 const suppression=Math.min(.5,Math.max(w.statuses.value(target.id,'bleed',w.time),w.statuses.value(target.id,'corruption',w.time)));
 const restored=Math.min(target.maxHp-target.hp,amount*(1-suppression));if(restored<=0)return;
 target.hp+=restored;w.stats.healed+=restored;observeRecovery(w,source,target,restored);w.effect('heal',source,target,.3,.35);if(source.heroId==='swann'||source.heroId==='niadra')w.visual('skill-impact',source,target,castId);else if(source.heroId==='dehaka')w.visual('skill-heal',source,target,castId);
}
function slow(w:World,target:Body,amount:number,seconds:number){
 const entity=w.entities.get(target.id);if(!entity)return;
 const value=entity.enemyTier==='boss'||entity.enemyTier==='lord'?amount/2:amount;
 if((entity.moveSlowUntil??0)<=w.time||value>=(entity.moveSlowFactor??0)){entity.moveSlowFactor=value;entity.moveSlowUntil=w.time+seconds;}
 else entity.moveSlowUntil=Math.max(entity.moveSlowUntil??0,w.time+seconds);
}
function affectedArea(w:World,cast:HeroCast,radius:number):Body[]{
 const result:Body[]=[],seen=new Set<number>();const add=(body:Body)=>{
  if(body.owner==='zerg'&&body.hp>0&&distance(body,cast.point)<=radius+body.unitRadius&&(!w.terrain||w.terrain.lineOfFire(cast.point,body,false,body.flying)))result.push(body);
 };w.hash.query(cast.point,radius+3,body=>{if(!seen.has(body.id)){seen.add(body.id);add(body);}},'zerg');
 for(const body of [w.hive,...w.expansionHives.values(),...w.fortifications.values()])if(body&&!seen.has(body.id)){seen.add(body.id);add(body);}
 return result.sort((a,b)=>a.id-b.id);
}
export function resolveExpeditionHeroCasts(w:World):void{
 const pending:ExtendedCast[]=[],scheduled:ExtendedCast[]=[],cancelledChannels=new Set<number>();
 for(const cast of w.heroCasts as ExtendedCast[]){
  if(cancelledChannels.has(cast.id))continue;
  const liveSource=w.entities.get(cast.source),source=liveSource&&cast.rank&&(isRevisedHero(cast.hero)||isZergHero(cast.hero)||isProtossHero(cast.hero))?{...liveSource,rank:cast.rank}:liveSource,target=w.body(cast.target),data=HEROES[cast.hero];
  if(cast.phase!=='dot'&&!cast.launched&&source&&source.hp>0&&w.time+1e-8>=cast.at-(cast.hero==='nova'?0:HERO_SKILL_FLIGHT[cast.hero]??data.delay)){
   // Save only the launch presentation anchor. The authored damage path keeps cast.origin.
   cast.presentationLaunch??={x:source.x,z:source.z,facing:Math.atan2(cast.point.x-source.x,cast.point.z-source.z),poseSeconds:Math.max(0,w.time-(source.lastSkillAt??w.time))};
   w.visual('skill-launch',source,cast.point,cast.id,cast.presentationLaunch);cast.launched=true;
  }
  if(cast.phase==='line-travel'){
   if(!source)continue;
   if(w.time<cast.at-.2-1e-8){pending.push(cast);continue;}
   const duration=.2,previous=cast.progress??0,progress=Math.min(1,Math.max(previous,(w.time-(cast.at-duration))/duration));
   const angle=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),sin=Math.sin(angle),cos=Math.cos(angle),seen=new Set(cast.hitIds??[]),victims:Body[]=[];
   const consider=(body:Body)=>{if(body.hp<=0||body.owner!=='zerg'||seen.has(body.id)||(isZergHero(cast.hero)||isProtossHero(cast.hero))&&!visible(w,body))return;const dx=body.x-cast.origin.x,dz=body.z-cast.origin.z,along=dx*sin+dz*cos,side=Math.abs(dx*cos-dz*sin);if(along>=Math.max(0,previous*data.length-body.unitRadius)&&along<=progress*data.length+body.unitRadius&&side<=data.width/2+body.unitRadius&&(!w.terrain||w.terrain.lineOfFire(cast.origin,body,false,body.flying)))victims.push(body);};
   w.hash.query(cast.origin,data.length+3,consider,'zerg');
   for(const body of [w.hive,...w.expansionHives.values()])if(body)consider(body);
   victims.sort((a,b)=>distance(cast.origin,a)-distance(cast.origin,b)||a.id-b.id);for(const body of victims){seen.add(body.id);w.hit(body,cast.damage,[],1,'terran',0,1,source.id);if(cast.hero==='alarak')slow(w,body,.4,2);w.visual('skill-impact',source,body,cast.id);}
   cast.hitIds=[...seen];cast.progress=progress;if(progress<1-1e-8)pending.push(cast);continue;
  }
  if(cast.phase==='channel'&&cast.hero!=='swann'&&(!source||source.hp<=0||!target||target.hp<=0||w.edgeDistance(source,target)>data.skillRange||!target.attributes.includes('Mechanical'))){cancelledChannels.add(cast.id);continue;}
  if(cast.at>w.time+1e-8){pending.push(cast);continue;}
  if(cast.phase==='dot'){if(target&&target.hp>0){w.hit(target,cast.damage,[],1,'terran',0,1,cast.source);if(source)w.visual('skill-dot',source,target,cast.id);}continue;}
  if(cast.hero==='nova'){
   if(!source||source.hp<=0)continue;
   const angle=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),sin=Math.sin(angle),cos=Math.cos(angle),seen=new Set<number>();
   const end={x:cast.origin.x+sin*data.length,z:cast.origin.z+cos*data.length};
   w.hash.query(cast.origin,data.length+3,body=>{
    if(body.hp<=0||body.owner!=='zerg'||body.attributes.includes('Structure')||seen.has(body.id))return;
    const dx=body.x-cast.origin.x,dz=body.z-cast.origin.z,along=dx*sin+dz*cos,side=Math.abs(dx*cos-dz*sin);
    if(along<0||along>data.length+body.unitRadius||side>data.width/2+body.unitRadius||w.terrain&&!w.terrain.lineOfFire(cast.origin,body,false,body.flying))return;
    seen.add(body.id);w.hit(body,cast.damage,[],1,'terran',0,1,source.id);w.visual('skill-impact',source,body,cast.id);
   },'zerg');
   // One instant line event follows the completed windup. It carries the saved launch direction.
   w.visual('skill-line',source,end,cast.id,{...cast.origin,facing:angle,poseSeconds:data.delay});continue;
  }
  if(cast.hero==='yamato_battlecruiser'){
   const main=target&&target.hp>0&&distance(target,cast.point)<=target.unitRadius+.5?target:null;
   if(main)w.hit(main,cast.damage,[],1,'terran',0,1,cast.source);
   const extras=affectedArea(w,cast,data.radius).filter(body=>body.id!==main?.id).sort((a,b)=>distance(a,cast.point)-distance(b,cast.point)||a.id-b.id).slice(0,5);
   for(const body of extras)w.hit(body,cast.damage*.4,[],1,'terran',0,1,cast.source);
   if(source){w.visual('skill-impact',source,cast.point,cast.id);w.effect('explosion',source,cast.point,data.radius,.5);}continue;
  }
  if(cast.hero==='hots_leviathan'||cast.hero==='purifier_flagship'){
   for(const body of affectedArea(w,cast,data.radius))w.hit(body,cast.damage,[],1,'terran',0,1,cast.source);
   if(source){w.visual('skill-impact',source,cast.point,cast.id);w.effect(cast.hero==='hots_leviathan'?'bile':'explosion',source,cast.point,data.radius,.5);}continue;
  }
  if(!source)continue;
  if(cast.hero==='swann'){if(source.hp>0)for(const frozen of cast.frozenTargets??[]){const a=w.entities.get(frozen.id);if(a&&permanentMechanical(a)&&w.edgeDistance(source,a)<=7&&w.hasAttackLine(source,a))restoreHealth(w,source,a,frozen.maxHp*cast.damage,cast.id);}continue;}
  if(cast.hero==='tosh'){for(const frozen of cast.frozenTargets??[]){const a=w.body(frozen.id);if(a&&a.hp>0&&a.owner==='zerg'){w.hit(a,cast.damage,[],1,'terran',0,1,cast.source);w.visual('skill-impact',source,a,cast.id);}}continue;}
  if(cast.hero==='niadra')continue;
  if(cast.hero==='artanis')continue;
  if(cast.hero==='zeratul'||cast.hero==='dehaka'){
   if(source.hp>0&&target&&validEnemy(w,cast.hero,source,target)){
    const before=target.hp;w.hit(target,cast.damage,[],1,'terran',0,1,source.id);w.effect('hero-line',source,target,.14,.2);w.visual('skill-impact',source,target,cast.id);
    if(cast.hero==='dehaka'){const live=w.entities.get(source.id);if(live&&before>target.hp)dehakaDevour(w,live,target,cast.rank??source.rank);}
    if(cast.hero==='zeratul'){
     const extra:Body[]=[];w.hash.query(target,1.2+3,body=>{if(body.id!==target.id&&body.owner==='zerg'&&body.hp>0&&!body.flying&&!body.attributes.includes('Structure')&&distance(body,target)<=1.2+body.unitRadius&&(!w.terrain||w.terrain.lineOfFire(target,body,false,false)))extra.push(body);},'zerg');
     extra.sort((a,b)=>distance(a,target)-distance(b,target)||a.id-b.id);
     for(const body of extra.slice(0,2)){w.hit(body,cast.damage*.35,[],1,'terran',0,1,source.id,false,false,0,false);w.visual('skill-impact',source,body,cast.id);}
    }
   }continue;
  }
  if(cast.hero==='raynor'||cast.hero==='kerrigan'||cast.hero==='alarak'){
   const angle=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),sin=Math.sin(angle),cos=Math.cos(angle),end={x:cast.origin.x+sin*data.length,z:cast.origin.z+cos*data.length};
   let impacted=false;
   w.hash.query(cast.origin,data.length+3,body=>{
    const dx=body.x-cast.origin.x,dz=body.z-cast.origin.z,along=dx*sin+dz*cos,side=Math.abs(dx*cos-dz*sin);
    if(body.hp>0&&body.owner==='zerg'&&along>=0&&along<=data.length+body.unitRadius&&side<=data.width/2+body.unitRadius&&(!w.terrain||w.terrain.lineOfFire(cast.origin,body,false,body.flying))){w.hit(body,cast.damage,[],1,'terran',0,1,source.id);impacted=true;if(cast.hero==='alarak')slow(w,body,.4,2);}
   },'zerg');w.effect('hero-line',source,end,data.width/2,.3);if(impacted)w.visual('skill-impact',source,end,cast.id);continue;
  }
  let impacted=false;
  for(const body of affectedArea(w,cast,data.radius)){
   if(cast.hero==='zagara'&&(body.flying||body.attributes.includes('Structure')))continue;
   if(cast.hero==='vorazun'){
    const entity=w.entities.get(body.id) as ControlledEntity|undefined;if(!entity)continue;
    if(entity.enemyTier==='boss'||entity.enemyTier==='lord'){const n=Math.max(0,Math.min(4,(cast.rank??1)-1)),factor=P.vorazun.bossSlow[n],until=w.time+P.vorazun.stasis[n];entity.moveSlowFactor=Math.max((entity.moveSlowUntil??0)>w.time?entity.moveSlowFactor??0:0,factor);entity.moveSlowUntil=Math.max(entity.moveSlowUntil??0,until);entity.attackSlowFactor=Math.max((entity.attackSlowUntil??0)>w.time?entity.attackSlowFactor??0:0,factor);entity.attackSlowUntil=Math.max(entity.attackSlowUntil??0,until);}
    else entity.stoppedUntil=Math.max(entity.stoppedUntil??0,w.time+P.vorazun.stasis[Math.max(0,Math.min(4,(cast.rank??1)-1))]);
    w.visual('skill-status',source,body,cast.id);impacted=true;
   }else{
    w.hit(body,cast.damage,[],1,'terran',0,1,source.id);impacted=true;
    if((cast.hero==='stukov'||cast.hero==='tychus'&&!body.attributes.includes('Structure'))&&body.hp>0){
     for(let i=pending.length-1;i>=0;i--)if(pending[i].hero===cast.hero&&pending[i].phase==='dot'&&pending[i].source===cast.source&&pending[i].target===body.id)pending.splice(i,1);
     const pulseDamage=cast.hero==='tychus'?data.skillDamage*(.05/.45):data.skillDamage*.5625,pulseCount=cast.hero==='tychus'?3:4;
     for(let pulse=1;pulse<=pulseCount;pulse++)scheduled.push({...cast,id:w.nextId++,target:body.id,at:w.time+pulse,damage:cast.damage/data.skillDamage*pulseDamage,phase:'dot',launched:true});
    }
   }
  }
  if(impacted&&cast.hero!=='vorazun')w.visual('skill-impact',source,cast.point,cast.id);
  w.effect(cast.hero==='stukov'?'bile':'explosion',source,cast.point,data.radius,.6);
 }
 const replacedDots=new Set(scheduled.filter(c=>c.phase==='dot').map(c=>`${c.source}:${c.target}`));
 w.heroCasts=[...pending.filter(c=>!cancelledChannels.has(c.id)&&!(c.phase==='dot'&&replacedDots.has(`${c.source}:${c.target}`))),...scheduled];
}
