# 六英雄连续普攻独立预览 · 2026-10-03

用户要求先仅制作连续普通攻击预览，交付独立HTML到Google Drive，确认后才加入游戏。

本目录是独立Three.js展示，不使用World、不修改游戏代码/运行资源/战斗规则，不包含主动技能。包含六英雄原模型、三只原蟑螂地面靶、原异龙空中靶和斯旺原弹体。无限生命射击靶仅便于看效果。

`node tools/prepare-hero-attack-lab.mjs` 在本地解码20张原始DDS并准备8张新获取CC0纹理。官方Kenney粒子包：https://kenney.nl/assets/particle-pack；ZIP SHA256 `b631d4b07f7002549fdcf155f01141ad482f79f3440e4e301eed49ce5f1d8958`，许可证保留在 `.cache/hero-attack-lab/kenney-particle-pack/License.txt`。本地原贴图出处/哈希保留于纹理清单；除sparks4为既有来源缓存/独立哈希外，所使用原DDS均匹配固定CASC B97563原字节。纹理和粒子组合并非SC原Actor效果的完整复刻。

`node tools/build-hero-attack-lab.mjs` 打包实际使用的17纹理和9模型，脚本和媒体全部内嵌于 `dist/Six-Terran-Heroes-Continuous-Attack.html`。输出30964923 bytes，SHA256 `2391d0d5e58f83db63b28d59de1921ea40b8498994dffc562bd6abc98ab8ac2e`。代码只复用原材质还原工具，不接入游戏模块入口。诺娃依照当前原A狙击姿态选择6/7/15网格组，并保留原枪骨到手的装配修正；战舰使用01/04两个真实普攻炮位。

独立TS类型检查通过。`node tools/qa-hero-attack-lab.mjs` 在Chrome断网环境验证六英雄连续开火/命中、暂停继续、旋转输入、V阶节奏、辉光开关及1440×1000、390×844、844×390、667×375；错误0、外部请求0。初次检查发现备用武器显示、弹芯可读性和窄屏战舰裁切，均在预览内修正。没有实机手机结果。

12秒V阶单英雄连续样本：泰凯斯396发392命中，160粒子113弹壳，末240帧间隔p50/p95/p99=16.7/17.1/17.1 ms；战舰148发142命中，165粒子，16.7/17.1/17.3 ms。它们仅是本独立预览的短样本，不是游戏性能或人工视觉验收。逐次射击与不同飞行时长可能在同帧抵达；效果只做展示，不承担游戏伤害。

本地证据：`reports/local/hero-attack-lab/build.json`、`final-check.json`、六英雄`*-final.png`及四视口截图。HTML与素材保持本地，Drive仅上传用户明确请求的独立HTML；不替换旧录像展示文件。
