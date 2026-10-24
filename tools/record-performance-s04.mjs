import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const report=JSON.parse(await fs.readFile('reports/qa/performance-s04-20261020.json','utf8'));assert.equal(report.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path,'utf8')),t=b.tasks.find(t=>t.id==='S04'),evidence=['PERFORMANCE_S04_20261020.md','../../reports/qa/performance-s04-20261020.json'];assert.equal(t.status,'待验证');
t.status='已完成';t.updated='2026-10-20';t.evidence=[...new Set([...t.evidence,...evidence])];t.result='装备附加候选按效果需要生成；弹射每跳单遍最近目标；酸区最大值无临时数组；英雄命令复用当次选敌。实际七套配装完整攻击成本对照，纯属性/双击/DOT约下降67%/64%/77%，各12/12更快；单独分裂/小酸区无收益保留。896状态检查、1690回归及四场景浏览器通过。来源DTO共享与新增空间索引未采用并有控制证据；无整场FPS保证。';
const reviews={
 'SIM-007':'2026-10-20 S04复核保留：各弹道的冻结目标关联/独立可变DTO不能一概共享。五弹道与删除源后到达精确，旧新均6次深复制；7/12计时差异不算收益，未创建跨攻击来源缓存。',
 'C08':'2026-10-20 S04完成：同源覆盖最大伤害改直接遍历，消除filter/map/spread临时数组，不改逐区逐敌顺序/每秒gate/过期/未来覆盖区参与。24区300目标局部10.784→10.168ms（9/12），16目标无稳定收益；多源/过期/死亡/追赶及真实酸区画面验证。',
 'C12':'2026-10-20 S04复核保留实时路径：空间索引在两次重建间可能缺少移动/新生/静态巢，未直接替代装备范围扫描。无需求时已跳过扫描，弹射不再完整排序；过期索引、静态巢、转化与新生案例通过。S07另列待办。',
 'C14':'2026-10-20 S04完成：英雄执行复用当次命令的选敌；预览不跨调用缓存。雷诺总空间查询3→2（保留伤害查询）、托什实体遍历3→2，局部CPU约下降31%/22%；全部英雄及预览后目标失效对照精确。',
 'C15':'2026-10-20 S04完成：公共附加候选只在分裂/顺劈/移动附加/穿透/追击需要时生成，仍在原命中前。弹射每跳读取当前活体且单遍按距离/ID选最优；原派生顺序/有限真伤/RNG保留。真实七套配装、DOT及六组360实际步对照；单独分裂轻微回退保留。'
};for(const r of b.auditRows)if(reviews[r.id])r.currentReview=reviews[r.id];
b.revision++;b.updated='2026-10-20';b.next='S08';b.baseline.measurements+=' S04完成三处模拟查询优化，896状态对照/1690回归/四场景浏览器验证；实际纯属性、双击、DOT攻击局部CPU约下降67/64/77%，单独分裂/小酸区无收益保留。来源共享和空间索引扩展未采用；不宣称整场FPS。';
assert.equal(b.tasks.filter(t=>t.status==='已完成').length,26);assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);assert.equal(b.tasks.find(t=>t.id==='S08').status,'待办');
b.updates.push({date:'2026-10-20',tasks:['S04'],change:'待验证→已完成：3生产文件、896状态对照、1690回归、7套真实配装计时及4场景浏览器；保留无收益/回退、酸区夹具及权限失败，5条审计候选均有结论。49项完成26、剩余23；下一项S08未开始。',evidence});await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const hash=report.source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const header=`## S04 装备攻击按需查询完成 · 2026-10-20

- 用户授权“开始S04”。三处生产文件实现附加候选按需生成、弹射每跳单遍最近目标、酸区最大伤害无临时数组、英雄命令复用当次选敌。说明 docs/project/PERFORMANCE_S04_20261020.md，证据 reports/qa/performance-s04-20261020.json；看板修订${b.revision}，49项完成26、剩余23，下一项S08未开始。
- 实际七套配装完整攻击Node CPU：纯属性0.2417→0.0791、双击0.2844→0.1030、DOT0.2426→0.0563ms，约下降67/64/77%，各12/12较快。单独分裂0.1695→0.1745、小酸区0.4939→0.4976无收益/回退保留；不是整场FPS或60FPS验收。
- 1690回归、类型/数据检查、896状态检查点通过；六套实际配装各360实际固定步。派生前候选时点、逐跳存活/归属变化、目标顺序、有限真伤预算、RNG及完整效果保持。预览不跨调用缓存，原生技能伤害查询保留。
- C12新增空间索引和SIM-007来源共享未采用：索引可能滞后当前移动/新生，独立弹道仍持有隔离DTO和冻结关联。过期索引/静态巢与五弹道源移除控制精确，六次深复制不变。酸区仅消除临时数组，无跨命中快照。
- 查尔四场景固定/结束状态、实际绘制与24采样窗口验证；固定截图先于实时窗口。首轮酸区夹具漏清毒爆恢复期失败，R2仅修正诊断前置；另有旧版酸区截图超时，同构建静帧复制复查与旧失败分开。全部原构建/失败和7项环境权限失败保留。原生酸区夹具清恢复期后每源立即三击仅验证重叠，不代表自然冷却或人类通关。
- 最终JS${hash}，443输入，入口preview/performance-s04-20261020-candidate-r2/（4436）；冻结S01/S02输入，排除无关economic-egg改动。未替换Current、提交/推送或发布；五图/画质/300/4∶4∶1/模拟经济/存档延期保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const p of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){let text=await fs.readFile(p,'utf8');const i=text.indexOf('\n'),link=(p.includes('/project/')?'':'project/')+'PERFORMANCE_S04_20261020.md';text=text.slice(0,i+1)+`\n2026-10-20 S04 已完成：[装备攻击按需查询](${link})。896状态对照、1690回归及四场景浏览器，七套配装局部计算与整场FPS分开记录；49项完成26、剩余23，下一项S08。\n\n`+text.slice(i+1).replace(/^\r?\n/,'');await fs.writeFile(p,text);}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
