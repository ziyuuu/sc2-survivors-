# 虫族六单位实机试玩

双击 `启动试玩.cmd`，或在项目根目录执行：

```powershell
npm run assets:restore
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15302 --strictPort
```

打开 [虫族六单位试玩](http://127.0.0.1:15302/preview/zerg-six-20261120/)。顶部可切换六个独立阵型，点「重开」从当前阵型起点开始。「观察」显示当前场景的战斗状态。键盘 WASD／方向键、鼠标点地和触屏摇杆沿用真实战斗输入。

场景仅配置初始阵型、生命与现有敌人。运行中的技能、寻路、碰撞、攻击、掉落、临时体与到期由游戏 World 结算；试玩使用内存账户。

复查：

```powershell
node --import tsx --test test/zerg-six-demo.test.ts
node --import tsx tools/qa-zerg-six-demo.mts
```

原始资源锁定在 `tools/sc2-casc-lock.json`。模型、动作和特效见 `tools/zerg-six-models.json`，声音见 `tools/zerg-six-audio.json`，源路径、输入哈希及运行资源清单见 `deploy/runtime/zerg-six-assets.json`。

阶段状态与实际证据见[试玩交接](../../reports/qa/zerg-six-demo-20261120.md)。
