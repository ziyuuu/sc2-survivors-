> 最新蜘蛛雷修正：[人族追踪雷](project/TRACKING_MINES_20261003.md)。人族趣味卡雷钻出、合法追踪、路径失效重选与一次引爆；战局schema15/profile v5，P3效果升级仅限18英雄。此前schema14等说明是相应历史基线。

> P2边界：[操作契约](project/NEXT_ITERATION_P2_20261003.md)。`family-actions.ts`提供模式/技能只读预览，World再次验证并原子执行；`battle-actions.ts`连接四类输入，稳定指令DOM与既有HUD区分呈现/规则。`directionRoute`明确为重建字段，不进入schema14 DTO；素材准备清除输入。`supplyEligibility`供真实池与购买共用，`inspectReinforcementPool`只读、不耗RNG，诊断没有生产调试API。原付款/双体席位/恢复边界保持。

> P1最新界面反馈：[视听语言修订](project/HUD_VISUAL_LANGUAGE_20261003.md)。冷却遮罩与就绪显示读取既有绝对计时，发射声音读取既有视觉事件并去重；详情只在点选后显示，终关图标读取既有生命/击杀收据/计时。保留统一有效视口、独立UI偏好、schema14/profile v5及当前战斗规则；P0战斗值待后续阶段实施。

> 下一轮架构设计：[P0统一设计](project/NEXT_ITERATION_P0_20261003.md)明确World/表现/输入、视野DTO、限时复生预留、保护/追踪雷saved字段及后台旁路边界。P0已批准，战斗DTO与后台部分待后续阶段实施；P1不变更run schema14/profile v5。文档生成器只在独立内存World派生属性，不运行战斗或持久化。

> 本轮批准：[英雄专属表现、全量死亡、中心扩张地图与UI](project/HERO_MAP_UI_20260929.md)。战局schema14，永久档案v5不变；新局使用三主题九模板。实际证据见[本轮验证](project/HERO_MAP_UI_VALIDATION_20260929.md)。人工视觉、完整M6和M7仍开放。

> 本轮批准：[三族独有趣味卡、缓存与增量交付](project/RACE_FUN_CACHE_20260929.md)。新增12张独有卡、schema13；永久v5不变，小地图固定左上，资源自动持久缓存，Git不再每轮提交离线HTML。

> 最新批准变更：[共享科技、全队卡牌、天赋与移动端](project/SHARED_TECH_CARDS_20260929.md)。旧逐设施科技与单家族数值牌被替代；运行schema12，永久档案及天赋价格不变。

> 2026-09-29 修正优先级：当前规则以 [本轮批准差异](project/RECOVERY_PATCH_20260929.md) 为准。三型精英可共存、地图掉落不再限章、侦测冷却10秒、诺娃贯穿狙击与空投生命表覆盖下文历史值。工程证据见 [验证记录](project/RECOVERY_VALIDATION_20260929.md)。

# 工程架构与开发边界 · V26

**2026-09-28 双生与控制台更新：**[本轮批准稿](project/TWIN_SWARM_SC2_HUD_20260928.md)优先：全体玩家战斗属性统一加强15%；跳虫普通/精英均两身体一个名额、共享培养、缺员900步裂变；虫后落地载体注卵增加最多两个一级名额，45秒独立冷却且每舱一次；常驻SC2式全队头像、详情、指令区。原生盾蓝条及受击/破盾反馈。schema10保存配对（含整对阵亡空槽）、注卵账和冷却；UI查看与站位缓存重建。恢复种子与RNG读取档内配置；构造器种子只用于新局，预览不修改当前实例。Coze按固定提交分批获取真实LFS运行资源。
**2026-09-28最新批准迭代：**[交战、虫海与Web分离](project/SWARM_WEB_ITERATION_20260928.md)优先于下方历史条款：玩家死神2×6；普通敌人1—6关I/7—12关II/13—18关III，前六关简单HP×.8/普通×.9；额外固定I级虫海；无尽60秒一轮、每两轮升军衔、每四轮发展，其余购物，每轮300/250。该轮使用schema9，现已由上条升级至schema10，不增加旧档兼容。界面与发行拆分不改变其他已批准合同。

