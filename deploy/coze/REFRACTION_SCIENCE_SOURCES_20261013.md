# 折射与科学球来源记录 · 2026-10-13

锁定来源：SC2 5.0.16.97563（B97563）。以前交付的原始文件和衍生资源不覆盖；新的原始模型、贴图和目录只从锁定 CASC 获取并按路径、长度和 SHA-256 校验。原始私有素材不因本轮额外发布到 Git。

## 折射

`src/render/effects/source/catalog.json` 保留原始 type 2 引用和材质轨道。`tools/prepare-combat-refraction.mjs` 从对应已校验的 M3 读取实际引用该材质的网格，独立导出骨骼、动画与网格，不改写原来的标准材质 GLB。提取清单位于 `reports/local/refraction-science-20261013/extraction.json`。

| 原版定义 | 新通道 |
| --- | --- |
| MarauderBaseAttackImpact | 模型折射 |
| SiegeTankSiegedAttackImpact | 模型折射 |
| ThorHandGunAttackLaunch | 模型折射 |
| ThorAAAttackLaunchLance | 与上一项共享原始模型来源、保留独立运行定义 |
| BanelingDeath | 模型折射；不重复绘制已有死亡实体 |
| RavagerCorrosiveBileImpact | 模型折射 |
| StalkerAttackImpact | 模型折射 |
| GuardianShield | 模型折射 |
| ImmortalAttackImpact | 模型折射 |
| ColossusAttackBeamImpact | 模型折射 |
| HighTemplarAttackImpact | 模型折射 |
| HighTemplarPsiStormModel | 模型折射 |
| VoidRayAttackBeam | 两个原版折射网格／材质 |
| ProtossShieldRipple | 原版粒子折射 |
| ThorHandGunAttackImpact | 未使用的材质声明；原文件没有对应可绘制层 |

原来的 276 条战斗资源完整保留。新增 13 条折射模型资源和 7 条科学球死亡资源，总计 296 条战斗资源；运行效果定义从 83 增至 84。注册信息为 `deploy/runtime/combat-effects.json`。折射所用原版法线／遮罩已有衍生贴图，新增折射模型条目不重新编码旧贴图。

## 科学球

可重新执行的来源审核：`node tools/audit-science-vessel-source.mjs`。版本化机器证据：[science-vessel-source-20261013.json](../../reports/qa/science-vessel-source-20261013.json)。审核实际读取并校验七个 XML／M3 文件，保留对应原版 XML 节点，而不是只检查推测的文件名。

| 来源 | 具体关系 |
| --- | --- |
| Liberty Campaign ActorData | `ScienceVessel` 的正常死亡 Actor 引用 `ScienceVesselDeath` |
| Liberty Campaign ModelData | `ScienceVesselDeath` 继承 `UnitDeath` |
| StarCoop SkinData／PurifierHologram | `ScienceVessel` → `Hologram_Skin_ScienceVessel` |
| StarCoop SkinData／PurifierHologram | `ScienceVesselDeath` → `Hologram_Death_Large` |
| StarCoop ModelData／Hologram_Death_Large | `Assets/Units/Zerg/Generic_Purifier_Hologram_Death/Generic_Purifier_Hologram_Death.m3`；ScaleMin/Max 均为 2 |
| 新原始 M3 | 原始 Death 动画、1 个标准网格、4 个发射器，无提取缺层 |

受影响的三项身份为 `science_vessel.1`、`.2`、`.3`，共用一个全息模型和同一条皮肤替换关系。历史的“3 项来源缺口”不是普通科学球缺少三个文件；旧查找方式按全息单位名拼接 Death，漏掉了这个共享原版死亡效果。

下载元数据在 `tools/science-vessel-source-dependencies.json` 和 `tools/science-vessel-effects-dependencies.json`；来源模型清单在 `tools/science-vessel-effects-models.json`。现有 `fetch-combat-effects.ps1` 增加显式可选清单参数，默认行为不变；提取工具的追加模式拒绝覆盖已有定义。

旧 `reports/local/hero-iteration/death-resolution.json`、旧审计与原版特效 R3 保持历史结果。新的明确结论为“科学球精英皮肤／死亡模型映射已解决；播放验证另列”。本轮没有实际 SC2 客户端录制，因此不声称客户端完全一致；按用户后续澄清，精确客户端一致性也不是本项目的验收要求。
