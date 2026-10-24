import type {World} from './world';
import type {DeliveryLedger} from './expedition-state';

/** Ledger entries are append-only during a run. Reset/restore replace the array.
 * Completed receipts stay in that array; only this derived work list drops them.
 * Writers must call deliveryChanged after settling a job or changing its cargo.
 * Passenger values are always read live (including twin deaths within one tick).
 */
interface Queries {length:number;byId:Map<number,DeliveryLedger>;live:Map<DeliveryLedger,number>;}
const queries=new WeakMap<DeliveryLedger[],Queries>();
const relevant=(j:DeliveryLedger)=>j.state!=='settled'||j.passengers.some(p=>p.status==='waiting');
function index(w:World){
 const ledger=w.expedition.ledger;let q=queries.get(ledger);
 if(!q||q.length>ledger.length){q={length:0,byId:new Map(),live:new Map()};queries.set(ledger,q);}
 for(;q.length<ledger.length;q.length++){const j=ledger[q.length];if(!q.byId.has(j.id))q.byId.set(j.id,j);if(relevant(j))q.live.set(j,q.length);}
 return q;
}
/** Preserve original ledger order and observe newly appended jobs during iteration. */
export function deliveryJobs(w:World){return index(w).live.keys();}
export function deliveryJob(w:World,id:number|undefined|null){return id==null?undefined:index(w).byId.get(id);}
export function deliveryChanged(w:World,j:DeliveryLedger){
 const q=index(w);
 if(!relevant(j))q.live.delete(j);
 // A settled job never reopens in production. An explicit caller that reopens
 // one invalidates the derived index, restoring its original ledger position.
 else if(!q.live.has(j))queries.delete(w.expedition.ledger);
}
export function hasWaitingTwin(w:World,pairId:string|undefined,firstOnly=false){
 for(const j of deliveryJobs(w))for(const p of j.passengers)if(p.pairId===pairId&&p.status==='waiting'&&(!firstOnly||p.pairHalf===0))return true;
 return false;
}
export function productionGroupJob(w:World,group:{id:string;ids:number[]}){
 for(const j of deliveryJobs(w))if(j.state!=='settled'&&(j.producerId===group.id||j.facilityIds.some(id=>group.ids.includes(id))))return j;
}
export function facilityTraining(w:World,id:number){
 for(const j of deliveryJobs(w))if(j.state==='training'&&j.facilityIds.includes(id))return true;
 return false;
}
