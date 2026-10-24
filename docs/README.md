# 项目文档导航

2026-10-21 [D04原开局批次预热补完](project/PERFORMANCE_D04_COMPLETE_20261021.md)：已测三族在前三关完成模型／GPU准备，严重长帧65→7但峰值仍在；缓存即时清理，52项完成46、下一项V01。此前“批次尚未完整”的记录保留其历史含义。

2026-10-21 [D02增强中特效完成](project/PERFORMANCE_D02_MEDIUM_20261021.md)：用户批准扩大可选档差异，默认完整效果保持；4对普通首关中位帧间隔21.1→18.1ms，18对GPU约下降37.5–39.5%，非全内容60FPS。看板44/52、剩余8项，下一项D03未开始。

2026-10-21 [D02画质取舍评估就绪](project/PERFORMANCE_D02_REVIEW_20261021.md)：普通无锁血开局3个交火点18对全/中特效，GPU区间约省0.35–0.78ms，CPU无稳定收益；建议保留现有默认及可选档，待用户定案。无生产修改，看板43/52、剩余9项。

2026-10-21 [D01投放时序决策完成](project/PERFORMANCE_D01_DECISION_20261021.md)：按用户决定保持现状，不分帧；人工清场压力不能当作正常卡顿证据。看板43/52，剩余9项，下一项D02尚未开始；无生产修改。

> 2026-10-21：[A03部署缓存调查完成](project/PERFORMANCE_A03_20261021.md)：临时浏览器复现旧类异常，压力对照定位内存缓存回收；按缺失hash补下载及断网图形恢复通过，无生产改动。磁盘预算归D04。看板42/52，下一项D01未开始。


> 2026-10-20：[A02客户端补证完成](project/PERFORMANCE_A02_20261020.md)：奖励单位子池局部144/144对更快，558精确对照、1747回归通过；镜头/据点/英雄查询保留，容量与实际恢复已核。看板41/52，下一项A03未开始；不代表全内容60FPS。


> 2026-10-20：[A01逐条审计完成](project/PERFORMANCE_A01_20261020.md)：169条全部有当前结论与去向，65条占位补齐；66定向回归通过、游戏代码未改。新增A02/A03跟踪原有余项后共52项、完成40、剩余12；下一项A02未开始。审计完成不等于全部性能问题关闭。


> 2026-10-20：[L03 缓存与预览完成](project/PERFORMANCE_L03_20261020.md)；性能看板39/50，下一项A01剩余复核。缓存限额、异步截图与离线按需SHA通过；冷长帧、磁盘预算及总内存边界保留。

2026-10-20 L02完成：[加载分段及等待恢复](project/PERFORMANCE_L02_20261020.md)。1740回归、2834资源块字节对照、Web/离线与失败/上下文恢复通过；总加载与堆峰值未证明稳定下降。A01补7条，50项完成38、剩余12；下一项L03未开始。

2026-10-20 U04完成：[可选统计与遥测](project/PERFORMANCE_U04_20261020.md)。重复显示帧/长账本和超限队列处理已验证，1729回归、386对照及实际浏览器通过；默认入口仍离线，无默认FPS收益。50项完成37、剩余13，A01仍有余项，下一项L02未开始。

2026-10-20 U01/U03完成：[界面与输入优化](project/PERFORMANCE_U01_U03_20261020.md)。同轮HUD展示合并、技能/指针/历史及隐藏投影复用，1725回归与真实界面通过；业务通知保持，首次卡片无稳定收益。50项完成36、剩余14，A01仍有余项，下一项U04未开始。

2026-10-20 R03小合批已完成：[暂停展示与输入优化](project/PERFORMANCE_R03_20261020.md)。静止CPU展示复用、空菜单与重复重置验证通过，GPU全绘制和输入清零保持；非自然FPS收益。50项完成34、剩余16，U03其余子项仍待办，下一项U01未开始。

2026-10-20 R02已完成：[矿气、装备拾取与标签布局](project/PERFORMANCE_R02_20261020.md)。规则/矩阵/标签及真实恢复通过，18/96装备拾取局部CPU约下降17.8/34.9%，保留全部收益与光柱；非整场FPS。50项完成33、剩余17，下一项R03未开始。

2026-10-20 R01已完成：[真实GPU成本与地表零权重采样](project/PERFORMANCE_R01_20261020.md)。1721回归、七场景GPU交替对照、五图交界及实际恢复通过；局部GPU收益、波动/回退和跨会话差异单列，不宣称整场FPS达标。50项完成32、剩余18，下一项R02未开始。

