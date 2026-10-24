import {SourceEventIndex} from './source/event-index';
import {renderFunSource} from './fun-source-effects';
import {EquipmentEffects} from './equipment-effects';
import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Entity,Point,VisualEvent} from '../../simulation/types';
import {BILE} from '../../data/sc2-units';
import {SOURCE_ABILITIES} from '../../data/expansion-units';
import {weaponFlightSpeed,type WeaponFlight} from '../../simulation/combat/weapon-flight';
import {COMBAT_FX_PROFILES,combatFxProfile,sourceOwnsEvent,sourceOwnsWeapon,sourceHologramDeath,type CombatFxProfile} from './combat-fx-profile';
import {SourceEffectPlayer,SOURCE_EFFECTS} from './source/player';
import {sourceFieldScale,sourceLife,sourceSeed} from './source/timeline';
import type {SourceEffectRequest,SourcePlacement} from './source/types';
import type {BattleEffects} from './battle-effects';

type P={x:number;y:number;z:number};
type Mount=(event:VisualEvent,side?:string)=>P;
type BodyPose=(event:VisualEvent,model:string,age:number)=>{matrix:number[];clip:string;seconds:number}|undefined;
type ShieldBounds=(event:VisualEvent)=>{center:P;radius:number;top?:P}|undefined;
type Echo={event:VisualEvent;profile:CombatFxProfile;mounts:P[];life:number;impactOnly?:boolean;key?:string;flightLaunch?:boolean;shield?:{center:P;radius:number;facing:number;rippleRadius:number;directional:boolean}};
const mix=(a:P,b:P,t:number):P=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const point=(w:World,p:Point&{flying?:boolean},h=.6):P=>({x:p.x,y:(p.flying?5.6:w.terrain?.height(p)??0)+h,z:p.z});
export const combatMuzzleSides=(profile:CombatFxProfile,sequence=1):Array<string|undefined>=>profile.key==='marauder'?[sequence%2?'Left':'Right']:profile.key==='thor-high-impact'?(sequence%2?['01','03']:['02','04']):profile.mounts??[undefined];
const rate=1.4;

/** One route owns each core weapon layer. All receipts and trajectories below are
 * read-only native state; this renderer has no World mutation or random calls. */
