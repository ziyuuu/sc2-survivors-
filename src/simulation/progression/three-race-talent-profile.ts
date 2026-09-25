import {allocatedTalentPoints,THREE_RACE_TALENT_BY_ID,validateTalentAllocation,TALENT_ALLOCATION_CAP,TALENT_RESOURCE_COST,type TalentLevels,type TalentRace} from '../../data/three-race-talents';

export type TalentPresetSlot=0|1|2;
export interface TalentPreset {name:string;levels:Record<string,number>}
export interface ThreeRaceTalentSnapshot {
 version:2;kind:'three-race-talents';resourcePrincipal:number;
 activeRace:TalentRace;activePreset:TalentPresetSlot;
 presets:Record<TalentRace,[TalentPreset,TalentPreset,TalentPreset]>;
 receipts:string[];
}
export interface FrozenThreeRaceTalents {readonly ruleset:'three-race-18-v1';readonly race:TalentRace;readonly levels:TalentLevels;readonly allocated:number}
export interface LegacyTalentInput {balance:number;levels:Record<string,number>;receipts:Iterable<string>}
/** Frozen V25 purchase prices. Never derive refunds from the replacement tree. */
export const LEGACY_TALENT_PRICE_SNAPSHOT:Readonly<Record<string,Readonly<{max:number;cost:number}>>>=Object.freeze(Object.fromEntries([
 ['scv_savior',2,1],['mining_master',3,1],['reroll_fan',3,1],['frugal_build',3,1],['recycle',3,1],['window_shop',3,1],['free_house',3,1],
 ['battlefield_cleaner',2,3],['free_purchase',2,3],['double_build',2,3],['bonus_income',3,1],['permanent_discount',3,1],['instant_tech',3,1],['rarity_master',2,3],['elite_classroom',2,3],['hero_support',1,5],
 ['advanced_arms',3,1],['weapon_upgrade',3,1],['armor_upgrade',3,1],['light_armor',3,1],['headshot',3,1],['bio_shield',3,1],['veteran_dodge',3,1],['rapid_attack',2,3],['lovers_charm',2,3],['team_share',2,3],['big_firepower',3,1],['super_meat',3,1],['marathon',3,1],['elite_training',2,3],['last_stand',2,3],['star_warrior',1,5],
 ['skilled_troop',3,1],['experience_summary',3,1],['reinforcement',3,1],['orderly_army',3,1],['battle_review',3,1],['conscript_network',3,1],['honor_archive',3,1],['teach_experience',2,3],['self_growth',2,3],['find_elites',2,3],['advantage_army',3,1],['proliferate',3,1],['tank_support',3,1],['elite_scout',2,3],['mercenary',2,3],['expanded_squad',1,5],
 ['tidy_squad',3,1],['range_master',3,3],['skill_recovery',3,3],['airlift',2,6],['quick_siege',3,3],['stutter_king',2,6],['apm_master',1,10]
].map(([id,max,cost])=>[id,Object.freeze({max:Number(max),cost:Number(cost)})])));
export const LEGACY_TOTAL_TALENT_COST=Object.values(LEGACY_TALENT_PRICE_SNAPSHOT).reduce((sum,node)=>sum+node.max*node.cost,0);
export function legacyTalentInvestment(levels:TalentLevels):number{
 if(!levels||typeof levels!=='object'||Array.isArray(levels))throw new Error('Invalid legacy talent levels');
 let spent=0;
 for(const [id,rank] of Object.entries(levels)){
  const node=LEGACY_TALENT_PRICE_SNAPSHOT[id];
  if(!node||!Number.isSafeInteger(rank)||rank<0||rank>node.max)throw new Error(`Invalid legacy talent rank: ${id}`);
  spent+=rank*node.cost;
 }
 return spent;
}
const races:readonly TalentRace[]=['terran','zerg','protoss'];
const validResource=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>=0;
const validSlot=(value:unknown):value is TalentPresetSlot=>value===0||value===1||value===2;
const compactLevels=(levels:TalentLevels)=>Object.fromEntries(Object.entries(levels).filter(([,rank])=>rank>0).sort(([a],[b])=>a.localeCompare(b)));
const makePresets=():[TalentPreset,TalentPreset,TalentPreset]=>[{name:'方案 1',levels:{}},{name:'方案 2',levels:{}},{name:'方案 3',levels:{}}];
const clone=(snapshot:ThreeRaceTalentSnapshot):ThreeRaceTalentSnapshot=>structuredClone(snapshot);
function validSnapshot(value:unknown):value is ThreeRaceTalentSnapshot{
 if(!value||typeof value!=='object')return false;
 const snapshot=value as ThreeRaceTalentSnapshot;
 if(snapshot.version!==2||snapshot.kind!=='three-race-talents'||!validResource(snapshot.resourcePrincipal)||!races.includes(snapshot.activeRace)||!validSlot(snapshot.activePreset)||!snapshot.presets||typeof snapshot.presets!=='object')return false;
 for(const race of races){
  const presets=snapshot.presets[race];if(!Array.isArray(presets)||presets.length!==3)return false;
  for(const preset of presets)if(!preset||typeof preset.name!=='string'||preset.name.length>48||validateTalentAllocation(race,preset.levels))return false;
 }
 const cost=allocatedTalentPoints(snapshot.presets[snapshot.activeRace][snapshot.activePreset].levels)*TALENT_RESOURCE_COST;
 if(cost>snapshot.resourcePrincipal||!Array.isArray(snapshot.receipts)||snapshot.receipts.some(receipt=>typeof receipt!=='string'||!receipt||receipt.length>128)||new Set(snapshot.receipts).size!==snapshot.receipts.length)return false;
 return true;
}
const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');};

