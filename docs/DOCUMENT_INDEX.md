> **入口整理 · 2026-10-27：** 本页保留历史索引和当时的进展快照。当前版本、部署和剩余事项先读 [当前工作导航](project/README.md) 与 [完整交接](project/MVP_TO_1_0_HANDOFF_20261027.md)；下方旧条目的“当前/下一项”不覆盖新结论。

# 完整文档索引

2026-10-21 [D04原开局批次预热补完](project/PERFORMANCE_D04_COMPLETE_20261021.md)：已测三族在前三关完成模型／GPU准备，严重长帧65→7但峰值仍在；缓存即时清理，52项完成46、下一项V01。此前“批次尚未完整”的记录保留其历史含义。

2026-10-21 [D04后磁盘清理与加载范围澄清](project/DISK_CLEANUP_D04_20261021.md)：删除闲置测试缓存和重复整包，旧版本按SHA可还原；原开局批次第三关全部就绪的目标当前尚未满足。

2026-10-21 [C/D盘缓存清理与中特效采用确认](project/DISK_CLEANUP_20261021.md)：清理223个闲置缓存目录，重复素材共享存储再释放约8.21GiB；默认全特效保持，新中档继续采用。

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

2026-10-19 新增：[性能优化看板](project/PERFORMANCE_BOARD.html)、[完整计划表](project/PERFORMANCE_TODO.md)、[唯一任务状态源](project/performance-board.json)。覆盖当前主线优化计划、11 组场景、旧审计 169 条关联与持续更新规则；后续扩项以该看板最新内容为准。

2026-10-16 新增：[装备表现补齐与性能第一阶段](project/EQUIPMENT_EFFECTS_PERFORMANCE_20261016.md)。包含 18 组表现映射、原始资源核验、三族／英雄诊断、独立性能候选及失败记录；30／60 FPS 目标尚未达标。

2026-10-16 当前进度入口：[项目现状与未完成项总盘点](project/PROJECT_STATUS_AUDIT_20261016.md)。覆盖八包、当前源码／预览／0.6.28 交付区别、具体装备表现与趣味清单、全程平衡、性能及最终验收；附代码和构建输入核对快照。旧条目的状态以各自日期为界。

2026-10-16 新增：[密集优化、自适应与普通前三关实施](project/PERFORMANCE_OPTIMIZATION_20261016.md)。绿色喷泉符号修复，三批共享生产优化，固定画质同场景约提升 9%；完整 60 FPS 仍开放。[预览](../preview/performance-20261016/README.md)和[QA](../reports/qa/performance-optimization-20261016.json)。

2026-10-16 最新舰装入口：[R22 原游戏首页、战场与关间](project/STARSHIP_NATIVE_UI_R22_20261016.md)。真实地图无敌人掉落验证，小地图原天赋位置替换背包，关间原生标签，统一图案规格并取消丢弃确认。沿用 [R21 装备规则](project/STARSHIP_FIELD_UI_R21_20261016.md) 与 [R20 显示设置](project/STARSHIP_DISPLAY_SETTINGS_20261016.md)，旧记录保留。

2026-10-16 新增：[舰装 R19：旧版布局复用、页内操作、四种动画与满仓直接分解](project/STARSHIP_UI_POLISH_R19_20261016.md)。本批替代 R18 的 UI 交互和满仓处理，保留 R18 历史记录。

更新：2026-10-14。覆盖 `docs/` 内全部 Markdown 与 JSON 文档；按用途分类，保留原路径。先看 [常用导航](README.md)、[五图确认与下一阶段](project/MVP5_ACCEPTANCE_NEXT_20261014.md)或 [MVP 收尾计划](project/MVP_COMPLETION_CONTRACT_20261013.md)。

**分类不等于批准或完成状态。** 当前范围、候选设计、运行事实、历史证据各有用途；最新用户决定与对应工作记录共同确定效力。旧记录里的本地路径可能已经按批准的清理清单移除，索引不恢复旧成品。

2026-10-16 新增：[舰装 R18 完整 UI、54 张立绘、共用宿主和验证](project/STARSHIP_UI_FLOW_R18_20261015.md)。下方文档数量保留原索引快照含义。

本次共索引 **279 份文档／数据文件**。根目录说明、preview 和 reports 的专用导航另见 [文件夹说明](PROJECT_STRUCTURE.md)。新增文档时将路径和用途加到本索引，避免只创建文件而没有入口。

## 当前导航与收尾约定（10）

这里回答最新范围、顺序、交付入口和文件放置；不是实现完成声明。

| 文件 | 主题 |
| --- | --- |
| [DOCUMENT_INDEX.md](DOCUMENT_INDEX.md) | 完整文档索引 |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | 项目文件夹说明 |
| [README.md](README.md) | 项目文档导航 |
| [project/CURRENT_COZE_HANDOFF_20261006.md](project/CURRENT_COZE_HANDOFF_20261006.md) | 当前应用交接入口 · 2026-10-13 |
| [project/DOCUMENT_MANAGEMENT_20261013.md](project/DOCUMENT_MANAGEMENT_20261013.md) | 文档与项目目录整理 · 2026-10-13 |
| [project/MVP_COMPLETION_CONTRACT_20261013.md](project/MVP_COMPLETION_CONTRACT_20261013.md) | 1.0 MVP 收尾计划与范围约定 |
| [project/MVP5_FULL_MAP_PLAN_20261014.md](project/MVP5_FULL_MAP_PLAN_20261014.md) | 五图小样认可、正式全图分布与接入验收计划 |
| [project/MVP5_ACCEPTANCE_NEXT_20261014.md](project/MVP5_ACCEPTANCE_NEXT_20261014.md) | 完整五图用户确认、冻结版本及建筑／舰装下一阶段安排 |
| [project/MOBILE_SETTINGS_VALIDATION_20261014.md](project/MOBILE_SETTINGS_VALIDATION_20261014.md) | 设置全屏、预下载与横竖屏实现和验证；Safari 专项已排除，真机未验证 |
| [project/MOBILE_SETTINGS_SAFARI_PLAN_20261014.md](project/MOBILE_SETTINGS_SAFARI_PLAN_20261014.md) | 原优化提案；用户只批准前两项，已实现，Safari 专项未执行 |
| [project/README.md](project/README.md) | 项目管理入口 |

## 本次设计输入与已撤回方案（19）

最新三族、趣味和舰装细则。未定参数按依赖定案，后续新增候选不自动扩入 MVP。

