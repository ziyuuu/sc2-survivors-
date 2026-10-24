import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const report=JSON.parse(await fs.readFile('reports/qa/performance-s08-20261020.json','utf8'));assert.equal(report.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path,'utf8'));assert.equal(b.revision,47);
const evidence=['PERFORMANCE_S08_20261020.md','../../reports/qa/performance-s08-20261020.json'];
const task=b.tasks.find(x=>x.id==='S08'),audio=b.tasks.find(x=>x.id==='U04');assert.equal(task.status,'待验证');assert.equal(audio.status,'待验证');
task.status='已完成';task.updated='2026-10-20';task.evidence=[...new Set([...task.evidence,...evidence])];
task.result='9处生产文件：治疗/回盾按原顺序局部选前N，无回血来源/无到期池跳过受益者查询，状态过期按key/serial直查，不可变武器定义索引。1698回归、850状态检查及8组16友军+300敌人对照，四场景浏览器通过。普通/精英医疗局部约下降36/23%，小队英雄回退保留；不宣称整场FPS。动态属性缓存、来源预收集及精英盾区域候选未采用。';
audio.status='待办';audio.updated='2026-10-20';audio.evidence=[...new Set([...audio.evidence,...evidence])];
audio.result='治疗循环音频子项完成：301实体0/1/4/30治疗者计时、32仪器化启停及每侧9步实际解码AudioContext生命周期通过。Set复用收益过小/不稳定，生产音频不改，治疗loop与普通12voice分离规则保持。统计/遥测仍未开始，U04整项待办。';
const reviews={
 'C13':'2026-10-20 S08完成过期查询：票据携带key，按key/serial验证，4096票据/512活动条目到期CPU1.3774→0.6182ms（12/12）。堆票据数量不变，不是压缩或内存收益；刷新/移除/恢复对照精确。',
 'C16':'2026-10-20 S08完成：每次实时选原排序前N，旧目标+0.08容差与零能量移动目标保留。16友军+300敌人普通/精英医疗约下降36/23%；小队斯旺/阿塔尼斯回退保留，300友军压力单列。无降频/跨tick缓存，精英护盾区域候选撤回。',
 'C17':'2026-10-20 S08完成：无回血来源/满血跳过回血受益者、无到期感染池跳过友军、屏障无雷不构造敌方候选；其他状态清理/池推进/复活保持。无来源及同tick新增/死亡/晋升已验证。额外来源预收集无收益已撤回。',
 'PG-019':'2026-10-20 S08复核保留动态路径：仅不可变effectId→首个武器定义建立索引；非空天赋/技能/形态/战术/归属实时派生未缓存。26武器定义和21动态控制精确；301单位武器查询批次1.5132→1.1608ms，不把它当动态属性缓存收益。',
 'UI-AUDIO-001':'2026-10-20 U04音频子项完成复核：301实体0/1/4/30治疗者原更新约0.0013—0.0032ms，复用Set收益过小且不稳定未采用。32仪器化对照及两侧各9步实际AudioContext启停通过。循环不纳入普通12voice是原规则，未限流；通常World通知10Hz不是每绘制帧，非听觉验收。'
};
for(const row of b.auditRows)if(reviews[row.id])row.currentReview=reviews[row.id];
b.revision++;b.updated='2026-10-20';b.next='S05';
b.baseline.measurements+=' S08完成9处状态/支援查询优化，1698回归/850状态及8组普通密度对照/四场景浏览器通过；16友军+300敌人普通/精英医疗局部约下降36/23%，小队英雄回退保留。U04音频复核保留原实现，统计/遥测仍待办；不宣称整场FPS。';
assert.equal(b.tasks.filter(x=>x.status==='已完成').length,27);assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);assert.equal(b.tasks.find(x=>x.id==='S05').status,'待办');
b.updates.push({date:'2026-10-20',tasks:['S08','U04','A01'],change:'S08待验证→已完成；U04治疗循环音频子项完成复核且保留原实现，统计/遥测未开始，整项返回待办。1698回归、850+8状态对照、四场景画面及真实音频生命周期通过；小队回退/原失败保留，5条审计结论更新。49项完成27、剩余22，下一项S05未开始。',evidence});
await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const hash=report.source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const header=`## S08 状态与支援查询完成 · 2026-10-20

- 用户批准S08与U04治疗循环音频子项合批。九处生产文件完成局部前N选优、无回血来源/无到期池按需查询、过期状态key/serial直查及不可变武器索引。说明 docs/project/PERFORMANCE_S08_20261020.md，证据 reports/qa/performance-s08-20261020.json；看板修订${b.revision}，49项完成27、剩余22，下一项S05未开始。
- 16友军+300敌人局部CPU普通医疗0.006995→0.004455、精英医疗0.008188→0.006290ms（各11/12较快）；斯旺/阿塔尼斯略慢保留。300友军极端压力单列，不当作普通战斗。状态4096票据1.3774→0.6182ms，票据数量不变，非内存压缩或整场FPS收益。
- 1698回归、类型/数据检查、850状态加8组普通密度对照通过；同tick死亡/归属/新伤员/晋升、非空天赋与动态形态保持。每次读取当前目标，不降频、不跨tick缓存；零能量移动目标、旧目标容差保持。来源预收集与精英盾区域候选撤回。
- U04音频子项已复核：Set复用收益过小不稳定，生产音频不改；32仪器化启停、两侧各9步实际解码AudioContext生命周期通过。治疗loop与普通12voice分离保持，非人类听觉验收；统计/遥测仍待办，U04不整项关闭。A01仅对应五条审计结论更新。
- 查尔四场景8对固定/结束状态及活动效果请求、四对截图和24采样窗口验证，原始差异/慢样本保留；完整效果、冻结不推进、实时不丢弃欠账。首轮手改maxHp夹具使伤员死亡/无来源提前失败，summary-r1失败保留；R3保留原生上限、每步诊断伤势25%，断言存活及完整120/900步后重录。类型初次和音频mock两次失败均保留。
- 最终JS${hash}，444浏览器/161Node输入；入口preview/performance-s08-20261020-candidate-r3/（4436），冻结S04输入并排除无关economic-egg改动。未替换Current、提交/推送或发布；五图/画质/300/4∶4∶1/模拟经济/存档延期保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const p of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){
 let text=await fs.readFile(p,'utf8');const at=text.indexOf('\n'),link=(p.includes('/project/')?'':'project/')+'PERFORMANCE_S08_20261020.md';
 text=text.slice(0,at+1)+`\n2026-10-20 S08 已完成：[状态与支援按需查询](${link})。1698回归、850+8状态对照及四场景浏览器；U04治疗音频复核保留原实现，统计/遥测待办。49项完成27、剩余22，下一项S05。\n\n`+text.slice(at+1).replace(/^\r?\n/,'');await fs.writeFile(p,text);
}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
