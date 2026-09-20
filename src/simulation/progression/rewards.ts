import {BUILDINGS,type BuildingType} from '../../data/game';
import {SC2_UNITS,TERRAN,type TerranType} from '../../data/sc2-units';
import type {Reward} from '../types';
export const TECHS=[
 ['stim','Stimpack · 兴奋剂','解锁兴奋剂：Marine 消耗 10 HP，攻速与移速提高 50%，持续 11 秒。','tech.stim',100,100],
 ['shield','Combat Shield · 战斗盾牌','Marine 最大生命值 +10。','tech.shield',100,100],
 ['infantry','Infantry Weapons · 步兵武器','Marine 每发伤害 +1，最多三级。','tech.attack',100,100],
 ['vehicle','Vehicle Weapons · 车辆武器','Hellion 与 Tank 武器升级，最多三级。','tech.vehicle',100,100],
 ['infernal','Infernal Pre-Igniter · 地狱火','Hellion 对轻甲额外伤害 +5。','tech.infernal',100,100],
 ['siege','Siege Logistics · 攻城后勤','实验适配：自动架起 / 收起耗时减少 20%。基础攻城模式开局可用。','tech.siege',100,75],
 ['medivac','Medivac Upgrade · 医疗升级','实验适配：能量恢复加倍。','tech.heal',100,100],
 ['discount','Efficient Production · 生产优化','实验适配：后续生产成本降低 15%。','building.barracks',75,50],
] as const;
export function rewardPool():Reward[]{return [
 ...Object.entries(BUILDINGS).map(([id,b])=>({id:'build.'+id,name:'Build '+b.name,description:`建造后可排队生产。建造 ${Math.ceil(b.time)} 秒；每份生产任务生成一座救援仓。`,icon:'building.'+id,kind:'build' as const,value:id,minerals:b.minerals,gas:b.gas})),
 ...TERRAN.map(id=>{const u=SC2_UNITS[id];return {id:'train.'+id,name:'Queue '+u.name,description:`支付生产费用，${Math.ceil(u.productionTime)} 秒后产生一座 ${u.zh} 救援仓。`,icon:'unit.'+id,kind:'train' as const,value:id,minerals:u.mineralCost,gas:u.gasCost};}),
 ...TECHS.map(([id,name,description,icon,minerals,gas])=>({id:'tech.'+id,name,description,icon,kind:'tech' as const,value:id,minerals,gas})),
 {id:'economy.minerals',name:'Mineral Cache · 矿物补给',description:'获得 150 Minerals，可用于建造、生产与刷新。',icon:'ui.minerals',kind:'economy',value:'minerals',minerals:0,gas:0},
 {id:'economy.gas',name:'Vespene Cache · 瓦斯补给',description:'获得 100 Vespene Gas。',icon:'ui.gas',kind:'economy',value:'gas',minerals:0,gas:0},
 {id:'economy.salvage',name:'Salvage · 战地回收',description:'获得 75 Minerals 与 40 Gas。',icon:'building.factory',kind:'economy',value:'salvage',minerals:0,gas:0},
 {id:'economy.supply',name:'Supply Shipment · 补给运输',description:'获得 100 Minerals 与 25 Gas。',icon:'building.barracks',kind:'economy',value:'supply',minerals:0,gas:0},
 ];}
export type RewardWorld={wallet:{minerals:number;gas:number};buildings:Map<BuildingType,unknown>;upgrades:Map<string,number>;canTrain:(t:TerranType)=>boolean;productionCost:(t:TerranType)=>{minerals:number;gas:number}};
export function eligibleReward(w:RewardWorld,r:Reward){
 if(r.kind==='build')return !w.buildings.has(r.value as BuildingType)&&w.wallet.minerals>=r.minerals&&w.wallet.gas>=r.gas;
 if(r.kind==='train')return w.canTrain(r.value as TerranType);
 if(r.kind==='tech')return (w.upgrades.get(r.value)??0)<(['infantry','vehicle'].includes(r.value)?3:1)&&w.wallet.minerals>=r.minerals&&w.wallet.gas>=r.gas;
 return true;
}
export function drawRewards(w:RewardWorld,rng:()=>number,previous:string[]=[]){
 const pool=rewardPool().filter(r=>eligibleReward(w,r)).map(r=>r.kind==='train'?{...r,...w.productionCost(r.value as TerranType)}:r);
 const result:Reward[]=[];
 while(result.length<3&&pool.length){result.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);}
 // Guaranteed changed combination even with a deterministic RNG. Four resource fallbacks ensure an alternative.
 if(result.length===3&&result.every(r=>previous.includes(r.id))){const alternative=pool.find(r=>!previous.includes(r.id));if(alternative)result[2]=alternative;}
 return result;
}