| 文件 | 主题 |
| --- | --- |
| [project/PROTOSS_DEVELOPMENT_FLOW_SPEC_20261012.md](project/PROTOSS_DEVELOPMENT_FLOW_SPEC_20261012.md) | 神族发展方向 兵种解锁与折跃水晶规则 |
| [project/RANDOM_EVENTS_ITEMS_CONCEPT_20261009.md](project/RANDOM_EVENTS_ITEMS_CONCEPT_20261009.md) | 随机事件与趣味道具初步设计 |
| [project/ESCORT_WORKERS_SPEC_20261019.md](project/ESCORT_WORKERS_SPEC_20261019.md) | 护送农民完整编码规格；已确认初值、共享调度、跨关、奖励与无尽排除 |
| [project/GUARD_REPAIR_BUILDING_SPEC_20261019.md](project/GUARD_REPAIR_BUILDING_SPEC_20261019.md) | 守卫修复建筑完整编码规格；虫族固定孵化场＋1、现有敌军优先攻击、两波随当前波次、容量预留 |
| [project/INTELLIGENCE_COLLECTION_SPEC_20261019.md](project/INTELLIGENCE_COLLECTION_SPEC_20261019.md) | 情报收集 R4（身份／科技或对应档装备随机）：逐份累计 10 秒，科技／精英／英雄 3—5／6—10／11—15 份；英雄每份 2 精英＋8 普通兵 |
| [project/ELITE_RESCUE_SPEC_20261019.md](project/ELITE_RESCUE_SPEC_20261019.md) | 营救精英 R2：信号 4 秒后双方入场、动态坚守属性与获救恢复、连续守护 15 秒、精英交接与本关协战 |
| [project/TASK_EQUIPMENT_REWARDS_20261019.md](project/TASK_EQUIPMENT_REWARDS_20261019.md) | 虫巢与情报装备奖励：完整掉落策略、随机分支、计划冻结与分层防重 |
| [project/CALL_FLEET_SPEC_20261019.md](project/CALL_FLEET_SPEC_20261019.md) | 谁在呼叫舰队 R2：双精英守军、5 秒停火激活、受击不中断、舰队光标与 300 秒 CD |
| [project/EGG_NIGHTMARE_SPEC_20261019.md](project/EGG_NIGHTMARE_SPEC_20261019.md) | 虫卵噩梦 R2：任务紫卵、精英跳虫／周期爆炸毒爆、禁装备卡牌、农民入账与跨关 |
| [project/HIVE_CLUSTER_SPEC_20261019.md](project/HIVE_CLUSTER_SPEC_20261019.md) | 消灭虫巢群 R2：独立生产与增产、守军资源、每巢精英档装备、跨关和扩张巢隔离 |
| [project/STARSHIP_BLUE_BALANCE_REVIEW_20261014.md](project/STARSHIP_BLUE_BALANCE_REVIEW_20261014.md) | 蓝装套装成本、收益算例与联动资格审查，区分实证与风险 |
| [project/STARSHIP_BLUE_EXPANSION_20261014.md](project/STARSHIP_BLUE_EXPANSION_20261014.md) | 蓝色新增模块、无绿字特殊散件、2/4/6件套与常规属性套 |
| [project/STARSHIP_BLUE_ITEMS_20261014.md](project/STARSHIP_BLUE_ITEMS_20261014.md) | 蓝色完整提案：8属性、18模块及6两件套，全面延续绿色 |
| [project/STARSHIP_BLUE_TWO_PIECE_20261014.md](project/STARSHIP_BLUE_TWO_PIECE_20261014.md) | 四种延续绿色效果的蓝色两件套与三族套装名称提案 |
| [project/STARSHIP_GREEN_ITEMS_20261014.md](project/STARSHIP_GREEN_ITEMS_20261014.md) | 三族普通绿装名称；四特殊槽各两件、每件双效果提案 |
| [project/STARSHIP_WHITE_ITEMS_20261013.md](project/STARSHIP_WHITE_ITEMS_20261013.md) | 三族36个白装模板名、双白字组合与四种特殊槽基础技能 |
| [project/STARSHIP_NAMES_DROPS_20261013.md](project/STARSHIP_NAMES_DROPS_20261013.md) | 三族36个部件名称；四难度必掉与无尽追加，蓝紫／紫橙下位件定义 |
| [project/STARSHIP_GREEN_DESIGN_20261013.md](project/STARSHIP_GREEN_DESIGN_20261013.md) | 十种绿字数值、成色保底与污染极品；普通Ⅵ／Ⅶ成长加强提案 |
| [project/STARSHIP_SPECIAL_ADDITIONS_20261014.md](project/STARSHIP_SPECIAL_ADDITIONS_20261014.md) | 新增反应堆、特殊蓝／污染紫模块与4套家族，槽位、身份及禁止向上合并边界 |
| [project/STARSHIP_ORANGE_MODULES_20261014.md](project/STARSHIP_ORANGE_MODULES_20261014.md) | 已撤回橙装初版：蓝紫延续式12件提案，仅存历史，不再作为当前方案 |
| [project/STARSHIP_ORANGE_INDEPENDENT_R2_20261014.md](project/STARSHIP_ORANGE_INDEPENDENT_R2_20261014.md) | 已撤回推荐：用户指出强度不足的独立机制R2，保留历史 |
| [project/STARSHIP_ORANGE_USER_REVISION_R3_20261014.md](project/STARSHIP_ORANGE_USER_REVISION_R3_20261014.md) | 当前橙装：逐件用户修订、7×7×Ⅸ／英雄高阶、相位继生、本族无上限巨舰、普通8件部分蓝紫继承 |
| [project/STARSHIP_ORANGE_SETS_20261014.md](project/STARSHIP_ORANGE_SETS_20261014.md) | 已确认R2橙套6类：2／4／6件增强、普通Ⅲ／污染Ⅴ英雄持续无硬上限成长、叠加及18英雄／90精英覆盖；未实现 |
| [project/STARSHIP_SETTLEMENT_ELIGIBILITY_PROPOSAL_20261014.md](project/STARSHIP_SETTLEMENT_ELIGIBILITY_PROPOSAL_20261014.md) | 已确认统一资格、容量、转换、复活、继承与事务；混色仅限明确许可，其他上下位替代 |
| [project/STARSHIP_EQUIPMENT_SETTLEMENT_20261014.md](project/STARSHIP_EQUIPMENT_SETTLEMENT_20261014.md) | 用户确认六项结算：幻影、捕获、攻击链、保命、换装状态与克制附伤覆盖 |
| [project/STARSHIP_ELITE_HERO_ALIGNMENT_20261014.md](project/STARSHIP_ELITE_HERO_ALIGNMENT_20261014.md) | 90精英／18英雄对齐现有能力：蓝紫增强通道、支援／子机边界与候选系数 |
| [project/STARSHIP_PURPLE_ITEMS_20261014.md](project/STARSHIP_PURPLE_ITEMS_20261014.md) | 紫装完整评审：29模块、6属性特殊件、旧蓝紫系列与新增紫套、43条合法污染蓝词条池 |
| [project/STARSHIP_SET_DESIGN_20261013.md](project/STARSHIP_SET_DESIGN_20261013.md) | 污染英雄、英雄、生存者与其他新套装系列；确认项与补充提案 |
| [project/STARSHIP_EQUIPMENT_REDESIGN_20261013.md](project/STARSHIP_EQUIPMENT_REDESIGN_20261013.md) | 当前舱体装备设计；12人族栏位、双白字与两组绿字池已定 |
| [project/STARSHIP_LOOT_COMPLETE_DESIGN_20261011.md](project/STARSHIP_LOOT_COMPLETE_DESIGN_20261011.md) | 星舰装备掉落撤离与套装完整设计稿 ；废稿，仅供追溯 |
| [project/STARSHIP_TALENT_MAPPING_20261011.json](project/STARSHIP_TALENT_MAPPING_20261011.json) | 天赋能力映射数据 ；废稿，仅供追溯 |
| [project/MVP3_STARSHIP_DESIGN_PLAN_20261013.md](project/MVP3_STARSHIP_DESIGN_PLAN_20261013.md) | 舰装页面原型与白绿装备设计规划 ；废稿，仅供追溯 |
| [project/STARSHIP_SLOTS_FUNCTION_SPEC_20261013.md](project/STARSHIP_SLOTS_FUNCTION_SPEC_20261013.md) | 旗舰十二槽功能设计提案 ；废稿，仅供追溯 |
| [project/STARSHIP_TALENT_MAPPING_R4_20261013.json](project/STARSHIP_TALENT_MAPPING_R4_20261013.json) | 十二槽能力映射候选数据 ；废稿，仅供追溯 |
| [project/TERRAN_DEVELOPMENT_FLOW_SPEC_20261012.md](project/TERRAN_DEVELOPMENT_FLOW_SPEC_20261012.md) | 人族发展方向 解锁路线与刷新规则 |
| [project/ZERG_DEVELOPMENT_FLOW_SPEC_20261012.md](project/ZERG_DEVELOPMENT_FLOW_SPEC_20261012.md) | 虫族孵化场生产与进化解锁规则 |

## MVP 1 当前对接模块与UI评审（4）

随后已获正式接入授权，当前主游戏与独立入口使用同一份正式规则、UI和原生生产调度器，接入及验证见下表。独立R5和旧R17样例记录保留。

