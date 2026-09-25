# M4 实施与验证记录（待成品视觉确认）

日期：2026-09-25。策划数值和目标以已批准的 M0 r6 `docs/MVP10_COMBAT_ASSETS.md`、`docs/MVP10_ELITE_CATALOG.md` 为准；没有改写这两份批准稿。M3 构建基线为 427,905,429 字节，SHA-256 `03FE43CF007A1AA3FE8E8D0378957B2291278F9512364890E197AB07CD956DE7`。原工作区的未提交修改保留。

## 可运行增量

- 五种精英模板采用批准倍率；在原有 40 款上增添 `viking.2/.3`、`ravager.2/.3`、`high_templar.2/.3`，运行目录现为 46 款。焚烧恶火、猎舰维京、宽刺潜伏者、广域破坏者、屏障不朽者、强电圣堂组成六个精英样板；同家族三型在一张卡内选择，只结算一次，选择与放弃均有出口。回归检查发现广域胆汁原先只放大预警而命中仍用基础半径，已改为按同一个已保存效果半径结算。
- 雷诺、德哈卡、菲尼克斯采用批准的生命、主武器和技能数值。雷诺穿透射击按 0.20 秒逐段真实命中，飞行进度及已命中 ID 入档；德哈卡、菲尼克斯的普攻次级目标有上限，不复制 APM 包。玩家爆虫爆后保留模型并小幅缩身、显示 5 秒倒计时；敌方仍死亡。
- 英雄以较常规模型至少 1.25 倍的视觉尺度出现，三舰样板以 1.15 倍尺度预览。精英三型共享真实主体，通过适度尺度、模型顶部约18%高度内的轻微局部发光色相、原涂装与按攻击事件着色的短效区分；敌方精英原有警示仍独立。战场姓名改为聚焦时详情、小槽号与细生命条；表现倍率不进入碰撞、射程或伤害。
- 模拟层发射事件使用 `entityId:shotSequence` 攻击 ID；技能在已有 cast ID 上区分发射与命中。战局 schema 为 v5，v4 纯数据迁移；视觉事件不作为伤害事实，读档后从已保存的 Raynor/Fenix 未结算 cast 恢复在途弹体，不重播已结算闪光。
- 390×844 精英救援页发现小地图压住标题，已在模态页隐藏小地图；浏览器实际验证三型领取一次和放弃一次都正常退出。

## 三舰原素材与浏览器预览

锁定来源为本地 StarCraft II `5.0.16.97563 / B97563`。完整原路径、依赖和 SHA-256 在 `tools/m4-air-dependencies.json`，转换定义在 `tools/m4-air-models.json`，转换资源在 `assets/private/m3-pack.json`。核查四个模型及贴图依赖共 66 项，缺失 0。净化者旗舰复用现有 `Carrier_Purifier_Collection`，没有复制其 GLB。

| 模型 | 锁定原路径（`mods/liberty.sc2mod/base.sc2assets/` 以下） | 原 M3 SHA-256 | 导出 GLB 字节／SHA-256 | 浏览器动作与挂点 |
| --- | --- | --- | --- | --- |
| 大和战列巡洋舰 | `Assets/Units/Terran/BattlecruiserEX2/BattlecruiserEX2.m3` | `FD2816A52EEDEA49A7A2610313A48A12AFCCDC0C05838F79161E8EF9BEECEB` | 3,598,376 / `FBC6E97A482A90EB1C4313680B54DEA8D4E61C9DB7FF4E8B4B96DD6AFD0BA3B0` | 94 骨；Stand、Walk、Spell A；Stand 武器挂点可读 |
| 大和死亡资源 | `Assets/Units/Terran/BattleCruiserDeathAEx1/BattleCruiserDeathAEx1.m3` | `9A75E6BABE48C119767ECE2CF49958FBA49B4AA5DD67F6D5323929ED117F8366` | 4,372,836 / `E498A7B7BCEBAD8A3D906300B903C21C8FB1F17FCD571DB65C34BC70152D59A4` | 3 动作、71 骨；源中对应死亡资源是 DeathAEx1，不是最初猜测的 `BattlecruiserDeath` 路径 |
| HotS 利维坦 | `Assets/Units/Zerg/Leviathan/Leviathan.m3` | `EEDB305A2FF7FDDf53D28709262819BFE5551290D6904E3A0D9E80C4F1C25A72` | 5,496,348 / `C64B11D4B7139B097AA5F76019ED0C5C359631196BE091D75F5962A9F09AD248` | 101 骨；Stand、Walk、Spell；Stand 武器挂点可读；战斗单位主体，不使用剧情布景 |
| 利维坦死亡资源 | `Assets/Units/Zerg/LeviathanDeath/LeviathanDeath.m3` | `7672ED1324B5803B60A83060B001D4D691FF89C15FDDf98FF14318441D231E1D` | 6,528,384 / `5107F8BFA58A29FCC018F71C0C9EE57BBB39371F7E9A9C046DF0F3E81DB6DCB1` | 1 动作、104 骨；HotS 战斗 Actor 引用的死亡模型对应源 `SS_LeviathanDeath` |
| 净化者旗舰 | 既有 `Carrier_Purifier_Collection` | 见 M3 原资源记录 | 2,138,008 / `C6247968F0A67D7D0EBA4CDBCE5FAC86DF1A561D9C0D9C1F1D7AEB545DB53810` | 43 骨；Stand、Walk 02；舰首挂点可读 |

