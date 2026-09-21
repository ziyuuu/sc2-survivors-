import {BUILDINGS,FACTORY_TECH_LAB,type BuildingType} from '../../data/game';
import {SC2_UNITS,TERRAN,type TerranType} from '../../data/sc2-units';
import {DISCOUNTS} from '../../data/economy';
import type {Reward,Building} from '../types';
export const TECHS=[
 ['stim','兴奋剂','枪兵消耗 10 HP，攻速与移速提高 50%，持续 11 秒。','tech.stim',150,50],
 ['shield','战斗盾牌','枪兵最大生命值 +10。','tech.shield',75,25],
 ['infantry','步兵武器','枪兵每发伤害 +1，最多三级。','tech.attack',125,50],
 ['vehicle','车辆武器','提升恶火与坦克的武器伤害，最多三级。','tech.vehicle',150,50],
 ['infernal','地狱火预燃器','恶火对轻甲额外伤害 +5。','tech.infernal',125,75],
 ['siege','攻城后勤','坦克架起与收起耗时减少 20%。','tech.siege',125,75],
 ['medivac','医疗升级','医疗艇能量恢复速度加倍。','tech.heal',200,75],
 ['discount','生产优化','后续自动生产成本降低 15%。','building.barracks',200,75],
] as const;
const offer=(r:Omit<Reward,'discount'|'baseMinerals'|'baseGas'>):Reward=>({...r,discount:0,baseMinerals:r.minerals,baseGas:r.gas});
export function rewardPool(w?:RewardWorld):Reward[]{const factory=w&&[...w.buildings.values()].find(b=>b.type==='factory'&&b.remaining<=0&&!b.techLab&&b.upgradeRemaining===null);return [
 ...(factory?[offer({id:'upgrade.factory.'+factory.id,name:'重工厂科技实验室',description:`升级重工厂 #${factory.id}，解锁该厂坦克生产。当前订单完成后开始升级；星港可独立发展。`,icon:'unit.tank',kind:'upgrade',value:String(factory.id),minerals:FACTORY_TECH_LAB.minerals,gas:FACTORY_TECH_LAB.gas})]:[]),
 ...Object.entries(BUILDINGS).map(([id,b])=>offer({id:'build.'+id,name:b.name.split(' · ')[1],description:'建成后自动扣费生产，每份订单投放一个需要救援的降落仓。',icon:'building.'+id,kind:'build',value:id,minerals:b.minerals,gas:b.gas})),
 ...TERRAN.map(id=>{const u=SC2_UNITS[id];return offer({id:'train.'+id,name:u.zh+'增援',description:'下一关额外投放一个增援仓，清除威胁后归队。',icon:'unit.'+id,kind:'train',value:id,minerals:u.mineralCost,gas:u.gasCost});}),
 ...TECHS.map(([id,name,description,icon,minerals,gas])=>offer({id:'tech.'+id,name,description,icon,kind:'tech',value:id,minerals,gas})),
 offer({id:'economy.minerals',name:'矿物补给',description:'获得 100 矿物。',icon:'ui.minerals',kind:'economy',value:'minerals',minerals:25,gas:0}),
 offer({id:'economy.gas',name:'瓦斯补给',description:'获得 50 瓦斯。',icon:'ui.gas',kind:'economy',value:'gas',minerals:25,gas:0}),
 offer({id:'economy.salvage',name:'战地回收',description:'获得 75 矿物与 25 瓦斯。',icon:'building.factory',kind:'economy',value:'salvage',minerals:50,gas:0}),
 offer({id:'economy.supply',name:'补给运输',description:'获得 100 矿物与 25 瓦斯。',icon:'building.barracks',kind:'economy',value:'supply',minerals:75,gas:25}),
 ];}
