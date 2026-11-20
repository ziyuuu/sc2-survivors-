# 80秒玩法混剪

DEMO-01，2026-11-03。用户要求加快切镜、不逐段固定依次展示三族、可三分屏，压缩至1分20秒；字幕保留原文，恢复此前右上角艺术字。此修订替代约2分48秒版本的时长、重复三族编排和底部白字字幕。

`demo80-edit.json` 为本次准确时间线：2400帧、80秒、40镜头、4处三分屏；3秒既有封面计入总时长。12段顺序与12条文字保留。原速剪辑，明确跳切等待；购买和对应战斗、人族同件模块的拾取、局外限制、撤离与装备仍对应原录制事件。首领奖励将原生卡面放大至右下侧，避开右上字幕。14组原录制参与本片，不新增录像，也不修改游戏。

艺术字沿用 `v2-graphics.py` / `v5-graphics.py` 的金橙色金属渐变、斜体裂纹、撞击与火花，覆盖坐标为 `(990,26)`，每章只入场一次，跨镜头连续。长句换行但不改字。无底部字幕栏，原生界面保留；矿气和局外限制局部放大均取自原画面。

## 本次复现

使用 `reports/local/gameplay-demo-20261103/clips` 的原15组拍摄文件及元数据。原始时间须经 `captureRanges` 映射，不能把压紧后的文件时刻当作原模拟时刻。缺输入时按 [原录制步骤](DEMO_README.md) 重建；封面和声音输入在 `dist/gameplay-demo-design-20261103`。

```powershell
python -X utf8 tools/promo-video/demo80-plan.py
python -X utf8 tools/promo-video/demo80-graphics.py
python -X utf8 tools/promo-video/demo80-mix.py
python -X utf8 tools/promo-video/demo80-compose.py
python -X utf8 tools/promo-video/demo80-check.py
```

合成逐段核对实际帧数，显式统一 BT.709、有限范围 YUV420P、30FPS，补足片尾解码边界后按准确帧数截取；避免PNG封面和原录制色彩格式不同导致转码重置滤镜。片段编码后直接拼接，不对动作加速。声音按所选原始时刻重排；三分屏只取主画面音轨，避免三套音效叠加。

核对18848端口空闲后启动本机预览服务：

```powershell
$env:PROMO_ROOT='reports/local/gameplay-demo-20261103'
$env:PROMO_OUTPUT='dist/gameplay-demo-80s-20261103'
$env:PROMO_PORT='18848'
node tools/promo-video/v4-serve.mjs
```

在另一终端运行 `node tools/promo-video/demo80-check-player.mjs`，生成章节播放器并检查两份视频封面、元数据及24次章节播放；完成后关闭服务。逐镜查看检查脚本生成的40张抽帧，并检查关键帧内的字幕、三分屏主体、卡牌价格和模块状态。最后运行 `python -X utf8 tools/promo-video/demo80-provenance.py` 汇总输入与输出标识。

## 产物与范围

当前成片在 `dist/gameplay-demo-80s-20261103`；过程文件在 `reports/local/gameplay-demo-80s-20261103`。用户审片期间保留当前成片和录制必需输入，完成后清理可重建的艺术字动画、分段视频、混音中间文件和检查截图。简要结果见 `reports/qa/gameplay-demo-80s-20261103.json`。

沿用已记录的正式模拟构建与内存账户拍摄；阵容、事件与合法购买样例预设，无尽入口由有限辅助模拟准备，不宣称自然连续通关。后期与浏览器视频播放验证不代替物理手机或用户审片。本任务无产品源码改动、真实玩家存档写入、提交、推送、上传或发布。