| 文件 | 主题 |
| --- | --- |
| [project/MVP1_INTERMISSION_DESIGN_20261013.md](project/MVP1_INTERMISSION_DESIGN_20261013.md) | 三族关间最小UI改动设计与集中定案表 |
| [project/MVP1_INTERMISSION_DESIGN_VALIDATION_20261013.md](project/MVP1_INTERMISSION_DESIGN_VALIDATION_20261013.md) | 原型交互、布局检查及未实施范围 |
| [project/MVP1_BUILDING_RULES_DECISIONS_20261013.md](project/MVP1_BUILDING_RULES_DECISIONS_20261013.md) | 用户确认的缺项数值、语义与独立对接边界 |
| [project/MVP1_BUILDING_INTEGRATION_VALIDATION_20261013.md](project/MVP1_BUILDING_INTEGRATION_VALIDATION_20261013.md) | 本地冻结正式Web、独立R7、实际验证、历史失败及未关闭范围 |
| [project/MVP1_BUILDING_INTEGRATION_20261013.md](project/MVP1_BUILDING_INTEGRATION_20261013.md) | 主游戏共享状态、交易、生产与三族UI的正式接入及验证 |
| [project/MVP1_BUILDING_CONNECTION_20261013.md](project/MVP1_BUILDING_CONNECTION_20261013.md) | 三族独立模块、接口、UI对齐、实际验证与未挂载范围 |

## MVP 7A 加载与测量（2）

本轮候选比较、实施和验证记录；具体完成状态以文内实际证据为准。

| 文件 | 主题 |
| --- | --- |
| [project/MVP7A_LOADING_20261013.md](project/MVP7A_LOADING_20261013.md) | 加载热点、候选取舍与动画准备实现 |
| [project/MVP7A_LOADING_VALIDATION_20261013.md](project/MVP7A_LOADING_VALIDATION_20261013.md) | 正式测量、正确性、恢复与交付验证 |

## MVP 7B 全局性能准备与密集诊断（3）

2026-10-15 新增研究文档。组合比较、候选来源和实验设计不表示已实施或性能验收通过。

| 文件 | 主题 |
| --- | --- |
| [project/MVP7B_GLOBAL_PERFORMANCE_PREPARATION_20261015.md](project/MVP7B_GLOBAL_PERFORMANCE_PREPARATION_20261015.md) | 系统预算、整体架构组合、关键路径、有限验收矩阵与推进门禁 |
| [project/MVP7B_PERFORMANCE_CANDIDATES_SOURCES_20261015.md](project/MVP7B_PERFORMANCE_CANDIDATES_SOURCES_20261015.md) | 局部候选、代码入口、成熟方案依据、采用条件和历史否决 |
| [project/PERFORMANCE_300_DIAGNOSIS_PROPOSAL_20261016.md](project/PERFORMANCE_300_DIAGNOSIS_PROPOSAL_20261016.md) | 300 敌人 CPU／GPU 实测、保留密度与效果的优化顺序、普通裸装前三关目标；未实施优化 |

## 现有表现与加载底座（26）

近期原版表现、材质、灯光、地形、相机及加载批次，保留对应来源、实际结果和 OPEN；收尾工作在这些底座上继续。

| 文件 | 主题 |
| --- | --- |
| [project/CAMERA_CALIBRATION_20261011.md](project/CAMERA_CALIBRATION_20261011.md) | 镜头定标与直觉缩放 · 2026-10-11 |
| [project/CAMERA_CALIBRATION_VALIDATION_20261011.md](project/CAMERA_CALIBRATION_VALIDATION_20261011.md) | 镜头定标与直觉缩放 · 验证记录 |
| [project/CAMERA_CONTROL_20261011.md](project/CAMERA_CONTROL_20261011.md) | 相机控制、统一血条与小队传送 · 2026-10-11 |
| [project/CAMERA_CONTROL_VALIDATION_20261011.md](project/CAMERA_CONTROL_VALIDATION_20261011.md) | 相机控制、统一血条与小队传送验证 · 2026-10-11 |
| [project/CINEMATIC_PRELOAD_20261012.md](project/CINEMATIC_PRELOAD_20261012.md) | 开屏预算、后台准备与运镜模式 · 2026-10-12 |
| [project/CINEMATIC_PRELOAD_VALIDATION_20261012.md](project/CINEMATIC_PRELOAD_VALIDATION_20261012.md) | 运镜与后台加载验证 · 2026-10-12 |
| [project/COMBAT_EFFECTS_20261012.md](project/COMBAT_EFFECTS_20261012.md) | 原始战斗特效接入 · 2026-10-12 |
| [project/COMBAT_EFFECTS_SOURCES_20261012.md](project/COMBAT_EFFECTS_SOURCES_20261012.md) | 战斗特效来源及身份对应 · 2026-10-12 |
| [project/COMBAT_EFFECTS_VALIDATION_20261012.md](project/COMBAT_EFFECTS_VALIDATION_20261012.md) | 战斗特效 R3 验证与交付 · 2026-10-12 |
| [project/REFRACTION_SCIENCE_20261013.md](project/REFRACTION_SCIENCE_20261013.md) | 原版屏幕折射与科学球修复范围；客户端对照建议 |
| [project/REFRACTION_SCIENCE_SOURCES_20261013.md](project/REFRACTION_SCIENCE_SOURCES_20261013.md) | 原版 type 2 与全息皮肤死亡映射 |
| [project/REFRACTION_SCIENCE_VALIDATION_20261013.md](project/REFRACTION_SCIENCE_VALIDATION_20261013.md) | 本轮实际验证、保留失败与交付状态 |
| [project/LIGHTING_BATCH3_20261010.md](project/LIGHTING_BATCH3_20261010.md) | 第三批：辅助标记清理、五图照明、真实投影与接地 |
| [project/LIGHTING_BATCH3_VALIDATION_20261010.md](project/LIGHTING_BATCH3_VALIDATION_20261010.md) | 第三批视觉修复验证 · 2026-10-10 |
| [project/LOADING_OPTIMIZATION_20261012.md](project/LOADING_OPTIMIZATION_20261012.md) | 开屏预热与加载优化 · 2026-10-12 |
| [project/LOADING_OPTIMIZATION_VALIDATION_20261012.md](project/LOADING_OPTIMIZATION_VALIDATION_20261012.md) | 加载优化验证 · 2026-10-12 |
| [project/MATERIAL_BATCH1_20261010.md](project/MATERIAL_BATCH1_20261010.md) | 第一批材质与单位修复 · 2026-10-10 |
| [project/MATERIAL_BATCH1_VALIDATION_20261010.md](project/MATERIAL_BATCH1_VALIDATION_20261010.md) | 第一批材质与单位修复验证 · 2026-10-10 |
| [project/MATERIAL_BATCH2_20261010.md](project/MATERIAL_BATCH2_20261010.md) | 第二批：全单位材质与精英视觉特色 |
| [project/MATERIAL_BATCH2_IDENTITIES_20261010.md](project/MATERIAL_BATCH2_IDENTITIES_20261010.md) | 第二批逐身份修复表 |
| [project/MATERIAL_BATCH2_VALIDATION_20261010.md](project/MATERIAL_BATCH2_VALIDATION_20261010.md) | 第二批全单位材质与精英特色 · 验证结果 |
| [project/TERRAIN_BATCH4_20261011.md](project/TERRAIN_BATCH4_20261011.md) | 第四批：五图地表与环境 · 2026-10-11 |
| [project/TERRAIN_BATCH4_SOURCES_20261011.md](project/TERRAIN_BATCH4_SOURCES_20261011.md) | 第四批地表与环境来源清单 · 2026-10-11 |
| [project/TERRAIN_BATCH4_VALIDATION_20261011.md](project/TERRAIN_BATCH4_VALIDATION_20261011.md) | 第四批五图地表与环境验证 · 2026-10-11 |
| [project/VISUAL_BASELINE_STAGE1_20261010.md](project/VISUAL_BASELINE_STAGE1_20261010.md) | 画面优化第一阶段：当前基线与复测 |
| [project/VISUAL_BASELINE_STAGE1_VALIDATION_20261010.md](project/VISUAL_BASELINE_STAGE1_VALIDATION_20261010.md) | 画面优化第一阶段验证 · 2026-10-10 |

## 运行与工程参考（9）

解释已有系统与管线；生成数值以当前源码为准，历史状态语句结合对应日期使用。

