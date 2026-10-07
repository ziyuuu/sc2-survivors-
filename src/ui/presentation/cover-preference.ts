import {RACES,type Race} from '../../data/races';

export const COVER_PREFERENCE_KEY='sc2.cover-preference.v1';
interface CoverPreferenceState {version:1;starts:Record<Race,number>;lastRace:Race|null;lockedRace:Race|null}
const race=(value:unknown):value is Race=>RACES.includes(value as Race);
const empty=():CoverPreferenceState=>({version:1,starts:{terran:0,zerg:0,protoss:0},lastRace:null,lockedRace:null});

/** Local presentation preference only; never part of World, Profile or telemetry. */
export class CoverPreference {
 private state=empty();
 constructor(private storage?:Pick<Storage,'getItem'|'setItem'>){
  try{const value=JSON.parse(storage?.getItem(COVER_PREFERENCE_KEY)??'null') as CoverPreferenceState|null;
   if(value?.version===1&&RACES.every(r=>Number.isSafeInteger(value.starts?.[r])&&value.starts[r]>=0&&value.starts[r]<=1_000_000)&&(value.lastRace===null||race(value.lastRace))&&(value.lockedRace===null||race(value.lockedRace)))this.state={version:1,starts:{...value.starts},lastRace:value.lastRace,lockedRace:value.lockedRace};
  }catch{}
 }
 get lockedRace(){return this.state.lockedRace;}
 preferredRace(fallback:Race){
  if(this.state.lockedRace)return this.state.lockedRace;
  const maximum=Math.max(...RACES.map(r=>this.state.starts[r]));if(!maximum)return fallback;
  if(this.state.lastRace&&this.state.starts[this.state.lastRace]===maximum)return this.state.lastRace;
  if(this.state.starts[fallback]===maximum)return fallback;
  return RACES.find(r=>this.state.starts[r]===maximum)!;
 }
 recordStartedRun(selected:Race){this.state.starts[selected]=Math.min(1_000_000,this.state.starts[selected]+1);this.state.lastRace=selected;this.save();}
 toggleLock(selected:Race){this.state.lockedRace=this.state.lockedRace===selected?null:selected;this.save();}
 private save(){try{this.storage?.setItem(COVER_PREFERENCE_KEY,JSON.stringify(this.state));}catch{}}
}