**2026-09-28追加修复：**[第二轮执行记录](project/FEEDBACK_SECOND_PASS_20260928.md)登记死神主动参战／取消瞄准恢复、原始移动目标与独立机动路径、本族完整预加载、关间一次继续、英雄弹道和隐形提示。模拟仍为唯一60Hz规则；新目的地队形及界面提示均重建，未更改武器基础或快照格式。完整性能及原死亡粒子／物理仍开放。

<!-- MVP10_PLANNING_ENTRY -->
**最新精英覆盖纠正：**1.0 MVP目标为每族10普通家族×每家族3款＝90款精英。现有40款只是当前实现/历史策划，不是完整目标；新增50款的机制与表现见[MVP精英补全稿](MVP10_ELITE_CATALOG.md)，现已按批准稿接入，主观视觉仍待统一验收。

**最新微操配点纠正：**微操与三条主线共用80点，每购买一级均占1点并使玩家等级增加1级；微操花费更多永久资源，点满17级花64资源、占17点。下文“是否占80点待定”“微操不影响玩家等级”等旧表述已被这一明确答复取代。

**MVP架构目标见[运行稿](MVP10_RUNTIME.md)和[总计划](MVP10_ITERATION_PLAN.md)。**M0 r6 已获确认。M1 建立单一 mvp-1.0／18关运行规则，M2 接入四线天赋和战局效果；旧开发战局只允许导出及核验后单独导入永久本金。保留一个 World、60Hz 固定步和事务模型。历史规则源码不进入新局运行路径。清理状态见 [M1 运行核验](project/M1_RUNTIME_AUDIT.md)。
<!-- /MVP10_PLANNING_ENTRY -->

天赋以已批准的[M0 r6逐节点稿](MVP10_TALENTS.md)为准：三条主线各41级，微操另17级，四线共用80级／80点。`mvp-talents.generated.ts`存165个稳定定义，`mvp-talents.ts`负责合法前置与报价，`mvp-talent-effects.ts`聚合单位效果；117节点模块仅供历史读取，不参与新局。

TypeScript＋Three.js＋Vite、DOM HUD、World唯一玩法状态、60 Hz固定模拟，保留现有引擎。新局及新档固定 mvp-1.0／18 关，战局中的三族编制状态非空；旧 v1 战局不进入 World。开局把活跃方案复制进 `RunConfig.frozenTalents`，战斗只读这份快照；局外洗点不改变在途战局。完整合同见 [BUILD_RESEARCH](BUILD_RESEARCH.md)。

2026-09-27的[F01–F04批准变更](project/MVP_FEEDBACK_F01_F04_APPROVED.md)保持该边界：早期跳虫基础HP由campaign18显式表提供；攻击片段保持与15Hz节能姿态只属于renderer；发展方向、窗口阶段、商品报价／随机折扣、已购收据、共享刷新序号及天赋余额属于保存DTO。Boss死亡生成奖励及防重收据属于模拟，渲染不能创建掉落、扣费或消耗RNG。新字段须在`simulation/persistence/run-fields.ts`明确保存／重建归属，不能只存DOM状态。

## 三族模块边界

| 模块 | 职责 |
| --- | --- |
| data/races、expansion-units、campaign-science-vessel | 种族／家族、锁定数据和完整配方；SCI独立来源 |
| data/expedition-buildings、campaign18、mvp-talents | 科技前置、18关固定预算、165节点与前置价格 |
| simulation/expedition-state | 新规则唯一可变状态与校验，随RunState持久化 |
| expedition-production | 两产出轮换、逐乘员付款、设施归属、空投接收／事务换兵 |
| expedition-economy、progression/expedition-drafts | 发展／强化／保底／刷新、生命修复报价 |
| combat/expedition-combat、weapon-patterns、carriers | 护盾／隐形／侦测、医修、施法预约、实际多段武器、截击机归属 |
| combat/expedition-heroes、expedition-elites | 15英雄身份／技能、40精英路径与单次效果 |
| movement/native-traversal | 真崖边与合法端点、死神／巨像独立跨越、冲锋 |
| progression/permanent-profile、mvp-talent-effects | v4永久档案的九蓝图／单活跃投资账；本局效果派生不保留第二份等级 |
| ui/hud/expedition-panel、mvp-talent-panel | 种族、生产、换兵、发展目标、四线配点和逐级报价；不决定规则 |

