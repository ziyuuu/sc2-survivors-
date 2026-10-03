# P0设计交付核对 · 2026-10-03

范围：仅[统一设计](NEXT_ITERATION_P0_20261003.md)、[能力对照](NEXT_ITERATION_P0_CAPABILITIES_20261003.md)、[r2精英与英雄重设计](ELITE_HERO_REDESIGN_20261003.md)、[提案JSON](NEXT_ITERATION_P0_VALUES_20261003.json)、文档生成器和计划入口/状态。运行基线提交`5980dc83d9e78605181805d35106658b3b126979`；r1设计交付提交`34962afce8ea59456b9486415ec9ec36abccff2d`。未实施P1—P6，未改游戏数值或schema，没有新构建、部署、素材处理、数据采集或清理。下面1—3节保留r1历史；第5节记录本次r2。

## 1. r1历史实际执行与结果

| 命令/核对 | 结果与适用范围 |
|---|---|
| `node --import tsx tools/docs/export-next-iteration-p0.mts` | 最终生成成功；独立内存World只做属性派生，不step/fire/hit/save、不联网 |
| `node --import tsx tools/docs/export-next-iteration-p0.mts --check` | 最终一致性、覆盖、提案算术/任务状态、本稿与主稿/对照表的本地链接核对通过；不是游戏测试 |
| `npm run docs:check` | 实际通过：`Game reference matches runtime data.`；现有游戏数据参考与源码一致 |
| `git diff --name-only HEAD -- src test package.json package-lock.json tsconfig.json vite.config.ts deploy dist` | 无输出：这些已跟踪运行/测试/依赖/发行文件未改 |
| `JSON.parse(docs/project/status.json)` | 实际读取成功；新增P0状态，旧M6等进度保留 |
| `git diff --check -- AGENTS.md docs tools/docs` | 最终通过：无新增差异空白错误；新P0稿/对照/本稿另由生成器校核行尾空白 |

初次在沙箱运行tsx报`spawn EPERM`；允许本地esbuild子进程后，文档生成器第一次报告新写的`expedition-cards`导入路径不存在。改为真实`simulation/progression/expedition-drafts`后实际生成和核对成功。两次初始失败不记为通过，也不归为游戏故障。

## 2. r1历史覆盖和算术核对

- 普通家族30项：每族10；逐项零天赋/零卡/零科技的I/III/V/VII属性，VII仅作已批准天赋解锁后的公式对照。坦克架起、恶蝠、维京突击另列模式。
- 精英90项：每普通家族恰三型；逐项I/V相对同家族普通V，列当前HP/盾/护甲/主武器及周期/医修、独有效果、拟保留值及本族反馈。条件/群伤/法术不冒充无条件DPS。
- 英雄18项：每族六；14伤害、三支援、一控制，德哈卡兼储备。当前I/V普攻及耐久、当前/新I/III/V技能、每包/每脉冲、邻敌上限与冷却、支援I—V对象/次数/期限均列出。
- 趣味卡24种族身份：每族四共用规则加四独有；共用表标签不新增存档键。另列两组×五品质全队牌、恢复/能量/生产卡及现有科技入口。
- D逐级值与1/1.4/1.8/2.2/2.6关系一致；诺娃主包恒0.75D；大和I/V预算≥9000/23520；伤害AOE完整预算达到对应半血，扎加拉按至少两枚。橙火力三张理论DPS因子1.8352校核。**这些都是算术，不是实际Boss命中/击杀。**
- 对照表保留来源文本UTF-8/LF规范化SHA-256，`--check`重新按当前源码派生并规范化换行后逐字比对，修改源码后须重新生成、审阅。Windows/云端的CRLF/LF差异不造成假变更；下节交付文件指纹仍为本机原始字节。生成内容不依赖墙钟或随机runId，未保存用户战局。

## 3. r1交付文件指纹（历史）

r1交付时的字节数和SHA-256见下表；均为本地UTF-8文件，不是新游戏构建或发行资源散列。r2新指纹在第5节，不用旧指纹冒充当前文件。

| 文件 | 字节数 | SHA-256 |
|---|---:|---|
| `NEXT_ITERATION_P0_20261003.md` | 23774 | `9f10d7162c9d2f38266f275828e312afc23a9841e6107eebe0272cdb07b578a5` |
| `NEXT_ITERATION_P0_CAPABILITIES_20261003.md` | 80019 | `1af2cdd6593058bfb5e46b8d1837e9e4ed895698bc0d49e83e05fec4207b9312` |
| `NEXT_ITERATION_P0_VALUES_20261003.json` | 7345 | `4bc8b00fcaf1ff4450c0869be877d1edaa65b879ebd7869545c2f6cb7f4fab04` |
| `tools/docs/export-next-iteration-p0.mts` | 27904 | `c315f97b38edc8f450ac5555b7e1f579902218ecca50f2c7098e8640855b838d` |

## 4. 保留限制

P0的“完成”仅指文档与设计对照可审阅。D、冷却、保护英雄分配/对象上限/脉冲/复生次数、追踪雷参数、表现尺度及后台期限仍为提案，不由状态文件自动批准。不宣称80点构筑困难/地狱15+已经达标。

本次没有重跑全量规则、浏览器、实体手机/手柄、自然性能或人工视觉验收；代码未变，未产生新HTML/ZIP/应用/资源发行。上一轮745规则、138死亡收尾、3载体收尾、30布局等证据仍为历史记录。完整M6/M7、人工画面、三款全息科技球源死亡片段及既有0.11663秒瞬时欠账继续OPEN。