2026-10-20 S07小合批已完成：[密集移动与占位查询](project/PERFORMANCE_S07_20261020.md)。1721回归、917对照、5边界及五场景浏览器通过；A01六条审计与S09回归完成，局部CPU收益/回退和整步无稳定收益分开记录。50项完成31、剩余19，下一项R01未开始。

2026-10-20 S09已完成：[爆虫混编主动接近修复](project/PERFORMANCE_S09_20261020.md)。普通/精英12与24友军混编15秒0→3攻击，临时爆虫一次自爆；1716回归、四场景实际浏览器与24截图核验。新增路径成本不算性能收益。50项完成30、剩余20，下一项S07未开始。

2026-10-20 S06已完成：[出生与落点查询](project/PERFORMANCE_S06_20261020.md)。604状态/边界、1708回归覆盖及8对浏览器状态/16图RGB精确；局部CPU非整场FPS。50项完成29、剩余21，下一项[S09毒爆主动攻击](project/BANELING_S09_DIAGNOSIS_20261020.md)，已核验混编接近停滞、尚未修复。

2026-10-20 S05 已完成：[活动生产与长历史查询](project/PERFORMANCE_S05_20261020.md)。1704回归、1042状态/边界和四场景浏览器；U01仅生产显示子项完成。49项完成28、剩余21，下一项S06。

2026-10-20 S08 已完成：[状态与支援按需查询](project/PERFORMANCE_S08_20261020.md)。1698回归、850+8状态对照及四场景浏览器；U04治疗音频复核保留原实现，统计/遥测待办。49项完成27、剩余22，下一项S05。

2026-10-20 S04 已完成：[装备攻击按需查询](project/PERFORMANCE_S04_20261020.md)。896状态对照、1690回归及四场景浏览器，七套配装局部计算与整场FPS分开记录；49项完成26、剩余23，下一项S08。

2026-10-20 S01／S02 已完成：[战斗查询优化](project/PERFORMANCE_S01_S02_20261020.md)。310状态对照、1684回归及五场景浏览器验证通过，局部计算收益与整场FPS分开记录（主测帧率较低，未证明整场提升）；49项完成25、剩余24，下一项S04。

2026-10-20 X04 已完成：[首次创建与资源池](project/PERFORMANCE_X04_20261020.md)。三族载体构造CPU约下降78–89%，1676回归和实际恢复通过；过期请求过滤无稳定收益已撤回，不宣称整场FPS改善。49项已完成23、剩余26，下一项S01。

2026-10-20 X03 已完成：[粒子动态计算与临时对象](project/PERFORMANCE_X03_20261020.md)。1675回归与真实恢复通过，两场实际请求几何CPU下降约29.45%/14.99%，整场FPS有升有降；X04已采部分代表基线、尚未实施。49项已完成22，剩余27。

2026-10-20 X01／X02 已完成：[源特效求值、实例池与事件索引](project/PERFORMANCE_X01_X02_20261020.md)。1673回归及真实恢复通过，局部CPU收益有证据，整场FPS无稳定提升结论；49项已完成21，剩余28，下一项X03。

2026-10-20 F01／F04／F02 已完成：[特效结束、事件保留与资源释放](project/PERFORMANCE_F01_F04_F02_20261020.md) · [证据](../reports/qa/performance-f01-f04-f02-20261020.json)。光束/医疗目标退出和精英雷提交修正，酸液/建筑循环遗留资源归零；1668回归及真实恢复通过。下一项X01尚未开始。

2026-10-20 S03／L01／F03 已完成：[追踪雷、地图就绪与空技能上传](project/PERFORMANCE_S03_L01_F03_20261019.md) · [证据](../reports/qa/performance-s03-l01-f03-20261019.json)。原卡角修复、热就绪高度读取及空批上传归零；下一项F01尚未开始。

2026-10-19 U02 已完成：[仓库交互修复与优化](project/PERFORMANCE_U02_WAREHOUSE_20261019.md) · [证据](../reports/qa/performance-u02-20261019.json)。搜索异常归零，千件仓库翻页/勾选改善；无匹配搜索回退保留，下一项S03尚未开始。

2026-10-19 F05 已完成：[投影退场与回收修复](project/PERFORMANCE_F05_PROJECTION_CLEANUP_20261019.md) · [证据](../reports/qa/performance-f05-20261019.json)。同口径20个残留投影归零，伤害与效果保持；下一项U02，未宣称FPS目标完成。

