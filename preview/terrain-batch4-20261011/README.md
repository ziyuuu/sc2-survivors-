# 第四批地表与环境验证

此目录使用真实 World 和正式 BattleRenderer 建立受控原生夹具，不进入正式发行入口，也不提供生产调试接口。

- `build.mjs baseline-*` 从实施前冻结的 `4139180` 源码编译；其他名称编译当前源码。每次构建保留输入哈希与独立源码副本。
- `qa-environment.mjs` 覆盖五图审图、阶段/视口矩阵、密集战斗及环境生命周期。`qa-industrial.mjs` 保留工业图分步接入。
- `qa-matrix.mjs` 复查全部 138 身份的五图背景和画外投影；`qa-sequence.mjs` 保存原生动作 PNG，不能代替墙钟录像。
- `qa-lighting.mjs ... realtime` 保存五图三族各 20 秒实际 MediaRecorder 录像，复用一个可见页面／渲染器，每段恢复独立原生夹具并记录起始状态；监听真实焦点和可见性，保留默认浏览器节流。`qa.mjs ... --suite cost` 仅保存五秒暂停成本。
- `qa-batch.mjs`、`qa-finish.mjs` 保留首次候选的实际执行流程；灰烬修正后的最终流程是 `qa-final.mjs`，使用 `candidate-r11` 和最终命名 HTML。所有流程顺序执行浏览器任务，首个失败时停止；证据存在时拒绝覆盖。
- `server.mjs` 按各诊断包自己的资源清单绑定环境 PNG 哈希，因此早期候选继续显示其真实旧素材，不会因当前资源修改而悄然变成最终版。
- `node --import tsx preview/terrain-batch4-20261011/build-gallery.mjs` 仅在全部配对和录像通过后生成对照图库。`qa-gallery.mjs` 检查索引、完整播放15段录像并保留30张解码帧，人工／模型审图的范围另行记录。`serve-review.mjs` 只在回环地址提供本地查看。

所有失败候选保留实际版本；测试夹具中的延迟事件、主体位置、镜头和原生时间都在记录中说明。自然战役、实际 SC2 客户端、真机、低内存、高刷新和稳定 FPS 不由这些记录替代。
