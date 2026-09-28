# 自主收尾：原 Actor／动作／挂点审计 · 2026-09-27

本记录是原始资源证据和适配差异，不是 F02 全视觉、M4/M5 人工视觉、M6 性能或 M7 签收。保留全部原素材和已有未提交工作；本项不改变战斗数值、不上传素材、不运行完整 build。

## 锁定与实际取得

沿用 `tools/sc2-casc-lock.json`：SC2 **B97563 / 5.0.16.97563**、CASCLib `3f8be478177802de4ae7ebae24fb25ab860ef104`。`tools/fetch-closeout-actor-sources.ps1` 仅选择 ActorData/ModelData/WeaponData/UnitData/EffectData，实际取得 9 层共 **45 XML、28,355,032 字节**。来源包括 core/liberty/swarm/void/novastoryassets/starcoop 模组和 liberty/swarm/void 战役。每个原路径、字节数、SHA256 保存在 `tools/closeout-actor-dependencies.json`；原 XML 留在忽略的 `assets/private/actor-source/`。

初次沙箱请求因代理 127.0.0.1:9 拒绝而失败；授权网络执行后取得原字节。首次逐文件提取曾因 CASC OpenFile 临时空引用退出，重试完整取得 45 文件。不存在“离线已有原 actor 缓存”的假设，也未下载整个客户端。

`python tools/audit-closeout-sources.py` 实际通过 45 文件的大小／SHA256 校验，并记录 **80 项**模型来源、逐层 Model/Actor 父链、真实 GLB 动作名、武器节点及 GLB 散列。报告是 `reports/local/closeout-source-audit.json`，5,246,738 字节，SHA256 `9a1731402e4d50813b8c5d3bc4295a33427f8e47aed78be2ef2866fe9ed7e8e4`。它保留各层定义及条件分支，**不是**未经验证的 SC2 Catalog 合并解释器；同模型 Actor 候选不是适用本游戏的唯一 Actor。

`node tools/audit-closeout-m3-events.mjs` 用已锁定本地转换器读取 **83 项**原 M3 的序列、SDEV 事件、挂点，无解析错误。报告 `reports/local/closeout-m3-events.json`，520,881 字节，SHA256 `b8ddc4bc52941b18da42ae9ac179e78f26555099b743c377cb45b255309ca467`。该报告读主体 M3；所需附加 M3A 的可用动作另见已有导入 manifest，不将主体事件审计伪称附加文件全事件覆盖。

## 已定位的动作事实

- **死神**：liberty Actor `Reaper` 明确以 P38ScytheGuassPistol 武器启动 `AnimBracketStart Attack Attack`，停止关闭同 bracket，准备态使用 Ready 动作组。D8Charge 的 Spell 是另一技能分支，不能据此给普攻加伤害。当前 Attack 普攻选择有原 Actor 支持。
- **使徒**：void Actor `Adept` 继承 core `GenericUnitStandard` 的 Attack bracket。原主体 `Attack` 为 7833ms，`Attack 01` 为 10667ms；两段 SDEV 只有结束事件，分别位于 7832ms、10666ms，没有可据以裁切的枪口发射标记。短化片段或把整段压入射速仍缺证据，保持开放。
- **高阶圣堂**：void 战役层明确 `WeaponStart.HighTemplarWeapon.AttackStart → $Spell,A`，支持当前灵能弹 Spell A 适配；liberty PsiStorm 为 `AnimPlay A A`。原 Actor 的动画属性匹配和本游戏风暴片段仍需精确核对，不因存在相似名称直接改技能。
- **巨像**：liberty 武器开始使用 Stand,Channel,Start；void 层用 ThermalLancesForward 的开始／停止替换成 `Stand Channel Start → Stand Channel → Stand Channel End` bracket。普通和精英实际 GLB 都包含三片段。先前 `Attack 02`／`Attack` 的选择与此证据不一致，已向整合任务提出修正；运行代码状态以整合记录及下文后续验证为准。
- **其余神族家族及精英**：审计保留 10 神族家族＋死神主体和所有清单内精英模型的原动作/挂点。精英皮肤多数没有以皮肤 ModelData ID 命名的独立 Unit Actor，不能把“没有同名 Actor”误写成不存在来源。共享基础家族 Actor、皮肤替换、条件分支尚不能靠名称候选自动签收。90 款运行精英的三型共享规则仍以 ELITES 数据为准，80 项资源条目不是 90 个独立模型。

## 18 英雄的源候选边界

以下是相同原模型或明确 Model 引用得到的候选，完整条件/父链在报告内；自定义技能不因此成为原版技能。

