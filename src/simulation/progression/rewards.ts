import {HEROES,HERO_IDS,type HeroId} from '../../data/heroes';
import {LEGACY_ELITES as ELITES,type EliteId} from '../../data/elites';
import {rollRarity,BUFFS,type Rarity} from '../../data/rewards';
import {BUILDINGS,FACTORY_TECH_LAB,type BuildingType} from '../../data/game';
import {SC2_UNITS,TERRAN,type TerranType} from '../../data/sc2-units';
import {DISCOUNTS} from '../../data/economy';
import type {Reward,Building} from '../types';
export const TECHS=[
 ['stim','兴奋剂','枪兵／劫掠者分别消耗 10／20 HP，攻速与移速提高 50%，持续 11 秒。','tech.stim',150,50],
 ['shield','战斗盾牌','枪兵最大生命值 +10。','tech.shield',75,25],
 ['infantry','步兵武器','枪兵与劫掠者每发伤害 +1，劫掠者对重甲加成同步提高，最多三级。','tech.attack',125,50],
 ['vehicle','车辆武器','提升恶火与坦克的武器伤害，最多三级。','tech.vehicle',150,50],
 ['infernal','地狱火预燃器','恶火对轻甲额外伤害 +5。','tech.infernal',125,75],
 ['siege','攻城后勤','坦克架起与收起耗时减少 20%。','tech.siege',125,75],
 ['mechanicalHeal','纳米维修系统','医疗艇可消耗能量连续修复友方机械单位，不能维修建筑或自身。','tech.heal',150,75],
 ['medivac','医疗升级','医疗艇能量恢复速度加倍。','tech.heal',200,75],
 ['discount','生产优化','后续自动生产成本降低 15%。','building.barracks',200,75],
] as const;
const offer=(r:Omit<Reward,'discount'|'baseMinerals'|'baseGas'|'offerId'|'sold'|'rarity'>&{rarity?:Rarity}):Reward=>({rarity:'white',...r,offerId:r.id,sold:false,discount:0,baseMinerals:r.minerals,baseGas:r.gas});
export function rewardPool(w?:RewardWorld):Reward[]{const factory=w&&[...w.buildings.values()].find(b=>b.type==='factory'&&b.remaining<=0&&!b.techLab&&b.upgradeRemaining===null);return [
 ...(factory?[offer({id:'upgrade.factory.'+factory.id,name:'重工厂科技实验室',description:`升级重工厂${[...w.buildings.values()].filter(b=>b.type==='factory').findIndex(b=>b.id===factory.id)+1}，解锁该厂坦克生产。立即解锁；已付费订单继续训练，星港可独立发展。`,icon:'unit.tank',kind:'upgrade',value:String(factory.id),minerals:FACTORY_TECH_LAB.minerals,gas:FACTORY_TECH_LAB.gas})]:[]),
 offer({id:'research.marauder',name:'劫掠者研究',description:'所有兵营解锁劫掠者，按劫掠者与枪兵交替合批训练。',icon:'unit.marauder',kind:'research',value:'marauder',minerals:50,gas:25}),
 ...Object.entries(BUILDINGS).map(([id,b])=>offer({id:'build.'+id,name:b.name.split(' · ')[1],description:id==='factory'?'建成即可自动生产恶火；科技实验室仅用于解锁坦克。':id==='starport'?'建成后自动生产医疗艇；不需要坦克科技实验室。':'建成后自动生产枪兵，同一批次合并投放一个多人救援仓。',icon:'building.'+id,kind:'build',value:id,minerals:b.minerals,gas:b.gas})),
 ...TERRAN.map(id=>{const u=SC2_UNITS[id];return offer({id:'train.'+id,name:u.zh+'增援',description:'下一关额外投放一个增援仓，清除威胁后归队。',icon:'unit.'+id,kind:'train',value:id,minerals:u.mineralCost,gas:u.gasCost});}),
 ...HERO_IDS.map(id=>offer({id:'hero.'+id,rarity:'orange',name:HEROES[id].name,description:HEROES[id].skill+' · 独立英雄席位；首次招募，同款晋升。阵亡后仅关间付费复活。',icon:'hero.'+id,kind:'hero',value:id,minerals:750,gas:250})),
 ...Object.values(ELITES).map(e=>{const u=SC2_UNITS[e.family];return offer({id:'elite.'+e.id,rarity:'purple',name:e.name,description:e.description+' 首次替换同类普通队员；同款卡晋升，死亡不复活。',icon:e.icon,kind:'elite',value:e.id,minerals:u.mineralCost*5,gas:u.gasCost*5});}),
 offer({id:'intelligence',rarity:'green',name:'补给情报',description:'后续蓝／紫／橙基础概率各提高 20%，线性叠加，最高五级。',icon:'building.starport',kind:'intelligence',value:'intelligence',minerals:125,gas:25}),
 ...TERRAN.flatMap(id=>{const u=SC2_UNITS[id];return ([['green',3,2],['blue',5,3]] as const).map(([rarity,rank,price])=>offer({id:`veteran.${id}.${rank}`,rarity,rank,name:`${u.zh} · Rank ${rank}`,description:`立即获得 Rank ${rank} ${u.zh}；满员时将最低军衔提升至 ${rank}，不投放救援仓。`,icon:'unit.'+id,kind:'veteran',value:id,minerals:u.mineralCost*price,gas:u.gasCost*price}));}),
 ...(['green','blue','purple','orange'] as const).flatMap((rarity,index)=>Object.entries(BUFFS).map(([id,b])=>{const strength=b.values[index];return offer({id:`buff.${id}.${rarity}`,rarity,strength,name:b.name,description:id==='weapon'?`全队武器伤害与属性加成 +${Math.round(strength*100)}%。`:id==='recovery'?`医疗艇每秒恢复生命 +${Math.round(strength*100)}%，仍消耗能量。`:id==='vitality'?`全队生命倍率增加 ${Math.round(strength*100)}%，保留已损失生命。`:`推进充能速度 +${Math.round(strength*100)}%，持续时间 +${(strength*.6).toFixed(2)} 秒。`,icon:b.icon,kind:'buff',value:id,minerals:[125,200,325,500][index],gas:[30,75,125,200][index]});})),
 ...TECHS.map(([id,name,description,icon,minerals,gas])=>offer({id:'tech.'+id,name,description,icon,kind:'tech',value:id,minerals,gas})),
 offer({id:'economy.minerals',name:'矿物补给',description:'获得 100 矿物。',icon:'ui.minerals',kind:'economy',value:'minerals',minerals:25,gas:0}),
 offer({id:'economy.gas',name:'瓦斯补给',description:'获得 50 瓦斯。',icon:'ui.gas',kind:'economy',value:'gas',minerals:25,gas:0}),
 offer({id:'economy.salvage',name:'战地回收',description:'获得 75 矿物与 25 瓦斯。',icon:'building.factory',kind:'economy',value:'salvage',minerals:50,gas:0}),
 offer({id:'economy.supply',name:'补给运输',description:'获得 100 矿物与 25 瓦斯。',icon:'building.barracks',kind:'economy',value:'supply',minerals:75,gas:25}),
 ];}