| 文件 | 主题 |
| --- | --- |
| [ANIMATION_EFFECTS.md](ANIMATION_EFFECTS.md) | V25 英雄参战识别 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 工程架构与开发边界 · V26 |
| [ASSET_DOWNLOAD_REQUIRED.md](ASSET_DOWNLOAD_REQUIRED.md) | 原素材获取与手工交接 |
| [DATA_SOURCES.md](DATA_SOURCES.md) | Fixed game data profile |
| [DESIGN.md](DESIGN.md) | 当前设计基准 · V26三族实施 |
| [GAME_DATA_REFERENCE.md](GAME_DATA_REFERENCE.md) | 当前游戏数据参考 · 三族18关 |
| [MAP_PIPELINE.md](MAP_PIPELINE.md) | 当前五地图与原地图素材管线 |
| [QA.md](QA.md) | 当前迭代验收 |
| [SAVE_SYSTEM.md](SAVE_SYSTEM.md) | 存档机制 · M2 mvp-1.0 |

## 既有任务、规划与验收体系（14）

M0–M7 与当前八包是不同编号体系。保留原计划、审批、状态和看板，不批量改写完成状态。

| 文件 | 主题 |
| --- | --- |
| [MVP10_COMBAT_ASSETS.md](MVP10_COMBAT_ASSETS.md) | 1.0 MVP · 英雄、精英、原素材与包体规格 |
| [MVP10_ELITE_CATALOG.md](MVP10_ELITE_CATALOG.md) | 1.0 MVP 精英三选型补全稿（M0 r6已确认，待实施） |
| [MVP10_ITERATION_PLAN.md](MVP10_ITERATION_PLAN.md) | 通向 1.0 MVP 的完整迭代计划 |
| [MVP10_RUNTIME.md](MVP10_RUNTIME.md) | 1.0 MVP 运行流程、存档、无尽与加载规格 |
| [MVP10_TALENTS.md](MVP10_TALENTS.md) | 1.0 MVP 三族天赋完整设计稿 |
| [ROADMAP.md](ROADMAP.md) | 三族18关实施状态 |
| [project/ACCEPTANCE.md](project/ACCEPTANCE.md) | 1.0 MVP 验收矩阵 |
| [project/APPROVAL_M0_20260924.md](project/APPROVAL_M0_20260924.md) | M0 r6 设计批准记录 |
| [project/BACKLOG.md](project/BACKLOG.md) | 1.0 MVP 任务看板 |
| [project/CHANGELOG.md](project/CHANGELOG.md) | 1.0 MVP 变更记录 |
| [project/DECISIONS.md](project/DECISIONS.md) | 设计决策与待确认项 |
| [project/REVIEW_SNAPSHOT.json](project/REVIEW_SNAPSHOT.json) | 对应批次结构化数据／快照 |
| [project/VALIDATION.md](project/VALIDATION.md) | 本轮规划实际检查 |
| [project/status.json](project/status.json) | 既有 M0–M7 机器任务记录 |

## 舰装历史设计与映射（7）

用于追溯方案演变；后续实现优先读取上面的最新完整稿及无 R 后缀的能力映射。

| 文件 | 主题 |
| --- | --- |
| [project/STARSHIP_LOOT_COMPLETE_DESIGN_R3_20261011.md](project/STARSHIP_LOOT_COMPLETE_DESIGN_R3_20261011.md) | 星舰装备掉落系统完整设计稿 ；废稿，仅供追溯 |
| [project/STARSHIP_LOOT_EQUIPMENT_DESIGN_20261011.md](project/STARSHIP_LOOT_EQUIPMENT_DESIGN_20261011.md) | 星舰装备与天赋掉落系统第一稿 ；废稿，仅供追溯 |
| [project/STARSHIP_LOOT_EQUIPMENT_STRUCTURE_R2_20261011.md](project/STARSHIP_LOOT_EQUIPMENT_STRUCTURE_R2_20261011.md) | 星舰装备三大件与八件套装设计 ；废稿，仅供追溯 |
| [project/STARSHIP_LOOT_MECHANICS_R3_20261011.md](project/STARSHIP_LOOT_MECHANICS_R3_20261011.md) | 星舰装备：白字、绿字与构筑机制修订 ；废稿，仅供追溯 |
| [project/STARSHIP_TALENT_MAPPING_R1_20261011.json](project/STARSHIP_TALENT_MAPPING_R1_20261011.json) | 天赋能力映射数据 ；废稿，仅供追溯 |
| [project/STARSHIP_TALENT_MAPPING_R2_20261011.json](project/STARSHIP_TALENT_MAPPING_R2_20261011.json) | 天赋能力映射数据 ；废稿，仅供追溯 |
| [project/STARSHIP_TALENT_MAPPING_R3_20261011.json](project/STARSHIP_TALENT_MAPPING_R3_20261011.json) | 天赋能力映射数据 ；废稿，仅供追溯 |

## 其他实施、设计与验证批次（154）

按文件查找历史范围、来源、实现或验证。收录不表示全部完成或现仍生效；文件内部的版本、批准依据和限制必须继续阅读。

