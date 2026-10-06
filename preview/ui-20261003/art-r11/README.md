# R11 关间卡片绘画交付

状态：129 个新绘画身份已接入完整静态 R11；代理已检查选用原图、30 家族的精英三卡和 9 位新增英雄，并完成横竖屏、数量、滚动及确认流程复查。用户的最终美术确认仍为 OPEN。

- 成品：`reports/local/ui-redesign-20261003/SC2-UI-Preview-r11.html`，含原有 19 个页面和衔接动效。
- 选用 46 张源图：29 张四列家族图版、17 张独立画。覆盖 30 普通兵种、90 精英、9 位新增英雄；另保留此前接受的 9 张英雄封面。
- 航母普通与三精英改为四张独立画，原三次图版均保留。其他校准与修订的旧图同样保留。
- 图像上方为独立环境、下方为透明主体。前端按显式区域取景并合成同光色背景；人数只改变平移和绘制顺序，同一布局中不会因人数增加缩小单体。
- `manifest-r11.json` 是当前选图及精确 PNG/WebP 哈希；`reviews-r11.json` 将代理实际检查绑定到这些哈希；`visual-review-notes-r11.json` 记录身份、细节和弃用原因。
- 实际源图尺寸为 1671/1672×940/941 和 1254×1254；请求过更大图版，但未获得 4K 输出。原始 PNG 保留，WebP 仅同尺寸编码。
- 42 张选用图保留实际执行提示词；4 张校准画以 `.provenance-recovered.json` 记录原输出和逐字节对应，实际提示词未恢复，不冒充可完整重放。
- `atlas-briefs-r11-canonical.json` 是后续制作描述，不替代历史 `.generation.json` 的实际提示词。
- 来源是静态 `cards-r9.json` 的 1152 个展示状态，不能把其数值解释成后续 P4-C 正式运行参数。本次未修改游戏源代码、存档或原始游戏资源。

目标和实际验证分别见 `docs/project/SC2_CARD_ART_REDO_TARGET_20261005.md`、`docs/project/SC2_CARD_ART_REDO_VALIDATION_20261005.md`。浏览器截图与测量记录在 `reports/local/ui-redesign-20261003/r11-evidence/`。

从项目根目录运行：

```text
node preview/ui-20261003/record-art-reviews-r11.mjs
node preview/ui-20261003/assemble-paintings-r11.mjs
node preview/ui-20261003/build-static-r11.mjs
node preview/ui-20261003/verify-art-r11.mjs
```

这些命令检查选图、当前人工检查记录、来源和静态打包；不代表人类美术、正式游戏、设备、长期性能或 M6/M7 验收。47 个身份仍保留分栏边缘像素诊断，具体原因与主体检查结果可查；没有把诊断改成全零。所有新制作仅使用文字及本轮新生成的图，未上传原有私有素材，未上传 Drive、推送或部署。
