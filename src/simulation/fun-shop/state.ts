import type {Rarity} from '../../data/rewards';
import type {Difficulty} from '../../data/stages';
import {hordeAllowed} from '../progression/fun-availability';
import type {Point} from '../types';

export const FUN_SHOP_IDS=['gland','eye','nydus','tavern','bait','dice','pandora'] as const;
export type FunShopId=typeof FUN_SHOP_IDS[number];
export type FunShopLevels=Record<FunShopId,number>;
export const TAVERN_MULTIPLIERS=[1,1.3,1.7,2.2] as const;
export const DICE_BONUSES=[[0,0],[1,.25],[3,1],[6,2],[10,4],[15,7]] as const;
export const BAIT_CHANCES={encounter:[0,.12,.22,.32],elite:[0,.15,.25,.35],horde:[0,.1,.2,.3]} as const;
export type BaitCategory=keyof typeof BAIT_CHANCES;
export interface ShopNydus extends Point {id:number;source:number;stage:number;born:number;phase:'birth'|'open'|'swallow'|'retreat';phaseAt:number;targets:number[];cursor:number}
export interface FunShopState {
 levels:FunShopLevels;nextNydus:number;nydus:ShopNydus|null;
 bait:{stage:number;next:number;pending:Record<BaitCategory,boolean>;counts:Record<BaitCategory,number>;ready:Record<BaitCategory,number>};
}
export const newFunShop=():FunShopState=>({levels:{gland:0,eye:0,nydus:0,tavern:0,bait:0,dice:0,pandora:0},nextNydus:0,nydus:null,bait:{stage:0,next:20,pending:{encounter:false,elite:false,horde:false},counts:{encounter:0,elite:0,horde:0},ready:{encounter:0,elite:0,horde:0}}});
const PRICES:Record<FunShopId,readonly (readonly [number,number])[]>={gland:[[250,100]],eye:[[200,100]],nydus:[[500,200]],tavern:[[100,25],[200,50],[350,100]],bait:[[100,25],[200,50],[350,100]],dice:[[50,0],[125,25],[250,75],[450,150],[700,250]],pandora:[[0,0]]};
const NAMES:Record<FunShopId,string>={gland:'虫后腺体',eye:'上帝之眼',nydus:'友方坑道虫',tavern:'酒馆',bait:'诱饵',dice:'骰子',pandora:'潘多拉魔盒'};
const RARITIES:Rarity[]=['white','green','blue','purple','orange'];
export function funShopQuote(levels:FunShopLevels,id:FunShopId,level:number,expected=levels[id]){
 if(!FUN_SHOP_IDS.includes(id)||!Number.isInteger(level)||expected!==levels[id]||level<=expected||level>PRICES[id].length||id==='dice'&&level!==expected+1)return null;
 const [m,g]=PRICES[id][level-1],[oldM,oldG]=expected?PRICES[id][expected-1]:[0,0];return {minerals:m-oldM,gas:g-oldG};
}
export function funShopSummary(id:FunShopId,level:number,difficulty?:Difficulty){
 switch(id){
 case 'gland':return '击杀敌人，有机会孵出临时友方爆虫。';
 case 'eye':return '揭示小队周围的隐形与潜地敌人。';
 case 'nydus':return '定期呼出坑道虫，吞噬普通地面敌军。';
 case 'tavern':return '自然主事件抽选时，任务类别权重提高至'+TAVERN_MULTIPLIERS[level]+'倍。';
 case 'bait':return difficulty&&!hordeAllowed(difficulty)?'额外引来本难度的特殊遭遇和精英；虫群从困难开放。':'额外引来特殊遭遇、精英和虫群（虫群从困难开放）。';
 case 'dice':return '更容易刷出紫色和橙色商品。';
 case 'pandora':return '免费得3000矿／1500气；后续敌军更强。';
 }
}
export function funShopDescription(id:FunShopId,level:number,difficulty?:Difficulty){
 switch(id){
 case 'gland':return '小队击杀普通或精英敌人时，有25%概率孵出友方爆虫，场上最多10只。\n爆虫存活30秒，可被击杀，自爆后消失；它的击杀不会孵出更多爆虫。';
 case 'eye':return '持续揭示队伍中心14米内的隐形与潜地敌人，范围随队伍移动。';
 case 'nydus':return '每18秒在附近敌群下钻出，依次吞噬最多6个普通地面敌人后钻回。\n吞噬可获得正常击杀收益和掉落；不吞噬精英、Boss或空中单位。';
 case 'tavern':return '每关至多一次自然主事件。抽中后，任务类别基础45权重乘以'+TAVERN_MULTIPLIERS[level]+'；遭遇35、虫群20，任务与遭遇只选本难度允许的内容。简单／普通抽中虫群时该次机会落空，不改抽其他类别。\n不增加每关主事件概率或次数；仍遵守开关20秒、结束后15秒喘息及高压互斥。最高档生效，升级只付总价差额。';
 case 'bait':{
  const locked=difficulty!==undefined&&!hordeAllowed(difficulty);
  return '每20秒有额外机会引来：本难度的特殊遭遇'+Math.round(BAIT_CHANCES.encounter[level]*100)+'%、精英'+Math.round(BAIT_CHANCES.elite[level]*100)+'%'+(locked?'，两者独立判定。当前难度不触发虫群，也不补成其他事件。':'、虫群'+Math.round(BAIT_CHANCES.horde[level]*100)+'%，三者独立判定。虫群仅困难／地狱可触发。')+'\n每关最多额外出现1次遭遇、2只精英'+(locked?'':'、1波虫群')+'；场上暂时无法出现时，每类最多留一次机会，空出后再出现。原本的出现机会保留；升级只付总价差额。';
 }
 case 'dice':{
  const bands=[[4,0],[7,1],[12,3]],labels=['1—5','6—11','12—19'];
  const rates=bands.map(([p,o],i)=>{const weights=shopRarityWeights([100-p-o,0,0,p,o],level),total=weights.reduce((a,b)=>a+b,0);return '第'+labels[i]+'关：紫'+(weights[3]/total*100).toFixed(1)+'%、橙'+(weights[4]/total*100).toFixed(1)+'%';}).join('；');
  return '只影响之后出现的新商品和刷新结果。\n未计入其他装备加成时，各关段刷出紫色和橙色商品的概率为：'+rates+'。装备的免费刷新加成可进一步提高紫橙商品的出现机会；抽中的品质无可售商品时改选其他品质。\n按白→绿→蓝→紫→橙逐级升级，只付总价差额。';
 }
 case 'pandora':return '立即获得3000矿物和1500瓦斯，无需支付资源，每局只能开启一次。\n作为代价，本局之后出生的敌军生命提高25%、攻击伤害提高15%，数量不增加；场上已有敌军不变。';
 }
}
export function funShopCandidates(levels:FunShopLevels,difficulty?:Difficulty){
 return FUN_SHOP_IDS.flatMap(id=>PRICES[id].flatMap((_,index)=>{
  const level=index+1,price=funShopQuote(levels,id,level);if(!price)return [];
  const rarity=id==='dice'?RARITIES[index]:id==='tavern'||id==='bait'?RARITIES[level]:id==='pandora'?'orange':'purple';
  return [{id:'fun-shop.'+id+'.'+level,name:NAMES[id]+(PRICES[id].length>1?' · '+(id==='dice'?['白','绿','蓝','紫','橙'][index]:level+'级'):''),description:funShopDescription(id,level,difficulty),icon:id==='gland'?'unit.baneling':id==='eye'?'unit.observer':id==='nydus'?'unit.roach':id==='pandora'?'ui.gas':'tech.attack',rarity,price,item:id,level,expected:levels[id]}];
 }));
}
export function shopRarityWeights(base:readonly number[],level=0,highQuality=0){const [p,o]=DICE_BONUSES[level]??DICE_BONUSES[0];return base.map((n,i)=>(n+(i===3?p:i===4?o:0))*(i>=3?1+highQuality:1));}
export function funShopCatalogue(){const levels=newFunShop().levels,result=funShopCandidates(levels);for(let dice=1;dice<5;dice++)result.push(...funShopCandidates({...levels,dice}).filter(c=>c.item==='dice'));return result.map(c=>({...c,price:{minerals:PRICES[c.item][c.level-1][0],gas:PRICES[c.item][c.level-1][1]}}));}
export function validateFunShop(s:FunShopState){
 if(!s||!s.levels||FUN_SHOP_IDS.some(id=>!Number.isInteger(s.levels[id])||s.levels[id]<0||s.levels[id]>PRICES[id].length)||!Number.isFinite(s.nextNydus)||!s.bait)throw Error('趣味商品状态无效');
 const b=s.bait;if(![b.stage,b.next,...Object.values(b.ready)].every(n=>Number.isFinite(n)&&n>=0)||Object.values(b.counts).some(n=>!Number.isInteger(n)||n<0)||Object.values(b.pending).some(n=>typeof n!=='boolean')||b.counts.encounter>1||b.counts.elite>2||b.counts.horde>1)throw Error('诱饵额度无效');
 const n=s.nydus;if(n&&(!['birth','open','swallow','retreat'].includes(n.phase)||![n.id,n.source,n.stage,n.born,n.phaseAt,n.x,n.z].every(Number.isFinite)||n.targets.length>6||!Number.isInteger(n.cursor)||n.cursor<0||n.cursor>n.targets.length))throw Error('友方坑道虫状态无效');
}
