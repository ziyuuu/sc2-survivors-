import {checksum} from '../../persistence/graph-codec';
import {RACES,type Race} from '../../data/races';
import {allocationCost,allocationPoints,nextTalentPurchase,TALENT_BY_ID,TALENT_POINT_CAP,validateTalentAllocation,type TalentLevels,type TalentLine} from '../../data/mvp-talents';

export type PresetSlot=0|1|2;
export interface PermanentPreset {name:string;levels:TalentLevels}
type RaceRecord<T>=Record<Race,T>;
export interface PermanentSnapshot {
 version:6;kind:'mvp-permanent-profile';
 balances:RaceRecord<number>;activeRace:Race;activePresets:RaceRecord<PresetSlot>;
 presets:RaceRecord<[PermanentPreset,PermanentPreset,PermanentPreset]>;
 /** Actual resource paid by race; inactive presets are blueprints only. */
 investmentLedgers:RaceRecord<Record<string,number>>;revision:number;
 receipts:string[];
}
export interface FrozenTalentAllocation {
 effectsVersion:'shared-tech-20260929';ruleset:'mvp-1.0';race:Race;presetId:string;levels:TalentLevels;allocated:number;investment:number;
}
export interface TalentAllocationPreview {
 race:Race;slot:PresetSlot;levels:TalentLevels;expectedRevision:number;
 refund:number;cost:number;balanceAfter:number;allocated:number;
}
const presets=():[PermanentPreset,PermanentPreset,PermanentPreset]=>[
 {name:'方案 1',levels:{}},{name:'方案 2',levels:{}},{name:'方案 3',levels:{}}
];
const validNonnegative=(n:unknown):n is number=>Number.isSafeInteger(n)&&(n as number)>=0;
const validSlot=(n:unknown):n is PresetSlot=>n===0||n===1||n===2;
const validRace=(race:unknown):race is Race=>RACES.includes(race as Race);
const emptyState=(principal=0):PermanentSnapshot=>({version:6,kind:'mvp-permanent-profile',
 balances:{terran:principal,zerg:0,protoss:0},activeRace:'terran',activePresets:{terran:0,zerg:0,protoss:0},
 presets:{terran:presets(),zerg:presets(),protoss:presets()},investmentLedgers:{terran:{},zerg:{},protoss:{}},revision:0,receipts:[]});
function validCommon(value:unknown):value is {kind:'mvp-permanent-profile';activeRace:Race;presets:PermanentSnapshot['presets'];receipts:string[]} {
 if(!value||typeof value!=='object')return false;
 const p=value as PermanentSnapshot;
 const keys=['version','kind','balances','activeRace','activePresets','presets','investmentLedgers','revision','receipts'];
 if(Object.keys(p).length!==keys.length||keys.some(key=>!Object.hasOwn(p,key)))return false;
 if(p.kind!=='mvp-permanent-profile'||!validRace(p.activeRace)||!p.presets||typeof p.presets!=='object')return false;
 for(const race of RACES){
  const row=p.presets[race];
  if(!Array.isArray(row)||row.length!==3||row.some(item=>!item||typeof item.name!=='string'||item.name.length>48||!item.levels||typeof item.levels!=='object'||Array.isArray(item.levels)||validateTalentAllocation(race,item.levels)))return false;
 }
 for(const items of [p.receipts])if(!Array.isArray(items)||items.some(x=>typeof x!=='string'||!x||x.length>128)||new Set(items).size!==items.length)return false;
 return true;
}
function validLedger(race:Race,levels:TalentLevels,ledger:unknown):ledger is Record<string,number> {
 if(!ledger||typeof ledger!=='object'||Array.isArray(ledger))return false;
 const entries=Object.entries(ledger);
 if(entries.length!==Object.keys(levels).length)return false;
 for(const [id,paid] of entries){const node=TALENT_BY_ID.get(id);if(!validNonnegative(paid)||!node||node.race!==race||!levels[id]||paid!==node.resourceCost*levels[id])return false;}
 return true;
}
function validCurrent(value:unknown):value is PermanentSnapshot {
 if(!validCommon(value))return false;
 const p=value as PermanentSnapshot;
 if(p.version!==6||!validNonnegative(p.revision)||!p.balances||!p.activePresets||!p.investmentLedgers)return false;
 for(const race of RACES){
  if(!validNonnegative(p.balances[race])||!validSlot(p.activePresets[race]))return false;
  const active=p.presets[race][p.activePresets[race]].levels;
  if(!validLedger(race,active,p.investmentLedgers[race]))return false;
  if(!Number.isSafeInteger(p.balances[race]+allocationCost(active)))return false;
 }
 return true;
}

