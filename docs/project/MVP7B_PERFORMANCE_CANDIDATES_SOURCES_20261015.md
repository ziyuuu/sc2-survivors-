# MVP 7B 性能候选与成熟方案依据

日期：2026-10-15。配合[全局性能准备](MVP7B_GLOBAL_PERFORMANCE_PREPARATION_20261015.md)使用。以下区分本地静态事实、历史实测、外部成熟能力和待验证的项目推断；未给候选填写预测加速率。

## 候选分组

### M0 整帧与整局观测

**本地事实：**[BattleRenderer](../../src/render/scene/battle-renderer.ts) 多次渲染后直接读取 Three 的 draw calls／triangles；当前库默认每次 render 重置。`requestedInstanceUploadBytes` 统计的是特定 BufferAttribute 请求，不能代表材质纹理及整帧所有上传。

**拟研究：**在诊断构建按逻辑帧汇总 CPU、GPU、提交、附件和上传，按导航／菜单／加载／关卡／退出关联资源生命周期。正式计时与详细归因分开。先建立这一口径，再比较下列候选；统计代码本身的开销也要验证。

**判据：**汇总范围完整且与捕获样本相符，不用同步查询制造新的帧停顿。无法获得的 GPU 或物理内存指标标为不可用，保留逻辑估计。

### A1 本局完整依赖与程序清单

**本地事实：**[种族预备清单](../../src/app/race-preload.ts)已按所选种族准备普通／精英／英雄，不能再把它描述成无条件加载三族。共用准备、形态、子机、支援、地图与无尽依赖仍需按最终规则合并核对。

**拟研究：**从本局模式、种族、已装备效果及局内全部合法生成路径求闭包，分列原文件、派生物、实际渲染程序。程序维度包括顶点布局、实例化、材质结构、深度／阴影路径及实际目标格式。只裁剪整局不可达的工作，运行见证用于发现漏项。

