import type {World} from './world';
import {registerEquipmentDrop} from './starship/loot-presentation';

/** A successful stage transition ages ground loot, including each endless round. */
export function advanceStageLoot(w:World){
 w.pickups=[];
 const a=w.starship.account,run=a.run;if(!run||run.ended)return;
 const current=w.draftWindowId,next=current+1,expired=new Set<string>();let changed=false;
 for(const item of Object.values(a.items)){
  const loc=a.locations[item.id];if(loc?.kind!=='ground'||loc.run!==run.id)continue;
  // Old in-memory or diagnostic grants have no age: count their current stage once.
  if(!Number.isInteger(loc.droppedStage)||loc.droppedStage!<1){loc.droppedStage=current;changed=true;}
  // White through orange last 2–6 stages, including the stage of the latest drop.
  if(next-loc.droppedStage!<item.quality+1)continue;
  delete a.items[item.id];delete a.locations[item.id];w.starship.loot.ground.delete(item.id);expired.add(item.id);changed=true;
 }
 if(expired.size)w.starship.loot.events=w.starship.loot.events.filter(e=>!e.item||!expired.has(e.item.id));
 if(changed)a.revision++;
}

/** A committed battlefield change keeps unexpired drops reachable without renewing their age. */
export function relocateStageLoot(w:World){
 const a=w.starship.account,run=a.run;if(!run||run.ended)return;
 for(const item of Object.values(a.items)){
  const loc=a.locations[item.id];if(loc?.kind!=='ground'||loc.run!==run.id)continue;
  w.starship.loot.ground.delete(item.id);registerEquipmentDrop(w,item);
 }
}