export class SourceCombatEffects {
 readonly player:SourceEffectPlayer;private equipment:EquipmentEffects;private serial=0;private time=0;private run='';private echoes:Echo[]=[];
 private mounts=new Map<string,P[]>();private launched=new Set<number>();private routes=new Set<string>();private flights=0;private events=0;
 private hologramDeaths=new Map<number,VisualEvent>();
 constructor(scene:THREE.Scene,camera:THREE.Camera,private fx:BattleEffects){this.player=new SourceEffectPlayer(scene,camera);this.equipment=new EquipmentEffects(scene);}
 load(){return this.player.load();}
 resumeAt(w:World){this.serial=w.visualEvents.at(-1)?.serial??0;this.time=w.time;this.run=w.runId??'';}
 reset(){this.serial=0;this.time=0;this.run='';this.echoes=[];this.mounts.clear();this.launched.clear();this.hologramDeaths.clear();this.player.reset();this.equipment.reset();}
 report(){return {routes:[...this.routes],events:this.events,flights:this.flights,echoes:this.echoes.length,source:this.player.report()};}
 private request(model:string,key:string,age:number,placement:SourcePlacement,ground:(p:Point)=>number,options:Partial<SourceEffectRequest>={}){
  this.player.add({key,model,age:Math.max(0,age*rate),clockRate:rate,seed:sourceSeed(key),placement,...options},ground);
 }
 private event(w:World,u:Entity,time=w.time,kind:VisualEvent['kind']='attack',end:Point&{flying?:boolean}=u):VisualEvent{
  const a=point(w,u),b=point(w,end);return {serial:0,time,kind,x:u.x,z:u.z,y:a.y,endY:b.y,end:{x:end.x,z:end.z},entityId:u.id,unitType:u.unitType,modelKey:u.modelKey,heroId:u.heroId,eliteId:u.eliteId,rank:u.rank,race:u.race,nativeMode:u.nativeMode,activeWeapon:u.activeWeapon,sourceTeam:u.team,enemyTier:u.enemyTier,summonKind:u.summonKind,rewardSourceKind:u.rewardSourceKind,visualScale:u.visualScale,shotSequence:u.shotSequence,attackId:`${u.id}:${u.shotSequence}`,projectileSpeed:weaponFlightSpeed(u),flying:u.flying,facing:u.attackFacing??u.facing,siege:u.mode==='siege',targetFlying:end.flying};
 }
 render(w:World,muzzle:Mount,bodyPose:BodyPose,shieldBounds?:ShieldBounds,equipmentMount?:(event:import('../../simulation/starship/presentation').EquipmentPresentationReceipt)=>P|undefined,funMatrix?:(u:Entity)=>number[]|undefined){
  if(!this.player.ready)return;if(w.time<this.time||this.run!==(w.runId??''))this.reset();this.time=w.time;this.run=w.runId??'';this.routes.clear();this.flights=this.events=0;this.player.begin(w.time);const ground=(p:Point)=>w.terrain?.height(p)??0;
  this.fx.sourceEventIds.clear();let eventIndex:SourceEventIndex|undefined;const indexedEvents=()=>eventIndex??=new SourceEventIndex(w.visualEvents);
  for(const e of w.visualEvents){const shieldReceipt=e.kind==='shield-hit'||e.kind==='shield-break',hologram=e.kind==='death'&&sourceHologramDeath(e);if(sourceOwnsEvent(e)||shieldReceipt||hologram)this.fx.sourceEventIds.add(e.serial);if(e.serial<=this.serial)continue;
   if(hologram)this.hologramDeaths.set(e.entityId,structuredClone(e));
   if(shieldReceipt){
    const target=w.body(e.entityId),source=e.hitSourceId===undefined?undefined:w.body(e.hitSourceId),bounds=shieldBounds?.(e)??{center:{x:e.x,y:e.y,z:e.z},radius:Math.max(.7,target?.unitRadius??.7)},profile=COMBAT_FX_PROFILES.get('shield-hit')!;
    this.echoes.push({event:structuredClone(e),profile,mounts:[],life:Math.max(...Object.values(profile.models).flat().map(id=>sourceLife(SOURCE_EFFECTS[id])/rate)),shield:{...bounds,facing:source?Math.atan2(source.x-e.x,source.z-e.z):e.facing,rippleRadius:.7+1.3*Math.max(0,Math.min(1,((e.shieldDamage??5)-5)/40)),directional:!!source}});
   }
   const profile=combatFxProfile(e);if(profile&&sourceOwnsEvent(e)){
    const mount=combatMuzzleSides(profile,e.shotSequence).map(side=>({...muzzle(e,side)}));if(e.attackId)this.mounts.set(e.attackId,mount);
    const life=Math.max(.8,...Object.values(profile.models).flatMap(ids=>ids.map(id=>sourceLife(SOURCE_EFFECTS[id])/rate)));
    const deferredLaunch=e.kind==='attack'&&((e.projectileSpeed??0)>0||w.weaponFlights.some(f=>f.attackId===e.attackId));
    if(!deferredLaunch&&w.time-e.time<=life)this.echoes.push({event:structuredClone(e),profile,mounts:mount,life});
   }
   if(['hit','shield-hit','shield-break'].includes(e.kind)&&e.hitSourceId!==undefined){
    // HP and shield receipts for the same strike select a single surface. The
    // authoritative missile receipt owns delayed impacts, including after death.
    const source=w.entities.get(e.hitSourceId),attack=indexedEvents().attack(e.hitSourceId,e.time),p=combatFxProfile(attack??source);
    const duplicate=indexedEvents().duplicate(e);
    if(p&&e.weaponHit)this.fx.sourceEventIds.add(e.serial);
    const stormSource=source?.unitType==='high_templar'&&!source.heroId&&source.eliteId!=='high_templar.2'||w.expedition.spells.some(s=>s.kind==='storm'&&s.source===e.hitSourceId)||w.protossElites.fields.some(f=>f.kind==='storm'&&f.source.id===e.hitSourceId);
    if(!duplicate&&!e.weaponHit&&stormSource){
     const storm=COMBAT_FX_PROFILES.get('storm')!,receipt={...e,kind:'projectile-impact' as const,end:{x:e.x,z:e.z},endY:e.y};
     this.fx.sourceEventIds.add(e.serial);this.echoes.push({event:receipt,profile:storm,mounts:[],life:Math.max(...storm.models.impact.map(id=>sourceLife(SOURCE_EFFECTS[id])/rate)),impactOnly:true});
    }
    const target=w.body(e.entityId);
    if(!duplicate&&e.weaponHit&&source&&source.attackRange>1&&target&&w.expedition.spells.some(s=>s.kind==='guardian'&&s.owner===target.owner&&s.until>w.time&&Math.hypot(s.x-target.x,s.z-target.z)<=s.radius+target.unitRadius)){
     const guardian=COMBAT_FX_PROFILES.get('guardian')!;this.echoes.push({event:{...e,kind:'projectile-impact',end:{x:e.x,z:e.z},endY:e.y},profile:guardian,mounts:[],life:Math.max(...guardian.models.impact.map(id=>sourceLife(SOURCE_EFFECTS[id])/rate)),impactOnly:true});
    }
    const missileReceipt=indexedEvents().missile(e);
    const channelImpact=p?.key==='colossus'||p?.key==='void-ray';
    if(!duplicate&&p&&source&&!attack?.projectileSpeed&&!missileReceipt&&!channelImpact&&e.weaponHit&&w.time-e.time<1){
     const receipt={...(attack??this.event(w,source)),time:e.time,serial:e.serial,kind:'projectile-impact' as const,end:{x:e.x,z:e.z},endY:e.y,targetSurface:e.targetSurface,targetFlying:e.flying,targetId:e.entityId};
     this.echoes.push({event:receipt,profile:p,mounts:[],life:Math.max(1,...(p.models.impact??[]).map(id=>sourceLife(SOURCE_EFFECTS[id])/rate)),impactOnly:true});
    }
   }
  }
  // Delayed elite salvos share one weapon-cycle event, but each committed flight
  // has its own native launch time. Reconstruct its source pose without adding a
  // second muzzle at the cycle event or inventing another gameplay receipt.
  for(const flight of w.weaponFlights){
   const p=combatFxProfile(flight.source);if(!p||w.time<flight.start||this.launched.has(flight.id))continue;this.launched.add(flight.id);
   const target=w.body(flight.target),e=this.event(w,{...flight.source,...flight.from},flight.start,'attack',{...flight.lastSeen,flying:target?.flying});
   const sides=p.key==='reaper'&&flight.hits===1?[flight.id%2===0?'Left':'Right']:combatMuzzleSides(p,flight.source.shotSequence),mounts=sides.map(side=>({...muzzle(e,side)}));
   const life=Math.max(.1,...[...p.models.launch??[],...p.models.body??[]].map(id=>sourceLife(SOURCE_EFFECTS[id])/rate));
   if(w.time-flight.start<life)this.echoes.push({event:e,profile:p,mounts,life,key:'flight-launch:'+flight.id,flightLaunch:true});
  }
  this.serial=w.visualEvents.at(-1)?.serial??this.serial;this.echoes=this.echoes.filter(e=>w.time-e.event.time<e.life);
  for(const echo of this.echoes)this.echo(w,echo,ground,muzzle,bodyPose,indexedEvents);
  // Continuous beams are reconstructed from saved native firing state. Transient
  // event history is deliberately absent after reload and cannot own a channel.
  for(const u of w.entities.values()){
   const p=combatFxProfile(u),age=w.time-u.lastShotAt,target=u.attackTarget===null?undefined:w.body(u.attackTarget);
   if(u.hp<=0||p?.kind!=='beam'||!target?.hp||(u.shotSequence??0)<=0||age<0||age>(p.key==='interceptor'?.24:Math.max(.24,u.shotInterval+1/60)))continue;
   const e=this.event(w,u,u.lastShotAt,'attack',target),from=muzzle(e),end=point(w,target),strength=u.eliteId==='void_ray.1'?1+Math.min(1,Math.max(0,(u.protossEliteCombat?.lastFire??0)-(u.protossEliteCombat?.lockAt??0))/2):1;
   this.routes.add(p.key);
   for(const model of [...p.models.beam??[],...(p.key==='void-ray'?p.models.impact??[]:[])])this.request(model,'channel:'+u.id+':'+u.shotSequence+':'+model,age,{...from,facing:e.facing,end,scale:strength},ground,{loop:true,hostedBeam:true});
  }
  for(const a of w.expedition.weaponAreas){
   const u=w.entities.get(a.source);if(u?.unitType!=='colossus'||u.heroId||a.nextIndex<=0)continue;
   const at=a.points[Math.min(a.nextIndex-1,a.points.length-1)],e=this.event(w,u,u.lastShotAt,'attack',at),siblings=w.expedition.weaponAreas.filter(b=>b.source===u.id),from=muzzle(e,siblings.indexOf(a)%2?'Right':'Left'),end=point(w,at,.12),age=Math.max(0,w.time-(a.next-a.nextIndex*a.period)),p=COMBAT_FX_PROFILES.get('colossus')!;
   if(u.hp>0)for(const model of p.models.beam)this.request(model,'thermal:'+a.id+':'+model,age,{...from,facing:e.facing,end},ground,{loop:true,hostedBeam:true});
   for(const model of p.models.impact??[])this.request(model,'thermal-impact:'+a.id+':'+model,age,{...end,facing:e.facing},ground,{loop:true});
  }
  for(const f of w.weaponFlights)if(sourceOwnsWeapon(f.source)&&w.time>=f.start)this.flight(w,f,muzzle,ground);
  for(const f of w.effects){const u=w.entities.get(f.source);if(u?.heroId||f.until<=w.time)continue;
   if(f.kind==='bile'&&(!u||u.unitType==='ravager')){const age=BILE.delay-(f.until-w.time),t=Math.max(0,Math.min(1,age/BILE.delay)),from=point(w,f,1.3),end=point(w,f.end,.15),head=mix(from,end,t);head.y+=Math.sin(t*Math.PI)*7;this.request('RavagerCorrosiveBileMissile','bile:'+f.id,age,{...head,facing:Math.atan2(end.x-from.x,end.z-from.z),from,age:age*rate},ground,{loop:true});}
   if(f.kind==='flame'&&u?.unitType==='hellion'&&u.eliteId!=='hellion.2'){
    const profile=combatFxProfile(u)!,event=this.event(w,u,f.until-.35,'attack',f.end),from=muzzle(event),end=point(w,f.end,.5),age=Math.max(0,w.time-(f.until-.35));
    if(profile.key==='hellion')for(const id of profile.models.beam??[])this.request(id,'flame:'+f.id+':'+id,age,{...from,facing:event.facing,end},ground,{loop:true});
   }
  }
  for(const b of w.zergElites.biles)if(b.launched&&w.time>=b.launchAt&&w.time<b.impactAt){const age=w.time-b.launchAt,t=age/(b.impactAt-b.launchAt),from=point(w,b.source,1.3),end=point(w,b.point,.15),head=mix(from,end,t);head.y+=Math.sin(t*Math.PI)*7;this.request('RavagerCorrosiveBileMissile','elite-bile:'+b.id,age,{...head,facing:Math.atan2(end.x-from.x,end.z-from.z),from,age:age*rate,scale:b.source.eliteId==='ravager.2'?1.5:1},ground,{loop:true});}
  for(const l of w.zergElites.lines){if(l.kind==='spear'){const at=point(w,{...l.point,flying:l.air});this.request('NeedleSpinesWeapon','spear:'+l.id,Math.max(0,l.progress/56),{...at,facing:l.facing,scale:1.35},ground,{loop:true});continue;}
   // Each original ground-spike model starts when the native finite line reaches
   // that point. The saved next/progress pair reconstructs its age after reload.
   for(let d=Math.max(1,Math.ceil(l.progress-3.5));d<=l.progress;d++){const at={x:l.from.x+Math.sin(l.facing)*d,z:l.from.z+Math.cos(l.facing)*d},age=w.time-(l.next-.04-(l.progress-d)*.04),scale=l.width/1.2;for(const model of COMBAT_FX_PROFILES.get('lurker')!.models.impact)this.request(model,'spine:'+l.id+':'+d+':'+model,age,{...point(w,at,0),facing:l.facing,scale},ground);}
  }
  for(const s of w.expedition.spells){if(s.until<=w.time)continue;const u=w.entities.get(s.source);if(u?.heroId)continue;
   const kind=s.kind==='storm'?'storm':s.kind==='guardian'?'guardian':'queen-heal',profile=COMBAT_FX_PROFILES.get(kind)!,duration=s.kind==='storm'?SOURCE_ABILITIES.psiStorm.searchPeriods*SOURCE_ABILITIES.psiStorm.damagePeriod:s.kind==='guardian'?SOURCE_ABILITIES.guardianShield.duration:SOURCE_ABILITIES.transfusion.duration,age=duration-(s.until-w.time),target=s.target===null?undefined:w.entities.get(s.target),at=point(w,target??s,s.kind==='transfusion'?.5:0),models=s.kind==='transfusion'?profile.models.impact:profile.models.field;
   const scale=s.kind==='transfusion'?1:sourceFieldScale(SOURCE_EFFECTS[profile.models.field[0]],s.radius);
   for(const model of models??[])this.request(model,'spell:'+s.id+':'+model,age,{...at,facing:0,scale},ground,{loop:true});
  }
  for(const f of w.protossElites.fields){if(f.until<=w.time||!['storm','guardian'].includes(f.kind))continue;const profile=COMBAT_FX_PROFILES.get(f.kind)!,duration=f.kind==='storm'?SOURCE_ABILITIES.psiStorm.searchPeriods*SOURCE_ABILITIES.psiStorm.damagePeriod:SOURCE_ABILITIES.guardianShield.duration,age=duration-(f.until-w.time),scale=sourceFieldScale(SOURCE_EFFECTS[profile.models.field[0]],f.radius);for(const model of profile.models.field??[])this.request(model,'elite-field:'+f.id+':'+model,age,{...point(w,f.point,0),facing:0,scale},ground,{loop:true});}
  for(const u of w.entities.values())if(u.hp>0&&!u.heroId&&u.unitType==='medivac')for(const id of u.healTargets??(u.healTarget?[u.healTarget]:[])){const target=w.entities.get(id);if(!target?.hp)continue;const key='heal:'+u.id+':'+id,age=w.time,event=this.event(w,u,w.time,'skill-heal',target),from=muzzle(event,'Center'),bounds=shieldBounds?.(this.event(w,target)),end=bounds?.center??point(w,target,.6);this.request('MedivacHealBeam',key,age,{...from,facing:Math.atan2(end.x-from.x,end.z-from.z),end},ground,{loop:true,hostedBeam:true});this.request('MedicHealModel',key+':target',age,{...(bounds?.top??end),facing:0},ground,{loop:true,clip:'Birth'});}
  for(const l of w.protossElites.lines)if(l.kind==='thermal'&&l.index>0){const at=l.points[Math.min(l.index-1,l.points.length-1)],event=this.event(w,l.source,w.time,'attack',at),siblings=w.protossElites.lines.filter(a=>a.kind==='thermal'&&a.source.id===l.source.id),from=muzzle(event,siblings.indexOf(l)%2?'Right':'Left'),end=point(w,at,.12),age=Math.max(0,w.time-(l.next-l.index*l.period)),p=COMBAT_FX_PROFILES.get('colossus')!;for(const model of p.models.beam)this.request(model,'elite-thermal:'+l.id+':'+model,age,{...from,facing:event.facing,end},ground,{loop:true,hostedBeam:true});for(const model of p.models.impact??[])this.request(model,'elite-thermal-impact:'+l.id+':'+model,age,{...end,facing:event.facing},ground);}
  const activeAttacks=new Set(w.weaponFlights.map(f=>f.attackId)),activeFlights=new Set(w.weaponFlights.map(f=>f.id));for(const id of this.launched)if(!activeFlights.has(id))this.launched.delete(id);for(const e of this.echoes)if(e.event.attackId)activeAttacks.add(e.event.attackId);for(const key of this.mounts.keys())if(!activeAttacks.has(key))this.mounts.delete(key);
  // Only real death receipts start this one-shot. Retain its event snapshot if
  // the unit is reclaimed; completed deaths are never synthesized after reload.
  for(const [id,e]of this.hologramDeaths){const age=w.time-e.time,model='Hologram_Death_Large';if(age>sourceLife(SOURCE_EFFECTS[model])/rate){this.hologramDeaths.delete(id);continue;}this.routes.add('science-vessel-hologram-death');this.request(model,'hologram-death:'+id+':'+e.serial,age,{x:e.x,y:e.y,z:e.z,facing:e.facing},ground,{clip:'Death'});}
  this.equipment.render(w,this.player,ground,equipmentMount);
  renderFunSource(w,this.player,ground,funMatrix);
  this.player.end();
 }
 private echo(w:World,echo:Echo,ground:(p:Point)=>number,muzzle:Mount,bodyPose:BodyPose,indexedEvents:()=>SourceEventIndex){
  const {event:e,profile:p}=echo,age=w.time-e.time,key=echo.key??'event:'+e.serial;this.routes.add(p.key);this.events++;
  const end={...e.end,y:e.endY},facing=e.facing;
  if(echo.shield){
   const s=echo.shield,live=w.body(e.entityId),center={...s.center};if(live?.hp){center.x+=live.x-e.x;center.z+=live.z-e.z;center.y+=(live.flying?5.6:ground(live))-(e.flying?5.6:ground(e));}
   const model=s.directional?'ProtossShieldDamage':'ProtossShieldFull',scale=sourceFieldScale(SOURCE_EFFECTS[model],s.radius);
   this.request(model,key+':shield',age,{...center,facing:s.facing,scale},ground,{clip:'Birth'});
   if(s.directional)this.request('ProtossShieldRipple',key+':ripple',age,{x:center.x+Math.sin(s.facing)*s.radius,y:center.y,z:center.z+Math.cos(s.facing)*s.radius,facing:s.facing,scale:s.rippleRadius/1.4},ground,{clip:'Birth'});
   return;
  }
  if(e.kind==='attack'){
   for(const [side,from]of echo.mounts.entries())for(const model of p.models.launch??[])this.request(model,key+':launch:'+side+':'+model,age,{...from,facing,end},ground);
   for(const model of p.models.body??[]){const pose=bodyPose(e,model,age);if(pose)this.request(model,key+':body:'+model,0,{x:e.x,y:e.y,z:e.z,facing,matrix:pose.matrix},ground,{clip:pose.clip,age:pose.seconds,mesh:false});}
   // Lurker/Colossus extents are driven by their actual progressive receipts.
   if(p.kind==='detonation')for(const model of p.models.impact??[])this.request(model,key+':detonation:'+model,age,{...point(w,e,0),facing},ground,{mesh:false});
   return;
  }
  if(e.kind==='weapon-area'&&p.key==='colossus'){
   // One live actor per sweep owns its moving endpoint. Damage-step receipts must
   // not create overlapping copies of the same beam and impact on every tick.
   if(age>.085||w.expedition.weaponAreas.some(a=>a.id===e.castId)||this.echoes.some(a=>a.event.kind===e.kind&&a.event.castId===e.castId&&a.event.serial>e.serial))return;
   for(const model of p.models.impact??[])this.request(model,key+':sweep-end:'+model,age,{...end,facing},ground);return;
  }
  if(e.kind==='baneling-recover')return; // The attack already owns this same detonation.
  let models:string[]=[];
  if(e.kind==='death'&&p.key==='baneling'){if(indexedEvents().nearbyAttack(e.entityId,e.time))return;models=p.models.impact;}
  else if(e.kind==='bile-impact')models=COMBAT_FX_PROFILES.get('ravager-bile')!.models.impact;
  else if(e.kind==='skill-heal')models=COMBAT_FX_PROFILES.get('queen-heal')!.models.impact;
  else if(e.kind==='weapon-area'&&p.key==='lurker')models=p.models.impact??[];
  else if(e.kind==='projectile-impact'){
   models=p.models['impact'+(e.targetSurface==='shield'?'Shield':e.targetSurface==='flesh'?'Flesh':'Armor')]??p.models.impact??[];
   if(p.key==='mutalisk')models=[models[Math.min(2,e.weaponHop??0)]??models[0]];
   if(p.kind==='melee'&&!models.length&&e.targetSurface==='flesh')models=['BloodTargetImpact'];
   const reaction=p.models['reaction'+(e.targetSurface==='flesh'?'Flesh':e.targetSurface==='shield'?'Shield':'Armor')];if(reaction)models=[...models,...reaction];
   if(e.targetSurface==='shield'&&['hydralisk','queen-ground','queen-air'].includes(p.key))models=['HydraliskGroundAttackImpactShield'];
  }
  for(const model of new Set(models.filter(Boolean)))this.request(model,key+':impact:'+model,age,{...end,y:p.key==='lurker'?ground(end):end.y,facing,scale:e.eliteId==='ravager.2'&&e.kind==='bile-impact'?1.5:1},ground,{mesh:model==='BanelingDeath'?false:undefined});
 }
 private flight(w:World,f:WeaponFlight,muzzle:Mount,ground:(p:Point)=>number){
  const p=combatFxProfile(f.source)!;if(!p.models.flight?.length)return;this.routes.add(p.key);this.flights++;const u=f.source,target=f.lost?undefined:w.body(f.target),from=point(w,{...f.from,flying:f.hop?!!w.body(f.seen.at(-1)!)?.flying:u.flying},.8),to=point(w,{...f.point,flying:!!target?.flying}),travel=Math.hypot(f.point.x-f.from.x,f.point.z-f.from.z),total=Math.max(.01,Math.hypot(f.lastSeen.x-f.from.x,f.lastSeen.z-f.from.z)),t=Math.min(1,travel/total),angle=Math.atan2(f.lastSeen.x-f.point.x,f.lastSeen.z-f.point.z),age=w.time-f.start;
  let mounts=this.mounts.get(f.attackId);if(!mounts){const event=this.event(w,{...u,x:f.from.x,z:f.from.z},f.start,'attack',{...f.lastSeen,flying:target?.flying});mounts=combatMuzzleSides(p,u.shotSequence).map(side=>muzzle(event,side));this.mounts.set(f.attackId,mounts);}
  for(const [side,mount]of (f.hop?[from]:mounts).entries()){
   const blend=f.hop?0:Math.max(0,1-travel/2),head={x:f.point.x+(mount.x-f.from.x)*blend,y:from.y+(to.y-from.y)*t+(mount.y-from.y)*blend,z:f.point.z+(mount.z-f.from.z)*blend},scale=u.eliteId==='roach.2'&&u.zergEliteCombat?.stacks===0?1.9:u.eliteId==='corruptor.1'?1+.6*Math.min(1,((u.zergEliteCombat?.lastFire??0)-(u.zergEliteCombat?.lockAt??0))/4):1;
   const airborneRoach=u.unitType==='roach'&&u.flying,endpoint=point(w,{...f.lastSeen,flying:!!target?.flying});
   if(airborneRoach)head.y=mount.y+(endpoint.y-mount.y)*t;
   const direction=airborneRoach?{x:f.lastSeen.x-mount.x,y:endpoint.y-mount.y,z:f.lastSeen.z-mount.z}:undefined;
   for(const model of p.models.flight)this.request(model,'flight:'+f.id+':'+f.hop+':'+side+':'+model,age,{...head,facing:angle,from:f.hop?from:mount,age:age*rate,scale,direction},ground,{loop:true});
  }
 }
}
