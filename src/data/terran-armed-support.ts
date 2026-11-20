/** R3 + latest polish decisions (V1_4_TERRAN_ARMED_SUPPORT_POLISH_20261111.md); the approved simple-r4 face copy shares parameters with formal executors.
 * Numeric parameters below are the single input for copy and subsequent executors.
 * Source: docs/project/V1_3_TERRAN_ARMED_SUPPORT_CODE_SPEC_20261110.md
 */
export const ARMED_RULES = {
 procChance:{white:.35,green:.3,blue:.25,purple:.2,orange:.15},
  spec: 'R3-20261110', stepHz: 60, maxRank: 3, reserveLimit: 2,
  prices: {W:[50,0],G:[90,20],B:[150,50],P:[225,90],N:[0,0],O:[0,0]},
  ordinaryTemporaryCap:18, eliteTemporaryCap:24, lockAt:3, nodeEvery:3,
  orangeAt:12, orangeClaims:3, orangeLimit:1,
  nuke:{systemCount:[3,4],scorchedCount:[5,8],systemBudget:2400,systemRadius:6,
    manualBudget:6000,manualRadius:8,manualDelay:180,first:15,gap:5,scorchedGap:4,
    ringFactor:.5,blastFactor:.65},
} as const;
export type ArmedCardId = `${'W'|'G'|'B'|'P'|'N'|'O'}${string}`;
type Purchase = 'white-rank'|'rank'|'reserve'|'once'|'node'|'orange';
type Params = Record<string,number|readonly number[]>;
const n=(v:number)=>String(Number(v.toFixed(2)));
const list=(v:readonly number[])=>v.map(n).join('／');
const pct=(v:number)=>n(v*100)+'%';
export const armedSeconds=(ticks:number)=>n(ticks/ARMED_RULES.stepHz);
const span=(v:readonly number[])=>v.join('–');
function define<const I extends ArmedCardId,const P extends Params>(id:I,name:string,purchase:Purchase,params:P,sprite:number,visual:string,brief:string,detail:(p:P)=>string[],effect:string,resources:readonly string[]){
  const prefix=id[0] as keyof typeof ARMED_RULES.prices;
  const quality=({W:'white',G:'green',B:'blue',P:'purple',N:'purple',O:'orange'} as const)[prefix];
  return {id,name,purchase,params,sprite,visual,brief,detail:detail(params),effect,resources,quality,price:ARMED_RULES.prices[prefix]};
}
export const ARMED_CARDS = [
 define('W01','临援仓','white-rank',{cd:15,radius:2.4,damage:[80,110,140],count:3,lifetime:12,ranks:[1,2,3],hpFactor:[1,1.1,1.2],land:12,exit:[18,24,30]},7,
  '落地兵营舱门与三名出舱陆战队员；短时计时环表示临援。',
  "空投临援陆战队员，协助作战。",
  p=>[
  `冷却${p.cd}秒；落地伤害${list(p.damage)}，半径${p.radius}码。`,
  `临援${p.count}人，持续${p.lifetime}秒；军衔I／II／III。`,
  `生命加成${p.hpFactor.map(v=>pct(v-1)).join('／')}。`],
  '先见舱影下降、落地冲击，再开门逐人出舱；三名真实成员各自射击、受伤，到各自服役期撤离，最后一人出舱后收仓。',['model.barracks','model.marine','pod','marine']),
 define('W02','支援仓','white-rank',{cd:20,count:1,ranks:[1,2,3],open:12,exit:24},7,
  '后方兵营舱门与一名陆战队员，使用正式编制徽记。',
  "补充正式士兵，填补队伍空缺。",
  p=>[
  `冷却${p.cd}秒，每次补${p.count}名正式士兵；满编待命。`,
  `军衔I／II／III；按已选兵种和补员顺序派遣。`],
  '本次兵营在队后出现或飞降，营灯亮、开门，一名真实士兵沿可达路线接敌；正式人数增加，出口关门后回收。',['model.barracks','production-families','pod']),
 define('W03','快速增援','white-rank',{timeFactor:[.88,.78,.68],floor:.4,example:10,cd:.25,chance:[.35,.45,.55]},6,
  '兵营订单与缩短的进度弧，不画额外士兵。',
  "训练订单有概率提速，让增援更快到来。",
  p=>[
  `新订单有${p.chance.map(pct).join('／')}概率提速，耗时−${p.timeFactor.map(v=>pct(1-v)).join('／')}；已开工订单不变。`,
  `最多缩短至原工时${pct(p.floor)}；触发后冷却${p.cd}秒。`],
  '并列准备同种新旧订单，原生产进度条按真实 remaining 推进，新单先完工，旧单继续原工时；实际完工才出现载体和成员。',['production-ui','pod']),
 define('W04','炮火轰击','white-rank',{cd:12,length:4,ticks:[6,15,24,33,42],weaponFactor:[.7,.85,1]},9,
  '五个沿窄线向前延伸的架坦爆点。',
  "呼叫坦克炮火，轰击前方敌人。",
  p=>[
  `冷却${p.cd}秒；沿${p.length}码炮线打出${p.ticks.length}发。`,
  `每发为I级架坦主炮的${p.weaponFactor.map(pct).join('／')}，保留溅射与重甲加成。`],
  '五条实际炮迹逐点由前向后落地，每声炮响对应一次真实爆区；敌人移出冻结落点可躲开。',['siege']),
 define('W05','空仓','white-rank',{cd:12,land:12,lifetime:10,hp:[650,950,1350],armor:2,tauntRadius:5,tauntSeconds:3,count:1},2,
  '一座扫灯亮起的空兵营，不画基础乘员。',
  "投下空兵营，吸引敌军火力。",
  p=>[
  `冷却${p.cd}秒；兵营持续${p.lifetime}秒。`,
  `生命${list(p.hp)}；护甲${p.armor}。`,
  `嘲讽${p.tauntRadius}码内普通地面敌人${p.tauntSeconds}秒；基础不出兵。`],
  '兵营砸落，扫灯起，实际受嘲讽敌军改变后续攻击目标；被毁灭灯，到期回收，基础形态不开门出兵。',['model.barracks','pod']),
 define('W06','战地急救箱','white-rank',{cd:10,search:5,land:9,open:15,radius:2.8,count:4,heal:[35,55,80]},4,
  '打开的急救箱和生化生命十字。',
  "投下急救箱，治疗受伤生化部队。",
  p=>[
  `冷却${p.cd}秒；范围${p.radius}码，最多${p.count}人。`,
  `每人恢复${list(p.heal)}生命，优先重伤者。`],
  '箱体落地开盖，治疗连接只指向实际获疗者；生命条按真实恢复量上升，箱体随后消失。',['recovery','authored-props']),
 define('W07','前哨机炮','white-rank',{cd:15,land:12,first:21,lifetime:12,hp:[220,310,420],armor:1,range:6,gap:20,damage:[10,40/3,17.5],count:1},3,
  '展开支腿的对地炮座。',
  "部署临时机炮，掩护地面战斗。",
  p=>[
  `冷却${p.cd}秒；持续${p.lifetime}秒，同时${p.count}座。`,
  `生命${list(p.hp)}；护甲${p.armor}；射程${p.range}。`,
  `每秒${n(ARMED_RULES.stepHz/p.gap)}发，单发${list(p.damage)}；仅对地。`],
  '支腿落定才起枪口和炮声，炮座有独立生命条与射击节拍；到期收腿，死亡或退场停止未来开火。',['model.fort.turret_terran','turret']),
 define('W08','照明弹','white-rank',{cd:10,arrive:8,blast:1.8,damage:[35,55,80],detect:5,lifetime:6},5,
  '高亮照明弹与探测同心环。',
  "照亮前沿，揭露隐形与钻地敌人。",
  p=>[
  `冷却${p.cd}秒；探测半径${p.detect}码，持续${p.lifetime}秒。`,
  `落点伤害${list(p.damage)}，爆区半径${p.blast}码。`],
  '弹迹到点起亮，真实进入探测域的敌军显形后才被索敌；探测环按时淡去，其他探测源仍可维持可见。',['detection','authored-props']),
 define('W09','殿后爆破','white-rank',{move:1.5,cd:18,delay:30,radius:2.5,damage:[90,120,155]},9,
  '撤离箭头后方的定点爆破包。',
  "撤退时留下炸药，阻击追兵。",
  p=>[
  `冷却${p.cd}秒；远离敌人移动${p.move}码后留包。`,
  `${armedSeconds(p.delay)}秒后对地爆炸，伤害${list(p.damage)}，半径${p.radius}码。`],
  '旧位置亮引信，小队继续撤退；延时结束只在旧点爆炸，实际追到爆区的地面敌人受击。',['siege','authored-props']),
 define('G01','蜘蛛雷','rank',{cd:15,count:[6,9,12],detect:4,emerge:.25,speed:6,contact:1.2,radius:2,damage:120},8,
  '复用现有蜘蛛雷卡图。',
  "布设蜘蛛雷，追击靠近的地面敌人。",
  p=>[
  `冷却${p.cd}秒；每次补至${list(p.count)}枚，上限同档位。`,
  `索敌${p.detect}码；伤害${p.damage}，爆区半径${p.radius}码。`],
  '沿用原雷埋地、出土、绕障追逐、接触爆炸与原声；逐枚消耗，不在尸体或残迹上重复爆炸。',['mines']),
 define('G02','地堡','rank',{land:1.5,cd:18,lifetime:15,hp:[1200,1800,2400],armor:2,range:8,period:.5,second:.08,damage:[12,16,20]},13,
  '复用现有地堡卡图，双射孔可见。',
  "空降临时地堡，提供火力掩护。",
  p=>[
  `触发后冷却${p.cd}秒；落地起持续${p.lifetime}秒，同时1座。`,
  `生命${list(p.hp)}；护甲${p.armor}；射程${p.range}。`,
  `每${p.period}秒双枪，单枪${list(p.damage)}。`],
  '地堡空降触地后双射孔交替开火，每枪沿真实目标发声；被毁或退场释放本座碰撞、模型和后续枪次。',['model.fort.bunker','bunker']),
 define('G03','快速补充','once',{cd:30,count:2,rankLoss:1,exit:[21,33]},7,
  '两个返回正式队列的士兵剪影。',
  "补回阵亡的正式士兵，军衔降低。",
  p=>[
  `冷却${p.cd}秒；补最近阵亡的同家族士兵，最多${p.count}人。`,
  `军衔−${p.rankLoss}，最低I级；仅补正式空缺。`],
  '本次增援出口开门，士兵逐人走出，正式人数真实补回；军衔按降档后的真实身份显示，出完关门。',['production-families','pod']),
 define('G04','焦油','once',{cd:18,start:.15,full:.35,length:7,width:3,lifetime:12,damage:16,slow:.3,linger:.5,interval:1},10,
  '一条横拦来路的焦油带。',
  "铺设焦油，灼烧并减缓敌人。",
  p=>[
  `冷却${p.cd}秒；${p.length}×${p.width}码，持续${p.lifetime}秒。`,
  `每秒${p.damage}伤害，减速${pct(p.slow)}；离开${p.linger}秒后解除减速。`],
  '焦油沿来路逐段铺满，敌人进区才减速并按真实伤害刻起灼烧；离区减速解除，地带按自身时钟消退。',['oil','authored-props']),
 define('G05','游骑兵','reserve',{cd:15,count:3,rank:3,arrival:[.15,.3,.45],entryGap:11,chargeSpeed:1.35,contact:.65,blastDamage:90,lifetime:10,burnRadius:2.2,burnTime:4,burnDamage:20},3,
  '三辆恶火从侧翼冲入敌群，引爆车载燃料。',
  "恶火临援冲入敌群自爆，留下燃烧。",
  p=>[
  `冷却${p.cd}秒；${p.count}辆III级恶火，持续${p.lifetime}秒。`,
  `从距地面来敌至少${p.entryGap}码的侧翼进场，冲锋速度+${pct(p.chargeSpeed-1)}。`,
  `近身自爆，伤害${p.blastDamage}、半径${p.burnRadius}码。`,
  `燃烧${p.burnTime}秒，每秒${p.burnDamage}伤害；被击毁或服役到期也引爆，每辆只结算一次。`],
  '三车沿真实可达路线追向敌群，近身自爆；被击毁或服役期结束也只在实际车位引爆一次。命中者继续燃烧，车辆停止作战并退场。',['model.hellion','hellion']),
 define('G06','害虫杀手','once',{cd:16,land:.18,exit:.3,count:3,rank:2,lifetime:12,damage:75,radius:2.5,armorLoss:3,debuff:5},7,
  '打开的小舱与三只我方跳虫；保留跳虫身份。',
  "投下临援跳虫，扑击削弱敌人护甲。",
  p=>[
  `冷却${p.cd}秒；${p.count}只II级跳虫，持续${p.lifetime}秒。`,
  `落地伤害${p.damage}，半径${p.radius}码。`,
  `首次扑击护甲−${p.armorLoss}，持续${p.debuff}秒；不叠加。`],
  '先有真实落仓冲击，门开后三只跳虫分别扑向敌人；首次扑击才挂减甲，使用我方阵营和原跳虫动作与声音。',['model.zergling','pod','zergling']),
 define('G07','跳弹弹链','rank',{cd:.25,chance:[.25,.35,.45],bounces:[2,3,4],factor:.3,range:5,speed:14,minFlight:.12,recent:1},12,
  '复用现有跳弹卡图。',
  "让步兵子弹跳向附近敌人。",
  p=>[
  `限正式陆战队员、劫掠者、死神；英雄除外。`,
  `每轮首击${p.chance.map(pct).join('／')}概率跳弹，最多${list(p.bounces)}次。`,
  `每跳${pct(p.factor)}原命中伤害，跳跃距离${p.range}码；内置冷却${p.cd}秒。`,
  `同链不重复命中；有其他目标时，避开${p.recent}秒内用过的目标对。`],
  '首命中后真实跳弹沿未访问目标逐段飞行，每段到达再受击，原子弹周期不因多段命中重复触发。',['ricochet']),
 define('G08','燃烧弹','rank',{duration:3,factor:[.3,.45,.6],cd:.25,chance:[.25,.35,.45],stacks:3,interval:1},10,
  '复用现有燃烧弹卡图。',
  "让陆战队员的攻击附带燃烧。",
  p=>[
  `命中有${p.chance.map(pct).join('／')}概率燃烧；${p.duration}秒内追加${p.factor.map(pct).join('／')}命中伤害。`,
  `同一来源最多${p.stacks}层；满层刷新；内置冷却${p.cd}秒。`],
  '弹头实际命中才起目标挂火，跳伤与持续火焰跟随同一个活体；熄火时刻和刷新由真实层记录决定。',['mutation']),
 define('G09','抢修无人机','once',{cd:10,count:1,range:8,arrive:.2,interval:.5,healFactor:.04,cap:90,ticks:8},4,
  '无人机接出修理光束，指向机械装甲。',
  "派出无人机，抢修机械与工事。",
  p=>[
  `冷却${p.cd}秒；同时${p.count}架，修理范围${p.range}码。`,
  `每${p.interval}秒恢复${pct(p.healFactor)}最大生命，单次上限${p.cap}，最多${p.ticks}次。`,
  `优先重伤目标；不延长工事寿命。`],
  '无人机靠近实际伤员后接通修理束，每次修复生命条变化才亮脉冲；目标退场断束，不因修理重置工事寿命。',['repair','authored-props']),
 define('B01','死亡弹幕','once',{cd:36,rows:3,tail:1.5,thors:3,pointsPerThor:4,radius:1,first:6,shotGap:2,periodFactor:1.25,groundPeriod:38,groundDamage:53.90625},14,
  '三道雷神火线，各拆成四个落点。',
  "部队开火时呼来雷神弹幕。",
  p=>[
  `冷却${p.cd}秒；接敌开火时自动发动，每轮${p.rows}排。`,
  `每排${p.thors*p.pointsPerThor}发，相当于${p.thors}台V级雷神一轮火力。`,
  `对地排间约${n(p.groundPeriod/ARMED_RULES.stepHz)}秒，每点伤害${n(p.groundDamage)}；可对空。`],
  '每轮三排，每排三路炮迹各四点；本轮结束进入独立冷却，部队继续开火不会无限续射。',['thor']),
 define('B02','困兽夹','once',{cd:18,count:1,arrive:.2,radius:3.5,duration:3,damagePercent:.05,interval:1},5,
  '六根力柱围出一圈捕获区。',
  "困住敌人，持续按生命比例造成伤害。",
  p=>[
  `冷却${p.cd}秒；半径${p.radius}码，同时${p.count}道。`,
  `合围时捕获，禁移${p.duration}秒；每秒造成目标最大生命${pct(p.damagePercent)}的基础伤害，受护甲影响。`,
  `普通敌人与首领同规则；被困者仍可攻击。`],
  '力柱合围，只有合围当刻实际捕获者被锁位，空军也停在自己的高度；枪口继续攻击，时满解锁。',['root','authored-props']),
 define('B03','午时已到','reserve',{cd:20,count:4,rank:3,arrival:[.15,.3],lifetime:14},3,
  '两对死神从侧翼喷射进场。',
  "死神临援从侧翼突入，猎杀后排。",
  p=>[
  `冷却${p.cd}秒；${p.count}名III级死神，持续${p.lifetime}秒。`,
  `优先远程地面敌人。`],
  '两对死神从可达侧翼喷射进入并真实开枪；抽中午夜死神时以原生交替双枪六连射显示，服役结束分别撤离。',['model.reaper','reaper']),
 define('B04','烈焰升腾','once',{cd:20,rows:5,columns:5,first:9,rowGap:21,beatGap:5,last:103,factor:.6},9,
  '五排错位爆点向敌后推进，保留 2＋2＋1 节拍。',
  "呼叫成片坦克炮火，向敌后推进。",
  p=>[
  `冷却${p.cd}秒；${p.rows}轮×${p.columns}发，约${n(p.last/ARMED_RULES.stepHz)}秒打完。`,
  `每发为V级架坦主炮的${pct(p.factor)}，保留溅射与重甲加成。`],
  '外侧两炮、内侧两炮、中线一炮依次命中，五排向敌后推进；每排第五发落地后才连接已命中扬尘，不追加伤害。',['siege']),
 define('B05','增援以至','once',{cd:25,camps:2,perCamp:3,land:[12,21],exit:[12,27,42],campLife:8,formalRank:2,tempRank:3,tempLife:16},7,
  '前后错落的两座兵营及六条出兵动线。',
  "派出援兵补员，满编部分转为临援。",
  p=>[
  `冷却${p.cd}秒；${p.camps}座兵营各派${p.perCamp}人，营体持续${p.campLife}秒。`,
  `优先补II级正式士兵；其余为III级临援，持续${p.tempLife}秒。`,
  `按已选兵种派遣；兵营被毁，停止出兵。`],
  '两营分先后触地、各开三次出口，六名真实成员按实际出口次序分配正式／临援身份；营体先退，已入队临援继续服役。',['model.barracks','production-families','pod']),
 define('B06','呼叫舰队','reserve',{cd:25,vikings:2,vikingRank:4,cruisers:1,cruiserRank:3,vikingArrival:[.15,.3],cruiserArrival:.6,lifetime:16},3,
  '两架维京护送一艘已核实原版普通战列巡洋舰。',
  "呼叫舰队临援，清除空中威胁。",
  p=>[
  `冷却${p.cd}秒；仅在发现敌空军时派遣。`,
  `${p.vikings}架IV级维京、${p.cruisers}艘III级普通战巡，持续${p.lifetime}秒。`],
  '维京从两翼先到、普通战巡随后抵达；实际原武器先清空中威胁，舰机分别承伤、退场和停止循环声。',['model.viking','model.battlecruiser','viking','battlecruiser']),
 define('B07','导弹齐射','rank',{firstReady:3,cd:15,range:14,count:[4,6,8],damage:60,radius:1.2,gap:.2,flight:.6},14,
  '复用现有导弹齐射卡图。',
  "发射集束导弹，轰击附近敌人。",
  p=>[
  `冷却${p.cd}秒；首购${p.firstReady}秒后就绪。`,
  `每轮${list(p.count)}枚，单枚${p.damage}伤害、半径${p.radius}码。`,
  `索敌${p.range}码；锁定落点后不追踪。`],
  '沿用真实发射、飞行与锁点命中；多目标依次分派，每枚到点才响爆，恢复不重播已发生的发射。',['missiles']),
 define('B08','攻城空投','once',{cd:25,sling:.25,land:.4,count:1,rank:4,lifetime:18,minRange:2,maxRange:13},9,
  '吊索下放一辆已架起的普通攻城坦克。',
  "空投临援架坦，驻守阵地。",
  p=>[
  `冷却${p.cd}秒；${p.count}辆IV级架坦，持续${p.lifetime}秒，射程${p.minRange}–${p.maxRange}码。`,
  `固定炮位，保留原溅射；无法攻击贴身目标。`],
  '先吊索下降再支架落定，实际就绪才开炮，近身敌人不会触发越界射击；坦克死亡或期满单独退场。',['model.tank.siege','model.medivac','siege']),
 define('B09','火力超载','rank',{cd:60,duration:8,damage:[.3,.45,.6],rate:[.2,.3,.4],speed:.15},15,
  '复用现有主动超载卡图。',
  "开启火力超载，强化部队进攻。",
  p=>[
  `冷却${p.cd}秒；持续${p.duration}秒。`,
  `伤害+${p.damage.map(pct).join('／')}；攻速+${p.rate.map(pct).join('／')}。`,
  `移速+${pct(p.speed)}。`],
  '原主动图标真实进入冷却，成员用实际更快的武器／移动节拍行动；到期恢复原属性，不添加假命中。',['overdrive']),
 define('P01','战术核弹','once',{cd:28,manualFactor:1.25},11,
  '单个核弹发射装置与多点核爆；不画库存赠弹符号。',
  "自动发动核击，并强化手动核弹。",
  p=>[
  `自动：冷却${p.cd}秒，每轮${span(ARMED_RULES.nuke.systemCount)}发，总伤害${ARMED_RULES.nuke.systemBudget}。`,
  `单发爆区${n(ARMED_RULES.nuke.systemRadius*ARMED_RULES.nuke.blastFactor)}码，最远覆盖${n(ARMED_RULES.nuke.systemRadius*(ARMED_RULES.nuke.ringFactor+ARMED_RULES.nuke.blastFactor))}码。`,
  `手动：消耗1枚，${armedSeconds(ARMED_RULES.nuke.manualDelay)}秒后命中；伤害与半径+${pct(p.manualFactor-1)}。`],
  '系统按真实子弹次序起核爆，不伪装成一发大核弹；手动保留瞄准与前摇，发射声按轮、命中声按弹。',['nuke']),
 define('P02','泰坦降临','once',{cd:35,land:15,count:3,rank:5,lifetime:22,weapon:1.2,armor:6,tauntRadius:5,taunt:4},3,
  '雷霆支点、天罚炮台、末日过载并排触地。',
  "精英雷神临援空降，吸引火力并推进。",
  p=>[
  `冷却${p.cd}秒；V级雷霆支点、天罚炮台、末日过载各1台，持续${p.lifetime}秒。`,
  `武器伤害+${pct(p.weapon-1)}，护甲+${p.armor}。`,
  `落地嘲讽${p.tauntRadius}码内普通敌人${p.taunt}秒。`],
  '三具正确精英实体同时触地，三圈真实嘲讽引敌，分别展开原武器；每台受击、死亡和撤离可单独辨认。',['elite-thors','thor']),
 define('P03','生化焦油','once',{cd:25,count:5,attach:.15,oil:.3,attachLife:6,attachDamage:24,armorLoss:4,slow:.35,weaponLoss:.25,radius:2.2,oilLife:12,oilDamage:20},10,
  '敌人身上的毒油与留在地面的油斑并列。',
  "用毒油削弱敌人，留下灼烧地带。",
  p=>[
  `冷却${p.cd}秒；最多附着${p.count}人，持续${p.attachLife}秒，每秒${p.attachDamage}伤害。`,
  `护甲−${p.armorLoss}，移速−${pct(p.slow)}，武器伤害−${pct(p.weaponLoss)}。`,
  `油斑半径${p.radius}码，持续${p.oilLife}秒，每秒${p.oilDamage}伤害；重叠油斑不叠伤。`],
  '附身油随目标移动，地面油留在真实落油坐标；目标离开地带后仍保留尚未到期的附身，两个来源分开结束。',['oil','authored-props']),
 define('P04','光盾信标','once',{cd:25,arrive:.2,hp:900,armor:2,lifetime:8,radius:7,shield:.35,min:300,max:1200,duration:8},1,
  '一座信标向友军授出独立盾面。',
  "部署信标，为附近友军授予护盾。",
  p=>[
  `冷却${p.cd}秒；信标持续${p.lifetime}秒，生命${p.hp}、护甲${p.armor}。`,
  `为${p.radius}码内战斗成员授予${pct(p.shield)}最大生命护盾，最低${p.min}、最高${p.max}。`,
  `护盾持续${p.duration}秒；离圈保留余盾。`],
  '信标到场才授盾，来弹侧按实际吸收量亮盾波，盾量耗尽才破盾；信标回收后尚有效的随身盾继续保留。',['shield','authored-props']),
 define('P05','堡垒空降','once',{cd:30,count:4,land:[12,22,32,41],lifetime:20,hp:1100,armor:3,collision:1.3,radius:4,auraArmor:3,rate:.15,linger:.5},2,
  '四座升起的原版补给站装甲设备组成防线；青色光环表示增益，无枪口。',
  "空投装甲设备，阻敌并强化附近友军。",
  p=>[
  `冷却${p.cd}秒；${p.count}座堡垒持续${p.lifetime}秒，生命${p.hp}、护甲${p.armor}。`,
  `${p.radius}码内护甲+${p.auraArmor}、攻速+${pct(p.rate)}；重叠不加倍。`,
  `离开${p.linger}秒后失效；堡垒不自带武器或驻军。`],
  '四座原版补给站装甲设备逐座触地后才阻挡和供益，窄地改折线并留可达通口；单座被毁后该处真实打开，光环按余下实体重算。',['model.fort.supply_depot','model.fort.supply_depot.death']),
 define('P06','阻隔区','once',{cd:25,width:7,length:5,rows:6,columns:4,first:9,rowGap:12,last:69,radius:1.4,damage:41.25,stop:.4,stopGap:1},9,
  '六排四点的封锁弹幕覆盖来敌路线。',
  "用炮火封锁来路，打断敌人推进。",
  p=>[
  `冷却${p.cd}秒；${p.width}×${p.length}码区域，${p.rows}排×${p.columns}发。`,
  `每发${p.damage}伤害，爆区半径${p.radius}码。`,
  `普通地面敌人停步${p.stop}秒；同一目标间隔${p.stopGap}秒。`],
  '普通镜头看见四点一排、六排推进，每点真实命中才使敌人停步；未落弹区域仍能正常通过。',['siege']),
 define('N01','密集火力','node',{damage:1.15,speed:1.35,radius:1.2,podRadius:1.4,push:1,reserveDamage:1.1},9,
  '以炮火轰击主图为中心，连出增幅支路；不是新增炮兵实体。',
  "强化炮火，让打击更密集、范围更广。",
  p=>[
  `指定炮火伤害+${pct(p.damage-1)}、发射速度×${p.speed}、爆区半径+${pct(p.radius-1)}。`,
  `强化临援仓、炮火轰击、死亡弹幕、烈焰升腾、导弹齐射、系统核击、阻隔区。`,
  `临援仓半径改为+${pct(p.podRadius-1)}，击退${p.push}码；不增加弹数，不强化手动核弹或绝境反攻。`,
  `复选：下次合格火力伤害再+${pct(p.reserveDamage-1)}。`],
  '对照同种子 W01＋B04：冲击真实推敌，五排仍各五发但更密、更宽；第五发命中才连接尘浪，末爆从 103 步提前至 81 步。',['siege','pod']),
 define('N02','源源不断','node',{cdFactor:.8,rank:1,maxRank:5,extra:1,overflowLife:16,first:1.5,interval:6,randomRank:1,randomLife:16,reserveExtra:1},7,
  '两道真实营门同时出兵，连线节点标识。',
  "增援提速增员，兵营持续派出临援。",
  p=>[
  `临援仓、支援仓、快速补充、游骑兵、害虫杀手、午时已到、增援以至、呼叫舰队：`,
  `派遣冷却−${pct(1-p.cdFactor)}，军衔+${p.rank}（最高V），每批+${p.extra}人；正式满编时，额外人转${p.overflowLife}秒临援。`,
  `在场兵营与支援地堡：落地${p.first}秒后、每${p.interval}秒派1名I级随机步兵临援，持续${p.randomLife}秒。投送结束或建筑退场即停止。`,
  `复选：下一批再+${p.reserveExtra}名临援。`],
  '对照 W01＋实际在场 G02/B05：每扇门按自身落地钟开闸，第一次 1.5 秒、下一次 7.5 秒；某营 8 秒退场后不再开门。',['pod','bunker','production-families']),
 define('N03','精英武装','node',{from:18,to:24,chance:.25,reserveChance:1},3,
  '普通死神与午夜死神并列，以身份轮廓表示晋精。',
  "援兵有机会成为精英，可容纳更多临援。",
  p=>[
  `临援上限${p.from}→${p.to}。`,
  `正式补员与临援有${pct(p.chance)}概率成为本家族可用精英，军衔与服役期限不变。`,
  `复选：下一名合格普通援兵必为精英。`],
  '对照同一批四名死神，固定第二名抽中午夜死神：其原生双枪六连射，与另三人的原枪次直接比较；没有抽中的种子不显示假精英。',['reaper','prepared-elites']),
 define('N04','特制道具','node',{mineDetect:5.5,mineRadius:2.5,trapRadius:4.5,root:4,shield:1.35,taunt:6.5,healCount:6,reserveRadius:1.2},5,
  '夹具、盾与急救箱三个实物相连，不改品质色。',
  "强化地雷、夹具、护盾和急救道具。",
  p=>[
  `蜘蛛雷：索敌${p.mineDetect}码，爆区半径${p.mineRadius}码。`,
  `困兽夹：半径${p.trapRadius}码，禁移${p.root}秒。`,
  `光盾信标：盾量+${pct(p.shield-1)}。空仓：嘲讽半径${p.taunt}码。急救箱：最多${p.healCount}人。`,
  `复选：下次道具半径再+${pct(p.reserveRadius-1)}。`],
  '对照困兽夹＋信标：4 码处敌人只在节点组被抓；1000 生命者两次各承伤 200 后，节点组仍满血、余盾 72.5，盾耗尽才破。',['mines','root','shield','recovery']),
 define('N05','焦土战略','node',{damage:1.6,radius:1.3,ammo:1,reserveDamage:1.1},11,
  '多点核弹齐射环与一格真实库存符号相连。',
  "核击改为瞬爆齐射，自动核击额外补弹。",
  p=>[
  `每轮${span(ARMED_RULES.nuke.scorchedCount)}发，立即命中；伤害+${pct(p.damage-1)}，半径+${pct(p.radius-1)}。`,
  `系统每轮赠${p.ammo}枚库存；手动耗${p.ammo}枚打一整轮，不赠弹。`,
  `需要战术核弹或绝境反攻。`,
  `复选：下一轮核伤再+${pct(p.reserveDamage-1)}。`],
  '对照 P01 与 P01＋N05：第一处按真实子弹命中起爆，提交时库存 0→1；手动指向第二处后库存 1→0，双轮各自有弹序与核爆，最多第 28 步落完。',['nuke']),
 define('N06','落点协同','node',{front:2.5,suppress:.6,cd:10},9,
  '炮线先到舱门前，再连接出兵箭头。',
  "先用炮火压制落点，掩护援兵入场。",
  p=>[
  `运输＋炮火同时就绪：首排改打落点前${p.front}码守军，命中压制${p.suppress}秒。冷却${p.cd}秒。`,
  `运输：临援仓／增援以至／泰坦降临。`,
  `炮火：炮火轰击／烈焰升腾／导弹齐射。`,
  `不增加炮弹；复选可提前协同一次。`],
  '同种子 W01＋W04 中先见门前真实炮击、守军暂停起枪，再见触地开仓与三人出舱；原在途敌弹照常飞来。',['siege','missiles','pod']),
 define('N07','阵地观察哨','node',{mark:2,behind:3,cd:6},13,
  '地堡枪线越过前排，连接后方射手。',
  "前沿报点，引导炮火打击后排。",
  p=>[
  `蜘蛛雷、地堡或空仓取得来向后，标记${p.mark}秒。`,
  `炮火轰击／死亡弹幕／烈焰升腾下一排，转打来向后方${p.behind}码内可见远程敌人。`,
  `冷却${p.cd}秒；不提供探测。复选可提前校射一次。`],
  '同种子 G02＋B01：地堡双枪之后短扫线越过前排，十二个真实弹点转落后排；不增加枪次、弹数或视野。',['bunker','thor','siege']),
 define('N08','封锁火网','node',{oilWidth:3.75,radiusFactor:1.25,burnRadius:2.75,cd:14},10,
  '夹具出口连到横切的燃烧带。',
  "把火网铺在出口，继续灼烧脱困敌人。",
  p=>[
  `困兽夹／空仓控制敌人时，联动焦油／生化焦油／游骑兵封出口。`,
  `焦油宽${p.oilWidth}码；油斑半径+${pct(p.radiusFactor-1)}；恶火退场挂火半径${p.burnRadius}码。`,
  `冷却${p.cd}秒；复选可提前封路一次。`],
  '同种子 B02＋G05：三车在原服役末段横切真实出口再退场，夹口打开后敌人带火离开；车声结束，目标挂燃按自己的剩余时间持续。',['root','oil','hellion']),
 define('N09','交班驻防','node',{radius:4,count:2,taunt:1.2,withdraw:3,reduction:.2,duration:2,cd:8},13,
  '两名新兵前接火线，两名伤兵从工事两侧回撤。',
  "新兵接过火线，掩护伤兵回撤。",
  p=>[
  `支援仓／快速补充／增援以至的援兵进入在场地堡／堡垒${p.radius}码内触发，每批最多${p.count}人。`,
  `新兵引敌${p.taunt}秒；老兵后撤最多${p.withdraw}码，减伤${pct(p.reduction)}、持续${p.duration}秒。`,
  `冷却${p.cd}秒；复选可提前交班一次。`],
  '同种子 G03＋G02：新兵接敌后，老兵保留原伤条沿可达路径退后；后续枪口换目标，在途 100 点仍中老兵但减为 80，地堡照原节拍掩护。',['pod','bunker','production-families']),
 define('O01','绝境反攻','orange',{deaths:10,invulnerable:3,cd:240,cache:1,tankTick:15,tankCount:5,tankFactor:.6,finishTick:36,refill:10,shield:1,shieldMin:1500,shieldLife:12,heroLife:120,heroRank:5},11,
  '核击、坦克炮、雷神弹幕后方是一名救场英雄。',
  "正式部队伤亡惨重时，发动整套救援。",
  p=>[
  `累计${p.deaths}名正式士兵阵亡触发：全队无敌${p.invulnerable}秒，核弹、坦克炮与雷神弹幕清场。`,
  `补回最多${p.refill}名同家族同军衔正式士兵。`,
  `全队护盾＝${pct(p.shield)}最大生命、最低${p.shieldMin}，持续${p.shieldLife}秒；V级英雄临援${p.heroLife}秒。`,
  `整套冷却${p.cd}秒，期间最多再存一组${p.deaths}人战损；临援不计数。`],
  '第十次正式死亡当步先亮无敌，按 0／15／36 步兑现核击、五发炮和雷神清场；同家族补员实际到队、盾面授出、正确临时英雄入场，分别按寿命退去。',['nuke','siege','thor','prepared-hero','production-families']),
 define('O02','轨道远征军','orange',{cd:45,shots:[6,9,12,15],damage:70,radius:2,thorTick:15,tankTime:4,cruiserTime:8,thorLife:24,tankLife:22,cruiserLife:24,window:24},3,
  '三台精英雷神、豹石与虎式、普通战巡构成六员推进队。',
  "重装远征军临援入场，协同推进。",
  p=>[
  `冷却${p.cd}秒；全员V级，开路炮${p.shots.length}发×${p.damage}伤害。`,
  `${armedSeconds(p.thorTick)}秒：雷霆支点、天罚炮台、末日过载，持续${p.thorLife}秒。`,
  `${p.tankTime}秒：豹石、虎式，持续${p.tankLife}秒。`,
  `${p.cruiserTime}秒：普通战巡，持续${p.cruiserLife}秒。`,
  `雷神同泰坦降临强化；协同推进${p.window}秒。`],
  '四发真实开路炮之后三台雷神触地，双车到场各走原武器和模式，最后普通战巡入场截空；六员有真实开火、受击与独立撤离。',['elite-thors','elite-tanks','model.battlecruiser','battlecruiser','thor','siege']),
 define('O03','行星要塞空投','orange',{holdRadius:3,holdTime:2,cd:45,land:.35,lifetime:30,hp:12000,armor:12,range:10,gap:45,damage:90,chargeHp:1500,charges:2,pierceCd:3,length:12,width:2.4,pierceDamage:640,sweepTime:2,sweepGap:.25,sweepAngle:.36,marines:3,rank:3,marineLife:12,leaveRadius:6},2,
  '原版行星要塞 A 形态的双炮与侧门。',
  "空投临时要塞，蓄炮并派出临援。",
  p=>[
  `在${p.holdRadius}码阵地接敌${p.holdTime}秒触发；冷却${p.cd}秒，要塞持续${p.lifetime}秒。`,
  `生命${p.hp}；护甲${p.armor}；射程${p.range}；每${armedSeconds(p.gap)}秒伤害${p.damage}。`,
  `每损失${p.chargeHp}生命蓄1炮，最多${p.charges}发，间隔至少${p.pierceCd}秒。扫射${p.sweepTime}秒，贯穿${p.length}×${p.width}码；每${p.sweepGap}秒结算一次，总基础伤害${p.pierceDamage}。`,
  `每炮派${p.marines}名III级陆战队临援，持续${p.marineLife}秒；离阵${p.leaveRadius}码另派一次${p.marines}人殿后。`],
  '要塞真实触地后才阻挡／开炮；实际累计掉血 1499＋1 才蓄出一发，炮口贯穿线与侧门三人同属该发回执；离阵只开一次殿后门，到期收回本座与余能。',['planetary','marine']),
] as const;