| 文件 | 主题 |
| --- | --- |
| [project/ADMIN_ANALYTICS_FEEDBACK_PLAN_20260930.md](project/ADMIN_ANALYTICS_FEEDBACK_PLAN_20260930.md) | 管理员统计、玩家数据与意见收集 · 2026-09-30 |
| [project/ARRIVAL_CARDS_DEMO_20261009.md](project/ARRIVAL_CARDS_DEMO_20261009.md) | 精英 / 英雄入队卡面演示 · 2026-10-09 |
| [project/AUTONOMOUS_CAMPAIGN_20260927.md](project/AUTONOMOUS_CAMPAIGN_20260927.md) | Autonomous campaign audit · 2026-09-27 |
| [project/AUTONOMOUS_CLOSEOUT_20260927.md](project/AUTONOMOUS_CLOSEOUT_20260927.md) | MVP自主收尾实施与验证 · 2026-09-27 |
| [project/AUTONOMOUS_INPUT_20260927.md](project/AUTONOMOUS_INPUT_20260927.md) | 自主输入与失败恢复检查 · 2026-09-27 |
| [project/AUTONOMOUS_PERFORMANCE_20260927.md](project/AUTONOMOUS_PERFORMANCE_20260927.md) | 自主收尾：自然性能与资源探测 |
| [project/AUTONOMOUS_SOURCE_20260927.md](project/AUTONOMOUS_SOURCE_20260927.md) | 自主收尾：原 Actor／动作／挂点审计 · 2026-09-27 |
| [project/BATTLE_UI_INTEGRATION_20261008.md](project/BATTLE_UI_INTEGRATION_20261008.md) | 战斗界面样例落地 · 2026-10-08 |
| [project/BATTLE_UI_INTEGRATION_VALIDATION_20261008.md](project/BATTLE_UI_INTEGRATION_VALIDATION_20261008.md) | 战斗界面接入验证 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_20261008.md](project/BATTLE_UI_SAMPLE_20261008.md) | 战斗与基地 UI 实机样例 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R2_20261008.md](project/BATTLE_UI_SAMPLE_R2_20261008.md) | 战斗与基地实机样例 · 第二轮反馈 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R2_VALIDATION_20261008.md](project/BATTLE_UI_SAMPLE_R2_VALIDATION_20261008.md) | 战斗与基地实机样例 · 第二轮验证 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R3_20261008.md](project/BATTLE_UI_SAMPLE_R3_20261008.md) | 战斗与基地实机样例 · 第三轮操作栏 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R3_VALIDATION_20261008.md](project/BATTLE_UI_SAMPLE_R3_VALIDATION_20261008.md) | 战斗与基地实机样例 · 第三轮操作栏验证 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R4_20261008.md](project/BATTLE_UI_SAMPLE_R4_20261008.md) | 战斗与基地实机样例 · 第四轮批注修订 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R4_VALIDATION_20261008.md](project/BATTLE_UI_SAMPLE_R4_VALIDATION_20261008.md) | 战斗与基地实机样例 · 第四轮验证 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R5_20261008.md](project/BATTLE_UI_SAMPLE_R5_20261008.md) | 战斗实机样例 · 小地图补接 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_R5_VALIDATION_20261008.md](project/BATTLE_UI_SAMPLE_R5_VALIDATION_20261008.md) | 战斗实机样例 · 小地图补接验证 · 2026-10-08 |
| [project/BATTLE_UI_SAMPLE_VALIDATION_20261008.md](project/BATTLE_UI_SAMPLE_VALIDATION_20261008.md) | 战斗与基地实机样例检查 · 2026-10-08 |
| [project/BUFF_STRENGTH_AUDIT_20261005.md](project/BUFF_STRENGTH_AUDIT_20261005.md) | 团队增益/减益强度复核 · 2026-10-05 |
| [project/CLEANUP_FIVE_MAPS_20261006.md](project/CLEANUP_FIVE_MAPS_20261006.md) | 清理与五张中心出生地图 · 2026-10-06 |
| [project/CODEX_CLOUD_HANDOFF_20260930.md](project/CODEX_CLOUD_HANDOFF_20260930.md) | Codex云端开发迁移交接 · 2026-09-30 |
| [project/COZE_GITHUB_DEPLOY.md](project/COZE_GITHUB_DEPLOY.md) | Coze升级指南：英雄、死亡与中心扩张地图 |
| [project/CURRENT_LOGIC_CLEANUP_20261006.md](project/CURRENT_LOGIC_CLEANUP_20261006.md) | 唯一当前规则清理 · 2026-10-06 |
| [project/DISK_CLEANUP_20261009.md](project/DISK_CLEANUP_20261009.md) | 项目磁盘清理与 D 盘散落文件核对 · 2026-10-09 |
| [project/ELITE_HERO_REDESIGN_20261003.md](project/ELITE_HERO_REDESIGN_20261003.md) | 90精英与18英雄重设计 · P0 r2 · 2026-10-03 |
| [project/ENTRY_FIXES_20261009.md](project/ENTRY_FIXES_20261009.md) | 加载、投递生命与自适应界面修复 · 2026-10-09 |
| [project/ENTRY_FIXES_VALIDATION_20261009.md](project/ENTRY_FIXES_VALIDATION_20261009.md) | 加载与自适应界面验证 · 2026-10-09 |
| [project/FEEDBACK_F01_F04_VALIDATION_20260927.md](project/FEEDBACK_F01_F04_VALIDATION_20260927.md) | 前四阶段修复 · 工程验证记录 |
| [project/FEEDBACK_F02_IMPLEMENTATION_20260927.md](project/FEEDBACK_F02_IMPLEMENTATION_20260927.md) | F02 动作实现记录 · 2026-09-27 |
| [project/FEEDBACK_F05_F07_VALIDATION_20260927.md](project/FEEDBACK_F05_F07_VALIDATION_20260927.md) | F05—F07 实施验证 · 2026-09-27 |
| [project/FEEDBACK_F05_IMPLEMENTATION_20260927.md](project/FEEDBACK_F05_IMPLEMENTATION_20260927.md) | F05 工人及临时出兵载体实施 · 2026-09-27 |
| [project/FEEDBACK_F06_REAPER_20260927.md](project/FEEDBACK_F06_REAPER_20260927.md) | F06 死神射击排查与 F07 方向独立回归 · 2026-09-27 |
| [project/FEEDBACK_F06_VISUAL_20260927.md](project/FEEDBACK_F06_VISUAL_20260927.md) | F06 英雄表现工程记录 · 2026-09-27 |
| [project/FEEDBACK_F07_PERFORMANCE_20260927.md](project/FEEDBACK_F07_PERFORMANCE_20260927.md) | F07 性能诊断 · 2026-09-27 |
| [project/FEEDBACK_SECOND_PASS_20260928.md](project/FEEDBACK_SECOND_PASS_20260928.md) | 第二轮修复批准稿与执行记录 · 2026-09-28 |
| [project/FIXED_SCENE_PERFORMANCE_20261006.md](project/FIXED_SCENE_PERFORMANCE_20261006.md) | 固定场景性能阶段 · 2026-10-06 |
| [project/FIXED_SCENE_PERFORMANCE_VALIDATION_20261006.md](project/FIXED_SCENE_PERFORMANCE_VALIDATION_20261006.md) | 固定场景性能验证 · 2026-10-06 |
| [project/GIT_BASELINE_20261006.md](project/GIT_BASELINE_20261006.md) | 本地与 Git 基线 · 2026-10-06 |
| [project/HELLION_KNIGHT_FAN_CORRECTION_20261005.md](project/HELLION_KNIGHT_FAN_CORRECTION_20261005.md) | 地狱骑士喷火扇面修正 · 2026-10-05 |
| [project/HERO_AURA_DISPLAY_CORRECTION_20261005.md](project/HERO_AURA_DISPLAY_CORRECTION_20261005.md) | 英雄光环显示纠正 · 2026-10-05 |
| [project/HERO_BALANCE_REDESIGN_20260930.md](project/HERO_BALANCE_REDESIGN_20260930.md) | 18英雄重新定标 · 2026-09-30 |
| [project/HERO_BASIC_EFFECTS_20261003.md](project/HERO_BASIC_EFFECTS_20261003.md) | 六人族英雄普攻表现接入 · 2026-10-03 |
| [project/HERO_CONFIRMED_INTEGRATION_20261005.md](project/HERO_CONFIRMED_INTEGRATION_20261005.md) | 六人族英雄确认版正式接入 · 2026-10-05 |
| [project/HERO_CONFIRMED_VALIDATION_20261005.md](project/HERO_CONFIRMED_VALIDATION_20261005.md) | 六人族英雄确认版 · 正式接入验证 · 2026-10-05 |
| [project/HERO_MAP_CONTENT_AUDIT.md](project/HERO_MAP_CONTENT_AUDIT.md) | 全量身份素材核验 |
| [project/HERO_MAP_PERFORMANCE_20260930.md](project/HERO_MAP_PERFORMANCE_20260930.md) | 最终版本自然帧时复测 · 2026-09-30 |
| [project/HERO_MAP_UI_20260929.md](project/HERO_MAP_UI_20260929.md) | 全量表现、中心扩张地图与UI：英雄强化版（已批准） |
| [project/HERO_MAP_UI_DELIVERY_20260930.md](project/HERO_MAP_UI_DELIVERY_20260930.md) | 本轮交付 · 2026-09-30 |
| [project/HERO_MAP_UI_PAUSED_20260929.md](project/HERO_MAP_UI_PAUSED_20260929.md) | 本轮暂停交接 · 2026-09-29 |
| [project/HERO_MAP_UI_VALIDATION_20260929.md](project/HERO_MAP_UI_VALIDATION_20260929.md) | 英雄表现、中心扩张地图与UI验证 |
| [project/HUD_VISUAL_LANGUAGE_20261003.md](project/HUD_VISUAL_LANGUAGE_20261003.md) | P1 界面反馈修订 · 2026-10-03 |
| [project/INTERMISSION_INTEGRATION_20261009.md](project/INTERMISSION_INTEGRATION_20261009.md) | 新关间 UI 接入 · 2026-10-09 |
| [project/INTERMISSION_INTEGRATION_VALIDATION_20261009.md](project/INTERMISSION_INTEGRATION_VALIDATION_20261009.md) | 新关间 UI 接入验证 · 2026-10-09 |
| [project/INTERMISSION_RULE_REPAIR_PLAN_20261008.md](project/INTERMISSION_RULE_REPAIR_PLAN_20261008.md) | 关间与战斗反馈：十二项核查及修复计划 |
| [project/M1_CLEANUP_PROOF.md](project/M1_CLEANUP_PROOF.md) | M1 旧代码退役核验 |
| [project/M1_RUNTIME_AUDIT.md](project/M1_RUNTIME_AUDIT.md) | M1-01 旧运行路径与替换闭包 |
| [project/M1_VALIDATION.md](project/M1_VALIDATION.md) | M1 实施与验证记录 |
| [project/M2_BASELINE.md](project/M2_BASELINE.md) | M2 开发基线 |
| [project/M2_VALIDATION.md](project/M2_VALIDATION.md) | M2 实施与验证记录 |
| [project/M3_VALIDATION.md](project/M3_VALIDATION.md) | M3 实施与验证记录 |
| [project/M4_VALIDATION.md](project/M4_VALIDATION.md) | M4 实施与验证记录（待成品视觉确认） |
| [project/M5_PROGRESS.md](project/M5_PROGRESS.md) | M5 内容进度与发布前缺口（2026-09-25） |
| [project/M6_PROGRESS.md](project/M6_PROGRESS.md) | M6 包体与普通首关性能进度（2026-09-25） |
| [project/M6_TALENT_TREE_AND_RACE_PROFILE.md](project/M6_TALENT_TREE_AND_RACE_PROFILE.md) | M6 前置修正：三族独立培养与天赋树界面 |
| [project/M7_PREFLIGHT.md](project/M7_PREFLIGHT.md) | M7 工程预检（2026-09-25） |
| [project/MAINTENANCE_SCOPE_20261008.md](project/MAINTENANCE_SCOPE_20261008.md) | 项目精简与十二项反馈审计 |
| [project/MAINTENANCE_VALIDATION_20261008.md](project/MAINTENANCE_VALIDATION_20261008.md) | 维护、清理及反馈审计验证 |
| [project/MAP_VISUAL_POLISH_20261006.md](project/MAP_VISUAL_POLISH_20261006.md) | 五地图视觉补强 · 2026-10-06 |
| [project/MOBILE_COMBAT_FEEDBACK_PLAN_20260930.md](project/MOBILE_COMBAT_FEEDBACK_PLAN_20260930.md) | 手机操作、英雄强度与战斗反馈修复方案 · 2026-09-30 |
| [project/MVP_FEEDBACK_AUDIT_20260927.md](project/MVP_FEEDBACK_AUDIT_20260927.md) | MVP 13项反馈检查记录 · 2026-09-27 |
| [project/MVP_FEEDBACK_F01_F04_APPROVED.md](project/MVP_FEEDBACK_F01_F04_APPROVED.md) | MVP 反馈 F01–F04 · 已批准替代基线 |
| [project/MVP_FEEDBACK_F05_F07_APPROVED.md](project/MVP_FEEDBACK_F05_F07_APPROVED.md) | F05—F07 批准执行基线 · 2026-09-27 |
| [project/MVP_FEEDBACK_PLAN_20260927.md](project/MVP_FEEDBACK_PLAN_20260927.md) | MVP反馈修正落地计划 · 2026-09-27 r1 |
| [project/NATIVE_HUD_INTEGRATION_20261010.md](project/NATIVE_HUD_INTEGRATION_20261010.md) | 原生战斗 HUD 与皮肤接入 · 2026-10-10 |
| [project/NATIVE_HUD_INTEGRATION_VALIDATION_20261010.md](project/NATIVE_HUD_INTEGRATION_VALIDATION_20261010.md) | 原生 HUD 验证与交付 · 2026-10-10 |
| [project/NEXT_ITERATION_P0_20261003.md](project/NEXT_ITERATION_P0_20261003.md) | 下一轮P0统一设计与差异 · 2026-10-03 |
| [project/NEXT_ITERATION_P0_CAPABILITIES_20261003.md](project/NEXT_ITERATION_P0_CAPABILITIES_20261003.md) | P0能力对照表 · 2026-10-03 |
| [project/NEXT_ITERATION_P0_VALIDATION_20261003.md](project/NEXT_ITERATION_P0_VALIDATION_20261003.md) | P0设计交付核对 · 2026-10-03 |
| [project/NEXT_ITERATION_P0_VALUES_20261003.json](project/NEXT_ITERATION_P0_VALUES_20261003.json) | 对应批次结构化数据／快照 |
| [project/NEXT_ITERATION_P1_20261003.md](project/NEXT_ITERATION_P1_20261003.md) | P1 地图、队伍与移动布局 · 2026-10-03 |
| [project/NEXT_ITERATION_P1_VALIDATION_20261003.md](project/NEXT_ITERATION_P1_VALIDATION_20261003.md) | P1 实际验证与成品 · 2026-10-03 |
| [project/NEXT_ITERATION_P2_20261003.md](project/NEXT_ITERATION_P2_20261003.md) | P2 战斗操作与商店诊断 · 2026-10-03 |
| [project/NEXT_ITERATION_P2_VALIDATION_20261003.md](project/NEXT_ITERATION_P2_VALIDATION_20261003.md) | P2 实施与验证 · 2026-10-03 |
| [project/NEXT_ITERATION_P3A_TERRAN_HEROES_20261003.md](project/NEXT_ITERATION_P3A_TERRAN_HEROES_20261003.md) | P3-A 首批：六名人族英雄 · 2026-10-03 |
| [project/NEXT_ITERATION_P3A_VALIDATION_20261003.md](project/NEXT_ITERATION_P3A_VALIDATION_20261003.md) | P3-A 六名人族英雄实施验证 · 2026-10-03 |
| [project/NEXT_ITERATION_P3B_VALIDATION_20261005.md](project/NEXT_ITERATION_P3B_VALIDATION_20261005.md) | 六虫族英雄接入验证 · 2026-10-05 |
| [project/NEXT_ITERATION_P3B_ZERG_HEROES_20261005.md](project/NEXT_ITERATION_P3B_ZERG_HEROES_20261005.md) | 六虫族英雄正式接入 · 2026-10-05 |
| [project/NEXT_ITERATION_P3C_PROTOSS_HEROES_20261005.md](project/NEXT_ITERATION_P3C_PROTOSS_HEROES_20261005.md) | P3-C 神族六英雄正式接入 · 2026-10-05 |
| [project/NEXT_ITERATION_P3C_VALIDATION_20261005.md](project/NEXT_ITERATION_P3C_VALIDATION_20261005.md) | P3-C 神族六英雄接入验证 · 2026-10-05 |
| [project/NEXT_ITERATION_P3_RACE_EFFECTS_20261003.md](project/NEXT_ITERATION_P3_RACE_EFFECTS_20261003.md) | P3 三族英雄特效与战斗机制计划 · 2026-10-03 |
| [project/NEXT_ITERATION_P4A_TERRAN_ELITES_20261005.md](project/NEXT_ITERATION_P4A_TERRAN_ELITES_20261005.md) | P4-A · 人族三十精英正式接入 · 2026-10-05 |
| [project/NEXT_ITERATION_P4A_VALIDATION_20261005.md](project/NEXT_ITERATION_P4A_VALIDATION_20261005.md) | P4-A · 人族三十精英实际验证 · 2026-10-05 |
| [project/NEXT_ITERATION_P4B_VALIDATION_20261005.md](project/NEXT_ITERATION_P4B_VALIDATION_20261005.md) | P4-B · 虫族三十精英实际验证 · 2026-10-05 |
| [project/NEXT_ITERATION_P4B_ZERG_ELITES_20261005.md](project/NEXT_ITERATION_P4B_ZERG_ELITES_20261005.md) | P4-B · 虫族三十精英正式接入 · 2026-10-05 |
| [project/NEXT_ITERATION_P4C_PROTOSS_ELITES_AND_AURAS_20261005.md](project/NEXT_ITERATION_P4C_PROTOSS_ELITES_AND_AURAS_20261005.md) | P4-C · 神族30精英与两族团队光环正式接入 · 2026-10-05 |
| [project/NEXT_ITERATION_P4C_VALIDATION_20261005.md](project/NEXT_ITERATION_P4C_VALIDATION_20261005.md) | P4-C · 神族精英与两族光环实际验证 · 2026-10-05 |
| [project/NEXT_ITERATION_P4DE_20261006.md](project/NEXT_ITERATION_P4DE_20261006.md) | P4-D／E：普通兵、战场支援与综合验证 |
| [project/NEXT_ITERATION_P4DE_VALIDATION_20261006.md](project/NEXT_ITERATION_P4DE_VALIDATION_20261006.md) | P4-D／E 实际验证 |
| [project/NEXT_ITERATION_P4_ELITE_MATRIX_20261005.md](project/NEXT_ITERATION_P4_ELITE_MATRIX_20261005.md) | P4 九十精英逐款数值、机制与效果清单 · 2026-10-05 |
| [project/NEXT_ITERATION_P4_PLAN_20261005.md](project/NEXT_ITERATION_P4_PLAN_20261005.md) | P4 数值、机制、蜘蛛雷与非英雄特效规划 · 2026-10-05 |
| [project/NEXT_ITERATION_P4_SAMPLES_20261005.md](project/NEXT_ITERATION_P4_SAMPLES_20261005.md) | 大型雷与医修样本 · 2026-10-05 |
| [project/NEXT_ITERATION_P4_VALUES_20261005.json](project/NEXT_ITERATION_P4_VALUES_20261005.json) | 对应批次结构化数据／快照 |
| [project/NEXT_ITERATION_P5_20261006.md](project/NEXT_ITERATION_P5_20261006.md) | P5 管理后台、授权统计与反馈 · 本地实现合同 |
| [project/NEXT_ITERATION_P5_VALIDATION_20261006.md](project/NEXT_ITERATION_P5_VALIDATION_20261006.md) | P5 实际验证记录 · 2026-10-06 |
| [project/NEXT_ITERATION_P6_20261006.md](project/NEXT_ITERATION_P6_20261006.md) | P6 本机验证与增量发行 · 2026-10-06 |
| [project/NEXT_ITERATION_P6_VALIDATION_20261006.md](project/NEXT_ITERATION_P6_VALIDATION_20261006.md) | P6 实际验证记录 · 2026-10-06 |
| [project/OPENING_COVER_FLAME_20261007.md](project/OPENING_COVER_FLAME_20261007.md) | 开屏、统一 Logo、封面与扇形恶火 · 2026-10-07 |
| [project/OPENING_COVER_FLAME_VALIDATION_20261007.md](project/OPENING_COVER_FLAME_VALIDATION_20261007.md) | 开屏、流程与立绘修正验证 · 2026-10-07–08 |
| [project/P5_BACKEND_HANDOFF_20261006.md](project/P5_BACKEND_HANDOFF_20261006.md) | P5 本地后端交付与部署交接 · 2026-10-06 |
| [project/P5_PLAYER_DATA_NOTICE_20261006.md](project/P5_PLAYER_DATA_NOTICE_20261006.md) | 玩家数据与反馈：实际实现口径 · 2026-10-06 |
| [project/P6_COZE_DEPLOY_20261006.md](project/P6_COZE_DEPLOY_20261006.md) | P6：从现有 Coze 站点增量升级 · 2026-10-06 |
| [project/PACKAGE_HYGIENE_20260927.md](project/PACKAGE_HYGIENE_20260927.md) | 包体精简准则修正 · 2026-09-27 |
| [project/PLAYER_DATA_NOTICE_DRAFT_20260930.md](project/PLAYER_DATA_NOTICE_DRAFT_20260930.md) | 玩家数据与意见反馈说明（发布拟稿） |
| [project/PROTOSS_HERO_EFFECTS_CORRECTION_20261005.md](project/PROTOSS_HERO_EFFECTS_CORRECTION_20261005.md) | P3神族英雄特效修正 · 2026-10-05 |
| [project/RACE_FUN_CACHE_20260929.md](project/RACE_FUN_CACHE_20260929.md) | 三族独有趣味卡、老玩家快速进入与增量交付 |
| [project/RACE_FUN_CACHE_VALIDATION_20260929.md](project/RACE_FUN_CACHE_VALIDATION_20260929.md) | 三族独有趣味卡、缓存与增量交付验证 |
| [project/RECOVERY_PATCH_20260929.md](project/RECOVERY_PATCH_20260929.md) | 2026-09-29 批准修复：空间、路线、精英与救援 |
| [project/RECOVERY_VALIDATION_20260929.md](project/RECOVERY_VALIDATION_20260929.md) | 2026-09-29 修复验证记录 |
| [project/REPAIRS_459_20261009.md](project/REPAIRS_459_20261009.md) | 第 4、5、9 项修复与已批准入队卡面 · 2026-10-09 |
| [project/REPAIRS_459_VALIDATION_20261009.md](project/REPAIRS_459_VALIDATION_20261009.md) | 第 4、5、9 项修复验证 · 2026-10-09 |
| [project/RESOURCE_DELIVERY_20260928.json](project/RESOURCE_DELIVERY_20260928.json) | 对应批次结构化数据／快照 |
| [project/SC2_CARD_ART_REDO_TARGET_20261005.md](project/SC2_CARD_ART_REDO_TARGET_20261005.md) | 关间卡片立绘重做目标 · 2026-10-05 |
| [project/SC2_CARD_ART_REDO_VALIDATION_20261005.md](project/SC2_CARD_ART_REDO_VALIDATION_20261005.md) | 关间卡片 R11 绘画与静态验证 |
| [project/SC2_INTERMISSION_CARDS_20261005.md](project/SC2_INTERMISSION_CARDS_20261005.md) | 关间选项卡片 · R9／R10 静态设计 |
| [project/SC2_IN_BATTLE_UNIT_PANEL_20261006.md](project/SC2_IN_BATTLE_UNIT_PANEL_20261006.md) | 关内单位属性面板 · R12 · 2026-10-06 |
| [project/SC2_QUALITY_SAMPLE_20261009.md](project/SC2_QUALITY_SAMPLE_20261009.md) | 工业战场画质修复样板 · 2026-10-09 |
| [project/SC2_UI_DESIGN_BASELINE_20261005.md](project/SC2_UI_DESIGN_BASELINE_20261005.md) | SC2 UI 设计基线 · 2026-10-05 |
| [project/SHARED_TECH_CARDS_20260929.md](project/SHARED_TECH_CARDS_20260929.md) | 共享科技、全队卡牌、天赋强化与移动端 · 已批准实施基线 |
| [project/SHARED_TECH_VALIDATION_20260929.md](project/SHARED_TECH_VALIDATION_20260929.md) | 共享科技／全队卡牌迭代：实际验证记录 |
| [project/SWARM_WEB_ITERATION_20260928.md](project/SWARM_WEB_ITERATION_20260928.md) | 交战、虫海、简洁界面与 Web 分离 · 2026-09-28 |
| [project/SWARM_WEB_VALIDATION_20260928.md](project/SWARM_WEB_VALIDATION_20260928.md) | 交战、虫海、界面与 Web 分包：执行记录 |
| [project/TEAM_AURA_REBALANCE_20261005.md](project/TEAM_AURA_REBALANCE_20261005.md) | 虫族、神族团队光环重设计 · 2026-10-05 |
| [project/TEAM_AURA_REBALANCE_COVERAGE_20261005.md](project/TEAM_AURA_REBALANCE_COVERAGE_20261005.md) | 两族60精英的团队效果去向 · 2026-10-05 |
| [project/TEAM_AURA_REBALANCE_VALUES_20261005.json](project/TEAM_AURA_REBALANCE_VALUES_20261005.json) | 对应批次结构化数据／快照 |
| [project/TRACKING_MINES_20261003.md](project/TRACKING_MINES_20261003.md) | 人族蜘蛛雷前置修正 · 2026-10-03 |
| [project/TWIN_SWARM_SC2_HUD_20260928.md](project/TWIN_SWARM_SC2_HUD_20260928.md) | 双生虫群、友军加强与 SC2 控制台 · 已批准实施稿 |
| [project/TWIN_SWARM_VALIDATION_20260928.md](project/TWIN_SWARM_VALIDATION_20260928.md) | 双生虫群与 SC2 控制台：实施及验证 |
| [project/UI_BATTLE_FEEDBACK_20261009.md](project/UI_BATTLE_FEEDBACK_20261009.md) | UI 收口与战斗反馈 · 2026-10-09 |
| [project/UI_BATTLE_FEEDBACK_VALIDATION_20261009.md](project/UI_BATTLE_FEEDBACK_VALIDATION_20261009.md) | UI 与战斗反馈验证 · 2026-10-09 |
| [project/UI_COZE_MAIN_20261007.md](project/UI_COZE_MAIN_20261007.md) | 新 UI 与 Coze 部署分支合并 · 2026-10-07 |
| [project/UI_COZE_MAIN_VALIDATION_20261007.md](project/UI_COZE_MAIN_VALIDATION_20261007.md) | 新 UI 与 Coze 合并验证 · 2026-10-07 |
| [project/UI_FIDELITY_ROUND_20261006.md](project/UI_FIDELITY_ROUND_20261006.md) | UI 原稿逐页还原与控制锚点修复 · 2026-10-06 |
| [project/UI_FIDELITY_ROUND_VALIDATION_20261006.md](project/UI_FIDELITY_ROUND_VALIDATION_20261006.md) | UI 原稿逐页还原与控制点修复验证 · 2026-10-07 |
| [project/UI_FLOW_ART_AUDIT_20261007.md](project/UI_FLOW_ART_AUDIT_20261007.md) | 上一轮 UI 流程与立绘核查 · 2026-10-07 |
| [project/UI_INTEGRATION_20261006.md](project/UI_INTEGRATION_20261006.md) | 正式 UI 接入 |
| [project/UI_INTEGRATION_VALIDATION_20261006.md](project/UI_INTEGRATION_VALIDATION_20261006.md) | 正式 UI 接入验证 · 2026-10-06 |
| [project/VISUAL_ALL_UNIT_MATRIX_20261009.md](project/VISUAL_ALL_UNIT_MATRIX_20261009.md) | 全部单位逐身份前置测试清单 · 2026-10-09 |
| [project/VISUAL_OPTIMIZATION_PLAN_20261009.md](project/VISUAL_OPTIMIZATION_PLAN_20261009.md) | 九方向全量画面优化计划 · 2026-10-09 |
| [project/VISUAL_PLAN_PRETEST_20261009.md](project/VISUAL_PLAN_PRETEST_20261009.md) | 全量画面优化方案前置测试 · 2026-10-09 |
| [project/VISUAL_REPAIR_PLAN_20261008.md](project/VISUAL_REPAIR_PLAN_20261008.md) | 地图 单位与特效完整修复计划 |
| [project/VISUAL_REPAIR_RESEARCH_20261008.md](project/VISUAL_REPAIR_RESEARCH_20261008.md) | 地图 单位与特效修复调研验证记录 |
| [project/WECHAT_MINIGAME_ADAPTATION.md](project/WECHAT_MINIGAME_ADAPTATION.md) | 微信小游戏适配研究与工程基线 |
| [project/WECHAT_WORKBUDDY_HANDOFF.md](project/WECHAT_WORKBUDDY_HANDOFF.md) | WorkBuddy：微信小游戏构建与部署交接 |