/** Three independent wallets and paid allocations; other presets are free blueprints. */
export class PermanentProfile {
 private state:PermanentSnapshot;
 readonly listeners=new Set<()=>void>();
 constructor(principal=0){if(!validNonnegative(principal))throw Error('永久资源本金无效');this.state=emptyState(principal);}
 private changed(){this.state.revision++;for(const listener of this.listeners)listener();}
 get principal(){return this.balance;}
 get balance(){return this.raceBalance(this.activeRace);}
 raceBalance(race:Race){return this.state.balances[race];}
 get activeRace(){return this.state.activeRace;}
 get activePreset(){return this.activePresetFor(this.activeRace);}
 activePresetFor(race:Race){return this.state.activePresets[race];}
 selectRace(race:Race){if(!validRace(race))return false;if(this.activeRace===race)return true;this.state.activeRace=race;this.changed();return true;}
 get revision(){return this.state.revision;}
 get receipts(){return new Set(this.state.receipts);}
 get levels():TalentLevels{return this.levelsFor(this.activeRace);}
 levelsFor(race:Race):TalentLevels{return {...this.state.presets[race][this.activePresetFor(race)].levels};}
 get allocated(){return this.levelFor(this.activeRace);}
 levelFor(race:Race){return allocationPoints(this.levelsFor(race));}
 get playerLevel(){return this.allocated;}
 get spent(){return this.spentFor(this.activeRace);}
 spentFor(race:Race){return Object.values(this.state.investmentLedgers[race]).reduce((sum,n)=>sum+n,0);}
 getPreset(race:Race,slot:PresetSlot):PermanentPreset|null {return validRace(race)&&validSlot(slot)?structuredClone(this.state.presets[race][slot]):null;}
 previewTalentAllocation(race:Race,slot:PresetSlot,levels?:TalentLevels):TalentAllocationPreview|null {
  if(!validRace(race)||!validSlot(slot))return null;
  const desired=structuredClone(levels??this.state.presets[race][slot].levels);
  if(validateTalentAllocation(race,desired))return null;
  const refund=this.spentFor(race),cost=allocationCost(desired),available=this.raceBalance(race)+refund;
  if(!Number.isSafeInteger(available)||cost>available)return null;
  return {race,slot,levels:desired,expectedRevision:this.revision,refund,cost,balanceAfter:available-cost,allocated:allocationPoints(desired)};
 }
 commitTalentAllocation(preview:TalentAllocationPreview,expectedRevision:number){
  if(!preview||expectedRevision!==this.revision||preview.expectedRevision!==expectedRevision)return false;
  const current=this.previewTalentAllocation(preview.race,preview.slot,preview.levels);
  if(!current||JSON.stringify(current)!==JSON.stringify(preview))return false;
  const next=structuredClone(this.state);
  next.balances[current.race]=current.balanceAfter;next.activeRace=current.race;next.activePresets[current.race]=current.slot;
  next.presets[current.race][current.slot].levels={...current.levels};
  next.investmentLedgers[current.race]=Object.fromEntries(Object.entries(current.levels).map(([id,rank])=>[id,TALENT_BY_ID.get(id)!.resourceCost*rank]));
  this.state=next;this.changed();return true;
 }
 activatePreset(race:Race,slot:PresetSlot){const preview=this.previewTalentAllocation(race,slot);return !!preview&&this.commitTalentAllocation(preview,preview.expectedRevision);}
 savePresetBlueprint(race:Race,slot:PresetSlot,levels:TalentLevels,name?:string){
  if(!validRace(race)||!validSlot(slot)||validateTalentAllocation(race,levels)||name!==undefined&&(typeof name!=='string'||name.length>48))return false;
  if(slot===this.activePresetFor(race)){const preview=this.previewTalentAllocation(race,slot,levels);if(!preview||!this.commitTalentAllocation(preview,preview.expectedRevision))return false;}
  else {this.state.presets[race][slot].levels={...levels};this.changed();}
  if(name!==undefined){this.state.presets[race][slot].name=name;this.changed();}return true;
 }
 buy(id:string){const failure=nextTalentPurchase(this.activeRace,this.levels,id,this.balance);if(failure)return false;
  const levels=this.levels;levels[id]=(levels[id]??0)+1;
  const preview=this.previewTalentAllocation(this.activeRace,this.activePreset,levels);
  return !!preview&&this.commitTalentAllocation(preview,preview.expectedRevision);
 }
 canBuy(id:string){return nextTalentPurchase(this.activeRace,this.levels,id,this.balance)===null;}
 respec(scope:TalentLine|'all'='all'){
  const levels=this.levels;
  for(const id of Object.keys(levels))if(scope==='all'||TALENT_BY_ID.get(id)?.line===scope)delete levels[id];
  const preview=this.previewTalentAllocation(this.activeRace,this.activePreset,levels);
  return !!preview&&this.commitTalentAllocation(preview,preview.expectedRevision);
 }
 freezeRun():FrozenTalentAllocation {
  return {effectsVersion:'shared-tech-20260929',ruleset:'mvp-1.0',race:this.activeRace,presetId:this.activeRace+':'+this.activePreset,levels:this.levels,allocated:this.allocated,investment:this.spent};
 }
 award(receipt:string,amount:number,race:Race=this.activeRace){
  if(!validRace(race)||typeof receipt!=='string'||!receipt||receipt.length>128||!Number.isSafeInteger(amount)||amount<=0||this.state.receipts.includes(receipt)||!Number.isSafeInteger(this.raceBalance(race)+amount))return false;
  this.state.balances[race]+=amount;this.state.receipts.push(receipt);this.changed();return true;
 }
 toSnapshot(){return structuredClone(this.state);}
 exportJSON(){const payload=this.toSnapshot();return JSON.stringify({...payload,checksum:checksum(JSON.stringify(payload))});}
 static parseJSON(raw:string):PermanentProfile|null {
  try{
   const {checksum:sum,...payload}=JSON.parse(raw);
   if(checksum(JSON.stringify(payload))!==sum)return null;
   if(!validCurrent(payload))return null;
   const state=payload;
   const result=new PermanentProfile();result.state=structuredClone(state);return result;
  }catch{return null;}
 }
 importJSON(raw:string){const profile=PermanentProfile.parseJSON(raw);if(!profile)return false;this.state=profile.toSnapshot();this.changed();return true;}
}
