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
- 已从 MarineWeaponImpact、BloodTargetImpact、SiegeTankWeaponImpact、RoachMissileImpactEx1、Ravager_Artillery_Missile_Impact、BanelingDeath_Low 提取 **33 张原特效贴图**。保留 M3 flipbook 行列与帧区间。移动尘土、枪口亮光、火焰、酸液、爆炸的发射与时间组合为网页适配；未声称完整还原 SC2 的粒子、材质、灯光、物理碎片和 Actor 系统。
- 前一轮对 34 张颜色/效果 DDS 的 Node 解码结果与本地 Pillow 逐像素比较一致；新增材质沿用该解码器。另以自动化测试验证 SC2 法线通道重建、单位向量和 alpha 发光遮罩；不把旧 34 张对照报告冒充新素材逐像素复核。
- 朋友 HTML 必须带齐 8 个动画单位、8 个死亡模型和两个坦克模式包，否则打包失败。开发环境仍可继续规则调试，但会明确显示原始动画缺失。

## 原始材质与桌面清晰度

原先转换仅导出 Diffuse，且桌面关闭抗锯齿、DPR 上限 1.5。现在按每个 M3 标准材质引用下载对应 DDS，导出 GLB 时内嵌颜色、法线、高光和第一层发光。8/8 战斗模型有原法线与高光，7/8 有原发光层；Marine 的原始 M3 没有发光贴图引用，不人为补造。死亡与坦克形态包也走相同管线。

