import type {World} from '../../simulation/world';
import {aggregateMvpTalentEffects} from '../../simulation/progression/mvp-talent-effects';

/** Deliberately returns one bit, never hidden coordinates or identities. Rebuilt UI state. */
export class DetectionHint {
 private next=-Infinity;private lastTime=-Infinity;private run:string|null='';private value=false;
 update(w:World){
  if(this.run!==w.runId||w.time<this.lastTime){this.next=-Infinity;this.value=false;this.run=w.runId;}
  this.lastTime=w.time;if(w.time<this.next)return this.value;this.next=w.time+.2;
  const effects=aggregateMvpTalentEffects(w.runConfig?.frozenTalents.levels??{},w.expedition.race,{team:'player',race:w.expedition.race,kind:'raceAbility',ability:'detection',manualAbility:true});
  const radius=12*(1+(effects.detectionRadiusPct??0));this.value=false;
  for(const u of w.entities.values())if(u.team==='enemy'&&u.hp>0&&u.cloaked&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<=radius+u.unitRadius&&!w.visibleTo(u,'terran')){this.value=true;break;}
  return this.value;
 }
}
