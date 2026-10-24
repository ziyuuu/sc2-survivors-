import type {boot} from '../src/app/bootstrap';
import {installPerformanceB03} from './performance-b03-runtime';
import {createEquipmentProjections} from '../src/simulation/starship/projections';
import {equipmentEffectRequests} from '../src/render/effects/equipment-effects';
import {equipmentPresentationReceipts} from '../src/simulation/starship/presentation';
export function installPerformanceF05(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceB03(app);const a=(window as any).__B03__,w=app.world;let ids:number[]=[];
 const state=()=>({time:w.time,tick:w.tick,entities:w.entities.size,live:w.allies().length,projections:w.starship.projections.size,members:w.starship.members.size,sources:w.starship.combatSources.size,movement:w.starship.combat.movement.size,ids:ids.map(id=>({id,hp:w.entities.get(id)?.hp,deadAt:w.entities.get(id)?.deadAt,present:w.entities.has(id),registered:w.starship.projections.has(id)})),effects:equipmentEffectRequests(w,()=>0).map(e=>({model:e.model,key:e.key,age:e.age,placement:e.placement})),receipts:equipmentPresentationReceipts(w).filter(e=>e.kind.startsWith('projection')),rng:w.rngState,equipmentRng:w.starship.account.rng,wallet:{...w.wallet}});
 const spawn=()=>{const copies=createEquipmentProjections(w,w.allies()[0],2,'phantom',.5,.5,.5);ids=copies.map(u=>u.id);if(ids.length!==2)throw Error('Projection placement failed');w.hash.invalidatePlanes();return state();};
 const step=(ticks:number)=>{for(let i=0;i<ticks;i++)w.step();return state();};
 (window as any).__F05__={...a,state,spawn,step,kill:()=>{for(const id of ids){const u=w.entities.get(id);if(u)w.hit(u,1e6,[],1,'zerg',0,1,undefined,true);}return state();}};
}
