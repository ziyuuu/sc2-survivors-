# 原始动画与战斗效果

在 V3 原有规则与静态 GLB 管线之上增加，未改变波次、单位数值、攻击停顿、转向、编队或 leash。公开目录的 `models-glb/` 是静态预览；对应 `models/` 中的原始 M3 才保留骨骼、动作和独立死亡资源。

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
- 已从 MarineWeaponImpact、BloodTargetImpact、SiegeTankWeaponImpact、RoachMissileImpactEx1、Ravager_Artillery_Missile_Impact、BanelingDeath_Low 提取 **24 张原特效贴图**。保留 M3 flipbook 行列与帧区间。移动尘土、枪口亮光、火焰、酸液、爆炸的发射与时间组合为网页适配；未声称完整还原 SC2 的粒子、材质、灯光、物理碎片和 Actor 系统。
- 34 张 DDS 的 Node 解码结果与本地 Pillow 逐像素比较一致；该对照是额外验证，不是运行依赖。
- 朋友 HTML 必须带齐 8 个动画单位、8 个死亡模型和两个坦克模式包，否则打包失败。开发环境仍可继续规则调试，但会明确显示原始动画缺失。

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
