# 项目目录与修改边界

核对于 2026-10-27。当前状态见 [完整交接](project/MVP_TO_1_0_HANDOFF_20261027.md)，操作命令见 [根 README](../README.md)。保留既有路径，不为统一模板搬动代码、资源和日期型工具。

~~~text
星际/
  AGENTS.md             已整理的按任务阅读目录与核心协作指令
  README.md             当前入口、运行和构建
  src/                  正式 TypeScript 游戏
    app/                启动、资源准备、会话、存档编排
    simulation/         固定步、规则、战斗、移动、生产、舰装及快照
    data/               当前参数、目录及原版表现路由
    render/             Three.js 画面、动画、特效与声音呈现
    ui/                 HUD、选择、配装与账户界面
    persistence/        档案编解码、存储与事务
    services/           统计/观察客户端
    assets/             运行时资源接入（含生成文件）
    diagnostics/        受控诊断支持
    platform/           既有平台适配
  test/                 常规自动回归
  tools/                构建、资源流水线、后台及定向复现
  assets/               清单、原始/转换资源；private 不可随意清理
  public/               静态入口资源；assets 为运行时恢复/生成目标
  deploy/               既有应用基线与 hash 资源；区别当前 V04 分发包
  sites/                Sites 衍生交付与压缩工具
    size-optimized-site/ 主仓库跟踪的完整站点/资源快照
    v04-private-test/   活跃独立站点 Git 仓库；不含于上项的历史
  preview/              原型源码、源图、受控展示及构建描述混合区
  docs/                 通用资料、生成参考和导航
    project/            当前交接、看板及日期记录
  reports/
    qa/                 长期简要结论与验证边界
    local/              正在进行的检查/交付和必需输入（Git 忽略）
  dist/                 当前本地 Web、命名离线版及交付包（Git 忽略）
  .cache/               提取工具/数据与临时文件，分类核对后清理
  .github/              现有 CI
  dev/                  既有开发辅助；用途见目录 README
~~~

## 应放在哪里

| 内容 | 位置与规则 |
| --- | --- |
| 新游戏功能 | src 的对应模块，测试在 test；不把正式逻辑复制到 preview |
| 参数或规则解释 | 对应设计文档，精确值用 GAME_DATA_REFERENCE 的生成流程 |
| 当前进度 | 当前交接/看板及对应日期报告；AGENTS/README 仅保留入口 |
| 专项复现工具 | tools 的相应类别；新历史批次注明适用版本和输入，避免再写一套通用框架 |
| 新原型 | preview 下明确命名目录，区分源码/唯一图稿与可重建输出 |
| 简要检查结论 | reports/qa；来源、实际结果、限制和复现工具路径足够即可 |
| 临时截图/视频/日志 | reports/local 对应任务；任务结束按保留规则清理 |
| 本地成品 | dist 命名输出；不覆盖仍要求保留的 Current，不将同包重复上传 Git |
| 生产账号/数据库/配置秘密 | 按运维流程保存在服务器，不能进入仓库、日志或交接提示词 |

## 必须区分的文件

- 根 package.json 的开发包版本、deploy/coze 旧基线版本、V04 的应用版本分别有用途；最新交付身份查 V04/V05 的内容哈希。
- Sites及“体积优化版”分支另有源码/资源身份，当前见[第13版发布记录](project/SITES_QUALITY_DEPLOY_20261028.md)。sites/v04-private-test有独立Git历史，sites/size-optimized-site为跟踪快照；delivery保存资源白名单/交付模式，lib/packed-asset-storage.mjs通过原BUCKET隔离前缀提供资源，原数据库和存档保持。不按目录名删除，不从GitHub推送推断云端更新。
- performance-board.json 是任务状态源；HTML/计划表为生成结果。其历史 baseline/scenes 文字不用于覆盖 tasks 的后续事实。
- src/assets/runtime.generated.ts 和 public/assets 是恢复/生成结果。原始来源可能在 assets/private、assets/generated、preview 的源图目录或 Git LFS，不以扩展名或未跟踪状态判定可删。
- preview 含真实源码和图稿；tools 中旧脚本是复现方法。整理采用目录说明和索引，保留其引用路径。
- docs/project 中日期文件是历史证据；旧导航已由本轮短入口替代，整理前全文可从 Git 恢复。
- reports/local 与 dist 的部分文件在历史中曾被跟踪；忽略规则不自动解除跟踪，也不能用一次批量提交处理它们。

## 清理和验证

遵循 [产物保留规则](project/ARTIFACT_RETENTION.md)。删除前核对完整绝对路径、目录链接、仍在运行的使用者、源文件/用户档案属性，以及重建方法。只清已确认可重建且不再使用的输出；不能按年龄或“缓存/预览”的名字批量删。

普通代码修改运行相关回归；资源修改核对来源和依赖闭包；目录路径迁移须修引用并验证入口。本轮根 AGENTS 已按共同讨论定稿，旧文完整归档，导航检查相对链接；游戏源码/测试/配置保持，资源统计修正只核对对应清单与载荷，不重复游戏全回归。
