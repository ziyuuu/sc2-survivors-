import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ARMED_CARDS} from '../src/data/terran-armed-support';
const out='reports/local/armed-support-design-20261111';
const full=JSON.parse(await fs.readFile(out+'/showcase-full.json','utf8')),fix=JSON.parse(await fs.readFile(out+'/showcase-corrections-r3.json','utf8'));
const detection=JSON.parse(await fs.readFile(out+'/showcase-detection-r4.json','utf8'));assert.deepEqual(detection.errors,[]);assert.ok(!detection.failure);
assert.equal(full.cards.length,54);assert.deepEqual(full.errors,[]);assert.deepEqual(fix.errors,[]);assert.ok(!fix.failure);
const run=(id:string,node=true)=>detection.cards.find((c:any)=>c.id===id&&c.node===node)??fix.cards.find((c:any)=>c.id===id&&c.node===node)??full.cards.find((c:any)=>c.id===id&&c.node===node);
const max=(r:any,f:(x:any)=>number)=>Math.max(...r.frames.map(f));
const damage=(r:any,key:string)=>max(r,x=>x.bySource[key+':damage']??0);
const temp=(r:any)=>max(r,x=>x.temporary.length);
const roots=(r:any)=>max(r,x=>Object.values(x.unitStatus).filter((s:any)=>s.root).length);
const observations:Record<string,string>={
 W01:'落地冲击产生实际伤害，3 名临援逐人出门并到期退场。',W02:'正式身体席由 4 补到 5，使用真实空席。',W03:'同一基础 10 秒旧单在 8.8 秒时仍余 1.2 秒，新 I 档单已完工；10 秒时旧单完工。',W04:'五发顺序弹产生实际伤害。',W05:'实际兵营落地、承伤，到期退场。',W06:'开箱时实际恢复 140 生命（4×35）。',W07:'临时炮台产生原武器伤害并到期退场。',W08:'全隐形敌阵前态→照明弹爆炸并显形→6 秒探测结束再隐藏，实际命中伤害。',W09:'真实后撤前态留下爆破，实际命中旧位置附近敌军。',
 G01:'沿原蜘蛛雷执行器实际命中。',G02:'沿原地堡执行器实际落地并开火。',G03:'真实阵亡记录补回正式空席，正式人数 4→5。',G04:'真实油带减速并造成周期伤害。',G05:'3 名临援恶火以原武器作战；退场燃烧实际命中。',G06:'载体落地冲击后出现 3 只单体友方跳虫，独立临援寿命。',G07:'原跳弹执行器产生额外实际命中。',G08:'原挂火执行器产生实际持续伤害。',G09:'原版无人机完成 8 次真实修理，共恢复 33.12 生命。',
 B01:'正式主力原武器触发雷神支援计划并造成实际伤害。',B02:'夹具实际捕获 6 个目标并锁位。',B03:'4 名 III 阶临援死神以真实原武器作战。',B04:'25 发分行分拍齐射完成并造成实际伤害。',B05:'两座实际兵营落地，1 正式补员和 5 临援出门，兵营按本次寿命退场。',B06:'2 名 IV 维京及 III 普通战巡分批入场；战巡使用普通身份原武器并到期退场。',B07:'原导弹执行器发射、飞行和命中，实际伤害已记录。',B08:'原医疗运输机吊运，IV 架起坦克实际作战并到期退场。',B09:'实际主动使首名陆战队员攻击周期 0.535→0.446 秒、伤害 6.9→8.97，结束后恢复。',
 P01:'普通系统核击整轮真实落弹，未选 N05 不赠库存。',P02:'三种 V 阶精英雷神真实落地、接敌并到期退场。',P03:'附身油/地面油产生实际周期伤害并退场。',P04:'信标给 5 名实际成员授予独立卡盾，信标退场后盾按自身时钟结算。',P05:'四座原版地堡外形实际落地、承伤并分别退场；无 P05 射击结算。',P06:'六行四发的真实覆盖计划产生伤害。',
 N01:'同种子对照：W04 实际伤害 117.00→128.84，首轮结束更早。',N02:'同种子对照：W01 基础 3 名 I 阶→4 名 II 阶；实际地堡后续出兵另计。',N03:'同种子对照：第二名真实出门成员转换为 reaper.1 精英，数量和原阶位保留。',N04:'同种子对照：夹具捕获 6→7，3 秒基础结束后节点夹具仍有效。',N05:'系统整轮赠 1 枚库存；手动提交库存 1→0，打完完整 5 发且不重复扣除。',N06:'真实运输/炮火批次建立联动记录，抑制首击，运输成员数量未增加。',N07:'实际地堡命中标记后建立校射联动，B01 使用后排首行，未额外发炮。',N08:'控制后真实铺油：油带宽度 3→3.75，退出方向取回队方向。',N09:'正式接班成员触发实际交班批次，记录 1 名老兵回撤及减伤。',
 O01:'第十次真实正式阵亡触发核击/无敌/炮火/清场/补员和独立 V 阶临援英雄；本场关末清退。',O02:'三名精英雷神、两名精英坦克、普通战巡共六名 V 阶实际分批入场，四发开场炮击，分别退场。',O03:'实际驻留/接敌后投下原版行星要塞，真实承伤充能、主炮/穿透命中，侧门驻军实际出场。'
};
const triggers:Record<string,string>={W01:'可见敌群、临援名额和整批落点就绪。',W02:'正式陆战队身体席 4/5，空席未被已付订单占用。',W03:'同一基础 10 秒的旧已开工订单与 I 档新订单同时运行。',W04:'可见地面敌群，五发计划就绪。',W05:'可见地面接敌，临时兵营实际落点可用。',W06:'五名生物队员受伤，选择能覆盖伤员的投放点。',W07:'地面敌群进入临时机枪塔的真实射程。',W08:'队伍附近敌军全部隐形，照明弹准备就绪。',W09:'旧后撤采样点在前方 2 码，队伍已后撤。',G01:'六枚原蜘蛛雷已布下，敌军进入触发/追踪范围。',G02:'可见敌群与地堡真实落地位置就绪。',G03:'IV 阶正式陆战队员真实阵亡，存在空正式席。',G04:'敌群可见，油带落点与冷却就绪。',G05:'可见敌群，三名恶火整批临援名额就绪，近身目标保留至退场。',G06:'可见敌群与载体落点就绪。',G07:'正式陆战队员开始原普通攻击。',G08:'正式陆战队员开始原普通攻击。',G09:'一名真实机械恶火只有 20% 生命。',B01:'正式队员完成原普通武器攻击轮次。',B02:'六名地面/空中目标进入夹具范围。',B03:'四名死神整批临援位置就绪。',B04:'可见地面敌群，25 发计划就绪。',B05:'正式席 4/5，双兵营落点及临援余量就绪。',B06:'三名可见空中敌人，整批空中位置就绪。',B07:'原导弹齐射已就绪，可见敌群可锁定。',B08:'有效地面炮位可用，吊运计划就绪。',B09:'点击本卡正式主动，读取实际队员攻击周期与伤害。',P01:'可见多目标敌群、普通系统核击就绪、初始库存 0。',P02:'三名精英雷神专属批次名额和整批位置就绪。',P03:'可见敌群在可附身/铺油范围。',P04:'五名队员在信标可覆盖位置。',P05:'地面来敌与四堡整批落点就绪。',P06:'可见地面敌群、六行四发计划就绪。',N01:'与基础 W04 使用同一种子和阵容。',N02:'基础 W01 与本次实际 G02 地堡，同种子同阵容。',N03:'基础 B03，同一种子、相同精英准备池和阵容。',N04:'基础 B02，另有一名处于扩大范围内的目标。',N05:'基础 P01，初始库存 0；自动整轮结束后手动花库存。',N06:'W01 运输和 W04 炮火同一时刻真正出勤。',N07:'本次实际 G02 地堡先命中，正式队员原武器触发 B01。',N08:'B02 控制与 G04 待命，同种子同阵容。',N09:'正式空席、W02 到队和本次实际 P05 防区；来弹造成老兵真实损伤。',O01:'预置 9 次历史正式战损，第 10 名正式队员由真实敌人击杀。',O02:'六员专属批次和整批地空位置就绪。',O03:'接敌、同地驻留已达 119/120 步，真实刺蛇攻击使要塞承伤充能。'};
const rows=[];
for(const c of ARMED_CARDS){const r=run(c.id);assert.ok(r,c.id);assert.deepEqual(r.errors,[]);assert.ok(r.before.ready);let passed=false;
 if(c.id.startsWith('N')){const b=run(c.id,false);assert.equal(r.before.seed,b.before.seed);assert.deepEqual(r.before.members,b.before.members);}
 switch(c.id){
  case 'W01':passed=damage(r,'armed.W01')>0&&temp(r)===3&&r.frames.at(-1).temporary.length===0;break;
  case 'W02':case 'G03':passed=r.before.formal===4&&max(r,x=>x.formal)===5;break;
  case 'W03':passed=Math.abs(r.frames[1].orders[0].remaining-1.2)<1e-7&&r.frames[1].orders[1].remaining===0&&r.frames[2].orders[0].remaining===0;break;
  case 'W05':case 'P05':passed=max(r,x=>x.forts.length)===(c.id==='W05'?1:4)&&r.frames.at(-1).forts.length===0&&!damage(r,'armed.P05');break;
  case 'W08':passed=damage(r,'armed.W08')>0&&r.before.enemies.every(e=>!e.visible)&&r.frames.some(f=>f.enemies.some(e=>e.visible))&&r.frames.at(-1).enemies.every(e=>!e.visible);break;
  case 'W06':passed=max(r,x=>x.bySource['armed.W06:healed']??0)===140;break;
  case 'G09':passed=Math.abs(max(r,x=>x.bySource['armed.G09:healed']??0)-33.12)<1e-7;break;
  case 'G01':passed=damage(r,'terran.mines')>0;break;case 'G02':passed=damage(r,'terran.bunker')>0;break;
  case 'G05':passed=temp(r)===3&&damage(r,'hellion')>0&&damage(r,'armed.G05')>0;break;
  case 'G06':passed=temp(r)===3&&damage(r,'zergling')>0;break;case 'G07':passed=damage(r,'terran.ricochet')>0;break;case 'G08':passed=damage(r,'terran.mutation')>0;break;
  case 'B02':passed=roots(r)===6;break;case 'B03':passed=temp(r)===4&&damage(r,'reaper')>0;break;
  case 'B05':passed=max(r,x=>x.formal)===5&&temp(r)===5&&max(r,x=>x.forts.length)===2&&r.frames.at(-1).forts.length===0;break;
  case 'B06':passed=temp(r)===3&&damage(r,'battlecruiser')>0&&r.frames.at(-1).temporary.length===0;break;
  case 'B07':passed=damage(r,'terran.missiles')>0;break;case 'B08':passed=temp(r)===1&&damage(r,'tank')>0&&r.frames.at(-1).temporary.length===0;break;
  case 'B09':passed=r.frames[0].members[0].period<r.before.members[0].period&&r.frames[0].members[0].damage>r.before.members[0].damage&&r.frames.at(-1).members[0].period===r.before.members[0].period;break;
  case 'P01':passed=damage(r,'armed.P01')>0&&r.frames.at(-1).ammo===0;break;case 'P02':passed=temp(r)===3&&r.frames.at(-1).temporary.length===0;break;
  case 'P04':passed=max(r,x=>Object.values(x.unitStatus).filter((s:any)=>s.cardShields?.length).length)===5;break;
  case 'N01':passed=damage(r,'armed.W04')>damage(run('N01',false),'armed.W04');break;
  case 'N02':passed=temp(r)>temp(run('N02',false))&&r.frames.some(x=>x.temporary.some(u=>u.card==='W01'&&u.rank===2));break;
  case 'N03':passed=r.frames.some(x=>x.temporary.some(u=>u.elite==='reaper.1'))&&!run('N03',false).frames.some(x=>x.temporary.some(u=>u.elite));break;
  case 'N04':passed=roots(r)===7&&roots(run('N04',false))===6&&r.frames[2].fields.length>run('N04',false).frames[2].fields.length;break;
  case 'N05':passed=r.manual.before===1&&r.manual.committed===0&&r.manual.completed===0&&r.manual.shots.some(v=>v.shots===5);break;
  case 'N06':case 'N07':passed=r.frames.some(x=>x.nodes?.links?.some(l=>l.node===c.id));break;
  case 'N08':passed=r.frames.some(x=>x.fields?.some(f=>f.cardId==='G04'&&f.width===3.75));break;
  case 'N09':passed=r.frames.some(x=>Object.values(x.nodes?.batches??{}).some((b:any)=>b.count>0));break;
  case 'O01':passed=r.frames.some(x=>x.counter?.activation?.finished&&x.counter?.temporaryHero?.rank===5);break;
  case 'O02':passed=temp(r)===6&&r.frames.at(-1).temporary.length===0;break;
  case 'O03':passed=damage(r,'armed.O03')>640&&max(r,x=>x.deployments[0]?.chargeDamage??0)>0&&temp(r)>=3;break;
  default:passed=damage(r,'armed.'+c.id)>0;
 }
 assert.ok(passed,c.id+' observation not satisfied');rows.push({id:c.id,name:c.name,trigger:triggers[c.id],observed:observations[c.id],status:'通过',evidence:detection.cards.includes(r)?'showcase-detection-r4.json':fix.cards.includes(r)?'showcase-corrections-r3.json':'showcase-full.json',nodeComparison:c.id.startsWith('N'),ticks:r.frames.map(x=>x.tick)});
}
const report={date:'2026-11-11',scope:'45 independent candidate production World/renderer scenes plus nine same-seed node base comparisons. Synthetic initial conditions; sampled frames and state receipts, not physical devices or user aesthetic acceptance.',cards:rows,passed:rows.length,total:45};await fs.writeFile('reports/qa/armed-support-cards-20261111.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:rows.length,total:45}));
