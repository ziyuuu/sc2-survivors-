# 玩法演示视频制作

> 当前版本改为80秒、右上角艺术字及三分屏混剪，见 [80秒制作说明](DEMO80_README.md)。下文保留原始录制与长版剪辑的复现方法。

DEMO-01，2026-11-03。依据用户确认的12段顺序与原文字幕，三族交替；无旁白，约两分钟，按操作阅读需要伸缩。分镜见 `docs/project/GAMEPLAY_DEMO_STORYBOARD_20261103.md`。

`demo-entry.ts` 使用正式模拟、界面、渲染和内存账户。场景预设阵容、位置、事件与当时合法的卡牌样例，录制战斗不改生命、伤害或生产收费倍率。经济与奖励来自实际事务。`demo-fixtures.mts` 准备合法掉落种子，以及通过有限辅助模拟生成的真实通关状态；后者仅用于展示通关后的无尽入口，不代表自然通关。

本次剪辑为167.7秒、1920×1080、30FPS，42个镜头。片头包含3秒玩法详解封面，另附封面图片供使用。`demo-edit-plan.py` 写入原始时间区间，`demo-record.mjs` 仍推进全部模拟等待，只记录剪辑所需的区间。录制元数据的 `captureRanges` 用于把原始时刻映射到视频时刻；不得把跳过生产等待误剪为立即免费获得援兵。

## 复现

先核对共享构建、端口与其他重型浏览器工作，GPU录制串行。构建只读取 `dist/web` 的清单和资源，不覆盖该目录。

```powershell
node --import tsx tools/promo-video/demo-fixtures.mts
python -X utf8 tools/promo-video/demo-edit-plan.py
$env:PROMO_ROOT='reports/local/gameplay-demo-20261103'
$env:PROMO_ENTRY='tools/promo-video/demo-entry.ts'
$env:PROMO_OUTPUT='dist/gameplay-demo-20261103'
$env:PROMO_PORT='18848'
node tools/promo-video/v4-build.mjs
Copy-Item -LiteralPath reports/local/gameplay-demo-20261103/campaign-won.json -Destination reports/local/gameplay-demo-20261103/web/campaign-won.json
node tools/promo-video/v4-serve.mjs
```

保留服务，在同目录另一个终端执行：

```powershell
node tools/promo-video/demo-preflight.mjs
node tools/promo-video/demo-record.mjs
python -X utf8 tools/promo-video/demo-check.py --outcomes-only
python -X utf8 tools/promo-video/demo-mix.py
python -X utf8 tools/promo-video/demo-compose.py
python -X utf8 tools/promo-video/demo-check.py
node tools/promo-video/demo-check-player.mjs
python -X utf8 tools/promo-video/demo-provenance.py
```

录制支持逗号分隔的场景名；`--skip-existing` 须跟在场景名后。成片步骤依赖已批准的封面和原创音乐：`dist/gameplay-demo-design-20261103`，声音复现脚本为 `demo-audio.py`。`--prepare-only` 可先合成已经录好的片段，不会宣称整片完成。

## 检查与交付范围

检查真实扣费、援兵入队、三族购牌及伤害贡献、首领奖励与英雄技能、同件人族模块的拾取至局外装备、神族关间换装、三种去向及再次出发。最终检查两份MP4完整解码、时长、尺寸、帧率、音量和24次浏览器章节跳转，并进行关键帧视觉检查；浏览器播放和帧审查不替代物理手机检查或用户审片。

视频中的字幕、矿气HUD和“局外更换”局部放大属于后期，不修改产品UI。音乐与附加提示音为原创合成，保留同步游戏音效。没有画外旁白。

当前成品在 `dist/gameplay-demo-20261103`，记录和当前源镜头在 `reports/local/gameplay-demo-20261103`。用户审片期间保留两份成片、源镜头及必需输入；废弃预演、临时合成、审查截图和缓存按产物保留规则清理。本任务不提交、推送、上传或发布。