上述三舰在真实 `World`、原战役地图和运行镜头的**本地诊断预览**中展示批准的一级身体、主武器数值与舰首发射/命中表现；测试用已有实体承载模型，不进入普通招募池。三舰正式英雄身份、截击机与完整主动技能结算仍属 M5；诊断场景不能充作这三项已完成的证据。三舰原来源与导出哈希已核验，浏览器模型无加载错误；素材授权范围和用户最终视觉签收仍待确认。

## 实际验证

| 命令／场景 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm test` | 通过，426／426项；包括五模板数值、三家族新增六变体及胆汁边缘真实伤害、三型锁定/存读、雷诺飞行中读档、德哈卡/菲尼克斯溅射及爆虫友敌结局。 |
| `npm run docs:data`、`npm run docs:check` | 通过；30单位、15现有英雄、46现有精英、165现行天赋、18关。首次文档生成受到工作区沙盒 EPERM 限制，按授权重试后成功。 |
| `npm run build` | 通过，748／748资源、必需缺失0；Vite主JS 1,484.72 kB，单 HTML 440,302,070 字节（419.90 MiB），SHA-256 `D3F4A1AE0D2BFD7B0ED1D2D97BA9EDA097D24D67E28B4A14E8403CAEA6877AC4`。较M3增 12,396,641 字节，主要为两艘新增原舰及其死亡资源。 |
| `npm run test:browser:m4` | 通过；三族九样板、维京/破坏者/高阶圣堂各自普通与三型并排对照、三舰主体与动作/挂点、1440×900及390×844、精英救援三型领取和放弃均无页面错误。证据 `reports/local/qa-m4/report.json` 与本地图像。 |
| `npm run test:browser:save`、`npm run test:offline:save` | 通过，M3 新局/读档/无尽和断网单 HTML 基础存读无回归。 |
| `npm run test:offline:m4` | 通过；开发版导出含 `hellion.2` 身份和未结算雷诺 `line-travel` 的 v5 档，断网 `file://` 单 HTML 导入后再导出仍保留两者，无网络请求和调试接口。前两次脚本误点旧 `save-import` 入口；改用 M3 的“读档→导入文件→预览→资源就绪→继续”流程后通过。 |

同一台本机无头 Chrome、固定低压样板、3秒采样中，三族中位帧间隔16.7ms，P95 16.8ms；人/虫/神 draw calls 为159/168/166，特效池丢弃均0；三舰诊断预览为166 draw calls、丢弃0。对应场景仅6–7友军及3固定高血敌人，60Hz显示同步，上述数据**不证明普通战役全程60+帧**。未保留能以同种子同阵容复测的 M3 旧可运行包，所以不能声称帧时前后改善；包体与哈希可精确比较。M6仍负责普通1–6关、满编、无尽压力和包体预算。

样板截图在 `reports/local/qa-m4/`：`terran-desktop.png`、`zerg-desktop.png`、`protoss-desktop.png`、各族 `-skill.png`、`-mobile.png` 与 `-three-variants.png`、`air-desktop.png`、`air-mobile.png`、`elite-rescue-mobile.png`，只保存在本地。用户尚需确认模型差异、弹道出手感与敌方预警可读性；确认前 M4-02 与 M4 总体不记为完成，不开始 M5 批量制作。