| 运行英雄 | 原 Actor 候选／共享关系 |
| --- | --- |
| 雷诺 | MutatorAmonRaynor |
| 泰凯斯 | MutatorAmonTychus / TychusChaingun / TychusCommando |
| 诺娃 | MutatorAmonNova；现有 A 枪械组适配保留 |
| 斯旺 | MarauderSwann 模型还被 KelMorianWorker 引用；本游戏抢修技能仍是适配 |
| 托什 | Tosh / ToshShadowClone |
| 凯瑞甘 | MutatorAmonKerrigan / KerriganVoid / KerriganVoidUlnar02 |
| 扎加拉 | MutatorAmonZagara / ZaGara / ZagaraVoidCoop |
| 德哈卡 | MutatorAmonDehaka 及镜像／占位分支 |
| 斯托科夫 | InfestedStukovCoop |
| 妮雅德拉 | HugeSwarmQueen 对应 ExpeditionQueenLevel3 模型；哺育技能是适配 |
| 阿塔尼斯 | MutatorAmonArtanis / ArtanisVoid |
| 泽拉图 | MutatorAmonZeratul / PrologueZeratul / ZeratulVoid 等条件分支 |
| 阿拉纳克 | AlarakChampion / PitAlarak |
| 菲尼克斯 | FenixDragoon |
| 沃拉尊 | VorazunChampion |
| 大和战列巡洋舰 | Battlecruiser |
| HotS 利维坦 | HotSLeviathan |
| 净化者旗舰 | 运行共享 model.elite.carrier.1；不能虚构第18份独立原模型或原核爆技能 Actor |

原挂点存在性已经从每份 GLB 节点和 M3 attachment_points 读取；原 Actor 的 AttachQuery、SiteOps、左右炮口交替、骨骼姿态和浏览器最终世界坐标仍需逐项交叉验证。此轮没有为缺失挂点猜造位置，也未改统一枪口变换。

## 临时建筑出现／死亡原依赖

从原 ProtossBuildingEx 的 BuildModel 模板和 ModelData 解析出 PylonBirth；正常死亡模板指向三建筑各自 Death 模型。实际执行：

`pwsh -NoProfile -File tools/fetch-expansion-casc.ps1 -ModelManifest tools/closeout-building-models.json -DependenciesFile tools/closeout-building-dependencies.json -MissingReport reports/local/closeout-building-missing.json`

结果 **89 文件、26,620,612 字节、0 缺失**，包括四原 M3、所引用 DDS 及现有获取器共用的固定图标验证项；这不是新增发行包字节量。已有同源依赖复用，不删除原文件。逐路径／散列在 `tools/closeout-building-dependencies.json`。

| 原 ModelData | 原文件 | 主体字节 | 实际序列 |
| --- | --- | ---: | --- |
| PylonBirth | Assets/Buildings/Protoss/PylonWarpIn/PylonWarpIn.m3 | 115696 | Stand Build Start / Stand Build / Stand Build End，各6000ms |
| PylonDeath | Assets/Buildings/Protoss/PylonEx2Death/PylonEx2Death.m3 | 375488 | Death / Death 01，约13333ms |
| BarracksDeath | Assets/Buildings/Terran/BarracksDeathEx1/BarracksDeathEx1.m3 | 691136 | Death / Death 01，各10000ms |
| HatcheryDeath | Assets/Buildings/Zerg/HatcheryDeathEx1/HatcheryDeathEx1.m3 | 562480 | Death，10000ms |

三死亡 M3 均包含 `Evt_Simulate`：水晶塔约800/833ms、兵营1833/1600ms、孵化场666ms，涉及原物理碎片启动。现有转换器／网页不等于完整 SC2 物理、粒子或 Actor 渲染器。因此“主体缺 Death”已明确是另资源依赖，**不能**再表述成“原版没有死亡动作”；但仅下载或导出 GLB 也不能宣称已复现原版死亡。

后续经整合授权仅接入 PylonBirth；三个死亡模型仍留在私有源区。支付、出舱、碰撞和经济不变。完整 F02/F05 视觉仍开放。

## 依据原证据的实际修复

- 巨像普通和三型精英选择原 Stand Channel Start/Channel/End；沿现有只读 shotSequence/lastShotAt 表现时钟维持 bracket，不改变伤害、射击周期、RNG 或实体字段。
- PylonBirth 经现有锁定导入器转为 `model.pylon.birth`：3片段、12骨骼、1,081,128字节；原转换 SHA256 `4f6ead032df29bac035342d21bce0b2085bed168c33a4c7e69e14ffa144fae21`。逐像素等价 WebP 派生 **841,884字节**，SHA256 `71ccb83fed33174ff1ea87f68a81ecb2057ab7e23fda32a6e0a24829af24bf9d`，不删除源模型。
- PodView 使用独立克隆原模型和私有材质，在 falling 时把原 Stand Build End 的6秒样本映射到现有 createdAt→landedAt 的3.266秒进度，落定切回主体Pylon。它是保留原骨骼片段的表现时长适配，不是修改交付规则；原粒子／材质动画的完整复现仍不宣称通过。mixer、模型、材质和销毁均由视图管理，存档仅已有 Pod 时间和状态。
- 首次准备、切族、读档均要求出生模型并检查原片段，失败走同一资源门；预热和发行闭包包含新增模型。`assets:prepare` 为756/756、0必需缺失、146等价WebP模型；M6闭包为733项，保留23项已证实不用排除及6组完全相同内容共享。
- 只读复查定位到冷出生模型失败发生在公共场景建成后，重试会重复创建基础模型／地图。已把必需race资源准备前移至公共构建之前；已成功工人和模板各自缓存，公共drone/egg加载跳过已有GPU条目，避免虫族工人重复。未重写加载框架。

