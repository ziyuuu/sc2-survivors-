import type {Rarity} from './rewards';

/** Approved first-test values: V1_3_TERRAN_DOOMSDAY_WEAPONS_CODE_SPEC_20261112.md. */
export type DoomsdayCardId = `M-${'W'|'G'|'B'|'P'|'N'|'O'}${string}`;
export type DoomsdayPurchase = 'white-rank'|'rank'|'once'|'node'|'orange';
const prices = {W:[50,0],G:[90,20],B:[150,50],P:[225,90],N:[0,0],O:[0,0]} as const;
function card<const I extends DoomsdayCardId,const P extends Record<string,number|readonly number[]>>(id:I,name:string,purchase:DoomsdayPurchase,params:P){
 const prefix=id[2] as keyof typeof prices;
 return {id,name,branch:'doomsday' as const,purchase,params,quality:({W:'white',G:'green',B:'blue',P:'purple',N:'purple',O:'orange'} as const)[prefix] satisfies Rarity,price:prices[prefix],maxRank:purchase==='rank'||purchase==='white-rank'?3:1};
}
export const DOOMSDAY_RULES={nodeEvery:3,orangeAt:12,orangeClaims:3,reserveLimit:2,bodyTime:1.25,orangeTime:1.5,minMovementRadius:.7} as const;
export const DOOMSDAY_CARDS=[
 card('M-W01','重型枪械','white-rank',{damage:[1.06,1.10,1.14]}),
 card('M-W02','恶火','white-rank',{width:[1.10,1.20,1.30],scale:[1.10,1.18,1.25]}),
 card('M-W03','装填升级','white-rank',{speed:[1.05,1.08,1.12]}),
 card('M-W04','预警机改造','white-rank',{repair:[1.10,1.18,1.25]}),
 card('M-W05','短停点射','white-rank',{distance:3,settleTicks:6,settleSpeed:.10,aim:[.85,.75,.65],damage:[1.06,1.09,1.12]}),
 card('M-W06','防片衬层','white-rank',{damage:[.85,.75,.65],cooldown:240}),
 card('M-W07','快拆炮座','white-rank',{time:[.90,.84,.78]}),
 card('M-W08','跟车掩护','white-rank',{range:2.5,damage:[.92,.88,.84]}),
 card('M-W09','备用电池','white-rank',{threshold:15,energy:[8,14,20]}),
 card('M-G01','穿甲弹','rank',{penetration:[.15,.25,.35]}),
 card('M-G02','纳米护盾','rank',{capacity:[.10,.15,.20],delay:240,regen:.10}),
 card('M-G03','履带提升','rank',{ground:[1.10,1.15,1.20],air:[1.05,1.08,1.10]}),
 card('M-G04','工程官兵','once',{range:2.5,repair:.01,workers:2}),
 card('M-G05','抢修拖索','once',{threshold:.35,helperHealth:.5,range:4,damage:.8,duration:120,cooldown:1200}),
 card('M-G06','蓝焰恶火','once',{speed:.70,bossSpeed:.85,duration:180}),
 card('M-G07','车载探照灯','once',{radius:4}),
 card('M-G08','回收备件','once',{pickup:2,range:4,repair:.12}),
 card('M-G09','斜面装甲','once',{angle:50,damage:.85}),
 card('M-B01','纳米护甲','once',{health:1.2,armor:2,scale:.82,radius:.92}),
 card('M-B02','威慑火炮','once',{radius:1.2}),
 card('M-B03','联发装置','rank',{segments:[1,2,3],damage:.2}),
 card('M-B04','幽能护甲','once',{radius:.8}),
 card('M-B05','余弹转火','once',{}),
 card('M-B06','近防拦截器','once',{range:4,cooldown:360}),
 card('M-B07','双模维京','once',{secondary:.55,airRange:9,groundRange:6}),
 card('M-B08','震荡支架','once',{settleTicks:90,radius:2,duration:48,bossSpeed:.75,cooldown:720}),
 card('M-B09','护航副塔','once',{cooldown:120,range:5,damage:.3,angle:45}),
 card('M-P01','精英装甲','rank',{cap:[2,3,4],rankGain:1.2,extraDamage:.08,extraHealth:.10}),
 card('M-P02','特化火力','once',{chance:.25,cooldown:180,distance:1.5,heavyDistance:.5}),
 card('M-P03','机械化','once',{armor:2}),
 card('M-P04','反击电容','once',{threshold:.2,main:.8,side:.4,targets:2,radius:4}),
 card('M-P05','贯穿炮膛','once',{rounds:3,targets:3,damage:.6,halfWidth:.2}),
 card('M-P06','子母弹女妖','once',{targets:3,returnLimit:2,damage:.4,range:4,speed:12,lifetime:120}),
 card('M-N01','纳米体系','node',{repair:1.15,armor:2,duration:180,range:4,damage:.1,interval:60,ticks:3}),
 card('M-N02','幽能怒火','node',{radius:.92,trueDamage:.1,enhancedTrueDamage:.2,splash:.2,splashRadius:1.5}),
 card('M-N03','精英极化','node',{cap:2,grant:2,minRank:5,threshold:10,factor:1.3}),
 card('M-N04','接敌预热','node',{range:4,followers:2,window:60,damage:.25}),
 card('M-N05','交叉校射','node',{separation:1,window:60,damage:.45,halfWidth:.2,cooldown:240}),
 card('M-N06','阵地供弹','node',{rounds:4,distance:1.5,offset:1,radius:1,damage:.25,enhancedDamage:.4}),
 card('M-N07','冷焰校炮','node',{offset:1.5,turretRadius:1.5,damage:.5,cooldown:480}),
 card('M-N08','空地夹击','node',{duration:180,damage:.4,cooldown:480}),
 card('M-N09','共振引信','node',{range:4,delay:30,damage:.45,width:.8,enhancedWidth:1.6,cooldown:360}),
 card('M-O01','英雄装甲','orange',{shield:.25,scale:1.2}),
 card('M-O02','高达','orange',{damage:2.2,health:2.5,period:60,rounds:9,barrage:.5,cannon:.3,nuke:.2,reset:180,nukeDelay:24,nukeRadius:2.5,scale:2.15,swordRange:2.5,swordArc:120,swordHitPhase:.4,swordDuration:.9}),
 card('M-O03','绝望堡垒','orange',{damage:2.2,health:2.5,rows:3,columns:5,spacing:1.8,radius:.6,rowDelay:4,scale:1.85}),
] as const;
export type DoomsdayCard = typeof DOOMSDAY_CARDS[number];
export type DoomsdayId = DoomsdayCard['id'];
export const DOOMSDAY_CARD_BY_ID=Object.fromEntries(DOOMSDAY_CARDS.map(c=>[c.id,c])) as {[I in DoomsdayId]:Extract<DoomsdayCard,{id:I}>};
export function isDoomsdayId(id:unknown):id is DoomsdayId{return typeof id==='string'&&Object.hasOwn(DOOMSDAY_CARD_BY_ID,id);}
