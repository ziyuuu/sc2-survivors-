import fs from 'node:fs';import assert from 'node:assert/strict';
const dir='reports/local/hero-matrix-20261023',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),a=read(dir+'/analysis.json'),v=read(dir+'/integrity.json');assert.equal(a.complete,true);assert.equal(v.pass,true);
const ds=['easy','normal','hard','hell'],labels={easy:'简单',normal:'普通',hard:'困难',hell:'地狱'},rows=ds.flatMap(d=>fs.readFileSync(dir+'/'+d+'.ndjson','utf8').trim().split('\n').map(JSON.parse)),replay=fs.readFileSync(dir+'/movement-replay.ndjson','utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
assert.equal(replay.length,rows.filter(r=>r.outcome==='timeout').length);
const stats=rs=>['clear','defeat','timeout'].map(k=>rs.filter(r=>r.outcome===k).length).join('／');
const pct=rs=>rs.filter(r=>r.outcome==='clear').length+'/'+rs.length;
let doc=`# 18英雄 × 四难度 × 第3／6／9关补测 · 2026-10-23

已完成2808条唯一主样本：英雄单独1296、四兵加英雄1296、可复用无英雄基线216。另有9条先导与${replay.length}条超时移动重放，不混入主样本。只测量并提出建议，没有修改英雄数值、开放门槛或游戏源码。

## 测量方法与限制

- 全18英雄均为新获得Ⅰ级；简单／普通／困难／地狱，关卡3／6／9，裸装及八槽蓝色属性装。蓝装使用合法最高词条值、每件三条：攻击槽攻击／真实DPS／射程，防御槽防御／生命／减伤，allocation=2；这是强词条蓝装样本，不能代表随机蓝装平均值。
- 对照队伍固定四个普通战斗实体，3／6／9关分别Ⅰ／Ⅱ／Ⅲ级。人族陆战队员；虫族第3关跳虫、后续刺蛇；星灵第3／6关狂热者、第9关追猎者。保留合法前置建筑路径证据；没有声称四人队代表玩家该关正常人口、购买成本或自然成长。432组独立配置重建确认：加入英雄前的四名普通兵与无英雄基线逐项一致，加入英雄后的属性与主样本精确一致；其中152组被原生英雄团队光环立即强化，此增益属于英雄收益，不强制抹平。
- 三种场景：该关Boss单独；该关定时敌群与实际抽中的精英；二者混合。敌群经正式mixCampaignWaves，保留4∶4∶1、弱体强度、出生进度和每成员出场时刻。裸装／蓝装使用相同敌方目录。统一种子102303，无地形障碍，敌人统一从前方12米附近分列入场，未使用正式地图出生点。
- Boss单独场景在0秒放置，但使用正式出生时刻对应的强度；混合场景按原时刻到场。原生World.step、伤害、移动、冷却、技能、召唤物和死亡结算。英雄技能每0.1秒尝试一次，仍遵守原生条件和冷却；普通兵不额外手动施放兵种技能。固定站位，未做走位躲弹或人类反应测试。
- 不生产、不购买、不领取战中卡牌或英雄奖励；原生矿气拾取保留但不消费；暂停原生关卡转换以完成清场测量。Boss场景上限90秒，其余为关时长或最后排队成员出生时刻的较大值再加60秒。“清场”指完整指定目录全部死亡，不等于正式关卡存活到计时结束；战败和超时分别记录。地狱扩张巢、资源运输守卫、趣味事件、特殊关未计入。
- 直接获得英雄仅用于测量当前战力，不证明其在该关合法可得，也不证明英雄能帮助获取自己的首次奖励。现有简单12／普通9／困难及地狱6关Boss死亡开放与既定例外保持。

## 总体结果

以下均按“清场／战败／超时”排列：

| 配置 | 数量 | 结果 |
| --- | ---: | --- |
| 四普通兵 | 216 | ${stats(rows.filter(r=>!r.hero))} |
| 英雄单独 | 1296 | ${stats(rows.filter(r=>r.hero&&!r.members))} |
| 四普通兵＋英雄 | 1296 | ${stats(rows.filter(r=>r.hero&&r.members))} |

1296条英雄队伍与相同条件基线配对：${a.pairs.nonClearToClear}条从基线未清场变为清场，${a.pairs.clearToNonClear}条反向退化，${a.pairs.bothClear}条两者都清场。基线在六位同族英雄间复用，不能把这些配对数当作独立随机胜率样本。

## 每名英雄

各场景24条（四难度×三关×两配装）。表中为清场数／样本数；具体战败和超时见原始数据。

| 英雄 | 单挑Boss | 单独敌群 | 单独混合 | 带队混合 |
| --- | --- | --- | --- | --- |
`;
for(const h of a.heroes){const rs=rows.filter(r=>r.hero===h.hero);doc+=`| ${h.name} | ${pct(rs.filter(r=>!r.members&&r.mode==='boss'))} | ${pct(rs.filter(r=>!r.members&&r.mode==='group'))} | ${pct(rs.filter(r=>!r.members&&r.mode==='mixed'))} | ${pct(rs.filter(r=>r.members&&r.mode==='mixed'))} |\n`;}
doc+='\n## 混合场景分档\n\n每格按清场／战败／超时。基线每格3族，英雄单独及带队每格18英雄。\n\n| 难度 | 关卡 | 配装 | 无英雄 | 英雄单独 | 加英雄 |\n| --- | ---: | --- | --- | --- | --- |\n';
for(const r of a.table.filter(r=>r.mode==='mixed')){const rs=rows.filter(x=>x.mode==='mixed'&&x.difficulty===r.difficulty&&x.stage===r.stage&&x.quality===r.quality);doc+=`| ${labels[r.difficulty]} | ${r.stage} | ${r.quality?'蓝装':'裸装'} | ${stats(rs.filter(x=>!x.hero))} | ${stats(rs.filter(x=>x.hero&&!x.members))} | ${stats(rs.filter(x=>x.hero&&x.members))} |\n`;}
doc+=`\n## 超时移动重放\n\n完整保留${replay.length}条固定站位超时，并对相同样本每0.25秒向最近存活敌人下发原生移动命令，其余口径相同。结果清场／战败／超时为${stats(replay)}。这是控制策略敏感性测试，不替换主矩阵，也不算人类操作验收。存活敌人的种类／地空／位置与英雄剩余生命／护盾见movement-replay.ndjson。\n\n## 验证与留存\n\n${v.sourceUnchanged}个src/test逐SHA保持，Current SHA保持。72个条件单元各39条、唯一键、1296组基础队伍配对、432组原生英雄加入属性重放与全部英雄Ⅰ级检查通过。最初要求加入英雄后属性仍相同的校验被原生团队光环触发；原失败verification-r1.log保留，随后改为验证加入前一致与加入后原生属性精确重放，未更改战斗结果。初次第6关星灵夹具误选尚无已验证前置路径的追猎者，被断言拒绝；未生成该条件有效结果，改为狂热者后完成。早期单进程部分结果与日志保留，后按难度分片续跑去重；没有将中断算战败。\n\n无新游戏构建、浏览器、真机、FPS或全量回归，不重复计算旧2264回归。未修横穿入场缺陷、提交、推送、替换Current或发布；G03最终平衡仍待讨论。\n\n原始数据：reports/local/hero-matrix-20261023/{easy,normal,hard,hell}.ndjson；汇总analysis.json；完整性integrity.json；工具tools/audit-hero-matrix-20261023.mts。\n`;
const fmt=n=>Math.round(n*100)/100;
let bossTable='## 单挑Boss耗时\n\n每行72条：18英雄×四难度；仅Ⅰ级英雄单独作战。计时从Boss放置开始，包含技能前摇和弹道时间。\n\n| 关卡 | 配装 | 清场 | 中位秒数 | 最快—最慢秒数 |\n| --- | --- | --- | ---: | --- |\n';
for(const b of a.bossByQuality)bossTable+=`| ${b.stage} | ${b.quality?'蓝装':'裸装'} | ${b.outcomes.clear??0}/${b.count} | ${fmt(b.median)} | ${b.range.map(fmt).join('—')} |\n`;
doc=doc.replace('## 每名英雄',bossTable+'\n## 每名英雄');
doc=doc.replace('## 验证与留存',`## 建议：先讨论定位，再分项调整\n\n1. **暂时保留当前开放规则。** 本次直接获得英雄用于战力对照，并未验证自然获取概率；第12／15／18关不在本次矩阵内，不能据此判断简单12关门槛的最终平衡，更不能据此提前开放。\n2. **如希望Boss仍有交战过程，优先调整英雄对单体的爆发与持续输出，不统一抬高Boss生命。** 432条英雄单独Boss样本的耗时见上表；无英雄小队本已有战败，统一加厚Boss会同时加重普通队伍负担。具体目标耗时和调整幅度属于待讨论的设计选择，本次没有预设削弱百分比。\n3. **不要统一削弱18英雄的生命、伤害和技能。** 持续敌群表现分化，诺娃／斯旺等已有真实阵亡；对地英雄留下异龙属于能力边界。保留对空队伍和辅助分工，逐名判断需要削弱的通用输出、应保留的短板。\n4. **泽拉图等地面残敌先核查追击／技能行为，再做数值判断。** 原生移动重放仍有地面残敌，尚不能认定是生产缺陷，也不能把超时直接当作伤害不足。\n5. **两种可讨论定位：** 若英雄是后期强力奖励，可接受早中期Boss被迅速处理并保留当前数值；若英雄是队伍核心且希望Boss保有威胁，建议选择上面的逐英雄、逐输出通道调整。基于这批数据，更建议后者，避免一次奖励抹平多数早中期Boss交战，同时保留兵种互补。\n\n## 验证与留存`);
fs.writeFileSync('docs/project/HERO_MATRIX_20261023.md',doc);
fs.writeFileSync('reports/qa/hero-matrix-20261023.json',JSON.stringify({status:'measurement-complete-discussion-pending',productionChanged:false,mainRows:2808,baseline:a.baseline,solo:a.solo,squad:a.squad,pairs:a.pairs,movementReplay:{rows:replay.length,outcomes:stats(replay)},integrity:v,report:'docs/project/HERO_MATRIX_20261023.md',rawRoot:dir,limitations:['single seed','fixed four-body ordinary squads','maximum-affix blue equipment','controlled placement, not natural full campaign','hives and supplemental events excluded','native stage transition held for clearance','not human, browser, FPS or full-regression validation']},null,2));
console.log('Report written');
