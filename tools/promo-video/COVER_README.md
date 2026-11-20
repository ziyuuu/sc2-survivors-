# V5梗图封面

本轮只制作宣传封面与带封面的V5副本。生成插画不作为游戏原版素材或实机证据，不改正式游戏代码。封面源图经内置image_gen从文本生成，未发送私有图片；精确提示词见`cover-v5-prompt.txt`。原始输出保存在D盘`assets/generated/codex-images/01a17d3f-27e6-7641-8671-d903de1b2ce3/exec-6f372021-d8fb-4553-87c6-87c615b48e1b.png`。

在项目根目录执行：

```powershell
python -X utf8 tools/promo-video/cover-v5-compose.py
node tools/promo-video/cover-v5-check-player.mjs
```

第一步将封面导出为1920×1080 PNG/JPEG，在两个V5版本前加60帧／2秒，视频直接拼接；音频截取既有V5冲击配乐18–20秒的冲击声，再接原片音轨，AAC重新编码。H.264拼接会在关键帧注入参数头，因此完整性检查对照全部解码帧，而不把参数头差异误认为画面变化。原片不覆盖。

第二步直接从本地文件打开播放器，用已安装的Chrome检查封面poster、跨越2秒拼接的播放及首尾跳转，最后关闭浏览器。这里只检查媒体播放，不重复游戏矩阵。

输出：`dist/promo-video-v5-cover-20261102`。简要记录：`reports/qa/promo-cover-20261102.json`。当前任务的检查截图／合成片段位于`reports/local/promo-cover-20261102`，完成后按保留规则清理；源图、代码和待审成品保持。