实体的种族和阵营分别由 race 与 team 表达；旧 owner 暂作空间查询适配：terran 代表玩家、zerg 代表敌军，不代表单位物种。虫族玩家单位仍可对虫族敌军正确交战。新增生产走 FamilyId 逐乘员账本。旧 Job 字段尚留在源码中，但不能作为新局训练入口。

`requiresPlayerDecision`统一冻结精英／换兵，墙钟差值在暂停、失焦、加载／解码及恢复时重置。事务仅末尾通知，保存延到同步交易结束。逐乘员支付、换兵收据、保底历史、护盾、隐形、侦测、原生模式、子机补造、主巢事件均保存在显式DTO；渲染插值与Three对象不入档。

资源按当前种族、敌军、即将出现内容加载；离线包包含全部交付资源。源模型/截图不上传。下列目录和基础设施仍有效，旧版本段落仅作历史参考，不提供可续玩的旧战局分支。

模型延迟加载必须先登记共享Promise与排队任务，再通知同步HUD监听者；监听者再次请求同模型时复用任务，避免精英替换界面递归加载。地图强化领取复用World的事务通知边界：效果登记与掉落移除全部完成后才通知HUD／自动保存。精英选择期间提供保存、导出、返回标题，待选择身份继续随原战局保存。

## 目录职责

```text
src/
  main.ts                     样式、启动调用、启动错误显示
  app/
    bootstrap.ts              World/渲染/输入组合，帧循环、重开、页面生命周期
    run-session.ts            自动保存时机、继续槽、导入导出、保存状态
  data/                       版本锁定数值、本游戏调参、兵种/关卡/天赋/固定编制
  simulation/
    world.ts                  固定步协调、玩法交易、公开命令与检查点边界
    run-state.ts              每局可变状态；重开时更换，World身份保留
    persistence/              显式持久字段、检查点格式与版本
    combat/                   索敌、射线、状态、敌方技能及固定命中结算
    movement/                 地形查询、寻路、空间哈希、接触与出生位置缓存
    formation/                队形槽、交战展开
    progression/              奖励生成、永久天赋档案
  persistence/
    graph-codec.ts            Map/Set/共享引用/特殊计时值的可导出表示
    archive.ts                完整档案格式、校验、基本验证
    save-repository.ts        IndexedDB原子写入、两份备份、故障恢复
  render/
    scene/                    Three场景与只读World适配
    loaders/                  原模型材质、动作与挂点映射
    units/                    GPU骨骼实例、标签、仓、资源
    effects/                  粒子、原弹道、音频
    terrain/                  地表/地图显示与裁剪
    input/                    屏幕拾取到世界位置
    settings/                 画质
  ui/
    hud.ts                    HUD订阅、界面状态、动作分派
    hud/                      小地图、天赋/进化/建筑生产模板、存档控件
    controls/                 操作偏好、统一技能入口
    gamepad/                  手柄状态、映射、校准、菜单导航
    mobile/                   键鼠/触摸输入与指针生命周期
  assets/                     稳定资源ID、生成清单、离线解码
  diagnostics/                仅开发版可变诊断接口
test/                         规则、数据、存档、渲染适配的自动回归
tools/                        已有资源/地图/构建/诊断工具
  docs/                       从运行配置生成完整数据参考
reports/qa/                   可公开文字证据
reports/local/                本地日志、截图、运行素材报告（忽略）
assets/private/               原资源与处理输入（新增默认忽略；已跟踪项按LFS）
public/assets/                运行资源（忽略）
dist/                         Web与单文件离线产物（现有HTML按LFS，其余忽略）
```

V23拆出入口生命周期、存档协调与后端，分离天赋／进化模板，提取阶段开图和读档共用的出生缓存构建。V24在既有建筑商店中加入生产选择模板，选择由World验证、RunState保存。原有战斗循环保持在World，不额外引入通用ECS、事件总线或第二套规则框架。

