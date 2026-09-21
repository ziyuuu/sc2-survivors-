# 原素材获取与手工交接

2026-09-21 本地实际检查：8/8 战斗模型、8/8 独立死亡模型、两种坦克形态、原降落仓、SCV、Drone、虫卵、两种地形装饰均已导入；23 个图标、28 张效果贴图、5 张原地表纹理可用。必需资源无缺失。结构/运行加载通过不等于人工视觉验收。

模型、材质与精确公开来源记录在 tools/m3-catalog.mjs、assets/private/m3-pack.json；地表见 tools/import-terrain.mjs、assets/private/terrain-pack.json。后两个报告仅保存在本机。

## 尚缺的原声音

素材公开服务器根目录没有声音目录；Fandom 原文件页受到 403/连接失败限制；公开 GitHub 精确文件检索没有取得有效原文件。不绕过限制，不把合成提示音称为原版。SCV 获救后的亮相动作和单次播放接口已接好，但原亮相语音尚未实际播放。

下列源路径来自锁定的 [SC2 SoundData 快照](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171)。可用本地 SC2 编辑器 [导出资源](https://s2editor-guides.readthedocs.io/New_Tutorials/07_Lessons/083_Export_Game_Assets/)；SCV 的 [原文件页](https://starcraft.fandom.com/wiki/File:SCV_Ready00.ogg) 也列在此，不编造可用下载链接。

| 稳定 ID | 精确游戏内源路径 | 本地放置路径 |
|---|---|---|
| audio.sc2.scv.ready | `LocalizedData/Sounds/TerranUnitVO/SCV/SCV_Ready00.ogg` | `public/assets/audio/sc2/SCV_Ready00.ogg` |
| audio.sc2.marine.attack | `Assets/Sounds/Terran/Marine/Marine_AttackLaunch0.wav` | `public/assets/audio/sc2/Marine_AttackLaunch0.wav` |
| audio.sc2.hellion.attack | `Assets/Sounds/Terran/Hellion/Hellion_AttackLaunch0.wav` | `public/assets/audio/sc2/Hellion_AttackLaunch0.wav` |
| audio.sc2.tank.attack | `Assets/Sounds/Terran/SiegeTank/SiegeTank_AttackLaunch0.wav` | `public/assets/audio/sc2/SiegeTank_AttackLaunch0.wav` |
| audio.sc2.tank.siege | `Assets/Sounds/Terran/SiegeTank/SiegeTank_SiegeAttackLaunch0.wav` | `public/assets/audio/sc2/SiegeTank_SiegeAttackLaunch0.wav` |
| audio.sc2.medivac.heal | `Assets/Sounds/Terran/Medivac/Medivac_HealLoop.wav` | `public/assets/audio/sc2/Medivac_HealLoop.wav` |
| audio.sc2.zergling.attack | `Assets/Sounds/Zerg/Zergling/Zergling_AttackLaunch0.wav` | `public/assets/audio/sc2/Zergling_AttackLaunch0.wav` |
| audio.sc2.roach.attack | `Assets/Sounds/Zerg/Roach/Roach_AttackLaunchRanged0.wav` | `public/assets/audio/sc2/Roach_AttackLaunchRanged0.wav` |
| audio.sc2.ravager.attack | `Assets/Sounds/Ravager_Vox_Attack_Comp01.wav` | `public/assets/audio/sc2/Ravager_Vox_Attack_Comp01.wav` |
| audio.sc2.marine.death | `Assets/Sounds/Marine_Death_Bodyfall_A_01.wav` | `public/assets/audio/sc2/Marine_Death_Bodyfall_A_01.wav` |

放好后运行 npm run assets:prepare / npm run build，验证 RIFF/WAVE 或 OggS 后自动引用，无需改游戏代码。

## 枪口粒子缺少一层

MarineWeaponLaunch 原引用 fireball_1hot.dds 当前 [公开地址](https://dist.sc2arcade.com/star-assets/textures/fireball_1hot.dds) 返回 404。准确放置路径：`assets/private/dds/fireball_1hot.dds`。当前只使用同一个原效果已有的 glow_yellow1 层，没有拿坦克爆炸图冒充它。补齐后执行：

`node tools/import-m3-pack.mjs fx.muzzle`

`npm run assets:prepare`

## 字体与动作边界

不下载字体。本地 SC2 Chinese / SC2 Eurostile / SC2 Extended 若存在会被 local() 引用，否则使用系统回退。

原降落仓没有独立开门片段，使用原门骨骼的本地适配；命中闪光、粒子发射、接触阴影与着色器为网页实现。完整说明见 [ANIMATION_EFFECTS.md](ANIMATION_EFFECTS.md)。
