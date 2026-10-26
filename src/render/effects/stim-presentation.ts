import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
export type StimCue={unit:Entity;kind:'start'|'end';at:number};
/** Original Buff.Stimpack.On/Off actor semantics. This only observes saved state. */
export class StimPresentation {
 private active=new Map<number,number>();private time=0;private run='';private initialized=false;
 reset(){this.active.clear();this.time=0;this.run='';this.initialized=false;}
 resumeAt(w:World){this.reset();this.initialized=true;this.time=w.time;this.run=w.runId??'';for(const u of w.entities.values())if(u.hp>0&&u.stimUntil>w.time)this.active.set(u.id,u.stimUntil);}
 update(w:World):StimCue[]{
  if(this.initialized&&(w.time<this.time||this.run!==(w.runId??''))){this.resumeAt(w);return [];}this.initialized=true;
  const result:StimCue[]=[],live=new Set<number>();
  for(const u of w.entities.values()){
   if(u.heroId||!['marine','marauder'].includes(u.unitType)||u.hp<=0)continue;live.add(u.id);
   const previous=this.active.get(u.id),active=u.stimUntil>w.time;
   if(active){if(previous===undefined||u.stimUntil>previous+.001)result.push({unit:u,kind:'start',at:w.time});this.active.set(u.id,u.stimUntil);}
   else if(previous!==undefined){if(previous<=w.time+.001)result.push({unit:u,kind:'end',at:previous});this.active.delete(u.id);}
  }
  for(const id of this.active.keys())if(!live.has(id))this.active.delete(id);
  this.time=w.time;this.run=w.runId??'';return result;
 }
}
