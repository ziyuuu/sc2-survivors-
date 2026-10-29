# BGM 试听源

当前状态：2026-10-29，用户已确认两首方向，完整循环及游戏接入完成；见[接入记录](../../docs/project/BGM_INTEGRATION_20261029.md)。

- `arrangements.json`：实际使用的主题音符、来源、旧谱文件标识，以及本次新编配说明。
- 生成器：`../../tools/bgm-audition/render.py`，只用振荡器合成，不使用录音、SoundFont或第三方MIDI。
- 正式MP3与hash：`../../deploy/runtime/music-assets.json`所列的两份Git LFS资源。
- [曲目方案、来源与确认边界](../../docs/project/BGM_AUDITION_20261029.md)。

从仓库根目录运行 `python tools/bgm-audition/render.py --full --output reports/local/bgm-integration-20261029/audio`。依赖numpy和ffmpeg，后者可通过 `--ffmpeg` 指定；不加`--full`为历史短试听。正式循环约153秒/113秒，工程检查与原手机听感分别记录。本目录保留编配源，临时试听按产物保留规则清理。
