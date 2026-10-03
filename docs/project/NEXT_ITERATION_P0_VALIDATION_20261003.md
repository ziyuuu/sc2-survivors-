# P0设计交付核对 · 2026-10-03

范围：仅[统一设计](NEXT_ITERATION_P0_20261003.md)、[能力对照](NEXT_ITERATION_P0_CAPABILITIES_20261003.md)、[提案JSON](NEXT_ITERATION_P0_VALUES_20261003.json)、文档生成器和计划入口/状态。运行基线提交`5980dc83d9e78605181805d35106658b3b126979`；未实施P1—P6，未改游戏数值或schema，没有新构建、部署、素材处理、数据采集或清理。

## 1. 实际执行与结果

| 命令/核对 | 结果与适用范围 |
|---|---|
| `node --import tsx tools/docs/export-next-iteration-p0.mts` | 最终生成成功；独立内存World只做属性派生，不step/fire/hit/save、不联网 |
| `node --import tsx tools/docs/export-next-iteration-p0.mts --check` | 最终一致性、覆盖、提案算术/任务状态、本稿与主稿/对照表的本地链接核对通过；不是游戏测试 |
| `npm run docs:check` | 实际通过：`Game reference matches runtime data.`；现有游戏数据参考与源码一致 |
| `git diff --name-only HEAD -- src test package.json package-lock.json tsconfig.json vite.config.ts deploy dist` | 无输出：这些已跟踪运行/测试/依赖/发行文件未改 |
| `JSON.parse(docs/project/status.json)` | 实际读取成功；新增P0状态，旧M6等进度保留 |
| `git diff --check -- AGENTS.md docs tools/docs` | 最终通过：无新增差异空白错误；新P0稿/对照/本稿另由生成器校核行尾空白 |

初次在沙箱运行tsx报`spawn EPERM`；允许本地esbuild子进程后，文档生成器第一次报告新写的`expedition-cards`导入路径不存在。改为真实`simulation/progression/expedition-drafts`后实际生成和核对成功。两次初始失败不记为通过，也不归为游戏故障。

## 2. 覆盖和算术核对

- 普通家族30项：每族10；逐项零天赋/零卡/零科技的I/III/V/VII属性，VII仅作已批准天赋解锁后的公式对照。坦克架起、恶蝠、维京突击另列模式。
- 精英90项：每普通家族恰三型；逐项I/V相对同家族普通V，列当前HP/盾/护甲/主武器及周期/医修、独有效果、拟保留值及本族反馈。条件/群伤/法术不冒充无条件DPS。
- 英雄18项：每族六；14伤害、三支援、一控制，德哈卡兼储备。当前I/V普攻及耐久、当前/新I/III/V技能、每包/每脉冲、邻敌上限与冷却、支援I—V对象/次数/期限均列出。
- 趣味卡24种族身份：每族四共用规则加四独有；共用表标签不新增存档键。另列两组×五品质全队牌、恢复/能量/生产卡及现有科技入口。
- D逐级值与1/1.4/1.8/2.2/2.6关系一致；诺娃主包恒0.75D；大和I/V预算≥9000/23520；伤害AOE完整预算达到对应半血，扎加拉按至少两枚。橙火力三张理论DPS因子1.8352校核。**这些都是算术，不是实际Boss命中/击杀。**
- 对照表保留来源文本UTF-8/LF规范化SHA-256，`--check`重新按当前源码派生并规范化换行后逐字比对，修改源码后须重新生成、审阅。Windows/云端的CRLF/LF差异不造成假变更；下节交付文件指纹仍为本机原始字节。生成内容不依赖墙钟或随机runId，未保存用户战局。

## 3. 交付文件指纹

最终字节数和SHA-256见下表；均为本地UTF-8文件，不是新游戏构建或发行资源散列。

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
