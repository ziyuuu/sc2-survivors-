# 五图完整环境巡游

此入口查看正式五图的完整环境分布，使用主游戏的地图、材质、贴地和岸线实现及原生相机投影。它没有 World 战斗循环，不能代替自然游玩、生产交付或性能验收。

每图包含出生区、早期／中段／后段组合和四个外围观察点，共40个点。可拖动和缩放；“查看旧版”切换到铺图前实际源码构建的对照。

本地运行：

```powershell
npm run assets:restore
node tools/serve-environment-full-map.mjs
```

打开 `http://127.0.0.1:4372`。已提交的 `sample.js` 和 `before.js` 是本批可核验快照。重建对照需保留 `reports/local/mvp5-full-map-20261014/baseline/source`；缺少历史快照时构建器会停止，不能以当前源码冒充旧版。

命名离线文件为 `dist/SC2-Survivors-Environment-Full-Maps-20261014.html`，双击即可使用；它是自包含巡游页。正式可玩Web在 `dist/MVP5-Full-Map-Main-20261014-R3/`，运行 `node tools/serve-environment-main.mjs`后打开 `http://127.0.0.1:4373`，使用`deploy/runtime`资源且禁用后台连接。完整主游戏离线包与更新流程属于计划后续步骤。

实现、验证和边界见 [本批记录](../../docs/project/MVP5_FULL_MAP_20261014.md)。
