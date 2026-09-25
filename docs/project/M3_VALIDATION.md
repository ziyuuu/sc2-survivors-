# M3 实施与验证记录

日期：2026-09-25（北京时间）。规则基线为已批准的 [M0 r6 运行稿](../MVP10_RUNTIME.md)，SHA-256 `D5FCC92A6AB4D48AD963E3D531CACB27F0AD894AEC8B83F8F1BAA7D44CCD290F`。本阶段没有改写三族天赋、建筑或卡牌数值。工作区原有未提交修改未重置。

| 子项 | 已落地行为 |
| --- | --- |
| M3-01 | 标题为“新游戏／读档／天赋”三入口。新局按三族原版图标、四档难度、预设及已解锁的开局英雄逐步确认；替换现有续局前提示并可导出。读档独立预览档内种族、难度、关卡和待处理选择，确认后按档内配置恢复。 |
| M3-02 | 新局、读档、关间精英增援、无尽共用资源就绪协调器。文件读取显示实际字节进度，无法细分的解析和GPU步骤标明进度未知；玩家确认就绪后才进入战斗。失败页有重试、返回、导出，WebGL上下文丢失进入错误状态。精英模型未就绪时不能提交编入。 |
| M3-03 | 第18关胜利后停在撤离／无尽选择；无尽整备使用固定窗口ID，一次发展与一次强化。返回再进入保留已显示及已付款结果；整备完成后亦可返回撤离选择，不重开窗口。 |
| M3-04 | 独立 `endless-flat-v1` 为160×160恒高平地，可通行边界±76，八个固定入口。四座地堡与一座维修设施使用原SC Bunker／Engineering Bay 主体，播放原 Stand／Death 动作；无几何体替身。 |
| M3-05 | 转场先计算全部友军、多舱、守军及建筑的合法落点，再用请求ID、窗口修订和就绪令牌一次提交。素材失败、取消或无合法落点都不进入无尽；保留身份、伤损、订单与预付款，清除战役敌人和旧坐标命令。 |
| M3-06 | 无尽独立240秒、15波终章混合敌池、固定防空／侦测和地狱扩张巢上限。普通过关基础300矿／250气，永久资源按累计战斗分钟用一次性收据发放；旧Acropolis无尽开发档只读导出，不自动映射。 |
| M3-07 | 桌面与390×844窄屏、虚拟标准手柄返回、触屏模拟、开发版存读、离线单HTML存读及素材故障注入均留本地报告。旧存读脚本依赖已经删除的标题入口，标准 `test:browser:save`／`test:offline:save` 已切换为M3流程。 |

## 原版建筑素材来源

锁定本地SC版本 `5.0.16.97563 / B97563`，使用 `tools/fetch-expansion-casc.ps1` 和 `tools/m3-fort-dependencies.json` 核对；模型、贴图依赖共53项，缺失0。四座地堡共享同一模型资源，实际转出模型、动作名与浏览器渲染记录见 `assets/private/m3-pack.json`、`reports/local/m3-import.json`、`reports/local/qa-m3/`。转换后的Bunker有11个动作、54骨；死亡模型2动作、71骨。Engineering Bay有13动作、44骨；死亡模型3动作、38骨。运行时选择 Stand 和 Death，原骨骼绑定保留。碰撞半径分别为1.6和2，建筑大小按模型外包围盒归一到3.2及4世界单位。

| 原文件（锁定SC素材路径） | SHA-256 |
| --- | --- |
| `Assets/Buildings/Terran/BunkerEx1/BunkerEx1.m3` | `9ACCE0C732501555A16AC99DEA434EEEC7340C0CC5A5FAE69E7E30F52DB1EBF4` |
| `Assets/Buildings/Terran/BunkerDeathEx1/BunkerDeathEx1.m3` | `1BE42713B8822D6D5B08120024965D2577C9DACAD8EF71F5C31A387D0CC3D3B7` |
| `Assets/Buildings/Terran/EngineeringBayEx1/EngineeringBayEx1.m3` | `61F309FF34BB2BC726A7409BDB929C72E04CD8894F56537CE413C66787C01EFB` |
| `Assets/Buildings/Terran/EngineeringBayDeathEx1/EngineeringBayDeathEx1.m3` | `7C3E2B769C2E69FB6A93AB65F9ED2FFC37B37EBCE5C4785C639CD917DDF74495` |

> 完整原路径含 `mods/liberty.sc2mod/base.sc2assets/` 前缀；校验机器可直接读取依赖清单。

## 实际执行

| 命令／操作 | 结果与证据 |
| --- | --- |
| `npm run typecheck`、`npm test` | 通过，419／419项。包含三族×四难度相反菜单默认值下的存档往返、多舱及守军换场、240秒与第二轮、60／120秒永久资源边界和一次性收据。 |
| `npm run docs:data`、`npm run docs:check` | 通过；数据参考30单位、15现有英雄、40现有精英、165现行天赋、18关。 |
| `npm run build` | 通过；744／744资源、必需缺失0；独立离线HTML已生成。Vite主JS 1,474.41 kB，仍有大块提示，交M6优化。 |
| `npm run test:browser:save` | 通过；新局、存档预览读档、胜利整备、原模型无尽、保存后重载无地图回退，页面错误0。`reports/local/qa-m3/report.json`。 |
| `node tools/qa-m3-failure.mjs` | 通过；地堡文件读取故障时整备状态、地图和窗口修订不变；失败页可重试、返回、导出。重试成功后模拟WebGL上下文丢失，错误与取消路径正常。`reports/local/qa-m3-failure/report.json`。 |
| `node tools/qa-m3-input.mjs` | 通过；1440×900虚拟标准手柄A进入/B返回、390×844触屏种族选择及Esc返回，未横向溢出或透传战斗输入。`reports/local/qa-m3/input-report.json`。 |
| `npm run test:offline:save` | 通过；本地 `file://` 单HTML断网启动神族简单新局、保存、重载并读档，页面错误0。`reports/local/qa-m3-offline/report.json`。 |

桌面与窄屏原模型画面截图保存在 `reports/local/qa-m3/endless-desktop.png`、`endless-mobile.png`，没有上传素材。开发版浏览器直接核对了五个模型实例、四个Stand/Death动作资源及独立平地图；素材最终美术签收、实体触屏／手柄及稳定60+帧仍属于M7/M6验收。浏览器以调试命令构造第18关胜利入口，**不代表三族零天赋自然通关18关**；无尽首轮到第二轮与分钟奖励由固定步测试验证。旧v1战局不能续玩，旧Acropolis无尽档允许导出而不强制迁移。

可玩产物：[SC2-Survivors-Demo.html](../../dist/SC2-Survivors-Demo.html)，427,905,429字节（408.08 MiB），SHA-256 `03FE43CF007A1AA3FE8E8D0378957B2291278F9512364890E197AB07CD956DE7`。相较M2包减少13,160,317字节（12.55 MiB），其中移除了无尽不再使用的旧地图资源；M6的最终包体预算和性能门槛尚未验收。
