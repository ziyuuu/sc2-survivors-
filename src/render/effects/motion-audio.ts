import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import {SOUND_DATA} from './audio-source-data';
import type {SoundCue} from './native-sound-player';
import type {AudioChannel} from './combat-audio-router';
import {SC2_UNITS} from '../../data/sc2-units';
import {herdAudio} from './herd-audio';

export function motionSoundKey(u:Entity){
 if(u.summonKind==='interceptor')return 'interceptor';
 if(u.mission?.fleet)return 'hero:yamato_battlecruiser';
 if(u.heroId)return 'hero:'+u.heroId;
 return u.nativeMode==='hellbat'?'hellbat':u.nativeMode==='viking_assault'?'viking-assault':u.unitType;
}
const transition=(u:Entity)=>u.heroId?'':u.unitType==='tank'&&u.modeTimer>0?'tank:'+u.desiredMode:u.nativeModeUntil?u.unitType+':'+u.desiredNativeMode:'';
type Morph={key:string;start:number;duration:number;next:number};
type Walk={key:string;seconds:number;moving:boolean};
/** Presentation-only clocks. Source ModelData events follow the same normalized
 * morph progress as the renderer; dialogue rotates units without simulation RNG. */
export class MotionAudio {
 private morphs=new Map<number,Morph>();private nextVoice=2;private speaker=0;private voiceTurns=new Map<string,number>();
 private walks=new Map<number,Walk>();
 // Preserve the dialogue cursor across inspection loops, like sample rotation.
 reset(){this.morphs.clear();this.walks.clear();this.nextVoice=2;this.speaker=0;}
 private walkState(u:Entity):Walk{return {key:motionSoundKey(u),seconds:u.distanceWalked/SC2_UNITS[u.unitType].movementSpeed,moving:u.hp>0&&!transition(u)&&Math.hypot(u.velocity.x,u.velocity.z)>.03};}
 resumeAt(w:World){this.morphs.clear();this.walks.clear();this.nextVoice=w.time+2;for(const u of w.entities.values()){const key=transition(u);if(key)this.morphs.set(u.id,{key,start:w.time,duration:1,next:Infinity});this.walks.set(u.id,this.walkState(u));}}
 pauseAt(w:World){
  this.walks.clear();for(const u of w.entities.values())this.walks.set(u.id,this.walkState(u));
  this.nextVoice=w.time+2;const live=new Set<number>();
  for(const u of w.entities.values()){const key=u.hp>0?transition(u):'';if(!key)continue;live.add(u.id);const m=this.morphs.get(u.id);
   if(!m||m.key!==key){this.morphs.set(u.id,{key,start:w.time,duration:1,next:Infinity});continue;}
   const times=SOUND_DATA.transformTiming[key]??[0],progress=(w.time-m.start)/m.duration;
   while(m.next<times.length&&times[m.next]<=progress)m.next++;
  }
  for(const id of this.morphs.keys())if(!live.has(id))this.morphs.delete(id);
 }
 update(w:World){
  const cues:SoundCue[]=[],channels:AudioChannel[]=[],live=new Set<number>(),walkLive=new Set<number>(),herdMembers:Entity[]=[];let movingVoices=0;
  const near=[...w.entities.values()].filter(u=>u.hp>0&&!u.heldBy&&w.visibleTo(u,'terran')&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<32).sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id);
  const volume=(u:Entity)=>.22*Math.max(.15,1-Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)/40);
  for(const u of near){
   const key=transition(u);if(key){live.add(u.id);let m=this.morphs.get(u.id);if(!m||m.key!==key){m={key,start:w.time,duration:Math.max(1/60,u.unitType==='tank'?u.modeTimer:(u.nativeModeUntil??w.time)-w.time),next:0};this.morphs.set(u.id,m);}
    const banks=SOUND_DATA.transforms[key]??[],times=SOUND_DATA.transformTiming[key]??[0],progress=(w.time-m.start)/m.duration;
    while(m.next<banks.length&&progress+1e-7>=times[m.next]){cues.push({bank:banks[m.next++],priority:3,volume:volume(u)});}
   }
   const walk=this.walkState(u),bank=SOUND_DATA.motion[walk.key],start=SOUND_DATA.motionStart[walk.key],steps=SOUND_DATA.walkEvents[walk.key],previous=this.walks.get(u.id);
   if(walk.moving)herdMembers.push(u);
   walkLive.add(u.id);
   if(walk.moving&&(bank||start||steps)&&movingVoices++<8){
    if(bank)channels.push({key:'movement:'+u.id,bank,priority:0,volume:volume(u)});
    if(start&&(!previous?.moving||previous.key!==walk.key))cues.push({bank:start,priority:0,volume:volume(u)});
    // Match the renderer's distance-driven Walk clock; never replay a backlog
    // after a stop, seek, offscreen interval or restore.
    if(steps&&u.action==='move'&&previous?.moving&&previous.key===walk.key&&walk.seconds>=previous.seconds&&walk.seconds-previous.seconds<steps.duration){
     for(const e of steps.events){const first=Math.floor((previous.seconds-e.time)/steps.duration)+1,at=first*steps.duration+e.time;if(at<=walk.seconds+1e-7)cues.push({bank:e.bank,priority:0,volume:volume(u)});}
    }
   }
   this.walks.set(u.id,walk);
  }
  for(const id of this.morphs.keys())if(!live.has(id))this.morphs.delete(id);
  for(const id of this.walks.keys())if(!walkLive.has(id))this.walks.delete(id);
  channels.push(...herdAudio(herdMembers,w.anchor));
  for(const p of w.pods){
   const bank=SOUND_DATA.carrierMotion[p.race??w.expedition.race];
   if(bank&&p.hp>0&&p.status==='falling'&&w.time>=p.createdAt&&w.time<p.landedAt&&w.visibleTo(p,'terran')&&Math.hypot(p.x-w.anchor.x,p.z-w.anchor.z)<32)
    channels.push({key:'carrier-movement:'+p.id,bank,priority:0,volume:.22*Math.max(.15,1-Math.hypot(p.x-w.anchor.x,p.z-w.anchor.z)/40)});
  }
  if(w.time>=this.nextVoice){
   const speakers=near.filter(u=>u.owner==='terran'&&!u.summonKind&&!w.starship.projections.has(u.id)&&!transition(u)&&SOUND_DATA.dialogue[motionSoundKey(u)]?.length).sort((a,b)=>a.id-b.id);
   const u=speakers.find(u=>u.id>this.speaker)??speakers[0];
   if(u){const key=motionSoundKey(u),banks=SOUND_DATA.dialogue[key],turn=this.voiceTurns.get(key)??0,bank=banks[turn%banks.length];this.voiceTurns.set(key,turn+1);this.speaker=u.id;
    cues.push({bank,priority:2,volume:volume(u),group:'dialogue'});this.nextVoice=w.time+Math.max(8,(SOUND_DATA.banks[bank].maxDuration??6)+1.5);
   }else this.nextVoice=w.time+1;
  }
  return {cues,channels};
 }
}