## 数据与调用方向

```mermaid
flowchart LR
  Input[键鼠/触摸/手柄] --> Commands[World公开命令]
  HUD[DOM HUD] --> Commands
  Data[锁定数据与本游戏配置] --> World[World + RunState / 60 Hz]
  Commands --> World
  World --> View[Three渲染、音频、HUD]
  World --> DTO[显式战局快照]
  Profile[永久档案] --> Bundle[完整档案]
  DTO --> Bundle
  Bundle --> Store[IndexedDB / 原子提交 + 两份备份]
  Store --> Validate[校验、版本与地图检查]
  Validate --> World
```

UI调用意图／交易方法，不能直接扣资源或应用伤害。渲染读取World与有界视觉事件，不能决定命中、领奖或RNG。永久档案独立于RunState，但一个完整存档同时提交永久档案与战局，避免领奖收据错位。

## 固定模拟与生命周期

`FixedStepper`保留1/60秒步长与未处理时间债，每渲染帧最多8步，应用层给予12ms追赶预算。暂停、隐藏页面、选择和模型加载重置墙钟差值，不推进战斗；持续过载可能积压模拟，FPS不能单独证明实时性。

`World.resetRun()`创建新的RunState并重新初始化，保留World对象、监听者、控制设置与已加载GPU资源。`bootstrap`统一重置输入、手柄、音频、显示缓存和帧时钟，不使用 `location.reload()`重开。

`captureRun()`只选择明确归类的玩法字段；`restoreRun()`先在分离数据上验证，再替换同一World的每局状态。地图由原始SHA匹配，恢复后重建空间哈希／地图缓存，战斗先暂停。详见 [SAVE_SYSTEM.md](SAVE_SYSTEM.md)。

读档资源就绪从快照推导本关波次敌军、已启用的未来产出、未结算订单、现存单位与空投守军；这些模型的解码和GPU首用校验必须在确认继续前完成。仅预载快照中已经存活的单位会让第4关等中途读档在新敌军首次出现时发生主线程着色器校验长帧。资源清单只影响加载时机，不写入战局规则或改变存档格式。

## 规则模块

- 普通数值及速度换算：`data/sc2-units.ts`，锁定5.0.15导出快照。军衔、英雄、精英、天赋、难度、虫巢、无尽配置分别集中在对应data文件。
- 普通总编制与英雄席位：`data/roster.ts`。未来兵种目录增加不改总上限；当前每系规则由World统一计算。
- 地面可达、悬崖、坡道、远程遮挡共享TerrainQuery；原地图使用MapTerrain，CharTerrain仅为旧内置／诊断路径。
- 生产用共享Job锁定付款和参与建筑；运输舱持有乘员状态。每类建筑在关间选择一至两种已解锁产出，轮换只影响之后开工的批次。预付容量优先于新奖励，切换产出不能改写已付订单。
- `CombatStatuses`按目标／来源保存效果，用堆管理到期；序列化导出有效记录，恢复重建堆。
- `EnemySpecials`拥有预警、冲锋和弹道；同一扇形共享命中Set，避免重叠重复伤害。保存时只取DTO，不能序列化其World引用。
- 随机状态、ID、计时与累计取整属于玩法状态；寻路求解器、空间桶、编队临时结果属于可重建状态。`MapTerrain`的A*费用、前驱与搜索代数数组每张地图复用，不入档；阶段变化清除路线与可达图，连续搜索用代数隔离旧数据。`SpatialHash`重建时同时写入完整桶、阵营桶和地面／空中桶；避让只查询同层桶，接触碰撞保留完整桶的原候选顺序。两次重建之间发生模式切换会使分层桶失效，本步回退至按当前飞行标记过滤的完整桶。

## 原模型与表现