## 早期研究与演进记录（9）

保留设计研究与旧版本分析，不作为最新排期，也不把旧实验结论套到当前运行版。

| 文件 | 主题 |
| --- | --- |
| [ASSETS_UI.zh-CN.md](ASSETS_UI.zh-CN.md) | 原版素材与界面接入约定 |
| [BALANCE_12_STAGES.md](BALANCE_12_STAGES.md) | 简单／普通：数值可行性与验证证据 |
| [BUILD_RESEARCH.md](BUILD_RESEARCH.md) | 三族、局内构筑与18关实施规格（V26运行记录） |
| [DIFFICULTY_AND_TALENTS_PROPOSAL.md](DIFFICULTY_AND_TALENTS_PROPOSAL.md) | 困难／地狱与长期天赋树 · V20 设计稿 |
| [ENEMY_ELITES_V21.md](ENEMY_ELITES_V21.md) | 敌方精英等级、领主与状态效果 · V21 设计补充 |
| [ITERATION_V15.md](ITERATION_V15.md) | V15：合批、五兵种、精英与英雄 |
| [RESEARCH_MAP_LOOT_EARLY_SHOP.md](RESEARCH_MAP_LOOT_EARLY_SHOP.md) | 地图、掉落资源、前两关与关间选购研究 |
| [SYSTEMS_REVIEW_20260924.md](SYSTEMS_REVIEW_20260924.md) | 天赋树、建筑升级系统、局内卡片——完整核对稿 |
| [TALENT_TREE_V20.md](TALENT_TREE_V20.md) | 局外天赋树 V20 设计稿 |