实际测试：新巨像／出生视图两项首次均以缺失目标行为失败，修复后与原攻击和载体测试共16项通过；新增失败重试顺序回归首次失败，前移后连同载体测试7项通过。`npm run typecheck`通过（前移后的最终整合检查另计）。浏览器原GLB核验及局部截图记录在后续整合证据中，尚不能把上述单测当作画面通过。

## 浏览器发现、材质修正与最终局部证据

1. 首轮cold birth失败页的“重试”消失，定位并以失败回归确认：并行音频加载的晚进度把error覆盖为audio。失败时递增generation使旧回调失效，last请求保留；与源动作／载体共18项通过。
2. 真实Chrome原GLB加载后取得birth进度0/.5/.99/1截图，机器检查通过但图片出现纯白剪影，**没有**把资源存在和时间正确当作可交付画面。原M3表明加法层没有diffuse，静态转换默认白漫反射错误；主体alpha/emissive乘数与UV均是原动画，静态默认0使主体不可见。
3. `node tools/extract-pylon-birth-materials.mjs` 从原Stand Build End解析STG/STC、animation IDs、float/vector键帧，生成限定JSON。未猜强度：主体alpha在3.033→3.133秒由0→1，emissive乘数由0→5、原hdr为5；加法层乘数0→1→0，UV保留原偏移。原JSON SHA256 `6daa85b70e2c4b607ea79ea31cb3f1203cf701b8955de97519e57b26d24c7f1b`。
4. 限定PylonBirth适配使无diffuse的加法层采用黑基底并保留发光纹理；实例alpha/emissive纹理独立克隆、以同一已有出生时间采样，cache key明确，模板在资源门内配置同shader后预热。未删除原层、未重写全局材质系统、未改模拟。新材质测试检查独立时间、原强度、恢复同时间同UV与释放，含源/载体共9项通过，最终模板预热调整后该项复跑通过。`npm run typecheck`通过。
5. `node tools/qa-closeout-source.mjs` 最终实际退出0，1440×900本地Chrome，page errors为空。冷失败scene children **12→12**、mapViews **0→0**；取消拦截后成功 **68 children、1地图、1出生模板**，重复prepare保持数量。出生进度0/.5/.7/.99/1对应原时间0/3/4.2/5.94秒及落定切回主体，Pod JSON未变化；两档巨像真实GLB在0/.2秒为attack，.7秒为attackChannel，shotSequence均为1。
6. 本地报告 `reports/local/closeout-source-browser/report.json` SHA256 `4859b22759bf5e61ec24cfd0d4d27819d117df2cb168f53ee4b191d595096cf9`。已亲看修正后的Pylon .5/.7/.99：蓝白能量纹理可辨，.99金属和水晶纹理显现，不再全时纯白。巨像截图存在夹具清除Pod数组后残留视图重叠，不能当干净巨像人工视觉签收；夹具后续补resetRun，后续整合复核另计。旧失败/工程检查报告保留在同目录，未将其宣称通过。

原死亡物理／粒子、逐英雄自定义技能与原Actor匹配、巨像双炮口SOpAttachWeapon02/03与现通用单挂点的精确映射、使徒发射段、全90精英及18英雄人眼动效签收仍开放。此项不关闭M4/M5视觉、M6自然性能或M7。

## 补齐历史解析器测试缓存（与B97563素材分开）

全量检查原有3项SKIP由 `.cache/sc2-data/balancemulti-unitdata.xml` 缺失触发，不是不可验证的平台项目。已只读确认这些测试依赖 `docs/DATA_SOURCES.md` 既定 **SC2 5.0.15** 社区托管原数据导出、commit `fbbd6429b1eb6978c78a092dc68ba09029d03171`；它与上述 **B97563 / 5.0.16.97563 美术素材源**用途和版本不同，不能混用或把新CASC文件重命名成历史fixture。

在父任务明确性能采样结束后，实际运行 `node tools/fetch-data-source.mjs`，退出0：取得既定8层×5类共 **40 XML、3,248,774字节**，本地验证每份根节点为Catalog。6个运行解析层仍为core/liberty/swarm/void/voidmulti/balancemulti；libertymulti/swarmmulti仅原工具既定上下文文件，没有加入层序。未改运行数值、src、发行产物或现有modeldata缓存。

每份完整锁定URL、revision、字节数和SHA256记录于 `reports/local/closeout-historical-resolver-sources.json`，报告SHA256 `e2843e59442a84a83db53149b633d3588dc4f3a7bd1fd76f2fe9d199022b08e5`。

随后实际执行 `node --test test/expansion-source-resolver.test.mjs`：**3通过、0失败、0跳过**。覆盖后层scalar/removed属性、父effect和struct覆盖、明确weapon层及ScienceVessel无战斗替代；这是历史锁定解析工具验证，不是当前B97563素材视觉或游戏平衡验收。
