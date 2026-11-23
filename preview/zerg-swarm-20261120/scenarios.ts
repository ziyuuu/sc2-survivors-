import {ZERG_SWARM_BY_ID,type ZswCardId,type ZswShort} from '../../src/data/zerg-swarm';
import {ELITES} from '../../src/data/elites';
import {SWARM_AIR,SWARM_PERIODIC,type SwarmPeriodic} from '../../src/data/zerg-swarm-rules';
import {SC2_UNITS,type UnitType,type CombatUnitType} from '../../src/data/sc2-units';
import type {FamilyId} from '../../src/data/races';
import {World} from '../../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../../src/data/campaign-map';
import {swarmSize,swarmPasses,swarmContactScale} from '../../src/simulation/combat/zerg-swarm-density';
import {spawnSwarmEvent,swarmPart} from '../../src/simulation/combat/zerg-swarm-spawn';
import {deployExpeditionHero} from '../../src/simulation/combat/expedition-heroes';
import {applySwarmCard} from '../../src/simulation/progression/zerg-swarm-acquisition';
import {applySwarmSpore} from '../../src/simulation/combat/zerg-swarm-spores';
import {swarmDirectFactor,swarmSpeed} from '../../src/simulation/combat/zerg-swarm';
import {newZergSwarmState,swarmRank} from '../../src/simulation/combat/zerg-swarm-state';
import {productionQuote} from '../../src/simulation/expedition-production';
import type {DeliveryLedger} from '../../src/simulation/expedition-state';
import type {Entity} from '../../src/simulation/types';
import type {ShowcaseOption} from './options';

const seed=201120;
// These seeds keep randomized first examples reproducible at all ranks.
const sporeSeed=2016,revivalSeed=2000;
const families=['zergling','roach','hydralisk','queen','aberration'] as const;
const pack=['roach','hydralisk','aberration','viper','devourer','brood_lord','swarm_host','infestor'] as const;
const deathCards:readonly ZswShort[]=['W04','G04','B02','N03'];
const support:Partial<Record<ZswShort,[ZswShort,number]>>={
 W04:['W02',1],W05:['W02',2],W06:['W02',2],W07:['W02',2],W08:['W02',2],W09:['W02',2],
 G09:['W02',2],B07:['W02',3],B08:['W02',2],N04:['B01',3],N06:['W02',3],
 N05:['W03',1],N08:['W02',2],N09:['P03',1],O02:['B01',3],O03:['W02',3],
};
const observations:Record<ZswShort,string>={
 W01:'观察已在训练的订单剩余时间及新单报价。',
 W02:'观察跳虫两只一对入场、作战和到期。',
 W03:'观察正式跳虫的爪击植入孢子，及敌人死亡后孵化。',
 W04:'观察前排兵战死的瞬间，跳虫投放倒计时减少。',
 W05:'观察跳虫出壳时的攻速、移速和消退时间。',
 W06:'观察跳虫出生获得的甲壳，以及交火时吸收的伤害。',
 W07:'观察正式兵为敌人挂标，跳虫对同一目标的直接伤害提高。',
 W08:'观察第一只跳虫落地时的冲击圈和地面实际扣血。',
 W09:'敌群初始处于低血线，观察跳虫的直接伤害倍率。',
 G01:'观察已完工正式新兵由主脑送到队伍身边。',
 G02:'观察孵化卵落地，毒爆从卵中孵出并冲向敌群。',
 G03:'观察坑道出口和实际出现的不同兵种。',
 G04:'观察前排兵战死、三秒后原席位复活及返回血量。',
 G05:'观察刺蛇卵群、刺蛇实际出场与开火。',
 G06:'观察畸变体护卫入场、横扫和反击。',
 G07:'观察孢囊自动选敌、范围扣血与着孢数量。',
 G08:'看虫群集合时的大小和间距。点击空地，让它们转向重新列队。',
 G09:'观察原始跳虫批次入场 1.5 秒后的伴生批次。',
 B01:'观察正式编制中扩编的家族和各自上限。',
 B02:'观察前排畸变体阵亡后裂出较低科技兵。',
 B03:'一只敌人开场已带孢子。观察正式刺蛇命中后的传播、孵化和变异飞龙。',
 B04:'观察吞噬者入场、酸液攻击与对空。',
 B05:'观察感染虫和蟑螂组合、真实感染与战斗。',
 B06:'观察虫群宿主、刺蛇和蝗虫入场作战。',
 B07:'观察敌人附近聚集的临时兵数与直接伤害倍率。',
 B08:'观察临时兵存活到指定时间后，最大生命和武器面板提高。',
 B09:'看虫群穿过前方蟑螂之间的空隙。切换档位后可以沿同一路线再走一次。',
 P01:'观察三只主脑入场效果与九只雷兽的实际落点。',
 P02:'观察高空卵孵出的高级空军及其作战。',
 P03:'观察成对跳虫数量和起跑后的限时移动加速。',
 P04:'观察巢虫领主、虫群宿主和它们再放出的真实子体。',
 P05:'观察孢囊冲击、着孢和感染虫入场。',
 P06:'观察两翼的畸变体和飞蛇，以及聚怪与地面腐蚀云。',
 N01:'蟑螂编制开场已满。观察额外投放的临时兵、军衔和寿命。',
 N02:'观察存活的正式战斗兵分出临时分体及来源军衔。',
 N03:'观察复活的原体、临时分体、返回血量和限时强化。',
 N04:'预置三支已扩编部队。切档观察这三支的编制上限。',
 N05:'观察同一只着孢敌人击杀后实际孵出的只数。',
 N06:'开场已有前两次孵化进度。观察第三批入场两秒后的追加批次。',
 N07:'跟着跳虫、正式兵和凯瑞甘穿过蟑螂阵线。用撤离让它们折返。',
 N08:'观察同一批跳虫实际出生到到期的时间。',
 N09:'观察达到聚集门槛后，正式兵和短期兵实际获得的减伤。',
 O01:'先选择一个英雄，观察同身份双机体。可用原有英雄技能检查共享冷却。',
 O02:'观察正式选用编制从五队到六队及第六队的人数上限。',
 O03:'观察同种跳虫配方放大后的真实入场数量和更高的临时兵上限。',
};

