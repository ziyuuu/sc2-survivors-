import {TALENT_BY_ID,TALENTS,TOTAL_TALENT_COST,type TalentNode} from '../../data/talents';
import type {HeroId} from '../../data/heroes';

const KEY='sc2-survivors-talents-v1',BACKUP=KEY+'-backup',PENDING=KEY+'-pending';
interface Snapshot {version:1;balance:number;levels:Record<string,number>;receipts:string[];selectedHero:HeroId;checksum:string}
type StoragePort=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');};
function encode(balance:number,levels:Record<string,number>,receipts:Set<string>,selectedHero:HeroId):Snapshot{
 const payload={version:1 as const,balance,levels:Object.fromEntries(Object.entries(levels).sort(([a],[b])=>a.localeCompare(b))),receipts:[...receipts].sort(),selectedHero};return {...payload,checksum:hash(JSON.stringify(payload))};
}
function decode(raw:string|null):Snapshot|null {if(!raw)return null;try{const value=JSON.parse(raw) as Snapshot;if(value.version!==1||!Number.isSafeInteger(value.balance)||value.balance<0||!value.levels||typeof value.levels!=='object'||!Array.isArray(value.receipts)||!['raynor','tychus','nova'].includes(value.selectedHero))return null;
  for(const [id,rank] of Object.entries(value.levels)){const node=TALENT_BY_ID.get(id);if(!node||!Number.isSafeInteger(rank)||rank<0||rank>node.max)return null;}
  if(value.receipts.some(r=>typeof r!=='string'||r.length>128)||new Set(value.receipts).size!==value.receipts.length)return null;
  const {checksum,...payload}=value;return checksum===hash(JSON.stringify(payload))?value:null;
 }catch{return null;}}

/** Permanent local profile; no account or online service is involved. */
export class TalentProfile {
 balance=0;levels:Record<string,number>={};receipts=new Set<string>();selectedHero:HeroId='raynor';
 recoveryNotice='';storageError='';readonly listeners=new Set<()=>void>();private storage?:StoragePort;
 constructor(storage?:StoragePort){this.storage=storage;if(!storage)return;try{
  const candidates=[['临时提交',storage.getItem(PENDING)],['主档',storage.getItem(KEY)],['备份',storage.getItem(BACKUP)]] as const;
  for(const [name,raw] of candidates){const loaded=decode(raw);if(loaded){this.assign(loaded);if(name!=='主档')this.recoveryNotice=name==='临时提交'?'已恢复中断前的天赋提交。':'主档缺失或损坏；已载入上一份备份。';return;}}
  if(candidates.some(([,raw])=>raw!==null))this.recoveryNotice='天赋档案损坏；请导入备份或明确重置。';
 }catch{this.storageError='浏览器本地存储不可用；请定期导出天赋档案。';}}
 static validJSON(raw:string){return decode(raw)!==null;}

 get locked(){return this.recoveryNotice.includes('请导入备份');}
 get spent(){return TALENTS.reduce((sum,node)=>sum+this.level(node.id)*node.cost,0);}
 get remainingCost(){return TOTAL_TALENT_COST-this.spent;}
 level(id:string){return this.levels[id]??0;}
 private assign(value:Snapshot){this.balance=value.balance;this.levels={...value.levels};this.receipts=new Set(value.receipts);this.selectedHero=value.selectedHero;}
 private persist(){for(const listener of this.listeners)listener();if(!this.storage)return;const encoded=JSON.stringify(encode(this.balance,this.levels,this.receipts,this.selectedHero));try{const old=this.storage.getItem(KEY);this.storage.setItem(PENDING,encoded);if(!decode(this.storage.getItem(PENDING)))throw Error('pending snapshot failed verification');if(old&&decode(old))this.storage.setItem(BACKUP,old);this.storage.setItem(KEY,encoded);this.storage.removeItem(PENDING);this.storageError='';}catch{this.storageError='保存失败；当前改动仅在内存中，请立即导出档案。';}}
 canBuy(id:string){const node=TALENT_BY_ID.get(id);if(!node||this.locked||this.balance<node.cost||this.level(id)>=node.max)return false;
  if(node.requires?.some(required=>this.level(required)<TALENT_BY_ID.get(required)!.max))return false;
  if(node.minRequires&&Object.entries(node.minRequires).some(([required,min])=>this.level(required)<min))return false;
  if(node.tier>1){const previous=TALENTS.filter(n=>n.line===node.line&&n.tier===node.tier-1),required=Math.ceil(previous.reduce((sum,n)=>sum+n.max,0)/2),invested=previous.reduce((sum,n)=>sum+this.level(n.id),0);if(invested<required)return false;}
  if(node.id==='rarity_master'&&!TALENTS.some(n=>n.line==='resources'&&n.tier===5&&this.level(n.id)===n.max))return false;
  if(node.id==='elite_classroom'&&!TALENTS.some(n=>n.line==='resources'&&n.tier===5&&this.level(n.id)===n.max))return false;
  if(node.id==='hero_support'&&TALENTS.filter(n=>n.line==='resources'&&n.tier===5&&this.level(n.id)===n.max).length<2)return false;
  if(node.id==='expanded_squad'&&TALENTS.filter(n=>n.line==='army'&&n.tier===5&&this.level(n.id)===n.max).length<2)return false;
  return true;
 }
 buy(id:string){if(!this.canBuy(id))return false;const node=TALENT_BY_ID.get(id)!;this.balance-=node.cost;this.levels[id]=this.level(id)+1;this.persist();return true;}
 respec(){if(this.locked)return false;this.balance+=this.spent;this.levels={};this.persist();return true;}
 selectHero(id:HeroId){if(this.locked||!['raynor','tychus','nova'].includes(id))return false;this.selectedHero=id;this.persist();return true;}
 award(receipt:string,points:number){if(this.locked||!receipt||!Number.isSafeInteger(points)||points<=0||this.receipts.has(receipt))return false;this.receipts.add(receipt);this.balance+=points;this.persist();return true;}
 exportJSON(){return JSON.stringify(encode(this.balance,this.levels,this.receipts,this.selectedHero),null,2);}
 importJSON(raw:string){const snapshot=decode(raw);if(!snapshot)return false;this.assign(snapshot);this.recoveryNotice='';this.persist();return true;}
 restoreBackup(){if(!this.storage)return false;try{const snapshot=decode(this.storage.getItem(BACKUP));if(!snapshot)return false;this.assign(snapshot);this.recoveryNotice='';this.persist();return true;}catch{return false;}}
 resetCorrupt(){if(!this.locked)return false;this.balance=0;this.levels={};this.receipts.clear();this.selectedHero='raynor';this.recoveryNotice='';this.persist();return true;}
 static newRunId(){return globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;}
}

export function talentPointsForStage(difficulty:'easy'|'normal'|'hard'|'hell',stage:number){return difficulty==='hell'?1:stage%3===0?(difficulty==='hard'?2:1):0;}
export function talentPointsForEndlessMinute(difficulty:'easy'|'normal'|'hard'|'hell'){return difficulty==='hard'||difficulty==='hell'?2:1;}