`AnimatedBatch`用AnimationMixer以24Hz烘焙原骨骼，再用半浮点骨骼矩阵纹理播放多个独立实例。完整动作档默认在每显示帧插值；独立的节能档以15Hz保持单位姿态并关闭基础／上身姿态插值，事件首帧立即更新。动作档只存`sc2.animationMode`用户偏好，不进入RunConfig或存档；与分辨率／LOD画质设置独立，移动、镜头和弹道仍按显示帧更新。共享材质及可选原网格LOD保留。LOD仅改变原网格索引，不用几何体替代单位。三族普通家族、死亡与已有变形模型共享原LOD判定；英雄和精英维持完整模型。

`animation-profiles.ts`显式配置神族10家族、死神及其精英原动作；普通巨像Attack 02／精英巨像Attack与Ready分开，虚空按起手／通道／结束播放，航母不添加母舰攻击动作。`selectAttackPresentation()`从shotSequence／lastShotAt恢复出手姿态，即使同一步action被改成idle或move也能继续播放；枪兵／劫掠者保留上身叠层，其余短促射击姿态不改变位置插值。死亡、形态切换、恢复和主动施法优先并取消被打断的旧射击。暂停冻结时钟，读档按已保存出手年龄重建姿态，不生成视觉事件。GLTFLoader为绑定把空格改成下划线，因此枪口同时解析原名与规范化名。原始M3/GLB字节未改；使徒有效片段、圣堂原actor对应和巨像方向动作仍见F02未验项。

V24的诺娃装配只在运行时校正原GLB中枪骨的局部偏移，保留原贴图和动作，并只显示当前使用的步枪网格；英雄／友军精英通过不同的边缘光、环形标记、枪口闪光与姓名样式辨识。原素材字节不变，表现不改变命中或伤害。

V25为最多三名英雄绘制实例化地面信标；世界标签使用现有原头像和本局英雄状态，投影、避让和触摸穿透留在 `FriendlyLabels`。技能提示读取模拟已有的施放时间，不增加玩法事件、伤害或存档字段。减少动态资源创建；新标签和信标随原World及渲染循环更新。

视觉事件自有有界序号，不消耗玩法ID或RNG。死亡拷贝、粒子和声音不参与伤害。逐发时间使用模拟lastShotAt，暂停不继续播放。原始粒子组成、材质动态与动作混合仍属网页适配，不声称等同原客户端。

地图与单位脱离相机视域可不绘制，但模拟照常运行。清理运输舱只释放独立骨架，不释放共享纹理与模型。重新部署保留已解码资源。

## 持久化与界面

`RunSession`决定何时保存、保存状态及继续槽；`SaveRepository`只负责读写与轮换备份；`archive`负责完整格式；图编解码只接受显式DTO。它们不依赖Three对象。

HUD由World变化事件更新，保持原有10Hz战斗通知。存档提交状态单独通知HUD，不占用战斗场景。存档入口限标题、暂停、设置、关间和结束界面；默认焦点优先继续战局。错误以可读文本显示，原始导入内容不作为HTML执行。

55节点天赋、进化与建筑生产面板是独立纯模板；生产选项与购买规则仍在World／TalentProfile。界面只显示规则结果，不另写一套可购买性判断。

## 资源与离线交付

素材版本5.0.16.97563与数值版本5.0.15分开锁定。CASC/M3/DDS来源、散列、转换记录留存；原美术与截图只在本地。资源ID稳定，缺失必需原模型使打包失败，不远程生成替代品。

离线构建从同一 `src/main.ts`打包，按内容散列共享不可变字节块，gzip无损编码、HTML安全Base85内嵌、本地解码成Blob URL。原动作／贴图不因当前未使用而删除。字体使用系统回退。F1和修改状态API只编译到开发版，离线包只公开只读报告。

## 文档与验证工作流

1. 读DESIGN确定授权范围与当前行为，再改有直接职责的模块。
2. 战斗／存档改动添加必要的行为回归；普通文案／可逆布局不为凑数量写测试。
3. 运行 `npm test`、`npm run typecheck`；数据变更后运行 `docs:data`，交付前 `docs:check`。
4. `npm run build`生成真实产物；浏览器验证加载、动作、交互、错误与适用的离线流程。
5. 截图、性能原始日志留本地，公开摘要与完整命令写QA；最终大小／散列写STATUS。
6. 不把自动通关当普通难度标准，不把截图保存或headless通过当人工视觉认可，不把桌面触摸仿真当手机真机。