function give(w:World,short:ZswShort,rank:number,hero?:ShowcaseOption['hero']){
 for(let i=0;i<rank;i++)if(!applySwarmCard(w,'ZSW-'+short as ZswCardId,undefined,hero))throw Error('无法准备 '+short);
}
function trainingOrder(w:World,family:'roach'|'hydralisk',seconds:number,seats:number){
 const order:DeliveryLedger={id:w.nextJob++,family,line:'zerg.basic',facilityIds:[],remaining:seconds,
  state:'training',podId:null,passengers:Array.from({length:seats},()=>({
   status:'waiting',entityId:null,purpose:'body',paid:{minerals:0,gas:0},
  }))};
 w.expedition.ledger.push(order);
}
function prepareHero(w:World,id:ShowcaseOption['hero']){
 const record={id,rank:2,entityId:null,skillReady:0,revivePaid:false,awaitingSpawn:true};
 w.heroes.set(id,record);
 if(!deployExpeditionHero(w,record,false))throw Error('英雄无法入场');
}

export function swarmScenario(option:ShowcaseOption){
 const {id,rank,hero,cargo}=option,c=ZERG_SWARM_BY_ID[id],short=c.short;
 const w=new World({race:'zerg',seed,waves:false,sandbox:true,terrain:campaignTerrain(chooseCampaignMap(seed)),obstacles:[]});
 if(!w.start())throw Error('战场无法启动');
 w.entities.clear();w.expedition.zerglingPairs=[];w.expedition.ledger=[];w.pods=[];
 w.missions.enabled=w.encounters.enabled=false;
 w.expedition.familySlots=[...families];
 for(const f of [...families,...pack])w.expedition.tech['unlock.'+f]=1;
 for(const g of w.expedition.building!.groups)g.enabled=false;
 w.anchor={x:0,z:0,facing:0};w.trail=[{x:0,z:0}];
 const add=(type:UnitType,x:number,z:number,rank=3)=>w.addUnit(type,'terran',x,z,rank);
 const enemy=(type:UnitType,x:number,z:number,hp?:number)=>{
  const u=w.addUnit(type,'zerg',x,z);u.moveSpeed=0;
  if(hp!==undefined)u.hp=u.maxHp=hp;
  return u;
 };
 const dying=deathCards.includes(short),sporing=short==='W03'||short==='N05',spreading=short==='B03';
 const lead=add(dying?'aberration':sporing?'zergling':'hydralisk',0,dying?1.4:sporing?1.7:.5,dying?4:short==='N01'||short==='P01'||short==='P02'||short==='P03'||short==='P04'||short==='P05'||short==='P06'?7:3);
 const wing=add('roach',-1.6,-1.7,2);
 const first=enemy('roach',0,dying?3.1:sporing?2.65:short==='G02'?9:4,sporing?25:spreading?120:7000);
 first.facing=first.attackFacing=Math.PI;
 if(dying){lead.hp=1;first.weaponDamage=6;first.nextShotAt=.65;add('aberration',-2.6,-2.4,4);}
 if(short==='O01'){
  prepareHero(w,hero);
  first.hp=first.maxHp=135000;
 }
 for(let i=0;i<6;i++){
  const air=(short==='B04'||short==='P02'||short==='P04')&&i>=3;
  const foe=enemy(air?'mutalisk':'roach',(i%3-1)*2,spreading?5.1+Math.floor(i/3)*1.7:(short==='G02'?10.5:5.8)+Math.floor(i/3)*2,short==='O01'?135000:7000);
  foe.nextShotAt=dying?5:1.5;
  if(dying)foe.weaponDamage=2;
 }
 if(short==='W09')for(const u of w.entities.values())if(u.owner==='zerg')u.hp=Math.round(u.maxHp*.32);
 if(short==='N02'||short==='N09'){
  const reserve=short==='N02'?10:4;
  for(let i=0;i<reserve;i++)add(i%2?'hydralisk':'roach',(i%5-2)*1.5,-2.6-Math.floor(i/5)*1.4,2+i%3);
 }
 const state=w.expedition.zergSwarm=newZergSwarmState(seed);
 state.rng.spores=sporeSeed;state.rng.revival=revivalSeed;
 if(short==='W01')trainingOrder(w,'roach',productionQuote(w,'roach').seconds*.8,1);
 if(short==='G01'&&cargo==='delivery')trainingOrder(w,'hydralisk',4,4);
 if(short==='N01'||short==='G01'&&cargo==='overflow'){
  const group=w.expedition.building!.groups[0];
  group.enabled=true;group.outputs=['roach'];
  for(let i=w.familySeatCount('roach');i<w.familyMemberCap('roach');i++)add('roach',i-2,-3.2,2);
 }
 if(short==='N06')state.echoCount=2;
 if(short==='N02')state.rng.spawn=1334;
 if(spreading)applySwarmSpore(w,first);
 const paired=support[short];
 if(paired)give(w,...paired);
 give(w,short,rank,hero);
 if(['G08','B09','N07'].includes(short)){
  prepareHero(w,'kerrigan');
  wing.eliteId='roach.1';wing.modelKey=ELITES[wing.eliteId].model;w.refreshStats(wing,true);
  for(let i=0;i<4;i++)add(i%2?'aberration':'roach',(i%2-.5)*2,-2-Math.floor(i/2)*1.6);
  spawnSwarmEvent(w,'formation',[swarmPart('zergling',3,3,40,2)],{x:0,z:-3});
  for(const u of w.entities.values())if(u.owner==='zerg')u.weaponDamage=2;
  w.issueMove({x:0,z:11});
 }
 if(short==='O02'&&w.squadCap()>w.expedition.familySlots.length){
  w.expedition.familySlots.push('viper');
  add('viper',1.1,-1.8,2);
 }
 if(short==='G07'||short==='N02'||short==='N01'||short==='G01'&&cargo==='overflow'){
  const clock=state.clocks[short==='G07'||short==='N02'?short:'overflow'];
  if(clock)clock.next=3;
 }
 if(short==='G01'&&cargo==='delivery'&&state.clocks.delivery)state.clocks.delivery.next=4;
 w.hash.rebuild(w.entities.values());
 // Preload future arrivals that are absent at the start of this trial.
 const arrivals=new Set<CombatUnitType>();
 for(const [key,row] of Object.entries(SWARM_PERIODIC)){
  if(!swarmRank(state,key as SwarmPeriodic))continue;
  const types=key==='G03'?[...families,...pack]:key==='P02'?SWARM_AIR:row.pack.map(([family])=>family);
  for(const type of types)arrivals.add(type);
 }
 if(short==='B02')arrivals.add('hydralisk');
 if(sporing)arrivals.add('zergling');
 if(swarmRank(state,'B03'))for(const type of ['baneling','roach','mutalisk'] as const)arrivals.add(type);
 if(arrivals.has('swarm_host'))arrivals.add('zerg_locust');
 if(arrivals.has('brood_lord'))arrivals.add('zerg_broodling');
 const focus=short==='G01'&&cargo==='overflow'?'蟑螂编制开场已满，观察主脑的额外临时兵投放。':observations[short];
 return {world:w,focus,leadId:lead.id,wingId:wing.id,firstId:first.id,
  context:paired?ZERG_SWARM_BY_ID[('ZSW-'+paired[0]) as ZswCardId].name+' '+paired[1]+'档':'',
  nearClock:['G01','N01','N02','G07'].includes(short),
  extraModels:[...arrivals]};
}
export type SwarmScene=ReturnType<typeof swarmScenario>;