**成熟依据：**Godot 明确指出 WebGL Compatibility 仍需加载期实际绘制预热；其现代 API 的 pipeline 机制不适用于 WebGL。Unity 说明变体会同时影响准备和运行成本。[Godot](https://docs.godotengine.org/en/4.6/tutorials/performance/pipeline_compilations.html)、[Unity variants](https://docs.unity3d.com/6000.0/Documentation/Manual/shader-variants.html)

**判据：**后续关卡、首次合法单位／事件／装备触发没有漏准备；保持现有真实 HDR 与首帧门槛。普通路径使用的共享碉堡不能因无尽目录归属被删去；模式切换边界在清单裁剪前定案。

### A2 共享与资源所有权

**本地事实：**[AnimatedBatch](../../src/render/units/animated-batch.ts)克隆几何后，渲染器仍持有 GLTF；是否有可释放解析对象需检查引用。单位／特效已共享部分图像来源；[环境纹理加载](../../src/render/terrain/environment-texture.ts)使用独立 TextureLoader。[地形层](../../src/render/terrain/layered-ground.ts)与地图 coating 可能再次请求同一图像。它们是重复持有候选，不是已经证实的物理显存浪费或泄漏。

**拟研究：**按内容身份共享图像来源，保留必要的独立 Texture 包装与采样配置；明确模型、材质、动画、原始 buffer、Blob URL 和 GPU 对象的持有者。确认不再被动画、材质、恢复使用后，再释放临时副本。地图生命周期和整局公共依赖分开管理。

**成熟依据：**Unity Addressables 的加载／释放配对与 asset churn；Three 明确几何、材质、纹理释放各自独立，ImageBitmap 还需应用管理。[Unity](https://docs.unity3d.com/Packages/com.unity.addressables@1.21/manual/MemoryManagement.html)、[Three disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)

**判据：**同时看加载峰值、稳态、反复换图回落和实际恢复。共享 Source 不自动保证共享同一个 GPU 纹理；不同色彩空间／采样状态不能强行混用。离线编码块有既有释放策略，不能撤销 URL 后假定原字节仍在。

### A3 制作期派生资源

**本地事实：**[AnimatedBatch](../../src/render/units/animated-batch.ts)运行时生成 LOD／局部权重，[姿态采样](../../src/render/units/sampled-poses.ts)生成姿态与挂点数据；7A 已优化采样并让出主线程。旧桌面 profile 的姿态部分约 1.52 秒，不能解释全部开局等待。

**拟研究：**将确定性计算转为制作期派生，绑定原件哈希、算法版本、参数、输出格式与校验。保留现有采样和数值约定；分别验证骨骼、挂点、LOD、权重及材质通道，而不是全库自动简化。

**成熟依据：**PlayCanvas Star-Lord 案例将模型和 cubemap 工作前置；glTF Transform 提供 inspect 与独立转换，但维护者明确默认 optimize 不适合所有场景。[PlayCanvas 案例](https://blog.playcanvas.com/webgl-case-study-rebuilding-the-star-lord-pbr-demo/)、[glTF Transform CLI](https://gltf-transform.dev/cli)

**判据：**运行计算减少的同时，冷开局、派生传输、常驻、解包和恢复总成本没有反向越线。项目已有 GLB，不能重复统计 JSON→GLB 收益；Meshopt 压缩传输也不等于 GPU 驻留直接下降。通用浏览器最终 GPU shader 二进制不能按同样方式制作期烘焙。

### A4 GPU 压缩纹理

**拟研究：**以少量代表性颜色、法线、透明遮罩和特殊通道评估 Basis／KTX2；记录实际转码格式、尺寸／mips、上传、驻留估计、转码峰值和启动耗时，再决定覆盖范围。

**成熟依据：**Khronos KTX 与 Three KTX2Loader 提供标准容器、能力检测和有界 Worker 配置。KTX2 容器不等于某一种 GPU 格式；当前 Three 文档也没有承诺能直接加载容器允许的全部硬件专用格式。[Khronos KTX](https://www.khronos.org/ktx/)、[Three KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html)

**判据：**目标 GPU 实际获得所需格式及整体收益，代表画面无不可接受损失。WASM、转码输入输出、上传暂存与离线包必须纳入峰值；RGBA 回退不能记作压缩显存收益。此项可能改变图像，独立于数值等价优化，不能未经验证替换冻结素材。

### S1 材质程序变体收敛

**本地事实：**[原始材质程序](../../src/render/materials/unit-material-batch.ts)已按精确生成 GLSL 共享程序；部分 Fresnel 等数值仍生成字面量。是否造成大量真正独立程序，需要清点。

**拟研究：**保留结构和必要特征分组，将适合的纯数值差异改为参数，减少真正独立程序；不强改缓存键让不同源码假装相同，也不把所有材质塞入巨型 shader。

**成熟依据：**Unity variants 的编译／运行权衡；KHR_parallel_shader_compile 支持非阻塞完成查询，却不是可跨设备分发的最终编译缓存。[Unity](https://docs.unity3d.com/6000.0/Documentation/Manual/shader-variants.html)、[Khronos 扩展](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/)

**判据：**程序清单、开局关键路径与首次使用改善，同时检查主场景和深度／阴影 GPU 成本。增加参数采样和运行分支可能抵消准备收益。保留先前跳过成功 shader log 和提前 depth 编译的否决记录。

### R1 材质局部上传与数据布局

**本地事实：**[UnitMaterialSurface](../../src/render/materials/unit-material-batch.ts)使用 38 行、1,024 容量、RGBA Float32 数据表；每表 CPU 数组逻辑大小 622,592 字节，即 608 KiB，GPU 数据载荷有同等逻辑大小，但不是驱动物理显存实测。`write()` 已比较 Float32 数值，`flush()` 有变化时请求整张更新；当前 Three 提供 `Texture.addUpdateRange()`。

**拟研究：**按 RGBA 对齐、逐行记录脏区间，只合并同一行的范围；当前安装实现按一行上传，不自动拆分跨行连续区间。碎片太多时回退全量，初始化和恢复仍全量上传。另行评估只保存实际通道、分开静态参数与动态状态，保持现有实例容量，不靠运行中频繁扩容制造后续卡顿。

**成熟依据：**直接利用当前框架已有局部更新接口；范围单位、RGBA 排列和底层路径以安装的 r186 实现为准。[Three Texture](https://threejs.org/docs/pages/Texture.html)

**判据：**实际 texSubImage 上传量与整帧 CPU／GPU 成本下降；不能只看 BufferAttribute 的旧计数。原材质动画、颜色、深度、恢复及多实例索引一致。小区间过多产生调用开销时，允许保留较大区间或整张上传。

### R2 场景遍历、附件与提交粒度

**本地事实：**[姿态深度](../../src/render/materials/posed-depth.ts)、[contact](../../src/render/scene/scene-contact.ts)、[阴影](../../src/render/scene/scene-shadows.ts)和主渲染存在各自准备与遍历。contact 链路包含全分辨率姿态深度预通道与半分辨率 12 样本 contact；[折射](../../src/render/scene/screen-refraction.ts)已有无活跃场 bypass；bloom 有多级中间目标。

**拟研究：**先画读写依赖和生命周期，评估结构变化驱动的渲染对象登记、重复遍历合并、未使用附件、稳定 FBO 和安全复用。动态骨骼／矩阵／可见性仍按时更新。对透明 overdraw、合批与剔除粒度按真实帧归因，不默认改混合排序或剔除屏外投影物。

**成熟依据：**MDN 的稳定 FBO／避免同步操作建议，以及 Arm 对带宽与 pass 合并代价的分析。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)、[Arm](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/vulkan-subpasses-the-good-the-bad-and-the-ugly)

**判据：**整帧成本改善且保持 HDR、contact、原始透明与折射深度语义。没有变化的通道才考虑跳过；不能把已实现的“全分辨率姿态深度＋半分辨率 contact”或空折射绕过重复算作新方案。

### C1 模拟与原始特效 CPU

**本地线索：**[团队光环](../../src/simulation/combat/team-auras.ts)有高频资格／效果汇总；[原始粒子解释](../../src/render/effects/source/particles.ts)与[效果播放器](../../src/render/effects/source/player.ts)会反复准备一些静态索引和临时数组。既有空间哈希、复用数组和 GPU 骨骼已在工作，不能笼统重做引擎。

**拟研究：**profile 指向后，再细分静态资格表、只计算当前需要的字段、静态发射器／力场索引和复用临时空间。动态死亡、来源顺序、资格变化和相互作用保留即时语义。

**判据：**World／RNG／时钟／事件和装备真实效果一致；效果继续按原生时间确定性采样。不能把原始年龄采样改成依赖渲染 dt 的累计积分，也不降低模拟频率。

### U1 UI 与可见标记

**本地线索：**血条几何可能在显示资格判断之前准备；隐藏生产账本与小队 DOM 仍有更新候选。已有 HUD 节流与 HTML 缓存应复用。

**拟研究：**把血条资格前置，缓存 DOM 节点和实际变化值，跳过不可见面板的无必要内容生成；暂停／菜单的无变化绘制可研究按需刷新。

**判据：**保留 36×5 CSS 像素、选中／受伤／近期攻击规则、镜头跟随和实际输入反馈。依赖相机的屏幕位置不能机械降为 10 Hz；暂停省电不能记作战斗 FPS 收益。

### L1 有界 CPU Worker 与背压

**拟研究：**优先将可独立且占比明确的解包、解析或确定性派生计算放入小型 Worker 池。使用 transferable buffer 时明确转移后的所有权，按任务数和在途字节限制并发；取消／切换使用 generation，过时结果不得重新挂回。

**成熟依据：**Transferable ArrayBuffer 避免复制但会使发送端失去该 buffer 的使用权；Streams 需要正确背压。[MDN Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)、[Streams 概念](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts)

**判据：**菜单响应、端到端等待及峰值一起改善，或者在满足全部预算前提下形成清楚取舍。不能按 CPU 核数无限增加 Worker，也不能声称它自动消除主 WebGL 上下文的编译／上传阻塞。

### L2 传输与离线解包

**本地线索：**现有服务器已有 immutable／ETag／gzip；离线包已有分块解码与让出执行。网络传输字节、单文件 HTML 解包和运行内存是不同问题。

**拟研究：**只有传输在关键路径上才评估预压缩或编码；离线版检查同一准备批次的分块复用、关联资源分组和可转移解包。保留校验、完全离线和编码块释放策略。

**判据：**Web 和 HTML 分开报告；下载更小但解码更慢、复用更高但瞬时峰值更高，都作为真实取舍。不能凭此解释在线 Safari 的未知失败，也不新增重复的 Service Worker 体系。

### L3 持久资源缓存与写入

**本地线索：**[HTTP 资源存储](../../src/assets/http-store.ts)与[持久缓存](../../src/assets/persistent-cache.ts)有写入和索引路径；此前缓存命中／键数异常仍保留。0.6.28 已提供预下载，不需要再设计一套“资源下载完成”功能。

**拟研究：**先区分查找、命中、SHA 校验、写入和索引耗时，再判断批量索引或有界异步写入是否有价值。缓存按内容身份和派生版本管理，失败写入不算预下载完成，不污染当前可用版本。

**成熟依据：**WebKit 的 best-effort 存储可能驱逐，配额是上限而非可用空间承诺。[WebKit 存储策略](https://webkit.org/blog/14403/updates-to-storage-policy/)

**判据：**冷热访问、配额失败、取消与再次进入都正确；不能用缓存估算或键数替代实际命中，也不把持久缓存工作变成提前开展游戏存档改造。

## 条件架构与质量选项

| 选项 | 成熟能力 | 本项目进入条件和边界 |
| --- | --- | --- |
| OffscreenCanvas 渲染 Worker | 将渲染 JS 与主线程 DOM 分离；[web.dev 实例](https://web.dev/articles/offscreen-canvas) | 先证明主线程提交竞争是主要瓶颈，再评估输入／拾取／World 快照／resize／恢复协议；不直接降低 GPU 带宽和驻留 |
| WebGPU／TSL | 现代提交、节点材质与后处理；[Three 官方迁移](https://threejs.org/manual/pages/webgpurenderer) | 当前自定义 GLSL、深度与原始折射均需迁移；只在现有主线不足且投入明确时评估，不默认换引擎 |
| 明确质量档位 | 当前已有 native／balanced／performance DPR 与独立节能姿态设置 | 保留手动契约。新自适应必须有稳定档位、迟滞与冷却，不频繁重建目标；原画质成绩和降档成绩分开 |
| 分阶段 GPU 驻留 | 大型内容按阶段持有可降低常驻 | “已下载”不足以保证无卡顿；若不能覆盖最快合法推进且战斗预算不足，就退出此候选 |
| 自愿停留与背景准备 | PlayCanvas Virtual Voodoo 在角色定制时加载，快速开始时仍显示进度；[官方加载流程](https://developer.playcanvas.com/user-manual/optimization/load-time/) | 可以改善等待体验，但只算体验层候选。用户立即开始和总等待必须照测，不强迫停留，不推迟到第二关，也不据此新增玩法系统 |

## 已有能力与历史反例

当前已有：GPU 姿态图集与实例化、BufferAttribute 活跃区间上传、单位／特效图像共享、精确生成 GLSL 键、异步编译查询、真实 HDR／首帧准备、统一后台准备通道、可选模型 24 项留存边界、地图对象释放、全分辨率姿态深度预通道与半分辨率 12 样本 contact、无活跃折射 bypass、SHA 与持久资源缓存。可选模型 24 项是缓存管理边界，不是军队上限。

| 历史候选 | 保留的结果 | 重启研究所需新证据 |
| --- | --- | --- |
| 跳过成功 shader log | 同步工作转到后续调用，部分首十秒 P95 退步 | 新方法确实消除工作，且不会把成本推到第一场战斗 |
| 提前 depth 编译 | 旧中位等待改善，但部分首十秒 P95 约 33 ms，因此未接受 | 程序与真实目标完整准备，并证明战斗未退步 |
| CPU-only 可选开场准备 | 旧总等待增加约 19–32 秒，并有 backing storage 代价 | 不再重复运行准备，且峰值和端到端路径均有改善 |
| 更短开场预算 | 旧多对样本不稳定，点击后等待增加 | 可操作菜单、点击等待和总等待同时满足锁定预算 |
| 缓存材质程序键／跳过空批次 | 10 月 6 日比较退步，已撤回 | 不同机制与可复现热点，而非换名重试同一改动 |

出处：[7A 候选记录](MVP7A_LOADING_20261013.md)、[7A 原始测量说明](MVP7A_LOADING_VALIDATION_20261013.md)、[固定场景验证](FIXED_SCENE_PERFORMANCE_VALIDATION_20261006.md)。这些历史实验的版本和失败不能改写成当前候选已通过。

## 成熟方案给出的整体经验

| 来源 | 可靠的经验 | 迁入本项目的方式 |
| --- | --- | --- |
| [PlayCanvas Star-Lord](https://blog.playcanvas.com/webgl-case-study-rebuilding-the-star-lord-pbr-demo/) | 模型格式、纹理压缩、cubemap 预处理与异步资源共同改变加载 | 看整个资源链；其小型演示及特殊网络条件的百分比不外推本项目 |
| [Unity Addressables](https://docs.unity3d.com/Packages/com.unity.addressables@1.21/manual/MemoryManagement.html) | 持有／释放配对，避免刚卸载就重载 | 公共依赖稳定持有，临时副本按引用释放；不引入 Unity 包管理体系 |
| [Godot pipeline 文档](https://docs.godotengine.org/en/4.6/tutorials/performance/pipeline_compilations.html) | 区分材质源码、管线与首次真实使用；明确 WebGL 限制 | 保留实际绘制预热，补完整清单，不照搬 native shader baker |
| [glTF Transform](https://gltf-transform.dev/cli) | 先 inspect，再选有针对性的转换 | 制作期派生按原件和算法绑定，不全库运行可能有损的默认 optimize |
| [Khronos KTX](https://www.khronos.org/ktx/) | 传输压缩与 GPU 可用格式是一整条流程 | 同时测转码、格式、峰值与视觉，不能把 WebP 或 gzip 当 GPU 压缩 |
| [MDN WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | 同步操作、资源上传和附件生命周期能影响帧流水线 | 校正观测，减少真正重复工作；保持必要预热门槛 |
| [Arm tile GPU 分析](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/vulkan-subpasses-the-good-the-bad-and-the-ugly) | 减少带宽有利于能耗，但合并也会改变调度与缓存压力 | 以整帧依赖和目标设备证据选方案，不把 pass 数少直接等同更快 |
| [Apple 长局分析](https://developer.apple.com/videos/play/wwdc2026/388/) | 把会话状态与长期性能变化关联 | 沿完整玩法看持续表现；原生热状态 API 不写成 Safari 已可用能力 |
| [Chrome LoAF](https://developer.chrome.com/docs/web-platform/long-animation-frames)与[Khronos GPU timer](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) | 不同观测工具回答不同时间尺度的问题 | 长任务、帧间隔、CPU 提交、GPU 执行分别测，不互相冒充 |

这些实践共同支持主文的顺序：先决定完整内容的准备、驻留和整帧预算，再以实测瓶颈选择局部手段。成熟工具减少实现试错，但不能免除本项目的状态、画面、连续性和真实设备验证。
