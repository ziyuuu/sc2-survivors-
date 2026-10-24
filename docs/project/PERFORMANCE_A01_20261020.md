# A01：旧性能审计逐条复核

2026-10-20。用户授权“开始A01的剩余审计吧”。本次已完成全部169条的当前结论和去向：补齐65条占位，复核104条已有批次结论，其中4条重写以明确剩余范围。审计完成不表示169条问题全部修复，也不关闭自然战役、实际输入或全内容60FPS验收。

[性能看板](PERFORMANCE_BOARD.html) · [完整任务表](PERFORMANCE_TODO.md) · [范围报告](../../reports/qa/performance-a01-20261020.json)

## 结论与下一项

当前看板52项，完成40项、剩余12项。原50项中A01完成后为40项；新增两项只用于跟踪原审计已存在、但未在旧完成批次中关闭的余项，不增加玩法或画质范围。

| 分类 | 条数 | 含义 |
| --- | ---: | --- |
| 已解决 | 70 | 原条目对应机制已修，有范围化证据；不等于整场性能达标 |
| 保留现状 | 22 | 当前语义必要或无可靠新收益，明确不改 |
| 待测 | 9 | 当前频度、成本或验收证据仍缺，进入明确任务 |
| 部分解决 | 15 | 已修部分保留，剩余范围有开放任务 |
| 否定 | 16 | 旧断言、归因或验收推论不成立，不把它当待修事实 |
| 待讨论 | 3 | 会改变体验/时序/预载范围，等待原定决定 |
| 不采纳 | 10 | 候选回退、收益不足或缺少正确性依据，保留撤回原因 |
| 证据口径 | 6 | 纠正CPU/GPU、长帧、加载与历史样本的解释，非新增性能补丁 |
| 延期 | 18 | 存档、后端、微信和构建工具按既定范围后置 |

| 后续任务 | 原审计条目 | 剩余内容 |
| --- | --- | --- |
| A02（下一项，未开始） | SIM-008、R04、R06、R15 | 奖励池派生、镜头遍历/布局、屏外据点动画、旧英雄查找及容量；先测当前真实调用与输出，再决定候选 |
| A03（待办） | LOAD-007、L06 | 真实部署缓存命中异常、跨版本磁盘留存/预算；保护活动引用与离线唯一恢复源 |
| D01–D04（待讨论） | 详见逐条去向 | 集中补兵时序、可见性/画质、历史/掉落、预载范围；未实施取舍 |
| D05–D06（暂缓） | 详见逐条去向 | 存档至MVP收尾；后端、微信和构建链另批 |
| V01–V04（待办） | 详见逐条去向 | 最终统一验证、自然战役/无尽、实际输入/用户体验和最终交付 |

## 重点更正

- 无尽普通波当前每轮60秒、4波；精英/Boss的频率因子在300秒后封顶1.2，每类别只保留一个到期模板，失败1秒后重试。旧“无限加快/无限补Boss”描述不成立；ambient/swarm及战役特殊队列集中释放是另一问题，继续D01。
- R04旧mainSet候选在25实体中位回退32%，7对中6对更慢；LOAD-001旧两key循环候选在3000压力回退13.16%。最终外部组合明确排除此二者，不机械移植。
- F03实际实现始终同步实例数量，仅count>0标记矩阵/颜色上传，空层稳态97280字节降到0；没有把它误记为改用commitInstances或局部范围上传。
- 共享纹理、姿态合并、着色器预热、深度材质生命周期等已有修复复用原证据；已撤回加载候选仍保留失败。驱动同步阻塞、异步等待与GPU elapsed分别解释，不能相加。
- 当前普通舰装为memoryOnly；旧存档的重复编码/校验确有后续研究空间，但不重新启动存档工作。后台SQL、微信旧kairos预检及辅助构建清单缺口也不作为玩家战斗FPS结论。
- L03离线1874资产逐一SHA、Web/离线新局与恢复证据可复用；其页面/UI缓存验证不能代替真实部署CacheStorage长期或跨版本预算。

## 核验范围与证据归属

- main仍为be9e2982944314194c6dcc9dcc535bc321749eb4。本次开始快照中的3984个src/test/deploy/tools文件逐字节未改，只新增审计工具、报告和看板记录。
- 当前414个生产输入与L03冻结输入比较：289字节一致、124仅换行差异，另1个economic-egg属于此前其他工作流修改。它未纳入L03性能证据，本次不修改也不宣称已验收其性能。
- 本次66/66定向回归通过，覆盖光环动态失效、当前难度/无尽、固定步欠账、地图定义、材质程序key、共享纹理、缓存失败与更新、HTTP资源和源效果停止。没有重跑整套1745项；L03完整覆盖作为此前证据保留。
- 106个当前源码锚点保存路径、行号、片段及文件SHA；169条保留原sourceCategory/sourceExecution/sourceIntegration，逐条引用文档/QA并明确开放去向。100条沿用既有批次证据，65条补齐、4条既有未结范围更新。
- 没有新浏览器/帧率实验、生产数据库连接、微信真机或存档实验。历史失败、超时、回退、未复现和未覆盖范围不改标通过。

## 169条当前结论

这里的编号属于旧审计，与看板任务编号分属两个命名空间。例如旧R01（材质上传）去向是任务H01，不是任务R01（地表GPU）。证据表可按编号定位；所有条目的原结论见审计前快照。

