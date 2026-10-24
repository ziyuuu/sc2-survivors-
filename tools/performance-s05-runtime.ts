import type {boot} from '../src/app/bootstrap';
import {installPerformanceF05} from './performance-f05-runtime';
import {updateExpeditionProduction,releasePaidPassenger,paidReservations,tacticalReservations,setEnabled} from '../src/simulation/expedition-production';
import {MVP_TALENTS} from '../src/data/mvp-talents';
import type {Race} from '../src/data/races';
export function installPerformanceS05(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceF05(app);const a=(window as any).__B02__,b=(window as any).__B03__,{world:w,view:v,hud}=app;
 const info=()=>({history:w.expedition.ledger.length,jobs:w.expedition.ledger.filter(j=>j.state!=='settled'),wallet:{...w.wallet},plans:w.expedition.tacticalPlans,reservations:w.expedition.familySlots.map(f=>({f,paid:paidReservations(w,f),tactical:tacticalReservations(w,f)})),production:document.querySelector('#production-detail')?.innerHTML??'',overlay:document.querySelector('#overlay')?.innerHTML??''});
 const setup=async(name:string)=>{
  const tactical=name==='tactical',race=(tactical?'terran':name) as Race;
  await b.reset('s05-'+name,{race});w.entities.clear();w.expedition.zerglingPairs=[];w.wallet={minerals:10000,gas:10000};
  w.expedition.ledger=Array.from({length:1000},(_,i)=>({id:100000+i,family:'marine',line:'barracks',facilityIds:[900000+i],remaining:0,state:'settled',podId:null,passengers:[{paid:{minerals:50,gas:0},status:'released',entityId:null,purpose:'body'}]}));
  for(const g of w.expedition.building?.groups??[]){g.enabled=true;for(const f of g.outputs){g.enabledFamilies??={};g.enabledFamilies[f]=true;}}
  if(tactical){Object.assign(w.runConfig!.frozenTalents.levels,Object.fromEntries(MVP_TALENTS.filter(n=>n.race==='terran'&&n.line==='soldiers').map(n=>[n.id,n.maxRank])));const units=Array.from({length:7},(_,i)=>w.addUnit('marine','terran',i*2,0,7));w.phase='reward';if(!w.setTacticalEvolutionPlan('marine',units[0].id,'assault'))throw Error('Tactical plan refused');w.phase='battle';}
  updateExpeditionProduction(w,0,true);if(w.expedition.ledger.length!==1001)throw Error('Expected paid production');
  await a.prepare();hud.update();return info();
 };
 const launch=async()=>{const job=w.expedition.ledger.at(-1)!;updateExpeditionProduction(w,100,false);if(job.state!=='risk')throw Error('Launch refused');await a.prepare();hud.update();return info();};
 const release=async()=>{const job=w.expedition.ledger.at(-1)!,pod=w.pods.find(p=>p.id===job.podId)!;for(let i=0;i<job.passengers.length;i++){const p=w.freePosition(pod.unitType,w.anchor,2,8);if(!p||!releasePaidPassenger(w,pod,i,p))throw Error('Release refused');}if(job.state!=='settled')throw Error('Not settled');await a.prepare();hud.update();return info();};
 (window as any).__S05__={setup,launch,release,info,disable:()=>{const job=w.expedition.ledger.at(-1)!;setEnabled(w,job.family,false);hud.update();return info();}};
}
