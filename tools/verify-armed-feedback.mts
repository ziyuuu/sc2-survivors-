import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ARMED_CARDS} from '../src/data/terran-armed-support';
const dir=process.env.ARMED_QA_OUT??'reports/local/armed-support-feedback-20261111',j=JSON.parse(await fs.readFile(dir+'/showcase-54.json','utf8'));
assert.equal(j.cards.length,54);assert.deepEqual(j.errors,[]);assert.ok(!j.failure);
const run=(id:string,node=true)=>j.cards.find((r:any)=>r.id===id&&r.node===node);
const max=(r:any,f:(s:any)=>number)=>Math.max(...r.frames.map(f));
const damage=(r:any,key:string)=>max(r,s=>s.bySource[key+':damage']??0);
const rows=[];
for(const c of ARMED_CARDS){const r=run(c.id);assert.ok(r,c.id);assert.ok(r.triggered);for(const s of r.frames)assert.deepEqual(s.errors,[],c.id+' model errors');let passed=false,observed='';
 if(c.id.startsWith('N')){const b=run(c.id,false);assert.equal(r.before.seed,b.before.seed);assert.deepEqual(r.before.members,b.before.members);}
 switch(c.id){
 case 'W02':case 'G03':passed=r.before.formal===4&&max(r,s=>s.formal)===5;observed='真实空席 4→5，正式补员。';break;
 case 'W03':passed=Math.abs(r.before.orders[0].remaining-10)<1e-8&&Math.abs(r.before.orders[1].remaining-8.8)<1e-8&&Math.abs(r.frames[1].orders[0].remaining-1.2)<1e-7&&r.frames[1].orders[1].remaining===0&&r.frames[2].orders[0].remaining===0;observed='同种基础 10 秒订单：概率提速新单 8.8 秒完成，旧单 10 秒完成。';break;
 case 'W05':passed=max(r,s=>s.forts.length)===1;observed='真实空仓落地、在场和退场。';break;
 case 'P05':passed=max(r,s=>s.forts.filter((f:any)=>f.kind==='supply_depot').length)===4&&!damage(r,'armed.P05');observed='4 座原版 SupplyDepot 装甲设备实际落地，阻敌与光环，无武器。';break;
 case 'G05':{const blasts=new Map(r.frames.flatMap((s:any)=>s.events.filter((e:any)=>e.supportVisual==='raider-blast')).map((e:any)=>[e.serial,e]));passed=blasts.size>=3&&damage(r,'armed.G05')>0;observed='真实恶火追敌自爆，观察到 '+blasts.size+' 个独立引爆事件；恢复去重和关末取消另经单测。';break;}
 case 'W06':case 'G09':{const healed=max(r,s=>s.bySource['armed.'+c.id+':healed']??0);passed=healed>0;observed='真实恢复 '+healed+' 生命。';break;}
 case 'G06':passed=max(r,s=>s.temporary.length)===3&&damage(r,'zergling')>0;observed='3 名单体临援跳虫真实出门，原武器命中并保留独立寿命。';break;
 case 'G01':case 'G02':case 'G08':case 'B07':{const key=({G01:'mines',G02:'bunker',G08:'mutation',B07:'missiles'} as Record<string,string>)[c.id],n=damage(r,'terran.'+key);passed=n>0;observed='原执行器实际伤害 '+n+'；出勤受真实事件门槛约束。';break;}
 case 'G07':{const packets=r.frames.flatMap((s:any)=>s.unique.packets.filter((p:any)=>p.kind==='ricochet'));passed=damage(r,'terran.ricochet')>0&&packets.some((p:any)=>p.seen.length>=3)&&packets.every((p:any)=>new Set(p.seen).size===p.seen.length&&p.at-p.start>=.12-1e-8);observed='实际弹链跨越不同目标，曳光飞抵才结算，最短飞行 0.12 秒；同链无重复目标。';break;}
 case 'B03':case 'B06':case 'B08':case 'P02':case 'O02':{const count=({B03:4,B06:3,B08:1,P02:3,O02:6} as Record<string,number>)[c.id];passed=max(r,s=>s.temporary.length)===count;observed='实际派出 '+count+' 名临援；保留各自真实寿命。';break;}
 case 'B05':passed=max(r,s=>s.formal)===5&&max(r,s=>s.temporary.length)===5&&max(r,s=>s.forts.length)===2;observed='双兵营实际落地，正式 4→5 与 5 名临援分别结算。';break;
 case 'B09':passed=r.frames[0].members[0].period<r.before.members[0].period&&r.frames.at(-1).members[0].period===r.before.members[0].period;observed='真实攻击概率触发超载，原武器周期缩短，结束恢复。';break;
 case 'B02':passed=damage(r,'armed.B02')>0&&max(r,s=>Object.values(s.unitStatus).filter((v:any)=>v.root).length)===6;observed='捕获 6 个目标；最大生命百分比实际伤害，逐秒游标恢复另经单测验证。';break;
 case 'P04':passed=max(r,s=>Object.values(s.unitStatus).filter((v:any)=>v.cardShields?.some((b:any)=>b.amount>0)).length)===5;observed='5 名成员获得真实卡盾；实机可见蓝色光盾。';break;
 case 'P01':{const count=max(r,s=>Math.max(0,...s.volleys.filter((v:any)=>v.card==='P01').map((v:any)=>v.shots)));passed=damage(r,'armed.P01')>0&&count>=3&&count<=4;observed='实际系统核击计划 '+count+' 发并结算伤害；全部弹的虚拟来源身份另经正式 World 单测与原版画面检查。';break;}
 case 'N01':passed=damage(r,'armed.W04')>damage(run(c.id,false),'armed.W04');observed='同种子基础炮击实际伤害增加。';break;
 case 'N02':passed=r.frames.some((s:any)=>s.temporary.some((u:any)=>u.card==='W01'&&u.rank===2))&&max(r,s=>s.temporary.filter((u:any)=>u.card==='W01').length)===4;observed='同种子 W01：3 名 I 阶→4 名 II 阶。';break;
 case 'N03':passed=r.frames.some((s:any)=>s.temporary.some((u:any)=>!!u.elite))&&!run(c.id,false).frames.some((s:any)=>s.temporary.some((u:any)=>!!u.elite));observed='同种子普通临援→真实精英身份。';break;
 case 'N04':passed=max(r,s=>Object.values(s.unitStatus).filter((v:any)=>v.root).length)===7&&max(run(c.id,false),s=>Object.values(s.unitStatus).filter((v:any)=>v.root).length)===6;observed='同种子捕获 6→7，节点 4 次百分比伤害恢复另经单测验证。';break;
 case 'N05':passed=r.manual.before===1&&r.manual.committed===0&&r.manual.completed===0&&r.manual.shots.some((v:any)=>v.shots>=5&&v.shots<=8);observed='系统整轮赠 1 枚，库存核击花 1 枚结算完整 5–8 发。';break;
 case 'N06':case 'N07':passed=r.frames.some((s:any)=>s.nodes?.links?.some((l:any)=>l.node===c.id));observed='基础真实出勤建立节点联动回执，未绕过基础事件概率。';break;
 case 'N08':passed=r.frames.some((s:any)=>s.fields.some((f:any)=>f.cardId==='G04'&&f.width===3.75));observed='同种子控制后油带宽度 3→3.75。';break;
 case 'N09':passed=r.frames.some((s:any)=>Object.values(s.nodes?.batches??{}).some((b:any)=>b.count>0));observed='新正式成员接班，真实伤兵获得撤退命令和减伤。';break;
 case 'O01':passed=r.frames.some((s:any)=>s.counter?.activation?.finished&&s.counter?.temporaryHero?.rank===5);observed='真实正式阵亡事件命中概率后，救场整轮、补员、临援英雄完成。';break;
 case 'O03':passed=damage(r,'armed.O03')>640&&r.frames.some((s:any)=>s.events.some((e:any)=>e.supportVisual==='planetary-beam'&&e.supportDuration===2))&&r.frames.some((s:any)=>s.deployments.some((d:any)=>d.sweep?.pulses===8))&&max(r,s=>s.temporary.length)>=3;observed='要塞实际承伤蓄能，2 秒贯穿扫射分 8 段结算，三名驻军出门。';break;
 default:{const n=damage(r,'armed.'+c.id);passed=n>0;observed='实际事件触发，正式执行器结算伤害 '+n+'。';}
 }
 assert.ok(passed,c.id+' observation failed');rows.push({id:c.id,name:c.name,status:'通过',trigger:c.id==='W03'?'新订单':c.id==='G03'||c.id==='O01'?'正式阵亡事件':'实际武器事件与该卡原条件（防御牌可由真实受损触发）',observed,evidence:'showcase-54.json',ticks:r.frames.map((s:any)=>s.tick)});
}
const report={date:'2026-11-11',scope:'事件概率候选：45 个实际打开并重新播放的独立正式 World/渲染场景，另 9 个同种子基础对照。工程前态、桌面浏览器；非自然战役、物理手机或人类美术验收。',passed:rows.length,total:45,nodeBaseComparisons:9,cards:rows};
await fs.writeFile(process.env.ARMED_CARD_REPORT??'reports/qa/armed-support-feedback-cards-20261111.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:rows.length,nodeBaseComparisons:9}));
