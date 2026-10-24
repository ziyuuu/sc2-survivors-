import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const report=JSON.parse(await fs.readFile('reports/qa/performance-s05-20261020.json'));assert.equal(report.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path));assert.equal(b.revision,51);
const evidence=['PERFORMANCE_S05_20261020.md','../../reports/qa/performance-s05-20261020.json'],task=b.tasks.find(x=>x.id==='S05'),ui=b.tasks.find(x=>x.id==='U01');assert.equal(task.status,'待验证');assert.equal(ui.status,'待验证');
task.status='已完成';task.updated='2026-10-20';task.evidence=[...new Set([...task.evidence,...evidence])];
task.result='7处游戏文件：生产账本按数组身份派生ID/活动订单索引，当前乘客与双生存活仍实时读取；健康双生提前返回，奖励直接读最近两轮历史。1704回归、1042状态/边界检查、四场景浏览器12对状态/18图通过。10000历史预留双查询0.3372→0.000042ms、训练推进0.03503→0.000078ms；短历史回退/冷建索引/约0.46MB额外内存保留，非整场FPS。全部历史与回执保留；舱守卫、Boss队列、动态属性刷新保留原路径。';
ui.status='待办';ui.updated='2026-10-20';ui.evidence=[...new Set([...ui.evidence,...evidence])];
ui.result='生产详情和战术进阶预留两个查询消费端已随S05完成；真实设施页签/应用暂停/返回/交付与战术0+1→1+0验证，U01其余通知/商店/布局仍待办。普通构建树UI无稳定收益，未推广为全界面加速；统计观察者未改。';
const reviews={
 'SAVE-005':'2026-10-20 S05部分优化并保留边界：账本ID查询/女王注入改用索引；原运输舱/经济对象扫描保持，被毁舱仍可能释放未出守卫，A/B验证两名守卫仅放一次且guardianPod=null。未删历史、未压缩对象；余项不冒称消除。',
 'SAVE-007':'2026-10-20 S05完成直接最近两轮切片，避免每candidate复制全部此前history。三族0/1/2/3/20/1000/10000历史的shown/chosen权重、实际抽取、RNG与历史精确；全历史保留，局部CPU另列。',
 'SAVE-008':'2026-10-20 S05完成生产派生索引：原账本/幂等回执/购买历史全部保留。10000历史冷建约1.069ms、额外Map约0.46MB，非内存压缩。恢复/更换数组重建；接收/拒绝重复回执不重付。统计观察者必须保留全新增订单语义，U04未动，保存延期。',
 'PG-002':'2026-10-20 S05完成活动订单复用与ID查询，生产/退款/交付/注入/UI共同使用；当前乘客、首个双生死亡和培养继承仍实时读取。三族四档历史、双生/战术进阶/重复交付A/B通过，无跨tick人数缓存。',
 'PG-003':'2026-10-20 S05完成健康双生先清理维护状态后返回；代理测试确认无账本读取。残缺双生继续检查待交付/重生，首个死亡后第二个预留语义精确。10000历史局部维护0.04753→0.000068ms，不作为整场FPS。',
 'PG-008':'2026-10-20 A01随S05复核保留：Boss回收/队列结算保持原有按序获取与过滤；获取可能改变后续资格，阻塞需重试，不采纳无独立证据的压缩候选。源码冻结精确、完整回归覆盖过关/阻塞/恢复/重复领取；无新优化收益声明。',
 'PG-020':'2026-10-20 A01随S05复核保留：购买/领取仍按真实建筑/卡牌/装备变化即时刷新友军属性，未引入动态缓存或合并通知。源码未变与完整回归为保留控制证据，不宣称本项性能已改善。'
};
let changed=0;for(const row of b.auditRows)if(reviews[row.id]){row.currentReview=reviews[row.id];changed++;}assert.equal(changed,7);
b.revision++;b.updated='2026-10-20';b.next='S06';
b.baseline.measurements+=' S05完成活动生产/ID与最近两轮历史查询，1704回归、1042状态及12对浏览器状态验证；10000历史训练推进0.03503→0.000078ms，冷建约1.069ms/额外约0.46MB。短历史回退保留，U01仅生产显示子项完成；历史舱/经济对象与动态属性仍原路径，非整场FPS。';
assert.equal(b.tasks.filter(x=>x.status==='已完成').length,28);assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);assert.equal(b.tasks.find(x=>x.id==='S06').status,'待办');
b.updates.push({date:'2026-10-20',tasks:['S05','U01','A01'],change:'S05待验证→已完成；U01生产详情/战术预留消费端完成，其余返回待办；七条审计结论已补。1704回归、1042状态/边界及四场景12对浏览器状态/18图通过。四次测试脚本页签/选择器/隐藏DOM断言失败、短历史回退、冷索引与额外Map内存保留。49项完成28、剩余21，下一项S06未开始。',evidence});
await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const sha=report.source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const header=`## S05 活动生产与长历史查询完成 · 2026-10-20

- 用户批准S05小合批，包含U01生产详情/战术预留消费端与A01七条审计。说明docs/project/PERFORMANCE_S05_20261020.md，证据reports/qa/performance-s05-20261020.json；看板修订${b.revision}，49项完成28、剩余21，下一项S06未开始。U01其余通知/商店/布局仍待办。
- 七处游戏文件建立账本派生ID/活动订单查询，当前乘客/双生/资格实时读取；健康双生先维护后返回，奖励只读此前两轮历史。全部账本/回执/购买历史保留，恢复更换数组后重建，不序列化索引。真实写入为追加及替换数组，不支持任意同长度原地改写历史。
- 1704回归、类型/数据检查、993+49状态/边界对照通过。三族四档历史、退款/阻塞重试/交付/双生死亡/女王注入/战术五份进阶/接收拒绝重复回执/原生恢复/奖励shown-chosen权重保持。10000历史预留双查询0.3372→0.000042ms、训练推进0.03503→0.000078ms；局部CPU非整场FPS。短历史回退、冷建约1.069ms和额外Map约0.46MB保留。
- 查尔四场景真实UI点击与原生产/交付函数，1000历史、12对状态/活动绘制输出与18张正式截图通过；固定tick0、直接完成训练/释放乘客及诊断天赋不是自然救援/战役/物理输入。前四轮分别错误页签、两个关闭按钮严格选择器，以及两次误把隐藏面板当成应删除DOM的断言失败，原报告/截图保留；正式baseline-5/candidate-1，游戏构建未改。
- SAVE-005历史舱/经济扫描保留，被毁舱仍需释放待出守卫；PG-008 Boss按序结算/过滤及PG-020购买后实时属性刷新保留，未宣称新收益。统计观察者需要完整新增订单，不替换为仅活动集合；U04未动。
- 最终JS ${sha}，445浏览器/170Node输入，入口preview/performance-s05-20261020-candidate-r2/（4436）。冻结S08生产输入并排除无关economic-egg修改。未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、模拟经济及存档延期保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const p of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){let text=await fs.readFile(p,'utf8');const at=text.indexOf('\n'),link=(p.includes('/project/')?'':'project/')+'PERFORMANCE_S05_20261020.md';text=text.slice(0,at+1)+`\n2026-10-20 S05 已完成：[活动生产与长历史查询](${link})。1704回归、1042状态/边界和四场景浏览器；U01仅生产显示子项完成。49项完成28、剩余21，下一项S06。\n\n`+text.slice(at+1).replace(/^\r?\n/,'');await fs.writeFile(p,text);}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
