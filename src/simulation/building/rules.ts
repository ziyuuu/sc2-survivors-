// Canonical three-race building rules, shared by the main game and isolated workbench.
import {DEVELOPMENT, PRODUCTION_LINES, HEAVY_FAMILIES, developmentPrice, familyLine, TREE_STEPS, type ProductionLineId, type DevelopmentDefinition} from '../../data/expedition-buildings';
import {DISCOUNTS} from '../../data/economy';
import {SC2_UNITS} from '../../data/sc2-units';
import type {FamilyId, Race} from '../../data/races';

export type Cost = {minerals:number; gas:number};
export type Direction = 'ground'|'air';
export type FacilityKind = 'barracks'|'factory'|'starport'|'hatchery'|'gateway'|'robotics'|'stargate'|'crystal';
export interface ProductionGroup {
 id:string; kind:FacilityKind; ids:number[]; line:ProductionLineId; directions:Direction[];
 outputs:FamilyId[]; enabled:boolean; cursor:number; enabledFamilies?:Partial<Record<FamilyId,boolean>>;
}
export interface Talents {permanent_discount:number; frugal_build:number; free_house:number; double_build:number; instant_tech:number; window_shop:number; reroll_fan:number}
export interface Project extends Omit<DevelopmentDefinition,'kind'> {kind:DevelopmentDefinition['kind']|'evolution'; batch?:number; direction?:Direction}
export interface Offer {id:string; projectId:string; window:number; revision:number; level:number; cost:Cost; baseCost:Cost; discount:number; targets:string[]}
export interface BuildingState {
 race:Race; stage:number; revision:number; window:number; phase:'building'|'shop'|'front'; direction:ProductionLineId;
 wallet:Cost; tech:Record<string,number>; groups:ProductionGroup[]; nextFacility:number; bought:boolean;
 baseRefreshUsed:boolean; bonusRefresh:number; paidRefresh:number; talents:Talents; randomState:number;
 offers:Partial<Record<ProductionLineId,Offer[]>>; quotes:Record<string,Offer>; receipts:Record<string,Cost>;
 spent:{construction:Cost;refresh:number};
 frozenTarget?:string|null;
 researchLimit?:number;
}
export interface RuleOptions {random?:()=>number;related?:readonly FamilyId[];capabilities?:(family:FamilyId)=>readonly string[];ready?:(project:Project)=>boolean;priceFactorFor?:(project:Project)=>number;freeChance?:number;doubleChance?:number;researchChance?:number}
export interface PlacementDraft {revision:number; groups:{id:string; outputs:FamilyId[]; enabled:boolean}[]}
export type Result = {ok:true; paid?:Cost; added?:number; firstFree?:boolean}|{ok:false; reason:string};
export {TREE_STEPS} from '../../data/expedition-buildings';
export const PROJECTS:Project[]=DEVELOPMENT;
const projectById = new Map(PROJECTS.map(d=>[d.id,d]));
export const project = (id:string)=>projectById.get(id);
export const linesFor = (race:Race)=>(Object.keys(PRODUCTION_LINES) as ProductionLineId[]).filter(l=>PRODUCTION_LINES[l].race===race);
export const hasGround = (s:BuildingState)=>s.groups.some(g=>g.kind==='hatchery'&&g.directions.includes('ground'));
export const ownsLine = (s:BuildingState,line:ProductionLineId)=>s.groups.some(g=>s.race==='zerg'?line==='zerg.basic'||g.directions.includes(line==='zerg.air'?'air':'ground'):g.kind!=='crystal'&&g.line===line);
export const familyUnlocked = (s:BuildingState,f:FamilyId)=>(s.tech['unlock.'+f]??0)>0;
export const inDirection = (d:Project,line:ProductionLineId)=>d.id==='hatchery'?line.startsWith('zerg.'):d.line===line;
export const facilityCount = (s:BuildingState,kind:string)=>s.groups.filter(g=>g.kind===kind).reduce((n,g)=>n+g.ids.length,0);
export function groupFamilies(g:ProductionGroup):FamilyId[] {
 if(g.kind==='crystal')return ['zealot','adept'];
 if(g.kind!=='hatchery')return TREE_STEPS[g.line].flat();
 return [...TREE_STEPS['zerg.basic'].flat(),...(g.directions.includes('ground')?TREE_STEPS['zerg.evolution'].flat():[]),...(g.directions.includes('air')?TREE_STEPS['zerg.air'].flat():[])];
}
export function canProduce(s:BuildingState,g:ProductionGroup,f:FamilyId,stage=s.stage+1) {
 return groupFamilies(g).includes(f)&&familyUnlocked(s,f)&&(!HEAVY_FAMILIES.includes(f)||stage>=10);
}
export function canUnlock(s:BuildingState,f:FamilyId) {
 const line=familyLine(f),groups=TREE_STEPS[line],at=groups.findIndex(g=>g.includes(f));
 if(familyUnlocked(s,f)||!ownsLine(s,line))return false;
 // Direction evolution supplies these first qualifications; never sell a duplicate unlock.
 if(f==='hydralisk'||f==='mutalisk')return false;
 return at===0||groups[at-1].some(previous=>familyUnlocked(s,previous));
}
export function evolutionTargets(s:BuildingState,id:string) {
 const d=project(id);if(d?.kind!=='evolution'||s.race!=='zerg')return [];
 if(d.direction==='air'?!hasGround(s):!(['roach','queen'] as FamilyId[]).some(f=>familyUnlocked(s,f)))return [];
 return s.groups.filter(g=>g.kind==='hatchery'&&!g.directions.includes(d.direction!));
}
export function eligible(s:BuildingState,d:Project,target?:string) {
 if(d.race!==s.race||s.stage<d.afterStage)return false;
 if(d.kind==='evolution')return evolutionTargets(s,d.id).some(g=>!target||g.id===target);
 if(d.requires.some(id=>!(s.tech[id]>0)&&!facilityCount(s,id)))return false;
 if(d.kind==='facility')return facilityCount(s,d.id)+(d.batch??1)<=d.maxLevel;
 if(!ownsLine(s,d.line!))return false;
 if(d.unlock==='family')return canUnlock(s,d.families[0]);
 const level=s.tech[d.id]??0;
 return level<(d.kind==='research'?Math.max(d.maxLevel,s.researchLimit??0):d.maxLevel)&&!(d.kind==='research'&&(level===1&&s.stage<6||level===2&&s.stage<12));
}
export function candidates(s:BuildingState,line=s.direction) {return PROJECTS.filter(d=>inDirection(d,line)&&eligible(s,d));}
export const activeGroupOutputs=(g:ProductionGroup)=>g.enabled?g.outputs.filter(f=>g.enabledFamilies?.[f]!==false):[];

