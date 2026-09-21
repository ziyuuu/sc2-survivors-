# 原始动画与战斗效果

动画、材质与效果管线建立在 V3 的模拟/渲染分离之上，不修改单位数值、攻击停顿、转向、编队或 leash。波次的单独渐进调整见 DATA_SOURCES.md。公开目录的 `models-glb/` 是静态预览；对应 `models/` 中的原始 M3 才保留骨骼、动作和独立死亡资源。

## 获取与复现

```sh
npm install
npm run assets:download
npm run assets:animate
npm run dev
npm test
npm run build
```

首次 `npm run dev` 会自动尝试这两段资源准备。转换在本机 Node 完成，不需要 Python、Blender、整份 SC2 客户端或上传素材。下载需要网络，完成后的游戏资源全部本地化。朋友使用的 HTML 同时内嵌这些模型、动作和贴图。

原始包在 `assets/private/m3/`、DDS 在 `assets/private/dds/`，转换后在 `public/assets/animated/` 与 `public/assets/effects/`。这些目录、生成 manifest、缓存和 dist 均被 Git 忽略。`assets/private/m3-pack.json` / `reports/local/m3-import.json` 记录来源、SHA-256、动画名与失败项；`tools/m3-catalog.mjs` 是稳定资源 ID 与文件名入口。每次写入前验证 M3 section table、DDS header；导出后验证 GLB header、长度、内部依赖、动画轨道。

