import {HEROES,HERO_IDS_BY_RACE,HERO_SKILL_FLIGHT,heroStats,type HeroId} from '../../data/heroes';
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
 const data=HEROES[u.heroId],growth=heroStats(u.rank),lostHp=u.maxHp-u.hp,lostShield=(u.maxShield??0)-(u.shield??0),lostTalentShield=(u.maxTalentShield??0)-(u.talentShield??0);
 u.race=data.race;u.team='player';u.owner='terran';u.attributes=[...data.attributes];if(u.flying!==!!data.flying)w.hash.invalidatePlanes();u.flying=!!data.flying;
 const talents=talentModifiers(w,u);
 u.maxHp=data.hp*growth.health*(1+(talents.maxHpPct??0));u.hp=fill?u.maxHp:Math.max(0,Math.min(u.maxHp,u.maxHp-lostHp));
 const shieldSource=SOURCE_UNIT_DETAILS[data.baseFamily==='purifier_flagship'?'carrier':data.baseFamily as UnitType];
 u.shieldArmor=(talents.shieldArmorFlat??0);u.shieldRegen=data.shield>0?(shieldSource?.shieldRegen??2)*FASTER:0;u.shieldDelay=data.shield>0?(shieldSource?.shieldDelay??10)/FASTER:0;
 u.maxShield=data.shield*growth.health*(1+(talents.maxShieldPct??0))+(data.race==='protoss'?u.maxHp*(talents.shieldFromHpPct??0):0);u.shield=fill?u.maxShield:Math.max(0,Math.min(u.maxShield,u.maxShield-lostShield));
 u.maxTalentShield=data.race!=='protoss'&&u.attributes.includes('Biological')?u.maxHp*(talents.shieldFromHpPct??0):0;u.talentShield=fill?u.maxTalentShield:Math.max(0,Math.min(u.maxTalentShield,u.maxTalentShield-lostTalentShield));
 u.armor=(data.armor+growth.armor)*(1+(talents.armorPct??0));u.moveSpeed=data.speed*(1+(talents.moveSpeedPct??0));u.weaponDamage=data.damage*growth.damage*(1+(talents.weaponDamagePct??0));u.attackPeriod=data.period/growth.attackSpeed/(1+(talents.attackSpeedPct??0));u.attackRange=data.range*(1+(talents.rangePct??0));
 u.maxEnergy=0;u.energy=0;u.energyRegen=0;u.healRate=0;
 (u as ControlledEntity).cloaked=data.innateCloak;
 return true;
}
export function deployExpeditionHero(w:World,record:HeroRecord,revival:boolean):boolean{
 const data=HEROES[record.id],position=w.freePosition(data.baseFamily,w.anchor);if(!position)return false;
 const u=w.addUnit(data.baseFamily,'terran',position.x,position.z,record.rank);
 u.heroId=record.id;u.modelKey=data.model;u.slot=100+[...w.heroes.keys()].indexOf(record.id);u.unitRadius=(data.flying?SC2_UNITS[data.baseFamily].unitRadius:.45)*TUNING.unitScale;
 refreshExpeditionHero(w,u,true);record.entityId=u.id;record.awaitingSpawn=false;record.revivePaid=false;
 if(revival)record.skillReady=w.time+data.cooldown;
 return true;
}
export function acquireExpeditionHero(w:World,id:HeroId,available=heroModelReady):boolean{
 if(!canAcquireExpeditionHero(w,id,available))return false;
 let record=w.heroes.get(id);
 if(record){record.rank++;const u=w.heroEntity(id);if(u&&u.hp>0){u.rank=record.rank;refreshExpeditionHero(w,u);}}
 else{record={id,rank:1,entityId:null,skillReady:w.time,revivePaid:false,awaitingSpawn:true};w.heroes.set(id,record);deployExpeditionHero(w,record,false);}
 w.changed();return true;
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
 return id!=='nova'||target.attributes.includes('Biological')&&!target.attributes.includes('Structure');
}
function alliesFor(w:World,id:HeroId,source:Entity):Entity[]{
 return w.allies().filter(ally=>{
  if(ally.hp<=0||w.edgeDistance(source,ally)>HEROES[id].skillRange||!w.hasAttackLine(source,ally))return false;
  if(id==='artanis')return (ally.maxShield??0)>(ally.shield??0);
  return ally.id!==source.id&&ally.hp<ally.maxHp&&ally.attributes.includes(id==='swann'?'Mechanical':'Biological');
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
export function canCastExpeditionHero(w:World,id:HeroId):boolean{
 const record=w.heroes.get(id),source=w.heroEntity(id);
 return !!w.expedition&&w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!!record&&!!source&&source.hp>0&&((source as ControlledEntity).stoppedUntil??0)<=w.time&&w.time+1e-8>=record.skillReady&&!w.heroCasts.some(cast=>cast.hero===id&&(cast as ExtendedCast).phase!=='dot')&&!!castTarget(w,id);
}
export function castExpeditionHero(w:World,id:HeroId):boolean{
 if(!canCastExpeditionHero(w,id))return false;
 const record=w.heroes.get(id)!,source=w.heroEntity(id)!,target=castTarget(w,id)!,data=HEROES[id],serial=w.nextId++;
 const talents=talentModifiers(w,source,'hero');record.skillReady=w.time+data.cooldown*(1-(talents.abilityCooldownReductionPct??0));source.lastSkillAt=w.time;
 const base:ExtendedCast={id:serial,hero:id,source:source.id,target:target.id,origin:{x:source.x,z:source.z},point:{x:target.x,z:target.z},at:w.time+data.delay,damage:data.skillDamage*heroStats(record.rank).skill*(1+(talents.abilityDamagePct??0)),phase:'impact'};
 source.attackFacing=Math.atan2(target.x-source.x,target.z-source.z);source.action='skill';
 if(id==='swann'){for(let pulse=1;pulse<=4;pulse++)w.heroCasts.push({...base,at:w.time+pulse,phase:'channel'} as ExtendedCast);}
 else if(id==='raynor'||id==='kerrigan'||id==='alarak')w.heroCasts.push({...base,phase:'line-travel',progress:0,hitIds:[]});
 else if(id==='hots_leviathan')for(let pulse=0;pulse<3;pulse++)w.heroCasts.push({...base,id:pulse===0?serial:w.nextId++,at:base.at+pulse*.8,phase:'area-pulse',launched:pulse>0,pulseIndex:pulse});
 else if(id==='zagara'){
  const angle=Math.atan2(target.x-source.x,target.z-source.z),length=Math.min(data.skillRange,distance(source,target));
  for(let pulse=0;pulse<3;pulse++){const direction=angle+(pulse-1)*Math.PI/15;w.heroCasts.push({...base,id:pulse===0?serial:w.nextId++,point:{x:source.x+Math.sin(direction)*length,z:source.z+Math.cos(direction)*length},at:base.at+pulse*.12});}
 }else w.heroCasts.push(base);
 if(id==='purifier_flagship')w.effect('hero-warning',source,base.point,data.radius,1);
 resolveExpeditionHeroCasts(w);w.changed();return true;
}
function restoreHealth(w:World,source:Entity,target:Entity,amount:number){
 const suppression=Math.min(.5,Math.max(w.statuses.value(target.id,'bleed',w.time),w.statuses.value(target.id,'corruption',w.time)));
 const restored=Math.min(target.maxHp-target.hp,amount*(1-suppression));if(restored<=0)return;
 target.hp+=restored;w.stats.healed+=restored;w.effect('heal',source,target,.3,.35);
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
  const source=w.entities.get(cast.source),target=w.body(cast.target),data=HEROES[cast.hero];
  if(cast.phase!=='dot'&&!cast.launched&&source&&source.hp>0&&w.time+1e-8>=cast.at-(HERO_SKILL_FLIGHT[cast.hero]??data.delay)){
   w.visual('skill-launch',source,cast.point,cast.id);cast.launched=true;
  }
  if(cast.phase==='line-travel'){
   if(!source)continue;
   const duration=.2,previous=cast.progress??0,progress=Math.min(1,Math.max(previous,(w.time-(cast.at-duration))/duration));
   const angle=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),sin=Math.sin(angle),cos=Math.cos(angle),seen=new Set(cast.hitIds??[]),victims:Body[]=[];
   const consider=(body:Body)=>{if(body.hp<=0||body.owner!=='zerg'||seen.has(body.id))return;const dx=body.x-cast.origin.x,dz=body.z-cast.origin.z,along=dx*sin+dz*cos,side=Math.abs(dx*cos-dz*sin);if(along>=Math.max(0,previous*data.length-body.unitRadius)&&along<=progress*data.length+body.unitRadius&&side<=data.width/2+body.unitRadius&&(!w.terrain||w.terrain.lineOfFire(cast.origin,body,false,body.flying)))victims.push(body);};
   w.hash.query(cast.origin,data.length+3,consider,'zerg');
   for(const body of [w.hive,...w.expansionHives.values()])if(body)consider(body);
   victims.sort((a,b)=>distance(cast.origin,a)-distance(cast.origin,b)||a.id-b.id);for(const body of victims){seen.add(body.id);w.hit(body,cast.damage,[],1,'terran',0,1,source.id);if(cast.hero==='alarak')slow(w,body,.4,2);w.visual('skill-impact',source,body,cast.id);}
   cast.hitIds=[...seen];cast.progress=progress;if(progress<1-1e-8)pending.push(cast);continue;
  }
  if(cast.phase==='channel'&&(!source||source.hp<=0||!target||target.hp<=0||w.edgeDistance(source,target)>data.skillRange||!target.attributes.includes('Mechanical'))){cancelledChannels.add(cast.id);continue;}
  if(cast.at>w.time+1e-8){pending.push(cast);continue;}
  if(cast.phase==='dot'){if(target&&target.hp>0){w.hit(target,cast.damage,[],1,'terran',0,1,cast.source);if(source)w.visual('skill-dot',source,target,cast.id);}continue;}
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
  if(cast.hero==='swann'){if(target)restoreHealth(w,source,target as Entity,cast.damage);continue;}
  if(cast.hero==='niadra'||cast.hero==='artanis'){
   if(source.hp<=0)continue;
   for(const ally of alliesFor(w,cast.hero,source).slice(0,7)){
    if(cast.hero==='niadra')restoreHealth(w,source,ally,cast.damage);
    else{ally.shield=Math.min(ally.maxShield??0,(ally.shield??0)+cast.damage);w.effect('heal',source,ally,.45,.5);}
   }continue;
  }
  if(cast.hero==='nova'||cast.hero==='zeratul'||cast.hero==='dehaka'){
   if(source.hp>0&&target&&validEnemy(w,cast.hero,source,target)){
    const before=target.hp;w.hit(target,cast.damage,[],1,'terran',0,1,source.id);w.effect('hero-line',source,target,.14,.2);w.visual('skill-impact',source,target,cast.id);
    if(cast.hero==='nova'&&target.hp>0)slow(w,target,.35,2);
    if(cast.hero==='dehaka')restoreHealth(w,source,source,Math.min(150*heroStats(source.rank).skill,Math.max(0,before-target.hp)*.35));
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
    if(body.hp>0&&body.owner==='zerg'&&along>=0&&along<=data.length+body.unitRadius&&side<=data.width/2+body.unitRadius&&(!w.terrain||w.terrain.lineOfFire(cast.origin,body,false,body.flying))){w.hit(body,cast.damage,[],1,'terran',0,1,source.id);impacted=true;if(cast.hero==='alarak')slow(w,body,.4,1.5);}
   },'zerg');w.effect('hero-line',source,end,data.width/2,.3);if(impacted)w.visual('skill-impact',source,end,cast.id);continue;
  }
  let impacted=false;
  for(const body of affectedArea(w,cast,data.radius)){
   if(cast.hero==='zagara'&&(body.flying||body.attributes.includes('Structure')))continue;
   if(cast.hero==='vorazun'){
    const entity=w.entities.get(body.id) as ControlledEntity|undefined;if(!entity)continue;
    if(entity.enemyTier==='boss'||entity.enemyTier==='lord'){entity.moveSlowFactor=Math.max(entity.moveSlowFactor??0,.3);entity.moveSlowUntil=Math.max(entity.moveSlowUntil??0,w.time+3);entity.attackSlowFactor=.3;entity.attackSlowUntil=w.time+3;}
    else entity.stoppedUntil=Math.max(entity.stoppedUntil??0,w.time+3);
    impacted=true;
   }else{
    w.hit(body,cast.damage,[],1,'terran',0,1,source.id);impacted=true;
    if(cast.hero==='tosh')slow(w,body,.35,3);
    if((cast.hero==='stukov'||cast.hero==='tychus'&&!body.attributes.includes('Structure'))&&body.hp>0){
     for(let i=pending.length-1;i>=0;i--)if(pending[i].hero===cast.hero&&pending[i].phase==='dot'&&pending[i].source===cast.source&&pending[i].target===body.id)pending.splice(i,1);
     const pulseDamage=cast.hero==='tychus'?30:35,pulseCount=cast.hero==='tychus'?3:4;
     for(let pulse=1;pulse<=pulseCount;pulse++)scheduled.push({...cast,id:w.nextId++,target:body.id,at:w.time+pulse,damage:cast.damage/data.skillDamage*pulseDamage,phase:'dot',launched:true});
    }
   }
  }
  if(impacted)w.visual('skill-impact',source,cast.point,cast.id);
  w.effect(cast.hero==='stukov'?'bile':'explosion',source,cast.point,data.radius,.6);
 }
 const replacedDots=new Set(scheduled.filter(c=>c.phase==='dot').map(c=>`${c.source}:${c.target}`));
 w.heroCasts=[...pending.filter(c=>!cancelledChannels.has(c.id)&&!(c.phase==='dot'&&replacedDots.has(`${c.source}:${c.target}`))),...scheduled];
}