2026-10-19 性能优化：[持续更新看板](project/PERFORMANCE_BOARD.html) · [完整计划表与 todo-list](project/PERFORMANCE_TODO.md)。当前基线 main `be9e298`，包含任务状态、优先级、依赖、测试场景、完成标准和更新日志；后续每次性能工作同步维护，历史记录不代表新一轮已验收。

2026-10-16 舰装 UI 已接入普通游戏：[接入、布局修正与预设命名](project/STARSHIP_UI_INTEGRATION_20261016.md)，[最新可操作预览](../preview/starship-integrated-r8-20261016/README.md)。集成分支继承装备分支，支持正常波次和空账户；小地图／文字排版修正，预设可命名。账户与名称仅当前页面保留，存档仍延期；旧 R22 记录为历史。

2026-10-16 装备表现与性能：[共享表现实现、多方案优化和实际限制](project/EQUIPMENT_EFFECTS_PERFORMANCE_20261016.md)。全特效 30 FPS／中特效 60 FPS 尚未达标；正式 UI、存档和发布仍分别跟进。

2026-10-16 当前总状态：[项目现状与未完成项总盘点](project/PROJECT_STATUS_AUDIT_20261016.md)。按八包核对代码、预览与交付：建筑已接入、五图已确认；舰装剩余表现与正式合流、固定趣味清单、完整平衡、7B 和最终验收仍开放。最新命名本地交付仍为 0.6.28；下方带日期的旧设计条目不替代该盘点。

300 敌人性能：[绿色喷泉修复、三批优化、自适应与普通入门实施](project/PERFORMANCE_OPTIMIZATION_20261016.md)，[可操作预览](../preview/performance-20261016/README.md)。同场景固定画质约提升 9%，仍未达到 60 FPS；普通裸装三族×三种子完整前三关 9/9 完成。此前[诊断与提案](project/PERFORMANCE_300_DIAGNOSIS_PROPOSAL_20261016.md)保留历史。

舰装当前 UI：[R22 原游戏首页、真实地图与原关间挂载](project/STARSHIP_NATIVE_UI_R22_20261016.md)，[运行入口](../preview/starship-native-ui-20261016-r22/README.md)。原首页旗舰配装、小地图原天赋位置改背包、关间背包标签；统一装备图规格，丢弃直接执行。沿用 [R21 真实规则](project/STARSHIP_FIELD_UI_R21_20261016.md) 与 [R20 统一显示设置](project/STARSHIP_DISPLAY_SETTINGS_20261016.md)，旧预览保留。

舰装 R19 历史基线：[R19 恢复旧版布局、页内操作、四种动画与满仓直接分解](project/STARSHIP_UI_POLISH_R19_20261016.md)。沿用 R12 外观和后续完整规则；[独立运行入口](../preview/starship-ui-polish-20261016-r19/README.md)。R18 保留为历史版本。

舰装与掉落设计已收口：[规则入口](project/STARSHIP_SETTLEMENT_ELIGIBILITY_PROPOSAL_20261014.md)。共享逻辑与针对性主游戏检查已完成，见[实现记录](project/STARSHIP_LOGIC_IMPLEMENTATION_20261015.md)；关间操作以后续 R21／R22 为准。剩余表现、常规入口正式合流、完整自然循环及 MVP 收尾的保存／失联处理仍开放。

当前设置补丁：应用 0.6.28 已加入画面标签全屏、预下载和横竖屏优化；[实现与验证](project/MOBILE_SETTINGS_VALIDATION_20261014.md)。Safari 加载专项按用户要求排除，真机尚未验证。

UI 制图历史：[R12 英雄部件补齐](project/STARSHIP_ICON_HERO_COMPONENTS_20261015.md)记录当时的白绿蓝紫范围；后续橙装、54 张英雄姿态及 R22 图案规格归一均已有实现，以[最新 UI 记录](project/STARSHIP_NATIVE_UI_R22_20261016.md)为准，不再将 R12 的“橙装排除”当作当前状态。

舰装定案：[统一结算与资格](project/STARSHIP_SETTLEMENT_ELIGIBILITY_PROPOSAL_20261014.md)。明确混色、上下位替代及唯一效果已进入共享规则；后续 UI 操作与满仓规则按 R19／R21／R22 更新，不用设计稿中的实施前状态覆盖当前代码。

橙套设计入口：[六类完整设计与军衔／人数／小队叠加](project/STARSHIP_ORANGE_SETS_20261014.md)。六类套装、18 英雄橙进阶和成长规则已有共享逻辑及针对性验证；追加战斗表现尚未全部完成。

