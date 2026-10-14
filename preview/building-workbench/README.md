# MVP 1 建筑与生产工作区

**当前独立入口R7与主游戏共用正式规则、UI及原生生产调度器。** 主游戏接入结果见[验证记录](../../docs/project/MVP1_BUILDING_INTEGRATION_VALIDATION_20261013.md)。独立入口继续使用隔离World和钱包，不读取玩家档案。已按用户确认采用孵化场15座、地面150／100、天空100／150、折跃水晶300／0一对。详见[模块交接](../../docs/project/MVP1_BUILDING_CONNECTION_20261013.md)和[数值定案](../../docs/project/MVP1_BUILDING_RULES_DECISIONS_20261013.md)。当前预览`http://127.0.0.1:4387/?review=main-shared-r7&scene=developed`；顶部“验证生产”是隔离接口验证，“补充资源”只操作隔离钱包。补给页面为流程预览，其购买和刷新禁用。

当前规则测试：`node --import tsx --test preview/building-workbench/connection/connection.test.ts`。当前浏览器检查：设置新的`MVP1_QA_REVISION`后运行`node preview/building-workbench/qa-connection.mjs`。旧QA脚本用于其原R17样例，不代表当前真实模块验证。

## R17 UI评审历史（保留）

以下说明对应保留的`dist/mvp1-intermission-design-20261013/index-r17.html`，其中“费用待定／仅样例／不扣款”不是当前独立模块的状态。

当前阶段为三族关间UI设计评审，依据 [设计说明](../../docs/project/MVP1_INTERMISSION_DESIGN_20261013.md)。主页面不再显示路线小字；缺少前置时显示所需建筑或进化的大图标卡，可点击卡内按钮切换对应方向。从“设施调整 → 构建树”查看完整路线。布置、科技、构建树始终保留在同一窗口，科技与攻防研究在两个视图中使用同一套图标卡。可以点选发展、布置和补给，返回前线后点击“下一关 · 进入整备”连续评审至第18关。设施、解锁和已应用布置在原型内跨关保留，刷新计数按新窗口重置。外部控制栏切换样例或重置会重新开始。

这是从固定样例开始的UI原型，后续选择只更新评审内存，不执行真实扣款、生产、保存或战斗，不访问玩家正式档案。`review-flow.ts` 仅用于UI状态推进，不能据此宣称收尾计划的建筑真实逻辑独立包已完成或复用它来代替正式业务模块。正式规则仍须放在 `src/`，由主游戏与独立包共同导入。

刷新价格只显示现有水晶图标＋数字，免费为0，付费显示实际样例费用。主页面与整备菜单已合并重复的“武器与防护研究”入口，统一进入“设施调整 → 科技”；布置／科技／构建树三个标签继续保留。

在仓库根目录运行：

```powershell
node --import tsx preview/building-workbench/build-design.mts
node preview/building-workbench/serve-design.mjs
```

访问 `http://127.0.0.1:4387/`。单文件成品为 `dist/mvp1-intermission-design-20261013/index.html`，已有美术内置，无需额外网络请求。查询参数 `race=zerg&scene=developed` 可进入虫族双方向布置样例。

局部类型检查：`node node_modules/typescript/bin/tsc -p preview/building-workbench/tsconfig.design.json`。UI检查需已安装Chrome及上述本地服务：设置 `MVP1_QA_REVISION` 为新的证据子目录名后运行 `node preview/building-workbench/qa-design.mjs`；科技与标签页专项为 `node preview/building-workbench/qa-technology-tabs.mjs`，前置图标与方向入口专项为 `node preview/building-workbench/qa-prerequisite-icons.mjs`。不要用已有轮次覆盖旧记录。它不执行游戏全套测试。

虫族逐座选择最多两种并轮流生产。三个标签页切换保留同一份布置草稿，内容滚动时标签栏仍可见；标签上可用左右键、Home、End切换。弹窗“应用布置”只写原型内存；“取消”、关闭或Escape关闭整个窗口并丢弃未应用选择。科技与构建树只读，研究选择仍在原发展卡入口进行。神族水晶、虫族方向进化可用明确标注的预览操作体验跨关过程，不给待定项目编造报价；水晶具体输出配置仍待确认。外部状态栏说明样例性质，正式游戏不包含该控制栏。

保留当前背景、立绘、购买卡及原关间样式。按用户截图上方的原兵种小图标，构建树、科技、科技前置、攻防和缺少前置提示的图标统一为28像素，横竖屏一致；移除大图标外框，卡片更紧凑。科技／构建树名称14像素，状态及前置文字12像素，分区标题16像素；名称和状态放到同一行，极窄的攻防节点允许自然换行。布置不再显示两种轮流生产说明、箭头摘要、付费订单与水晶用途脚注。设施标题副文、基础建筑开局说明、攻防“基础研究／阶段6／阶段12”等常驻小字保持移除。研究条件仍执行现有样例判断，节点提示保留条件。没有制作折跃水晶新素材，现有设施图集仅作设计阶段用途示意。实际检查和截图记录在 `reports/local/mvp1-intermission-design-20261013/`，交付状态见 [本轮验证](../../docs/project/MVP1_INTERMISSION_DESIGN_VALIDATION_20261013.md)。
