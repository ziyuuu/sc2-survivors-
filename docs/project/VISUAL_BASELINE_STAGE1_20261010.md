# 画面优化第一阶段：当前基线与复测

本轮执行用户批准的六阶段、九次交付中的第1次：更新当前基线、复核问题与资源清单、建立可重复且可判定有效性的成本证据。材质、阴影、五图美术和特效的正式修复属于后续阶段。本轮不改变正式游戏源码、资源或部署。

## 固定版本与范围

- 正式源码：`07f1d39f5feece18a8599b8f239bcd63370cf732`，包含最新原生战斗 HUD 与皮肤。
- 正式 Web：`5c1a664d68eaa96c356379a8490413ed184351d254898977ae8ddce2c2498756`。
- 资源 release：`2ceccc4865bd761cecc694f47bf39983660c6774cf13ce1ad8c94b4edd4ebbb5`，693条记录、675份唯一内容、668,621,453字节。
- 规则身份仍为战局26、永久档案6、地图recipe3。
- 新诊断源码在 `preview/visual-baseline-20261010`；证据在 `reports/local/visual-baseline-20261010`。原样板、旧实验、失败记录和其他线程工作保留。

旧全量实验基线是 `ae4c2ac`，不能将它的截图、性能或源码身份改标为本次版本。新版与旧版之间的变化，以及可继承的证据，通过资源哈希和源码差异明确记录。

## 两条测量路径

1. **编译后的场景诊断**：直接使用当前 World、BattleRenderer、模型与发布资源，复用旧实验的显式合成编队和候选开关。固定相机、1280×720实际画布、DPR1、native档。诊断页面有独立底栏，不包含正式HUD。18／48／96指指定主体数，不是总实体数，也不是合法招募上限；护航、目标、治疗对象与原生子单位另记。
2. **实际发行 Web**：使用未修改的发行文件、当前原生HUD和公开导入／继续／暂停控件。记录完整页面的帧间隔及真实时钟，单独归档，不用场景诊断代替HUD成本。

场景页先通过真实World推进72 tick准备交战与英雄事件，再冻结可重放起点。每次样本恢复相同Run/Profile，预热后开始测量。计时窗口不截图、不轮询DOM、不反复序列化World。结束后保存完整原始帧、CPU模拟／收集／提交、GPU查询、draw calls、三角形、堆、tick、积债及丢弃时间。

Chrome使用独立测试上下文、可见窗口和实际GPU。每帧记录可见性／焦点，并拒绝隐藏、失焦、资源未完成、WebGL丢失、暂停状态变更和无法解释的低采样。GPU disjoint独立使GPU成本失效。慢帧保留；“样本有效”与“速度达标”分开判断。

## 问题追踪与第二阶段入口

| 项目 | 本轮要核对的证据 | 后续归属 |
|---|---|---|
| 不朽者待机白块与真实护障 | 普通／三个精英的同状态画面、源复合层与各实例状态 | 第2次先行修复，随后全量推广 |
| 狂热者死亡白团 | 原死亡模型、真实死亡事件、开始／后期轨道 | 第2次先行修复 |
| 发光层和非法材质扩展 | 206运行模型的逐材质清单；风险不等同于可见错误 | 第2–3次 |
| 精英配色遮蔽原纹理 | 原始队色区域、实例强调与发光覆盖的区别 | 第3次 |
| 小身体偏暗、步兵高光闪烁 | 战场与近景分开；R16过滤证据仅作局部先行依据 | 第3次及第8次动态验收 |
| 英雄存在时的输出路径切换 | 直接绘制与composer路径、同状态输出对照 | 第2次先统一约定 |
| 真实投影、接触叠黑、分图光照 | 本轮五图现状对照；材质修复后的单项开关成本留到后续，不能沿用旧成本作为默认档批准 | 第4次 |
| 地表重复、基座断裂、场景层次 | 当前五图阶段对照及原工业样板范围 | 第5–6次 |
| 航母子单位血条／载体范围圈 | 子单位血条堆叠在当前截图仍复现；旧敌方黄红地面预警已从主线移除，不再列作待做，玩家技能/攻击环保留 | 第7–8次 |
| P6-V01大范围泛白 | 历史来源不等同于局部死亡模型问题 | 独立重现后才可关闭 |

完整身份与模型风险记录采用机器可读清单；历史Science Vessel源缺口保持开放。原SC2客户端的匹配光照、队色、镜头和连续动作参考仍须实际采集，原文件参数或公开论文不能替代。

## 阈值与结论纪律

新九方向计划提出的P95≤20ms、P99≤33.3ms是候选筛选线，并非正式自然性能验收。既有自然合同继续保留：同机同条件三次180秒，P95≤16.9ms、P99≤20ms、>20ms帧≤1%，新增模拟欠账≤0.1秒且不累积。10秒合成诊断与60秒短时检查均不能关闭该门槛。

正式修复按材质、实例控制、输出、投影、地表、特效分别提交和回退。原M3／DDS只读；原始来源、派生元数据与运行副本各自标明。第一阶段的实验参数不得直接成为发行默认。

## 复现入口

```powershell
node --import tsx preview/visual-baseline-20261010/audit.mts
node node_modules/typescript/bin/tsc --noEmit -p preview/visual-baseline-20261010/tsconfig.json
node --import tsx --test test/visual-baseline-measurement.test.ts
node preview/visual-baseline-20261010/build.mjs
node preview/visual-baseline-20261010/qa.mjs --suite pilot --label new-pilot
node preview/visual-baseline-20261010/qa.mjs --suite baseline --label new-baseline --repeat 3
node --import tsx preview/visual-baseline-20261010/qa-hud.mts --label new-hud --repeat 1 --seconds 60
node preview/visual-baseline-20261010/qa-visual.mjs --label new-visual
node preview/visual-baseline-20261010/qa-visual.mjs --label new-heroes --groups heroes-terran-0,heroes-zerg-0,heroes-protoss-1
node preview/visual-baseline-20261010/summarize.mjs
```

实际执行范围、构建身份、失败与结果以本阶段验证报告和原始JSON为准；命令列表不是通过声明。每轮使用新的label，不覆盖旧记录。

本轮结果见 [阶段验证](VISUAL_BASELINE_STAGE1_VALIDATION_20261010.md) 和 `reports/qa/visual-baseline-stage1-20261010.json`。`qa.mjs --suite candidates` 保留后续单项对照入口，本阶段没有执行候选效果的完整成本矩阵，也没有批准任何候选默认值。审计脚本复跑时传入新的输出目录，保留初始保护快照。
