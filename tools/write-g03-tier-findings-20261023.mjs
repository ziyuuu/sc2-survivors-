import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='reports/local/g03-tier-balance-20261023';
const s=JSON.parse(fs.readFileSync(root+'/summary.json','utf8'));
assert.ok(s.complete&&s.supportRerunsComplete&&s.objectiveRerunsComplete&&s.firepowerRerunsComplete);
const cn={easy:'简单',normal:'普通',hard:'困难',hell:'地狱'};
const count=rs=>({pass:rs.filter(r=>r.stop==='entered-endless').length,lost:rs.filter(r=>r.stop==='lost').length,censored:rs.filter(r=>!['entered-endless','lost','error'].includes(r.stop)).length,error:rs.filter(r=>r.stop==='error').length});
const range=xs=>xs.length?`${Math.min(...xs)}–${Math.max(...xs)}`:'—';
const graduated=['easy','normal','hard','hell'].map(d=>({d,rs:(d==='hell'?s.objectiveReruns:s.rows).filter(r=>r.difficulty===d&&r.tier==='graduation-offense')}));
const table=['| 难度 / 开局毕业候选 | 样本 | 进入无尽 | 战败 | 截断 | 已通关样本死亡事件 | 已通关样本修理矿 |','|---|---:|---:|---:|---:|---:|---:|',...graduated.map(({d,rs})=>{assert.equal(rs.length,6);const c=count(rs),p=rs.filter(r=>r.stop==='entered-endless');return `| ${cn[d]} / ${d==='easy'?'全绿':d==='normal'?'全蓝':d==='hard'?'全紫':'全橙'}进攻候选 | 6 | ${c.pass} | ${c.lost} | ${c.censored} | ${range(p.map(r=>r.deaths.events))} | ${range(p.map(r=>r.recovery.minerals))} |`;})].join('\n');
const hard=s.rows.filter(r=>r.difficulty==='hard'&&r.tier==='entry'),hc=count(hard),hell=s.firepowerReruns,lc=count(hell);
assert.equal(hard.length,6);assert.equal(hell.length,6);
const hellLoss=hell.filter(r=>r.stop==='lost'),objectiveLost=hellLoss.filter(r=>r.final.notice?.includes('扩张虫巢尚未清除'));
const rawBefore=s.rows.filter(r=>r.difficulty==='hell'&&r.tier==='entry'),bc=count(rawBefore);
const firstObjective=s.objectiveReruns.filter(r=>r.tier==='entry'),fc=count(firstObjective);
const exemplar=hell.find(r=>r.id==='terran-hell-entry-530');
const farmMinor=['hard','hell'].flatMap(d=>['farm','minor'].map(t=>{const rs=s.rows.filter(r=>r.difficulty===d&&r.tier===t),c=count(rs);return `${cn[d]}${t==='farm'?'farm':'小毕业'}：${c.pass}通/${c.lost}败/${c.censored}截断`; }));
const sourceNotes='简单/普通/困难进攻候选采用横穿修复版；地狱采用必做扩张目标优先策略及巨兽修复版。每行三族、两种子；不同版本与策略不能合并成玩家胜率。地狱原进攻批、六条生存者重放、两轮开荒控制策略均在后文单列，未择优替换原结果。';
const prose=`本批横穿入场/出口两处缺陷已修复；测量中复现的巨兽支援利维坦技能分派异常也已修复。以下是有限程序测量，开荒顺利进入无尽、毕业平推两个目标仍未整体验收，新价格、概率和难度数值未调整。

${table}

${sourceNotes}“死亡事件”记录非临时友军的原生死亡回调，含英雄复活后的再次死亡；临时召唤体不计。修理费用是已付出的原生费用。通关样本范围不代表失败或截断样本无战损。表中24条进攻候选的最终八槽品质均与开局相同，其中4条发生同品质换装；原生兵力发展和培养照常进行。其他开荒/散件候选允许掉落升级，开局与最终装备逐条列出，不能把升级后的表现全部归因于初始装备。

开荒端：困难6蓝2绿为${hc.pass}/6进入无尽、${hc.lost}战败、${hc.censored}截断；529三条来自入口修复探索版，530三条来自横穿完整修复版。地狱6紫2蓝在多数火力/技能策略下为${lc.pass}/6进入无尽、${lc.lost}战败、${lc.censored}截断；${objectiveLost.length}条失败的原生提示明确为扩张虫巢未清除。之前两套地狱开荒策略分别${bc.pass}通/${bc.lost}败/${bc.censored}截断与${fc.pass}通/${fc.lost}败/${fc.censored}截断，全部保留，不把目标失守直接归结为普通敌人太强。

同一星灵紫蓝开荒装和种子529，原策略第8关失守，必做目标优先策略第16关失守，多数火力/技能策略完成18关并进入无尽。三条起始配装和种子相同，后续事件、拾取与换装会随行动分化，不能称为全过程逐状态单变量对照；但原失败不足以直接推出装备或敌人数值必须调整。

地狱人族开荒530的最终样本仍有${Math.round(exemplar.final.wallet.minerals)}矿、${Math.round(exemplar.final.wallet.gas)}气，但只有${exemplar.final.allies}名非临时友军，补兵回执状态为${JSON.stringify(exemplar.final.reinforcementReceipts)}。这是“钱已支付而增援未到位/未成功领取、兵力减少、目标失守”交织的样本，不能直接用统一加收入或减商价处理；也不把该程序路线当作熟练玩家的证明。原策略曾覆盖必做目标，第一次改进又会在仅一名远程单位够得到时停止接近；这些控制局限已明确记录。多数火力/技能策略仍有保护和领取补给舱、路线与技能时机的局限。

中间档只测第一种子，尚不足以建立可靠的四档通过率曲线。结果为${farmMinor.join('；')}。这些是特定配装和控制路线的观察；英雄抽选、成长、战损和地狱目标处理会改变后续过程。

建议先保持英雄、全局敌人成长、矿气收入和商品价格。进攻协同候选与散件/生存者候选差异明显，直接统一降难度容易扩大毕业端余量。后续取舍建议按以下顺序讨论：

1. **推荐：先不调全局数值。** 以本报告配装作为可复现参考，优先验收开荒路线的补兵舱回收、培养与扩张巢处理；U05承接必要提示。已有失败不足以支持一个可靠的统一降幅。
2. **若用户仍希望降低开荒压力，优先局部候选。** 分别比较补兵到位/保护成本、困难中后段战损和地狱扩张巢血量或处理时间，保持毕业装备及无尽成长上限。具体比例需在批准的候选上做同源对照后确定，当前不宣称某个百分比已验证有效。
3. **不建议统一降低全部敌人或直接增加矿气。** 本批同时存在毕业候选余量较大、开荒补兵未到位及目标处理不足；全局修改可能掩盖这些差异，且本批未测出可靠的统一调整比例。

简单弹幕的人类容错、诱饵定位及自然成长/获取成本仍沿用前一批待讨论项。本批没有重跑它们，也没有把预配装合法等同自然获得容易。G03保持待讨论。
`;
fs.writeFileSync(root+'/findings.md',prose);
console.log(JSON.stringify({graduated:graduated.map(({d,rs})=>({difficulty:d,...count(rs)})),hardEntry:hc,hellEntry:lc,hellObjectiveLosses:objectiveLost.length}));
