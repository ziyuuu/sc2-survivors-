import {decodeGraph,encodeGraph,checksum,type Graph} from './graph-codec';
import {TalentProfile} from '../simulation/progression/talent-profile';
import {ThreeRaceTalentProfile,legacyTalentInvestment} from '../simulation/progression/three-race-talent-profile';
import type {Race} from '../data/races';
import type {Difficulty} from '../data/stages';
export interface DevRunSummary {race:Race;difficulty:Difficulty;stage:number;phase:string;endless:boolean;savedAt:number}
export interface DevImportReport {
 sourceArchiveChecksum:string;principal:number;awardReceipts:string[];
 conversionReport:string;run:DevRunSummary|null;
}
/** Preserve a verified v1 envelope for export even when its resource ledgers conflict. */
export function isVerifiedDevEnvelope(raw:string){
 try{
  if(typeof raw!=='string'||raw.length>32*1024*1024)return false;
  const parsed=JSON.parse(raw) as {format:string;version:number;checksum:string;data:Graph};
  if(parsed.format!=='sc2-survivors-save'||parsed.version!==1)return false;
  const {checksum:sum,...payload}=parsed;
  return typeof sum==='string'&&checksum(JSON.stringify(payload))===sum;
 }catch{return false;}
}
const difficulties=['easy','normal','hard','hell'];
const races=['terran','zerg','protoss'];
/** Read-only v1 converter. It never creates a World or restores a developer run. */
export function inspectDevArchive(raw:string):DevImportReport {
 if(typeof raw!=='string'||raw.length>32*1024*1024)throw Error('开发存档过大或格式无效');
 const parsed=JSON.parse(raw) as {format:string;version:number;savedAt:number;data:Graph;checksum:string};
 if(parsed.format!=='sc2-survivors-save'||parsed.version!==1)throw Error('不是旧开发存档');
 const {checksum:sum,...payload}=parsed;
 if(checksum(JSON.stringify(payload))!==sum)throw Error('开发存档校验失败');
 if(!Number.isFinite(parsed.savedAt))throw Error('开发存档日期无效');
 const bundle=decodeGraph(parsed.data) as {profile:string;threeRaceProfile?:string;run?:{state?:{expedition?:{race?:Race};difficulty?:Difficulty;stage?:number;phase?:string;endless?:unknown}}|null};
 if(!bundle||typeof bundle.profile!=='string'||!TalentProfile.validJSON(bundle.profile))throw Error('旧永久档案无效');
 const legacy=new TalentProfile();
 if(!legacy.importJSON(bundle.profile))throw Error('旧永久档案无法解析');
 const historical=legacy.balance+legacyTalentInvestment(legacy.levels);
 if(!Number.isSafeInteger(historical))throw Error('旧资源本金无效');
 let principal=historical,receipts=[...legacy.receipts],source='旧未花余额＋冻结价格表投资';
 if(bundle.threeRaceProfile!==undefined){
  const three=ThreeRaceTalentProfile.parseJSON(bundle.threeRaceProfile);
  if(!three)throw Error('旧三族永久档案无效；禁止回退旧余额');
  const currentReceipts=three.receipts;
  if(three.principal<historical||receipts.some(r=>!currentReceipts.has(r)))throw Error('两份旧永久档案本金或收据矛盾，无法自动导入');
  principal=three.principal;receipts=[...currentReceipts];source='已验证三族本金（含旧投资；未叠加旧余额）';
 }
 let run:DevRunSummary|null=null;
 if(bundle.run){
  const state=bundle.run.state;
  if(!state||!difficulties.includes(state.difficulty??'')||!Number.isInteger(state.stage)||!state.stage||state.stage<1||state.stage>18||typeof state.phase!=='string')throw Error('旧战局摘要无效');
  const race=state.expedition?.race??'terran';
  if(!races.includes(race))throw Error('旧战局种族无效');
  run={race,difficulty:state.difficulty!,stage:state.stage,phase:state.phase,endless:!!state.endless,savedAt:parsed.savedAt};
 }
 return {sourceArchiveChecksum:'v1:'+sum,principal,awardReceipts:receipts,conversionReport:source+'；旧战局不可续玩，新配点为空',run};
}

/** Wrap a verified old localStorage-only talent profile as a portable read-only v1 candidate. */
export function wrapDevTalentProfile(raw:string){
 if(!TalentProfile.validJSON(raw))throw Error('旧本地天赋档无效');
 // The same local-only profile must retain the same import receipt across launches.
 const payload={format:'sc2-survivors-save',version:1,savedAt:0,data:encodeGraph({profile:raw,run:null})};
 return JSON.stringify({...payload,checksum:checksum(JSON.stringify(payload))});
}