export type RewardWorld={stage:number;wallet:{minerals:number;gas:number};buildings:Map<number,Building>;upgrades:Map<string,number>;capacity:(t:TerranType)=>boolean;productionCost:(t:TerranType)=>{minerals:number;gas:number}};
export function unlockedReward(w:RewardWorld,r:Reward){
 if(r.kind==='build')return w.stage>=(r.value==='factory'||r.value==='starport'?2:1)&&(r.value!=='starport'||[...w.buildings.values()].some(b=>b.type==='factory'&&b.remaining<=0));
 if(r.kind==='upgrade'){const b=w.buildings.get(Number(r.value));return !!b&&b.type==='factory'&&b.remaining<=0&&!b.techLab&&b.upgradeRemaining===null;}
 if(r.kind==='train')return w.capacity(r.value as TerranType)&&[...w.buildings.values()].some(b=>b.remaining<=0&&BUILDINGS[b.type].types.includes(r.value as TerranType)&&(r.value!=='tank'||b.techLab));
 if(r.kind==='tech'){const needsFactory=['vehicle','infernal','siege'].includes(r.value),needsStarport=r.value==='medivac';return (r.value!=='siege'||[...w.buildings.values()].some(b=>b.type==='factory'&&b.techLab))&&(!needsFactory||[...w.buildings.values()].some(b=>b.type==='factory'))&&(!needsStarport||[...w.buildings.values()].some(b=>b.type==='starport'))&&(w.upgrades.get(r.value)??0)<(['infantry','vehicle'].includes(r.value)?3:1);}
 return true;
}
export function eligibleReward(w:RewardWorld,r:Reward){return unlockedReward(w,r)&&w.wallet.minerals+1e-8>=r.minerals&&w.wallet.gas+1e-8>=r.gas;}
export function drawRewards(w:RewardWorld,rng:()=>number,previous:string[]=[],round:'building'|'random'='random',oldPrices:Reward[]=[]){
 const pool=rewardPool(w).filter(r=>unlockedReward(w,r)&&(round==='building'?r.kind==='build':r.kind!=='build'));const result:Reward[]=[];
 if(round==='building')result.push(...pool.splice(0));else while(result.length<3&&pool.length)result.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
 if(result.length===3&&result.every(r=>previous.includes(r.id))){const alternative=pool.find(r=>!previous.includes(r.id));if(alternative)result[2]=alternative;}
 const priced=result.map(r=>{let price={minerals:r.minerals,gas:r.gas};if(r.kind==='train')price=w.productionCost(r.value as TerranType);
  const level=w.upgrades.get(r.value)??0;if(r.value==='infantry'&&level>0)price={minerals:level===1?250:350,gas:level===1?75:125};if(r.value==='vehicle'&&level>0)price={minerals:level===1?250:300,gas:level===1?75:100};
  let n=rng()*100;const d=DISCOUNTS.find(d=>{n-=d.weight;return n<0;})??DISCOUNTS[0];return {...r,discount:d.off,baseMinerals:price.minerals,baseGas:price.gas,minerals:Math.ceil(price.minerals*(1-d.off)),gas:Math.ceil(price.gas*(1-d.off))};
 });
 if(round==='building'&&priced.length&&oldPrices.length&&priced.every(r=>oldPrices.some(p=>p.id===r.id&&p.minerals===r.minerals&&p.gas===r.gas))){
  const index=Math.min(priced.length-1,Math.floor(rng()*priced.length)),r=priced[index],choices=DISCOUNTS.filter(d=>Math.ceil(r.baseMinerals*(1-d.off))!==r.minerals||Math.ceil(r.baseGas*(1-d.off))!==r.gas);let n=rng()*choices.reduce((sum,d)=>sum+d.weight,0);const d=choices.find(d=>{n-=d.weight;return n<0;})??choices[0];priced[index]={...r,discount:d.off,minerals:Math.ceil(r.baseMinerals*(1-d.off)),gas:Math.ceil(r.baseGas*(1-d.off))};
 }
 return priced;
}
