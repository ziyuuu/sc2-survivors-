import type {World} from '../../simulation/world';
import type {EquipmentLootRuntime} from '../../simulation/starship/loot-presentation';
import type {Quality} from '../../simulation/starship/types';

export interface EquipmentLootCue {kind:'drop'|'pickup'|'full';quality:Quality;at:number;polluted?:true}
const priority=(cue:EquipmentLootCue)=>cue.kind==='full'?10:cue.kind==='drop'&&cue.quality>=4?cue.quality+2:cue.kind==='pickup'?5:cue.quality;
/** Coalesce a burst by value using an independent receipt cursor and native time. */
export class EquipmentLootAudio {
 private state?:EquipmentLootRuntime;private terrain:World['terrain'];private serial=0;private pending?:EquipmentLootCue;private readyAt=0;private lastAt=-Infinity;
 reset(){this.state=undefined;this.terrain=undefined;this.serial=0;this.pending=undefined;this.readyAt=0;this.lastAt=-Infinity;}
 update(w:World):EquipmentLootCue|undefined {
  if(this.state!==w.starship.loot||this.terrain!==w.terrain){this.reset();this.state=w.starship.loot;this.terrain=w.terrain;}
  if(!w.starship.enabled||w.phase!=='battle'||!w.starship.account.run||w.starship.account.run.ended){this.serial=this.state.serial;this.pending=undefined;return;}
  if(w.paused||w.requiresPlayerDecision)return;
  for(const e of this.state.events){
   if(e.serial<=this.serial)continue;this.serial=e.serial;
   if(e.terrain!==w.terrain||e.run!==w.starship.account.run.id||w.time-e.at>.4||Math.hypot(e.x-w.anchor.x,e.z-w.anchor.z)>24)continue;
   const cue:EquipmentLootCue={kind:e.kind,quality:e.item?.quality??1,at:e.at,...(e.kind==='drop'&&e.item?.pollution==='uncleansed'?{polluted:true}:{})};
   if(!this.pending){this.pending=cue;this.readyAt=Math.max(e.at+.1,this.lastAt+.25);}
   else if(priority(cue)>priority(this.pending)||priority(cue)===priority(this.pending)&&cue.polluted)this.pending=cue;
  }
  if(!this.pending||w.time<this.readyAt)return;
  const cue=this.pending;this.pending=undefined;this.lastAt=w.time;return cue;
 }
}