橙装设计：[用户修订 R3：8 普通＋4 污染](project/STARSHIP_ORANGE_USER_REVISION_R3_20261014.md)。初版／R2 不再是当前推荐；相关规则已有实现，橙色不做属性散件。运行限制与后续工作见[总盘点](project/PROJECT_STATUS_AUDIT_20261016.md)。

五图于 2026-10-14 在应用 0.6.27 获[完整内容确认](project/MVP5_ACCEPTANCE_NEXT_20261014.md)，最新命名交付后续为 0.6.28；当前工作区另有尚未正式交付的新功能。总范围仍由[八包收尾计划](project/MVP_COMPLETION_CONTRACT_20261013.md)约束，顺序保持 1 → 3 → 2 → 6 → 7B → 8。旧 M0—M7、P0—P6 文档保留历史含义。

## 常用入口

| 要回答的问题 | 先读 |
| --- | --- |
| 全项目实际进度与未完成项 | [2026-10-16 总盘点](project/PROJECT_STATUS_AUDIT_20261016.md)，区分当前源码、隔离预览和正式交付 |
| 舰装完整 UI、54 张英雄立绘与接入方式 | [最新 R22 实现和验证](project/STARSHIP_NATIVE_UI_R22_20261016.md) · [运行入口](../preview/starship-native-ui-20261016-r22/README.md)；常规发行入口仍未启用整套 UI |
| 设置全屏、预下载与横竖屏切换 | [实现与验证](project/MOBILE_SETTINGS_VALIDATION_20261014.md) · [原计划与用户收窄范围](project/MOBILE_SETTINGS_SAFARI_PLAN_20261014.md)；Safari 专项未执行 |
| 先做什么，做到哪里停止扩项 | [MVP 收尾计划与范围约定](project/MVP_COMPLETION_CONTRACT_20261013.md) |
| 五图是否确认，下一步怎样推进 | [五图用户确认与建筑／舰装下一阶段](project/MVP5_ACCEPTANCE_NEXT_20261014.md) |
| 7B 如何先做全局选择，再筛局部优化 | [全局性能准备](project/MVP7B_GLOBAL_PERFORMANCE_PREPARATION_20261015.md) · [最新有限优化](project/PERFORMANCE_OPTIMIZATION_20261016.md)；已有局部实现，全内容目标仍未达到 |
| 怎样查找全部文档 | [完整文档索引](DOCUMENT_INDEX.md) |
| 文件夹用途、命名和保留规则 | [项目文件夹说明](PROJECT_STRUCTURE.md) |
| 文档与状态怎样维护 | [项目管理入口](project/README.md) |
| 当前包体是什么，实际验证到哪里 | [0.6.28 设置最终交付](project/MOBILE_SETTINGS_VALIDATION_20261014.md) · [五图接受基线](project/MVP5_ACCEPTANCE_NEXT_20261014.md) · [当前应用交接](project/CURRENT_COZE_HANDOFF_20261006.md) |
| 本次整理改了什么 | [文档与目录整理记录](project/DOCUMENT_MANAGEMENT_20261013.md) |

## 本次 MVP 的设计输入

这些是设计和实现的依据入口；部分已经实现，部分仍为候选，实际状态以总盘点和相应实施记录为准。