既有未跟踪GLB、日志及本地离线产物保留；没有重复清理、改LFS分发范围或提交离线HTML/ZIP。云端环境没有创建/发布；Coze账户内上线仍需部署执行方，后台生产数据库/发布主体/联系渠道/备份期限仍待B0落实。

## 5. r2精英与英雄设计修订：本次实际执行

用户给出的21款人族精英样例及“英雄强于精英、符合身份”要求，成为设计修订依据。后续确认孤星只限制死神家族；毁灭者以最后直接纠正“是面积五倍啊”覆盖先前半径五倍答复。新稿覆盖30家族三型精英和18英雄本体/持续能力，作者补齐的机体/增长/曲线/冷却/参数仍待确认。

| 命令/核对 | 本次实际结果与适用范围 |
|---|---|
| `node --import tsx tools/docs/export-next-iteration-p0.mts` | 最终生成当前能力基线与r2专稿成功；World仅派生属性，单独选择雷神防空武器核算，不step/fire/hit/save或联网 |
| `node --import tsx tools/docs/export-next-iteration-p0.mts --check` | 最终生成一致性、90新精英ID/名称、21用户样例及明确数值、18新英雄、全部五级职责/耐久、提案状态和本地链接核对通过 |
| `npm run docs:check` | 实际通过，既有GAME_DATA_REFERENCE与未变运行数据一致 |
| `node tools/check-mvp-plan.mjs --write-board`，随后无参数只读检查 | 均通过：47任务、13需求、10旧决策ID，165天赋/90精英/18英雄/四个合法80点规划例；旧任务看板未产生内容差异，不是新战斗验收 |
| `git diff --name-only HEAD -- src test package.json package-lock.json tsconfig.json vite.config.ts deploy dist` | 无输出：已跟踪游戏/测试/依赖/发行文件没有修改 |
| `git diff --check -- AGENTS.md docs tools/docs` | 实际通过；仅有Git换行规范提示，无差异空白错误 |

沙箱首次tsx仍报`spawn EPERM`；只允许本地esbuild子进程执行文档工具。新辅助生成器初次有一个闭括号语法错误，修复后预算检查指出凯瑞甘、扎加拉、沃拉尊未满足提案门槛；补强英雄本体/控制及核验德哈卡等同职责预算后，最终所有等级检查通过。这些初始失败是文档生成/设计校核失败，不记成游戏缺陷或曾经通过。未重跑745条游戏规则、浏览器、离线存读、自然性能或人工视觉。

- 90稳定精英ID与当前原模型身份一一对应；21款用户样例、69款作者新设计，所有三族每家族恰三型。每款列循环、机体I/V、参数来源、对象/代价与表现；不同名光环/派生伤害/毒囊/吸收/医救边界单独说明。
- 18新英雄各列原作/平台定位、本体、持续能力、原P0主动提案及强于精英之处；职责映射合集覆盖全部90精英。五个等级各检查18个主职责预算＋18个基础总耐久预算，共180个**静态预算约束**，不是180条游戏测试。
- 精英火力比较用持续峰值与固定伤害上界，英雄用60秒理想平均被动＋主动完整预算/CD；支援/控制另用对应通量与控制期限/CD。未虚构实际有效命中、免伤量、治疗量或多目标实战收益；AOE及自然难度平衡仍待后续验证。
- 指挥官/女武神/母巢女王自身生命光环、孤星渐近增长已计入精英耐久上界。孤星吸收原子到账/原身份/实付/重试收据保留，猎手已死的付费在途单位仍交付。长炎索敌/开火范围与长度倍率同步；无武器医疗艇另用有效医救触发交战护盾。
- 沃拉尊新控制提案由r1的3—5秒/CD22改为4.5—6.5秒/CD18、半径5.5，Boss降速45—65%。其余D与14伤害英雄主动包保留r1提案；新机体/被动与旧英雄成长不叠乘。

### r2当前交付文件指纹

下表为本机最终UTF-8原始字节SHA-256；Git/其他环境换行规范化可能另计原字节，生成一致性检查统一LF。不是新游戏构建、包体或资源发行散列。

| 文件 | 字节数 | SHA-256 |
|---|---:|---|
| `NEXT_ITERATION_P0_20261003.md` | 26484 | `c2ecb7db2b81301bd1c0633b20f58d58552fdec99c394a05a860c791b20cebfc` |
| `ELITE_HERO_REDESIGN_20261003.md` | 89611 | `8c24cb003edd3687eb7288178818cb9962c18facc4f75e8b6356b571f9961c69` |
| `NEXT_ITERATION_P0_CAPABILITIES_20261003.md` | 79216 | `adefee3fdbcfc1be77b29f921d82cf46ea3ea9baf27fb37b7acc83df5de10eed` |
| `NEXT_ITERATION_P0_VALUES_20261003.json` | 102275 | `f2d4720f176baad034d71d10737990bd16516cc1f6dc361972abbb47057ba32a` |
| `tools/docs/export-next-iteration-p0.mts` | 29423 | `800729499601e19aafdded1e8f4841d54e7bd5da5cee74ba19d2d308d61f213d` |
| `tools/docs/export-elite-hero-redesign.mts` | 29019 | `b0241572c07e8f676aca9edee988948b2c4482575c9071cf8e8faf9857217985` |

r2完成仅表示文档可审阅。runtime仍不导入提案JSON，schema14/profile v5不变；M6/M7、人工画面、物理手机/手柄、三科技球原死亡片段与既有瞬时欠账均继续OPEN。应用/独立LFS资源的既有增量发行合同没有改变。
