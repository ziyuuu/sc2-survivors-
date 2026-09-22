# 原素材获取与手工交接

2026-09-21 V6：此前缺少的 **10 个声音与 2 项武器源文件全部补齐**。原始字节来自暴雪公开 SC2 CASC 包，固定为 5.0.16.97563（B97563）；游戏基础数值仍为独立锁定的 5.0.15，未改波次或经济。

当前清单没有待用户补交的声音／武器文件。字体仍采用已约定的系统回退；完整 SC2 粒子、折射、材质参数动画及部分死亡变体的逐帧对照仍属渲染边界，见 [ANIMATION_EFFECTS.md](ANIMATION_EFFECTS.md)。

## 可复现下载

```powershell
python -m pip install --target .cache/audio-python -r tools/audio-requirements.txt
npm run assets:originals
node tools/import-m3-pack.mjs fx.muzzle fx.flame
npm run assets:prepare
npm run build
```

下载脚本：[fetch-sc2-casc.ps1](../tools/fetch-sc2-casc.ps1)。[版本锁](../tools/sc2-casc-lock.json)固定 BuildConfig/CDNConfig；[精确文件清单](../tools/sc2-casc-targets.json)保存游戏包路径、原文件大小、SHA-256 和放置位置。`-Refetch` 已实际重新获取并验证全部 12 项。只下载索引和指定文件，不需要完整客户端、不使用登录信息。CASC 原包约 78 MB 索引缓存位于 `.cache/casc-data`。

9 个 WAV 原编码为 IMA ADPCM，Chrome 无法直接播放。下载后在本机转换为 PCM16，保留采样率、单／双声道与全部解码样本，并与再次读取的 PCM 逐样本比较。SCV 使用原简体中文 Ogg，不重配音、不剪切。原包保存在 `assets/private/casc`，不会被 PCM 覆盖。

## 精确文件与位置

以下短路径均位于 `mods/liberty.sc2mod/base.sc2assets/`，SCV 语音则位于 `mods/liberty.sc2mod/zhcn.sc2assets/`。

| 稳定 ID | 原包内文件路径 | 运行／转换输入位置 |
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
| source.fx.muzzle.fireball | `Assets/Textures/fireball_1hot.dds` | `assets/private/dds/fireball_1hot.dds` |
| source.fx.flame | `Assets/Effects/Terran/HellionBeam/HellionBeam.m3` | `assets/private/m3/hellionbeam.m3` |

若未来 CDN 不可达，仍可使用 SC2 编辑器导出同路径原文件并放入表中位置；声音经 `npm run assets:prepare` 本地转换，效果经上述定向导入，无需改游戏代码。导入必须通过文件头／内容校验，不能使用下载错误页面。

模型仍使用原 M3 主动作；已下载 M3A 仅含 Flail，坦克补充动作绑定不完整时仍拒绝使用。原仓门是已标注的骨骼适配，不把死亡动作当开门。结构、浏览器播放与人工视觉／听审是独立验收；本轮没有声称已通过人工同场景对照。

## V9 原地图与资源掉落

原 Crystal、GasCanister、SpaceMineralCluster 三种掉落及 Kairos Junction LE 原地图已取得并载入，无待用户补交的运行素材。地图包路径 `assets/private/maps/KairosJunctionLE.SC2Map`；全部511个依赖精确URL/路径/哈希见 [map-dependencies.json](../tools/map-dependencies.json)，地图版本见 [map-lock.json](../tools/map-lock.json)。复现 `npm run assets:map`，失败项会输出 `reports/local/map-missing.json`，放入清单指定路径后重新执行，不需改代码。完整流程与视觉边界见 [MAP_PIPELINE.md](MAP_PIPELINE.md)。

## V15 五兵种、精英与英雄

新增原字节均已从固定公开 CASC 取得。43 项单位/死亡/坦克形态输入见 [expansion-models.json](../tools/expansion-models.json)；4 项劫掠者/刺蛇武器效果源文件见 [expansion-effects.json](../tools/expansion-effects.json)。完整 M3/DDS/图标路径、安装位置、文件头与哈希为 [expansion-dependencies.json](../tools/expansion-dependencies.json)，截至本轮 267 个依赖、缺失 0。

```powershell
python tools/resolve-expansion-models.py
pwsh -NoProfile -File tools/fetch-expansion-casc.ps1
node tools/import-m3-pack.mjs
node tools/prepare-expansion-assets.mjs
npm run build
```

CASC 工具首次安装仍由 `npm run assets:originals` 准备。下载失败会写 `reports/local/expansion-missing.json`，可按每条 installFile 手工放入原文件，验证后重跑。不把 HTML 错误页当 M3/GLB。英雄图标为雷诺/泰凯斯/诺娃原图标；15 款精英沿用对应原兵种图标，界面用名称、紫色标记和原皮肤辨识，并没有捏造独立原图标。

当前没有待用户补交的必需模型。独立受击动作大多不存在，使用命中特效；爆虫通过原死亡动作表现自爆；医疗艇使用 Stand Work 治疗。英雄技能时间/弹道、原粒子材质的网页发射和发光轮廓属于明确的渲染适配。没有本地原字体，仍用系统回退。
