# 项目文档导航 · 1.0 MVP / M2

<!-- MVP10_PLANNING_ENTRY -->
**先读[1.0 MVP完整迭代计划](MVP10_ITERATION_PLAN.md)。**M0 r6已获确认，M1与M2实现及验证见[项目管理与任务板](project/README.md)和[M2验证记录](project/M2_VALIDATION.md)。配套稿为[三族天赋](MVP10_TALENTS.md)、[运行/无尽/加载](MVP10_RUNTIME.md)、[精英/英雄/资源优化](MVP10_COMBAT_ASSETS.md)。以下V26材料作为历史依据，不以旧代码倒推新策划。
<!-- /MVP10_PLANNING_ENTRY -->

先读 [当前设计](DESIGN.md)，需要实现时再读 [架构](ARCHITECTURE.md)。数值查 [运行数据参考](GAME_DATA_REFERENCE.md)，验收查 [QA](QA.md)。用户最新确认的规则高于历史设计稿；候选方案不是接入授权。

## 当前有效文档

| 主题 | 入口 | 维护方式 |
| --- | --- | --- |
| 启动与试玩 | [项目README](../README.md) | 面向玩家和开发者的简要入口 |
| 完整玩法 | [DESIGN](DESIGN.md) | 当前已实现规则与已确认范围 |
| 全配置参考 | [GAME_DATA_REFERENCE](GAME_DATA_REFERENCE.md) | `npm run docs:data`生成；`docs:check`查过期 |
| 工程结构 | [ARCHITECTURE](ARCHITECTURE.md) | 模块边界、状态归属、开发工作流 |
| 存档 | [SAVE_SYSTEM](SAVE_SYSTEM.md) | 存档合同、原子写入、恢复与版本 |
| 实施状态 | [MVP任务看板](project/BACKLOG.md)、[ROADMAP](ROADMAP.md) | M0–M7现行状态；旧P0–P7表明确标为历史 |
| M2天赋设计 | [MVP10_TALENTS](MVP10_TALENTS.md) | 已批准的三族165节点、逐层价格、效果和验收基线 |
| V26实施规格 | [BUILD_RESEARCH](BUILD_RESEARCH.md) | 旧三族30普通／15英雄／40精英、9套Build、空投换兵和18关的实施研究；117节点／50点仅为历史运行状态 |
| 旧系统核对 | [SYSTEMS_REVIEW_20260924](SYSTEMS_REVIEW_20260924.md) | 用户先前修订三主线及建筑／卡片的核对记录；现行数值以M0 r6稿为准 |
| 数值来源 | [DATA_SOURCES](DATA_SOURCES.md) | 原版数据、速度换算、本游戏调参分开 |
| 素材准备 | [ASSET_DOWNLOAD_REQUIRED](ASSET_DOWNLOAD_REQUIRED.md) | 本地下载／校验／转换步骤 |
| 原地图 | [MAP_PIPELINE](MAP_PIPELINE.md) | Kairos与Acropolis来源及还原边界 |
| 原动作 | [ANIMATION_EFFECTS](ANIMATION_EFFECTS.md) | 模型、Actor动作、特效与网页适配 |
| QA | [QA](QA.md)、[M2验证记录](project/M2_VALIDATION.md)、[V26 STATUS](../reports/STATUS.json) | 实际执行结果；V26历史证据保留版本标签 |

## 详细设计来源与历史研究

- [TALENT_TREE_V20](TALENT_TREE_V20.md)：旧局永久天赋的历史设计与迁移价格依据；现行天赋以已批准的[M0 r6稿](MVP10_TALENTS.md)为准。117节点见历史源码，不进入M2战局。
- [ENEMY_ELITES_V21](ENEMY_ELITES_V21.md)：精英等级、状态、领主的设计来源；V22开始实装，实际公式以源码为准。
- [DIFFICULTY_AND_TALENTS_PROPOSAL](DIFFICULTY_AND_TALENTS_PROPOSAL.md)：困难／地狱设计来源，旧版“尚未实现”文字不代表现状。
- [BALANCE_12_STAGES](BALANCE_12_STAGES.md)：带假设的经济与火力分析，不是真人通关或当前版本验收。
- [RESEARCH_MAP_LOOT_EARLY_SHOP](RESEARCH_MAP_LOOT_EARLY_SHOP.md)、[ITERATION_V15](ITERATION_V15.md)、[ASSETS_UI.zh-CN](ASSETS_UI.zh-CN.md)：历史研究／迭代材料，不覆盖当前设计。

## 文档更新规则

1. 修改玩法时更新 `DESIGN.md`；改变边界或数据归属时更新 `ARCHITECTURE.md`。
2. 修改 `src/data/` 后运行 `npm run docs:data`，避免手写数值表长期漂移。
3. 只有实际运行过的测试、构建和浏览器检查才能进入 `QA.md` 与 `reports/STATUS.json`。
4. 美术、截图、私有缓存和可玩大包保留本地；公开文档只引用来源路径、散列和文字证据。
5. 后续设想进入 `ROADMAP.md` 并标注候选；未获确认的机制不写成已实现。