export type RewardWorld={stage:number;wallet:{minerals:number;gas:number};buildings:Map<number,Building>;upgrades:Map<string,number>;freePurchases?:number;rewardRound?:'building'|'random';rarityBonus?:number;canAcquireHero?:(id:HeroId)=>boolean;canAcquireElite?:(id:EliteId)=>boolean;capacity:(t:TerranType)=>boolean;canRecruit:(t:TerranType,rank:number)=>boolean;productionCost:(t:TerranType)=>{minerals:number;gas:number}};
export function unlockedReward(w:RewardWorld,r:Reward){
 if(r.kind==='hero')return w.canAcquireHero?.(r.value as HeroId)??false;
 if(r.kind==='elite')return w.canAcquireElite?.(r.value as EliteId)??false;
 if(r.kind==='intelligence')return (w.upgrades.get('intelligence')??0)<5;
 if(r.kind==='build')return w.stage>=(r.value==='starport'?2:1)&&(r.value!=='starport'||[...w.buildings.values()].some(b=>b.type==='factory'&&b.remaining<=0));
 if(r.kind==='research')return !w.upgrades.has('marauder');
 if(r.kind==='upgrade'){const b=w.buildings.get(Number(r.value));return !!b&&b.type==='factory'&&b.remaining<=0&&!b.techLab&&b.upgradeRemaining===null;}
 if(r.kind==='train'||r.kind==='veteran')return (r.kind==='train'?w.capacity(r.value as TerranType):w.canRecruit(r.value as TerranType,r.rank!))&&[...w.buildings.values()].some(b=>b.remaining<=0&&BUILDINGS[b.type].types.includes(r.value as TerranType)&&(r.value!=='tank'||b.techLab)&&(r.value!=='marauder'||w.upgrades.has('marauder')));
 if(r.kind==='tech'){const needsFactory=['vehicle','infernal','siege'].includes(r.value),needsStarport=['medivac','mechanicalHeal'].includes(r.value);return (r.value!=='siege'||[...w.buildings.values()].some(b=>b.type==='factory'&&b.techLab))&&(!needsFactory||[...w.buildings.values()].some(b=>b.type==='factory'))&&(!needsStarport||[...w.buildings.values()].some(b=>b.type==='starport'))&&(w.upgrades.get(r.value)??0)<(['infantry','vehicle'].includes(r.value)?3:1);}
 return true;
}
export function eligibleReward(w:RewardWorld,r:Reward){return !r.sold&&unlockedReward(w,r)&&(w.rewardRound==='random'&&(w.freePurchases??0)>0||w.wallet.minerals+1e-8>=r.minerals&&w.wallet.gas+1e-8>=r.gas);}
/** Rarity is rolled first, without looking at the wallet. Each tier always has real available effects. */
export function drawReward(w:RewardWorld,rng:()=>number,map:boolean|'elite'=false,excluded:string[]=[]):Reward|undefined {
 const rarity=rollRarity(rng,map,w.upgrades.get('intelligence')??0,w.rarityBonus??0),pool=rewardPool(w).filter(r=>r.kind!=='build'&&r.kind!=='research'&&r.kind!=='upgrade'&&r.rarity===rarity&&!excluded.includes(r.id)&&unlockedReward(w,r));
 // Factory labs stay ordinary random-round choices; map rewards never start building upgrades.
 if(!map&&rarity==='white')pool.push(...rewardPool(w).filter(r=>r.kind==='upgrade'&&!excluded.includes(r.id)&&unlockedReward(w,r)));
 return pool.length?pool[Math.floor(rng()*pool.length)]:undefined;
}
export function drawRewards(w:RewardWorld,rng:()=>number,previous:string[]=[],round:'building'|'random'='random',oldPrices:Reward[]=[]){
 const pool=rewardPool(w).filter(r=>unlockedReward(w,r)&&(round==='building'?r.kind==='build'||r.kind==='research':r.kind!=='build'&&r.kind!=='research'));const result:Reward[]=[];
 if(round==='building')result.push(...pool);else for(let i=0;i<3;i++){
  const r=drawReward(w,rng,false,result.map(r=>r.id));if(r)result.push(r);
  else {const fallback=pool.find(r=>!result.some(p=>p.id===r.id));if(fallback)result.push(fallback);}
 }
 if(result.length===3&&result.every(r=>previous.includes(r.id))){
  // Keep the rolled rarity on a repeated combination. Four real buffs per rare tier guarantee an alternate.
  const alternative=pool.find(r=>r.rarity===result[2].rarity&&!previous.includes(r.id));if(alternative)result[2]=alternative;
  else {const replacement=pool.find(r=>!previous.includes(r.id));if(replacement)result[2]=replacement;}
 }
 const priced=result.map(r=>{let price={minerals:r.minerals,gas:r.gas};if(r.kind==='train')price=w.productionCost(r.value as TerranType);
  const level=w.upgrades.get(r.value)??0;if(r.value==='infantry'&&level>0)price={minerals:level===1?250:350,gas:level===1?75:125};if(r.value==='vehicle'&&level>0)price={minerals:level===1?250:300,gas:level===1?75:100};
  let n=rng()*100;const d=DISCOUNTS.find(d=>{n-=d.weight;return n<0;})??DISCOUNTS[0];return {...r,discount:d.off,baseMinerals:price.minerals,baseGas:price.gas,minerals:Math.ceil(price.minerals*(1-d.off)),gas:Math.ceil(price.gas*(1-d.off))};
 });
 if(round==='building'&&priced.length&&oldPrices.length&&priced.every(r=>oldPrices.some(p=>p.id===r.id&&p.minerals===r.minerals&&p.gas===r.gas))){
  const index=Math.min(priced.length-1,Math.floor(rng()*priced.length)),r=priced[index],choices=DISCOUNTS.filter(d=>Math.ceil(r.baseMinerals*(1-d.off))!==r.minerals||Math.ceil(r.baseGas*(1-d.off))!==r.gas);let n=rng()*choices.reduce((sum,d)=>sum+d.weight,0);const d=choices.find(d=>{n-=d.weight;return n<0;})??choices[0];priced[index]={...r,discount:d.off,minerals:Math.ceil(r.baseMinerals*(1-d.off)),gas:Math.ceil(r.baseGas*(1-d.off))};
 }
 return priced;
}

/** Guaranteed unit reward; exhausted identities recycle once through the existing pickup path. */
export function drawBossReward(w:RewardWorld,rng:()=>number):Reward {const orange=rng()<.2+.04*Math.min(5,w.upgrades.get('intelligence')??0),units=rewardPool(w).filter(r=>(r.kind==='elite'||r.kind==='hero')&&unlockedReward(w,r)),tier=units.filter(r=>r.kind===(orange?'hero':'elite')),pool=tier.length?tier:units;
 if(pool.length)return pool[Math.floor(rng()*pool.length)];
 return {...offer({id:'boss.exhausted',rarity:'purple',name:'精英补给回收',description:'全部单位奖励已培养完成，回收 250 矿与 100 气。',icon:'ui.minerals',kind:'elite',value:'marine.1',minerals:250,gas:100}),sold:true};
}
