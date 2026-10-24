import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const report=JSON.parse(await fs.readFile('reports/qa/performance-s01-s02-20261020.json','utf8'));assert.equal(report.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path,'utf8')),evidence=['PERFORMANCE_S01_S02_20261020.md','../../reports/qa/performance-s01-s02-20261020.json'];
for(const id of ['S01','S02']){const t=b.tasks.find(t=>t.id===id);assert.equal(t.status,'待验证');t.status='已完成';t.updated='2026-10-20';t.evidence=[...new Set([...t.evidence,...evidence])];t.result=id==='S01'?'按原密度与ID决胜规则每次施法统计一次，零/单候选跳过统计。100/300候选同进程12对CPU均更快，约3.076→0.321ms、42.973→3.899ms；300候选距离计算1209300→90300。保留单目标无收益结果。310组共享状态对照、1684回归和真实灵能等五场景浏览器对照通过，主测五组冻结帧率均较低，未证明整场FPS收益。':'Boss最优选敌/治疗、潜伏者无用near、给定位置特殊生成、无科技精英风暴、刺蛇扇形和航母调用内母子列表已优化。密集Boss选敌约0.1652→0.0569ms、刺蛇0.3892→0.2782ms、航母0.2608→0.2272ms；航母遍历28→19次，保留全部属性刷新。空目标Boss搜索略慢且继续逐tick重试；主巢跨导弹快照未采用，有原行为控制证据。310组状态、1684回归及五场景浏览器通过，主测帧率均较低且未归因，未改强度/频率/RNG/画质。';}
const reviews={
 'SIM-001':'2026-10-20 S01完成：每施法一次密度统计/最大值选择，保留原候选与ID决胜；100/300候选局部CPU约下降89.6%/90.9%，300距离1209300→90300。单目标无收益保留；310状态对照及浏览器灵能验证通过。',
 'SIM-004':'2026-10-20 S02完成：女王单遍最小生命比例/ID选择，无伤员仍按原每tick重试，伤员到来立即可治疗。无/有伤员CPU分别0.003629→0.002312、0.073777→0.067295ms；没有跨tick伤员快照或频率取舍。',
 'SIM-005':'2026-10-20 S02完成：Boss对实体/工事单遍选择最近合法目标，保留距离/可见性/平局ID。密集有效目标0.1652→0.0569ms；空目标0.003208→0.003776ms没有改善，原始回退保留，不新增迟延重试。',
 'SIM-006':'2026-10-20 S02完成：Boss/领主潜伏者按既有14秒周期选模式，跳过仅普通潜伏者需要的near查询；三档及7.99/8/13.99/14秒边界对照精确。',
 'SIM-016':'2026-10-20 S02完成：显式位置跳过未使用的connectedLocations/候选筛选；位置合法性仍检验，查询1→0且RNG保持529。未提供位置时沿用原随机候选。',
 'C04':'2026-10-20 S02完成：单次子系统调用复用母子列表/初始化/付费补机，去重复cleanup；保留全部属性刷新，预备队资格即时按活体ID判断。场景遍历28/8932→19/6061，CPU约下降12.9%；死亡/归属变化/删除/补机/暂停验证。',
 'C05':'2026-10-20 S02完成：未研究风暴的精英圣堂在选敌前返回；high_templar.2反馈例外和战斗状态初始化保留。300背景目标遍历301→0，多科技/能量/六种精英法术对照精确。',
 'C07':'2026-10-20 S02完成：精英刺蛇五弹道各自直接选择角度最优目标，无完整排序，保留ID平局、主弹道和发射顺序。300候选CPU0.3892→0.2782ms，五弹道与命中完整状态精确。',
 'C25':'2026-10-20 S02复核后保留：主巢导弹逐枚取得存活目标，前枚伤害可能改变后枚集合，未选跨导弹快照。20导弹控制回放含28死亡，旧新命中顺序/状态精确；没有声称本项扫描已消除。'
};for(const r of b.auditRows)if(reviews[r.id])r.currentReview=reviews[r.id];
b.revision++;b.updated='2026-10-20';b.next='S04';b.baseline.measurements+=' S01/S02在X04最终冻结输入上完成六处模拟优化，310状态对照、1684回归及五场景浏览器通过；密集风暴/选敌/航母局部成本下降，单目标/空目标无收益或回退保留，主巢导弹未选缓存。主测五组冻结低探针FPS均较低，未归因；两组像素差异在固定历史复查中RGB精确。不宣称整场FPS/60FPS完成。';
assert.equal(b.tasks.filter(t=>t.status==='已完成').length,25);assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);assert.equal(b.tasks.find(t=>t.id==='S04').status,'待办');
b.updates.push({date:'2026-10-20',tasks:['S01','S02'],change:'两项待验证→已完成：六处模拟源码、310状态对照/1684回归/五场景浏览器验证通过；主测五组冻结帧率均较低且未归因；两组像素差异固定历史复查RGB精确，分别记录CPU、请求与像素，保留空目标回退、主巢候选未采用及所有环境/夹具失败。49项完成25、剩余24；下一项S04未开始。',evidence});await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const hash=report.source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const header=`## S01／S02 战斗查询优化完成 · 2026-10-20

- 用户授权“可以的。开始吧S01/S02”。六处模拟文件实现风暴单次密度统计、Boss单遍选敌/治疗、潜伏者无用near跳过、显式位置生成跳过连通枚举、无科技精英风暴早退、刺蛇扇形最优选择、航母调用内母子列表复用。说明 docs/project/PERFORMANCE_S01_S02_20261020.md，证据 reports/qa/performance-s01-s02-20261020.json；看板修订${b.revision}，49项完成25、剩余24，下一项S04未开始。
- 同进程12对生产函数CPU：100/300候选风暴3.076→0.321、42.973→3.899ms；密集Boss选敌0.1652→0.0569、刺蛇扇形0.3892→0.2782、三航母0.2608→0.2272ms。单目标风暴及Boss空目标未改善/略回退保留；局部CPU不是整场FPS收益。主测五组冻结低探针FPS均较低，原因未归因，未证明整场提升。
- 最终1684回归、类型/数据检查、310状态检查点通过；六组World各360固定步。输入先统一诊断新局UUID，未来结算/掉落回执不做宽泛清理。实际查尔五场景15+15采样窗口验证状态/源请求/画面，冻结不推进、实时不丢弃欠账；首轮航母290/主巢52差异像素保留，固定历史复查两组全图RGB及资源精确；自然/物理/人类/全内容60FPS仍开放。
- 所有原伤害、目标顺序、随机数、技能频率和属性刷新保留。航母列表仅一次调用内使用，死亡/转化/删除/新生下一次调用立即重建。C25主巢跨导弹快照未采用，保留原存活目标查询；20导弹含28死亡控制重放精确。沙箱7项失败、旧UUID夹具失败、重复服务端口失败和首轮CPU均保留。
- 最终JS${hash}，442输入；入口preview/performance-s01-s02-20261020-candidate/（4436），排除无关economic-egg改动。未替换Current、提交/推送或发布；五图、完整效果、300/4∶4∶1、模拟/经济及存档延期保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const p of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){let text=await fs.readFile(p,'utf8');const i=text.indexOf('\n'),link=(p.includes('/project/')?'':'project/')+'PERFORMANCE_S01_S02_20261020.md';text=text.slice(0,i+1)+`\n2026-10-20 S01／S02 已完成：[战斗查询优化](${link})。310状态对照、1684回归及五场景浏览器验证通过，局部计算收益与整场FPS分开记录（主测帧率较低，未证明整场提升）；49项完成25、剩余24，下一项S04。\n\n`+text.slice(i+1).replace(/^\r?\n/,'');await fs.writeFile(p,text);}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