`tools/m3-materials.mjs` 按 [SC2Mapster/m3addon 格式实现](https://github.com/SC2Mapster/m3addon/blob/master/shared.py#L657)说明的存储方式，将法线 alpha 解码为 X、反向 green 解码为 Y，再重建 Z。颜色层按 M3 的 RGB/A/R/G/B 通道选择处理；例如 Roach 的发光层引用 Specular 文件的 alpha，而不是把整个高光颜色当发光。保留 DDS 最高 mip 的实际尺寸；Marine 颜色贴图仍是原战斗模型的 512×256。

高光使用 glTF `KHR_materials_specular`，粗糙度由原 specularity 近似映射；发光使用 `KHR_materials_emissive_strength`。材质管线现为 **v3**：用原 diffuse alpha 掩码还原队伍色；保留可用 UV0–UV3；通过 GLB extras 和版本管理中的运行时适配保留独立 alpha、第二发光层、透明／加法混合和原 unlit 标记。动态材质参数与完整折射仍未复刻。

医疗艇原网格中有两片 type 2 displacement 辅助表面，现明确排除；原机体、红灯和发动机叠加层分别保留，不再把扰动面显示成白色实体。缩放使用锁定 ModelData 比例和统一 1.4 世界尺度，足点与包围范围只依据实体机体，排除辅助效果。所有批次材质在载入时预编译并报告错误，覆盖原 unlit 特效网格；无光照材质也共享正确的骨骼变换。

转换修复位于 `tools/m3-materials.mjs`、`tools/m3-scene.mjs` 和 `src/render/loaders/sc2-materials.ts`，不写入可被重新下载覆盖的转换器缓存。导入报告逐材质记录源文件、通道、UV、分类和未支持内容。

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

放入后运行 `npm run assets:prepare` / `npm run build`，按稳定 asset ID 自动优先播放、内嵌；连同下文的 SCV 亮相语音，manifest 明确标记 10 项 `missing`。没有可验证的公开二进制下载地址，故不编造直链。更多原版移动/受击音效尚未取得，不能声称整套音效齐全。

## 本轮新增原素材与播放适配

- SCV：scv.m3，16 个动作；Drone：drone.m3，10 个动作；经济虫卵：原 banelingegg.m3，4 个动作。这里将原虫卵用作 SCV 囚笼，是 Survivors 玩法适配，不声称原 SC2 有“虫卵内工兵”。三个稳定 ID 为 model.scv / model.drone / model.egg。
- 人族降落仓：droppodfalling.m3，Birth 3.266 秒、Stand 5 秒、Death 6.333 秒。下落和被毁播放各自原动作；无独立开舱动作，因此 PodView 旋转原 DropPod_Door 骨骼开门，不拿 Death 冒充开门。落地守军、伤害与释放由 World 决定。
- 枪兵攻击不再把完整片段压进 0.15 秒。原上身骨骼按 1.4 倍播放，与腿部原移动动作混合；开火时间由 lastShotAt 驱动，不能改变攻击周期。枪口随每一帧原 Ref_Weapon 挂点移动，通用贯穿射线已移除。坦克炮塔与车体朝向分离，开火由原炮管动作及炮口／落点爆炸表现；恶火使用同兵种的原火焰贴图作定向喷射；虫族使用酸液落点，医疗保留连续治疗束。枪口采用原 MarineWeaponLaunch 的 glow_yellow1 层，fireball_1hot 层仍缺失，不能称为完整原粒子系统。
- 真实地表：char_dirt、char_dirtnormal、char_rock、char_rocknormal、char_dirt_cracked，均为原 DDS 的 512×512 最高 mip；tools/import-terrain.mjs 校验、解码并生成原始来源与哈希。CharDuneRock_00 与 BarracksWrecked_00 使用原网格；不再重复铺目录截图或用多面体代替岩石。地图外部随当前开放边界变暗；软接触阴影为网页适配。
- SCV 获救显示原模型 3.8 秒，经济只结算一次。audio.sc2.scv.ready 已接入一次性播放，但 SCV_Ready00.ogg 尚未取得；现在不能声称已播放原亮相语音。其余 9 个原声音仍缺失，3 个合成提示音保留。
- 原文件路径、缺失枪口纹理、恶火 Beam 模型和全部音频手工放置路径见 ASSET_DOWNLOAD_REQUIRED.md。所有艺术处理和截图留在本机。

## 独立骨架与动作复核

运行 `python tools/audit-m3-independent.py`；缺少只读校验器时先加 `--download-reader`。脚本只执行 SHA-256 锁定的 [M3Studio](https://github.com/Solstice245/m3studio) 读取器，库和 GPL LICENSE 留在本地缓存，不随游戏发布。下载地址的 main 可变，代码内容由脚本内三个摘要固定；摘要变化会拒绝执行。

本轮独立读取 24 个 M3，检查 995 个原骨骼名称均存在于 GLB，并对照 208 个主模型导出片段的原名称和时长，差异 0。另核对 4 份 M3A：Marine 与 Hellion 各 72/72 变换 ID 匹配，只有 Flail；Tank 126/132 匹配，附加 Flail 完整拒绝导入；Baneling 147/147 匹配，保留 Birth A / Birth A Walk。附加包未被拿来替换正常射击或受击。

这是独立二进制读取结果，**不是 Blender 渲染或人工视觉通过**。记录见 `reports/qa/v5-model-audit.json`。浏览器额外播放 8 套移动、7 种有武器单位的攻击事件、8 套死亡和坦克四种状态；爆虫没有虚构远程攻击片段。医疗原 Stand Work 与持续治疗由单独映射和模拟覆盖。

降落仓子网格关闭失效的动画包围范围裁剪，仍按落点进行场景筛选；4 种载荷的下落、落地、开门、被毁检查与截帧保存在 `reports/local/qa-v5-assets/PODS.json` 和同目录 PNG。标签同时包含原兵种图标、名称、编号、HP 和动态新增／晋升用途。原门骨骼适配仍需人工对照观感。

地图新增原 Char 崖壁 diffuse / normal / emissive 三张 DDS，两层高度 0 / 3 和 4×6 坡道由共享数据生成真实网格。地面经坡道，近战不能隔崖，远程检查中间高度，飞行层独立。平地采用保守包围区域提前判定，边缘保留足迹与坡度逐点检测，不改变通行规则。

## V6 补充源文件与原声音

此前缺失的 10 个声音、Fireball_1Hot.dds 和 HellionBeam.m3 已从暴雪公开 CASC 包取得。版本/构建配置锁在 `tools/sc2-casc-lock.json`，精确包路径和 SHA-256 锁在 `tools/sc2-casc-targets.json`，可运行 `npm run assets:originals` 复现。工具由固定 [CASCLib 源码](https://github.com/WoW-Tools/CascLib/tree/3f8be478177802de4ae7ebae24fb25ab860ef104) 在本机编译；HTTPS、精确文件筛选和路径日志修补在 `tools/patch-casc-source.py`，重新取得源码不会丢失修复。该次声音/效果包为 5.0.16.97563，模拟的 5.0.15 基础数值没有变更。

Marine 增加原 Fireball 层，保留 GlowYellow 短促亮光；Hellion 使用原 HellionBeam 的 Flame2 8×4 图集（9–17 帧）和 GlowOrange，从实际武器挂点发射。没有通用激光线。原材质贴图与帧区间已取得，但发射、尺寸、透明混合及网页时序仍为渲染适配，不称为完整原版粒子运行时。

SCV 使用 zhCN 的 SCV_Ready00.ogg。其余 9 个 WAV 原文件是 IMA ADPCM，Chrome 实测不能直接解码；使用本地 libsndfile 解码为 PCM16，保持采样率、声道和全部样本。`assets/private/audio-conversion.json` 记录原/输出哈希、采样数、峰值、解码器版本与样本完全一致的复核。游戏只有播放表现，伤害/冷却/治疗仍由模拟处理。

浏览器实际验证 10/10 解码，七种攻击声、枪兵死亡、SCV 仅一次亮相、治疗循环与暂停停止。断网 file:// 同样解码全部声音。录音听审及与原客户端同场景的人工视听对照尚未完成；不把 WebAudio 开始播放作为人工听审。