来源：用户指定的 [Asset Explorer](https://github.com/sc2-arcade-watcher/asset-explorer)、[公开 M3 目录](https://dist.sc2arcade.com/star-assets/models/)、[固定 SC2 数据快照](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171)。M3 转换器固定为 [star-tools-three-m3-loader ee0eff0](https://github.com/sc2-arcade-watcher/star-tools-three-m3-loader/tree/ee0eff037e2e40d2aad72f4f856af0710b8a44e5)，只缓存所需源码，保留其 MIT LICENSE 与 structures.xml 原作者说明。格式结构源自 SC2Mapster/m3addon、Solstice245/m3studio；工具许可不授予游戏素材权利。

## 已实际取得的模型

| ID | 原包文件 | 转换后的稳定路径 |
|---|---|---|
| model.marine | [marine.m3](https://dist.sc2arcade.com/star-assets/models/marine.m3) | `public/assets/animated/model.marine.glb` |
| model.hellion | [hellionex1.m3](https://dist.sc2arcade.com/star-assets/models/hellionex1.m3) | `public/assets/animated/model.hellion.glb` |
| model.tank | [tankex1.m3](https://dist.sc2arcade.com/star-assets/models/tankex1.m3) | `public/assets/animated/model.tank.glb` |
| model.medivac | [medivacex1.m3](https://dist.sc2arcade.com/star-assets/models/medivacex1.m3) | `public/assets/animated/model.medivac.glb` |
| model.zergling | [zergling.m3](https://dist.sc2arcade.com/star-assets/models/zergling.m3) | `public/assets/animated/model.zergling.glb` |
| model.roach | [roach.m3](https://dist.sc2arcade.com/star-assets/models/roach.m3) | `public/assets/animated/model.roach.glb` |
| model.baneling | [banelingex1.m3](https://dist.sc2arcade.com/star-assets/models/banelingex1.m3) | `public/assets/animated/model.baneling.glb` |
| model.ravager | [ravager.m3](https://dist.sc2arcade.com/star-assets/models/ravager.m3) | `public/assets/animated/model.ravager.glb` |
| model.tank.siege | [siegetank.m3](https://dist.sc2arcade.com/star-assets/models/siegetank.m3) | `public/assets/animated/model.tank.siege.glb` |
| model.tank.morph | [siegetankmorph.m3](https://dist.sc2arcade.com/star-assets/models/siegetankmorph.m3) | `public/assets/animated/model.tank.morph.glb` |
| model.marine.death | [marinedeathex1.m3](https://dist.sc2arcade.com/star-assets/models/marinedeathex1.m3) | `public/assets/animated/model.marine.death.glb` |
| model.hellion.death | [helliondeath.m3](https://dist.sc2arcade.com/star-assets/models/helliondeath.m3) | `public/assets/animated/model.hellion.death.glb` |
| model.tank.death | [siegetankdeathex1.m3](https://dist.sc2arcade.com/star-assets/models/siegetankdeathex1.m3) | `public/assets/animated/model.tank.death.glb` |
| model.medivac.death | [medivacdeath_00.m3](https://dist.sc2arcade.com/star-assets/models/medivacdeath_00.m3) | `public/assets/animated/model.medivac.death.glb` |
| model.zergling.death | [zerglingdeathex1.m3](https://dist.sc2arcade.com/star-assets/models/zerglingdeathex1.m3) | `public/assets/animated/model.zergling.death.glb` |
| model.roach.death | [roachdeathex1.m3](https://dist.sc2arcade.com/star-assets/models/roachdeathex1.m3) | `public/assets/animated/model.roach.death.glb` |
| model.baneling.death | [banelingex1deathrupture.m3](https://dist.sc2arcade.com/star-assets/models/banelingex1deathrupture.m3) | `public/assets/animated/model.baneling.death.glb` |
| model.ravager.death | [ravager_death_00.m3](https://dist.sc2arcade.com/star-assets/models/ravager_death_00.m3) | `public/assets/animated/model.ravager.death.glb` |

Hellion/Medivac 使用已取得的同单位较早死亡包，Baneling 使用 rupture 死亡变体；目录未提供本次 ActorData 所指的无编号 Ex1 死亡文件。它们不被描述为当前客户端逐帧一致的效果。

## 播放和表现边界

- 8/8 战斗模型有原始骨骼动作。优先精确 `Walk`、`Attack`、`Stand`，避免误用 `Walk Start`、`Attack Cover`。Medivac 治疗映射 `Stand Work`；Tank 的 `Morph Start` / `Morph End` 映射架起和收起。Baneling 用原移动与独立爆炸死亡包，没有虚构射击动作。
- 原始动作在载入时由 AnimationMixer 采样为共享骨矩阵纹理；每单位用自己的模拟时间、移动距离、攻击停顿与模式进度播放，GPU 插值、InstancedMesh 批量绘制。暂停不推进动作。8 个单位使用原骨骼，不再走旧程序步态分支。
- 8/8 独立死亡模型播放原动作；模拟实体在 1.5 秒后回收时，渲染副本允许播完剩余动作（最多 5 秒，随后短暂消退），不复活、不参与碰撞或寻敌。
- 命中由真实扣血通知触发：生物血花、机械火花、短暂材质闪光。不把受击闪光描述为原生 `Hit` 骨骼动作，也不增加硬直。原包普遍没有单独受击动画。
- 已从 MarineWeaponImpact、BloodTargetImpact、SiegeTankWeaponImpact、RoachMissileImpactEx1、Ravager_Artillery_Missile_Impact、BanelingDeath_Low 提取 **28 张原特效贴图**。保留 M3 flipbook 行列与帧区间。移动尘土、枪口亮光、火焰、酸液、爆炸的发射与时间组合为网页适配；未声称完整还原 SC2 的粒子、材质、灯光、物理碎片和 Actor 系统。
- 前一轮对 34 张颜色/效果 DDS 的 Node 解码结果与本地 Pillow 逐像素比较一致；新增材质沿用该解码器。另以自动化测试验证 SC2 法线通道重建、单位向量和 alpha 发光遮罩；不把旧 34 张对照报告冒充新素材逐像素复核。
- 朋友 HTML 必须带齐 8 个动画单位、8 个死亡模型和两个坦克模式包，否则打包失败。开发环境仍可继续规则调试，但会明确显示原始动画缺失。

## 原始材质与桌面清晰度

原先转换仅导出 Diffuse，且桌面关闭抗锯齿、DPR 上限 1.5。现在按每个 M3 标准材质引用下载对应 DDS，导出 GLB 时内嵌颜色、法线、高光和第一层发光。8/8 战斗模型有原法线与高光，7/8 有原发光层；Marine 的原始 M3 没有发光贴图引用，不人为补造。死亡与坦克形态包也走相同管线。

`tools/m3-materials.mjs` 按 [SC2Mapster/m3addon 格式实现](https://github.com/SC2Mapster/m3addon/blob/master/shared.py#L657)说明的存储方式，将法线 alpha 解码为 X、反向 green 解码为 Y，再重建 Z。颜色层按 M3 的 RGB/A/R/G/B 通道选择处理；例如 Roach 的发光层引用 Specular 文件的 alpha，而不是把整个高光颜色当发光。保留 DDS 最高 mip 的实际尺寸；Marine 颜色贴图仍是原战斗模型的 512×256。

高光使用 glTF `KHR_materials_specular`，粗糙度由原 specularity 近似映射；发光使用 `KHR_materials_emissive_strength`。这属于 Three.js PBR 适配，未复刻 SC2 全部 shader、队伍色、动态 UV 或第二发光层。当前只有一个 Medivac 辅助材质层使用非 UV0，明确记录 unsupported 并跳过；主机体的四类贴图成功导出。导入报告逐材质记录来源、通道、已加载/不支持的层，pipeline version 为 2；朋友版打包校验版本及必需原法线层，旧颜色-only 包需要重新运行 `npm run assets:animate`。

桌面默认随屏幕像素比例渲染，开启抗锯齿与最高 8 倍各向异性过滤（服从 GPU 能力）；手机默认均衡，DPR 上限 1.5 / 4 倍过滤。菜单和暂停页提供清晰、均衡、省电设置；保存在本地，单 HTML 同样可用。材质齐全和像素正确不等于 SC2 客户端画质：地形已换成原 Char DDS 颜色/法线贴图和原岩石、兵营残骸，光照仍为网页适配，完整阴影/Actor/粒子材质系统仍未复刻，人工视觉验收尚未完成。

## 原版音效尚缺

已检查素材站目录、公开索引及声音素材站；公开目录没有对应声音包，声音站出现 403，未绕过。当前仍有 3 个本地合成 WAV，不能称为原版声音。以下准确源路径来自同一 SC2 SoundData；可以通过 [SC2 Editor 导出](https://s2editor-guides.readthedocs.io/New_Tutorials/07_Lessons/083_Export_Game_Assets/)，无需再找不明来源的整包。

| 对应事件 | 游戏内源路径（`Assets/Sounds/` 下） | 本地放置路径 |
|---|---|---|
| Marine 开火 | `Terran/Marine/Marine_AttackLaunch0.wav` | `public/assets/audio/sc2/Marine_AttackLaunch0.wav` |
| Hellion 开火 | `Terran/Hellion/Hellion_AttackLaunch0.wav` | `public/assets/audio/sc2/Hellion_AttackLaunch0.wav` |
| Tank 开火 | `Terran/SiegeTank/SiegeTank_AttackLaunch0.wav` | `public/assets/audio/sc2/SiegeTank_AttackLaunch0.wav` |
| Siege 开火 | `Terran/SiegeTank/SiegeTank_SiegeAttackLaunch0.wav` | `public/assets/audio/sc2/SiegeTank_SiegeAttackLaunch0.wav` |
| Medivac 治疗 | `Terran/Medivac/Medivac_HealLoop.wav` | `public/assets/audio/sc2/Medivac_HealLoop.wav` |
| Zergling 攻击 | `Zerg/Zergling/Zergling_AttackLaunch0.wav` | `public/assets/audio/sc2/Zergling_AttackLaunch0.wav` |
| Roach 攻击 | `Zerg/Roach/Roach_AttackLaunchRanged0.wav` | `public/assets/audio/sc2/Roach_AttackLaunchRanged0.wav` |
| Ravager 攻击 | `Ravager_Vox_Attack_Comp01.wav` | `public/assets/audio/sc2/Ravager_Vox_Attack_Comp01.wav` |
| Marine 倒地 | `Marine_Death_Bodyfall_A_01.wav` | `public/assets/audio/sc2/Marine_Death_Bodyfall_A_01.wav` |

放入后运行 `npm run assets:prepare` / `npm run build`，按稳定 asset ID 自动优先播放、内嵌；manifest 当前明确标记这 9 项 `missing`。没有可验证的公开二进制下载地址，故不编造直链。更多原版移动/受击音效尚未取得，不能声称整套音效齐全。

## 本轮新增原素材与播放适配

- SCV：scv.m3，16 个动作；Drone：drone.m3，10 个动作；经济虫卵：原 banelingegg.m3，4 个动作。这里将原虫卵用作 SCV 囚笼，是 Survivors 玩法适配，不声称原 SC2 有“虫卵内工兵”。三个稳定 ID 为 model.scv / model.drone / model.egg。
- 人族降落仓：droppodfalling.m3，Birth 3.266 秒、Stand 5 秒、Death 6.333 秒。下落和被毁播放各自原动作；无独立开舱动作，因此 PodView 旋转原 DropPod_Door 骨骼开门，不拿 Death 冒充开门。落地守军、伤害与释放由 World 决定。
- 枪兵攻击不再把完整片段压进 0.15 秒。原上身骨骼按 1.4 倍播放，与腿部原移动动作混合；开火时间由 lastShotAt 驱动，不能改变攻击周期。枪口和曳光使用原 Ref_Weapon 挂点。枪口采用原 MarineWeaponLaunch 的 glow_yellow1 层，fireball_1hot 层仍缺失，不能称为完整原粒子系统。
- 真实地表：char_dirt、char_dirtnormal、char_rock、char_rocknormal、char_dirt_cracked，均为原 DDS 的 512×512 最高 mip；tools/import-terrain.mjs 校验、解码并生成原始来源与哈希。CharDuneRock_00 与 BarracksWrecked_00 使用原网格；不再重复铺目录截图或用多面体代替岩石。地图外部随当前开放边界变暗；软接触阴影为网页适配。
- SCV 获救显示原模型 3.8 秒，经济只结算一次。audio.sc2.scv.ready 已接入一次性播放，但 SCV_Ready00.ogg 尚未取得；现在不能声称已播放原亮相语音。其余 9 个原声音仍缺失，3 个合成提示音保留。
- 原文件路径和唯一缺失纹理、全部音频手工放置路径见 ASSET_DOWNLOAD_REQUIRED.md。所有艺术处理和截图留在本机。
