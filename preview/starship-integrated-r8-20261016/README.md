# 舰装 UI 接入与布局修复预览

普通入口：`http://127.0.0.1:4430/`。使用实际 `src/main.ts`、正常敌人波次、空仓与 0 粉尘。

主菜单打开“旗舰配装”；点击预设名称旁的笔形按钮可命名，每族三个预设独立，支持 1–24 个字。保存／应用配装沿用该名称。

战场按 `I` 或点击小地图旁的背包按钮；关间点“背包”。关间沿用既有换装／分解规则，也可撤离结算。小地图功能按钮、原控制台贴图和窄屏大字号布局已经修复。

当前装备、预设名称和战局只在本页保留，刷新或关闭会重置；存档仍按原约定留到 MVP 收尾。

`diagnostic.html` 单独提供受控检查函数，不是普通入口；使用同一启动流程，不自动授予装备或关闭敌人。

在项目根目录启动：

```powershell
$env:SC2_UI_PREVIEW_DIR='preview/starship-integrated-r8-20261016'
$env:PORT='4430'
node tools/serve-starship-integration.mjs
```

先按项目流程恢复资源，再用同一 `SC2_UI_PREVIEW_DIR` 运行 `node tools/build-starship-integration.mjs` 即可构建。编译输入和输出哈希见 `build-inputs.json`；范围与验证见 `docs/project/STARSHIP_UI_INTEGRATION_20261016.md`。

分支 `feat/starship-ui-integration` 继承装备分支 `736c933`。未合入 main、替换 Current、推送或在线发布。
