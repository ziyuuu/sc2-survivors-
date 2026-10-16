import type {World} from '../world';
import type {Body,Entity,HeroCast} from '../types';

export type EquipmentPresentationKind='projection-birth'|'projection-end'|'boost-start'|'boost-end'|'recall-from'|'recall-to'|'rewind'|'capture'|'evolve'|'reinforcement'|'expiry'|'fort-deploy'|'fort-shot'|'fort-end'|'derived-hit'|'hero-extra'|'growth'|'cooldown-reset'|'heal';
export interface EquipmentPresentationReceipt {
 serial:number;time:number;kind:EquipmentPresentationKind;
 source:{id:number;x:number;z:number;flying:boolean;radius:number}&Partial<Pick<Entity,'unitType'|'race'|'heroId'|'eliteId'|'modelKey'|'facing'|'nativeMode'|'activeWeapon'|'summonKind'|'team'|'mode'|'rank'|'visualScale'>>;
 target?:{id:number;x:number;z:number;flying:boolean;radius:number};
 detail?:string;radius?:number;
}
type History={run:string;time:number;serial:number;effectSerial:number;events:EquipmentPresentationReceipt[]};
const histories=new WeakMap<World,History>();
const recoveryShown=new WeakMap<Body,{run:string;at:number}>();
export function equipmentRecoveryPresentation(w:World,target:Body,actual:number){if(actual<=0||!w.starship.enabled)return;const last=recoveryShown.get(target),run=w.runId??'';if(last&&last.run===run&&w.time>=last.at&&w.time-last.at<.6)return;recoveryShown.set(target,{run,at:w.time});equipmentPresentation(w,'heal',target);}
const zoneBirths=new WeakMap<object,number>();
const presentationIds=new WeakMap<object,number>();
/** Object identity remains stable across damage ticks; presentation only. */
export function equipmentPresentationId(value:object){return presentationIds.get(value)??0;}
const replayPresentations=new WeakMap<HeroCast,{at:number;source:Entity}>();
export function markEquipmentReplay(w:World,cast:HeroCast,source:Entity){replayPresentations.set(cast,{at:w.time,source:structuredClone(source)});}
export const equipmentReplayPresentation=(cast:HeroCast)=>replayPresentations.get(cast);
export function equipmentBurnZone<T extends object>(w:World,zone:T):T {zoneBirths.set(zone,w.time);presentationIds.set(zone,++history(w).effectSerial);return zone;}
export function equipmentBurnAge(w:World,zone:object){return Math.max(0,w.time-(zoneBirths.get(zone)??w.time));}
function history(w:World){let h=histories.get(w);if(!h||h.run!==(w.runId??'')||w.time<h.time){h={run:w.runId??'',time:w.time,serial:0,effectSerial:0,events:[]};histories.set(w,h);}h.time=w.time;return h;}
const snapshot=(u:Body)=>{const e=u as Partial<Entity>;return {id:u.id,x:u.x,z:u.z,flying:u.flying,radius:u.unitRadius,unitType:e.unitType,race:e.race,heroId:e.heroId,eliteId:e.eliteId,modelKey:e.modelKey,facing:e.facing,nativeMode:e.nativeMode,activeWeapon:e.activeWeapon,summonKind:e.summonKind,team:e.team,mode:e.mode,rank:e.rank,visualScale:e.visualScale};};
/** Post-commit, transient receipts only. No random, damage, persistence or timers. */
export function equipmentPresentation(w:World,kind:EquipmentPresentationKind,source:Body,target?:Body,detail?:string,radius?:number){
 if(!w.starship.enabled)return;
 const h=history(w);if(h.events.length&&w.time-h.events[0].time>=12)h.events=h.events.filter(e=>w.time-e.time<12);
 h.events.push({serial:++h.serial,time:w.time,kind,source:snapshot(source),target:target?snapshot(target):undefined,detail,radius});
}
export function equipmentPresentationReceipts(w:World):readonly EquipmentPresentationReceipt[]{return history(w).events;}
