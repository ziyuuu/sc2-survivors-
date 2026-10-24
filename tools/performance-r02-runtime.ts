import type {boot} from '../src/app/bootstrap';
import {installPerformanceB03} from './performance-b03-runtime';
import {grantEquipment} from '../src/simulation/starship/inventory';
import {registerEquipmentDrop} from '../src/simulation/starship/loot-presentation';
/** Scoped fixtures and local CPU counters; ordinary entry does not import this module. */
export function installPerformanceR02(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceB03(app);const a=(window as any).__B02__,b=(window as any).__B03__,v:any=app.view,w=app.world;
 const settle=()=>{v.cameraController.update({x:w.anchor.x,y:v.ground(w.anchor),z:w.anchor.z},100,false);v.render(0,1);app.hud.update();};
 const setup=async(n=18,resources=181,full=false)=>{
  await b.reset('r02-drops',{theme:'char'});const old=w.runId;w.runId='00000000-0000-4000-8000-000000000529';const ac=w.starship.account;ac.run!.id=w.runId;if(w.expedition.support.stageReceipt?.startsWith(old+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(old!.length);
  const ids:string[]=[];for(let i=0;i<n+(full?64:0);i++){
   const pack=full&&i<64,index=i-(full?64:0),q=(pack?1:index%5+1),shape=index%3,slot=shape===2&&q<5?'gathering':shape===1?'defense1':'offense1',template=q===5?'set.orange.hero.5':shape===2?(q===1?'module.gathering.1':'module.pickup.'+q):'attribute.'+q,angle=index*2.399963,r=4+Math.sqrt(Math.max(0,index))*.63;
   const result=grantEquipment(ac,{template,race:'terran',slot,binding:q===5?{hero:'raynor'}:undefined,polluted:q>=3&&index%7===0&&(shape!==2||q===5)},'r02:'+i,pack?{kind:'backpack',run:ac.run!.id}:{kind:'ground',run:ac.run!.id,x:Math.sin(angle)*r,z:Math.cos(angle)*r});
   if(!result.ok)throw Error(result.error);if(!pack){ids.push(result.value.id);registerEquipmentDrop(w,result.value);}
  }
  for(let i=0;i<resources;i++){const angle=i*2.399963,r=4+Math.sqrt(i)*.65;w.pickups.push({id:w.nextId++,x:Math.sin(angle)*r,z:Math.cos(angle)*r,minerals:5,gas:i<75?3:0});}
  w.time=2;w.tick=120;w.changed();await a.prepare();settle();return {ids,checkpoint:b.checkpoint()};
 };
 (window as any).__R02__={setup,settle};
}