## 舰装UI完整命名与制图（19）

| 文件 | 用途 |
| --- | --- |
| [project/STARSHIP_UI_NAMING_20261014.md](project/STARSHIP_UI_NAMING_20261014.md) | 完整命名与制图字段说明；18英雄／90精英／三族全部装备 |
| [project/STARSHIP_ICON_GENERATION_PLAN_20261014.md](project/STARSHIP_ICON_GENERATION_PLAN_20261014.md) | 372张分档建议与历史快照；R9/R10后348张已有、24张未制作，实际橙装排除 |
| [project/STARSHIP_ICON_WHITE_GREEN_20261014.md](project/STARSHIP_ICON_WHITE_GREEN_20261014.md) | R9普通属性图新增18张、复用12张，三族八槽共30张；交付与实际检查，新图待用户确认 |
| [project/STARSHIP_ICON_HERO_COMPONENTS_20261015.md](project/STARSHIP_ICON_HERO_COMPONENTS_20261015.md) | R12新增6张紫色英雄部件，原372张计划全部已有图；新图外观待确认 |
| [project/starship-icon-plan-20261014/execution-r12.json](project/starship-icon-plan-20261014/execution-r12.json) | 原计划底图余0，六张原图／运行图哈希、12711条映射及边界 |
| [project/STARSHIP_ICON_WHITE_GREEN_MODULES_20261015.md](project/STARSHIP_ICON_WHITE_GREEN_MODULES_20261015.md) | R11新增18张白绿模块；累计366张、余6张紫色英雄额外部件；外观待确认 |
| [project/starship-icon-plan-20261014/execution-r11.json](project/starship-icon-plan-20261014/execution-r11.json) | 18张原图、运行图与D盘归档校验；完整白绿258条记录映射 |
| [project/STARSHIP_ICON_BLUE_PURPLE_20261015.md](project/STARSHIP_ICON_BLUE_PURPLE_20261015.md) | R10蓝装与紫色通用318张制图交付、独立图册与实际检查；新图待用户确认 |
| [project/starship-icon-plan-20261014/execution-r10.json](project/starship-icon-plan-20261014/execution-r10.json) | 本轮318张与剩余24个计划键；逐图原件、运行图哈希及生成/复用记录 |
| [project/starship-icon-plan-20261014/execution-r9.json](project/starship-icon-plan-20261014/execution-r9.json) | R9时点执行快照：12张已通过、18张待确认、当时342张未制作；保留逐图路径与哈希 |
| [project/starship-icon-plan-20261014/manifest.json](project/starship-icon-plan-20261014/manifest.json) | 372个逐张制作任务、主题／部件／种族、批次及已通过图片路径 |
| [project/starship-icon-plan-20261014/mapping.json](project/starship-icon-plan-20261014/mapping.json) | 12,711条白绿蓝紫记录到底图的计划映射，保留原装备ID |
| [project/STARSHIP_ICON_REUSE_RULES_20261014.md](project/STARSHIP_ICON_REUSE_RULES_20261014.md) | 前期246张基线及主题别名；后续分档方向和新增预算见最新生成计划 |
| [project/starship-ui-names-20261014/terran.md](project/starship-ui-names-20261014/terran.md) | 人族完整部件明细 |
| [project/starship-ui-names-20261014/protoss.md](project/starship-ui-names-20261014/protoss.md) | 神族完整部件明细 |
| [project/starship-ui-names-20261014/zerg.md](project/starship-ui-names-20261014/zerg.md) | 虫族完整部件明细 |
| [project/starship-ui-names-20261014/bindings.md](project/starship-ui-names-20261014/bindings.md) | 英雄／精英／方向身份前缀全表 |
| [project/starship-ui-names-20261014/catalog.json](project/starship-ui-names-20261014/catalog.json) | 全展开名称、实际品质、绑定、污染与UI图片键 |
| [project/starship-ui-names-20261014/families-and-bindings.json](project/starship-ui-names-20261014/families-and-bindings.json) | 三族家族、模块、英雄与精英命名字典 |
