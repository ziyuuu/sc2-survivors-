import fs from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {confirmedMotionPlan} from './confirmed-motion-plan.mjs';
// Original unit actors, including native form and hero identities. An unresolved
// Movement token alone does not establish silence: ModelData events also matter.
export const MOTION_ACTORS={
 marine:['melee','Marine'],marauder:['melee','Marauder'],reaper:['melee','Reaper'],hellion:['melee','Hellion'],hellbat:['melee','HellionTank'],tank:['melee','SiegeTank'],thor:['melee','Thor'],viking:['melee','VikingFighter'], 'viking-assault':['melee','VikingAssault'],banshee:['melee','Banshee'],medivac:['melee','Medivac'],science_vessel:['liberty','ScienceVessel'],
 zergling:['melee','Zergling'],baneling:['melee','Baneling'],roach:['melee','Roach'],ravager:['melee','Ravager'],hydralisk:['melee','Hydralisk'],queen:['melee','Queen'],lurker:['melee','LurkerMP'],mutalisk:['melee','Mutalisk'],corruptor:['melee','Corruptor'],ultralisk:['melee','Ultralisk'],
 zealot:['melee','Zealot'],adept:['melee','Adept'],stalker:['melee','Stalker'],sentry:['melee','Sentry'],immortal:['melee','Immortal'],colossus:['melee','Colossus'],high_templar:['melee','HighTemplar'],phoenix:['melee','Phoenix'],void_ray:['melee','VoidRay'],carrier:['melee','Carrier'],interceptor:['melee','Interceptor'],
 'hero:raynor':['liberty','Raynor'],'hero:tychus':['liberty','TychusChaingun'],'hero:nova':['liberty','Nova'],'hero:swann':['liberty','Dutch'],'hero:tosh':['liberty','Tosh'],'hero:kerrigan':['liberty','QueenOfBlades'],'hero:zagara':['coop','ZaGara'],'hero:dehaka':['swarm','Dehaka'],'hero:stukov':['swarm','InfestedStukov'],'hero:niadra':['swarm','HugeSwarmQueen'],'hero:artanis':['void','ArtanisVoid'],'hero:zeratul':['liberty','Zeratul'],'hero:alarak':['void','AlarakChampion'],'hero:fenix':['coop','FenixDragoon'],'hero:vorazun':['void','VorazunChampion'],'hero:yamato_battlecruiser':['liberty','Battlecruiser'],'hero:hots_leviathan':['swarm','HotSLeviathan'],'hero:purifier_flagship':['melee','Carrier'],
};
export const TRANSFORM_SOUNDS={
 'tank:siege':['melee','SiegeTank_MorphToSiege'], 'tank:tank':['melee','SiegeTank_MorphToTank'],
 'viking:viking_assault':['melee','Viking_MorphToAssault'],'viking:viking':['melee','Viking_MorphToFighter'],
 'thor:thor_high_impact':['melee','Thor_HighImpactArtilleryOn_Armament1','Thor_HighImpactArtilleryOn_Armament2'], 'thor:thor':['melee','Thor_HighImpactArtilleryOff_Armament1','Thor_HighImpactArtilleryOff_Armament2'],
 'hellion:hellbat':['melee','HellionTankMorph_StandMorphStart_Stage00','HellionTankMorph_StandMorphStart_Stage01','HellionTankMorph_StandMorphStart_Stage02','HellionTankMorph_StandMorphStart_Stage03','HellionTankMorph_StandMorphStart_Stage04'],
 'hellion:hellion':['melee','HellionTankMorph_StandMorphEnd_Stage00','HellionTankMorph_StandMorphEnd_Stage01','HellionTankMorph_StandMorphEnd_Stage02','HellionTankMorph_StandMorphEnd_Stage03','HellionTankMorph_StandMorphEnd_Stage04'],
 'lurker:lurker_burrowed':['melee','Lurker_Burrow'], 'lurker:lurker':['melee','Zerg_UnburrowLarge'],
};
export function motionAudioPlan(db,bank){
 const motion={},motionStart={},dialogue={},audit=[],walkEvents={};
 for(const [key,[profile,id]]of Object.entries(MOTION_ACTORS)){
  const actor=db.actor(id,profile);if(!actor)throw Error('Missing source unit actor '+profile+':'+id);
  const sound=kind=>actor.fields['SoundArray:'+kind]?.value;
  const movement=bank(sound('Movement'),profile,false);
  // Dragoon_MoveStart is the original start cue, not an engine loop.
  motion[key]=key==='hero:fenix'?null:movement;if(key==='hero:fenix')motionStart[key]=movement;
  dialogue[key]=[...new Set(['What','Yes','Pissed'].map(kind=>bank(sound(kind),profile,false)).filter(Boolean))];
  audit.push({key,profile,actor:id,movementToken:sound('Movement'),movement:motion[key],movementStart:motionStart[key],dialogue:dialogue[key]});
 }
 // Exact models used by Zagara, Dragoon Fenix and Dehaka (Slow Walk).
 // These selected source clips last 1 second. Other variants are not selected
 // by the renderer and must not be superimposed on the default clip.
 const coopModels=new DOMParser().parseFromString(fs.readFileSync('assets/private/actor-source/mods/starcoop/starcoop.sc2mod/base.sc2data/GameData/ModelData.xml','utf8'),'text/xml');
 for(const [key,model]of [['hero:zagara','ZagaraVoidCoop'],['hero:fenix','FenixDragoon'],['hero:dehaka','MutatorAmonDehaka']]){
  const node=Array.from(coopModels.getElementsByTagName('CModel')).find(n=>n.getAttribute('id')===model);
  const events=Array.from(node.getElementsByTagName('Events')).map(e=>Object.fromEntries(Array.from(e.childNodes).filter(n=>n.nodeType===1).map(n=>[n.tagName,n.getAttribute('value')]))).filter(e=>e.Type==='Sound'&&(key==='hero:dehaka'?/^Slow,Walk(,00)?$/:/^Walk(,00)?$/).test(e.Anim));
  if(!events.length)throw Error('Missing original walk sound events: '+model);
  walkEvents[key]={duration:1,model,events:events.map(e=>({time:Number(e.Time),bank:bank(e.Payload,'coop')})).sort((a,b)=>a.time-b.time)};
 }
 const transforms=Object.fromEntries(Object.entries(TRANSFORM_SOUNDS).map(([key,[profile,...ids]])=>[key,ids.map(id=>bank(id,profile))]));
 const xml=new DOMParser().parseFromString(fs.readFileSync('assets/private/actor-source/mods/liberty.sc2mod/base.sc2data/GameData/ModelData.xml','utf8'),'text/xml'),times=new Map();
 for(const event of Array.from(xml.getElementsByTagName('Events'))){const get=tag=>event.getElementsByTagName(tag)[0]?.getAttribute('value'),payload=get('Payload');if(get('Type')==='Sound'&&payload&&!times.has(payload))times.set(payload,Number(get('Time')));}
 // Source animation durations: Thor Morph=3s / Morph End=2s; Hellion
 // Stand Morph Start/End=4s (native 4/1.4 game-speed transformation).
 const transformTiming=Object.fromEntries(Object.entries(TRANSFORM_SOUNDS).map(([key,[,...ids]])=>[key,ids.map(id=>(times.get(id)??0)/(key==='thor:thor_high_impact'?3:key==='thor:thor'?2:key.startsWith('hellion:')?4:1))]));
 return {motion,motionStart,walkEvents,dialogue,transforms,transformTiming,motionSourceAudit:audit,...confirmedMotionPlan(db,bank)};
}
