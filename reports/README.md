# 验证材料导航

更新：2026-10-13。这里保存机器报告与本地证据。范围和解释优先读对应 `docs/project/*VALIDATION*.md`；报告成功不自动证明人工、自然玩法、实体设备或完整性能通过。

| 位置 | 内容与使用方式 |
| --- | --- |
| [qa/performance-optimization-20261016.json](qa/performance-optimization-20261016.json) | 绿色高柱修复、固定画质前后对照、单独自适应与普通前三关验证；完整性能／人类体验未验收 |
| [qa/starship-display-settings-20261016.json](qa/starship-display-settings-20261016.json) | R20 统一显示设置，23 项舰装回归／10 项 Chrome 检查；真实 World 接口边界保持 |
| [qa/starship-ui-polish-r19-20261016.json](qa/starship-ui-polish-r19-20261016.json) | 舰装 R19 旧版布局复用、页内操作、动画与直接溢出分解；28 项浏览器检查，原始记录在对应 local 目录 |
| `qa/` | 既有可提交 QA 摘要，按文件日期和构建查看 |
| `balance/` | 历史数值分析与实验结果，不替代当前版本平衡验收 |
| [STATUS.json](STATUS.json) | V26 历史运行快照，不是最新八包进度 |
| `local/combat-effects-20261012/` | 当前战斗特效批次原始证据；R3、本地同步、Git 和 CI 分别记录 |
| `local/project-organization-20261013/` | 本次文档／目录整理的前后检查、链接检查与逐文件移动清单 |
| `local/legacy-logs-20261013/` | 本次归档的 82 份旧散落日志，字节保留；其中包含原根目录日志 |
| `local/disk-cleanup-20261013/`、`local/retention-20261013/` | 此前已经执行的磁盘与旧批次保留清理账本；不因本次整理重建旧材料 |
| 其余 `local/` 目录 | 按各自日期和保留清单查阅；目录存在不表示原整批材料仍全部在本机 |

顶层仍有 17 份被历史文档引用的日志，保留原址，避免破坏可追溯引用。其余旧日志已按引用扫描结果归档；查旧位置请使用 `local/project-organization-20261013/moves.json`，逐条保存原路径、新路径、大小与 SHA-256。

新工作统一写入 `local/<主题>-<日期>/`。不要向 reports 顶层继续散写命令日志，不在公开摘要附凭据、私有账户内容或数据库。`local/` 受现有 `.gitignore` 保护；本次没有改变忽略规则。

当前版本及真实限制见 [战斗特效 R3 验证](../docs/project/COMBAT_EFFECTS_VALIDATION_20261012.md)。下一步见 [MVP 收尾计划](../docs/project/MVP_COMPLETION_CONTRACT_20261013.md)，本次整理见 [记录](../docs/project/DOCUMENT_MANAGEMENT_20261013.md)。
