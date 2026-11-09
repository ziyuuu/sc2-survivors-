import type {World} from '../../simulation/world';
import {equipmentPhase} from '../../simulation/starship/phase';
import {canBeginEquipmentRun,itemsAt,dismantleEquipment} from '../../simulation/starship/inventory';
import {collectWorldEquipment,dropWorldEquipment} from '../../simulation/starship/drops';
import {equipmentGroundDrops} from '../../simulation/starship/loot-presentation';
import {success,failure} from '../../simulation/starship/types';
import type {EquipmentItem} from '../../simulation/starship/types';
import {newManagementState,type ManagementState,type StarshipHost,type SettlementView} from './host';
import {settlementView} from './settlement-view';

export interface WorldHostOptions {
 management?:ManagementState;resolveImage:(key:string,detail?:boolean)=>string;
 /** Reuse the application's native asset/readiness entrance when mounted in the game. */
 begin?:()=>boolean;continue?:()=>boolean;inputReset?:()=>void;
}
export function createWorldStarshipHost(world:World,options:WorldHostOptions):StarshipHost {
 const subscriptions=new Set<()=>void>(),leases=new Set<()=>void>();let disposed=false,lastRun='',carried:EquipmentItem[]=[],settlement: SettlementView|undefined;
 const observe=()=>{const a=world.starship.account,run=a.run;
  if(run&&run.id!==lastRun){lastRun=run.id;carried=[];settlement=undefined;}
  if(run&&!run.ended)carried=structuredClone([...itemsAt(a,'backpack'),...itemsAt(a,'ground')]);
  if(run?.ended&&!settlement)settlement=settlementView(a,world.phase==='lost'?'failure':'success',carried);
 };
 observe();world.listeners.add(observe);
 const result=(ok:boolean,message:string)=>ok?success(undefined):failure(message);
 const host:StarshipHost={management:options.management??newManagementState(),account:()=>world.starship.account,race:()=>world.expedition.race,phase:()=>equipmentPhase(world.phase,world.starship.account),stage:()=>world.stage,
  subscribe(fn){if(disposed)throw Error('舰装宿主已卸载');subscriptions.add(fn);world.listeners.add(fn);return ()=>{subscriptions.delete(fn);world.listeners.delete(fn);};},notify(){if(!disposed)world.changed();},
  equip:(id,slot,revision)=>world.equipItem(id,slot,revision),unequip:(slot,revision)=>world.unequipItem(slot,revision),loadout:(value,revision)=>world.applyEquipmentLoadout(value,revision),
  autoEquip:(protectedIds,revision)=>world.autoEquipItems(protectedIds,revision),
  pickup(id){return collectWorldEquipment(world,id);},
  drop:(id,revision)=>dropWorldEquipment(world,id,revision),
  dismantle(ids,revision){const phase=host.phase();return phase==='battle'?failure('战斗中不能分解'):dismantleEquipment(world.starship.account,ids,revision,phase==='intermission'?'intermission':'outside');},
  acquireWindow(){if(disposed)throw Error('舰装宿主已卸载');options.inputReset?.();const release=world.acquireInterfacePause();let held=true;const done=()=>{if(!held)return;held=false;leases.delete(done);release();options.inputReset?.();};leases.add(done);return done;},
  groundItems:()=>equipmentGroundDrops(world).map(d=>d.item),resolveImage:options.resolveImage,
  selectRace(race){if(world.starship.account.run&&!world.starship.account.run.ended)return failure('出征中不能更换种族');if(world.phase!=='menu')world.resetRun();return result(world.selectRace(race),'当前不能更换种族');},
  begin(){const valid=canBeginEquipmentRun(world.starship.account,world.expedition.race);if(!valid.ok)return valid;if(world.phase!=='menu')world.resetRun();if(options.begin)return result(options.begin(),'正在准备出征');world.start();return result(world.phase==='battle','出征条件尚未满足');},
  continue(){if(options.continue)return result(options.continue(),'请先完成当前关间选择');if(world.phase==='reward'){for(let n=0;n<4&&world.phase==='reward';n++)if(!world.skipReward())return failure('请先完成当前关间选择');return result(String(world.phase)==='battle','请先完成当前关间选择');}if(world.phase==='won')return result(world.beginEndlessPreparation(),'无法开始无尽准备');return failure('请从游戏入口确认下一战场资源');},
  canExtract:()=>world.canExtractEquipment,extract:()=>result(world.extractEquipment(),'请在正常关间撤离'),settlement:()=>settlement,
  dispose(){if(disposed)return;disposed=true;for(const release of [...leases])release();for(const fn of subscriptions)world.listeners.delete(fn);subscriptions.clear();world.listeners.delete(observe);}
 };return host;
}
