import type {EquipmentAccount,EquipmentItem} from '../../simulation/starship/types';
import {DISMANTLE_VALUES} from '../../simulation/starship/inventory';
import type {SettlementView} from './host';

export function settlementView(account:EquipmentAccount,outcome:'success'|'failure',carried:EquipmentItem[]):SettlementView {
 const saved=account.settlement;if(saved&&saved.run===account.run?.id)return {run:saved.run,outcome:saved.outcome,retained:saved.retained.map(id=>({id})),lost:saved.lost.map(item=>({id:item.id,item})),salvaged:saved.salvaged.map(item=>({id:item.id,item,dust:DISMANTLE_VALUES[item.quality]})),dust:saved.dust};
 const run=account.run?.id??'',retained=account.receipts['settlement:'+run]??[],salvageIds=account.receipts['settlement-salvage:'+run]??[];
 const salvaged=carried.filter(i=>salvageIds.includes(i.id)).map(item=>({id:item.id,item,dust:DISMANTLE_VALUES[item.quality]}));
 return {run,outcome,retained:retained.map(id=>({id})),lost:carried.filter(i=>!retained.includes(i.id)&&!salvageIds.includes(i.id)).map(item=>({id:item.id,item})),salvaged,dust:salvaged.reduce((n,i)=>n+i.dust,0)};
}
