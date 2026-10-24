import {round,stageKey,distance} from './g03-economy-runtime-tier-objectives-r2.mts';

/** Read-only instrumentation: wraps the original setters/methods and never changes decisions or RNG. */
export function observeDeliveries(w:any){
 const events:any[]=[],seenPassengers=new WeakSet(),seenPods=new WeakSet();
 const context=()=>({stage:stageKey(w),time:round(w.time),special:w.specialStages.active?.kind??null});
 const podSnapshot=(p:any)=>p?{id:p.id,job:p.jobId,type:p.unitType,status:p.status,hp:round(p.hp),maxHp:p.maxHp,x:round(p.x),z:round(p.z),anchorDistance:round(distance(p,w.anchor)),guardians:[...p.guardianIds].filter((id:any)=>(w.entities.get(id)?.hp??0)>0).length,waiting:p.passengers.filter((v:any)=>v.status==='waiting').length}:null;
 function attachPassenger(p:any,job:any,index:number,pod:any){
  if(seenPassengers.has(p))return;seenPassengers.add(p);let value=p.status;
  Object.defineProperty(p,'status',{enumerable:true,configurable:true,get:()=>value,set:next=>{
   if(next===value)return;const previous=value;value=next;
   const stack=new Error().stack?.split('\n').slice(2,9).map(s=>s.trim())??[];
   const activePod=pod??w.pods.find((p:any)=>p.id===job?.podId);
   const cause=stack.some(s=>s.includes('rejectReceipt'))?'explicit-rejection':stack.some(s=>s.includes('retireFamily'))?'family-retirement':stack.some(s=>s.includes('cancelTacticalPlan'))?'tactical-cancellation':next==='lost'&&activePod?.hp<=0?'pod-hp-depleted':next==='released'?'native-release':next==='refunded'?'native-refund':'other';
   events.push({...context(),kind:'passenger-status',source:pod?'pod':'ledger',job:job?.id??pod?.jobId,index,family:job?.family??pod?.unitType,purpose:job?.passengers[index]?.purpose,paid:job?.passengers[index]?.paid,previous,status:next,cause,pod:podSnapshot(activePod),stack});
  }});
 }
 function attachPod(p:any){if(!p||seenPods.has(p))return;seenPods.add(p);const job=w.expedition.ledger.find((j:any)=>j.id===p.jobId);events.push({...context(),kind:'pod-created',pod:podSnapshot(p)});p.passengers.forEach((v:any,i:number)=>attachPassenger(v,job,i,p));}
 function inspect(){for(const j of w.expedition.ledger)j.passengers.forEach((p:any,i:number)=>attachPassenger(p,j,i,null));for(const p of w.pods)attachPod(p);}
 const spawn=w.trySpawnPod.bind(w);w.trySpawnPod=(...args:any[])=>{const pod=spawn(...args);attachPod(pod);return pod;};
 const production=w.updateProduction.bind(w);w.updateProduction=(...args:any[])=>{inspect();const result=production(...args);inspect();return result;};
 const pods=w.updatePods.bind(w);w.updatePods=(...args:any[])=>{inspect();return pods(...args);};
 const decisions=['rejectIncomingBatch','commitFamilyReplacement','confirmShopSupply','cancelShopSupply'];
 for(const method of decisions){const fn=w[method]?.bind(w);if(!fn)continue;w[method]=(...args:any[])=>{const before=structuredClone(w.expedition.pendingReceipt??w.expedition.pendingShopSupply),result=fn(...args);events.push({...context(),kind:method,args,result,pending:before});return result;};}
 return {events,inspect};
}
