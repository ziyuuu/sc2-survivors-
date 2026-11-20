# 80秒电影／电竞预告风玩法演示

DEMO-01，2026-11-03。本版按用户图片及追加反馈修改声音、比例、同屏编排和动作区间。80秒、1080p30、45镜头；0–3秒封面，前三项玩法与成长、购牌、首领展示延长至56秒，舰装拾取、关间／局外限制及整备合计10秒，76–80秒为已有项目Logo。12条原文保留，其中“及时提升”与“返回旗舰装备更精良的设施”并排同时出现。三处三分屏、两处双分屏；同屏介绍后不再逐族重复。

声音为原创120BPM混合预告片配乐：低频铜管／冲击、鼓、快速弦乐与合成器、上升音、金属转场，45处切镜都配有重拍。并非电影原声采样。操作反馈与原生游戏音效依照源时间重排，多分屏只选主画面声音；无旁白。混音按-14 LUFS、-2dBTP目标进行两遍归一化，最终AAC另测峰值。

## 复现

保留原15组录制及隔离构建，路径为 `reports/local/gameplay-demo-20261103`；缺失时先按 [原流程](DEMO_README.md) 重建。封面源在 `dist/gameplay-demo-design-20261103`，已有Logo在 `reports/local/promo-video-v2-20261030/clips/logo.mp4`。原始时间通过 `captureRanges` 映射到压紧后的文件，不能直接按原始秒数seek。

确认18848端口未被其他任务使用后，启动原隔离页面与当前输出预览：

```powershell
$env:PROMO_ROOT='reports/local/gameplay-demo-20261103'
$env:PROMO_OUTPUT='dist/gameplay-demo-cinematic-20261103'
$env:PROMO_PORT='18848'
node tools/promo-video/v4-serve.mjs
```

另一终端补录三族推进、首领奖励后交战和三族重新出发，共7组。重新出发沿用原场景名称、种子及装备事件，确保同件物品身份保持；仅增加出发后的移动指令。全部使用内存账户，不接触玩家档案。

```powershell
$env:PROMO_RECORD_ROOT='reports/local/gameplay-demo-cinematic-20261103'
$env:PROMO_BUILD_ROOT='reports/local/gameplay-demo-20261103'
$env:PROMO_SCENES='tools/promo-video/demo-cinematic-motion-scenes.json'
$env:PROMO_CAPTURES='tools/promo-video/demo-cinematic-motion-captures.json'
node tools/promo-video/demo-record.mjs motion-terran,motion-zerg,motion-protoss,action-boss-terran
$env:PROMO_SCENES='tools/promo-video/demo-cinematic-deploy-scenes.json'
$env:PROMO_CAPTURES='tools/promo-video/demo-cinematic-deploy-captures.json'
node tools/promo-video/demo-record.mjs gear-terran,outfit-zerg,outfit-protoss
python -X utf8 tools/promo-video/demo-cinematic-plan.py
$env:PROMO_EDIT_PROFILE='cinematic'
python -X utf8 tools/promo-video/demo80-graphics.py
python -X utf8 tools/promo-video/demo-cinematic-audio.py
python -X utf8 tools/promo-video/demo80-compose.py
python -X utf8 tools/promo-video/demo-cinematic-check.py
python -X utf8 tools/promo-video/demo-cinematic-action-check.py
node tools/promo-video/demo-cinematic-check-player.mjs
```

审看45个最终镜头取样，并核对购买／换装点击、同屏限制文字、移动与交火、最终Logo。半秒状态审计仅用于筛掉停止且无攻击的片段，不代表所有单位逐帧移动。章节播放器将同时出现的两条装备字幕合为一个入口，加上Logo共12个位置，两份文件共24次跳转。

最后运行 `python -X utf8 tools/promo-video/demo-cinematic-provenance.py` 保存构建、录像、配乐来源、工具和成品哈希；停止预览服务。检查脚本验证真实扣费、奖励、同件SCV模块及合法换装／出发，但拍摄是预设场景，不能视为一局自然连续游玩。静音浏览器检查、抽帧及音频测量不代替用户听审或物理手机测试。

当前两份成片及源录制、封面和Logo输入保留供审片；中间艺术字、分段视频、混音、临时抽帧及被替代旧成片按保留规则删除。正式源码、存档及部署保持。