| 原审计条目 | 当前分类 | 去向 |
| --- | --- | --- |
| [SIM-001 风暴sort比较器反复filter密度](#audit-sim-001) | 已解决 | [S01](PERFORMANCE_TODO.md#s01) |
| [SIM-002 无精英来源仍全表光环扫描](#audit-sim-002) | 已解决 | [H03](PERFORMANCE_TODO.md#h03)、[S08](PERFORMANCE_TODO.md#s08) |
| [SIM-004 Boss女王无伤员逐tick重试全表sort](#audit-sim-004) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [SIM-005 其他Boss无目标全表选目标](#audit-sim-005) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [SIM-006 潜伏者即使不用near仍先展开全表](#audit-sim-006) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [SIM-007 冻结发射source DTO重复深拷贝分配](#audit-sim-007) | 保留现状 | [S04](PERFORMANCE_TODO.md#s04) |
| [SIM-008 奖励池/草案资格重复投影及批量死亡触发扫描](#audit-sim-008) | 待测 | [U01](PERFORMANCE_TODO.md#u01)、[S05](PERFORMANCE_TODO.md#s05)、[A02](PERFORMANCE_TODO.md#a02) |
| [SIM-009 满员积压清场后单tick补176敌](#audit-sim-009) | 部分解决 | [S06](PERFORMANCE_TODO.md#s06)、[D01](PERFORMANCE_TODO.md#d01) |
| [SIM-010 eventPoint备用落点每出生重滤3025网格](#audit-sim-010) | 已解决 | [S06](PERFORMANCE_TODO.md#s06) |
| [SIM-011 swarm每出生全候选reduce](#audit-sim-011) | 保留现状 | [S06](PERFORMANCE_TODO.md#s06) |
| [SIM-012 虫巢每候选展开实体包含尸体](#audit-sim-012) | 已解决 | [S06](PERFORMANCE_TODO.md#s06) |
| [SIM-013 活敌cap不限制尸体/总实体](#audit-sim-013) | 保留现状 | [S07](PERFORMANCE_TODO.md#s07) |
| [SIM-014 密集碰撞和移动规模压力](#audit-sim-014) | 保留现状 | [S07](PERFORMANCE_TODO.md#s07) |
| [SIM-015 原生战役MapTerrain寻路热点缺口](#audit-sim-015) | 部分解决 | [S06](PERFORMANCE_TODO.md#s06)、[V02](PERFORMANCE_TODO.md#v02) |
| [SIM-016 特殊生成即使给定位置仍connectedLocations](#audit-sim-016) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [SIM-017 无尽精英/Boss累计时间加速](#audit-sim-017) | 保留现状 | [D01](PERFORMANCE_TODO.md#d01)、[V02](PERFORMANCE_TODO.md#v02) |
| [SIM-018 普通波无限按wave加速常量加速](#audit-sim-018) | 否定 | [D01](PERFORMANCE_TODO.md#d01) |
| [SIM-019 无尽一tick补任意数量逾期Boss](#audit-sim-019) | 否定 | [D01](PERFORMANCE_TODO.md#d01) |
| [SIM-020 ambient/swarm跨轮队列积压](#audit-sim-020) | 待讨论 | [S06](PERFORMANCE_TODO.md#s06)、[D01](PERFORMANCE_TODO.md#d01) |
| [SIM-021 spawnWave排序整个累计队列](#audit-sim-021) | 保留现状 | [S06](PERFORMANCE_TODO.md#s06) |
| [SIM-022 releaseSwarm.some总与积压长度成正比](#audit-sim-022) | 否定 | [S06](PERFORMANCE_TODO.md#s06) |
| [SIM-023 全部敌人/效果永久不清理](#audit-sim-023) | 否定 | [V01](PERFORMANCE_TODO.md#v01) |
| [FX-001 医疗停疗hostedBeam绕过Death active](#audit-fx-001) | 已解决 | [F01](PERFORMANCE_TODO.md#f01) |
| [FX-002 stoppedUntil旧healTargets继续表现](#audit-fx-002) | 已解决 | [F01](PERFORMANCE_TODO.md#f01)、[F04](PERFORMANCE_TODO.md#f04) |
| [FX-003 同模型mesh池每请求find起点](#audit-fx-003) | 已解决 | [X02](PERFORMANCE_TODO.md#x02) |
| [FX-004 新hit反向复制/find+duplicate/missile扫描](#audit-fx-004) | 已解决 | [X02](PERFORMANCE_TODO.md#x02) |
| [FX-005 Terran旧火焰两处reverse.find](#audit-fx-005) | 已解决 | [X02](PERFORMANCE_TODO.md#x02) |
| [FX-006 其他精英弹道visualEvents.find](#audit-fx-006) | 已解决 | [X02](PERFORMANCE_TODO.md#x02) |
| [FX-007 SourceDrawBatch峰值容量不收缩](#audit-fx-007) | 保留现状 | [X04](PERFORMANCE_TODO.md#x04) |
| [FX-008 粒子逐请求重建与动态字段解释](#audit-fx-008) | 已解决 | [X03](PERFORMANCE_TODO.md#x03) |
| [FX-009 本体/源FX逐实例或quad重复构造同pose材质状态](#audit-fx-009) | 已解决 | [H01](PERFORMANCE_TODO.md#h01) |
| [FX-010 材质费用全部是曲线采样](#audit-fx-010) | 否定 | [H01](PERFORMANCE_TODO.md#h01) |
| [FX-011 source特效全场请求无可见性筛选](#audit-fx-011) | 不采纳 | [R01](PERFORMANCE_TODO.md#r01)、[D02](PERFORMANCE_TODO.md#d02) |
| [FX-012 echo按整个profile最长寿命调度过期模型](#audit-fx-012) | 不采纳 | [X04](PERFORMANCE_TODO.md#x04) |
| [FX-013 空粒子/ribbon/projection仍先算phase/bones](#audit-fx-013) | 已解决 | [X01](PERFORMANCE_TODO.md#x01) |
| [FX-014 首次密集模型clone/材质/骨骼分配](#audit-fx-014) | 保留现状 | [X04](PERFORMANCE_TODO.md#x04) |
| [FX-015 首次酸区创建几何与实例缓冲](#audit-fx-015) | 部分解决 | [F02](PERFORMANCE_TODO.md#f02)、[X04](PERFORMANCE_TODO.md#x04)、[V01](PERFORMANCE_TODO.md#v01) |
| [FX-016 发射器复制对象导致schedule缓存失效](#audit-fx-016) | 否定 | [X03](PERFORMANCE_TODO.md#x03) |
| [FX-017 骨骼phase缓存512项整体清空](#audit-fx-017) | 已解决 | [X01](PERFORMANCE_TODO.md#x01) |
| [FX-018 Boss死后无限源特效泄漏](#audit-fx-018) | 否定 | [F01](PERFORMANCE_TODO.md#f01)、[F02](PERFORMANCE_TODO.md#f02)、[V01](PERFORMANCE_TODO.md#v01) |
| [FX-019 原型300特效同帧step+FX高负载](#audit-fx-019) | 待测 | [B02](PERFORMANCE_TODO.md#b02)、[V01](PERFORMANCE_TODO.md#v01)、[V02](PERFORMANCE_TODO.md#v02) |
| [FX-020 事件768阈值一次裁256可丢未显示事件](#audit-fx-020) | 已解决 | [F04](PERFORMANCE_TODO.md#f04) |
| [FX-021 __name/TSX helper造成绝对耗时偏高](#audit-fx-021) | 证据口径 | [B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01) |
| [SAVE-001 保存完成readArchive只为savedAt整档解码](#audit-save-001) | 延期 | [D05](PERFORMANCE_TODO.md#d05) |
| [SAVE-002 repository/backend/旧备份重复整档验证](#audit-save-002) | 延期 | [D05](PERFORMANCE_TODO.md#d05) |
| [SAVE-003 busy仍在异步队列前同步导出](#audit-save-003) | 延期 | [D05](PERFORMANCE_TODO.md#d05) |
| [SAVE-004 captureRun每次深拷贝整个World](#audit-save-004) | 否定 | [D05](PERFORMANCE_TODO.md#d05) |
| [SAVE-005 历史运输舱/经济记录保留并重复扫描（含女王注射放大）](#audit-save-005) | 部分解决 | [S05](PERFORMANCE_TODO.md#s05)、[D03](PERFORMANCE_TODO.md#d03) |
| [SAVE-006 有效掉落无TTL/合并且tick/frame全扫描](#audit-save-006) | 部分解决 | [R02](PERFORMANCE_TODO.md#r02)、[D03](PERFORMANCE_TODO.md#d03) |
| [SAVE-007 草案每candidate复制整个history再取末2](#audit-save-007) | 已解决 | [S05](PERFORMANCE_TODO.md#s05) |
| [SAVE-008 账本/幂等回执/购买历史长期增长](#audit-save-008) | 部分解决 | [S05](PERFORMANCE_TODO.md#s05)、[D03](PERFORMANCE_TODO.md#d03)、[D05](PERFORMANCE_TODO.md#d05) |
| [SAVE-009 真实IDB大历史出现短帧预算超支](#audit-save-009) | 延期 | [D05](PERFORMANCE_TODO.md#d05) |
| [SAVE-010 无LongTask等于无卡顿](#audit-save-010) | 证据口径 | [B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01) |
| [UI-001 HUD每6tick同步全域更新](#audit-ui-001) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-002 Boss奖励失败也changed导致60Hz通知](#audit-ui-002) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-003 成功批量奖励/落地通知未外层合并](#audit-ui-003) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-004 Roster seats重复allies/family全表扫描](#audit-ui-004) | 否定 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-005 SquadConsole写DOM后读clientWidth/scrollWidth](#audit-ui-005) | 否定 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-006 展开Minimap每通知遍历掉落/实体](#audit-ui-006) | 保留现状 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-007 旧hero-skills冷却整段HTML替换](#audit-ui-007) | 否定 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-008 所有面板/购买历史战斗10Hz重建](#audit-ui-008) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-009 shopProgress observe每更新扫描奖励历史](#audit-ui-009) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [LOAD-001 prepareRosterAssets两key临时数组候选](#audit-load-001) | 不采纳 | [L01](PERFORMANCE_TODO.md#l01) |
| [LOAD-002 重复原纹理解码](#audit-load-002) | 已解决 | [H01](PERFORMANCE_TODO.md#h01)、[V01](PERFORMANCE_TODO.md#v01) |
| [LOAD-003 颜色/深度程序key携带无关资产身份](#audit-load-003) | 已解决 | [V01](PERFORMANCE_TODO.md#v01) |
| [LOAD-004 逐网格反复GPU等待/错误输出目标预热](#audit-load-004) | 已解决 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-005 姿态/多个挂点重复Mixer遍历](#audit-load-005) | 已解决 | [V01](PERFORMANCE_TODO.md#v01) |
| [LOAD-006 菜单同步驱动/解析数秒阻塞](#audit-load-006) | 部分解决 | [L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01) |
| [LOAD-007 缓存键数/命中异常与重新下载](#audit-load-007) | 待测 | [L03](PERFORMANCE_TODO.md#l03)、[A03](PERFORMANCE_TODO.md#a03) |
| [LOAD-008 全部API时间可直接当GPU时间](#audit-load-008) | 证据口径 | [B01](PERFORMANCE_TODO.md#b01)、[R01](PERFORMANCE_TODO.md#r01)、[L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-009 gl.finish为主热点](#audit-load-009) | 不采纳 | [L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01) |
| [LOAD-010 缩短开屏预算一定总体更快](#audit-load-010) | 不采纳 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-011 CPU-only后台一定更快](#audit-load-011) | 不采纳 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-012 同步合并动画优于切片合并](#audit-load-012) | 不采纳 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-013 后台准备完成等于正式ready](#audit-load-013) | 否定 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-014 前轮71.71秒单次实验确定收益](#audit-load-014) | 证据口径 | [V01](PERFORMANCE_TODO.md#v01) |
| [LOAD-015 首用骨骼/纹理/透明过绘真实GPU未知](#audit-load-015) | 证据口径 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-016 离线Base85先全转Blob造成OOM](#audit-load-016) | 已解决 | [L02](PERFORMANCE_TODO.md#l02) |
| [LOAD-017 GLB细bufferView分片能显著省包/加载](#audit-load-017) | 不采纳 | [D06](PERFORMANCE_TODO.md#d06) |
| [LOAD-018 深度预编译提前释放临时材质候选](#audit-load-018) | 否定 | [L03](PERFORMANCE_TODO.md#l03) |
| [LOAD-019 15秒开屏/24可选模型数是硬预算](#audit-load-019) | 否定 | [L02](PERFORMANCE_TODO.md#l02) |
| [GATE-001 早期首关分位合格足以关M6/M7](#audit-gate-001) | 否定 | [V01](PERFORMANCE_TODO.md#v01)、[V02](PERFORMANCE_TODO.md#v02) |
| [GATE-002 自然后期第10/11关峰欠账超线](#audit-gate-002) | 待测 | [V02](PERFORMANCE_TODO.md#v02) |
| [GATE-003 10月6光环遍历优化](#audit-gate-003) | 已解决 | [H03](PERFORMANCE_TODO.md#h03) |
| [GATE-004 10月6缓存程序key/跳空批次候选](#audit-gate-004) | 不采纳 | [F03](PERFORMANCE_TODO.md#f03) |
| [GATE-005 12ms模拟预算硬限制单tick/完整帧](#audit-gate-005) | 否定 | [B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01) |
| [GATE-006 自然高密度/完整内容稳定60FPS](#audit-gate-006) | 待测 | [V01](PERFORMANCE_TODO.md#v01)、[V02](PERFORMANCE_TODO.md#v02)、[V03](PERFORMANCE_TODO.md#v03) |
| [GATE-007 历史P6-V01大范围泛白仍待验收](#audit-gate-007) | 待测 | [V03](PERFORMANCE_TODO.md#v03) |
| [GATE-008 P6自然80点大型编队三次仍超门槛](#audit-gate-008) | 待测 | [V02](PERFORMANCE_TODO.md#v02) |
| [C02 追踪地雷重建障碍数组导致可见图缓存失效](#audit-c02) | 已解决 | [S03](PERFORMANCE_TODO.md#s03) |
| [C03 Reaper/Colossus跨崖失败反复搜索落点与placement](#audit-c03) | 已解决 | [S07](PERFORMANCE_TODO.md#s07) |
| [C04 航母/截击机反复cleanup、母子扫描及属性刷新](#audit-c04) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [C05 精英高阶圣堂未研究风暴仍先全表选目标](#audit-c05) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [C06 Immortal拉扯和Marauder击退反复全表占位检查](#audit-c06) | 已解决 | [S07](PERFORMANCE_TODO.md#s07) |
| [C07 精英Hydralisk扇形弹道重复完整排序只取首项](#audit-c07) | 已解决 | [S02](PERFORMANCE_TODO.md#s02) |
| [C08 Zerg叠加酸区逐区逐敌并重复取同源最大伤害](#audit-c08) | 已解决 | [S04](PERFORMANCE_TODO.md#s04) |
| [PG-019 非空天赋及动态形态反复派生分配](#audit-pg-019) | 保留现状 | [S08](PERFORMANCE_TODO.md#s08) |
| [C12 空间索引没有覆盖所有范围机制](#audit-c12) | 保留现状 | [S04](PERFORMANCE_TODO.md#s04) |
| [C13 状态堆的有效条目数不等于堆大小](#audit-c13) | 已解决 | [S08](PERFORMANCE_TODO.md#s08) |
| [C14 英雄主动目标预览与执行重复查询](#audit-c14) | 已解决 | [S04](PERFORMANCE_TODO.md#s04) |
| [C15 普攻附加弹、链、DOT与被动](#audit-c15) | 已解决 | [S04](PERFORMANCE_TODO.md#s04) |
| [C16 治疗／回盾每tick找伤者，即使没有受益者](#audit-c16) | 已解决 | [S08](PERFORMANCE_TODO.md#s08) |
| [C17 来源缺席仍执行的公共支援扫描](#audit-c17) | 已解决 | [S08](PERFORMANCE_TODO.md#s08) |
| [C18 没有合法目标／落点时的重复搜索](#audit-c18) | 已解决 | [S06](PERFORMANCE_TODO.md#s06) |
| [PG-022 付费英雄被堵时每tick重试落点无退避](#audit-pg-022) | 已解决 | [S06](PERFORMANCE_TODO.md#s06) |
| [C19 手动转移／闪烁落点突发](#audit-c19) | 保留现状 | [S07](PERFORMANCE_TODO.md#s07) |
| [C21 普通障碍绕行图与动态地雷图](#audit-c21) | 保留现状 | [S03](PERFORMANCE_TODO.md#s03)、[S07](PERFORMANCE_TODO.md#s07) |
| [C22 接战/队形缓存命中仍有工作](#audit-c22) | 已解决 | [S07](PERFORMANCE_TODO.md#s07) |
| [C24 敌军路由与老pod查找](#audit-c24) | 保留现状 | [S06](PERFORMANCE_TODO.md#s06) |
| [C25 第18关主巢每个导弹重复整表allies数组](#audit-c25) | 保留现状 | [S02](PERFORMANCE_TODO.md#s02) |
| [R01 材质变化后，下次实际使用纹理时按整容量上传](#audit-r01) | 已解决 | [H01](PERFORMANCE_TODO.md#h01) |
| [R02 每帧多次全 Scene 遍历和材质替换，随隐藏缓存/特效池规模放大](#audit-r02) | 已解决 | [H04](PERFORMANCE_TODO.md#h04)、[R03](PERFORMANCE_TODO.md#r03) |
| [R03 没有当前人族英雄时，仍更新全部六英雄技能空批次](#audit-r03) | 已解决 | [F03](PERFORMANCE_TODO.md#f03) |
| [R04 Auto/cinematic 的候选收集仍每显示帧做全量实体×主队扫描和DOM布局读](#audit-r04) | 待测 | [A02](PERFORMANCE_TODO.md#a02) |
| [R05 酸区几何清理没有释放 InstancedMesh 私有实例缓冲](#audit-r05) | 已解决 | [F02](PERFORMANCE_TODO.md#f02) |
| [R06 据点活体/死亡克隆骨架清理不完整，且屏外 mixer 继续更新](#audit-r06) | 部分解决 | [F02](PERFORMANCE_TODO.md#f02)、[R03](PERFORMANCE_TODO.md#r03)、[A02](PERFORMANCE_TODO.md#a02)、[D02](PERFORMANCE_TODO.md#d02) |
| [R07 Pod / hive死亡首用仍同步克隆、精确骨骼Bounds和ConvexHull](#audit-r07) | 已解决 | [X04](PERFORMANCE_TODO.md#x04) |
| [R08 暂停或无模拟推进的帧仍重做展示CPU、属性上传和后处理](#audit-r08) | 部分解决 | [R03](PERFORMANCE_TODO.md#r03)、[D02](PERFORMANCE_TODO.md#d02) |
| [R09 当前地表在每像素无条件采3/4层双尺度颜色和法线](#audit-r09) | 已解决 | [R01](PERFORMANCE_TODO.md#r01) |
| [R10 阴影联合裁剪使部分屏外单位与摆件仍执行beauty/contact骨骼和绘制](#audit-r10) | 不采纳 | [R01](PERFORMANCE_TODO.md#r01)、[D02](PERFORMANCE_TODO.md#d02) |
| [R11 后处理与分辨率成本始终存在，普通非英雄场景也不绕过](#audit-r11) | 部分解决 | [R01](PERFORMANCE_TODO.md#r01)、[D02](PERFORMANCE_TODO.md#d02) |
| [R15 英雄/旧特效特定规模的次级热点与隐藏输出上限](#audit-r15) | 待测 | [X02](PERFORMANCE_TODO.md#x02)、[R01](PERFORMANCE_TODO.md#r01)、[A02](PERFORMANCE_TODO.md#a02) |
| [R16 正确性附项：精英蜘蛛雷在GPU批次提交之后才add](#audit-r16) | 已解决 | [F04](PERFORMANCE_TODO.md#f04) |
| [L01 P2：发布版菜单前置准备跨种族全部UI，当前清单约65MB](#audit-l01) | 待讨论 | [D04](PERFORMANCE_TODO.md#d04) |
| [L03 P1候选：新战役开局准备完整族谱和未来无尽资源，远超当前出生单位](#audit-l03) | 待讨论 | [D04](PERFORMANCE_TODO.md#d04) |
| [L04 P1候选：巨大离线HTML仍有不可yield的解析、base85与同步inflate片段](#audit-l04) | 部分解决 | [L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01) |
| [L05 P2：离线恢复未核对每asset的SHA字段](#audit-l05) | 已解决 | [L03](PERFORMANCE_TODO.md#l03) |
| [L06 P2：浏览器Blob、解码缓存与跨版本磁盘缓存没有统一字节预算](#audit-l06) | 部分解决 | [L03](PERFORMANCE_TODO.md#l03)、[A03](PERFORMANCE_TODO.md#a03) |
| [L07 P2：必要网络/缓存与后台lane的等待没有统一超时或中止](#audit-l07) | 部分解决 | [L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01) |
| [L09 当前不兼容：微信路径仍是旧Kairos能力预检，不是当前五图可玩版](#audit-l09) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [L10 微信未来链路条件缺口：同步多次校验、hash别名与预算语义](#audit-l10) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [L11 构建成本和历史构建器的版本绑定](#audit-l11) | 延期 | [D06](PERFORMANCE_TODO.md#d06)、[V04](PERFORMANCE_TODO.md#v04) |
| [L12 初始资源缺件已解决：1429文件校验恢复及真实main启动记录](#audit-l12) | 已解决 | [V01](PERFORMANCE_TODO.md#v01) |
| [L13 监控口径限制](#audit-l13) | 证据口径 | [B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01) |
| [PG-002 生产与Zerg第二双生体预留重复扫描同一账本](#audit-pg-002) | 已解决 | [S05](PERFORMANCE_TODO.md#s05) |
| [PG-003 健康双生体仍为维护状态扫描任务乘员](#audit-pg-003) | 已解决 | [S05](PERFORMANCE_TODO.md#s05) |
| [PG-008 Boss轮末回收与队列结算重复过滤整段数组](#audit-pg-008) | 保留现状 | [S05](PERFORMANCE_TODO.md#s05) |
| [PG-011 直接补给放置反复执行有界全局碰撞搜索](#audit-pg-011) | 已解决 | [S06](PERFORMANCE_TODO.md#s06) |
| [PG-012 运输舱落点重试重复地图与历史结构扫描](#audit-pg-012) | 已解决 | [S06](PERFORMANCE_TODO.md#s06) |
| [PG-017 存档DTO验证遍历历史集合及交叉成员关系](#audit-pg-017) | 延期 | [D05](PERFORMANCE_TODO.md#d05) |
| [PG-018 重开、换轮与转无尽有意采用不同重置边界](#audit-pg-018) | 保留现状 | [V03](PERFORMANCE_TODO.md#v03) |
| [PG-020 购买或领取期间重复刷新全部友军属性](#audit-pg-020) | 保留现状 | [S05](PERFORMANCE_TODO.md#s05) |
| [PG-023 无尽入场预览在就绪和提交时重复计算](#audit-pg-023) | 保留现状 | [S06](PERFORMANCE_TODO.md#s06) |
| [UI-ACT-001 PackedConsole同次更新重复主动技能资格查询](#audit-ui-act-001) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-OBS-001 同意遥测后GameObserver每显示帧重复统计](#audit-ui-obs-001) | 已解决 | [U04](PERFORMANCE_TODO.md#u04) |
| [UI-LAYOUT-001 当前PackedConsole写DOM后同步读尺寸](#audit-ui-layout-001) | 保留现状 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-PAD-001 已连接手柄每帧重复技能页资格计算](#audit-ui-pad-001) | 已解决 | [U03](PERFORMANCE_TODO.md#u03) |
| [UI-PAD-002 手柄空输入菜单仍枚举全部控件布局](#audit-ui-pad-002) | 已解决 | [U03](PERFORMANCE_TODO.md#u03) |
| [UI-SKIN-001 关间皮肤MutationObserver构建完整视图投影](#audit-ui-skin-001) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-PICK-001 同次指针事件重复inspect与拾取射线](#audit-ui-pick-001) | 已解决 | [U03](PERFORMANCE_TODO.md#u03) |
| [UI-PREVIEW-001 地图预览同步WebP编码和localStorage写入](#audit-ui-preview-001) | 部分解决 | [L03](PERFORMANCE_TODO.md#l03)、[V01](PERFORMANCE_TODO.md#v01) |
| [UI-CACHE-001 地图预览和overlayScroll跨局缓存无上限](#audit-ui-cache-001) | 已解决 | [L03](PERFORMANCE_TODO.md#l03) |
| [UI-INPUT-001 资源阻塞帧重复输入reset与DOM写入](#audit-ui-input-001) | 已解决 | [U03](PERFORMANCE_TODO.md#u03) |
| [UI-HIDDEN-001 隐藏生产详情仍构造分组和账本HTML](#audit-ui-hidden-001) | 已解决 | [U01](PERFORMANCE_TODO.md#u01) |
| [UI-AUDIO-001 音频事件与治疗loop扫描；loop未纳入普通voice上限](#audit-ui-audio-001) | 保留现状 | [U04](PERFORMANCE_TODO.md#u04) |
| [PST-001 导入预览与提交重复完整验证和深拷贝](#audit-pst-001) | 延期 | [D05](PERFORMANCE_TODO.md#d05) |
| [PST-002 返回标题时完整存档编码解码往返](#audit-pst-002) | 部分解决 | [H05](PERFORMANCE_TODO.md#h05)、[D05](PERFORMANCE_TODO.md#d05) |
| [TEL-001 遥测队列修剪与组包反复全量序列化](#audit-tel-001) | 已解决 | [U04](PERFORMANCE_TODO.md#u04) |
| [B01 指标缓存频繁整体失效且同key并发缺失会重复14条查询](#audit-b01) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B02 全量阶段JSON拉取及逐阶段平方搭配生成，500输出限额不限制前置工作](#audit-b02) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B03 事件批次内部逐事件串行多次往返](#audit-b03) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B04 启动与每小时全90天日汇总重算及保留期清理](#audit-b04) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B05 现有索引与关联访问/保留期谓词存在待测匹配缺口](#audit-b05) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B06 生产静态服务器listen前同步完整资源验签，readonly PGlite恢复也同步](#audit-b06) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B07 静态请求同步元数据和每响应重复gzip](#audit-b07) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B08 通用preview server整文件Buffer读取巨大离线HTML](#audit-b08) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [B09 后台自动取完整metrics并重建表格，cards/archive与CSV无统一行数预算](#audit-b09) | 延期 | [D06](PERFORMANCE_TODO.md#d06) |
| [DATA-001 已缓存战役定义的就绪检查仍新建地形wrapper并扫高度](#audit-data-001) | 已解决 | [L01](PERFORMANCE_TODO.md#l01) |
| [DATA-002 冷战役生成和legacy地表有限准备工作量](#audit-data-002) | 保留现状 | [L02](PERFORMANCE_TODO.md#l02) |

<a id="audit-sim-001"></a>
### SIM-001 · 风暴sort比较器反复filter密度

**已解决**。2026-10-20 S01完成：每施法一次密度统计/最大值选择，保留原候选与ID决胜；100/300候选局部CPU约下降89.6%/90.9%，300距离1209300→90300。单目标无收益保留；310状态对照及浏览器灵能验证通过。

去向：[S01](PERFORMANCE_TODO.md#s01)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-sim-002"></a>
### SIM-002 · 无精英来源仍全表光环扫描

**已解决**。原“无精英仍每次全表扫描”的机制已由H03候选源集合修复；同tick晋升/替换显式失效，生命、阵营、位置仍实时判定。S08又跳过无回血来源的受益者查询。本次既有回归覆盖同tick变化，不把源索引当整tick属性缓存或新增收益。

去向：[H03](PERFORMANCE_TODO.md#h03)、[S08](PERFORMANCE_TODO.md#s08)。

证据：[E003](#e003)、[E004](#e004)、[E005](#e005)；当前源码：[S001](#s001)、[S002](#s002)。

<a id="audit-sim-004"></a>
### SIM-004 · Boss女王无伤员逐tick重试全表sort

**已解决**。2026-10-20 S02完成：女王单遍最小生命比例/ID选择，无伤员仍按原每tick重试，伤员到来立即可治疗。无/有伤员CPU分别0.003629→0.002312、0.073777→0.067295ms；没有跨tick伤员快照或频率取舍。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-sim-005"></a>
### SIM-005 · 其他Boss无目标全表选目标

**已解决**。2026-10-20 S02完成：Boss对实体/工事单遍选择最近合法目标，保留距离/可见性/平局ID。密集有效目标0.1652→0.0569ms；空目标0.003208→0.003776ms没有改善，原始回退保留，不新增迟延重试。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-sim-006"></a>
### SIM-006 · 潜伏者即使不用near仍先展开全表

**已解决**。2026-10-20 S02完成：Boss/领主潜伏者按既有14秒周期选模式，跳过仅普通潜伏者需要的near查询；三档及7.99/8/13.99/14秒边界对照精确。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-sim-007"></a>
### SIM-007 · 冻结发射source DTO重复深拷贝分配

**保留现状**。2026-10-20 S04复核保留：各弹道的冻结目标关联/独立可变DTO不能一概共享。五弹道与删除源后到达精确，旧新均6次深复制；7/12计时差异不算收益，未创建跨攻击来源缓存。

去向：[S04](PERFORMANCE_TODO.md#s04)。

证据：[E007](#e007)、[E008](#e008)。

<a id="audit-sim-008"></a>
### SIM-008 · 奖励池/草案资格重复投影及批量死亡触发扫描

**待测**。S05活动历史与U01显示资格已优化；真实draftContext仍动态投影族谱资格、去重精英目录，drawBossLoot先构建reinforcementPool。缺当前自然频度与局部成本，UI收益不能替代奖励生成证据；归A02，保持原顺序/RNG与购买/死亡即时资格。

去向：[U01](PERFORMANCE_TODO.md#u01)、[S05](PERFORMANCE_TODO.md#s05)、[A02](PERFORMANCE_TODO.md#a02)。下一步：记录商店/领取/批量死亡真实调用频度，比较稳定目录提取候选且核对奖励顺序/RNG。

证据：[E010](#e010)、[E009](#e009)、[E011](#e011)、[E013](#e013)、[E012](#e012)；当前源码：[S003](#s003)、[S004](#s004)。

<a id="audit-sim-009"></a>
### SIM-009 · 满员积压清场后单tick补176敌

**部分解决**。2026-10-20 A01随S06复核：保留满员积压清场后同一步补齐原可用名额，不分帧、不丢队列。176出生与实际固定步A/B精确且局部CPU下降；时序取舍仍归D01。

去向：[S06](PERFORMANCE_TODO.md#s06)、[D01](PERFORMANCE_TODO.md#d01)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-010"></a>
### SIM-010 · eventPoint备用落点每出生重滤3025网格

**已解决**。2026-10-20 A01随S06复核：releaseAmbient调用内复用备用落点候选；每个敌人原随机调用仍保留，连备用点未使用也不跳过。无跨tick池；新锚点和新地图下一次重新筛选。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-011"></a>
### SIM-011 · swarm每出生全候选reduce

**保留现状**。2026-10-20 A01随S06复核：现有swarm按半径缓存合法格，逐次仍按当前锚点筛距离并取最近；每步最多8只。保持现状，未将原有优化计成本轮收益。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-012"></a>
### SIM-012 · 虫巢每候选展开实体包含尸体

**已解决**。2026-10-20 A01随S06复核：虫巢一次落点搜索内按需收集当前活地面实体；下一只出生重新构建，上一只仍立即成为阻挡，尸体不再每候选重复过滤。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-013"></a>
### SIM-013 · 活敌cap不限制尸体/总实体

**保留现状**。2026-10-20 A01随S07复核：300只限制活敌，不限制尸体/友军/结构总数。保留尸体1.5秒生命周期，不把总实体截断为300。300活敌+1000尸体对照确认尸体短期保留且按原时刻清理，空间索引仍跳过已死体。

去向：[S07](PERFORMANCE_TODO.md#s07)。

证据：[E018](#e018)、[E019](#e019)。

<a id="audit-sim-014"></a>
### SIM-014 · 密集碰撞和移动规模压力

**保留现状**。2026-10-20 A01随S07复核：密集碰撞已有空间网格、有限候选、两遍修正和有界位移，保留这些语义。30/300密度及五图中央场景360步精确；当前未找到经验证且不改变行为的求解器新收益。已有小幅重叠如实保留，不以加大修正预算换取不同战斗行为。

去向：[S07](PERFORMANCE_TODO.md#s07)。

证据：[E018](#e018)、[E019](#e019)。

<a id="audit-sim-015"></a>
### SIM-015 · 原生战役MapTerrain寻路热点缺口

**部分解决**。2026-10-20 A01随S06复核：补五个实际MapTerrain的出生/运输舱/直接补给/虫巢查询状态对照及查尔浏览器。保留原寻路与地形规则；不是完整自然路线或全图性能验收。

去向：[S06](PERFORMANCE_TODO.md#s06)、[V02](PERFORMANCE_TODO.md#v02)。

证据：[E016](#e016)、[E017](#e017)、[E020](#e020)。

<a id="audit-sim-016"></a>
### SIM-016 · 特殊生成即使给定位置仍connectedLocations

**已解决**。2026-10-20 S02完成：显式位置跳过未使用的connectedLocations/候选筛选；位置合法性仍检验，查询1→0且RNG保持529。未提供位置时沿用原随机候选。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-sim-017"></a>
### SIM-017 · 无尽精英/Boss累计时间加速

**保留现状**。旧“精英/Boss累计加速到1tick”描述不适用当前R2：频率F在300秒后封顶1.2，通常精英30→25秒、Boss90→75秒，简单精英50秒；普攻攻速上限1.25。生命/伤害仍按原连续指数增长。单类别只留一个到期模板，满员失败1秒后重试；增长政策保持，长期自然压力交V02。

去向：[D01](PERFORMANCE_TODO.md#d01)、[V02](PERFORMANCE_TODO.md#v02)。

证据：[E021](#e021)、[E020](#e020)；当前源码：[S005](#s005)、[S006](#s006)、[S007](#s007)。

<a id="audit-sim-018"></a>
### SIM-018 · 普通波无限按wave加速常量加速

**否定**。普通无尽波不随wave编号无限加快：当前每轮60秒、4波，出生时刻0/15/30/45秒；数量预算前5分钟平滑增至1.2后封顶。旧240秒模板文字也不再作为当前波次描述（经济事件仍用四轮周期）。未修改当前调度。

去向：[D01](PERFORMANCE_TODO.md#d01)。

证据：[E021](#e021)；当前源码：[S008](#s008)、[S009](#s009)。

<a id="audit-sim-019"></a>
### SIM-019 · 无尽一tick补任意数量逾期Boss

**否定**。updateEndlessSpawns每次仅对elite、boss各尝试一次，progress钳到1，pending保留原到期模板；失败后1秒重试，不用while补任意多个逾期Boss。普通ambient队列和战役specialPlan的循环是不同路径，集中补兵仍归D01。

去向：[D01](PERFORMANCE_TODO.md#d01)。

证据：[E016](#e016)；当前源码：[S007](#s007)、[S010](#s010)。

<a id="audit-sim-020"></a>
### SIM-020 · ambient/swarm跨轮队列积压

**待讨论**。2026-10-20 A01随S06复核：跨轮ambient/swarm积压与原优先级保留。删除/截断/摊平会改变战斗投放，未采用；体验决策仍D01。

去向：[S06](PERFORMANCE_TODO.md#s06)、[D01](PERFORMANCE_TODO.md#d01)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-021"></a>
### SIM-021 · spawnWave排序整个累计队列

**保留现状**。2026-10-20 A01随S06复核：保留原稳定sort和shift。10000积压排序追加调用约0.322/0.286ms且仅6/12对较快，代码未改，不归因收益；本批收益来自落点重复查询。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-022"></a>
### SIM-022 · releaseSwarm.some总与积压长度成正比

**否定**。2026-10-20 A01随S06复核：驳回“some总是与积压总长成正比”：首条到期即可短路。保留原<=time判断（不同于ambient的epsilon）；到期ambient优先级控制通过。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-sim-023"></a>
### SIM-023 · 全部敌人/效果永久不清理

**否定**。“全部敌人/效果永久不清理”不成立：普通死体超过1.5模拟秒清除，临时体、飞行物/区域及源效果各有生命周期；保留源池首实例/容量不是持续活跃泄漏。F02/F05已修的特定回收缺口仍单列，不能由此证明全部GPU终身无泄漏。

去向：[V01](PERFORMANCE_TODO.md#v01)。

证据：[E018](#e018)、[E026](#e026)、[E025](#e025)、[E027](#e027)；当前源码：[S011](#s011)、[S012](#s012)。

<a id="audit-fx-001"></a>
### FX-001 · 医疗停疗hostedBeam绕过Death active

**已解决**。2026-10-20 F01当前代码复现并修复；持续治疗保持，结束条带20→0，尾迹保留。

去向：[F01](PERFORMANCE_TODO.md#f01)。

证据：[E026](#e026)、[E029](#e029)。

<a id="audit-fx-002"></a>
### FX-002 · stoppedUntil旧healTargets继续表现

**已解决**。2026-10-20 F04确认短停残留；只清普通医疗路径旧目标，英雄被动当步新目标保留。

去向：[F01](PERFORMANCE_TODO.md#f01)、[F04](PERFORMANCE_TODO.md#f04)。

证据：[E026](#e026)、[E029](#e029)、[E020](#e020)。

<a id="audit-fx-003"></a>
### FX-003 · 同模型mesh池每请求find起点

**已解决**。2026-10-20 X02本地实现验证：帧内游标保留原顺序、缩容与reset；200请求读取20100→200，组件时间下降；尚未Git提交。

去向：[X02](PERFORMANCE_TODO.md#x02)。

证据：[E030](#e030)、[E031](#e031)。

<a id="audit-fx-004"></a>
### FX-004 · 新hit反向复制/find+duplicate/missile扫描

**已解决**。2026-10-20 X02本地实现验证：按来源的攻击索引、最小serial去重及导弹回执集合，保留倒序/时间资格；稀疏密集数值及14组固定原生状态一致。

去向：[X02](PERFORMANCE_TODO.md#x02)。

证据：[E030](#e030)、[E031](#e031)。

<a id="audit-fx-005"></a>
### FX-005 · Terran旧火焰两处reverse.find

**已解决**。2026-10-20 X02本地实现验证：活跃hellion.2火焰按当帧最新攻击表查询；原有不可达备用分支仍保留资格。51/1632绘制指令与同页真实GPU相同；跨页截图亮度差异原因未定，原始失败保留。

去向：[X02](PERFORMANCE_TODO.md#x02)。

证据：[E030](#e030)、[E031](#e031)。

<a id="audit-fx-006"></a>
### FX-006 · 其他精英弹道visualEvents.find

**已解决**。2026-10-20 X02本地实现验证：三族备用弹道首次attackId表保留原数组首次匹配含undefined；不改原资格过滤，不声称这些备用路径有原生FPS收益。

去向：[X02](PERFORMANCE_TODO.md#x02)。

证据：[E030](#e030)、[E031](#e031)。

<a id="audit-fx-007"></a>
### FX-007 · SourceDrawBatch峰值容量不收缩

**保留现状**。2026-10-20 X04完成测量并保留原峰值策略：源quad容量17344→35840，CPU类型化数组增量1956352字节，非总显存；实例峰值60、结束41。当前证据未支持自动收缩后重新扩容，未实施收缩。

去向：[X04](PERFORMANCE_TODO.md#x04)。

证据：[E033](#e033)、[E032](#e032)、[E034](#e034)、[E035](#e035)。

<a id="audit-fx-008"></a>
### FX-008 · 粒子逐请求重建与动态字段解释

**已解决**。2026-10-20 X03本地完成：出生采样对象的不可变参数解释、调用内临时对象及局部父变换复用。真实请求两场12/12对均更快，完整数值/战场像素/恢复/内存有证据；整场FPS非全部改善，尚未Git提交。

去向：[X03](PERFORMANCE_TODO.md#x03)。

证据：[E032](#e032)、[E034](#e034)。

<a id="audit-fx-009"></a>
### FX-009 · 本体/源FX逐实例或quad重复构造同pose材质状态

**已解决**。H01已按精确pose、攻击叠加、护盾、颜色/活动与幻影参数复用材质结果，静态轨道另有有界缓存；仍逐slot比较并标记变化。复用既有全材质数值证据，本次重跑数值回归通过；旧无context微基准不能代表当前本体或整场FPS。

去向：[H01](PERFORMANCE_TODO.md#h01)。

证据：[E003](#e003)、[E036](#e036)；当前源码：[S013](#s013)、[S014](#s014)。

<a id="audit-fx-010"></a>
### FX-010 · 材质费用全部是曲线采样

**否定**。材质成本不全是曲线采样：当前还执行角色/层遍历、颜色转换、行写入和脏区比较。原profile的32.37%与sampleMaterialTrack约2.25%是旧特定场景，不转写成当前占比；现有精确缓存继续保留。

去向：[H01](PERFORMANCE_TODO.md#h01)。

证据：[E038](#e038)、[E003](#e003)、[E036](#e036)；当前源码：[S014](#s014)、[S015](#s015)。

<a id="audit-fx-011"></a>
### FX-011 · source特效全场请求无可见性筛选

**不采纳**。2026-10-20 A01随R01复核：保留源特效生命周期、长光束跨屏与重入，当前无完整保守包围盒。不采用直接屏外停更；本批测透明提交，非片元过绘比例。此前X01–X04 CPU/池优化单列。

去向：[R01](PERFORMANCE_TODO.md#r01)、[D02](PERFORMANCE_TODO.md#d02)。

证据：[E039](#e039)、[E040](#e040)。

<a id="audit-fx-012"></a>
### FX-012 · echo按整个profile最长寿命调度过期模型

**不采纳**。2026-10-20 X04确认固定检查点累计9007次已过期请求由原播放器丢弃。提前过滤候选无稳定CPU收益已撤回；最终保留原分发和整个profile寿命，并未宣称精确echo寿命已优化。

去向：[X04](PERFORMANCE_TODO.md#x04)。

证据：[E033](#e033)、[E032](#e032)、[E034](#e034)、[E035](#e035)。

<a id="audit-fx-013"></a>
### FX-013 · 空粒子/ribbon/projection仍先算phase/bones

**已解决**。2026-10-20 X01本地实现验证：空层/未激活层延迟姿态；102定义3264组精确输出，原生请求重放查询量下降，密集几何CPU12/12更快；不等于整场FPS。

去向：[X01](PERFORMANCE_TODO.md#x01)。

证据：[E030](#e030)、[E020](#e020)、[E031](#e031)。

<a id="audit-fx-014"></a>
### FX-014 · 首次密集模型clone/材质/骨骼分配

**保留现状**。2026-10-20 X04补齐新播放器102定义的初始load/prepare计时，保留缓存与探针口径。源clone单次成本与实例回收已测，既有必需预热/两秒回收保留，不增加全量预克隆；不承诺所有GPU首帧峰值消失。

去向：[X04](PERFORMANCE_TODO.md#x04)。

证据：[E033](#e033)、[E032](#e032)、[E034](#e034)、[E035](#e035)。

<a id="audit-fx-015"></a>
### FX-015 · 首次酸区创建几何与实例缓冲

**部分解决**。2026-10-20 X04单酸区首建约1.4ms，后续约0.1–0.3ms；据当前数据不新增预热或池。F02私有几何/实例缓冲释放保持，密集全内容性能不由单区样本关闭。

去向：[F02](PERFORMANCE_TODO.md#f02)、[X04](PERFORMANCE_TODO.md#x04)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E026](#e026)、[E033](#e033)、[E029](#e029)、[E032](#e032)、[E034](#e034)、[E035](#e035)、[E025](#e025)、[E027](#e027)。

<a id="audit-fx-016"></a>
### FX-016 · 发射器复制对象导致schedule缓存失效

**否定**。2026-10-20核对保持原反证：expandedEmitters按定义WeakMap复用复制发射器身份，schedule缓存未因每帧复制失效；X03未以此作为待修问题或收益来源，既有机制不改。

去向：[X03](PERFORMANCE_TODO.md#x03)。

证据：[E032](#e032)、[E034](#e034)。

<a id="audit-fx-017"></a>
### FX-017 · 骨骼phase缓存512项整体清空

**已解决**。2026-10-20 X01本地实现验证：精确时间/clip对象身份的单定义512项LRU，容量与热点/重算回归通过；独立缓存微基准无稳定时间收益，实际恢复无过期姿态。

去向：[X01](PERFORMANCE_TODO.md#x01)。

证据：[E030](#e030)、[E020](#e020)、[E031](#e031)。

<a id="audit-fx-018"></a>
### FX-018 · Boss死后无限源特效泄漏

**否定**。原“Boss死后无限源特效泄漏”无证据成立。当前非loop请求超过sourceLife返回，结束通道超时删除，非首个闲置mesh超过2秒回收。F01治疗尾迹修复及F02资源回收证据分别沿用；本次源通道停止回归通过，未宣称自然全技能长期GPU验收。

去向：[F01](PERFORMANCE_TODO.md#f01)、[F02](PERFORMANCE_TODO.md#f02)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E026](#e026)、[E033](#e033)、[E029](#e029)、[E025](#e025)、[E027](#e027)；当前源码：[S016](#s016)、[S017](#s017)、[S018](#s018)。

<a id="audit-fx-019"></a>
### FX-019 · 原型300特效同帧step+FX高负载

**待测**。这是旧300单位聚合CPU观察，不是新增独立热点；原GLTF占位/无GPU与“初始300”边界保留。本轮B01/B02已有真实资源基线，X01–X04等有局部对照；最新组合的自然高密战斗与最终FPS尚未测，交V01/V02。

去向：[B02](PERFORMANCE_TODO.md#b02)、[V01](PERFORMANCE_TODO.md#v01)、[V02](PERFORMANCE_TODO.md#v02)。下一步：最终组合按相同设备/种子同时记录CPU、GPU、帧间隔和模拟欠账。

证据：[E038](#e038)、[E041](#e041)、[E020](#e020)、[E033](#e033)、[E042](#e042)、[E025](#e025)、[E027](#e027)；当前源码：[S019](#s019)。

<a id="audit-fx-020"></a>
### FX-020 · 事件768阈值一次裁256可丢未显示事件

**已解决**。2026-10-20 F04复现1200→688，近期窗口修复后1200完整；真实伤害900事件完整，过期回收通过。

去向：[F04](PERFORMANCE_TODO.md#f04)。

证据：[E026](#e026)、[E020](#e020)、[E029](#e029)。

<a id="audit-fx-021"></a>
### FX-021 · __name/TSX helper造成绝对耗时偏高

**证据口径**。TSX辅助函数会改变旧测量绝对值，不能把其68/92ms写成发行版耗时；也不能据此否定bundled profile确认的粒子/材质热点。现有性能批次绑定独立构建，保留各自测量方式，A01不提供新的计时收益。

去向：[B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E038](#e038)、[E041](#e041)、[E043](#e043)、[E025](#e025)、[E027](#e027)；当前源码：[S019](#s019)。

<a id="audit-save-001"></a>
### SAVE-001 · 保存完成readArchive只为savedAt整档解码

**延期**。旧存档saveNow在提交成功后仍readArchive(raw)取savedAt；候选未移植。必须保持capture/时点/sequence及成功后发布语义。 普通舰装入口memoryOnly，按用户约定留D05/MVP收尾。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)、[E044](#e044)；当前源码：[S020](#s020)、[S021](#s021)。

<a id="audit-save-002"></a>
### SAVE-002 · repository/backend/旧备份重复整档验证

**延期**。SaveRepository.commit与IndexedSaveBackend.commit均校验新档，备份轮转还校验旧current/backup；分散于异步流程，不能相加称一次连续阻塞。旧档优化只可复用已验证结果，不能削弱坏档拒绝/回滚；当前普通舰装局不走此路径，D05收尾处理。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)、[E044](#e044)；当前源码：[S022](#s022)、[S023](#s023)。

<a id="audit-save-003"></a>
### SAVE-003 · busy仍在异步队列前同步导出

**延期**。旧存档saveNow仍先同步export再入串行队列，busy未合并后续导出；requestSave同task微任务合并仍有效，不能说每次死亡都存档。 普通舰装入口memoryOnly，按用户约定留D05/MVP收尾。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)、[E044](#e044)；当前源码：[S024](#s024)、[S021](#s021)。

<a id="audit-save-004"></a>
### SAVE-004 · captureRun每次深拷贝整个World

**否定**。captureRun只选择存档DTO字段并复制配置、状态快照，并非structuredClone整个World/Three对象。完整clone位于restoreRun另一路；舰装内存局captureRun会拒绝。编码/校验的大历史成本留D05，旧错误归因不保留为待修机制。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)；当前源码：[S025](#s025)、[S026](#s026)。

<a id="audit-save-005"></a>
### SAVE-005 · 历史运输舱/经济记录保留并重复扫描（含女王注射放大）

**部分解决**。2026-10-20 S05部分优化并保留边界：账本ID查询/女王注入改用索引；原运输舱/经济对象扫描保持，被毁舱仍可能释放未出守卫，A/B验证两名守卫仅放一次且guardianPod=null。未删历史、未压缩对象；余项不冒称消除。

去向：[S05](PERFORMANCE_TODO.md#s05)、[D03](PERFORMANCE_TODO.md#d03)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)、[E048](#e048)、[E049](#e049)。

<a id="audit-save-006"></a>
### SAVE-006 · 有效掉落无TTL/合并且tick/frame全扫描

**部分解决**。2026-10-20 R02部分优化并明确保留：Remove repeated synchronous candidate lookup, radius calculation, label sorting and redundant DOM writes. Keep valid loot, existing ground cache / light grouping and full scans where necessary. No TTL or yield merging; D03 undecided.

去向：[R02](PERFORMANCE_TODO.md#r02)、[D03](PERFORMANCE_TODO.md#d03)。

证据：[E048](#e048)、[E049](#e049)。

<a id="audit-save-007"></a>
### SAVE-007 · 草案每candidate复制整个history再取末2

**已解决**。2026-10-20 S05完成直接最近两轮切片，避免每candidate复制全部此前history。三族0/1/2/3/20/1000/10000历史的shown/chosen权重、实际抽取、RNG与历史精确；全历史保留，局部CPU另列。

去向：[S05](PERFORMANCE_TODO.md#s05)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)。

<a id="audit-save-008"></a>
### SAVE-008 · 账本/幂等回执/购买历史长期增长

**部分解决**。2026-10-20 S05完成生产派生索引：原账本/幂等回执/购买历史全部保留。10000历史冷建约1.069ms、额外Map约0.46MB，非内存压缩。恢复/更换数组重建；接收/拒绝重复回执不重付。统计观察者必须保留全新增订单语义，U04随后已完成观察者读取优化并保留全部新增订单语义；历史/存档策略仍D03/D05。

去向：[S05](PERFORMANCE_TODO.md#s05)、[D03](PERFORMANCE_TODO.md#d03)、[D05](PERFORMANCE_TODO.md#d05)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)、[E048](#e048)、[E049](#e049)。

<a id="audit-save-009"></a>
### SAVE-009 · 真实IDB大历史出现短帧预算超支

**延期**。旧真实IDB记录的事务总长不是连续主线程阻塞，33/50ms帧间隔也不是当前游戏FPS。这里只保留大历史风险及原证据，不重开存档优化。 普通舰装入口memoryOnly，按用户约定留D05/MVP收尾。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)、[E044](#e044)；当前源码：[S024](#s024)、[S021](#s021)。

<a id="audit-save-010"></a>
### SAVE-010 · 无LongTask等于无卡顿

**证据口径**。LongTask未记录不能推出无卡顿：50ms检测阈值与16.67ms帧预算不同。旧IDB帧间隔反例、B01/B02帧时间及欠账口径保留；本次未重测自然帧率。

去向：[B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E038](#e038)、[E041](#e041)、[E043](#e043)、[E025](#e025)、[E027](#e027)；当前源码：[S027](#s027)。

<a id="audit-ui-001"></a>
### UI-001 · HUD每6tick同步全域更新

**已解决**。2026-10-20 U01/U03：每6tick的World通知频率保持；普通主循环只在一次driver.advance内部合并HUD展示，并在绘制前同步刷新。12个实际固定步/2次通知仅刷新1次，外部交互仍即时。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-002"></a>
### UI-002 · Boss奖励失败也changed导致60Hz通知

**已解决**。2026-10-20 U01/U03：受阻Boss拾取仍会通知；失败路径可能冻结/替换奖励候选，不能一概当作无变化。本批真实受阻30次通知全部保留，HUD刷新30→1；回执原样保留，解除阻塞后领取一次、重复拒绝。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-003"></a>
### UI-003 · 成功批量奖励/落地通知未外层合并

**已解决**。2026-10-20 U01/U03：不合并World业务通知和交易。8个Boss领取与12步的状态、每次通知和到达卡顺序精确一致；同轮展示合并。实际同状态30次通知的最终DOM精确，刷新30→1。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-004"></a>
### UI-004 · Roster seats重复allies/family全表扫描

**否定**。2026-10-20 U01/U03：旧squad-console/seats未被当前HUD挂载，保留历史结论；当前packedSeats每兵种读取一次且保留跳虫成对和英雄席，未将旧路径计数当作当前收益。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-005"></a>
### UI-005 · SquadConsole写DOM后读clientWidth/scrollWidth

**否定**。2026-10-20 U01/U03：旧控制台clientWidth/scrollWidth路径未挂载；当前PackedConsole尺寸依赖另归UI-LAYOUT-001。本批不修改未挂载旧模块。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-006"></a>
### UI-006 · 展开Minimap每通知遍历掉落/实体

**保留现状**。2026-10-20 U01/U03：展开小地图需要反映当前实体、掉落和摄像机；收起/隐藏已有提前返回，地形已有缓存。同一补帧中的重复HUD刷新减少，未降低地图更新频率或缓存动态目标。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-007"></a>
### UI-007 · 旧hero-skills冷却整段HTML替换

**否定**。2026-10-20 U01/U03：旧hero-skills整段重建已非当前路径；当前原生命令区已有结构key、reconcile及差异文本更新，保留。技能资格复用另见UI-ACT-001。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-008"></a>
### UI-008 · 所有面板/购买历史战斗10Hz重建

**已解决**。2026-10-20 U01/U03：“所有面板战斗10Hz重建”不成立：当前HUD按实际页面分支，详情已有开关。本批只跳过确实隐藏的production-detail构造，实际首次显示取当前数据；未省略购买观察。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-009"></a>
### UI-009 · shopProgress observe每更新扫描奖励历史

**已解决**。2026-10-20 U01/U03：原observe仅对符合条件的已售报价扫描已记录历史，并非每帧扫描所有历史。改为offerId集合去重；新局清空、合法restore重建、原顺序及深拷贝保留。50/10000历史局部计时下降，0历史无收益。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-load-001"></a>
### LOAD-001 · prepareRosterAssets两key临时数组候选

**不采纳**。保留原prepareRosterAssets两key数组和调用顺序。源最终组合明确排除此微改：3000压力中位回退13.16%，无可靠普遍收益；旧30/300微秒差不作为当前加载优化。L01已采用的地图定义就绪优化是另一条DATA-001。

去向：[L01](PERFORMANCE_TODO.md#l01)。

证据：[E053](#e053)、[E051](#e051)、[E052](#e052)；当前源码：[S028](#s028)。

<a id="audit-load-002"></a>
### LOAD-002 · 重复原纹理解码

**已解决**。共享纹理按不可变URL缓存加载promise，返回独立wrapper共享Source，失败删除promise以支持重试；forget仅移除缓存引用，不关闭活动材质图像。既有加载修复及本次共享纹理回归通过，非所有资源内存有统一上界。

去向：[H01](PERFORMANCE_TODO.md#h01)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E056](#e056)、[E055](#e055)、[E003](#e003)、[E036](#e036)、[E025](#e025)、[E027](#e027)；当前源码：[S029](#s029)、[S030](#s030)。

<a id="audit-load-003"></a>
### LOAD-003 · 颜色/深度程序key携带无关资产身份

**已解决**。当前颜色/深度key以实际生成shader/布局为依据，不再把无关资产身份当程序变体；本次material-program-cache回归通过。10月6被撤回的缓存key候选另属GATE-004，不混为同一补丁或重复收益。

去向：[V01](PERFORMANCE_TODO.md#v01)。

证据：[E058](#e058)、[E025](#e025)、[E027](#e027)；当前源码：[S031](#s031)、[S032](#s032)。

<a id="audit-load-004"></a>
### LOAD-004 · 逐网格反复GPU等待/错误输出目标预热

**已解决**。实际HDR目标下按8个mesh分组预热，保留最终完整光照链与GPU完成校验，已不按每个网格反复等待。L02补等待超时；同步驱动/首绘仍可长阻塞，不能由这条已修宣布加载无长帧。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E056](#e056)、[E060](#e060)、[E011](#e011)、[E061](#e061)；当前源码：[S033](#s033)、[S034](#s034)。

<a id="audit-load-005"></a>
### LOAD-005 · 姿态/多个挂点重复Mixer遍历

**已解决**。同一次姿态遍历产出骨骼与多个挂点，姿态间约8ms合作让步；24FPS样本与半精度矩阵/双精度挂点保留。复用7A的184模型/1656次构造精确对照；单姿态和驱动调用不可抢占。

去向：[V01](PERFORMANCE_TODO.md#v01)。

证据：[E062](#e062)、[E025](#e025)、[E027](#e027)；当前源码：[S035](#s035)、[S036](#s036)。

<a id="audit-load-006"></a>
### LOAD-006 · 菜单同步驱动/解析数秒阻塞

**部分解决**。2026-10-20 L02完成复核：部分缓解、边界保留：独立HTML的2834片JSON解析从一次连续批处理改为合作让步；最终冷/刷新45/49批，解析区间不含初始HTML/JS的长任务最大150/0ms（0为没有记录），基线412/573ms。首元数据解析、初始HTML/JS、同步驱动/首绘仍可阻塞，未声称加载已无长帧。

去向：[L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)、[E025](#e025)、[E027](#e027)。

<a id="audit-load-007"></a>
### LOAD-007 · 缓存键数/命中异常与重新下载

**待测**。7A两侧曾出现缓存键数/命中异常，原根因仍未定位。当前按hash读回并验长度/SHA，L02超时降级、L03离线和页面重开不等于部署HttpAssetStore真实缓存复测；模拟缓存回归通过也不证明浏览器长期留存。单列A03。

去向：[L03](PERFORMANCE_TODO.md#l03)、[A03](PERFORMANCE_TODO.md#a03)。下一步：真实部署清单路径下记录CacheStorage键、命中、重下载、estimate/persisted、刷新和跨版本复用。

证据：[E065](#e065)、[E060](#e060)、[E055](#e055)、[E064](#e064)；当前源码：[S037](#s037)、[S038](#s038)。

<a id="audit-load-008"></a>
### LOAD-008 · 全部API时间可直接当GPU时间

**证据口径**。异步等待、同步API阻塞和GPU elapsed是不同指标。驱动工作可从日志查询转到uniform/纹理提交；不将API wall时间直接记为GPU耗时，不相加嵌套阶段。沿用R01真实GPU查询与L02分段记录。

去向：[B01](PERFORMANCE_TODO.md#b01)、[R01](PERFORMANCE_TODO.md#r01)、[L02](PERFORMANCE_TODO.md#l02)。

证据：[E065](#e065)、[E039](#e039)、[E060](#e060)、[E041](#e041)、[E043](#e043)、[E040](#e040)、[E011](#e011)、[E061](#e061)；当前源码：[S039](#s039)、[S040](#s040)。

<a id="audit-load-009"></a>
### LOAD-009 · gl.finish为主热点

**不采纳**。旧细分中gl.finish约0.1ms，不能据单个API名称认定其为数十秒首用阻塞主因。当前最终warmLightingFrame仍执行完整链和finish；没有新的因果证据，本批不删正确性门禁。

去向：[L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E062](#e062)、[E060](#e060)、[E011](#e011)、[E061](#e061)、[E025](#e025)、[E027](#e027)；当前源码：[S041](#s041)。

<a id="audit-load-010"></a>
### LOAD-010 · 缩短开屏预算一定总体更快

**不采纳**。缩短开屏软窗的旧五对比较没有稳定总等待收益，点击到战斗等待均增加。保留当前后台调度及15秒软窗；L02只处理分段和等待恢复，没有采纳此候选。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E062](#e062)、[E060](#e060)、[E011](#e011)、[E061](#e061)；当前源码：[S042](#s042)。

<a id="audit-load-011"></a>
### LOAD-011 · CPU-only后台一定更快

**不采纳**。旧CPU-only后台候选改善菜单响应却增加总等待与backing storage，已拒绝。当前可选任务仍含GPU预热且与必需入口共享lane；不能标成已采用或重新借此宣称加载收益。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E062](#e062)、[E060](#e060)、[E011](#e011)、[E061](#e061)；当前源码：[S043](#s043)、[S044](#s044)。

<a id="audit-load-012"></a>
### LOAD-012 · 同步合并动画优于切片合并

**不采纳**。旧同步合并采样候选第三对总等待回退约28秒，生产采用合作分片合并；保留相同输出算法及约8ms姿态间让步。本次不恢复同步候选，不把隔离CPU时间当总加载时间。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E062](#e062)、[E060](#e060)、[E011](#e011)、[E061](#e061)；当前源码：[S036](#s036)。

<a id="audit-load-013"></a>
### LOAD-013 · 后台准备完成等于正式ready

**否定**。2026-10-20 L02完成复核：原断言不成立：后台工作结束仍不等于正式ready。保留必要入口模型、音频、编译、实战预热、地图及错误检查；实际资源失败时World仍menu/time0，重试通过后才能继续。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)。

<a id="audit-load-014"></a>
### LOAD-014 · 前轮71.71秒单次实验确定收益

**证据口径**。旧单次71.71秒快样本在字节相同正式R2中未重现，不能挑最好值当稳定收益；原失败与波动保留。当前L02/L03也未证明总加载下降，本批无新加载计时。

去向：[V01](PERFORMANCE_TODO.md#v01)。

证据：[E069](#e069)、[E060](#e060)、[E055](#e055)、[E025](#e025)、[E027](#e027)。

<a id="audit-load-015"></a>
### LOAD-015 · 首用骨骼/纹理/透明过绘真实GPU未知

**证据口径**。2026-10-20 L02完成复核：证据边界复核：分列模型/姿态、纹理CPU提交、异步着色器等待、首用验证、HDR预热和地图准备；实际GPU fence及上下文恢复已验证。嵌套等待耗时不可相加，纹理提交不是GPU执行时长，未补成全内容GPU/FPS验收。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)。

<a id="audit-load-016"></a>
### LOAD-016 · 离线Base85先全转Blob造成OOM

**已解决**。2026-10-20 L02完成复核：旧问题当前已修：沿用编码字符串/引用计数和按需解包，不重新创建全量编码Blob。最终2834块、1874资产逐块字节和部分顺序一致；本批只补分片JSON解析和DOM引用释放，不把旧修复算新收益。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)。

<a id="audit-load-017"></a>
### LOAD-017 · GLB细bufferView分片能显著省包/加载

**不采纳**。旧GLB全bufferView细切估算反增12663696字节，自适应仅估省19348字节且未证实际加载收益；未纳入产品。保持当前完整原素材和分片共享，不把估算当交付减包，也不重做资源转换。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E070](#e070)；当前源码：[S045](#s045)。

<a id="audit-load-018"></a>
### LOAD-018 · 深度预编译提前释放临时材质候选

**否定**。2026-10-20 L03复核：沿用已否证结论：深度材质通过WeakMap及源材质/几何生命周期管理，正式恢复仍依赖现有材质；不搬回提前释放候选。当前Web和离线真实上下文恢复通过，此条没有新增生产优化或单列收益。

去向：[L03](PERFORMANCE_TODO.md#l03)。

证据：[E055](#e055)、[E064](#e064)。

<a id="audit-load-019"></a>
### LOAD-019 · 15秒开屏/24可选模型数是硬预算

**否定**。15秒是可选准备软窗、24是最多可选模型条目，不是跨设备响应时限或内存/军队上限。新job前的输入/帧成本检查不能抢占在途同步工作；当前单lane和L02超时保护保持。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E062](#e062)、[E060](#e060)、[E011](#e011)、[E061](#e061)；当前源码：[S046](#s046)、[S047](#s047)。

<a id="audit-gate-001"></a>
### GATE-001 · 早期首关分位合格足以关M6/M7

**否定**。早期首关或冻结诊断合格不能关闭自然后期/大型编队/完整内容性能。保留历史尾帧失败与后测未复现的区别；V01/V02最终组合仍开放。

去向：[V01](PERFORMANCE_TODO.md#v01)、[V02](PERFORMANCE_TODO.md#v02)。

证据：[E072](#e072)、[E041](#e041)、[E020](#e020)、[E025](#e025)、[E027](#e027)；当前源码：[S027](#s027)。

<a id="audit-gate-002"></a>
### GATE-002 · 自然后期第10/11关峰欠账超线

**待测**。旧第10/11关欠账失败是历史验收记录，原外部审计当时缺原始local；不能称本次已复现或已修。当前B01/B02与局部优化不是相同自然后期路线，V02补当前版本连续路线并记录欠账。

去向：[V02](PERFORMANCE_TODO.md#v02)。下一步：按当前三族代表路线覆盖后期和无尽，保留失败/欠账，不丢tick。

证据：[E073](#e073)、[E020](#e020)；当前源码：[S027](#s027)。

<a id="audit-gate-003"></a>
### GATE-003 · 10月6光环遍历优化

**已解决**。10月6的静态规则表/实时实体遍历优化属于已合入历史基础；H03后来又加候选源集合。本次同tick晋升/转换/死亡回归通过，旧8.6%/15.9%不复写为本批或当前全场收益。

去向：[H03](PERFORMANCE_TODO.md#h03)。

证据：[E072](#e072)、[E003](#e003)；当前源码：[S001](#s001)。

<a id="audit-gate-004"></a>
### GATE-004 · 10月6缓存程序key/跳空批次候选

**不采纳**。10月6缓存程序key/跳空AnimatedBatch的特定组合曾更慢并撤回；不把历史候选称已合入。本轮F03修的是confirmed-hero SkillEffects空实例上传，机制与证据独立；当前正确GLSL程序key归LOAD-003。

去向：[F03](PERFORMANCE_TODO.md#f03)。

证据：[E072](#e072)、[E051](#e051)、[E052](#e052)；当前源码：[S048](#s048)。

<a id="audit-gate-005"></a>
### GATE-005 · 12ms模拟预算硬限制单tick/完整帧

**否定**。FixedStepper仅在下一步前检查预算（至少先执行一步），同步tick不可抢占；完整render也不受模拟预算硬限。累计欠账保留，显式reset单列discardedBacklog；12ms不是完整帧硬上界。

去向：[B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E041](#e041)、[E043](#e043)、[E025](#e025)、[E027](#e027)；当前源码：[S027](#s027)、[S049](#s049)。

<a id="audit-gate-006"></a>
### GATE-006 · 自然高密度/完整内容稳定60FPS

**待测**。当前自然高密与完整内容稳定60FPS尚未验收。三族累计片段、冻结场景和组件收益不能代替自然连续战役/无尽；最终组合V01、自然V02、实际输入/人类V03分开。

去向：[V01](PERFORMANCE_TODO.md#v01)、[V02](PERFORMANCE_TODO.md#v02)、[V03](PERFORMANCE_TODO.md#v03)。下一步：按最终统一入口验证；未达标保留开放。

证据：[E065](#e065)、[E041](#e041)、[E020](#e020)、[E055](#e055)、[E025](#e025)、[E027](#e027)；当前源码：[S027](#s027)。

<a id="audit-gate-007"></a>
### GATE-007 · 历史P6-V01大范围泛白仍待验收

**待测**。历史P6-V01自然大范围泛白尚未建立对应触发/持续时间的当前复现或修复证据。五图环境已获用户接受，不能外推为此战斗特效问题通过；已有轻量画面检查复用，V03只对该触发及后续变更补证。

去向：[V03](PERFORMANCE_TODO.md#v03)。下一步：复现对应自然战斗事件；区分正常亮效与缺陷，避免重开五图内容验收。

证据：[E072](#e072)、[E076](#e076)、[E025](#e025)、[E027](#e027)。

<a id="audit-gate-008"></a>
### GATE-008 · P6自然80点大型编队三次仍超门槛

**待测**。旧P6自然80点大型编队三次超门槛仍是历史未通过；静止300敌或纯模拟局部收益不关闭它。V02按当前合法编队重测连续自然压力，记录实际人数/内容与帧尾/欠账。

去向：[V02](PERFORMANCE_TODO.md#v02)。下一步：当前版本自然大型编队证据，与受控300诊断分列。

证据：[E077](#e077)、[E020](#e020)；当前源码：[S027](#s027)。

<a id="audit-c02"></a>
### C02 · 追踪地雷重建障碍数组导致可见图缓存失效

**已解决**。S03已用稳定障碍几何快照复用追踪雷路径图，按位置/半径/活性、地形对象及阶段失效，并修复连续线段卡角。查尔旧360步停滞→第44步触发和动态边界证据沿用；这是行为修复加查询复用，不宣称路径逐点与旧版相同。

去向：[S03](PERFORMANCE_TODO.md#s03)。

证据：[E051](#e051)、[E011](#e011)、[E052](#e052)；当前源码：[S050](#s050)、[S051](#s051)。

<a id="audit-c03"></a>
### C03 · Reaper/Colossus跨崖失败反复搜索落点与placement

**已解决**。2026-10-20 A01随S07复核：同次跨崖搜索复用高度/列表及placement几何参数；保留原候选搜索与每步重试，落点提交重新验证。支持的单层悬崖、原CharTerrain与阻挡/预留/地图修改边界已测。当前五图levels=0限制与失败查询回退明确单列，不新增地形能力。

去向：[S07](PERFORMANCE_TODO.md#s07)。

证据：[E018](#e018)、[E019](#e019)。

<a id="audit-c04"></a>
### C04 · 航母/截击机反复cleanup、母子扫描及属性刷新

**已解决**。2026-10-20 S02完成：单次子系统调用复用母子列表/初始化/付费补机，去重复cleanup；保留全部属性刷新，预备队资格即时按活体ID判断。场景遍历28/8932→19/6061，CPU约下降12.9%；死亡/归属变化/删除/补机/暂停验证。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-c05"></a>
### C05 · 精英高阶圣堂未研究风暴仍先全表选目标

**已解决**。2026-10-20 S02完成：未研究风暴的精英圣堂在选敌前返回；high_templar.2反馈例外和战斗状态初始化保留。300背景目标遍历301→0，多科技/能量/六种精英法术对照精确。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-c06"></a>
### C06 · Immortal拉扯和Marauder击退反复全表占位检查

**已解决**。2026-10-20 A01随S07复核：掠夺者一次击退共享当前阻挡列表；不朽者逐目标重读当前Map。伤害/连锁之后才读占位，原击退概率/RNG、距离、顺序、Boss例外及地形合法性不变；命中后回调局部计时与状态对照通过。

去向：[S07](PERFORMANCE_TODO.md#s07)。

证据：[E018](#e018)、[E019](#e019)。

<a id="audit-c07"></a>
### C07 · 精英Hydralisk扇形弹道重复完整排序只取首项

**已解决**。2026-10-20 S02完成：精英刺蛇五弹道各自直接选择角度最优目标，无完整排序，保留ID平局、主弹道和发射顺序。300候选CPU0.3892→0.2782ms，五弹道与命中完整状态精确。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-c08"></a>
### C08 · Zerg叠加酸区逐区逐敌并重复取同源最大伤害

**已解决**。2026-10-20 S04完成：同源覆盖最大伤害改直接遍历，消除filter/map/spread临时数组，不改逐区逐敌顺序/每秒gate/过期/未来覆盖区参与。24区300目标局部10.784→10.168ms（9/12），16目标无稳定收益；多源/过期/死亡/追赶及真实酸区画面验证。

去向：[S04](PERFORMANCE_TODO.md#s04)。

证据：[E007](#e007)、[E008](#e008)。

<a id="audit-pg-019"></a>
### PG-019 · 非空天赋及动态形态反复派生分配

**保留现状**。2026-10-20 S08复核保留动态路径：仅不可变effectId→首个武器定义建立索引；非空天赋/技能/形态/战术/归属实时派生未缓存。26武器定义和21动态控制精确；301单位武器查询批次1.5132→1.1608ms，不把它当动态属性缓存收益。

去向：[S08](PERFORMANCE_TODO.md#s08)。

证据：[E004](#e004)、[E005](#e005)。

<a id="audit-c12"></a>
### C12 · 空间索引没有覆盖所有范围机制

**保留现状**。2026-10-20 S04复核保留实时路径：空间索引在两次重建间可能缺少移动/新生/静态巢，未直接替代装备范围扫描。无需求时已跳过扫描，弹射不再完整排序；过期索引、静态巢、转化与新生案例通过。S07现已完成；此条仍保留实时扫描。

去向：[S04](PERFORMANCE_TODO.md#s04)。

证据：[E007](#e007)、[E008](#e008)。

<a id="audit-c13"></a>
### C13 · 状态堆的有效条目数不等于堆大小

**已解决**。2026-10-20 S08完成过期查询：票据携带key，按key/serial验证，4096票据/512活动条目到期CPU1.3774→0.6182ms（12/12）。堆票据数量不变，不是压缩或内存收益；刷新/移除/恢复对照精确。

去向：[S08](PERFORMANCE_TODO.md#s08)。

证据：[E004](#e004)、[E005](#e005)。

<a id="audit-c14"></a>
### C14 · 英雄主动目标预览与执行重复查询

**已解决**。2026-10-20 S04完成：英雄执行复用当次命令的选敌；预览不跨调用缓存。雷诺总空间查询3→2（保留伤害查询）、托什实体遍历3→2，局部CPU约下降31%/22%；全部英雄及预览后目标失效对照精确。

去向：[S04](PERFORMANCE_TODO.md#s04)。

证据：[E007](#e007)、[E008](#e008)。

<a id="audit-c15"></a>
### C15 · 普攻附加弹、链、DOT与被动

**已解决**。2026-10-20 S04完成：公共附加候选只在分裂/顺劈/移动附加/穿透/追击需要时生成，仍在原命中前。弹射每跳读取当前活体且单遍按距离/ID选最优；原派生顺序/有限真伤/RNG保留。真实七套配装、DOT及六组360实际步对照；单独分裂轻微回退保留。

去向：[S04](PERFORMANCE_TODO.md#s04)。

证据：[E007](#e007)、[E008](#e008)。

<a id="audit-c16"></a>
### C16 · 治疗／回盾每tick找伤者，即使没有受益者

**已解决**。2026-10-20 S08完成：每次实时选原排序前N，旧目标+0.08容差与零能量移动目标保留。16友军+300敌人普通/精英医疗约下降36/23%；小队斯旺/阿塔尼斯回退保留，300友军压力单列。无降频/跨tick缓存，精英护盾区域候选撤回。

去向：[S08](PERFORMANCE_TODO.md#s08)。

证据：[E004](#e004)、[E005](#e005)。

<a id="audit-c17"></a>
### C17 · 来源缺席仍执行的公共支援扫描

**已解决**。2026-10-20 S08完成：无回血来源/满血跳过回血受益者、无到期感染池跳过友军、屏障无雷不构造敌方候选；其他状态清理/池推进/复活保持。无来源及同tick新增/死亡/晋升已验证。额外来源预收集无收益已撤回。

去向：[S08](PERFORMANCE_TODO.md#s08)。

证据：[E004](#e004)、[E005](#e005)。

<a id="audit-c18"></a>
### C18 · 没有合法目标／落点时的重复搜索

**已解决**。2026-10-20 A01随S06复核：候选点搜索调用内复用集合；不缓存全局失败或降低重试频率。结构死亡/新生、同tick大体型友军与空落点、等距首项对照通过。选敌策略未改。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-pg-022"></a>
### PG-022 · 付费英雄被堵时每tick重试落点无退避

**已解决**。2026-10-20 A01随S06复核：付费英雄落点仍原每tick重试，无退避/降频。共享freePosition降低查询重复工作，失败不扣除/丢弃队列；不宣称改变付费英雄时序。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-c19"></a>
### C19 · 手动转移／闪烁落点突发

**保留现状**。2026-10-20 A01随S07复核：闪烁每个实际单位提交时仍重新计算可用位置；手动转移仍保留预览与提交时原子验证。预览不能替代后续实时占位，未采用陈旧快照优化；S06已有freePosition调用内集合复用继续沿用。实际八单位闪烁与转移封堵/重试精确，无单独新增性能收益。

去向：[S07](PERFORMANCE_TODO.md#s07)。

证据：[E018](#e018)、[E019](#e019)。

<a id="audit-c21"></a>
### C21 · 普通障碍绕行图与动态地雷图

**保留现状**。普通steerGoal反向cost/闭集仍按当前目标计算；S03只优化专用追踪雷稳定图并修卡角。MapTerrain路线与无definition可见图分开；当前没有普通反向cost跨调用缓存的收益/失效证据，不再列为已实现。保留canStep/slide与控制锚点语义。

去向：[S03](PERFORMANCE_TODO.md#s03)、[S07](PERFORMANCE_TODO.md#s07)。

证据：[E051](#e051)、[E018](#e018)、[E011](#e011)、[E052](#e052)、[E019](#e019)；当前源码：[S052](#s052)、[S050](#s050)。

<a id="audit-c22"></a>
### C22 · 接战/队形缓存命中仍有工作

**已解决**。2026-10-20 A01随S07复核：接战/队形缓存命中省去名单数组及字符串构造；资格、顺序、射程/飞行字段实时比较，原失效阈值/刷新周期保持。死亡、失去武器、架起、模式变换、目标、飞行/射程、重排和锚点变化回归通过。没有按tick共享可能过时的接战名单。

去向：[S07](PERFORMANCE_TODO.md#s07)。

证据：[E018](#e018)、[E019](#e019)。

<a id="audit-c24"></a>
### C24 · 敌军路由与老pod查找

**保留现状**。2026-10-20 A01随S06复核：保留敌路由已有格数组身份中心缓存、每敌三段各最多48候选；guardianPod仍读取现有舱与状态。176出生后的完整step/浏览器复核，不新增历史舱索引或声称此项单独收益。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-c25"></a>
### C25 · 第18关主巢每个导弹重复整表allies数组

**保留现状**。2026-10-20 S02复核后保留：主巢导弹逐枚取得存活目标，前枚伤害可能改变后枚集合，未选跨导弹快照。20导弹控制回放含28死亡，旧新命中顺序/状态精确；没有声称本项扫描已消除。

去向：[S02](PERFORMANCE_TODO.md#s02)。

证据：[E001](#e001)、[E002](#e002)。

<a id="audit-r01"></a>
### R01 · 材质变化后，下次实际使用纹理时按整容量上传

**已解决**。H01已记录按RGBA行的脏范围，最多8段且低于整表25%时局部上传，否则全量；初始化/恢复仍全传，未提交脏范围保留到实际上传。旧“只要变化就永远整容量”不再适用。冻结场两侧上传相同、动态局部路径与既有证据分列。

去向：[H01](PERFORMANCE_TODO.md#h01)。

证据：[E003](#e003)、[E036](#e036)；当前源码：[S053](#s053)、[S054](#s054)。

<a id="audit-r02"></a>
### R02 · 每帧多次全 Scene 遍历和材质替换，随隐藏缓存/特效池规模放大

**已解决**。H04以场景增删维护renderable集合供深度/阴影/接触复用；当前仍读取实时材质/可见性并在finally恢复替换。R03又减少暂停CPU展示准备，GPU完整pass保留。本次嵌套增删/换父节点/材料回归通过，未把GPU耗时记为已消除。

去向：[H04](PERFORMANCE_TODO.md#h04)、[R03](PERFORMANCE_TODO.md#r03)。

证据：[E003](#e003)、[E025](#e025)、[E027](#e027)；当前源码：[S055](#s055)、[S056](#s056)、[S057](#s057)。

<a id="audit-r03"></a>
### R03 · 没有当前人族英雄时，仍更新全部六英雄技能空批次

**已解决**。F03始终同步mesh.count（含归零），仅count>0才标记矩阵/颜色上传；未改成局部范围上传。实际WebGL空层稳态10次/97280字节→0，首次/清空/再现/扩容/上下文恢复保留；不使用旧六套微基准数字宣称当前完整帧收益。

去向：[F03](PERFORMANCE_TODO.md#f03)。

证据：[E051](#e051)、[E052](#e052)；当前源码：[S048](#s048)。

<a id="audit-r04"></a>
### R04 · Auto/cinematic 的候选收集仍每显示帧做全量实体×主队扫描和DOM布局读

**待测**。fixed模式直接返回，活跃auto/cinematic仍收集mains/near并读HUD矩形；暂停已有快速返回。旧mainSet替换25实体中位慢32%、7对6慢，最终组合只撤回该hunk；不能据此否定所有cameraFrame候选。新方案需先测真实布局/调用频度，归A02，旧候选不搬回。

去向：[A02](PERFORMANCE_TODO.md#a02)。下一步：同一World固定/auto/cinematic，普通与密集、宽窄视口；验证镜头/主体输出再决定是否优化。

证据：[E053](#e053)、[E025](#e025)；当前源码：[S058](#s058)、[S059](#s059)。

<a id="audit-r05"></a>
### R05 · 酸区几何清理没有释放 InstancedMesh 私有实例缓冲

**已解决**。2026-10-20 F02当前GPU实测12轮遗留48缓冲→0，过期/重置/地形失效均覆盖。

去向：[F02](PERFORMANCE_TODO.md#f02)。

证据：[E026](#e026)、[E029](#e029)。

<a id="audit-r06"></a>
### R06 · 据点活体/死亡克隆骨架清理不完整，且屏外 mixer 继续更新

**部分解决**。F02私有clone骨架/mixer清理已修并有12轮纹理42→0证据。屏外fortMixers仍按截断fortDt增量推进，R03只跳过合法静止CPU展示；直接停止或改绝对时间可能改变姿态。余下活跃屏外成本归A02，涉及动画取舍再交D02。

去向：[F02](PERFORMANCE_TODO.md#f02)、[R03](PERFORMANCE_TODO.md#r03)、[A02](PERFORMANCE_TODO.md#a02)、[D02](PERFORMANCE_TODO.md#d02)。下一步：先测正常可见/屏外据点，保增量时间、死亡/重入和恢复输出。

证据：[E026](#e026)、[E025](#e025)、[E029](#e029)、[E027](#e027)、[E039](#e039)、[E040](#e040)；当前源码：[S060](#s060)、[S061](#s061)。

<a id="audit-r07"></a>
### R07 · Pod / hive死亡首用仍同步克隆、精确骨骼Bounds和ConvexHull

**已解决**。2026-10-20 X04本地完成：按模板/原动作缓存载体精确参考边界及凸包，在既有加载阶段准备CPU引用数据；主巢死亡首次测边界，后续本体/扩张巢复用。三族构造CPU下降约78–89%，骨骼/变换/画面与私有资源释放通过；全部GPU首帧与全内容FPS仍开放。

去向：[X04](PERFORMANCE_TODO.md#x04)。

证据：[E033](#e033)、[E032](#e032)、[E034](#e034)、[E035](#e035)。

<a id="audit-r08"></a>
### R08 · 暂停或无模拟推进的帧仍重做展示CPU、属性上传和后处理

**部分解决**。2026-10-20 R03小合批：已优化静止战场的CPU展示准备、属性和标签提交；完整GPU绘制/阴影/接触/折射/辉光仍运行，不声称后处理已消除。活跃无步进帧仍处理插值、镜头和效果。配装原本停止战场绘制不重复计收益。

去向：[R03](PERFORMANCE_TODO.md#r03)、[D02](PERFORMANCE_TODO.md#d02)。

证据：[E025](#e025)、[E027](#e027)、[E039](#e039)、[E040](#e040)。

<a id="audit-r09"></a>
### R09 · 当前地表在每像素无条件采3/4层双尺度颜色和法线

**已解决**。2026-10-20 A01随R01复核：采纳严格零权重层跳过四次纹理采样，分支外梯度/分支内textureGrad；小权重、材质、mip和画质保持。七场景真实GPU、五图交界及实际恢复证据见R01；查尔波动/回退保留。

去向：[R01](PERFORMANCE_TODO.md#r01)。

证据：[E039](#e039)、[E040](#e040)。

<a id="audit-r10"></a>
### R10 · 阴影联合裁剪使部分屏外单位与摆件仍执行beauty/contact骨骼和绘制

**不采纳**。2026-10-20 A01随R01复核：保留镜头可见与阴影范围并集，当前批次共用；屏外投射体仍可能影响画内阴影。独立pass列表/保守边界没有本批候选，不直接剔除；进一步可见性取舍归D02。

去向：[R01](PERFORMANCE_TODO.md#r01)、[D02](PERFORMANCE_TODO.md#d02)。

证据：[E039](#e039)、[E040](#e040)。

<a id="audit-r11"></a>
### R11 · 后处理与分辨率成本始终存在，普通非英雄场景也不绕过

**部分解决**。2026-10-20 A01随R01复核：接触深度colorWrite=false及空折射绕过原本已有，不重复计收益。GPU阶段和100/75/50/100%压力已测；保留HDR/辉光/ACES输出，默认画质不改，取舍归D02。

去向：[R01](PERFORMANCE_TODO.md#r01)、[D02](PERFORMANCE_TODO.md#d02)。

证据：[E039](#e039)、[E040](#e040)。

<a id="audit-r15"></a>
### R15 · 英雄/旧特效特定规模的次级热点与隐藏输出上限

**待测**。旧英雄getter反复filter、Protoss beginFrame/舰队children查找仍可达，部分旧精英事件查找已由X02优化。旧stroke16384顶点/49152索引与batch容量仍会提前返回，SourceDrawBatch按需扩展是另一层。未证明自然达到旧层上限，也未覆盖全层提交/丢弃；归A02，不静默降低或扩改输出。

去向：[X02](PERFORMANCE_TODO.md#x02)、[R01](PERFORMANCE_TODO.md#r01)、[A02](PERFORMANCE_TODO.md#a02)。下一步：合法英雄组合记录submitted/dropped及CPU；容量边界/重入/恢复有证据后才决定是否优化。

证据：[E039](#e039)、[E030](#e030)、[E031](#e031)、[E040](#e040)；当前源码：[S062](#s062)、[S063](#s063)、[S064](#s064)。

<a id="audit-r16"></a>
### R16 · 正确性附项：精英蜘蛛雷在GPU批次提交之后才add

**已解决**。2026-10-20 F04精英雷提交次序已修复；两子网格埋地/出土/追踪各0→1，清空后0，再现正常。

去向：[F04](PERFORMANCE_TODO.md#f04)。

证据：[E026](#e026)、[E020](#e020)、[E029](#e029)。

<a id="audit-l01"></a>
### L01 · P2：发布版菜单前置准备跨种族全部UI，当前清单约65MB

**待讨论**。菜单仍按unit/hero/building/tech/ui/skill前缀预备跨族资源；旧167ID/65MB只属于旧清单，不作为当前清单数量。原始字节准备不等于全部图像/GPU已解码。分层预载会转移后续屏幕等待，仍交D04。

去向：[D04](PERFORMANCE_TODO.md#d04)。下一步：先比较当前标题依赖及进入后续界面的首用等待，再决定预载范围。

证据：[E060](#e060)、[E055](#e055)；当前源码：[S065](#s065)、[S066](#s066)。

<a id="audit-l03"></a>
### L03 · P1候选：新战役开局准备完整族谱和未来无尽资源，远超当前出生单位

**待讨论**。当前racePreloadModels含本族完整普通/精英/英雄与虫族敌人，prepareRace仍准备无尽建筑/地图。完整预载成本存在但也避免增援首用等待；L02未缩范围，未经决定不删未来模型/效果。D04比较分阶段准备及首用成本。

去向：[D04](PERFORMANCE_TODO.md#d04)。下一步：完整预载与阶段预载相同内容对照，并展示转移后的等待和恢复行为。

证据：[E060](#e060)；当前源码：[S067](#s067)、[S068](#s068)。

<a id="audit-l04"></a>
### L04 · P1候选：巨大离线HTML仍有不可yield的解析、base85与同步inflate片段

**部分解决**。2026-10-20 L02完成复核：实测取舍：保留约8ms检查一次的片间JSON解析让步；浏览器支持时用scheduler.yield，回退setTimeout。单个JSON、base85和inflate仍同步；原解包片间16ms让步保持。R2片内解码/流式inflate因时间与堆峰值回退撤回，未宣称硬8ms或内存下降。

去向：[L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)、[E025](#e025)、[E027](#e027)。

<a id="audit-l05"></a>
### L05 · P2：离线恢复未核对每asset的SHA字段

**已解决**。2026-10-20 L03复核：离线按需及旧整包恢复在创建URL前异步校验每asset SHA，当前请求批次全通过才发布URL/释放编码片；同长坏内容、坏hash、失败后重试验证。1874原资产通过生产校验并独立读回；并非来源签名/真实性证明，也未同步哈希全部资产后才显示首页。

去向：[L03](PERFORMANCE_TODO.md#l03)。

证据：[E055](#e055)、[E064](#e064)。

<a id="audit-l06"></a>
### L06 · P2：浏览器Blob、解码缓存与跨版本磁盘缓存没有统一字节预算

**部分解决**。L03已约束可重建UI缓存并记录页面Blob/编码片/纹理估算与GC堆，活跃资源可恢复；没有实现跨版本CacheStorage预算。资源URL可为编码片释放后的唯一恢复来源，不能随意撤销。真实部署跨版本留存、hash共享和磁盘预算决策单列A03，页面11局不能关闭长期磁盘问题。

去向：[L03](PERFORMANCE_TODO.md#l03)、[A03](PERFORMANCE_TODO.md#a03)。下一步：多release共享/新增hash、容量与重新下载实测，提出保护活动引用的预算；未批准前不驱逐。

证据：[E055](#e055)、[E064](#e064)；当前源码：[S069](#s069)、[S070](#s070)、[S071](#s071)。

<a id="audit-l07"></a>
### L07 · P2：必要网络/缓存与后台lane的等待没有统一超时或中止

**部分解决**。2026-10-20 L02完成复核：必要异步等待补限：HTTP头及正文60秒后abort；缓存操作5秒、失败30秒降级窗口；入口排队120秒、着色器60秒、GPU fence30秒。实际正文停滞/重试、IDB blocked/reopen、串行lane及取消所有权通过。旧任务排空前不放新任务并发；取消不是同步代码抢占，Three内部轮询和单次驱动调用仍不能强制中断。

去向：[L02](PERFORMANCE_TODO.md#l02)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)、[E025](#e025)、[E027](#e027)。

<a id="audit-l09"></a>
### L09 · 当前不兼容：微信路径仍是旧Kairos能力预检，不是当前五图可玩版

**延期**。微信manifest校验仍要求kairos，当前浏览器是campaign-five-v3；小游戏入口仍属旧硬件/资源预检，不能称五图完整可玩。此为平台适配缺口，D06另批处理，不影响本次浏览器审计推进。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S072](#s072)、[S073](#s073)、[S074](#s074)。

<a id="audit-l10"></a>
### L10 · 微信未来链路条件缺口：同步多次校验、hash别名与预算语义

**延期**。微信同步文件SHA/重复校验、按ID求和及hash→单ID淘汰仍在；同hash多别名的保护/清理存在条件性风险。当前未跑微信真机或当前五图闭包，不能把160MiB与全发行体积直接比较判失败。D06先补别名与活动集合语义/真机证据。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S075](#s075)、[S076](#s076)。

<a id="audit-l11"></a>
### L11 · 构建成本和历史构建器的版本绑定

**延期**。辅助build-online-demo仍取旧dist/web清单并重编当前src/main，未建立源码/资源同代验证；只是可达前置条件缺口，本次没生成错包。正式构建的SHA/回滚和各性能冻结输入证据独立保留；构建机成本归D06，最终交付V04须核同代。

去向：[D06](PERFORMANCE_TODO.md#d06)、[V04](PERFORMANCE_TODO.md#v04)。

证据：[E055](#e055)；当前源码：[S077](#s077)、[S078](#s078)。

<a id="audit-l12"></a>
### L12 · 初始资源缺件已解决：1429文件校验恢复及真实main启动记录

**已解决**。原外部只读环境1429文件缺件已由该审计恢复，不是当前产品缺陷。本次复用L03当前1874资产逐一SHA及真实Web/离线启动证据；两套数量对应不同清单，不把旧恢复说成本批新优化。

去向：[V01](PERFORMANCE_TODO.md#v01)。

证据：[E038](#e038)、[E055](#e055)、[E094](#e094)、[E025](#e025)、[E027](#e027)。

<a id="audit-l13"></a>
### L13 · 监控口径限制

**证据口径**。missingAssets只检查RUNTIME_ASSETS必需项的状态元数据，ASSETS还并入增量资源。空返回、预下载完成、真实字节通过和GPU-ready必须分开；本轮各批已有清单/请求/模型/GPU门禁证据，函数本身不改成万能完整性证明。

去向：[B01](PERFORMANCE_TODO.md#b01)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E060](#e060)、[E055](#e055)、[E041](#e041)、[E043](#e043)、[E025](#e025)、[E027](#e027)；当前源码：[S079](#s079)、[S080](#s080)。

<a id="audit-pg-002"></a>
### PG-002 · 生产与Zerg第二双生体预留重复扫描同一账本

**已解决**。2026-10-20 S05完成活动订单复用与ID查询，生产/退款/交付/注入/UI共同使用；当前乘客、首个双生死亡和培养继承仍实时读取。三族四档历史、双生/战术进阶/重复交付A/B通过，无跨tick人数缓存。

去向：[S05](PERFORMANCE_TODO.md#s05)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)。

<a id="audit-pg-003"></a>
### PG-003 · 健康双生体仍为维护状态扫描任务乘员

**已解决**。2026-10-20 S05完成健康双生先清理维护状态后返回；代理测试确认无账本读取。残缺双生继续检查待交付/重生，首个死亡后第二个预留语义精确。10000历史局部维护0.04753→0.000068ms，不作为整场FPS。

去向：[S05](PERFORMANCE_TODO.md#s05)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)。

<a id="audit-pg-008"></a>
### PG-008 · Boss轮末回收与队列结算重复过滤整段数组

**保留现状**。2026-10-20 A01随S05复核保留：Boss回收/队列结算保持原有按序获取与过滤；获取可能改变后续资格，阻塞需重试，不采纳无独立证据的压缩候选。源码冻结精确、完整回归覆盖过关/阻塞/恢复/重复领取；无新优化收益声明。

去向：[S05](PERFORMANCE_TODO.md#s05)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)。

<a id="audit-pg-011"></a>
### PG-011 · 直接补给放置反复执行有界全局碰撞搜索

**已解决**。2026-10-20 A01随S06复核：freePosition每次调用按需只收集当前同平面活体，所有原半径/角度/建筑和舱碰撞规则保留。1000实体堵塞压力下降，空场景微小回退保留。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-pg-012"></a>
### PG-012 · 运输舱落点重试重复地图与历史结构扫描

**已解决**。2026-10-20 A01随S06复核：运输舱一次搜索共用当前体型、活动舱、活建筑/结构集合；每次重试重新采集，原192候选窗口、逐点高度/通行/路线验证和重复提交校验保留。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-pg-017"></a>
### PG-017 · 存档DTO验证遍历历史集合及交叉成员关系

**延期**。旧DTO校验仍遍历历史并核对交叉成员关系；它保护结构、幂等与恢复原子性，不能为性能删验证。仅MVP收尾D05可研究单次临时索引，当前舰装局不进入旧存档；本批不实施或启动存档实验。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)、[E044](#e044)；当前源码：[S081](#s081)、[S082](#s082)。

<a id="audit-pg-018"></a>
### PG-018 · 重开、换轮与转无尽有意采用不同重置边界

**保留现状**。新局、下一关、转无尽重置边界有意不同：nextStage保合法战利品/生产历史，转无尽清战斗临时对象，新局清局状态；World身份和监听器保持。同页舰装继续另走memoryContinuation。L03换图/新局和R03继续证据可复用，最终恢复/实际输入仍V03。

去向：[V03](PERFORMANCE_TODO.md#v03)。

证据：[E025](#e025)、[E055](#e055)、[E027](#e027)；当前源码：[S083](#s083)、[S084](#s084)、[S085](#s085)。

<a id="audit-pg-020"></a>
### PG-020 · 购买或领取期间重复刷新全部友军属性

**保留现状**。2026-10-20 A01随S05复核保留：购买/领取仍按真实建筑/卡牌/装备变化即时刷新友军属性，未引入动态缓存或合并通知。源码未变与完整回归为保留控制证据，不宣称本项性能已改善。

去向：[S05](PERFORMANCE_TODO.md#s05)。

证据：[E009](#e009)、[E011](#e011)、[E013](#e013)。

<a id="audit-pg-023"></a>
### PG-023 · 无尽入场预览在就绪和提交时重复计算

**保留现状**。2026-10-20 A01随S06复核：无尽就绪预览与提交各自验证当前占位和状态，保留重复计算。未共享可变实体的旧预览；原转换/原子性回归通过，无单独新增收益。

去向：[S06](PERFORMANCE_TODO.md#s06)。

证据：[E016](#e016)、[E017](#e017)。

<a id="audit-ui-act-001"></a>
### UI-ACT-001 · PackedConsole同次更新重复主动技能资格查询

**已解决**。2026-10-20 U01/U03：资格读取仅限一次同步控制台更新，5坦克场景14→6次；点击执行仍走真实World资格校验。14个UI/手柄状态及实际三尺寸焦点通过，未跨帧缓存。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-obs-001"></a>
### UI-OBS-001 · 同意遥测后GameObserver每显示帧重复统计

**已解决**。2026-10-20 U04完成复核：当前机制复现并优化：只复用上个完整显示帧的观察；World通知仍立即执行，通知后第一帧再读取同tick余下修改。120显示帧＋20通知的changed/roster/economy各140→40，关闭时仍仅20入口且0汇总。生产账本保留已观察ID，按追加游标读取，新数组/缩短重扫。10000历史重复ID读取2800000→0；新局/恢复/撤回/重同意/阶段与时间回退均对照。

去向：[U04](PERFORMANCE_TODO.md#u04)。

证据：[E096](#e096)、[E011](#e011)、[E004](#e004)、[E005](#e005)、[E097](#e097)。

<a id="audit-ui-layout-001"></a>
### UI-LAYOUT-001 · 当前PackedConsole写DOM后同步读尺寸

**保留现状**。2026-10-20 U01/U03：确有写后读尺寸依赖。隔离真实组件100次稳定更新两侧LayoutCount均0、样式重算均200，没有消除重排的收益证据；保留现有尺寸/ResizeObserver路径，只避免同值高度变量写入。折叠、旋转及字号依赖不改。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-pad-001"></a>
### UI-PAD-001 · 已连接手柄每帧重复技能页资格计算

**已解决**。2026-10-20 U01/U03：每次有效战斗轮询复用技能页和资格；面板刷新页构建3→1、资格43→17，纯轮询12→11。实际释放后立即丢弃旧读取器重新计算，保持冷却、翻页、目标和断开语义。

去向：[U03](PERFORMANCE_TODO.md#u03)。

证据：[E010](#e010)、[E011](#e011)、[E025](#e025)、[E027](#e027)、[E012](#e012)。

<a id="audit-ui-pad-002"></a>
### UI-PAD-002 · 手柄空输入菜单仍枚举全部控件布局

**已解决**。2026-10-20 R03小合批：空菜单且焦点有效时仅检查当前控件；每次仍重新定位根/顶层弹窗。首次、禁用/移除/隐藏/inert焦点或真实操作仍全量枚举，未降轮询频率；31行为对照及2/16/64控件计时通过。

去向：[U03](PERFORMANCE_TODO.md#u03)。

证据：[E010](#e010)、[E011](#e011)、[E025](#e025)、[E027](#e027)、[E012](#e012)。

<a id="audit-ui-skin-001"></a>
### UI-SKIN-001 · 关间皮肤MutationObserver构建完整视图投影

**已解决**。2026-10-20 U01/U03：无新卡片/详情时不构造完整查找表；首次卡片或详情仍构造一次并维持覆盖顺序。9个皮肤状态精确；无卡片/已装饰卡片刷新下降，首次构建无稳定收益，慢样本和单独复核均保留。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-pick-001"></a>
### UI-PICK-001 · 同次指针事件重复inspect与拾取射线

**已解决**。2026-10-20 U01/U03：仅复用同一鼠标左键事件中已完成的inspect未命中；空地inspect2→1，移动结果一致。命中、右键、触屏、暂停保持；没有跨事件射线缓存，也未省略独立移动/技能落点查询。

去向：[U03](PERFORMANCE_TODO.md#u03)。

证据：[E010](#e010)、[E011](#e011)、[E025](#e025)、[E027](#e027)、[E012](#e012)。

<a id="audit-ui-preview-001"></a>
### UI-PREVIEW-001 · 地图预览同步WebP编码和localStorage写入

**部分解决**。2026-10-20 L03复核：暂停截图保留640×360/WebP .82，复制当前渲染后用单个toBlob/FileReader任务编码，存储在回调中执行；旧run/map回调不覆盖当前预览。相同图片10对交替、预热后9对同步中位显著降低，首对冷操作回退和总延迟增加保留。首次概览仍同步生成，命中缓存才免重算；不是所有暂停都零长帧。

去向：[L03](PERFORMANCE_TODO.md#l03)、[V01](PERFORMANCE_TODO.md#v01)。

证据：[E055](#e055)、[E064](#e064)、[E025](#e025)、[E027](#e027)。

<a id="audit-ui-cache-001"></a>
### UI-CACHE-001 · 地图预览和overlayScroll跨局缓存无上限

**已解决**。2026-10-20 L03复核：概览最近8条/1MiB、滚动位置最近64条/128KiB，以UTF-16文本/number有效载荷估算预算；超额只丢可再生成展示数据。60概览/120切页容量核验、五图重算字节一致；普通内存账户不使用导入概览，压力夹具与真实频度分列。

去向：[L03](PERFORMANCE_TODO.md#l03)。

证据：[E055](#e055)、[E064](#e064)。

<a id="audit-ui-input-001"></a>
### UI-INPUT-001 · 资源阻塞帧重复输入reset与DOM写入

**已解决**。2026-10-20 R03小合批：保留每次输入清零、路线清理、指针释放，只去掉状态已相同的DOM写入和无目标preview(null)。不改主循环重置时机，不引入可能遗留按键的跨阻塞状态门；实际指针捕获/释放对照通过。

去向：[U03](PERFORMANCE_TODO.md#u03)。

证据：[E010](#e010)、[E011](#e011)、[E025](#e025)、[E027](#e027)、[E012](#e012)。

<a id="audit-ui-hidden-001"></a>
### UI-HIDDEN-001 · 隐藏生产详情仍构造分组和账本HTML

**已解决**。2026-10-20 U01/U03：production-detail在当前控制台默认隐藏；跳过隐藏HTML与分组构造，重新显示时立即使用当前数据，设施页仍通过原入口。S05既有账本查询优化保留。

去向：[U01](PERFORMANCE_TODO.md#u01)。

证据：[E010](#e010)、[E011](#e011)、[E009](#e009)、[E013](#e013)、[E012](#e012)。

<a id="audit-ui-audio-001"></a>
### UI-AUDIO-001 · 音频事件与治疗loop扫描；loop未纳入普通voice上限

**保留现状**。2026-10-20 U04音频子项完成复核：301实体0/1/4/30治疗者原更新约0.0013—0.0032ms，复用Set收益过小且不稳定未采用。32仪器化对照及两侧各9步实际AudioContext启停通过。循环不纳入普通12voice是原规则，未限流；通常World通知10Hz不是每绘制帧，非听觉验收。

去向：[U04](PERFORMANCE_TODO.md#u04)。

证据：[E096](#e096)、[E011](#e011)、[E004](#e004)、[E005](#e005)、[E097](#e097)。

<a id="audit-pst-001"></a>
### PST-001 · 导入预览与提交重复完整验证和深拷贝

**延期**。旧文件导入预览与提交仍多次validateOnly，restoreRun在validateOnly返回前structuredClone；当前舰装入口拒绝旧存档，不能把旧路径的四次clone当普通入口成本。 普通舰装入口memoryOnly，按用户约定留D05/MVP收尾。

去向：[D05](PERFORMANCE_TODO.md#d05)。

证据：[E038](#e038)、[E044](#e044)；当前源码：[S086](#s086)、[S021](#s021)。

<a id="audit-pst-002"></a>
### PST-002 · 返回标题时完整存档编码解码往返

**部分解决**。当前普通舰装入口keepRun使用memoryContinuation保留同页World，已绕开编码/解码；H05及R03实际继续证据沿用。但starship禁用的旧存档分支仍readArchive(exportJSON())，不称所有入口已修，该余项归D05。

去向：[H05](PERFORMANCE_TODO.md#h05)、[D05](PERFORMANCE_TODO.md#d05)。

证据：[E044](#e044)、[E025](#e025)；当前源码：[S085](#s085)、[S021](#s021)。

<a id="audit-tel-001"></a>
### TEL-001 · 遥测队列修剪与组包反复全量序列化

**已解决**。2026-10-20 U04完成复核：当前裁剪和渐增组包重复序列化已测量并局部优化：裁剪保留一次原数组序列化，移除时只扣该事件和逗号；组包逐事件累计含外壳的JSON长度。维持原UTF-16长度×3保守预算、200项/256KiB/24h、heartbeat优先、32项/64000批次、跨标签锁、旧回执保护与撤回。数据可变，不跨操作缓存序列化；普通队列R1回退已撤回。当前默认入口保持离线，无默认FPS收益。

去向：[U04](PERFORMANCE_TODO.md#u04)。

证据：[E096](#e096)、[E011](#e011)、[E004](#e004)、[E005](#e005)、[E097](#e097)。

<a id="audit-b01"></a>
### B01 · 指标缓存频繁整体失效且同key并发缺失会重复14条查询

**延期**。服务端metrics仍只缓存完成结果、批末整体invalidate；冷miss串行统计与同key并发合并候选尚未进入当前源码。外部PGlite/loopback候选不是生产数据库证据。D06需代表性数据、并发、隐私删除代际和连接池验证；非玩家战斗FPS。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E053](#e053)；当前源码：[S087](#s087)、[S088](#s088)。

<a id="audit-b02"></a>
### B02 · 全量阶段JSON拉取及逐阶段平方搭配生成，500输出限额不限制前置工作

**延期**。服务端先全量取stage JSON，再逐阶段产生K(K−1)/2组合，排序后slice500；输出上限不限制前置工作。保留完整分母和run去重，不能先LIMIT原始stage；D06补真实规模/执行计划，不把此源码候选当客户端热点。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S089](#s089)、[S090](#s090)。

<a id="audit-b03"></a>
### B03 · 事件批次内部逐事件串行多次往返

**延期**。遥测批次仍在事务与同visitor锁内逐事件串行处理，重复事件也有前置会话工作。候选需保留授权复核、幂等、单调合并和删除墓碑；D06补DB负载。当前普通入口离线，不从SQL条数推算客户端卡顿。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)、[E096](#e096)；当前源码：[S091](#s091)、[S092](#s092)。

<a id="audit-b04"></a>
### B04 · 启动与每小时全90天日汇总重算及保留期清理

**延期**。启动和每小时仍refreshDaily全窗口再维护，busy为进程内；/api/config等待ready，静态游戏服务独立。D06需测DB IO/锁、增量与多实例协调；保留即时隐私删除，不把维护估计成本当当前线上慢查询。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S093](#s093)、[S094](#s094)。

<a id="audit-b05"></a>
### B05 · 现有索引与关联访问/保留期谓词存在待测匹配缺口

**延期**。当前迁移已具事件主键、events_day_kind、runs_filters等索引；部分visitor/run/time、retention谓词仍待代表性EXPLAIN验证。不能称全无索引或盲加索引；真实数据库计划、写放大与收益归D06。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S095](#s095)、[S096](#s096)。

<a id="audit-b06"></a>
### B06 · 生产静态服务器listen前同步完整资源验签，readonly PGlite恢复也同步

**延期**。本地资源部署createGameServer在监听前逐文件同步SHA，PGlite只读重定向恢复含同步gunzip/写入；外部资源地址分支不同。是进程冷启成本，非逐玩家/逐帧。完整性门禁保持，D06独立测启动再评估流式预检。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S097](#s097)、[S098](#s098)。

<a id="audit-b07"></a>
### B07 · 静态请求同步元数据和每响应重复gzip

**延期**。静态server当前仍同步exists/stat并按200响应新建异步gzip流；gzip并非同步压缩。源实验曾回退/调整后纳入隔离组合，当前源码未合入，不能整包搬运。D06在冷缓存并发/编码/ETag/CORS相同语义下重测。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E053](#e053)、[E038](#e038)；当前源码：[S099](#s099)、[S100](#s100)。

<a id="audit-b08"></a>
### B08 · 通用preview server整文件Buffer读取巨大离线HTML

**延期**。通用tools/serve.mjs仍readFile整文件再res.end，大离线HTML可带来服务进程Buffer峰值；专用性能服务和生产coze走流式，是不同路径。本批不启通用服务加载大HTML，不改历史工具；D06有实际使用需求时验证流式/背压。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S101](#s101)、[S102](#s102)。

<a id="audit-b09"></a>
### B09 · 后台自动取完整metrics并重建表格，cards/archive与CSV无统一行数预算

**延期**。后台多数标签仍取完整metrics并innerHTML整表，cards/archive与CSV缺统一行数预算；busy防单页并发，部分500限额保留。D06单独处理分页/报表复用与导出预算，不能把管理页当玩家HUD。

去向：[D06](PERFORMANCE_TODO.md#d06)。

证据：[E038](#e038)；当前源码：[S103](#s103)、[S104](#s104)。

<a id="audit-data-001"></a>
### DATA-001 · 已缓存战役定义的就绪检查仍新建地形wrapper并扫高度

**已解决**。L01已抽出campaignDefinition缓存身份；后台isReady只取定义hash，不创建MapTerrain/扫高度。真正开局仍new独立RadialTerrain，避免共享可变stage/route。五图热检查高度读取5145600→0证据沿用，本次定义缓存/独立实例回归通过。

去向：[L01](PERFORMANCE_TODO.md#l01)。

证据：[E051](#e051)、[E052](#e052)；当前源码：[S105](#s105)、[S106](#s106)。

<a id="audit-data-002"></a>
### DATA-002 · 冷战役生成和legacy地表有限准备工作量

**保留现状**。2026-10-20 L02完成复核：设计边界保留：冷战役地图/legacy地表属于有限准备工作；本批记录mapPreparation，不把它列作每帧模拟负载或重建地图。地图生成、五图及fallback行为未改。

去向：[L02](PERFORMANCE_TODO.md#l02)。

证据：[E060](#e060)、[E011](#e011)、[E061](#e061)。

## 当前源码锚点

行号对应本次哈希记录的文件；未来源码变更后以QA与source-anchors.json中保存的片段和哈希为准。

<a id="s001"></a>
- **S001**：[src/simulation/combat/team-auras.ts:36](../../src/simulation/combat/team-auras.ts#L36)；定位文本：`function potentialEliteSources`。文件证据E006。
<a id="s002"></a>
- **S002**：[src/simulation/combat/team-auras.ts:39](../../src/simulation/combat/team-auras.ts#L39)；定位文本：`export function compositeEliteBuff`。文件证据E006。
<a id="s003"></a>
- **S003**：[src/simulation/expedition-economy.ts:25](../../src/simulation/expedition-economy.ts#L25)；定位文本：`export function draftContext`。文件证据E014。
<a id="s004"></a>
- **S004**：[src/simulation/progression/expedition-drafts.ts:273](../../src/simulation/progression/expedition-drafts.ts#L273)；定位文本：`export function drawBossLoot`。文件证据E015。
<a id="s005"></a>
- **S005**：[src/data/enemy-tuning.ts:22](../../src/data/enemy-tuning.ts#L22)；定位文本：`export const endlessFrequency`。文件证据E022。
<a id="s006"></a>
- **S006**：[src/data/enemy-tuning.ts:24](../../src/data/enemy-tuning.ts#L24)；定位文本：`export function continuousEndlessGrowth`。文件证据E022。
<a id="s007"></a>
- **S007**：[src/simulation/world.ts:352](../../src/simulation/world.ts#L352)；定位文本：`private updateEndlessSpawns`。文件证据E023。
<a id="s008"></a>
- **S008**：[src/data/endless.ts:55](../../src/data/endless.ts#L55)；定位文本：`export function endlessWaveTemplate`。文件证据E024。
<a id="s009"></a>
- **S009**：[src/data/endless.ts:25](../../src/data/endless.ts#L25)；定位文本：`function cumulativeThreat`。文件证据E024。
<a id="s010"></a>
- **S010**：[src/simulation/world.ts:1022](../../src/simulation/world.ts#L1022)；定位文本：`if(this.autoWaves)while(this.specialPlan`。文件证据E023。
<a id="s011"></a>
- **S011**：[src/simulation/world.ts:1037](../../src/simulation/world.ts#L1037)；定位文本：`this.time-u.deadAt>1.5`。文件证据E023。
<a id="s012"></a>
- **S012**：[src/render/effects/source/player.ts:112](../../src/render/effects/source/player.ts#L112)；定位文本：`this.clock-m.lastUsed<2`。文件证据E028。
<a id="s013"></a>
- **S013**：[src/render/materials/unit-material-batch.ts:61](../../src/render/materials/unit-material-batch.ts#L61)；定位文本：`const key=JSON.stringify([pose.clip`。文件证据E037。
<a id="s014"></a>
- **S014**：[src/render/materials/unit-material-batch.ts:67](../../src/render/materials/unit-material-batch.ts#L67)；定位文本：`private sample(`。文件证据E037。
<a id="s015"></a>
- **S015**：[src/render/materials/unit-material-batch.ts:65](../../src/render/materials/unit-material-batch.ts#L65)；定位文本：`for(const values of rows)`。文件证据E037。
<a id="s016"></a>
- **S016**：[src/render/effects/source/player.ts:78](../../src/render/effects/source/player.ts#L78)；定位文本：`request.age>sourceLife`。文件证据E028。
<a id="s017"></a>
- **S017**：[src/render/effects/source/player.ts:105](../../src/render/effects/source/player.ts#L105)；定位文本：`if(age>sourceLife(def))`。文件证据E028。
<a id="s018"></a>
- **S018**：[src/render/effects/source/player.ts:114](../../src/render/effects/source/player.ts#L114)；定位文本：`private releaseMesh`。文件证据E028。
<a id="s019"></a>
- **S019**：[src/render/effects/source/player.ts:76](../../src/render/effects/source/player.ts#L76)；定位文本：`private play(`。文件证据E028。
<a id="s020"></a>
- **S020**：[src/app/run-session.ts:62](../../src/app/run-session.ts#L62)；定位文本：`this.savedAt=readArchive(raw).savedAt`。文件证据E045。
<a id="s021"></a>
- **S021**：[src/app/run-session.ts:34](../../src/app/run-session.ts#L34)；定位文本：`get memoryOnly()`。文件证据E045。
<a id="s022"></a>
- **S022**：[src/persistence/save-repository.ts:8](../../src/persistence/save-repository.ts#L8)；定位文本：`async commit(raw:string)`。文件证据E046。
<a id="s023"></a>
- **S023**：[src/persistence/save-repository.ts:8](../../src/persistence/save-repository.ts#L8)；定位文本：`commit(raw:string){readArchive(raw)`。文件证据E046。
<a id="s024"></a>
- **S024**：[src/app/run-session.ts:60](../../src/app/run-session.ts#L60)；定位文本：`async saveNow(){const raw=this.exportJSON()`。文件证据E045。
<a id="s025"></a>
- **S025**：[src/simulation/world.ts:227](../../src/simulation/world.ts#L227)；定位文本：`captureRun():RunSnapshot`。文件证据E023。
<a id="s026"></a>
- **S026**：[src/simulation/persistence/run-fields.ts:38](../../src/simulation/persistence/run-fields.ts#L38)；定位文本：`export function selectRunData`。文件证据E047。
<a id="s027"></a>
- **S027**：[src/simulation/fixed-stepper.ts:8](../../src/simulation/fixed-stepper.ts#L8)；定位文本：`advance(elapsed:number)`。文件证据E050。
<a id="s028"></a>
- **S028**：[src/render/scene/battle-renderer.ts:438](../../src/render/scene/battle-renderer.ts#L438)；定位文本：`for(const key of [displayModelKey(u),this.modelKey(u)])`。文件证据E054。
<a id="s029"></a>
- **S029**：[src/render/materials/shared-textures.ts:12](../../src/render/materials/shared-textures.ts#L12)；定位文本：`async image(url:string)`。文件证据E057。
<a id="s030"></a>
- **S030**：[src/render/materials/shared-textures.ts:11](../../src/render/materials/shared-textures.ts#L11)；定位文本：`forget(urls:Iterable<string>)`。文件证据E057。
<a id="s031"></a>
- **S031**：[src/render/materials/unit-material-batch.ts:162](../../src/render/materials/unit-material-batch.ts#L162)；定位文本：`programKey(`。文件证据E037。
<a id="s032"></a>
- **S032**：[src/render/materials/posed-depth.ts:30](../../src/render/materials/posed-depth.ts#L30)；定位文本：`customProgramCacheKey`。文件证据E059。
<a id="s033"></a>
- **S033**：[src/render/scene/battle-renderer.ts:242](../../src/render/scene/battle-renderer.ts#L242)；定位文本：`pending.slice(i,i+8)`。文件证据E054。
<a id="s034"></a>
- **S034**：[src/render/scene/battle-renderer.ts:271](../../src/render/scene/battle-renderer.ts#L271)；定位文本：`private warmLightingFrame()`。文件证据E054。
<a id="s035"></a>
- **S035**：[src/render/units/sampled-poses.ts:23](../../src/render/units/sampled-poses.ts#L23)；定位文本：`function* samples(`。文件证据E063。
<a id="s036"></a>
- **S036**：[src/render/units/sampled-poses.ts:65](../../src/render/units/sampled-poses.ts#L65)；定位文本：`export async function preparePoseDataAsync`。文件证据E063。
<a id="s037"></a>
- **S037**：[src/assets/persistent-cache.ts:35](../../src/assets/persistent-cache.ts#L35)；定位文本：`async get(hash:string)`。文件证据E066。
<a id="s038"></a>
- **S038**：[src/assets/http-store.ts:23](../../src/assets/http-store.ts#L23)；定位文本：`const cached=await this.cache.get`。文件证据E067。
<a id="s039"></a>
- **S039**：[src/render/scene/battle-renderer.ts:184](../../src/render/scene/battle-renderer.ts#L184)；定位文本：`this.renderer.compileAsync`。文件证据E054。
<a id="s040"></a>
- **S040**：[src/render/scene/battle-renderer.ts:269](../../src/render/scene/battle-renderer.ts#L269)；定位文本：`gl.clientWaitSync`。文件证据E054。
<a id="s041"></a>
- **S041**：[src/render/scene/battle-renderer.ts:273](../../src/render/scene/battle-renderer.ts#L273)；定位文本：`this.renderer.getContext().finish()`。文件证据E054。
<a id="s042"></a>
- **S042**：[src/app/background-preparation.ts:25](../../src/app/background-preparation.ts#L25)；定位文本：`soft=start+Math.max(0,15000-navigationElapsed)`。文件证据E068。
<a id="s043"></a>
- **S043**：[src/render/scene/battle-renderer.ts:337](../../src/render/scene/battle-renderer.ts#L337)；定位文本：`await this.warmPresentationBatches(()=>{},true)`。文件证据E054。
<a id="s044"></a>
- **S044**：[src/app/background-preparation.ts:30](../../src/app/background-preparation.ts#L30)；定位文本：`async enter(`。文件证据E068。
<a id="s045"></a>
- **S045**：[src/render/loaders/semantic-gltf.ts:2](../../src/render/loaders/semantic-gltf.ts#L2)；定位文本：`GLTFLoader`。文件证据E071。
<a id="s046"></a>
- **S046**：[src/app/background-preparation.ts:24](../../src/app/background-preparation.ts#L24)；定位文本：`async opening(`。文件证据E068。
<a id="s047"></a>
- **S047**：[src/render/scene/battle-renderer.ts:331](../../src/render/scene/battle-renderer.ts#L331)；定位文本：`const selectedModels=[...models].slice(0,24)`。文件证据E054。
<a id="s048"></a>
- **S048**：[src/render/effects/confirmed-hero/skill-effects.ts:109](../../src/render/effects/confirmed-hero/skill-effects.ts#L109)；定位文本：`if(b.count>0)`。文件证据E074。
<a id="s049"></a>
- **S049**：[src/app/bootstrap.ts:54](../../src/app/bootstrap.ts#L54)；定位文本：`new FixedStepper`。文件证据E075。
<a id="s050"></a>
- **S050**：[src/simulation/movement/mine-routing.ts:8](../../src/simulation/movement/mine-routing.ts#L8)；定位文本：`export function`。文件证据E078。
<a id="s051"></a>
- **S051**：[src/simulation/combat/tracking-mines.ts:4](../../src/simulation/combat/tracking-mines.ts#L4)；定位文本：`mine`。文件证据E079。
<a id="s052"></a>
- **S052**：[src/simulation/movement/steering.ts:25](../../src/simulation/movement/steering.ts#L25)；定位文本：`export function steerGoal`。文件证据E080。
<a id="s053"></a>
- **S053**：[src/render/materials/unit-material-batch.ts:83](../../src/render/materials/unit-material-batch.ts#L83)；定位文本：`flush(){`。文件证据E037。
<a id="s054"></a>
- **S054**：[src/render/materials/unit-material-batch.ts:13](../../src/render/materials/unit-material-batch.ts#L13)；定位文本：`restoreMaterialUploads`。文件证据E037。
<a id="s055"></a>
- **S055**：[src/render/scene/renderable-registry.ts:7](../../src/render/scene/renderable-registry.ts#L7)；定位文本：`export class RenderableRegistry`。文件证据E081。
<a id="s056"></a>
- **S056**：[src/render/scene/scene-contact.ts:73](../../src/render/scene/scene-contact.ts#L73)；定位文本：`finally`。文件证据E082。
<a id="s057"></a>
- **S057**：[src/render/materials/posed-depth.ts:56](../../src/render/materials/posed-depth.ts#L56)；定位文本：`configure(root:THREE.Object3D)`。文件证据E059。
<a id="s058"></a>
- **S058**：[src/render/scene/battle-renderer.ts:548](../../src/render/scene/battle-renderer.ts#L548)；定位文本：`private cameraFrame()`。文件证据E054。
<a id="s059"></a>
- **S059**：[src/render/scene/camera-controller.ts:69](../../src/render/scene/camera-controller.ts#L69)；定位文本：`update(`。文件证据E083。
<a id="s060"></a>
- **S060**：[src/render/scene/building-view-lifecycle.ts:6](../../src/render/scene/building-view-lifecycle.ts#L6)；定位文本：`export function releaseBuildingView`。文件证据E084。
<a id="s061"></a>
- **S061**：[src/render/scene/battle-renderer.ts:660](../../src/render/scene/battle-renderer.ts#L660)；定位文本：`for(const [id,mixer] of this.fortMixers)`。文件证据E054。
<a id="s062"></a>
- **S062**：[src/render/effects/confirmed-hero/controller.ts:17](../../src/render/effects/confirmed-hero/controller.ts#L17)；定位文本：`get packets()`。文件证据E085。
<a id="s063"></a>
- **S063**：[src/render/effects/protoss-hero-effects.ts:54](../../src/render/effects/protoss-hero-effects.ts#L54)；定位文本：`beginFrame(){`。文件证据E086。
<a id="s064"></a>
- **S064**：[src/render/effects/protoss-hero-materials.ts:33](../../src/render/effects/protoss-hero-materials.ts#L33)；定位文本：`base+n*2>16384`。文件证据E087。
<a id="s065"></a>
- **S065**：[src/assets/http-store.ts:67](../../src/assets/http-store.ts#L67)；定位文本：`const ids=[...Object.keys(store.manifest.assets).filter`。文件证据E067。
<a id="s066"></a>
- **S066**：[src/assets/offline-pack.ts:144](../../src/assets/offline-pack.ts#L144)；定位文本：`const menuIds=`。文件证据E088。
<a id="s067"></a>
- **S067**：[src/app/race-preload.ts:7](../../src/app/race-preload.ts#L7)；定位文本：`export function racePreloadModels`。文件证据E089。
<a id="s068"></a>
- **S068**：[src/render/scene/battle-renderer.ts:473](../../src/render/scene/battle-renderer.ts#L473)；定位文本：`await this.prepareEndlessAssets(`。文件证据E054。
<a id="s069"></a>
- **S069**：[src/assets/persistent-cache.ts:3](../../src/assets/persistent-cache.ts#L3)；定位文本：`const CACHE='sc2-resource-bytes-v1'`。文件证据E066。
<a id="s070"></a>
- **S070**：[src/assets/persistent-cache.ts:37](../../src/assets/persistent-cache.ts#L37)；定位文本：`async put(`。文件证据E066。
<a id="s071"></a>
- **S071**：[src/assets/http-store.ts:8](../../src/assets/http-store.ts#L8)；定位文本：`private shared=new Map`。文件证据E067。
<a id="s072"></a>
- **S072**：[src/platform/wechat/asset-cache.ts:29](../../src/platform/wechat/asset-cache.ts#L29)；定位文本：`m.mapId!=='kairos'`。文件证据E090。
<a id="s073"></a>
- **S073**：[src/platform/wechat/game-session.ts:23](../../src/platform/wechat/game-session.ts#L23)；定位文本：`map.kairos`。文件证据E091。
<a id="s074"></a>
- **S074**：[src/platform/wechat/preflight.ts:42](../../src/platform/wechat/preflight.ts#L42)；定位文本：`预检`。文件证据E092。
<a id="s075"></a>
- **S075**：[src/platform/wechat/asset-cache.ts:58](../../src/platform/wechat/asset-cache.ts#L58)；定位文本：`setActiveIds(ids:Iterable<string>)`。文件证据E090。
<a id="s076"></a>
- **S076**：[src/platform/wechat/asset-cache.ts:109](../../src/platform/wechat/asset-cache.ts#L109)；定位文本：`private makeRoom(`。文件证据E090。
<a id="s077"></a>
- **S077**：[tools/build-online-demo.mjs:9](../../tools/build-online-demo.mjs#L9)；定位文本：`const release=JSON.parse(await fs.readFile('dist/web/web-release.json'`。文件证据E093。
<a id="s078"></a>
- **S078**：[tools/build-online-demo.mjs:13](../../tools/build-online-demo.mjs#L13)；定位文本：`entryPoints:['src/main.ts']`。文件证据E093。
<a id="s079"></a>
- **S079**：[src/assets/manifest.ts:17](../../src/assets/manifest.ts#L17)；定位文本：`export const missingAssets`。文件证据E095。
<a id="s080"></a>
- **S080**：[src/assets/manifest.ts:11](../../src/assets/manifest.ts#L11)；定位文本：`export const ASSETS`。文件证据E095。
<a id="s081"></a>
- **S081**：[src/simulation/persistence/run-fields.ts:39](../../src/simulation/persistence/run-fields.ts#L39)；定位文本：`export function validateRunData`。文件证据E047。
<a id="s082"></a>
- **S082**：[src/simulation/world.ts:243](../../src/simulation/world.ts#L243)；定位文本：`const data=structuredClone(snapshot)`。文件证据E023。
<a id="s083"></a>
- **S083**：[src/simulation/world.ts:332](../../src/simulation/world.ts#L332)；定位文本：`commitEndlessTransition(`。文件证据E023。
<a id="s084"></a>
- **S084**：[src/simulation/world.ts:218](../../src/simulation/world.ts#L218)；定位文本：`resetRun(difficulty:`。文件证据E023。
<a id="s085"></a>
- **S085**：[src/app/run-session.ts:127](../../src/app/run-session.ts#L127)；定位文本：`keepRun(){`。文件证据E045。
<a id="s086"></a>
- **S086**：[src/app/run-session.ts:97](../../src/app/run-session.ts#L97)；定位文本：`prepareLoad(raw?:string)`。文件证据E045。
<a id="s087"></a>
- **S087**：[tools/backend/metrics.mjs:8](../../tools/backend/metrics.mjs#L8)；定位文本：`export async function metrics`。文件证据E098。
<a id="s088"></a>
- **S088**：[tools/backend/repository.mjs:9](../../tools/backend/repository.mjs#L9)；定位文本：`invalidate(){this.cache.clear();}`。文件证据E099。
<a id="s089"></a>
- **S089**：[tools/backend/metrics.mjs:17](../../tools/backend/metrics.mjs#L17)；定位文本：`const stages=await q(`。文件证据E098。
<a id="s090"></a>
- **S090**：[tools/backend/metrics.mjs:25](../../tools/backend/metrics.mjs#L25)；定位文本：`function buildSummaries(`。文件证据E098。
<a id="s091"></a>
- **S091**：[tools/backend/repository.mjs:20](../../tools/backend/repository.mjs#L20)；定位文本：`accepted=[];for(const e of events)`。文件证据E099。
<a id="s092"></a>
- **S092**：[src/main.ts:6](../../src/main.ts#L6)；定位文本：`startGame`。文件证据E100。
<a id="s093"></a>
- **S093**：[tools/backend/service.mjs:23](../../tools/backend/service.mjs#L23)；定位文本：`async function maintain()`。文件证据E101。
<a id="s094"></a>
- **S094**：[tools/backend/metrics.mjs:27](../../tools/backend/metrics.mjs#L27)；定位文本：`export async function refreshDaily`。文件证据E098。
<a id="s095"></a>
- **S095**：[tools/backend/migrations/001.sql:11](../../tools/backend/migrations/001.sql#L11)；定位文本：`CREATE INDEX IF NOT EXISTS events_day_kind`。文件证据E102。
<a id="s096"></a>
- **S096**：[tools/backend/migrations/001.sql:8](../../tools/backend/migrations/001.sql#L8)；定位文本：`CREATE INDEX IF NOT EXISTS runs_filters`。文件证据E102。
<a id="s097"></a>
- **S097**：[tools/coze-web-server.mjs:14](../../tools/coze-web-server.mjs#L14)；定位文本：`if(!assetBaseUrl)for(`。文件证据E103。
<a id="s098"></a>
- **S098**：[tools/start-coze.mjs:23](../../tools/start-coze.mjs#L23)；定位文本：`zlib.gunzipSync(buf)`。文件证据E104。
<a id="s099"></a>
- **S099**：[tools/coze-web-server.mjs:29](../../tools/coze-web-server.mjs#L29)；定位文本：`const stat=statSync(file)`。文件证据E103。
<a id="s100"></a>
- **S100**：[tools/coze-web-server.mjs:35](../../tools/coze-web-server.mjs#L35)；定位文本：`stream.pipe(createGzip({level:1}))`。文件证据E103。
<a id="s101"></a>
- **S101**：[tools/serve.mjs:4](../../tools/serve.mjs#L4)；定位文本：`res.end(await fs.readFile(file))`。文件证据E105。
<a id="s102"></a>
- **S102**：[tools/coze-web-server.mjs:35](../../tools/coze-web-server.mjs#L35)；定位文本：`const stream=createReadStream(file)`。文件证据E103。
<a id="s103"></a>
- **S103**：[tools/backend/admin/app.js:21](../../tools/backend/admin/app.js#L21)；定位文本：`async function load()`。文件证据E106。
<a id="s104"></a>
- **S104**：[tools/backend/service.mjs:17](../../tools/backend/service.mjs#L17)；定位文本：`function tableCSV(`。文件证据E101。
<a id="s105"></a>
- **S105**：[src/data/campaign-map.ts:26](../../src/data/campaign-map.ts#L26)；定位文本：`export function campaignDefinition(`。文件证据E107。
<a id="s106"></a>
- **S106**：[src/render/scene/battle-renderer.ts:340](../../src/render/scene/battle-renderer.ts#L340)；定位文本：`campaignDefinition(map)`。文件证据E054。

## 证据索引

以下引用全部验证文件存在并记录SHA。链接到既有报告代表复用其指定范围，不表示本次重新执行其中的测试或接受其全部历史候选。

<a id="e001"></a>
- **E001**：[docs/project/PERFORMANCE_S01_S02_20261020.md](PERFORMANCE_S01_S02_20261020.md)；6340字节；SHA-256 `f1ae0c3b643534b1fb877857ec7700e6c0ae10d969baa1ae373366e9b7b5529d`。
<a id="e002"></a>
- **E002**：[reports/qa/performance-s01-s02-20261020.json](../../reports/qa/performance-s01-s02-20261020.json)；372245字节；SHA-256 `ffe412a2955f03ee31ab58c8565a81ae99930c80e4283e714f2aca1669951bd1`。
<a id="e003"></a>
- **E003**：[docs/project/PERFORMANCE_OPTIMIZATION_20261016.md](PERFORMANCE_OPTIMIZATION_20261016.md)；11261字节；SHA-256 `dbbdfaa06446ff583cccaa3bf1464fe4625b3df18e022a133caeca12b309b0a1`。
<a id="e004"></a>
- **E004**：[docs/project/PERFORMANCE_S08_20261020.md](PERFORMANCE_S08_20261020.md)；9409字节；SHA-256 `c30ff93658e4d0270500583709b9fe433d070cd6ce0f444cb943ba43f48152aa`。
<a id="e005"></a>
- **E005**：[reports/qa/performance-s08-20261020.json](../../reports/qa/performance-s08-20261020.json)；401991字节；SHA-256 `ce75bb834982f0353d187bfa4dcdcfa70220b66211658c910dc89459007a57e2`。
<a id="e006"></a>
- **E006**：[src/simulation/combat/team-auras.ts](../../src/simulation/combat/team-auras.ts)；15783字节；SHA-256 `a1a66914d7d9f1737d2950d7cc2a2988ff2adeb2998a20745bb22e123ee5e1e5`。
<a id="e007"></a>
- **E007**：[docs/project/PERFORMANCE_S04_20261020.md](PERFORMANCE_S04_20261020.md)；7879字节；SHA-256 `f9157bd62d383060abdd4b9a3242e389c197a74155d059a8ab082f65372842fe`。
<a id="e008"></a>
- **E008**：[reports/qa/performance-s04-20261020.json](../../reports/qa/performance-s04-20261020.json)；507450字节；SHA-256 `e7f0059d12db9d9be3c468870f8255ab25a8a1a407d31221ccbe2b133cf2eb7b`。
<a id="e009"></a>
- **E009**：[docs/project/PERFORMANCE_S05_20261020.md](PERFORMANCE_S05_20261020.md)；8441字节；SHA-256 `67af64379ccd76769ead6441f22eea4550a324c3a03d1b01c9748d1666d85ace`。
<a id="e010"></a>
- **E010**：[docs/project/PERFORMANCE_U01_U03_20261020.md](PERFORMANCE_U01_U03_20261020.md)；10748字节；SHA-256 `66a2c3509b1fa42664c1eac1558c3838b8b67f5f67b2b420009a76b23d0f291a`。
<a id="e011"></a>
- **E011**：[docs/project/PERFORMANCE_B03_INTERACTION_LONGRUN_20261019.md](PERFORMANCE_B03_INTERACTION_LONGRUN_20261019.md)；21283字节；SHA-256 `638bd11ee6c33a6da51c853361a5a70639c9b28cf4192e8610c0cf312a01e9a7`。
<a id="e012"></a>
- **E012**：[reports/qa/performance-u01-u03-20261020.json](../../reports/qa/performance-u01-u03-20261020.json)；458518字节；SHA-256 `014798fe30481831cc96255ecdd0d66691acf51f3899a3f97f9143e90b0812e8`。
<a id="e013"></a>
- **E013**：[reports/qa/performance-s05-20261020.json](../../reports/qa/performance-s05-20261020.json)；339820字节；SHA-256 `78a5ac028f05d1819b4c2623813de82a4f31fa00bb02e7887324d23f1c2ebc1c`。
<a id="e014"></a>
- **E014**：[src/simulation/expedition-economy.ts](../../src/simulation/expedition-economy.ts)；18097字节；SHA-256 `346246ec6e887b575a3221f5335c295f53850b613757078d8643e3f96286105f`。
<a id="e015"></a>
- **E015**：[src/simulation/progression/expedition-drafts.ts](../../src/simulation/progression/expedition-drafts.ts)；35944字节；SHA-256 `dae83c6884bad6a34ece40ff4779e4b833756970c087b5aa0a0cde8c293daf15`。
<a id="e016"></a>
- **E016**：[docs/project/PERFORMANCE_S06_20261020.md](PERFORMANCE_S06_20261020.md)；8494字节；SHA-256 `7d76572134d3cd86822986f2d0127d7900509d9db331c66c9e99617857856cf7`。
<a id="e017"></a>
- **E017**：[reports/qa/performance-s06-20261020.json](../../reports/qa/performance-s06-20261020.json)；290658字节；SHA-256 `0ca12aa1b68466472bcf83f11d7ff40dbeeb1db691e84159457ffa71e0169b0c`。
<a id="e018"></a>
- **E018**：[docs/project/PERFORMANCE_S07_20261020.md](PERFORMANCE_S07_20261020.md)；12284字节；SHA-256 `9d18a695765b76cf2c69ac06679b78fef27eb1b399d661d40716733a856ea225`。
<a id="e019"></a>
- **E019**：[reports/qa/performance-s07-20261020.json](../../reports/qa/performance-s07-20261020.json)；547861字节；SHA-256 `0ad79cfd7e695f5d1c42a786210d96b64bdf2d0f6622703a8cdf8a22a6b78ce9`。
<a id="e020"></a>
- **E020**：[docs/project/PERFORMANCE_B02_SCENES_20261019.md](PERFORMANCE_B02_SCENES_20261019.md)；24478字节；SHA-256 `3c3e8505678727987a429c9d22ff697c0fd0a8f32d3866214a09e71047564b30`。
<a id="e021"></a>
- **E021**：[docs/project/DIFFICULTY_R2_IMPLEMENTATION_20261016.md](DIFFICULTY_R2_IMPLEMENTATION_20261016.md)；12277字节；SHA-256 `0a22bf95828640a04c0610497a8b1b90c506312f2dc78442fad03fcfc8e2000f`。
<a id="e022"></a>
- **E022**：[src/data/enemy-tuning.ts](../../src/data/enemy-tuning.ts)；6752字节；SHA-256 `4624e84d0faedf2870f21f2186cd5b7acf30ef181377827b817e94f48c5324f3`。
<a id="e023"></a>
- **E023**：[src/simulation/world.ts](../../src/simulation/world.ts)；154839字节；SHA-256 `5b2e65721c33f86d7aeadce541f0d5fa35778c62b7a62d1a4018de6a66bdf760`。
<a id="e024"></a>
- **E024**：[src/data/endless.ts](../../src/data/endless.ts)；7237字节；SHA-256 `5e20e4a612bbf7712388df09a7ea437e51dc9dab093dde93e4f8ee22362b0125`。
<a id="e025"></a>
- **E025**：[docs/project/PERFORMANCE_R03_20261020.md](PERFORMANCE_R03_20261020.md)；8828字节；SHA-256 `3caf305ce143372d713dfa4037eaf08e7a4431a85a12a88e75212fae190c5b8e`。
<a id="e026"></a>
- **E026**：[docs/project/PERFORMANCE_F01_F04_F02_20261020.md](PERFORMANCE_F01_F04_F02_20261020.md)；6446字节；SHA-256 `1c34cf75a592f2c0fde5b1983bbfd3a5070ea79aefb68e17ad98ca8fb07a2728`。
<a id="e027"></a>
- **E027**：[reports/qa/performance-r03-20261020.json](../../reports/qa/performance-r03-20261020.json)；1050509字节；SHA-256 `a078b93e15b19138cd89264bec40667ceabab23481643b96e9709a9e85e9146e`。
<a id="e028"></a>
- **E028**：[src/render/effects/source/player.ts](../../src/render/effects/source/player.ts)；15855字节；SHA-256 `a431cb8323356dbdd33521ea902a1feed49ef3ebf767068ba6ae983692dd242a`。
<a id="e029"></a>
- **E029**：[reports/qa/performance-f01-f04-f02-20261020.json](../../reports/qa/performance-f01-f04-f02-20261020.json)；12642字节；SHA-256 `31aa05673ec1059ab30645162ed13344bf5cbbfbb76cc34cc39f378e3e2a7480`。
<a id="e030"></a>
- **E030**：[docs/project/PERFORMANCE_X01_X02_20261020.md](PERFORMANCE_X01_X02_20261020.md)；10410字节；SHA-256 `d83137a6bb3f92ba9f15452e890ed2f70742ba39eca782284fc2794587918d18`。
<a id="e031"></a>
- **E031**：[reports/qa/performance-x01-x02-20261020.json](../../reports/qa/performance-x01-x02-20261020.json)；223834字节；SHA-256 `cfbb348464bd599e22e4a2c3ff1f1b41c6ad1b396a0486e72e692de14c964188`。
<a id="e032"></a>
- **E032**：[docs/project/PERFORMANCE_X03_20261020.md](PERFORMANCE_X03_20261020.md)；7214字节；SHA-256 `82c3138a2d0d747de4078f8df3db2fa537e8bfea9c0538cc3ba697acc0b2dd96`。
<a id="e033"></a>
- **E033**：[docs/project/PERFORMANCE_X04_20261020.md](PERFORMANCE_X04_20261020.md)；4585字节；SHA-256 `96e4c1de7db09ffc2e5d43ffdf923448c3b2c3393573c731d2971ddd95b5300a`。
<a id="e034"></a>
- **E034**：[reports/qa/performance-x03-20261020.json](../../reports/qa/performance-x03-20261020.json)；204646字节；SHA-256 `dd5f4ef86332c2e7554967bc8b78f00880e4f14b3848c3cf0621ab22784109b2`。
<a id="e035"></a>
- **E035**：[reports/qa/performance-x04-20261020.json](../../reports/qa/performance-x04-20261020.json)；209606字节；SHA-256 `46b612c0194b0091649b6de68b4c77f9b5b6c569030561f724bb21ac05fd9bed`。
<a id="e036"></a>
- **E036**：[docs/project/EQUIPMENT_EFFECTS_PERFORMANCE_20261016.md](EQUIPMENT_EFFECTS_PERFORMANCE_20261016.md)；13122字节；SHA-256 `a03b5ec20a2f773ea244e3c1104bc220cb7c969b4ab32df9693e8fbf1dbfd8d8`。
<a id="e037"></a>
- **E037**：[src/render/materials/unit-material-batch.ts](../../src/render/materials/unit-material-batch.ts)；18172字节；SHA-256 `5204cf7eba90f8e0caeb8b1a7e5448531074171a076b7d1e0d6f27bef5f71f11`。
<a id="e038"></a>
- **E038**：[reports/local/performance-audit-review-20261019/全项目性能审计与问题总表.md](../../reports/local/performance-audit-review-20261019/全项目性能审计与问题总表.md)；302692字节；SHA-256 `775b185c794ac131a07255381dc9758445b62b05af04d07438eeb544ae560ff8`。
<a id="e039"></a>
- **E039**：[docs/project/PERFORMANCE_R01_20261020.md](PERFORMANCE_R01_20261020.md)；12747字节；SHA-256 `95848853d07b806e53386fb9626587f90a3f9b404dc6edb2eb5bd86b67e3885f`。
<a id="e040"></a>
- **E040**：[reports/qa/performance-r01-20261020.json](../../reports/qa/performance-r01-20261020.json)；98433字节；SHA-256 `7cb2436cbcf8752018f316963a08ac6142a7c09dd5ff614ef1894a05ae5ea7d2`。
<a id="e041"></a>
- **E041**：[docs/project/PERFORMANCE_B01_BASELINE_20261019.md](PERFORMANCE_B01_BASELINE_20261019.md)；7761字节；SHA-256 `f2012288302f4993165d1df1c9b853edfef799431cab5697b3bc1ba5cec6d4a3`。
<a id="e042"></a>
- **E042**：[reports/qa/performance-b02-20261019.json](../../reports/qa/performance-b02-20261019.json)；269533字节；SHA-256 `383c6bb4c8b30d2e1aecb07eacd6ef2f00739cc56c4824b05c92dedbb03f6461`。
<a id="e043"></a>
- **E043**：[reports/qa/performance-b01-20261019.json](../../reports/qa/performance-b01-20261019.json)；126105字节；SHA-256 `6d7faa5305f323f1c822d3381ab558c727df364a464c6dd2e575e98ee8a57df9`。
<a id="e044"></a>
- **E044**：[docs/project/LOOT_ELITES_20261019.md](LOOT_ELITES_20261019.md)；3905字节；SHA-256 `0bcd10d0cd25f02b86eddb34b4d518c5f5c6a5b63a1dcee2f1f5e1bf6cd3d9c9`。
<a id="e045"></a>
- **E045**：[src/app/run-session.ts](../../src/app/run-session.ts)；13957字节；SHA-256 `8d98a6b659b827369d674ddafb19122a02363c58bf3a1995905d480fb7d4253c`。
<a id="e046"></a>
- **E046**：[src/persistence/save-repository.ts](../../src/persistence/save-repository.ts)；2880字节；SHA-256 `8776a203addbb39a29731681a6070795440dfd582eb98dae1396f71877dc9b4b`。
<a id="e047"></a>
- **E047**：[src/simulation/persistence/run-fields.ts](../../src/simulation/persistence/run-fields.ts)；21027字节；SHA-256 `dde677f42b0a4cff6d0d42cd68a158e7b0805152f97b4222159a4c632fe31c0b`。
<a id="e048"></a>
- **E048**：[docs/project/PERFORMANCE_R02_20261020.md](PERFORMANCE_R02_20261020.md)；8063字节；SHA-256 `8a3ac174c5a3198163214af325b53d313936154ed4a5d2c30177e5769d024133`。
<a id="e049"></a>
- **E049**：[reports/qa/performance-r02-20261020.json](../../reports/qa/performance-r02-20261020.json)；57602字节；SHA-256 `dd2b37dd44590947289d1fc442e5cc84e247847c4fa1688a02ac199c4b0b868f`。
<a id="e050"></a>
- **E050**：[src/simulation/fixed-stepper.ts](../../src/simulation/fixed-stepper.ts)；1006字节；SHA-256 `59e3dd01f8bff7ebf76d465f224432eeae66b9c52945a60c576e0bc2cfba4437`。
<a id="e051"></a>
- **E051**：[docs/project/PERFORMANCE_S03_L01_F03_20261019.md](PERFORMANCE_S03_L01_F03_20261019.md)；5533字节；SHA-256 `fd91c248a3168ae8fcfeb2dfbe61f0fdb07e1c105b85de903a1d4c0fc82e8bf0`。
<a id="e052"></a>
- **E052**：[reports/qa/performance-s03-l01-f03-20261019.json](../../reports/qa/performance-s03-l01-f03-20261019.json)；37647字节；SHA-256 `8b8318e2e2ef9f47b7526fffc48fbf692c9f861bc63be7ffb199b66801fcf994`。
<a id="e053"></a>
- **E053**：[reports/local/performance-audit-review-20261019/matrix-final.json](../../reports/local/performance-audit-review-20261019/matrix-final.json)；3236603字节；SHA-256 `ef698ae9ae9ded298a4db6a84a14c37071149131a1364561fd152d8f856ba104`。
<a id="e054"></a>
- **E054**：[src/render/scene/battle-renderer.ts](../../src/render/scene/battle-renderer.ts)；113118字节；SHA-256 `66b37b3c4b99f2e6a01be13bfb667705cfdc642d25093b5814e402e6744d0a17`。
<a id="e055"></a>
- **E055**：[docs/project/PERFORMANCE_L03_20261020.md](PERFORMANCE_L03_20261020.md)；11721字节；SHA-256 `a0c43b2f06dada940c2e981598024bb40f8d2940580937c047cd5924637a4a1b`。
<a id="e056"></a>
- **E056**：[docs/project/LOADING_OPTIMIZATION_20261012.md](LOADING_OPTIMIZATION_20261012.md)；4718字节；SHA-256 `cd75a414c17ac1ec1c2862d807e06651e8aab5eb556d87a4aa07043d9cc3bac5`。
<a id="e057"></a>
- **E057**：[src/render/materials/shared-textures.ts](../../src/render/materials/shared-textures.ts)；1441字节；SHA-256 `37a62c42b8c8386e45d2f60156ee530ea4521b72c394731db202ef1c6b562581`。
<a id="e058"></a>
- **E058**：[docs/project/LOADING_OPTIMIZATION_VALIDATION_20261012.md](LOADING_OPTIMIZATION_VALIDATION_20261012.md)；7838字节；SHA-256 `40e41db5730e68ac692ceca60d758b713a047f1ac1b4f5f4613b5e7ade860135`。
<a id="e059"></a>
- **E059**：[src/render/materials/posed-depth.ts](../../src/render/materials/posed-depth.ts)；5844字节；SHA-256 `9d48067594543a4d98e11038be7ae0afd8ffe5051ea11767f064ef74b0e2b8b0`。
<a id="e060"></a>
- **E060**：[docs/project/PERFORMANCE_L02_20261020.md](PERFORMANCE_L02_20261020.md)；15361字节；SHA-256 `58d0adf57aa098b89ea838e953df141b5a12405b559bd5e5b7d20f675ea2c22b`。
<a id="e061"></a>
- **E061**：[reports/qa/performance-l02-20261020.json](../../reports/qa/performance-l02-20261020.json)；216102字节；SHA-256 `a9af8cde52815313a198368751034a5434b419e96bd943c44dcf966c03ade36c`。
<a id="e062"></a>
- **E062**：[docs/project/MVP7A_LOADING_20261013.md](MVP7A_LOADING_20261013.md)；9289字节；SHA-256 `3fd3386c8806dbbccff073ca4e63a3694147d0003330c5903d93cb6b75fc2d15`。
<a id="e063"></a>
- **E063**：[src/render/units/sampled-poses.ts](../../src/render/units/sampled-poses.ts)；7230字节；SHA-256 `d30e188897b353173b268da7036766bce38765c32c4a9be5ec61a8c5fdb75d79`。
<a id="e064"></a>
- **E064**：[reports/qa/performance-l03-20261020.json](../../reports/qa/performance-l03-20261020.json)；368212字节；SHA-256 `48cddd01ea57c75b93e0a4006fd5c0d6fda2df356ca6f68c7bf8ccc795303461`。
<a id="e065"></a>
- **E065**：[docs/project/MVP7A_LOADING_VALIDATION_20261013.md](MVP7A_LOADING_VALIDATION_20261013.md)；28931字节；SHA-256 `c49be44ef16c8985933d5b2783a44df4efedde32511e45949e0fe227b7bf0501`。
<a id="e066"></a>
- **E066**：[src/assets/persistent-cache.ts](../../src/assets/persistent-cache.ts)；4296字节；SHA-256 `cc7dfa0213d946d69923e614a54c3fbc47deb25adc7f2f84d354f157032ce865`。
<a id="e067"></a>
- **E067**：[src/assets/http-store.ts](../../src/assets/http-store.ts)；8538字节；SHA-256 `472ea28ff95f262d272acf91ce2868dfe24dc628b1855cc2c88df0a87f0b3871`。
<a id="e068"></a>
- **E068**：[src/app/background-preparation.ts](../../src/app/background-preparation.ts)；3496字节；SHA-256 `d5569dc0fea6495975da70553286fc833e603a537acfc42b73841a4a25424fca`。
<a id="e069"></a>
- **E069**：[docs/project/CINEMATIC_PRELOAD_VALIDATION_20261012.md](CINEMATIC_PRELOAD_VALIDATION_20261012.md)；13018字节；SHA-256 `3e081c591b08d110b51d97342c2235b6fb0783f7107ae1d6220b0865f3b513de`。
<a id="e070"></a>
- **E070**：[docs/project/PACKAGE_HYGIENE_20260927.md](PACKAGE_HYGIENE_20260927.md)；6014字节；SHA-256 `2c867e0b91c162095a65ddf97ac6d1c92e69208b872c98bba507578669372805`。
<a id="e071"></a>
- **E071**：[src/render/loaders/semantic-gltf.ts](../../src/render/loaders/semantic-gltf.ts)；1691字节；SHA-256 `0d4ef93cabdcfe5f76deba616b084a01da6c42762be5dbf5ee2c462d2be45885`。
<a id="e072"></a>
- **E072**：[docs/project/FIXED_SCENE_PERFORMANCE_VALIDATION_20261006.md](FIXED_SCENE_PERFORMANCE_VALIDATION_20261006.md)；8579字节；SHA-256 `58e6c4c68dd4b10698351f44c25a110084b8577bf9bc1231d3e8a4093836707c`。
<a id="e073"></a>
- **E073**：[docs/project/HERO_MAP_PERFORMANCE_20260930.md](HERO_MAP_PERFORMANCE_20260930.md)；2895字节；SHA-256 `2aa5c44b73a0acaa35e038c3a7ca6cfa404c186cf3311c470ba50f275968e53f`。
<a id="e074"></a>
- **E074**：[src/render/effects/confirmed-hero/skill-effects.ts](../../src/render/effects/confirmed-hero/skill-effects.ts)；17265字节；SHA-256 `ca3108d86d4b117efdfa0227365ce30caa5c1808bca9edd67d4cd1dcc5f687b1`。
<a id="e075"></a>
- **E075**：[src/app/bootstrap.ts](../../src/app/bootstrap.ts)；16407字节；SHA-256 `5c168580d97d53a7c5a6c0d71f61434a994ae25892be5527b670549517b54a26`。
<a id="e076"></a>
- **E076**：[docs/project/MVP5_ACCEPTANCE_NEXT_20261014.md](MVP5_ACCEPTANCE_NEXT_20261014.md)；7920字节；SHA-256 `19b9e305b46d83f7a9c69386a710e2cf3047c862abd471a1ba7f1bee60e0524b`。
<a id="e077"></a>
- **E077**：[docs/project/NEXT_ITERATION_P6_VALIDATION_20261006.md](NEXT_ITERATION_P6_VALIDATION_20261006.md)；7715字节；SHA-256 `b29cf9f2bcdb23e13c9c90f3994c51189e48d2399d4e2f6b3dd581d54d7104fc`。
<a id="e078"></a>
- **E078**：[src/simulation/movement/mine-routing.ts](../../src/simulation/movement/mine-routing.ts)；3705字节；SHA-256 `a41e6f89205ce3159dc1e002ea36a1ae4165ddd5ceb11283d9bb6043f0b9a919`。
<a id="e079"></a>
- **E079**：[src/simulation/combat/tracking-mines.ts](../../src/simulation/combat/tracking-mines.ts)；4558字节；SHA-256 `35d129026bbf4e20c525e76925de002704b45f3f7f77dce11e22b73cd474e273`。
<a id="e080"></a>
- **E080**：[src/simulation/movement/steering.ts](../../src/simulation/movement/steering.ts)；7198字节；SHA-256 `4e8b9d15e251ddfb5d08acc827e86cdac2c4a89caf0a8516aa5121b8ec87472a`。
<a id="e081"></a>
- **E081**：[src/render/scene/renderable-registry.ts](../../src/render/scene/renderable-registry.ts)；1803字节；SHA-256 `562a6228af810471034e338f42a293eed24eef4ad7704fa43f57e51c8aeef94e`。
<a id="e082"></a>
- **E082**：[src/render/scene/scene-contact.ts](../../src/render/scene/scene-contact.ts)；10566字节；SHA-256 `cc66e8d64c57923232e587766b3f986da897570423e8469e28a50b83e38f8483`。
<a id="e083"></a>
- **E083**：[src/render/scene/camera-controller.ts](../../src/render/scene/camera-controller.ts)；12301字节；SHA-256 `b4564eb90e15ef143822ba3ee21f54133572172c8372f945cb56a70097a1f4f6`。
<a id="e084"></a>
- **E084**：[src/render/scene/building-view-lifecycle.ts](../../src/render/scene/building-view-lifecycle.ts)；662字节；SHA-256 `f8c49e86d2f4a99c025d03db43d029ba4c7d649343133d4e8dfcaa63ebed3ca8`。
<a id="e085"></a>
- **E085**：[src/render/effects/confirmed-hero/controller.ts](../../src/render/effects/confirmed-hero/controller.ts)；3948字节；SHA-256 `d28dd4423b542494f12f5dc2ebc98b44cf625838686d5992979cba29c37d93bd`。
<a id="e086"></a>
- **E086**：[src/render/effects/protoss-hero-effects.ts](../../src/render/effects/protoss-hero-effects.ts)；21273字节；SHA-256 `7028061f5b67cb969ef1f6588fcff3fd3e60d71f86467fe36b14bbf0a9b0b895`。
<a id="e087"></a>
- **E087**：[src/render/effects/protoss-hero-materials.ts](../../src/render/effects/protoss-hero-materials.ts)；9134字节；SHA-256 `f01c7fa417b6d0fd6d7608f1a0427ab05e524e6172baf3c7538f17429b1b0405`。
<a id="e088"></a>
- **E088**：[src/assets/offline-pack.ts](../../src/assets/offline-pack.ts)；10683字节；SHA-256 `7a330fd5ca4af2095838efdb2958a776d016720557cdd38b5664bdb5d42e9fbc`。
<a id="e089"></a>
- **E089**：[src/app/race-preload.ts](../../src/app/race-preload.ts)；1331字节；SHA-256 `970d49672ba6d155cc05a7a28b96116953865b7ba875763e9788fd5a73ad1090`。
<a id="e090"></a>
- **E090**：[src/platform/wechat/asset-cache.ts](../../src/platform/wechat/asset-cache.ts)；7486字节；SHA-256 `35ce7a107753f2ab35aa3ea08bddbac0199fe763f4f0b13be6665763b6cc68e6`。
<a id="e091"></a>
- **E091**：[src/platform/wechat/game-session.ts](../../src/platform/wechat/game-session.ts)；2545字节；SHA-256 `65bfdcb82ebbe27853dd0ae13132b2b7ee4a7ee7c1e7408aedd41117c2e45dc2`。
<a id="e092"></a>
- **E092**：[src/platform/wechat/preflight.ts](../../src/platform/wechat/preflight.ts)；2747字节；SHA-256 `38896a389313a23b23ecebf0f7380f6da6df92b41264699af3123ce1ae715327`。
<a id="e093"></a>
- **E093**：[tools/build-online-demo.mjs](../../tools/build-online-demo.mjs)；3153字节；SHA-256 `f377b88909057060a8c92104b9455d7c4f0125ba33a95f5cf2eec5ba6ed5d35e`。
<a id="e094"></a>
- **E094**：[reports/local/performance-l03-20261020/pack-proof-1/report.json](../../reports/local/performance-l03-20261020/pack-proof-1/report.json)；324852字节；SHA-256 `70f02c758f03fdbaf46ddb196fde204d57524e75fdc3029779cb290b7d1e28bb`。
<a id="e095"></a>
- **E095**：[src/assets/manifest.ts](../../src/assets/manifest.ts)；1937字节；SHA-256 `901fcf91d9bf36c7a77ac3de0bf3305c2bde4119c25d5e3ef3a1ed608bd3283f`。
<a id="e096"></a>
- **E096**：[docs/project/PERFORMANCE_U04_20261020.md](PERFORMANCE_U04_20261020.md)；9683字节；SHA-256 `7d4e1114febb9f16860bfe774c3add5dd6069d8b47e5642b0d7892567ea0c390`。
<a id="e097"></a>
- **E097**：[reports/qa/performance-u04-20261020.json](../../reports/qa/performance-u04-20261020.json)；104480字节；SHA-256 `7ae3da5580403dfdc76360e1b3704cae636b9f1b00ad492e5a87e1212cfb3d11`。
<a id="e098"></a>
- **E098**：[tools/backend/metrics.mjs](../../tools/backend/metrics.mjs)；12563字节；SHA-256 `f59ec572f894791b3243fa766645887fcfc8a5aae147e1bb915d5eeeb2ad591b`。
<a id="e099"></a>
- **E099**：[tools/backend/repository.mjs](../../tools/backend/repository.mjs)；17334字节；SHA-256 `4b1fe07470592f88bf9679d7d96fb5bf7b06db777ec7b16519d8945b800cb486`。
<a id="e100"></a>
- **E100**：[src/main.ts](../../src/main.ts)；693字节；SHA-256 `ae54dd2a510e8aeab0c9e0610933f1265913c59b99fe935a9a7d3b1940bae480`。
<a id="e101"></a>
- **E101**：[tools/backend/service.mjs](../../tools/backend/service.mjs)；10289字节；SHA-256 `f3700487603330cde89138424db58ce8e448167d2f19ece29095c170ee25551c`。
<a id="e102"></a>
- **E102**：[tools/backend/migrations/001.sql](../../tools/backend/migrations/001.sql)；4589字节；SHA-256 `2899c647b99808886449a2b52a6d4a17f67981c5837fb818a67f4e1c70a7f3e3`。
<a id="e103"></a>
- **E103**：[tools/coze-web-server.mjs](../../tools/coze-web-server.mjs)；4728字节；SHA-256 `be5fc03d6a81aab693aa706986c30d64c0e6df1117b40d9c80634c675a442ec0`。
<a id="e104"></a>
- **E104**：[tools/start-coze.mjs](../../tools/start-coze.mjs)；5910字节；SHA-256 `17fae4c903bac4005d5303e72979f7f8c96fe085270d15fb30db5b5ce4c11df9`。
<a id="e105"></a>
- **E105**：[tools/serve.mjs](../../tools/serve.mjs)；1336字节；SHA-256 `d37a13fae75e5bb637834f9ffe86ed1a3c474849a6925ad701d9977e4cc5e60e`。
<a id="e106"></a>
- **E106**：[tools/backend/admin/app.js](../../tools/backend/admin/app.js)；16018字节；SHA-256 `2e75e9f0ced34d19a8d5f0f29c30aeae53e6ee6bc4466e1133013b3dbd440073`。
<a id="e107"></a>
- **E107**：[src/data/campaign-map.ts](../../src/data/campaign-map.ts)；5904字节；SHA-256 `69df4fa6c4daa913f5f9a4ad2c42d4116e236259d8ef58b7870a53f3e87a84bc`。
<a id="e108"></a>
- **E108**：[reports/local/performance-a01-20261020/board-before.json](../../reports/local/performance-a01-20261020/board-before.json)；214615字节；SHA-256 `5766d2526712316fe344962ade1e47ac0409f5863897b6125e9a46eaff1e18c6`。
<a id="e109"></a>
- **E109**：[reports/local/performance-a01-20261020/inputs-before.json](../../reports/local/performance-a01-20261020/inputs-before.json)；825345字节；SHA-256 `f94046d801dae1a0d0721c409556f5836a41b646caebd30a4370d70b5b3c27da`。
<a id="e110"></a>
- **E110**：[reports/local/performance-a01-20261020/l03-source-comparison.json](../../reports/local/performance-a01-20261020/l03-source-comparison.json)；92字节；SHA-256 `4fa37d44410795b0cff8d803bdbf181e66540c5f2e665dfbdb2d5a2fc59df9e8`。
<a id="e111"></a>
- **E111**：[reports/local/performance-a01-20261020/targeted-regression.log](../../reports/local/performance-a01-20261020/targeted-regression.log)；7246字节；SHA-256 `4680b9a6291ce36e9856e2898d44598fa9138546044ed63842c5ba71d610c4a3`。
<a id="e112"></a>
- **E112**：[reports/local/performance-a01-20261020/verification.json](../../reports/local/performance-a01-20261020/verification.json)；1774字节；SHA-256 `3f3a96b0faca6c6147ae472bf69cf2a03c977323dada04653f1a354e6d3157fe`。
<a id="e113"></a>
- **E113**：[reports/local/performance-a01-20261020/source-anchors.json](../../reports/local/performance-a01-20261020/source-anchors.json)；87635字节；SHA-256 `f8b20ed03377a482c69074f851609d6384b5245bd6bc097aa6560d9a47b019f5`。
<a id="e114"></a>
- **E114**：[reports/local/performance-a01-20261020/adjudications.json](../../reports/local/performance-a01-20261020/adjudications.json)；195963字节；SHA-256 `60b4607d8329e65ef911b26d85a4b3c2176963b8602dbcc88af060b739159aea`。
<a id="e115"></a>
- **E115**：[tools/performance-a01-reviews.mjs](../../tools/performance-a01-reviews.mjs)；33372字节；SHA-256 `0c541f85838cfdf344ea1b2b215a4e127ed7ee0de2ec8a34f0c79807ba7e8a49`。
<a id="e116"></a>
- **E116**：[tools/finalize-performance-a01.mjs](../../tools/finalize-performance-a01.mjs)；25429字节；SHA-256 `6de333ded52c447c78942243555e0977133e05c3932323be4d8ace8e1cc3ced2`。

## 交付边界

本次没有游戏生产改动、构建、命名HTML/ZIP或Current替换，没有提交、推送或发布。300上限、4∶4∶1、完整效果、五图冻结、模拟经济与存档延期保持。A02/A03只建立明确跟踪，本次未开始；最终统一验证与整体MVP边界继续开放。
