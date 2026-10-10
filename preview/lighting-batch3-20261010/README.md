# 第三批视觉验证入口

这是正式 `BattleRenderer` 的原生 World 诊断入口。生产实现位于 `src/render` 和 `src/ui/hud/minimap.ts`；这里不复制一套替代渲染器，也不参与发行包运行。

正式基线是 `ab1ce01b73bc891a72e43d25b135d93425a70989`。开始修改前，`tools/lighting-batch3-baseline.mjs` 将生产源码、资源清单和保护哈希保存到 `reports/local/lighting-batch3-20261010`。以 `baseline` 开头的构建标签从该冻结源码解析导入；其他标签读取当前源码。每次构建保存输入哈希、JS 哈希、源摘要、资源清单及实际诊断源码，不覆盖已有构建。

## 重放

以下命令使用新的示例标签，避免改写本次证据：

```powershell
node preview/lighting-batch3-20261010/build.mjs candidate-review
node preview/lighting-batch3-20261010/run-matrix.mjs candidate-review review --reuse-context maps portraits actions mobile forms actors enemies invariants fleet core color heroes
node preview/lighting-batch3-20261010/qa-lighting.mjs candidate-review review-lighting lighting
node preview/lighting-batch3-20261010/qa-sequence.mjs candidate-review review-sequence
```

每个场景从独立原生夹具恢复，再按原生 tick 推进。`--reuse-context` 在同一套件内保留浏览器和渲染缓存，每组仍恢复独立的 World；该选项也验证缓存地图和实例状态重置。近景从起始原生 tick 300 再统一推进 300 步，实际采样于 tick 600／10 秒，让源出生动画完成。14 组含 Birth 动作的场景另补相同 tick 600 的五图与移动视口证据。角色身份、World／Profile／RNG 指纹、tick、主体属性、画面尺寸和深度效果可用状态均成对核对。

成本与录像应等待其他 GPU 验证结束，单独执行：

```powershell
node preview/lighting-batch3-20261010/qa.mjs --build candidate-review --suite cost --label review-cost
node preview/lighting-batch3-20261010/qa-lighting.mjs candidate-review review-realtime realtime
```

成本窗口为五秒暂停场景；录像使用三族各约 20 秒墙钟时间的可见聚焦浏览器，MediaRecorder 直接录制实际画布。固定步长模拟报告真实 tick、积压和丢弃时间。顺序 PNG 每 6 tick 一帧，只用于前后动作对照。上述证据不关闭自然战役、稳定 FPS、物理设备或原版客户端画面比对门槛。

成本与录像明确移除自动化默认添加的后台计时／渲染不降速参数，保留浏览器原有节流规则；每次记录实际可见性和聚焦状态。其他功能检查的等待上限不能当成性能证据。

## 本次证据标签

- `before-stage-maps-r1`、`stage-markers-maps-r1`、`stage-light-maps-r1`、`stage-shadow-maps-r2`、`stage-contact-maps-r1`：按实际构建保存的单项增量步骤。
- `before-r5-*`：冻结基线 `baseline-r4` 的最终配对矩阵。
- `after-r6-*`：修复模板克隆重复接触注入后的生产源码 `candidate-r4` 的最终配对矩阵，包含 84 条光照专项记录。
- `after-r4-*`、`after-r3-lighting`：前一候选 `candidate-r3` 的实际证据。其移动端在 102 条记录后发生空日志着色器准备失败，原始结果保留，原因不冒认。
- `stage-final-maps-r1`：最终正式组合与前五个阶段相同夹具的 15 张配对；`before-r5-edge`／`after-r6-edge`：三个主体完整移出左右视口的六组配对。
- `web-final-r1`、`web-final-r2`：保留的正式 Web 超时及原生救援奖励遮挡操作夹具失败。
- `web-final-r3`：前一候选通过的 Web 操作证据；`offline-final-r1` 随后在最终渲染错误断言发现重复 GLSL 声明，不能因 Web 通过而视为整批通过。
- `targeted-r6-clone-reproduction.log`／`targeted-r7-clone-fix.log`：重现三份声明并验证修复；`candidate-r4-source-delta.json` 证明只有一个构建输入改变，单次绑定的完整着色器仍相同。
- `web-final-r4`、`offline-final-r2`、`controls-r4`：新候选的正式 Web、实际 Final 离线 HTML 和四尺寸原生输入／无尽验证。实际通过状态以报告为准。
- `controls-r1`、`after-r4-heroes` 的 `not-run` 记录表示上游失败后没有执行，供旧等待队列正常结束，不是一次已运行的验证。

阶段阴影首轮自遮条纹、最初酸液夹具生命值设置问题、早期恢复档案版本断言失败、已停止的旧逐组浏览器矩阵及首版应用缺少两份历史 UI 文档的记录均保留，不能重标为最终结果。文件是否通过及数量以各自报告为准；最终汇总见 `docs/project/LIGHTING_BATCH3_VALIDATION_20261010.md`。

`controls-r2`／`controls-r3` 保留地图触点超时和复现记录：浏览器将靠近折叠按钮的触屏事件交给 `map-toggle`，即使 DOM 命中查询返回画布。最终夹具使用地图内部触点，并检查原生按下／抬起实际目标，生产输入未改。`visual-index-final` 的旧标题把推进 300 步写成 300 ticks；`visual-index-final-ticks` 使用真实记录的绝对 tick 600／10 秒，原始截图未变。

## 浏览本地交付

```powershell
node preview/lighting-batch3-20261010/serve-review.mjs 4273
node preview/lighting-batch3-20261010/serve-delivery.mjs 4296
```

前一个命令提供 `http://127.0.0.1:4273/comparison-gallery.html`，页面可进入分步对照、连续原生帧及三族录像；WebM 支持原生字节范围请求。后一个命令须在最终包与本地镜像同步后使用，它核验交付清单，提供 `http://127.0.0.1:4296`，明确禁用后端并只绑定本机地址。它不会操作已有预览进程或实际用户数据库。

`review-sheets.py` 生成 20 段原生序列的首／中／末帧索引；`review-delivery-sheets.py` 生成录像、画外投影和分步场景索引。索引仅缩小完整原截图，不裁切、修图或插帧，原 PNG／WebM 和各自记录仍是验收依据。
