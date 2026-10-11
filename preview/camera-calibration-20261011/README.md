# 镜头定标诊断与对照

正式实现范围和来源见 `docs/project/CAMERA_CALIBRATION_20261011.md`；本目录只是独立诊断入口，不进入正式页面。证据保存在 `reports/local/camera-calibration-20261011`。每次构建、运行必须使用新标签，已有报告不得覆盖。

`build.mjs` 生成带输入哈希的诊断构建。`baseline-*` 从冻结的431d304源代码构建，其他标签使用当前渲染器。正式网页和离线HTML另由 `tools/verify-camera-formal-inputs.mjs` 对完整生产入口重新编译比对；诊断构建不能代替正式输入验证。

`qa-camera.mjs` 的 matrix、identities、edges 和 lifecycle 分别覆盖五图／无尽取景、138身份、巨型／飞行主体边界和真实WebGL恢复。`tools/qa-camera-*.mts` 通过正式页面的原有导入、设置、输入、技能、导出和恢复流程验证功能。固定场景可以并发运行，但不用于性能结论。

`qa-recording.mjs <build> <label> realtime` 录制五图三族各20秒原生时间推进、方向移动与缩放；`qa-cost.mjs <build> <label>` 记录五秒暂停渲染成本。两者必须在其他浏览器队列结束后单独运行，恢复默认后台节流、关闭自动化焦点模拟，观察真实可见与焦点状态。CPU提交耗时不是GPU耗时，短片也不是稳定帧率或自然战役验收。

`comparison-sources.json` 指向每一组实际证据；`tools/verify-camera-calibration.mjs pairs` 核对完整World／Profile／RNG、原生时间、主体与视口。新缩放的左图始终是原版默认镜头，不伪造对应的原版缩放。托什施放时的视图目标独立验证，不要求不同取景拥有相同目标集合。

`build-gallery.mjs` 在配对、正式流程和录像通过后生成 `comparison-gallery.html`；`serve-review.mjs` 默认仅在回环地址4333提供文件。`qa-gallery.mjs` 验证选择器、全部身份和背景入口、正式截图、参考图以及全部15段录像，并保存实际解码帧。`review-sheets.py` 只为视觉检查整理已有图像；身份细节裁剪记录原生主体像素、裁剪矩形和显示缩放，不替代完整画面。

`optics.ts` 和 optics 旧实验保留其真实参数、源模型与失败情况。实验中的建筑形态不匹配主要参考，实验比例不进入正式模型。`qa-window-probe.mjs` 的旧输出亦保留；真实失焦不能冒充页面hidden或自动暂停。

本目录不修改世界规则、地图、原始资源或存档。不得将诊断主体数解释为军队上限，不得以自动检查或模型视觉检查代替人类、原版客户端、物理设备或整体性能验收。
