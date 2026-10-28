# 浏览器游戏实站与内存策略调研

2026-10-28，V06-MEMORY-004。用户要求直接检查 Azeroth Survivors，并继续调查其他 HTML / 浏览器游戏的方法。本轮只读调研，项目基线 `677237c`（Sites 第15版）；游戏源码、资源画质与线上部署未改。实站检查使用独立 Windows Chrome，未使用玩家真实存档、未测物理 iPhone。

## 原站：实际看到了什么

已正常访问 [wow.aethus.pl](https://wow.aethus.pl/)，取得原站实际下发的启动模块、两个资源清单与资源请求，并查看选人界面截图。画面显示 `v0.123.0 (425f2391)`，启动文件版本参数为 `aaf932e1a8fb`。这次不再只有网页文本抓取器返回的 WebGPU 提示。先前文档中“启动脚本403/未取得”是前次访问的边界，本次已取得。

进入世界的点击已尝试，但后续页面检查没有取得可审阅的战斗快照，随后主动结束会话。不能写成完整实玩成功，也不据此判定原站游戏崩溃。没有获得同手机、同画面复杂度的内存对照。

| 结论 | 证据与限度 |
| --- | --- |
| 属于浏览器游戏，使用 WebAssembly 与 WebGPU | 原站加载 `wenilla.js`、`wenilla_bg.wasm`，正常取得 WebGPU adapter。游戏界面由客户端 canvas 绘制。不能把“HTML游戏”理解成只含HTML或一定使用Three.js。 |
| 启动和进入世界分批准备 | `boot-manifest.json` 有517项，`world-manifest.json` 有349项；第二批在界面就绪后开始。`boot.js` 使用8路下载池。 |
| 预取文件缓存与GPU资源准备分开 | 下载池读完响应体，让HTTP缓存命中后续读取；不是把866个文件同时解码成GPU资源。当前实现仍有临时ArrayBuffer，不能说预取不占内存。 |
| Wasm采用流式编译，避免额外整包复制 | `compileWasm` 保持响应流，在MIME不支持时才回退到ArrayBuffer。此样本传输13,797,254字节，解压响应102,499,735字节；两者均非实际运行内存。 |
| Android减少着色器准备范围 | `rogue.js` 默认对Android关闭全量管线预热，并启用部分简化材质。作者注释说明此前约2000个变体预热及完整材质曾使Adreno 840编译器/GPU进程崩溃；这是源码记录，不是本次复现，也不是iPhone结论。 |
| 内置GPU分配与崩溃记录 | 记录buffer/texture创建、释放、写入量、管线编译和device lost。注释记有Firefox用户约5分钟后浏览器14–16GB及内存耗尽报告；不能据此认定所有用户都会遇到。 |
| 一部分角色源图明显较小 | 从实际请求取6张人类身体/面部BLP2文件头，尺寸范围128×32至256×256，6次Range请求均206。仅局部源图样本；运行时还可能合成贴图，不能推成整个人物或全站显存大小。 |

原站来源：[启动流程](https://wow.aethus.pl/boot.js?v=aaf932e1a8fb)、[客户端外层与诊断](https://wow.aethus.pl/rogue.js?v=aaf932e1a8fb)、[启动清单](https://wow.aethus.pl/boot-manifest.json)、[世界清单](https://wow.aethus.pl/world-manifest.json)。网页文本抓取器本轮仍无法读取JS，但正常Chrome实际取得成功；SHA与读取范围在[简要QA](../../reports/qa/browser-game-research-20261028.json)。BLP头部解释核对 [benilla格式解析器固定提交](https://github.com/samwhosung/benilla/blob/a483e75563eda71a07a550d8cbfb11a5e33d606a/crates/benilla-blp/src/lib.rs)。

选人界面原站自带账本一次读数为texture约145.9 MiB、buffer约33.1 MiB；算法是分配描述估算，非驱动或进程实测。不与我们首战441 MB直接比较，也不加总作原站总RAM。未确认原站所有贴图的GPU压缩格式、完整资源淘汰策略或Wasm内部实现。

`OutThisLife/azeroth-survivors-re`标明社区本地重建，不当作原站完整源码。上游benilla的能力和引擎API也不能自动归为线上原站已采用的优化。

## 其他公开实现与开发者资料

| 案例／来源 | 已证实的方法 | 对本项目的适用性 |
| --- | --- | --- |
| [Slow Roads作者技术复盘，2023](https://web.dev/case-studies/slow-roads) | 沿道路预测环境需要，分散生成工作；近路细、远景粗；复用地形与数组，限制逐帧分配 | 参考按玩法依赖组织准备和池复用。我们已有后台时间片、实例化和部分LOD，不能重复算新增收益。道路单一路线的捷径不能照搬自由战场。原站本次遇到安全验证，未绕过；方法来自作者复盘，不是当前版本实测。 |
| [The Hobbit Experience作者复盘，2013](https://web.dev/case-studies/hobbit) | 移动端贴图/实际渲染尺寸降低，简单材质，复用地形模块；按具体场景判断模型面数是否真是瓶颈 | 证明中低档联动降画质/分辨率是成熟实践；我们第13版已做。其旧设备FPS不是今天项目的收益预估，减少物理更新不能照搬到固定步战斗。 |
| [After the Flood官方技术介绍，2017](https://blog.playcanvas.com/mozilla-launches-webgl-2-with-playcanvas/)（图形演示） | GPU压缩贴图、异步资源流送、光照贴图烘焙、GPU粒子 | 同尺寸GPU压缩已进入第15版；静态光照和纯装饰粒子可单独评估，但不据此更换引擎或更改原画表现。 |
| [PlayCanvas资源生命周期](https://developer.playcanvas.com/user-manual/assets/loading-unloading/) | 按组加载，在不用时卸载资源，保留注册信息供重载；共享资源释放会影响其他使用者 | 对应本项目尚未完成的跨局GPU模板/材质引用与预算淘汰；不能把场景隐藏或清掉编码文件当作GPU已经释放。 |
| [Bevy CPU/GPU用途分离](https://docs.rs/bevy_asset/0.19.1/bevy_asset/struct.RenderAssetUsages.html) | 对无需CPU再读的资产，上传后移除CPU像素/顶点数据，仅留元数据与GPU表示；Wasm保留内存不一定归还系统 | 新候选方向：统计GPU上传后还保留的CPU数组。此为引擎能力，未证实原站启用。Three.js也有[上传完成回调](https://archive.threejs.org/docs/api/en/core/BufferAttribute.html)，但本项目需先验证动画、拾取、重载、切档和context恢复。 |

另直接尝试SWOOOP官方地址，连接被关闭，未将其列入本轮运行成功或实现证据。

## 对照本项目后的具体下一步

1. **收紧公共英雄/特效准备，并测着色器编译峰值。** `src/render/scene/battle-renderer.ts` 的 `commonAssetIds()` / `commonTasks()` 仍包含多族英雄、精英和大量公共特效，还会上传贴图、编译材质。先按实际英雄、舰装、兵种、订单及已确定奖励建立依赖，区分必需与后续资源；逐项统计编译数、贴图字节、耗时和上下文失败。保留技能、援军、读档、死亡/变形的必要资源，不照搬Android“一律不预热”，避免首次技能卡顿。
2. **核对关掉效果后的显存释放。** `SceneContact.setEnabled(false)` 与 `ScreenRefraction.setEnabled(false)` 主要关闭效果，不直接释放已分配目标；低档Bloom也主要禁用pass。属于源码可见的待测生命周期路径，不能冒称已经测出浪费多少。`SceneShadows` 已在切换时dispose shadow map，不重复提修。优先测高→低切换后是否仍驻留，再决定安全释放/按需重建。
3. **测CPU/GPU双份数据，再扩展释放。** 上一轮已清编码Blob、弱引用和转码器，但压缩mip、几何、动画图集仍可有CPU数组。先按用途统计，分开不可变数据、每帧更新和恢复所需数据；没有可靠重载方案前不清空。目标是尽量不改画质，不承诺未经测量的内存收益。
4. **完善跨局GPU模板预算。** 从“返回标题后仍引用哪些模板/材质/贴图”追踪实际持有者；只淘汰没有活跃使用者的资源。已有可选模型淘汰与编码预算不等于完整跨局释放。

本轮不再把KTX2、降渲染尺寸、实例化、普通对象池和既有预定奖励当成尚未做的建议。进一步改变贴图尺寸、材质复杂度、原光照或特效外观仍需给出具体对照方案；调研没有自动授权这些体验变化。

## 复现与收尾

`tools/research-browser-game.mjs <原站URL> <D盘临时目录> <等待秒数> --hold --blp-headers` 使用独立Chrome，读取公开页面与资源并截图；`--hold`在交互终端接收有限的state/click/key/close命令，最长10分钟，不自动无限游玩。进入选人后state可输出GPU账本及6张BLP头；非交互调用自动关闭。工具本轮修过跳转等待与终止清理，完成语法检查；本项目数据参考检查通过。未重跑与文档调研无关的游戏矩阵。

保留简要事实、版本/哈希、来源和复现代码，临时下载的第三方脚本、截图及详细网络记录按产物规则清理。V06整体回到待验证；原iPhone第15版复测仍开放。本轮无游戏改动、部署或新的全量画质方案。
