import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const r=JSON.parse(await fs.readFile('reports/qa/performance-s07-20261020.json'));assert.equal(r.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path)),s=b.tasks.find(t=>t.id==='S07');assert.equal(s.status,'待验证');
const evidence=['PERFORMANCE_S07_20261020.md','../../reports/qa/performance-s07-20261020.json'];
s.status='已完成';s.updated='2026-10-20';s.evidence=[...new Set([...s.evidence,...evidence])];
s.result='五处源码减少跨崖搜索、击退/拉扯占位、接战/队形名单重复工作。1721回归、917状态/返回对照、5动态边界及五场景10对浏览器状态/绘制通过；S09的17组行为精确保持。16单位接战热查询约下降44%、密集掠夺者/不朽者命中后回调约25/21%；专用悬崖夹具收益与当前五图失败路径分开，工业图约+0.00408ms回退保留。完整固定步无稳定改善，碰撞/分离/闪烁源码未改，不计波动收益。六条审计已补，旧夹具失败保留。';
let count=0;for(const a of b.auditRows)if(r.decisions[a.id]){a.currentReview='2026-10-20 A01随S07复核：'+r.decisions[a.id];count++;}assert.equal(count,6);
const audit=b.tasks.find(t=>t.id==='A01');audit.updated='2026-10-20';audit.evidence=[...new Set([...audit.evidence,...evidence])];audit.result+=' S07本批补齐SIM-013/014、C03/C06/C19/C22六条当前结论与去向；其余条目仍按索引继续复核，A01整体未关闭。';
const s09=b.tasks.find(t=>t.id==='S09');assert.equal(s09.status,'已完成');s09.updated='2026-10-20';s09.evidence=[...new Set([...s09.evidence,...evidence])];s09.result+=' S07回归追加：17组900固定步完整状态/路径/攻击/间距与原S09精确一致，浏览器普通混编3次、临时体1次自爆保持；原小幅碰撞重叠未改。';
b.revision++;b.updated='2026-10-20';b.next='R01';assert.equal(b.tasks.find(t=>t.id==='R01').status,'待办');
b.baseline.measurements+=' S07小合批完成五处移动/占位/队形查询优化，1721回归、917状态/返回、5边界及10对浏览器状态/绘制通过；S09混编路径保持。16单位接战约44%、密集击退/拉扯后置回调约25/21%局部下降；完整固定步略慢、工业图失败跨崖约多0.00408ms保留。碰撞预算/尸体/闪烁不改，非FPS提升。';
b.updates.push({date:'2026-10-20',tasks:['S07','A01','S09'],change:'S07待验证→已完成，A01六条审计结论补齐，S09保持完成且回归精确。1721回归、917对照、5动态边界、五场景浏览器与截图收尾通过。保留生命上限夹具失败、敌方攻击错误预期、计时先导与局部回退；完整固定步无稳定收益。50项完成31、剩余19，下一项R01真实GPU绘制成本未开始。',evidence});
assert.equal(b.tasks.length,50);assert.equal(b.tasks.filter(t=>t.status==='已完成').length,31);await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const candidate=r.source.builds.find(x=>x.kind==='candidate'),sha=candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const note=`## S07 密集移动与占位查询小合批完成 · 2026-10-20

- 用户批准S07小合批、A01六条复核及S09回归，已本地验证完成。说明docs/project/PERFORMANCE_S07_20261020.md，证据reports/qa/performance-s07-20261020.json。50项完成31、剩余19，下一项R01未开始；A01其余条目仍待办。
- 五处源码：跨崖单次搜索复用起点高度/占位/placement参数；掠夺者击退在伤害与连锁后一次采集当前阻挡；不朽者逐目标实时Map迭代；接战/队形缓存按原字段与顺序比较名单，减少字符串/数组构造。原两遍碰撞、候选预算、分离、空间索引、S09路径及World调度均未改。
- 1721完整回归、类型/数据检查、917状态/返回对照与5动态边界通过；五图中央30/300敌人各360步，17组S09各900步全状态/攻击/间距精确。八单位闪烁提交、转移封堵取消/解除后成功、同tick地图/位置/死亡/飞行/预留和300活敌+1000尸体生命周期核验保持。
- 最终串行12对计时：16单位接战热查询0.022141→0.012509ms，约44%；密集掠夺者/不朽者命中后回调约25/21%下降，不含主攻击此前伤害结算。专用跨崖夹具阻挡/300placement约57/77%下降；当前五图levels=0，不套用成功跨崖收益。工业图失败查询0.007264→0.011344ms与空场/冷队形小回退保留。完整固定步5.03246→5.10438ms，未证实稳定加速或整场FPS提升。
- 实际查尔完整效果、1440×900 DPR1，五场景初始/结束10对状态与活动源绘制验证；复核10对状态/镜头也精确，40图已查看。原镜头平滑造成的大范围差异保留；复核8对整图RGB精确，另2对仅HUD按钮/小地图视野框410/1156像素不同，范围外精确。四次页面/控制台错误0，请求取消8/8/9/4条保留；详情见报告。诊断锁血和受控步进不代表自然战役/物理输入/人类体验/全内容60FPS。
- R2/R3手改HP上限夹具在属性刷新后tick606死亡，R3锁血仍不能弥补错误上限；正式正常上限+原生诊断锁血。R4敌方在开火友军包围下死亡却误要求必攻，正式恢复原S09固定友军/空旷控制。R2计时与类型重叠仅先导，R4短样本/JIT差异保留，正式R5明确预热/加循环；不改旧失败为通过。
- 六条审计SIM-013/014、C03/C06/C19/C22补结论；尸体不截断、碰撞小重叠不靠改预算抹除、闪烁/转移提交不复用陈旧预览。最终JS${sha}，446浏览器/171Node输入；入口preview/performance-s07-20261020-candidate-r4/（4436），冻结S09并排除无关economic-egg修改。未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、经济与存档延期保持。

`;
await fs.writeFile('AGENTS.md',note+await fs.readFile('AGENTS.md','utf8'));
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md']){
 const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n');
 await fs.writeFile(file,old.slice(0,at+1)+'\n2026-10-20 S07小合批已完成：[密集移动与占位查询](project/PERFORMANCE_S07_20261020.md)。1721回归、917对照、5边界及五场景浏览器通过；A01六条审计与S09回归完成，局部CPU收益/回退和整步无稳定收益分开记录。50项完成31、剩余19，下一项R01未开始。\n'+old.slice(at+1));
}
console.log(JSON.stringify({revision:b.revision,done:31,total:50,audits:count,next:b.next}));
