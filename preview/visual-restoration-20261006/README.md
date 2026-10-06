# 游戏画面恢复实验

独立于正式入口的当前源码渲染对照。A保留当前画面；B恢复不朽者附属材质控制；C加入真实阴影；其他档位比较AO、PBR照明与原高光参数适配。

在已安装锁定依赖与原始资源的项目根目录运行：

```powershell
node tools/restore-git-runtime.mjs --check
node --import tsx tools/prepare-visual-restoration.mts
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4189 --strictPort
```

打开 `http://127.0.0.1:4189/preview/visual-restoration-20261006/index.html?scene=units-protoss-0&mode=C`。场景选择会载入固定存档；档位切换使用同一个冻结World。护障菜单的Start/End是源动画83ms样本，标明为预览；默认读取真实World护障。

测量按钮记录10秒原始帧间隔、提交耗时、GPU查询与完整状态指纹。测量期间禁用档位和场景切换。GPU查询在不可用或disjoint时不填造数据；截图应在测量窗外保存。

原材质元数据已随实验保存。只有需要重新核对来源时才运行 `node tools/visual-restoration-source.mjs`，它需要本机原M3、ActorData、Kairos LightData并使用固定读取器版本；不覆盖原资源。

本机截图与测量保存在 `reports/local/visual-restoration-20261006`。采集后运行 `node tools/collect-visual-restoration.mjs`核验发行物与比较指纹，再运行`node tools/write-visual-restoration-report.mjs`生成离线报告。原始报告和截图保持本地，不加入Git。

```powershell
node node_modules/typescript/bin/tsc --noEmit -p preview/visual-restoration-20261006/tsconfig.json
node --import tsx --test test/visual-restoration.test.ts
```

范围、实际结果、限制和正式落地顺序见 `docs/project/VISUAL_RESTORATION_COMPARISON_20261006.md`。这是恢复尝试；材质动画只采样基本姿态轨道，坐标身份匹配只用于冻结实验，灯光和环境是调试参考。当前主游戏未替换，原生SC2、自然性能和人工视觉验收未完成。
