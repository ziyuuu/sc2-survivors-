# 建筑独立对接模块

此目录保留独立宿主和薄导出；主游戏已经导入同一份`src/simulation/building/`规则、共享UI和原生生产调度器，独立宿主继续隔离。当前接入见[主游戏验证](../../../docs/project/MVP1_BUILDING_INTEGRATION_VALIDATION_20261013.md)。数值见[定案](../../../docs/project/MVP1_BUILDING_RULES_DECISIONS_20261013.md)，接口、验证和下一步见[模块交接](../../../docs/project/MVP1_BUILDING_CONNECTION_20261013.md)。

公开出口为`index.ts`。`rules.ts`／`view.ts`薄导出正式资格、报价、命令与呈现模型，`native-host.ts`在隔离World中复用原生产报价、支付账本、训练和交付。宿主须将报价当作带窗口／版本的请求凭据，将模块当前状态当作唯一业务来源；不要将视图里的可点击或价格当作交易校验。

```powershell
node --import tsx --test preview/building-workbench/connection/connection.test.ts
node node_modules/typescript/bin/tsc -p preview/building-workbench/tsconfig.design.json
```

`NativeBuildingSandbox`自行创建内存World，不接受正式World。`tick`只驱动原生产，`deliverReady`属于测试夹具的运输到达，不是自然战斗验收。正式接入前不能同时调用原自动生产和此适配器；事件、舰装、家族替换UI和存档仍需在获准挂载时衔接。