export function readScene(w:World,scene:SwarmScene){
 const s=w.expedition.zergSwarm!;
 const bodies=[...w.entities.values()];
 const friends=bodies.filter(u=>u.owner==='terran'&&u.hp>0);
 const enemies=bodies.filter(u=>u.owner==='zerg'&&u.hp>0);
 const temps=friends.filter(u=>u.zergSwarm),first=w.entities.get(scene.firstId);
 const ledger=w.expedition.ledger;
 // Group damage populates a short-lived cache. Inspect a copy so observing never changes combat.
 const probe=swarmRank(s,'B07')?Object.assign(Object.create(w) as World,{
  expedition:{...w.expedition,zergSwarm:{...s,nearby:{...s.nearby}}},
 }):w;
 const measureDirect=!!(swarmRank(s,'B07')||swarmRank(s,'W07')||swarmRank(s,'W09'));
 const describe=(u:Entity)=>{
  const shell=s.shells[u.id],power=measureDirect&&u.zergSwarm?enemies.map(e=>swarmDirectFactor(probe,u,e)):[];
  return {id:u.id,type:SC2_UNITS[u.unitType].zh,hero:u.heroId,elite:u.eliteId,rank:u.rank,hp:Math.ceil(u.hp),maxHp:Math.ceil(u.maxHp),
   size:swarmSize(w,u),contact:swarmContactScale(w,u),passes:swarmPasses(w,u),x:u.x,z:u.z,
   damage:u.weaponDamage,deadAt:u.deadAt,bornAt:u.bornAt,swarm:u.zergSwarm,twin:u.swarmHeroTwin,
   attackSpeed:swarmSpeed(w,u,'attack'),moveSpeed:swarmSpeed(w,u,'move'),
   directFactor:Math.max(1,...power),shell,mitigation:s.groupArmor[u.id]?.factor};
 };
 return {time:w.time,phase:w.phase,paused:w.paused,damage:w.stats.damage,kills:w.stats.kills,anchor:{...w.anchor},order:w.order,
  firstHp:first?.hp??0,remaining:ledger[0]?.remaining,quote:productionQuote(w,'roach').seconds,
  delivered:ledger.flatMap(j=>j.passengers).filter(p=>p.status==='released').length,
  tempCap:swarmRank(s,'O03')?90:60,squadCap:w.squadCap(),
  squads:w.expedition.familySlots.map(f=>({family:SC2_UNITS[f].zh,cap:w.familyMemberCap(f as FamilyId),seats:w.familySeatCount(f)})),
  clocks:Object.fromEntries(Object.entries(s.clocks).map(([key,c])=>[key,{due:Math.max(0,c.next-w.time),period:c.period}])),
  batches:s.batches.map(b=>({source:b.source,at:b.at,released:b.released})),
  marks:Object.keys(s.spores).map(Number),tags:Object.keys(s.tags).map(Number),
  reviving:Object.keys(s.revivals).map(Number),echoCount:s.echoCount,heroReady:[...w.heroes].map(([id,h])=>({id,ready:h.skillReady})),
  enemies:enemies.length,friends:friends.length,temps:temps.length,
  units:bodies.filter(u=>u.owner==='terran').map(describe)};
}
