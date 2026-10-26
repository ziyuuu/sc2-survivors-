import type {World} from '../../simulation/world';
import type {Entity,Point,VisualEvent} from '../../simulation/types';
import {combatFxProfile,sourceHologramDeath} from './combat-fx-profile';
import {SourceEventIndex} from './source/event-index';
import {StimPresentation} from './stim-presentation';
import {equipmentPresentationReceipts} from '../../simulation/starship/presentation';
import {SOUND_DATA,type WeaponSound} from './audio-source-data';
import type {SoundCue} from './native-sound-player';
import {MotionAudio} from './motion-audio';

type Identity=Partial<Entity>&{siege?:boolean;sourceTeam?:Entity['team'];targetFlying?:boolean};
export type AudioChannel={key:string;bank:string;start?:string;end?:string;priority:number;volume:number;rate?:number};
export function weaponSoundKey(u:Identity):string{
 if(u.summonKind==='interceptor')return 'interceptor';
 if(u.mission?.fleet)return 'hero:yamato_battlecruiser'+(u.targetFlying?'-air':'');
 if(u.heroId){const air=u.targetFlying&&['yamato_battlecruiser','hots_leviathan'].includes(u.heroId);return 'hero:'+u.heroId+(air?'-air':'');}
 if(u.unitType==='hydralisk')return u.activeWeapon==='HydraliskMelee'?'hydralisk-melee':u.targetFlying?'hydralisk-air':'hydralisk';
 if(u.unitType==='roach'&&u.activeWeapon==='RoachMelee')return 'roach-melee';
 return combatFxProfile(u)?.key??u.unitType??'';
}
export function deathSoundKey(u:Identity):string{const key=u.modelKey?.replace(/\.timeout$/,'');if(key&&['fun-nydus','fun-infested-marine','fun-cocoon'].includes(key))return key;return u.summonKind==='interceptor'?'interceptor':u.heroId?'hero:'+u.heroId:u.unitType??'';}
const fortWeapon=(kind:string)=>kind==='bunker'?'building:bunker':kind==='turret_protoss'?'building:photon-cannon':kind==='turret_zerg'?'building:spine-crawler':'building:auto-turret';
/** Read-only audio receipts; no damage, simulation timers or random calls. */
export class CombatAudioRouter {
 private serial=0;private equipmentSerial=0;private time=0;private run='';private initialized=false;
 private seen=new Map<string,number>();private stim=new StimPresentation();
 private cloaked=new Map<number,boolean>();private ability=new Map<number,number>();
 private fleetCasts=new Map<number,string>();
 private motion=new MotionAudio();
 readonly routes=new Set<string>();
 reset(){this.serial=this.equipmentSerial=0;this.time=0;this.run='';this.initialized=false;this.seen.clear();this.stim.reset();this.routes.clear();this.cloaked.clear();this.ability.clear();this.fleetCasts.clear();this.motion.reset();}
 resumeAt(w:World){this.reset();this.initialized=true;this.time=w.time;this.run=w.runId??'';this.serial=w.visualEvents.at(-1)?.serial??0;this.equipmentSerial=equipmentPresentationReceipts(w).at(-1)?.serial??0;this.stim.resumeAt(w);this.motion.resumeAt(w);for(const b of w.encounters.expanded.bursts)this.seen.set('fun-burst:'+b.id,w.time);for(const e of w.heroAttackEvents)this.seen.set('hero:'+e.kind+':'+e.packet.id+':'+e.at,w.time);}
 private once(key:string,time:number){if(this.seen.has(key))return false;this.seen.set(key,time);return true;}
 update(w:World):{cues:SoundCue[];channels:AudioChannel[];silentStop:boolean}{
  if(this.initialized&&(w.time<this.time||this.run!==(w.runId??''))){this.resumeAt(w);return {cues:[],channels:[],silentStop:true};}
  this.initialized=true;this.run=w.runId??'';this.time=w.time;for(const [k,t]of this.seen)if(w.time-t>16)this.seen.delete(k);
  const cues:SoundCue[]=[],channels:AudioChannel[]=[],stopped=w.phase!=='battle'||w.paused||w.requiresPlayerDecision;
  const near=(p:Point)=>Math.hypot(p.x-w.anchor.x,p.z-w.anchor.z)<=32;
  const volume=(p:Point)=>.22*Math.max(.15,1-Math.hypot(p.x-w.anchor.x,p.z-w.anchor.z)/40);
  const emit=(bank:string|null|undefined,p:Point,priority=1,key?:string)=>{if(!bank||!near(p)||key&&!this.once(key,w.time))return;this.routes.add(bank);cues.push({bank,priority,volume:volume(p)});};
  const special=(id:string,index:number,p:Point,priority=2,key?:string)=>emit(SOUND_DATA.special[id]?.[index],p,priority,key);
  const channel=(key:string,bank:string|undefined,p:Point,priority=1,start?:string,end?:string)=>{if(bank&&near(p)){this.routes.add(bank);channels.push({key,bank,start,end,priority,volume:volume(p)});}};
  const weapon=(u:Identity):WeaponSound|undefined=>SOUND_DATA.weapons[weaponSoundKey(u)];
  const impact=(u:Identity,p:Point,surface?:string,key?:string)=>{const route=weapon(u);emit(surface==='shield'?route?.surfaces.shield??SOUND_DATA.special.shieldHit[0]:route?.surfaces[surface??'']??route?.impact,p,1,key);};
  // Consume paused history so unpausing cannot replay previous attacks/deaths.
  if(stopped){this.serial=w.visualEvents.at(-1)?.serial??this.serial;this.equipmentSerial=equipmentPresentationReceipts(w).at(-1)?.serial??this.equipmentSerial;this.stim.resumeAt(w);this.motion.pauseAt(w);for(const b of w.encounters.expanded.bursts)this.once('fun-burst:'+b.id,w.time);for(const e of w.heroAttackEvents)this.once('hero:'+e.kind+':'+e.packet.id+':'+e.at,w.time);return {cues,channels,silentStop:true};}
  const index=new SourceEventIndex(w.visualEvents);
  for(const e of w.visualEvents){
   if(e.serial<=this.serial)continue;this.serial=e.serial;if(w.time-e.time>.3||!near(e))continue;
   const u=e as unknown as Identity,skill=e.heroId?SOUND_DATA.skills[e.heroId]:undefined;
   if(e.missionFleet&&e.kind==='skill-line'){
    const key=e.entityId+':'+e.time;this.fleetCasts.set(e.entityId,key);emit(skill?.charge,e,4,'fleet-charge:'+key);continue;
   }
   if(e.missionFleet&&(e.kind==='skill-launch'||e.kind==='skill-impact')){
    const key=this.fleetCasts.get(e.entityId)??e.entityId+':'+e.time;
    emit(e.kind==='skill-launch'?skill?.launch:skill?.impact,e.kind==='skill-launch'?e:e.end,4,'fleet-'+e.kind+':'+key);continue;
   }
   if(e.kind==='sound'&&e.supportSound?.startsWith('death:')){for(const bank of SOUND_DATA.deaths[e.supportSound.slice(6)]??[])emit(bank,e,3);}
   else if(e.kind==='sound'&&e.supportSound==='attack')emit(weapon(u)?.attack,e,2);
   else if(e.kind==='sound'&&e.supportSound==='impact')impact(u,e.end,e.targetSurface,'enemy-impact:'+e.entityId+':'+e.targetId+':'+e.time);
   else if(e.supportSound?.startsWith('impact-source:')){const source=w.entities.get(Number(e.supportSound.slice(14)));if(source)impact(source,e);}
   else if(e.kind==='attack'){
    if(e.heroId&&!e.missionFleet&&e.summonKind!=='interceptor')continue;
    const route=weapon(u),flights=w.weaponFlights.filter(f=>f.attackId===e.attackId);
    if(!route?.channel&&!flights.length)emit(route?.attack,e,1,'attack:'+(e.attackId??e.serial));
   }else if(e.kind==='projectile-impact'){
    if(e.heroId&&!e.missionFleet&&e.summonKind!=='interceptor')continue;
    const id=e.unitType==='mutalisk'&&(e.weaponHop??0)>0?'mutalisk-bounce'+((e.weaponHop??0)+1):weaponSoundKey(u),r=SOUND_DATA.weapons[id];
    emit(e.targetSurface==='shield'?r?.surfaces.shield??SOUND_DATA.special.shieldHit[0]:r?.impact,e.end,1,'impact:'+(e.attackId??e.serial)+':'+e.targetId+':'+e.time);
   }else if(['hit','shield-hit','shield-break'].includes(e.kind)&&e.weaponHit&&e.hitSourceId!==undefined&&!index.duplicate(e)&&!index.missile(e)){
    const attack=index.attack(e.hitSourceId,e.time),source=w.entities.get(e.hitSourceId);if(!source||source.heroId)continue;
    const route=weapon(source);if(route?.channel||attack?.projectileSpeed)continue;
    impact((attack??source) as Identity,e,e.targetSurface,source.unitType==='colossus'?'sweep-impact:'+e.hitSourceId+':'+source.shotSequence:undefined);
   }else if(e.kind==='death'){
    if(e.equipmentProjection){special('hallucination',e.unitType==='colossus'?3:1,e,2);continue;}
    if(e.unitType==='baneling'&&index.nearbyAttack(e.entityId,e.time))continue;
    if(sourceHologramDeath(u)){special('hologramDeath',0,e,3);continue;}
    const key=e.supportSound?.startsWith('death:')?e.supportSound.slice(6):deathSoundKey(u);for(const bank of SOUND_DATA.deaths[key]??[])emit(bank,e,3);
   }else if(e.kind==='skill-launch'&&skill){
    // Swann's four heal pulses share one cast and one repair channel.
    if(!['swann','artanis'].includes(e.heroId!))emit(skill.launch,e,4,'skill-start:'+e.heroId+':'+e.castId);
   }else if(['skill-impact','skill-line','skill-status'].includes(e.kind)&&skill){
    if(['swann','niadra'].includes(e.heroId!))continue;
    emit(skill.impact,e.end,4,'skill-impact:'+e.heroId+':'+e.castId);
   }else if(e.kind==='barrier-start'&&e.heroId==='artanis'&&e.castId){emit(skill?.launch,e,4,'skill-start:artanis:'+e.castId);emit(skill?.impact,e,4,'skill-impact:artanis:'+e.castId);}
   else if(e.kind==='hero-revive'&&skill)emit(skill.revive,e.end,4,'revive:'+e.castId+':'+e.targetId);
   else if(e.kind==='skill-heal'&&!e.heroId&&e.unitType==='queen'&&e.castId===undefined)special('queenHeal',0,e,2,'heal:'+e.entityId+':'+e.time);
   else if(e.kind==='bile-impact'&&!e.heroId)special('bile',1,e.end,2);
   else if(e.kind==='enemy-special-impact'){
    if(e.enemySpecial?.kind==='bile')special('bile',1,e.end,2);
    else emit(SOUND_DATA.weapons[e.enemySpecial?.kind==='spikes'?'lurker':'roach']?.impact,e.end,2);
   }else if(e.kind==='storm-start')special('storm',0,e,2,'storm:'+e.entityId+':'+e.time);
   else if(e.kind==='strategic-impact'){
    if(e.eliteId==='high_templar.2'){special('feedback',0,e,3);special('feedback',1,e.end,3);}
    else if(e.eliteId==='sentry.2'){emit(SOUND_DATA.skills.vorazun.launch,e,3);emit(SOUND_DATA.skills.vorazun.impact,e.end,3);}
    else special(w.expedition.race==='terran'?'nuke':w.expedition.race==='zerg'?'bombardZerg':'bombardProtoss',w.expedition.race==='terran'?2:0,e,5);
   }
   else if((e.kind==='support-impact'||e.kind==='support-pulse')&&e.supportSound){const route=SOUND_DATA.weapons[e.supportSound];if(route)emit(route.impact,e,2);else special(e.supportSound,0,e,2);}
   else if(e.kind==='drone-death')for(const bank of SOUND_DATA.deaths.drone)emit(bank,e,3);
   else if(e.kind==='egg-expired')for(const bank of SOUND_DATA.deaths.egg)emit(bank,e,2);
   else if(e.kind==='unit-expired')special(e.race==='zerg'?'burrow':'recall',0,e,2);
   else if(e.kind==='pod-land'||e.kind==='pod-open'){
    const race=e.race??w.expedition.race;
    if(race==='zerg')e.kind==='pod-land'?special('podZerg',0,e,3):special('unburrow',1,e,3);
    else special(race==='protoss'?'podProtoss':'podTerran',e.kind==='pod-land'?0:1,e,3);
   }else if(e.kind==='pod-destroy')for(const bank of SOUND_DATA.deaths['building:'+(e.race??w.expedition.race)]??[])emit(bank,e,3);
  }
  for(const f of w.weaponFlights){
   if(f.source.heroId&&f.source.summonKind!=='interceptor'||w.time<f.start||w.time-f.start>.3)continue;
   if(this.once('flight:'+f.id+':'+f.hop,w.time)&&f.hop===0)emit(weapon(f.source)?.attack,f.from);
  }
  for(const e of w.heroAttackEvents){
   if(!this.once('hero:'+e.kind+':'+e.packet.id+':'+e.at,w.time)||w.time-e.at>.3)continue;
   const p=e.packet,u={...p.source,targetFlying:!!w.body(p.target)?.flying},route=p.kind==='missile'?SOUND_DATA.weapons['hero-missile']:weapon(u);
   if(e.kind==='launch')emit(route?.attack,e.p,2);
   else if(e.kind==='impact'||e.kind==='line-dot')emit(route?.impact,e.p,2,'hero-impact:'+p.id);
  }
  for(const cue of this.stim.update(w))if(cue.kind==='start')special(cue.unit.unitType==='marauder'?'stimMarauder':'stimMarine',0,cue.unit,4);
  for(const u of w.entities.values()){
   if(u.hp<=0)continue;const route=weapon(u),target=u.attackTarget===null?undefined:w.body(u.attackTarget),gap=Math.max(.24,u.shotInterval+1/60);
   if(!u.heroId&&u.unitType==='banshee'){const old=this.cloaked.get(u.id);if(old!==undefined&&old!==!!u.cloaked)special('cloak',u.cloaked?0:1,u,2);this.cloaked.set(u.id,!!u.cloaked);}
   if(!u.heroId&&u.unitType==='stalker'){const old=this.ability.get(u.id),ready=u.abilityReady??0;if(old!==undefined&&Number.isFinite(ready)&&ready>old&&ready>w.time)special('blink',0,u,2);this.ability.set(u.id,ready);}
   if(route?.channel&&target?.hp&&(u.shotSequence??0)>0&&w.time-u.lastShotAt>=0&&w.time-u.lastShotAt<=gap){
    const powered=u.eliteId==='void_ray.1'&&(u.protossEliteCombat?.lastFire??0)-(u.protossEliteCombat?.lockAt??0)>=5;
    channel('weapon:'+u.id+':'+target.id,powered?route.powered:route.channel[1],u,1,route.channel[0],route.channel[2]);
   }
   if(!u.heroId&&u.healTarget&&w.body(u.healTarget)?.hp){
    if(u.unitType==='medivac'){const [start,loop,end]=SOUND_DATA.special.medivac;channel('heal:'+u.id,loop,u,2,start,end);}
    else if(u.unitType==='science_vessel')channel('repair:'+u.id,SOUND_DATA.special.repair[0],u,2);
   }
  }
  for(const c of w.heroCasts){const skill=SOUND_DATA.skills[c.hero],u=w.entities.get(c.source)??w.starship.skillSources.get(c.source);if(!u?.hp||!skill)continue;
   if(c.beganAt!==undefined&&w.time-c.beganAt<.3&&c.phase!=='dot')emit(skill.charge,u,4,'charge:'+c.source+':'+c.beganAt);
   if(c.hero==='swann'&&c.phase==='channel')channel('skill:swann:'+c.id,skill.loop,u,4,skill.launch,skill.end);
  }
  for(const c of w.zergHeroes.revivals){const u=w.entities.get(c.source),skill=SOUND_DATA.skills.niadra;if(u?.hp&&c.until>w.time)channel('revival:'+c.id,skill.loop,u,4,undefined,skill.end);}
  for(const s of w.expedition.spells)if(s.until>w.time){if(s.kind==='guardian'){const [start,loop,end]=SOUND_DATA.special.guardian;channel('guardian:'+s.id,loop,s,2,start,end);}else if(s.kind==='storm')special('storm',1,s,2,'storm-field:'+s.id);else if(s.kind==='transfusion')special('queenHeal',0,s,2,'transfusion:'+s.id);}
  for(const f of w.protossElites.fields)if(f.until>w.time){if(f.kind==='guardian'){const [start,loop,end]=SOUND_DATA.special.guardian;channel('guardian-elite:'+f.id,loop,f.point,2,start,end);}else if(f.kind==='storm')special('storm',1,f.point,2,'elite-storm:'+f.id);}
  for(const f of w.effects){
   if(f.until<=w.time)continue;const fort=w.fortifications.get(f.source);if(!fort)continue;
   if(f.kind==='shot'&&this.once('fort:'+f.id,w.time)){const route=SOUND_DATA.weapons[fortWeapon(fort.kind)];emit(route.attack,f,2);emit(route.impact,f.end,1);}
   else if(f.kind==='heal')channel('fort-repair:'+fort.id,SOUND_DATA.special.repair[0],fort,2);
  }
  for(const e of equipmentPresentationReceipts(w)){
   if(e.serial<=this.equipmentSerial)continue;this.equipmentSerial=e.serial;if(w.time-e.time>.3)continue;
   // Fort shots are already owned by their original shot Effect above.
   if(e.kind==='boost-start')special(e.source.unitType==='marauder'?'stimMarauder':'stimMarine',0,e.source,3);
   else if(e.kind==='projection-birth'||e.kind==='projection-end')special('hallucination',(e.source.unitType==='colossus'?2:0)+(e.kind==='projection-end'?1:0),e.source,2);
   else if(e.kind==='recall-from'||e.kind==='recall-to')special('recall',e.kind==='recall-from'?0:1,e.source,3);
   else if(e.kind==='expiry')special(e.source.race==='zerg'?'burrow':'recall',0,e.source,2);
   else if(e.kind==='capture')special('capture',0,e.source,3);
   else if(e.kind==='rewind'||e.kind==='evolve')special('warp',1,e.source,3);
   else if(e.kind==='reinforcement'||e.kind==='fort-deploy')special(e.source.race==='zerg'?'unburrow':e.source.race==='protoss'?'warp':'podTerran',e.source.race==='zerg'?(e.source.radius>1?1:0):0,e.source,2);
   else if(e.kind==='heal')special(e.source.race==='zerg'?'queenHeal':'medicHeal',0,e.source,2);
  }
  for(const b of w.encounters.expanded.bursts)if(b.model==='BanelingDeath'&&w.time-b.time>=0&&w.time-b.time<.3)emit(SOUND_DATA.weapons.baneling.attack,b.point,3,'fun-burst:'+b.id);
  const support=w.expedition.support;
  if(support.unique.activeUntil>w.time){const race=w.expedition.race;special(race==='terran'?'stimMarine':'queenHeal',0,w.anchor,4,'tactical:'+race+':'+support.unique.activeUntil);}
  for(const s of support.impacts)if(s.kind==='strategic'&&w.expedition.race==='terran'){
   if(w.time>=s.at-3)special('nuke',0,s.point,5,'nuke-launch:'+s.id);
   if(w.time>=s.at-1)special('nuke',1,s.point,5,'nuke-drop:'+s.id);
  }
  for(const p of support.unique.packets)if(p.start<=w.time&&w.time-p.start<.3&&this.once('support:'+p.id,w.time)){
   const source=w.entities.get(p.source),route=p.kind==='bunker'?SOUND_DATA.weapons['building:bunker']:p.kind==='missile'?SOUND_DATA.weapons['hero-missile']:source?weapon(source):undefined;emit(route?.attack,p.from,2);
  }
  const prism=support.unique.prism;if(prism&&prism.remaining<10){const r=SOUND_DATA.weapons['void-ray'];channel('prism:'+prism.id,r.channel?.[1],prism.origin,4,r.channel?.[0],r.channel?.[2]);}
  for(const c of w.enemySpecials.casts){if(c.kind==='bile'&&this.once('enemy-bile:'+c.id,w.time))special('bile',0,c.origin,2);}
  for(const b of w.zergElites.biles)if(b.launched&&w.time-b.launchAt<.3&&this.once('elite-bile:'+b.id,w.time))special('bile',0,b.source,2);
  for(const f of w.effects)if(f.kind==='bile'&&this.once('bile:'+f.id,w.time))special('bile',0,f,2);
  const motion=this.motion.update(w);for(const c of [...motion.cues,...motion.channels])this.routes.add(c.bank);cues.push(...motion.cues);channels.push(...motion.channels);
  return {cues,channels,silentStop:false};
 }
}