性能优化必须有同条件测量。当前结构调整减少职责耦合，不据此宣称FPS提高。没有云存档、多窗口合并或通用跨版本迁移框架。


## F05—F07批准修复（2026-09-27）

以 `project/MVP_FEEDBACK_F05_F07_APPROVED.md` 为最新变更基线：三族工人/载体、18英雄批准耐久、普攻伤害×1.15/周期÷1.15、旗舰截击机单次继承、去头顶文字及三舰尺度。主动技能/护甲/成长不变；死神仅查修不预先加伤。发展与随机购物分别处理，F01—F04规则不回退。素材与自然性能未验不计通过。

死神查实修复：多人射击槽分组补入reaper，避免冷却期间把敌人身体作为移动目标。基础射程5、2×4伤害、0.785714周期不变。F1射击诊断默认关闭、有界且不入档；发展方向与购物池独立回归见 FEEDBACK_F06_REAPER_20260927。

F06表现边界：头顶只读生命/护盾条穿透输入，固定3技能入口保留；模型固定缩放不改模拟。橙金边复用现有材质并受深度遮挡；实际治疗/回盾才发命中反馈，纯视觉缓存不入档。效果池先分配敌预警与主效果再装饰，分类记丢弃；取消无用英雄光圈网格。

移动蓄力的弹口一致性：未结算HeroCast保存presentationLaunch（位置、朝向、固定挂点采样时刻），实际发射时只捕获一次；游戏cast.origin/point/at/damage不改。VisualEvent挂点信息及Three对象重建，恢复只继续在途物，不重放已播光效。schema8校验表现锚点有限数值。

原载体 Actor 适配：神族另载 PylonBirth，原 Stand Build End 六秒片段仅按既有 createdAt→landedAt 进度映射，落定切回 Pylon；附加模型、私有材质及 mixer 生命周期均为渲染重建，不入快照，不改付款、出舱和模拟时钟。初始化、切族及读档统一经过资源门、编译预热与缺失动作失败出口，发行闭包强制包含 model.pylon.birth。巨像按 B97563 ThermalLancesForward 的 Stand Channel Start/Channel/End 播放，视觉 bracket 不产生战斗事件。源证据见 project/AUTONOMOUS_SOURCE_20260927.md。

资源门失败与取消都会使当次generation失效；并行音频解码等旧进度回调不能覆盖error或复活已取消流程，last请求保留供明确重试使用。冷载体准备在公共场景创建前失败，重试复用已成功工人/模板，避免重复地图与网格。

PylonBirth材质使用限定源适配器：原M3的Stand Build End材质乘数/UV键帧导出至pylon-birth-materials.json，保留source anim IDs和原字节散列。纯发光加法层不引入缺图白色漫反射；原alpha/emissive强度按同一出生时间采样。每个PodView克隆各自纹理变换，模板先配置同shader/cache key再预热，销毁只释放实例克隆纹理；不扩展为全局SC材质解释器。


## 2026-09-29 路线、落点与免费奖励边界

运行快照 schema11，不保留旧开发档分支。Entity.enemyRoute 保存静态巡逻路点、索引、最后可见位置及有界失败重试状态；公共地图中心缓存通过 WeakMap 重建，不读取隐藏玩家坐标。精英身份由实体与双生记录保存，删除 family elitePaths 和 mapCardsByChapter。

载体共用完整占地、环绕通行、静态路线及预约检测。已付款 ledger.landingRetryAt 和 pendingFreeDeliveries 保存等待权，落地前复检；没有落点不重新付款。地图掉落触发/生成/空池计数保存于 mapLootStats。普通/精英/工蜂各自品质抽样；免费精英/英雄复用已持久化的实体奖励队列与防重收据，并以 mapSource 区分 Boss 回退规则。Nova 前摇使用现有 heroCasts 保存；贯穿伤害由模拟完成，skill-line 为不存档的一次性表现事件。UI 与寻路/空间缓存均可重建。
