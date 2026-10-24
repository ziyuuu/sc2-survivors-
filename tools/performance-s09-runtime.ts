import type {boot} from '../src/app/bootstrap';
import {installPerformanceF05} from './performance-f05-runtime';
import {ELITES} from '../src/data/elites';
export function installPerformanceS09(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceF05(app);const a=(window as any).__B02__,b=(window as any).__B03__,{world:w,hud}=app;
 let source:any,target:any,shots:any[]=[];
 const originalStep=w.step.bind(w);w.step=()=>{const n=source?.shotSequence??0;originalStep();if(source&&(source.shotSequence??0)>n)shots.push({tick:w.tick,time:w.time,x:source.x,z:source.z,recoveryUntil:source.recoveryUntil,hp:source.hp});};
 const info=()=>({tick:w.tick,time:w.time,enemies:w.enemyCount(),shots,source:source?{id:source.id,x:source.x,z:source.z,hp:source.hp,shots:source.shotSequence??0,range:source.attackRange,recoveryUntil:source.recoveryUntil,edge:w.edgeDistance(source,target),target:source.attackTarget}:null});
 const setup=async(name:string)=>{
  source=target=null;shots=[];await b.reset('s09-'+name,{race:'zerg',stage:18});
  const id=w.runId;w.runId='00000000-0000-4000-8000-000000000529';if(w.starship.account.run)w.starship.account.run.id=w.runId;
  if(w.expedition.support.stageReceipt?.startsWith(id+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(id!.length);
  w.entities.clear();source=w.addUnit('baneling','terran',0,0);
  if(name==='elite'){source.eliteId='baneling.2';source.modelKey=ELITES['baneling.2'].model;w.refreshStats(source,true);}
  if(name==='temporary'){source.temporary=true;source.temporaryKind='hero-baneling';source.temporaryUntil=30;}
  target=w.addUnit('roach','zerg',0,6);target.hp=target.maxHp=1e6;target.stoppedUntil=1e9;target.weaponDamage=0;
  for(let i=0;i<(name==='dense'?24:12);i++)w.addUnit('hydralisk','terran',(i%4-1.5)*.8,1+Math.floor(i/4)*.8);
  w.hash.rebuild(w.entities.values());await a.prepare();hud.update();return info();
 };
 const advance=async(ticks:number)=>{const r=await a.fast({ticks,renderEvery:30});if(r.endTick-r.startTick!==ticks)throw Error('Incomplete steps');return info();};
 (window as any).__S09__={setup,advance,info};
}
