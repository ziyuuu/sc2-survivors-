import type {boot} from '../src/app/bootstrap';
import {installPerformanceF05} from './performance-f05-runtime';
import {findCarrierLanding} from '../src/simulation/movement/carrier-landing';
export function installPerformanceS06(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceF05(app);const a=(window as any).__B02__,b=(window as any).__B03__,{world:w,view:v,hud}=app,x=w as any;
 let source:any,target:any;
 const info=()=>({tick:w.tick,time:w.time,enemies:w.enemyCount(),backlog:x.ambientBacklog.length,rng:x.rngState,pods:w.pods.length,source:source?{x:source.x,z:source.z,shots:source.shotSequence??0,range:source.attackRange,recoveryUntil:source.recoveryUntil,edge:w.edgeDistance(source,target),target:source.attackTarget}:null});
 const setup=async(name:string)=>{
  await b.reset('s06-'+name,{race:'zerg',stage:18});source=target=null;
  const id=w.runId;w.runId='00000000-0000-4000-8000-000000000529';if(w.starship.account.run)w.starship.account.run.id=w.runId;
  if(w.expedition.support.stageReceipt?.startsWith(id+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(id!.length);
  if(name==='spawn'){
   for(const u of w.entities.values())u.stoppedUntil=1e9;
   x.ambientBacklog=Array.from({length:176},(_,i)=>({type:['zergling','roach','hydralisk','mutalisk'][i%4],bearing:i*.71,at:0,campaignStage:18,lane:i,stamp:x.enemyStamp(18,i/60),resources:{minerals:1,gas:1},detector:i===0}));
   const at=performance.now();w.step();const ms=performance.now()-at;await a.prepare();hud.update();return {...info(),stepMs:ms};
  }
  if(name==='carrier'){
   const p=findCarrierLanding(w,'zergling');if(!p)throw Error('No actual terrain landing');w.trySpawnPod('zergling',p);
   const before=a.snapshot(),at=performance.now();let last:any;for(let i=0;i<50;i++)last=findCarrierLanding(w,'zergling');const ms=(performance.now()-at)/50;
   if(a.snapshot()!==before)throw Error('Landing query mutated state');await a.prepare();hud.update();return {...info(),landingMs:ms,next:last};
  }
  w.entities.clear();source=w.addUnit('baneling','terran',0,0);target=w.addUnit('roach','zerg',0,6);target.hp=target.maxHp=1e6;target.stoppedUntil=1e9;target.weaponDamage=0;
  if(name==='baneling-mixed')for(let i=0;i<12;i++){const u=w.addUnit('hydralisk','terran',(i%4-1.5)*.8,1+Math.floor(i/4)*.8);u.stoppedUntil=1e9;}
  w.hash.rebuild(w.entities.values());await a.prepare();hud.update();return info();
 };
 const advance=async(ticks:number)=>{const r=await a.fast({ticks,renderEvery:30});if(r.endTick-r.startTick!==ticks)throw Error('Incomplete steps');return info();};
 (window as any).__S06__={setup,advance,info};
}
