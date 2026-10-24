import fs from 'node:fs';import assert from 'node:assert/strict';
const root='reports/local/g03-farm-minor-20261023',s=JSON.parse(fs.readFileSync(root+'/summary-live.json','utf8')),p=JSON.parse(fs.readFileSync(root+'/pressure-analysis.json','utf8'));assert(s.complete&&s.rows.length===24&&s.executionCounts.formal.total===32);assert.equal(p.rows.length,24);assert.equal(p.missing.length,0);
const names={terran:'人族',zerg:'虫族',protoss:'星灵',hard:'困难',hell:'地狱',farm:'farm',minor:'小毕业'},of=(race,difficulty,tier)=>s.rows.filter(r=>r.race===race&&r.difficulty===difficulty&&r.tier===tier),pass=a=>a.filter(r=>r.stop==='entered-endless').length,quality=a=>JSON.stringify(a),label=r=>`${names[r.race]}/${names[r.difficulty]}/${names[r.tier]}/${r.seed}`;
const byRace=['| 种族 | 困难farm进入无尽 | 地狱farm进入无尽 | 困难小毕业：通过；战死事件 | 地狱小毕业：通过；战死事件 |','|---|---:|---:|---|---|',...['terran','zerg','protoss'].map(r=>{const a=of(r,'hard','minor'),b=of(r,'hell','minor');return `| ${names[r]} | ${pass(of(r,'hard','farm'))}/2 | ${pass(of(r,'hell','farm'))}/2 | ${pass(a)}/2；${a.map(x=>x.deathEvents).join(' / ')} | ${pass(b)}/2；${b.map(x=>x.deathEvents).join(' / ')} |`;})].join('\n');
const selectedLosses=s.rows.filter(r=>r.stop==='lost').map(r=>{const d=p.rows.find(x=>x.id===r.id);return `- ${label(r)}：第${r.stage}关，原生结果“${r.notice}”；${r.deathEvents}次死亡事件、终局${r.finalAllies.length}个单位，累计修理${r.repairMinerals}矿/${r.repairGas}气；战斗乘员入队${r.deliveries['body/released']??0}、未入队损失${r.deliveries['body/lost']??0}。死亡按关分布：${JSON.stringify(d.deathsByStage)}。`;}).join('\n');
const comparison=['| 虫族路线 | 原r3结果/死亡 | 修正r4结果/死亡 | 战斗乘员入队：原→新 |','|---|---|---|---|',...s.modeComparison.map(r=>`| ${r.id.replace('after-audited-zerg-','')} | ${r.before.stop}/${r.before.deaths} | ${r.after.stop}/${r.after.deaths} | ${r.before.deliveries['body/released']??0}→${r.after.deliveries['body/released']??0} |`)].join('\n');
const changed=s.rows.filter(r=>quality(r.openingQuality)!==quality(r.finalQuality));
const text=`## 测量结论与建议

按“开荒允许失败、farm应能打通、小毕业/毕业应平推”的最新口径，本次完成消费/增援策略核对和24条最终对照，游戏数值保持。最终${s.counts.entered}进入无尽、${s.counts.lost}战败、${s.counts.censored}截断、0异常；首轮24＋8虫族修正重放共32次正式执行（${s.executionCounts.formal.entered}通/${s.executionCounts.formal.lost}败），另有2条简单星灵诊断，三者口径分开。

${byRace}

这里的“通过”仅指实际进入无尽。farm允许付出战损；小毕业需同时看战损、修理负担和队伍是否持续崩溃，不能要求所有路线零死亡，也不能只凭通过就判定平推。每格只有两个种子，结果不代表人类胜率或全目录最优配装。

地狱farm结果按种子完全分化：529三族全部失败、530三族全部通过。两个种子同时对应frontier与industrial地图主题/布局，并有不同的英雄、事件和成长抽选；这不是只替换地图的一因子对照，不能把差别归结为单一种族或单一数值，也不代表五张地图全部覆盖。

## 失败与后期压力

${selectedLosses}

人族地狱farm529在第18关150秒到时失败，余2单位；星灵困难farm530在第18关约142.57秒全灭，唯一英雄阿拉纳克也在此时阵亡，没有遗漏之后的关间复活窗口。该星灵路线最后三个整备期均实际修理，上一关末仅余3人。星灵地狱farm529则在第18关150秒仍有一座扩张虫巢存活，脚本执行过目标优先分支（861次），终局两位英雄仍活着。现有记录不足以把目标未完成单独归因于火力、到位速度或控制方式。

人族和星灵的四条地狱小毕业均通、均无死亡事件，实际修理矿为653/0/35/73，后期队伍稳定，支持这四份已测候选的低损耗通过判断。困难小毕业中星灵529虽通过，但第17—18关损失10单位；它没有全队濒临消失，仍应保留为平推余量的关注点。虫族以修正版结果和下表为准，旧41次死亡不再直接作为当前小毕业结论。

补齐两条虫族后，地狱小毕业最终6/6通过、六条均0死亡事件、0付费英雄复活；修理矿0–653，第12关起采样队伍最少31人，终局41–58人，六条八槽品质都保持6橙2紫。这批已测候选可暂按低损耗平推目标基本达标；结论只适用于这六条程序路线和当前构筑，不等同人类体验、全目录最优或最终G03验收。

修正版虫族困难小毕业529仍有48次死亡，关末人数在第16、17关均降至1，最终5人进入无尽；其中一位Ⅰ级利维坦英雄存活，另4名为Ⅰ级普通兵。该条八槽还从6紫2蓝提升至7紫1蓝，仍不能称为低压力平推。这条购物架记录中没有出现培养卡，培养乘员释放和英雄是否得到重复培养另见明细；不能拿另一种子0死亡来掩盖这条结果，也不能把原41次死亡全部归因于已修的护仓遗漏。

全队HP比例会受高血量英雄影响：人族地狱farm529即使最后仅余2人，采样全队HP仍未低于50%。本报告同时保留人数、原生死亡事件、修理和交付；不会用加权血量一个指标宣称平推。

控制范围仍有限：原目标行动沿用既有控制器，该分支本身没有专门协调潜伏者的行军/钻地模式；本轮修复的是新增护仓分支的确定遗漏。是否以及多大程度影响各条地狱结果，尚未做独立的因果重放；本轮没有把这项观察登记为游戏缺陷，也不能据相关目标失败直接认定数值不足。目标效率与兵种模式配合仍是后续讨论输入。

该虫族小毕业路线60个未入队战斗乘员损失中，54个是降落仓HP归零，另6个是第12关脚本明确拒收跳虫批次（其中实付合计50矿），不能统称仓被打爆。对应原生调用链和乘员状态变化已保存。

## 虫族护仓模式修正对照

只修测试控制器，停步时恢复原生潜伏者钻地；首轮八条及其工具完整保留。下表每行是同一初始种子和完整开局账户的重放，动作差异会使后续随机抽选分化，因此死亡差额不能当作纯粹单项伤害增益。

${comparison}

八条重放没有改变通败分类，但战损、购买和交付情况改变。修正是否正确由原生模式红绿检查支持，不能以结果必须变好作为判断标准。

## 配装变化与讨论边界

最终24条中${changed.length}条的八槽品质数量发生变化：${changed.map(r=>`${label(r)} ${quality(r.openingQuality)}→${quality(r.finalQuality)}`).join('；')||'无'}。其余路线也可能同品质换装，逐槽ID均已记录。不能把局内掉落升级后的通过完全归给开局装备；这批只验证固定候选和实际成长路径。

简单星灵诊断说明原失败受到测试预算、产线和增援保护策略显著影响；同开局全绿、无英雄已能进入无尽。这不是三族简单的新一轮完整复验，也不支持据原单条失败统一加强星灵。当前数值按授权继续保持；后续讨论优先处理仍失败的farm候选及困难小毕业的后期余量，并区分目标完成效率、交付压力、阵容成长和数值。G03整体及简单弹幕、诱饵等其余事项继续开放。
`;
fs.writeFileSync(root+'/findings.md',text);console.log(JSON.stringify({file:root+'/findings.md',selected:s.counts,formal:s.executionCounts.formal,qualityChanged:changed.length}));
