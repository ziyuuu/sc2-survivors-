# 相机控制、统一血条与小队传送验证

生产入口仍为 `src/main.ts`；本目录仅编译真实生产模块、构造受控原生状态并保存可追溯证据。未向正式版本植入 QA API。基线为 `f106ac52269248cb0fab761a1283e1ad8e861b61`。

最终版本映射见 `reports/local/camera-control-20261011/comparison-sources.json`，每份结果附运行器和构建输入 SHA。早期失败及候选目录保留，不覆盖或重命名为最终版本。正式 Web 和实际独立 HTML 由 `tools/qa-camera-control-*.mts` 另测；生产输入与交付 JavaScript/CSS 由 `tools/verify-camera-control-inputs.mjs` 重新编译并逐字节核对。

- `build.mjs`：冻结基线或当前诊断构建。
- `qa-visual.mjs`：五图/无尽、三族、六种视口、九档角度、138身份、巨型边缘和生命周期。
- `qa-behaviors.mjs`：按需血条、容量、原生传送准备/取消/完成/恢复；recording 模式另录五段原生墙钟视频。
- `qa-formal-queue.mjs`：顺序执行正式浏览器检查，已通过的同构建报告可复用，失败须用新标签。
- `review-sheets.py`：从原截图生成有索引的缩略图/身份裁剪。原始截图不变。
- `build-gallery.mjs`、`qa-gallery.mjs`、`serve-review.mjs`：构建对比图库、逐项验证链接/身份/正式截图、完整播放全部视频并保存解码帧、本地提供图库。
- `tools/verify-camera-control.mjs`：相同原生状态配对、资源/源码/受保护文件、应用包不变项检查。

从仓库根目录执行，例如 `node --import tsx preview/camera-control-20261011/build-gallery.mjs`，以及 `node preview/camera-control-20261011/serve-review.mjs 4353`。录像只在其他自动化浏览器任务完成后执行，使用可见聚焦窗口及默认后台节流，不构成自然性能或稳定 FPS 验收。图库、结果和命名交付的完整索引见项目验证文档。
