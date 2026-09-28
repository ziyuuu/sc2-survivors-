# WorkBuddy：微信小游戏构建与部署交接

当前交付状态：**微信开发者工具预检包**，尚不是可玩或可发布的完整三族 18 关小游戏。不得将预检成功、浏览器运行成功或资源上传成功写成小游戏正式验收。目标完整范围见 [适配研究与工程基线](WECHAT_MINIGAME_ADAPTATION.md)。

## 跨机器构建包

交接文件是 `dist/SC2-WeChat-Build-Handoff.zip`。解压后以解压目录为工作目录；不要求另一台机器也使用 `D:\星际`。它只包含当前微信预检工程的源码与构建依赖、751 项已发行资源的文件、验证清单和本文档。`BUILD_HANDOFF_MANIFEST.json` 记录每个文件的字节数及 SHA-256。包内不含 `node_modules`、原素材加工源、测试录屏、重复的离线 HTML 或浏览器整站；因此也不能用它重新运行原素材转换流水线或声称完整小游戏已做完。

另一台机器准备 Node.js 22 及以上版本、可访问 npm 仓库的网络，然后在解压目录运行（压缩包不附带 `node_modules`；首次 `npm ci` 不能假设本机离线缓存完整）：

```powershell
npm ci
npm run typecheck
node --import tsx --test test/wechat-platform.test.ts
npm run build:wechat:preflight
```

打包时保留了 `dist/web/assets/` 中哈希已锁定的正式运行资源。资源清单生成器在没有原工程 `public/assets/` 时会核验这些发行文件；缺文件或 SHA-256 不一致会直接失败。构建结果仍是**预检工程**，不是可玩或可发布的微信小游戏。把完整小游戏改造完成、在微信开发者工具和真机验收后，才能生成正式发布包。

## 包内目录

| 路径 | 用途 |
|---|---|
| `dist/wechat-preflight/` | 可导入微信开发者工具的 `game.js`／`game.json` 预检工程；它没有正式战斗 UI。 |
| `dist/web/assets/` | 与清单一一对应的原 SC 派生发行资源；可作为 CDN 上传输入。它约 426 MiB，不能放进小游戏主包或一次性缓存到手机。 |
| `docs/project/WECHAT_MINIGAME_ADAPTATION.md` | 平台限制、工程边界与完整验收门槛。 |

不要上传 `assets/private/`、`.cache/`、`reports/local/`、玩家存档或截图。只上传清单列出的 `dist/web/assets/` 相对路径；保持大小写与路径不变。这里的模型与贴图属于项目现有原素材发行闭包，发布权限仍需由项目持有人确认。

## 构建和部署预检

在解压目录运行：

```powershell
npm run typecheck
node --import tsx --test test/wechat-platform.test.ts
npm run build:wechat:preflight
```

包内 `handoff.json` 明确标记 `playable: false`，并提供脚本散列；WorkBuddy 应保留此状态，不将预检包改名为正式发布包。

准备可用于小游戏的 HTTPS 静态资源目录，并在微信小游戏后台把其域名登记为**下载文件合法域名**。把 `dist/web/assets/` 整个目录发布到该站点的 `assets/` 下。例如清单的 `assets/optimized/model.marine.glb` 应能由 `https://已登记域名/游戏目录/assets/optimized/model.marine.glb` 下载。不要把下载域名设为本机 IP、`localhost` 或 HTTP。

在 WorkBuddy 构建任务中设置 `WECHAT_ASSET_ORIGIN` 为 `https://已登记域名/游戏目录`，再重新运行 `npm run build:wechat:preflight`。这个值在编译时写入预检包；不要把它误当 AppID 或密钥。导入 `dist/wechat-preflight` 到**微信小游戏**项目，替换 `project.config.json` 中仅用于本地预检的 `touristappid`，使用实际 AppID。预检启动时应在微信开发者工具和 Android、iOS 真机分别检查 WebGL2、纹理数组至少 8 层、原地图和枪兵模型哈希、存档目录读写；失败会明确提示，不会继续模拟。

WorkBuddy 可协助完成资源上传、开发者工具导入和编译，但其[网页应用生成与发布能力](https://cloud.tencent.com/act/pro/workbuddy)不等同于微信小游戏上传／审核。腾讯的[微信项目实践](https://cloud.tencent.com/document/product/1831/134531)仍以微信开发者工具与 AppID 为项目入口。小游戏发布必须使用相应的微信账号、AppID、合法域名及微信开发者工具的流程；本预检包不能提交正式审核。

## 完整版尚需的工程

1. 在小游戏画布上接入与现有 r186 兼容的 Three 渲染路径，验证 GLB 内嵌 WebP、原地图 `sampler2DArray`、动画、形态、粒子、音效和 WebGL 上下文恢复。不能直接用仅声明 r108 的旧适配包替换。
2. 将 DOM 标题、天赋、生产、关间、卡片、精英救援、英雄技能和存读界面迁移到小游戏可操作的 UI；保留三族全内容和原版 3D，不做 2D 代替版。
3. 接通 `WeChatAssetCache` 的活动场景清单，逐章按需下载并在 160 MiB 预算内回收非活动资源；存档与资源缓存分目录。
4. 微信生命周期进入后台时暂停固定步并保存；回前台经资源就绪确认后继续，读档不得改变种族或难度。
5. 真机做三族 18 关与无尽的输入、存档、帧时和内存验收；与 Web 相同种子及命令的战斗快照一致。

移植入口已定位：`src/main.ts` 和 `src/ui/hud.ts` 依赖 DOM；`src/render/scene/battle-renderer.ts` 依赖 DOM 标签、浏览器尺寸及 `GLTFLoader`；`src/render/terrain/map-surface.ts` 依赖浏览器图像画布；`src/render/effects/audio.ts` 依赖 `fetch`／Web Audio。微信平台桥目前只解决资源地址、缓存、存档和同一 `World` 会话，**没有**把这些入口接入小游戏画布。上述代码改造和开发者工具验证完成后，WorkBuddy 才能负责正式部署；不能只上传本压缩包与 CDN 资源。

上述五项完成之前，`dist/wechat-preflight` 只能用于平台能力验证，不能称为已适配完成的微信小游戏版。
