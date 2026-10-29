import type {Race} from '../../data/races';
import type {EquipmentAccount} from '../../simulation/starship/types';
import {success,failure} from '../../simulation/starship/types';
import {equipmentPhase} from '../../simulation/starship/phase';
import {applyEquipmentLoadout} from '../../simulation/starship/loadout';
import {quickEquip} from '../../simulation/starship/quick-equip';
import * as rules from '../../simulation/starship/inventory';
import {newManagementState,type StarshipHost,type ManagementState,type SettlementView} from './host';
import {settlementView} from './settlement-view';

/** An in-memory host; scenario grants and simulated outcomes live in the preview, not this module. */
export function createMemoryStarshipHost(a:EquipmentAccount,options:{race?:Race;management?:ManagementState;resolveImage:(key:string,detail?:boolean)=>string;createRunId?:()=>string;position?:()=>{x:number;z:number}}){
 const listeners=new Set<()=>void>(),leases=new Set<()=>void>();let race=options.race??a.run?.race??'terran',phase=a.run?(a.run.ended?'finished':'battle'):'menu',stage=1,serial=0,holds=0,disposed=false,settlement:SettlementView|undefined;
 const emit=()=>{for(const fn of listeners)fn();};
 const host:StarshipHost={management:options.management??newManagementState(),account:()=>a,race:()=>race,phase:()=>equipmentPhase(phase,a),stage:()=>stage,subscribe(fn){listeners.add(fn);return()=>{listeners.delete(fn);};},notify:emit,
  equip:(id,slot,revision)=>phase==='battle'?failure('战斗中不能换装'):rules.equip(a,race,id,slot,revision),unequip:(slot,revision)=>phase==='battle'?failure('战斗中不能换装'):rules.unequip(a,race,slot,revision),loadout:(value,revision)=>phase==='battle'?failure('战斗中不能换装'):applyEquipmentLoadout(a,race,value,revision),
  autoEquip:(protectedIds,revision)=>host.phase()==='intermission'?quickEquip(a,race,protectedIds,revision):failure('只能在关间一键换装'),
  drop(id,revision){if(!['battle','intermission'].includes(host.phase()))return failure('当前不能丢弃装备');const p=options.position?.()??{x:0,z:0};return rules.dropEquipment(a,id,{x:p.x+3.5,z:p.z},revision);},
  dismantle:(ids,revision)=>phase==='battle'?failure('战斗中不能分解'):rules.dismantleEquipment(a,ids,revision,host.phase()==='intermission'?'intermission':'outside'),
  pickup(id){if(!['battle','intermission'].includes(host.phase()))return failure('当前不能拾取');const loc=a.locations[id],p=options.position?.()??{x:0,z:0};if(loc?.kind==='ground'&&(loc.x===undefined||loc.z===undefined||Math.hypot(loc.x-p.x,loc.z-p.z)>2.5))return failure('请先靠近战利品');return rules.collectEquipment(a,id);},acquireWindow(){if(disposed)throw Error('舰装宿主已卸载');holds++;let held=true;const done=()=>{if(held){held=false;holds--;leases.delete(done);}};leases.add(done);return done;},resolveImage:options.resolveImage,
  selectRace(value){if(a.run&&!a.run.ended)return failure('出征中不能更换种族');race=value;emit();return success(undefined);},
  begin(){const r=rules.beginEquipmentRun(a,race,options.createRunId?.()??'demo-run-'+(++serial));if(r.ok){phase='battle';stage=1;settlement=undefined;emit();}return r;},
  continue(){if(phase!=='reward')return failure('当前不能继续');phase='battle';stage++;emit();return success(undefined);},
  extract(){if(phase!=='reward')return failure('只能在关间撤离');return finish('success');},settlement:()=>settlement,dispose(){disposed=true;for(const release of [...leases])release();listeners.clear();}
 };
 function finish(outcome:'success'|'failure'){const carried=[...rules.itemsAt(a,'backpack'),...rules.itemsAt(a,'ground')].map(i=>structuredClone(i)),r=rules.settleEquipment(a,outcome);if(r.ok){if(!settlement)settlement=settlementView(a,outcome,carried);phase=outcome==='success'?'finished':'lost';emit();}return r;}
 return {host,get paused(){return holds>0;},endStage(){if(phase==='battle'){phase='reward';emit();}},finish};
}
