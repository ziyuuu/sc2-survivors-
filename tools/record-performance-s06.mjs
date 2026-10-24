import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const report=JSON.parse(await fs.readFile('reports/qa/performance-s06-20261020.json'));assert.equal(report.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path)),s=b.tasks.find(t=>t.id==='S06'),q=b.tasks.find(t=>t.id==='S09');assert.equal(s.status,'待验证');
const evidence=['PERFORMANCE_S06_20261020.md','../../reports/qa/performance-s06-20261020.json'];
s.status='已完成';s.result='两处源码复用调用内落点/活体集合、单遍最近候选；出生时刻/位置/强度/RNG与队列原策略保持。584+20状态/边界、1708回归覆盖及四场景8对状态/16张RGB相同截图通过。176集中出生Node26.16→1.80ms，完整单步41.38→7.17ms；无尽/空场微小回退和未改队列波动保留，非整场FPS。两次无效诊断夹具与环境失败原样保留并纠正。';s.updated='2026-10-20';s.evidence=[...new Set([...s.evidence,...evidence])];
q.result='已核验、未修复：普通及三种精英毒爆900实际固定步，空旷/贴身/移动目标各主动攻击3次；12刺蛇混编（固定/正常行动）均0次，已选目标但接近停滞。查尔浏览器普通毒爆3次对0次复现；S06前后行为相同。下一项优先排查队形/避让/接触距离，补敌方与英雄临时体。';q.evidence=[...new Set([...q.evidence,'BANELING_S09_DIAGNOSIS_20261020.md',...evidence,'../../reports/local/baneling-s09-20261020/diagnosis-r2.json'])];
let count=0;for(const r of b.auditRows)if(report.decisions[r.id]){r.currentReview='2026-10-20 A01随S06复核：'+report.decisions[r.id];count++;}assert.equal(count,14);
b.revision++;b.updated='2026-10-20';b.next='S09';b.baseline.measurements+=' S06完成两处出生/落点查询优化，604状态/边界与1708回归覆盖、四场景8对状态/16图RGB精确；176出生26.16→1.80ms，完整单固定步41.38→7.17ms，非整场FPS。原队列/重试时序保持，诊断夹具纠正和无收益样本保留。新增S09毒爆任务已复现混编接近停滞，未修复。';
b.updates.push({date:'2026-10-20',tasks:['S06','S09','A01'],change:'S06待验证→已完成，14条审计结论已补。1708回归覆盖（1701首轮通过，7环境失败定向复测16项全过）、604状态/边界、8对浏览器状态及16图RGB精确。无尽/回退障碍两次错误夹具、权限失败、短场景回退保留。S09新任务已核验混编停滞但未修复，列为下一项。50项完成29、剩余21。',evidence:[...evidence,'BANELING_S09_DIAGNOSIS_20261020.md']});
assert.equal(b.tasks.length,50);assert.equal(b.tasks.filter(t=>t.status==='已完成').length,29);assert.equal(q.status,'待办');await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const sha=report.source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const note=`## S06 出生与落点查询完成、S09 毒爆已核验 · 2026-10-20

- 用户授权S06并新增毒爆主动攻击任务。说明docs/project/PERFORMANCE_S06_20261020.md，证据reports/qa/performance-s06-20261020.json；50项完成29、剩余21，下一项S09。S09已核验但未修复，说明docs/project/BANELING_S09_DIAGNOSIS_20261020.md。
- 两处生产文件复用同步调用内的落点/活体/结构集合，合法回退单遍最近点；保留每只出生原RNG、稳定等距首项、出生时刻/强度/位置。无跨tick缓存，下一只虫巢出生重新采集活体；队列排序/shift、swarm预算、重试频率、无尽双重验证保持。
- 176出生Node中位26.1615→1.8020ms，完整单固定步41.3847→7.1710ms、12样本最大61.0938→23.6157ms；查尔出生25.5128→1.7579ms。强制合法回退301.802→26.7076ms。不是整场FPS或最坏上界；无尽约7%回退、空场微小回退与未改队列波动保留。
- 1708回归覆盖：首轮1701通过/7环境权限失败，定向三文件16项全过；类型/数据、584+20状态/边界通过。查尔四场景8对状态/活动绘制、16图RGB完全相同，三张联系表已查看，页面/控制台错误0/0、请求取消9/9。出生后120步、运输舱仍下落、毒爆各900步是受控验证，非自然救援/战役/物理输入。
- R1无尽夹具漏startedAt致NaN作废，R2补完整运行态/FlatTerrain/有限数值断言；R1/R2回退夹具错用r而非w/h，正式R3修正并断言离开阻挡点。旧记录保留，游戏构建未变。重复服务、沙箱HTTP与看板记录字段失败保留；未改历史为通过。
- 毒爆普通/三精英空旷、贴身或移动目标15秒均主动攻击3次；12刺蛇混编固定/正常行动均0次，已有目标但接近停滞。查尔浏览器普通毒爆3对0复现。未直接fire/清恢复；后续定位队形避让并补敌方/英雄临时体，不宣称已完全定位或修复。
- 最终JS ${sha}，445浏览器/170Node输入；入口preview/performance-s06-20261020-candidate/（4436），冻结S05并排除无关economic-egg修改。未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、模拟经济及存档延期保持。

`;
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md',note+agents);
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md']){
 const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n');
 await fs.writeFile(file,old.slice(0,at+1)+'\n2026-10-20 S06已完成：[出生与落点查询](project/PERFORMANCE_S06_20261020.md)。604状态/边界、1708回归覆盖及8对浏览器状态/16图RGB精确；局部CPU非整场FPS。50项完成29、剩余21，下一项[S09毒爆主动攻击](project/BANELING_S09_DIAGNOSIS_20261020.md)，已核验混编接近停滞、尚未修复。\n'+old.slice(at+1));
}
console.log(JSON.stringify({revision:b.revision,complete:29,total:50,next:b.next}));
