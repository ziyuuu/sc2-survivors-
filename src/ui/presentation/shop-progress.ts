import type {World} from '../../simulation/world';
import type {ExpeditionReward} from '../../simulation/progression/expedition-drafts';
import type {ExpeditionState} from '../../simulation/expedition-state';
import {teamCardEffects,teamCardKey} from '../../simulation/progression/team-cards';
import {EXPEDITION_CARD_DEFINITIONS} from '../../simulation/progression/expedition-drafts';
import {SC2_UNITS} from '../../data/sc2-units';

export interface ShopProgressSnapshot {version:1;runId:string;complete:boolean;entries:ExpeditionReward[]}
const journals=new WeakMap<World,ShopProgress>();
const enhancement=(r:ExpeditionReward)=>['card','teamCard','support','training'].includes(r.expeditionEffect?.kind);
const validEffect=(r:ExpeditionReward)=>{const e=r.expeditionEffect;if(!e)return false;if(e.kind==='card')return e.effect in EXPEDITION_CARD_DEFINITIONS&&e.family in SC2_UNITS&&e.key===e.effect+'.'+e.family&&Number.isFinite(e.amount)&&e.amount>0;if(e.kind==='teamCard')return ['firepower','defense'].includes(e.group)&&['white','green','blue','purple','orange'].includes(e.rarity);if(e.kind==='support')return typeof e.support==='string';if(e.kind==='training')return Number.isInteger(e.rank)&&e.rank>=2&&e.rank<=5;return false;};
/** Purchase presentation is kept outside World and all gameplay snapshots. */
export class ShopProgress {
 private runId='';private complete=true;private entries:ExpeditionReward[]=[];
 constructor(private world:World){}
 observe(){
  const w=this.world;if(!w.runId)return;
  if(this.runId!==w.runId){this.runId=w.runId;this.entries=[];this.complete=w.expedition.draftWindow===0&&Object.values(w.expedition.cardTotals).every(v=>v===0);}
  for(const offer of w.rewards){const r=offer as ExpeditionReward;
   if(r.sold&&r.purchaseReceipt&&!r.mapSource&&!r.talentLootReceipt&&enhancement(r)&&!this.entries.some(e=>e.offerId===r.offerId))this.entries.push(structuredClone(r));
  }
 }
 snapshot():ShopProgressSnapshot{this.observe();return {version:1,runId:this.runId,complete:this.complete,entries:structuredClone(this.entries)};}
 restore(raw:unknown){
  const w=this.world,p=raw as ShopProgressSnapshot|undefined;this.runId=w.runId??'';this.entries=[];this.complete=w.expedition.draftWindow===0&&Object.values(w.expedition.cardTotals).every(v=>v===0);
  if(p?.version===1&&p.runId===this.runId&&typeof p.complete==='boolean'&&Array.isArray(p.entries)&&p.entries.length<=10000){
   const valid=p.entries.every(r=>r&&typeof r.offerId==='string'&&typeof r.name==='string'&&typeof r.description==='string'&&typeof r.icon==='string'&&['white','green','blue','purple','orange'].includes(r.rarity)&&r.sold&&r.purchaseReceipt&&Number.isFinite(r.purchaseReceipt.minerals)&&Number.isFinite(r.purchaseReceipt.gas)&&validEffect(r));
   if(valid&&new Set(p.entries.map(r=>r.offerId)).size===p.entries.length){this.entries=structuredClone(p.entries);this.complete=p.complete;}
  }
  this.observe();
 }
 count(r:ExpeditionReward){this.observe();const e=r.expeditionEffect;const matches=(p:ExpeditionReward)=>{const q=p.expeditionEffect;return e.kind==='card'?q.kind==='card'&&q.key===e.key:e.kind==='teamCard'?q.kind==='teamCard'&&q.group===e.group&&q.rarity===e.rarity:p.id===r.id;};return {count:this.entries.filter(matches).length,complete:this.complete};}
 totals(){this.observe();const result:Record<string,number>={};for(const r of this.entries){const e=r.expeditionEffect;if(e.kind==='card')result[e.key]=(result[e.key]??0)+e.amount;else if(e.kind==='teamCard'){const key=teamCardKey(e.group,e.rarity);result[key]=(result[key]??0)+1;}}return result;}
 team(){return teamCardEffects({cardTotals:this.totals()} as ExpeditionState);}
}
export function shopProgress(w:World){let journal=journals.get(w);if(!journal){journal=new ShopProgress(w);journals.set(w,journal);}return journal;}