/** One resource principal, nine saved configurations, exactly one active investment.
 * Persistence is deliberately owned by the existing atomic run/profile repository.
 */
export class ThreeRaceTalentProfile {
 private state:ThreeRaceTalentSnapshot;
 private receiptSet:Set<string>;
 readonly listeners=new Set<()=>void>();
 constructor(resourcePrincipal=0){
  if(!validResource(resourcePrincipal))throw new Error('Invalid resource principal');
  this.state={version:2,kind:'three-race-talents',resourcePrincipal,activeRace:'terran',activePreset:0,presets:{terran:makePresets(),zerg:makePresets(),protoss:makePresets()},receipts:[]};
  this.receiptSet=new Set();
 }
 get principal(){return this.state.resourcePrincipal;}
 get activeRace(){return this.state.activeRace;}
 get activePreset(){return this.state.activePreset;}
 get levels():TalentLevels{return {...this.active().levels};}
 get allocated(){return allocatedTalentPoints(this.active().levels);}
 get spent(){return this.allocated*TALENT_RESOURCE_COST;}
 get balance(){return this.principal-this.spent;}
 get affordableAllocation(){return Math.min(TALENT_ALLOCATION_CAP,Math.floor(this.principal/TALENT_RESOURCE_COST));}
 get remainingCost(){return (TALENT_ALLOCATION_CAP-this.allocated)*TALENT_RESOURCE_COST;}
 get receipts():ReadonlySet<string>{return new Set(this.receiptSet);}
 get locked(){return false;}
 private active(){return this.state.presets[this.activeRace][this.activePreset];}
 private changed(){for(const listener of this.listeners)listener();}
 level(id:string){return this.active().levels[id]??0;}
 getPreset(race:TalentRace,slot:TalentPresetSlot):TalentPreset{return structuredClone(this.state.presets[race][slot]);}
 canBuy(id:string):boolean{
  const node=THREE_RACE_TALENT_BY_ID.get(id);
  if(!node||node.race!==this.activeRace||this.balance<TALENT_RESOURCE_COST||this.allocated>=TALENT_ALLOCATION_CAP||this.level(id)>=node.maxRank)return false;
  return validateTalentAllocation(this.activeRace,{...this.active().levels,[id]:this.level(id)+1})===null;
 }
 buy(id:string):boolean{
  if(!this.canBuy(id))return false;
  this.active().levels={...this.active().levels,[id]:this.level(id)+1};this.changed();return true;
 }
 /** Inactive presets may describe unaffordable future builds; activation must afford them. */
 savePreset(race:TalentRace,slot:TalentPresetSlot,levels:TalentLevels,name?:string):boolean{
  if(!races.includes(race)||!validSlot(slot)||validateTalentAllocation(race,levels)||name!==undefined&&(typeof name!=='string'||name.length>48))return false;
  if(race===this.activeRace&&slot===this.activePreset&&allocatedTalentPoints(levels)*TALENT_RESOURCE_COST>this.principal)return false;
  this.state.presets[race][slot]={name:name??this.state.presets[race][slot].name,levels:compactLevels(levels)};this.changed();return true;
 }
 activatePreset(race:TalentRace,slot:TalentPresetSlot):boolean{
  if(!races.includes(race)||!validSlot(slot))return false;
  if(allocatedTalentPoints(this.state.presets[race][slot].levels)*TALENT_RESOURCE_COST>this.principal)return false;
  this.state.activeRace=race;this.state.activePreset=slot;this.changed();return true;
 }
 respec():boolean{this.active().levels={};this.changed();return true;}
 award(receipt:string,resources:number):boolean{
  if(typeof receipt!=='string'||!receipt||receipt.length>128||!validResource(resources)||resources===0||this.receiptSet.has(receipt)||!Number.isSafeInteger(this.principal+resources))return false;
  this.receiptSet.add(receipt);this.state.receipts.push(receipt);this.state.resourcePrincipal+=resources;this.changed();return true;
 }
 freezeRun():FrozenThreeRaceTalents{
  return Object.freeze({ruleset:'three-race-18-v1',race:this.activeRace,levels:Object.freeze({...this.active().levels}),allocated:this.allocated});
 }
 toSnapshot():ThreeRaceTalentSnapshot{return clone(this.state);}
 static fromSnapshot(value:unknown):ThreeRaceTalentProfile|null{
  if(!validSnapshot(value))return null;
  const profile=new ThreeRaceTalentProfile();profile.state=clone(value);profile.receiptSet=new Set(value.receipts);return profile;
 }
 /** Call only for a verified legacy profile; valid old rank allocations stay frozen in old runs. */
 static migrateLegacy(legacy:LegacyTalentInput):ThreeRaceTalentProfile{
  if(!validResource(legacy.balance))throw new Error('Invalid legacy resource balance');
  const principal=legacy.balance+legacyTalentInvestment(legacy.levels);
  const profile=new ThreeRaceTalentProfile(principal),receipts=[...legacy.receipts];
  if(receipts.some(receipt=>typeof receipt!=='string'||!receipt||receipt.length>128)||new Set(receipts).size!==receipts.length)throw new Error('Invalid legacy receipts');
  profile.state.receipts=receipts;profile.receiptSet=new Set(receipts);return profile;
 }
 exportJSON():string{
  const payload=this.toSnapshot();payload.receipts.sort();for(const race of races)for(const preset of payload.presets[race])preset.levels=compactLevels(preset.levels);
  return JSON.stringify({...payload,checksum:hash(JSON.stringify(payload))},null,2);
 }
 static parseJSON(raw:string):ThreeRaceTalentProfile|null{
  try{const {checksum,...payload}=JSON.parse(raw);if(checksum!==hash(JSON.stringify(payload)))return null;return ThreeRaceTalentProfile.fromSnapshot(payload);}catch{return null;}
 }
 static validJSON(raw:string):boolean{return ThreeRaceTalentProfile.parseJSON(raw)!==null;}
 importJSON(raw:string):boolean{
  const profile=ThreeRaceTalentProfile.parseJSON(raw);if(!profile)return false;
  this.state=profile.toSnapshot();this.receiptSet=new Set(this.state.receipts);this.changed();return true;
 }
}
