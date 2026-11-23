# 性能优化与虫群增殖 · 双分支同步提交

2026-11-23。用户要求补齐此前遗漏的分支同步、压缩入口更新与提交。代码已分别提交到本地 `main` 的 **`624b2f73`** 和 `体积优化版` 的 **`93911fbf`**；起点为 `15fdf288`／`e14662e1`。本轮处理已完成的性能优化和虫群增殖第一批。基因进化第二分支仍为独立设计讨论，其他网站、宣传素材和历史清理改动不混入提交。

## 同步范围

- HUD 尺寸缓存与音画事件共用索引；保留[性能复核](global-performance-20261120.md)的局部收益及整场帧耗边界。
- 虫群增殖 45 张卡、129 个档位、schema 26→27 迁移，以及已确认的 G08／B09／N07 三卡替换、逐卡试玩与说明。
- 孢子刷新与传播、临时兵终局、复活竞争、正式来源和双英雄共享收益／光环等八类修复，详见[主线复核](zerg-swarm-main-20261123.md)。
- 初始同步 83 个明确文件，其中 52 份生产源码；main 代码提交含 83 个文件，体积优化代码提交含 87 个文件，额外四项是实际压缩入口。两分支 `src` Git tree 均为 `91724a9c15a6751a4c13a06022900daa34e0c73b`，661 份游戏源码一致。保留体积优化版独有的压缩资源测试和交付结构。
- 正式包检查工具现在通过 `qa-release-server.mjs` 启动原画质或压缩入口，压缩流程额外断言页面由声明的 Service Worker 控制。

## 验证

| 检查 | 结果 |
| --- | --- |
| main 回归 | 沿用本日已完成的 3487／3487 全回归；本轮生产源码未改，661 份源码原始字节摘要仍为 `04fcc62fda63a17b55b02ba35f4bdc96d279ee90e0b0bf8e1982af26a8c6d82b` |
| 体积优化版回归 | 同步后独立完整运行：3487 通过，失败、取消、跳过均为 0；在允许 localhost 的环境执行 |
| 两分支类型、数据文档与接口 | 均通过；静态接口检查的 `gameplayImplemented:false` 仅描述该工具的静态检查范围 |
| 原画质重建 | 构建 `15a960298d58b3fe0abce44fb26783aef747101d591eb5328aa46604581cb5e6`，schema 27；4161 项资源、4036 个文件、1,604,911,623 字节校验通过 |
| 压缩资源与代码 | 同一应用标识；4161 项资源、5560 个唯一载荷及 869 个 GLB 的尺寸／SHA 与入口／Worker 校验通过 |
| 压缩入口玩家流程 | 实际购买 W02 锁主、领取 N05、保存并导出，再载入进入第 4 关，产生 4 只临时跳虫、待投批次 0；页面／资源及运行报告错误均为 0 |

压缩入口已更新到 `D:/星际/sites/size-optimized-site/public`，使用 `assets/sc2-entry.b2f756fc0c1ab99e.js.gz`；211 处模型身份引用按已验证压缩模型适配。原画质资源标识仍为 `ca1b2c00da27f8b7604fed04324589caf676b57b94eab16de13a5a937dcc73f7`，压缩资源标识仍为 `db9aca87dd4cf27c63de48da10968d332ee4083dd1c3a9aff611ead8e496123b`。本批没有新增、删除或重新压缩资源；443 项二进制资源包交付清单保持。构建只有已有的大 bundle 提示。

浏览器实际由 `sites-sw.13152d072799173ce822.js` 控制。1280×800、860×415、415×860 均显示三个免费节点，横向溢出为 0；桌面节点页和第 4 关战场截图已目视复核。该流程沿用关闭随机敌群的有限夹具，不代表自然整场战役或最终平衡通过。提交前只去掉性能测试文件的末尾空行；生产源码和测试断言未变。压缩启动器保留完整性校验使用的原始 CRLF，按 `core.whitespace=cr-at-eol` 检查通过。

## 复现

分别在两个工作区执行 `npm run typecheck`、`npm run docs:check`、`node tools/qa-zerg-swarm-interfaces.mjs`。体积优化分支完整回归为 `npm test`，需要允许本机测试服务连接。

在 main 工作区设置 `SC2_WEB_OUTPUT=dist/swarm-dual-20261123/web` 后执行 `npm run build:web`。在 `D:/星际` 执行：

```powershell
node tools/update-compressed-game.mjs sites/size-optimized-site/public 'C:/Users/zyuu/.codex/worktrees/v14-main-integration/星际/dist/swarm-dual-20261123/web'
node tools/qa-dual-branch-resources.mjs 'C:/Users/zyuu/.codex/worktrees/v14-main-integration/星际/dist/swarm-dual-20261123/web' sites/size-optimized-site/public
$env:SC2_ZSW_WEB = 'sites/size-optimized-site/public'
$env:SC2_ZSW_SCREEN = 'D:/星际/reports/local/swarm-dual-20261123/packed-shop.png'
node --import tsx tools/qa-zerg-swarm-web.mts
```

## 收尾与边界

本轮临时原画质构建、资源清单、截图、详细日志、测试档与缓存已按规则删除；保留本结论、复现代码、Git 记录和实际使用的压缩入口及运行资源。两个分支的交接与看板同步记录本次结果；main 中独立的基因进化设计改动仍留在工作区，未混入本批提交。

没有推送、部署或更新线上站点；本地压缩入口更新不等于线上已更新。自然长局平衡、物理设备帧率及既有 V05 状态不因本次同步改变。
