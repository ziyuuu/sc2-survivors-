import type {VisualEvent} from '../../../simulation/types';

const hitKind=(e:VisualEvent)=>e.kind==='hit'||e.kind==='shield-hit'||e.kind==='shield-break';
const strike=(source:number|undefined,target:number,time:number)=>source+':'+target+':'+time;
type ReceiptSnapshot={length:number;first:VisualEvent|undefined;last:VisualEvent|undefined;index:SourceEventIndex};
const receiptSnapshots=new WeakMap<readonly VisualEvent[],ReceiptSnapshot>();
/** Simulation receipts are append-only values. Audio and visual consumers may
 * share their lookup until append, front pruning, or array replacement. Weak
 * ownership lets old battle/restore arrays and their indices be collected. */
export function sourceEventIndex(events:readonly VisualEvent[]){
 const first=events[0],last=events[events.length-1],cached=receiptSnapshots.get(events);
 if(cached&&cached.length===events.length&&cached.first===first&&cached.last===last)return cached.index;
 const index=new SourceEventIndex(events);receiptSnapshots.set(events,{length:events.length,first,last,index});return index;
}
/** Fallback renderers retain their original first-array-match lookup, including
 * non-attack receipts and an undefined attackId. Build only on first demand. */
export function firstSourceAttackIds(events:readonly VisualEvent[]){const index=new Map<string|undefined,VisualEvent>();for(const e of events)if(!index.has(e.attackId))index.set(e.attackId,e);return index;}
export function latestSourceAttacks(events:readonly VisualEvent[]){const index=new Map<number,VisualEvent>();for(const e of events)if(e.kind==='attack')index.set(e.entityId,e);return index;}
/** One render's receipts only. Array order, not serial/time sorting, selects the
 * last eligible attack; same-time receipts later in the array remain visible. */
export class SourceEventIndex {
 private attacks=new Map<number,VisualEvent[]>();
 private firstHit=new Map<string,number>();
 private impacts=new Set<string>();
 private boreContacts?:Set<string>;
 constructor(events:readonly VisualEvent[]){
  for(const e of events){
   if(e.kind==='attack'){let list=this.attacks.get(e.entityId);if(!list){list=[];this.attacks.set(e.entityId,list);}list.push(e);}
   if(hitKind(e)){const key=strike(e.hitSourceId,e.entityId,e.time),serial=this.firstHit.get(key);if(serial===undefined||e.serial<serial)this.firstHit.set(key,e.serial);}
   if(e.kind==='projectile-impact'&&e.targetId!==undefined)this.impacts.add(strike(e.entityId,e.targetId,e.time));
   if(e.doomsdayEffect==='bore-hit'&&e.targetId!==undefined)(this.boreContacts??=new Set()).add(strike(e.entityId,e.targetId,e.time));
  }
 }
 attack(source:number,time:number){const list=this.attacks.get(source);if(list)for(let i=list.length-1;i>=0;i--)if(list[i].time<=time)return list[i];return undefined;}
 duplicate(e:VisualEvent){return (this.firstHit.get(strike(e.hitSourceId,e.entityId,e.time))??Infinity)<e.serial;}
 missile(e:VisualEvent){return this.impacts.has(strike(e.hitSourceId,e.entityId,e.time));}
 boreContact(e:VisualEvent){return this.boreContacts?.has(strike(e.hitSourceId,e.entityId,e.time))??false;}
 nearbyAttack(entity:number,time:number){return this.attacks.get(entity)?.some(a=>Math.abs(a.time-time)<.04)??false;}
}
