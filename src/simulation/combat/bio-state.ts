import {BIO_BY_ID,isBioId,type BioId} from '../../data/terran-bio';
import type {Entity} from '../types';
import type {ExpeditionState} from '../expedition-state';
export interface BioState {
 houndSeats?:{host:number;hound?:number;ready:number}[];
 bodySeats?:{family:string;host:number;lastRush?:number}[];
 jungleSettled?:boolean;jungleLegacyBodies?:string[];
 appointments?:import('./bio-life').BioAppointment[];overlord?:number;
 acid?:{source:number;target:number;damage:number;due:number}[];
 fields?:import('./bio-runtime').BioField[];
 nextResidue?:number;freeStimAt?:number;overlordAt?:number;
 ranks:Partial<Record<BioId,number>>;
 nodeReserves:Partial<Record<BioId,number>>;
 purchases:{offerId:string;cardId:BioId;rank:number;progress:number}[];
}
export const newBioState=():BioState=>({ranks:{},nodeReserves:{},purchases:[]});
export const bioRank=(s:ExpeditionState,id:BioId)=>s.bio?.ranks[id]??0;
export const bioFormal=(u:Entity)=>u.owner==='terran'&&!u.heroId&&!u.temporary&&!u.summonKind&&!u.fun&&!u.mission&&!u.encounter&&['marine','reaper','marauder','ghost'].includes(u.unitType);
export function validateBioState(s:BioState|undefined){
 if(s===undefined)return;
 if(!s||!s.ranks||!s.nodeReserves||!Array.isArray(s.purchases))throw Error('生化构筑状态无效');
 for(const [id,rank] of Object.entries(s.ranks))if(!isBioId(id)||!Number.isInteger(rank)||rank<1||rank>BIO_BY_ID[id].maxRank)throw Error('生化卡牌档位无效');
 for(const [id,count] of Object.entries(s.nodeReserves))if(!isBioId(id)||BIO_BY_ID[id].purchase!=='node'||!s.ranks[id]||!Number.isInteger(count)||count<0||count>2)throw Error('生化节点储备无效');
 const receipts=new Set<string>();
 for(const r of s.purchases){
  if(!r||!r.offerId||receipts.has(r.offerId)||!isBioId(r.cardId))throw Error('生化购卡回执无效');
  const c=BIO_BY_ID[r.cardId];
  if(c.purchase==='node'||c.purchase==='orange'||!Number.isInteger(r.rank)||r.rank<1||r.rank>(s.ranks[r.cardId]??0)||r.progress!==(c.purchase==='white-rank'&&r.rank>1?0:1))throw Error('生化购卡进度无效');
  receipts.add(r.offerId);
 }
}
