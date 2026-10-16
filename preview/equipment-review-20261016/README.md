# 装备与紫色虫卵待确认预览

本地入口：http://127.0.0.1:4413/equipment-review-20261016/

从主菜单正常开始一局，展开右上角“装备表现与性能预览”，点击“紫色虫卵外观”。该按钮只布置隔离诊断场景并冻结观察；正常游戏里的救援虫卵也使用同一紫色表现。工人救援规则不变，没有新增敌军孵化。

本页使用独立分支的共享装备规则与性能实现，不挂载另一轮独立舰装 UI。只使用内存账户，不读写正式战局存档。性能 30／60 FPS 目标尚未完成。

在分支上重新构建（PowerShell）：

```powershell
npm run assets:restore
$env:SC2_PREVIEW_DIR='preview/equipment-review-20261016'
node tools/build-equipment-effects-preview.mjs
$env:PORT='4413'
node tools/serve-performance-preview.mjs
```

已有 4413 服务时无需再次启动。构建输出 `main.js`／`main.css` 在本地生成；具体输入、分支范围和验证见 [本批记录](../../docs/project/EQUIPMENT_REVIEW_BRANCH_20261016.md)。