/** Sole facility initializer: paid construction and future event/equipment grants share this path. */
export function grantFacility(s:BuildingState,kind:FacilityKind):ProductionGroup|null {
 const d=project(kind);if(!d||d.kind!=='facility'||d.race!==s.race||facilityCount(s,kind)+(d.batch??1)>d.maxLevel)return null;
 const ids=Array.from({length:d.batch??1},()=>s.nextFacility++),id=kind==='hatchery'?'h'+ids[0]:kind==='crystal'?'crystal-pair':kind;
 let g=s.groups.find(g=>g.id===id);const created=!g;
 if(g)g.ids.push(...ids);
 else {g={id,kind,ids,line:d.line!,directions:[],outputs:[],enabled:true,cursor:0};s.groups.push(g);}
 s.tech[kind]=facilityCount(s,kind);
 // Preserve the original first-factory/starport bonus; new hatcheries inherit global basics.
 const first=kind==='factory'?'hellion':kind==='starport'?'medivac':null;
 if(first)s.tech['unlock.'+first]=1;
 if(created&&!g.outputs.length){const f=groupFamilies(g).find(f=>familyUnlocked(s,f));if(f)g.outputs=[f];}
 return g;
}
export function newBuildingState(race:Race,wallet:Cost={minerals:850,gas:400},seed=529):BuildingState {
 const line=linesFor(race)[0],first=TREE_STEPS[line][0][0];
 const s:BuildingState={race,stage:1,revision:0,window:1,phase:'building',direction:line,wallet:{...wallet},tech:{['unlock.'+first]:1},groups:[],nextFacility:1,bought:false,baseRefreshUsed:false,bonusRefresh:0,paidRefresh:0,talents:{permanent_discount:0,frugal_build:0,free_house:0,double_build:0,instant_tech:0,window_shop:0,reroll_fan:0},randomState:seed>>>0,offers:{},quotes:{},receipts:{},spent:{construction:{minerals:0,gas:0},refresh:0}};
 grantFacility(s,race==='zerg'?'hatchery':line as FacilityKind);return s;
}
function random(s:BuildingState,options:RuleOptions={}){if(options.random)return options.random();let x=s.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;s.randomState=x>>>0;return s.randomState/4294967296;}
function sample<T>(s:BuildingState,pool:readonly T[],weight:(v:T)=>number,options:RuleOptions={}):T {
 let n=random(s,options)*pool.reduce((n,v)=>n+weight(v),0);for(const v of pool){n-=weight(v);if(n<0)return v;}return pool.at(-1)!;
}
function level(s:BuildingState,d:Project){return d.kind==='facility'?facilityCount(s,d.id):s.tech[d.id]??0;}
export function getOffers(s:BuildingState,options:RuleOptions={}):Offer[] {
 if(s.phase!=='building'||s.bought)return [];
 const cached=s.offers[s.direction];if(cached)return structuredClone(cached).map(q=>({...q,revision:s.revision}));
 const pool=candidates(s).filter(d=>options.ready?.(d)!==false),related=new Set([...(options.related??[]),...s.groups.flatMap(activeGroupOutputs)]),picked:Project[]=[];
 const capabilities=options.capabilities??((f:FamilyId)=>{const d=SC2_UNITS[f];return [...(['both','air'].includes(d.targetType)?['antiAir']:[]),...(d.splash.length||f==='lurker'?['area']:[]),...(['medivac','queen','science_vessel'].includes(f)?['support']:[])];});
 const current=new Set([...related].flatMap(capabilities));
 while(pool.length&&picked.length<3){const slot=picked.length,pinned=slot===0?pool.find(d=>d.id===s.frozenTarget):undefined,chosen=pinned??sample(s,pool,d=>slot===0?d.families.some(f=>related.has(f))?4:1:slot===1?d.families.some(f=>capabilities(f).some(c=>!current.has(c)))?4:d.families.some(f=>related.has(f))?2:1:d.families.some(f=>!related.has(f))?4:d.kind==='facility'?2:1,options);picked.push(chosen);pool.splice(pool.indexOf(chosen),1);}
 const offers=picked.map(d=>{
  const key=d.id+':'+level(s,d);if(s.quotes[key])return s.quotes[key];
  const raw=d.kind==='research'?(level(s,d)===3?{minerals:developmentPrice(d as DevelopmentDefinition,2).minerals*2,gas:developmentPrice(d as DevelopmentDefinition,2).gas*2}:developmentPrice(d as DevelopmentDefinition,level(s,d))):{minerals:d.minerals,gas:d.gas};
  const discount=sample(s,DISCOUNTS,d=>d.weight,options).off,factor=options.priceFactorFor?.(d)??(1-.1*s.talents.permanent_discount)*(1-(d.kind==='research'?0:.15*s.talents.frugal_build));
  if(!Number.isFinite(factor)||factor<0)throw new RangeError('Invalid development price multiplier');
  const cost=(n:number)=>n?Math.max(1,Math.ceil(n*(1-discount)*factor)):0;
  return s.quotes[key]={id:`${s.window}:${s.revision}:${key}`,projectId:d.id,window:s.window,revision:s.revision,level:level(s,d),cost:{minerals:cost(raw.minerals),gas:cost(raw.gas)},baseCost:raw,discount,targets:d.kind==='evolution'?evolutionTargets(s,d.id).map(g=>g.id):[]};
 });
 s.offers[s.direction]=offers;return structuredClone(offers).map(q=>({...q,revision:s.revision}));
}
export function setDirection(s:BuildingState,line:ProductionLineId):Result {
 if(s.phase!=='building'||s.bought||PRODUCTION_LINES[line]?.race!==s.race)return {ok:false,reason:'当前不能切换方向'};
 if(s.direction!==line){s.direction=line;s.revision++;}return {ok:true};
}
function completeProject(s:BuildingState,d:Project,target?:string) {
 if(d.kind==='facility')return grantFacility(s,d.id as FacilityKind);
 if(d.kind==='evolution'){s.groups.find(g=>g.id===target)!.directions.push(d.direction!);s.tech['unlock.'+d.families[0]]=1;return null;}
 s.tech[d.id]=(s.tech[d.id]??0)+1;return null;
}
function instantResearch(s:BuildingState,line:ProductionLineId){
 const pool=PROJECTS.filter(d=>d.line===line&&d.kind!=='facility'&&d.kind!=='evolution'&&eligible(s,d));
 const outputs=new Set(s.groups.flatMap(g=>g.outputs));
 const priority=(d:Project)=>d.id===s.frozenTarget?-100:d.unlock==='skill'&&d.families.some(f=>outputs.has(f))?-50:d.unlock==='system'?-30:d.kind==='research'?10*(s.tech[d.id]??0)+(d.id.endsWith('.defense')?1:0):40;
 const chosen=pool.sort((a,b)=>priority(a)-priority(b))[0];if(chosen)completeProject(s,chosen);
}
export function purchase(s:BuildingState,q:Offer,target?:string,options:RuleOptions={}):Result {
 const live=(s.offers[s.direction]??[]).find(o=>o.id===q.id),d=project(q.projectId);
 if(!d||!live||live.projectId!==q.projectId||q.revision!==s.revision||q.window!==s.window||s.phase!=='building'||s.bought||s.receipts[q.id]||!inDirection(d,s.direction)||!eligible(s,d,target)||options.ready?.(d)===false||level(s,d)!==live.level)return {ok:false,reason:'项目已变化，请重新选择'};
 if(d.kind==='evolution'&&(!target||!live.targets.includes(target)))return {ok:false,reason:'请选择可进化的孵化场'};
 const cost=live.cost;if(s.wallet.minerals<cost.minerals||s.wallet.gas<cost.gas)return {ok:false,reason:'资源不足'};
 const freeChance=Math.max(.2*s.talents.free_house,options.freeChance??0),doubleChance=Math.max(.3*s.talents.double_build,options.doubleChance??0),researchChance=Math.max(Math.min(.99,.33*s.talents.instant_tech),options.researchChance??0);
 const free=d.kind!=='research'&&freeChance>0&&random(s,options)<freeChance;
 const paid={minerals:free?0:cost.minerals,gas:free?0:cost.gas};
 s.wallet.minerals-=paid.minerals;s.wallet.gas-=paid.gas;completeProject(s,d,target);let added=d.kind==='facility'?d.batch??1:0;
 if(d.kind==='facility'){
  const research=()=>{for(let i=0;i<(d.batch??1);i++)if(researchChance>0&&random(s,options)<researchChance)instantResearch(s,d.line!);};research();
  if(doubleChance>0&&eligible(s,d)&&random(s,options)<doubleChance&&s.wallet.minerals>=cost.minerals&&s.wallet.gas>=cost.gas){s.wallet.minerals-=cost.minerals;s.wallet.gas-=cost.gas;paid.minerals+=cost.minerals;paid.gas+=cost.gas;completeProject(s,d);added+=d.batch??1;research();}
 }
 s.receipts[q.id]={...paid};s.spent.construction.minerals+=paid.minerals;s.spent.construction.gas+=paid.gas;s.bought=true;s.revision++;return {ok:true,paid,added,firstFree:free};
}
export function refreshCost(s:BuildingState):number|null {
 if(s.phase==='front'||s.phase==='building'&&(s.bought||!candidates(s).length))return null;
 if(s.phase==='building'&&!s.baseRefreshUsed||s.bonusRefresh>0)return 0;
 return Math.max(10,Math.ceil((50+40*s.paidRefresh-20*s.talents.reroll_fan)*(1-.1*s.talents.permanent_discount)));
}
/** Counter-only port for the native draft ledger; actual refresh payments use refresh(). */
export function consumeRefresh(s:BuildingState,revision:number):Result {
 const cost=refreshCost(s);if(revision!==s.revision||cost===null)return {ok:false,reason:'当前无法刷新'};
 s.spent.refresh+=cost;
 if(s.phase==='building'&&!s.baseRefreshUsed)s.baseRefreshUsed=true;else if(s.bonusRefresh>0)s.bonusRefresh--;else s.paidRefresh++;
 s.revision++;s.offers={};s.quotes={};return {ok:true,paid:{minerals:cost,gas:0}};
}
export function refresh(s:BuildingState,revision:number,priceReduction=0):Result {
 const native=refreshCost(s);if(revision!==s.revision||native===null||!Number.isFinite(priceReduction)||priceReduction<0)return {ok:false,reason:'当前无法刷新'};const cost=Math.max(0,native-priceReduction);
 if(s.wallet.minerals<cost)return {ok:false,reason:'资源不足'};
 const result=consumeRefresh(s,revision);if(result.ok){s.wallet.minerals-=cost;s.spent.refresh-=native-cost;result.paid={minerals:cost,gas:0};}return result;
}
/** Shared payment port after the caller resolves all valid modifiers and free sources. */
export function refreshAtCost(s:BuildingState,revision:number,cost:number):Result {
 const native=refreshCost(s);if(revision!==s.revision||native===null||!Number.isFinite(cost)||cost<0)return {ok:false,reason:'当前无法刷新'};
 if(s.wallet.minerals<cost)return {ok:false,reason:'资源不足'};const result=consumeRefresh(s,revision);if(result.ok){s.wallet.minerals-=cost;s.spent.refresh+=cost-native;result.paid={minerals:cost,gas:0};}return result;
}
export function placementDraft(s:BuildingState):PlacementDraft {return {revision:s.revision,groups:s.groups.map(g=>({id:g.id,outputs:[...g.outputs],enabled:g.enabled}))};}
export function applyPlacement(s:BuildingState,draft:PlacementDraft):Result {
 if(draft.revision!==s.revision||draft.groups.length!==s.groups.length||new Set(draft.groups.map(g=>g.id)).size!==s.groups.length)return {ok:false,reason:'设施状态已变化'};
 for(const d of draft.groups){const g=s.groups.find(g=>g.id===d.id);if(!g||typeof d.enabled!=='boolean'||d.outputs.length>2||new Set(d.outputs).size!==d.outputs.length||d.outputs.some(f=>!canProduce(s,g,f)))return {ok:false,reason:'布置包含尚未开放的兵种'};if(s.phase==='front'&&d.outputs.join()!==g.outputs.join())return {ok:false,reason:'关间才能修改生产兵种'};}
 for(const d of draft.groups){const g=s.groups.find(g=>g.id===d.id)!,changed=g.outputs.join()!==d.outputs.join();if(changed)g.cursor%=Math.max(1,d.outputs.length);if(changed||d.enabled&&!g.enabled)g.enabledFamilies=Object.fromEntries(d.outputs.map(f=>[f,true]));g.outputs=[...d.outputs];g.enabled=d.enabled;}s.revision++;return {ok:true};
}
export function setGroupOutputs(s:BuildingState,id:string,outputs:FamilyId[]):Result {
 const draft=placementDraft(s),g=draft.groups.find(g=>g.id===id);if(!g)return {ok:false,reason:'设施不存在'};g.outputs=[...outputs];return applyPlacement(s,draft);
}
export function setGroupEnabled(s:BuildingState,id:string,enabled:boolean):Result {
 const g=s.groups.find(g=>g.id===id);if(!g||typeof enabled!=='boolean')return {ok:false,reason:'设施不存在'};g.enabled=enabled;if(enabled)g.enabledFamilies=Object.fromEntries(g.outputs.map(f=>[f,true]));s.revision++;return {ok:true};
}
export function nextPhase(s:BuildingState):Result {
 if(s.phase==='front')return {ok:false,reason:'已到前线'};s.phase=s.phase==='building'?'shop':'front';s.revision++;return {ok:true};
}
export function nextWindow(s:BuildingState):Result {
 if(s.phase!=='front'||s.stage>=18)return {ok:false,reason:'当前不能进入下一关'};
 s.stage++;s.window++;s.revision++;s.phase='building';s.bought=false;s.baseRefreshUsed=false;s.bonusRefresh=s.talents.window_shop;s.paidRefresh=0;s.offers={};s.quotes={};return {ok:true};
}