export type ArmedCard = typeof ARMED_CARDS[number];
export const ARMED_CARD_BY_ID=Object.fromEntries(ARMED_CARDS.map(c=>[c.id,c])) as {[C in ArmedCard as C['id']]:C};
/** Direct links explicitly named by R3; unknown eligibility is not invented. */
export const ARMED_NODE_LINKS:Readonly<Record<string,readonly string[]>>={
 W01:['N01','N02','N03','N06'],W02:['N02','N03','N09'],W04:['N01','N06','N07'],
 W05:['N02','N04','N07','N08'],W06:['N04'],G01:['N04','N07'],G02:['N02','N07','N09'],
 G03:['N02','N03','N09'],G04:['N08'],G05:['N02','N03','N08'],G06:['N02','N03'],
 B01:['N01','N07'],B02:['N04','N08'],B03:['N02','N03'],B04:['N01','N06','N07'],
 B05:['N02','N03','N06','N09'],B06:['N02','N03'],B07:['N01','N06'],B08:['N03'],
 P01:['N01','N05'],P02:['N06'],P03:['N08'],P04:['N04'],P05:['N09'],P06:['N01'],O01:['N05'],
};
export function armedPurchaseCopy(c:ArmedCard):string {
 switch(c.purchase){
 case 'white-rank':case 'rank':return `复购升档，最高${ARMED_RULES.maxRank}档。`;
 case 'reserve':return `复购储备1次派遣，最多${ARMED_RULES.reserveLimit}次；前批退场后可用。`;
 case 'once':return '';
 case 'node':return '';
 case 'orange':return `本局限选${ARMED_RULES.orangeLimit}张。`;
 }
}
export function armedDetail(c:ArmedCard):string {
 const lines=c.purchase==='node'?c.detail.map((line,i)=>i===c.detail.length-1?line.replace(/。$/,'')+`（最多储备${ARMED_RULES.reserveLimit}次）。`:line):[...c.detail,armedPurchaseCopy(c)];
 const probability=c.purchase==='node'||['W03','G07','G08'].includes(c.id)?'':`对应事件发生时有${pct(ARMED_RULES.procChance[c.quality])}概率触发，成功后进入冷却；冷却结束不自动施放。`;
 return [c.brief,probability,...lines].filter(Boolean).join('\n');
}