| 工作 | 设计入口 | 使用边界 |
| --- | --- | --- |
| 1 建筑与生产 | [主游戏正式接入](project/MVP1_BUILDING_INTEGRATION_20261013.md) · [三族独立模块历史](project/MVP1_BUILDING_CONNECTION_20261013.md) · [数值定案](project/MVP1_BUILDING_RULES_DECISIONS_20261013.md) · [人族](project/TERRAN_DEVELOPMENT_FLOW_SPEC_20261012.md) · [虫族](project/ZERG_DEVELOPMENT_FLOW_SPEC_20261012.md) · [神族](project/PROTOSS_DEVELOPMENT_FLOW_SPEC_20261012.md) | 三族已接入同一规则、UI及原生生产；三族共享规则／UI／原生生产已接入；冻结场景交付及验证见接入记录 |
| 3 舰装与界面 | [共享规则实现](project/STARSHIP_LOGIC_IMPLEMENTATION_20261015.md) · [最新 UI 挂载](project/STARSHIP_NATIVE_UI_R22_20261016.md) · [最新操作规则](project/STARSHIP_FIELD_UI_R21_20261016.md) · [装备结算定案](project/STARSHIP_SETTLEMENT_ELIGIBILITY_PROPOSAL_20261014.md) · [装备表现盘点](project/STARSHIP_PRESENTATION_AUDIT_20261015.md) | 三族 12 槽、210 模板和共享规则已有实现；剩余装备表现、常规入口合流、完整循环与最终保存仍开放，历史设计细表继续见完整索引 |
| 2 趣味内容 | [事件与道具设计](project/RANDOM_EVENTS_ITEMS_CONCEPT_20261009.md) | 完整名单已纳入八包范围；后续新增候选默认 1.1 |
| 4 原版表现 | [折射与科学球本轮修复](project/REFRACTION_SCIENCE_20261013.md) · [原版特效底座](project/COMBAT_EFFECTS_20261012.md) · [R3 验证](project/COMBAT_EFFECTS_VALIDATION_20261012.md) | 折射与科学球来源缺口已关闭；以代码、运行和明显显示异常检查验收，不要求 1:1 客户端复刻；密集遮挡后移 |
| 5 五图环境 | [最终交付](project/MVP5_DELIVERY_20261014.md) · [用户确认及后续](project/MVP5_ACCEPTANCE_NEXT_20261014.md) | 正式五图当前环境内容完成，用户集中观看通过；冻结基线，后续仅复验受影响内容 |
| 7A 前置优化 | [7A 实施与候选取舍](project/MVP7A_LOADING_20261013.md) · [7A 验证记录](project/MVP7A_LOADING_VALIDATION_20261013.md) · [既有加载记录](project/LOADING_OPTIMIZATION_20261012.md) | 已完成本地 0.6.26 交付与 74 个测量样本；菜单阻塞与缓存异常保留，完整内容性能在 7B 验收 |
| 7B 全内容性能 | [全局准备](project/MVP7B_GLOBAL_PERFORMANCE_PREPARATION_20261015.md) · [已实现的有限优化](project/PERFORMANCE_OPTIMIZATION_20261016.md) | 局部优化和自适应已接入；完整内容基线在包 6 合流后验证，密集帧率和最终 60 FPS 仍开放 |
| 8 正式发布 | [后台生产交接](project/P5_BACKEND_HANDOFF_20261006.md) · [当前应用交接](project/CURRENT_COZE_HANDOFF_20261006.md) | 本地结果不替代真实生产／B4 |

## 运行与工程参考

| 文档 | 用途 |
| --- | --- |
| [DESIGN](DESIGN.md) | 已有玩法说明；结合后来批准的批次记录阅读，不把旧状态语句当作最新排期 |
| [GAME_DATA_REFERENCE](GAME_DATA_REFERENCE.md) | 从当前源码生成的数值表；用 `npm run docs:data` 更新 |
| [ARCHITECTURE](ARCHITECTURE.md) | World、UI、渲染、数据与持久化的职责边界 |
| [SAVE_SYSTEM](SAVE_SYSTEM.md) | 当前保存、恢复、备份及格式合同；待实施的舰装会话规则另列 |
| [DATA_SOURCES](DATA_SOURCES.md) | 数值来源与素材来源 |
| [ASSET_DOWNLOAD_REQUIRED](ASSET_DOWNLOAD_REQUIRED.md) · [MAP_PIPELINE](MAP_PIPELINE.md) · [ANIMATION_EFFECTS](ANIMATION_EFFECTS.md) | 素材准备、地图和动作管线 |
| [QA](QA.md) · [reports 导航](../reports/README.md) | 分版本验收与本地证据位置；保留实际范围和失败 |
| [preview 导航](../preview/README.md) | UI 原稿、诊断入口与后续独立功能包的位置 |

## 历史与效力

[原 MVP 计划](MVP10_ITERATION_PLAN.md)、[M0–M7 任务板](project/BACKLOG.md)、[任务状态](project/status.json) 和 [ROADMAP](ROADMAP.md) 保留旧阶段记录。它们与本次 MVP 1–8 是不同编号体系；本次不改写旧任务为完成，也不把旧未完成状态机械复制为新任务状态。

文档冲突先看最新用户决定，再看对应范围的当前收尾约定与已批准细则。运行事实查源码、生成参考和绑定到具体构建的验证记录。文件名里的日期、`FINAL`、`VALIDATION` 或一次通过均不等于用户批准、完整验收或线上发布。

新增文档放在既有路径体系并加入索引。已有脚本、交付清单或证据引用的文件保留原路径；用导航和状态说明管理，不批量改名或搬家。详细维护规则见 [项目管理](project/README.md)。
