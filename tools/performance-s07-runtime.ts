import type {boot} from '../src/app/bootstrap';
import {installPerformanceF05} from './performance-f05-runtime';
import {ELITES} from '../src/data/elites';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
export function installPerformanceS07(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceF05(app);const a=(window as any).__B02__,b=(window as any).__B03__,{world:w,hud}=app;
 let source:any=null,targets:any[]=[],friends:any[]=[];
 const info=()=>({tick:w.tick,time:w.time,enemies:w.enemyCount(),contacts:w.collisionContacts,source:source?{id:source.id,x:source.x,z:source.z,hp:source.hp,shots:source.shotSequence??0,recoveryUntil:source.recoveryUntil}:null,friends:friends.map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,hp:u.hp,shots:u.shotSequence??0,transit:u.cliffTransit})),targets:targets.map(u=>({id:u.id,hp:u.hp,x:u.x,z:u.z}))});
 const setup=async(name:string)=>{
  await b.reset('s07-'+name,{race:name==='baneling'||name==='temporary'?'zerg':'protoss',stage:18});source=null;targets=[];friends=[];
  const id=w.runId;w.runId='00000000-0000-4000-8000-000000000529';if(w.starship.account.run)w.starship.account.run.id=w.runId;
  if(w.expedition.support.stageReceipt?.startsWith(id+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(id!.length);
  w.entities.clear();setDiagnosticHealthLock(w,name!=='temporary'&&name!=='baneling');
  if(name==='baneling'||name==='temporary'){
   source=w.addUnit('baneling','terran',0,0);friends.push(source);if(name==='temporary'){source.temporary=true;source.temporaryKind='hero-baneling';source.temporaryUntil=30;}
   const target=w.addUnit('roach','zerg',0,6);target.hp=target.maxHp=1e6;target.stoppedUntil=1e9;target.weaponDamage=0;targets.push(target);
   for(let i=0;i<(name==='baneling'?24:12);i++)friends.push(w.addUnit('hydralisk','terran',(i%4-1.5)*.8,1+Math.floor(i/4)*.8));
  }else if(name==='elites'){
   for(const [i,id] of ['marauder.3','immortal.3'].entries()){const def=ELITES[id as keyof typeof ELITES],u=w.addUnit(def.family,'terran',i*3-1.5,0);u.eliteId=id as any;u.modelKey=def.model;w.refreshStats(u,true);friends.push(u);}
   for(let i=0;i<12;i++){const u=w.addUnit('roach','zerg',(i%4-1.5)*1.8,4+Math.floor(i/4)*1.8);u.hp=u.maxHp=1e6;u.stoppedUntil=1e9;u.weaponDamage=0;targets.push(u);}
  }else if(name==='traversal'){
   for(let i=0;i<8;i++)friends.push(w.addUnit(i%2?'colossus':'reaper','terran',(i%4-1.5)*2,-Math.floor(i/4)*2));
   w.issueMove({x:8,z:5});
  }else if(name==='dense'){
   for(let i=0;i<16;i++)friends.push(w.addUnit((['marine','zealot','stalker','baneling'] as const)[i%4],'terran',(i%4-1.5)*.9,-2-Math.floor(i/4)*.9));
   for(let i=0;i<300;i++){const angle=i*2.399963,r=3+Math.sqrt(i)*.24;targets.push(w.addUnit((['zergling','roach','hydralisk','mutalisk'] as const)[i%4],'zerg',Math.sin(angle)*r,5+Math.cos(angle)*r));}
  }else throw Error(name);
  w.hash.rebuild(w.entities.values());await a.prepare();hud.update();return info();
 };
 const advance=async(ticks:number)=>{const r=await a.fast({ticks,renderEvery:30});if(r.endTick-r.startTick!==ticks)throw Error('Incomplete steps');return info();};
 (window as any).__S07__={setup,advance,info};
}
