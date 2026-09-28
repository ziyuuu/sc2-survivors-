# F02 动作实现记录 · 2026-09-27

本项已接入源码并通过局部自动验证；不是浏览器画面、人眼签收或M6性能通过记录，没有重建发行包。

## 实现

- `render/loaders/animation-profiles.ts`列出神族10家族、死神及三型精英共享模型的原动作名。普通巨像使用`Attack 02`，精英巨像使用`Attack`；两者准备态均独立使用`Attack Ready Channel`。圣堂使用原`Attack`（如存在）／`Spell A`作为灵能弹表现、`Spell`作为技能；该对应为网页适配，未伪称已复核原actor。航母没有母舰Attack，不用Stand冒充验收。
- `selectAttackPresentation`只读实体的`shotSequence/lastShotAt`并驱动持续姿态；不修改冷却、锁定、位移、伤害或RNG。枪兵／劫掠者保留上身叠层，其余射击姿态不中断位置插值。死亡、变形、恢复及施法优先，被打断的旧射击不能再次出现。虚空伤害tick不重启通道，离开通道后播放原结束动作。
- 默认完整档沿用24Hz原骨骼烘焙并按显示帧插值；节能档以15Hz保持姿态并关闭基础及上身插值。出手、动作、受击、档位等变化立即更新姿态。位置、镜头、特效及模拟不受这一时钟限制。
- 设置UI新增独立“单位动作”，持久化仅写`sc2.animationMode`。画质“低分辨率”档与动作档独立。只读renderer报告包含animationMode。
- 保存中已有的出手时间／序号继续使用；渲染状态重建，视觉事件仍由原保存边界清空，因此不从重建姿态补发枪口或命中事件。

## 实际验证

1. 首次新增五项测试均以对应缺失行为失败；本地Node子进程首次受沙箱EPERM限制，经工具授权后正常运行。随后分别复现并修复“变形结束重播旧射击”“虚空下次前摇重启通道”。
2. `node --import tsx --test test/feedback-attack-playback.test.ts test/animations.test.ts test/render-quality.test.ts test/render-performance-v14.test.ts`：23通过、0失败、0跳过。
3. 新覆盖包含实际44个普通／精英配置的本地GLB动作目录（精英共用模型按ELITES解析）；真实World射击在两档下的实体、钱包和事件一致；真实AnimatedBatch骨骼烘焙、双层插值关闭和位置持续更新；读档姿态年龄及不重生旧视觉事件。
4. `npm run typecheck`最后执行通过。期间另一个并行修改中的recipe空值诊断曾阻断，最终复跑已消失。
5. `node tools/qa-feedback.mjs`实际运行三输入商店及设置流程：1440×900桌面、390×844触屏、虚拟标准手柄的方向、三商品购买、递增刷新、真实UI保存／reload、动画独立设置与焦点全部通过。该整轮后续桌面动画夹具受实际地形遮挡导致shots=0而退出1；没有将夹具失败宣称为通过。
6. 修正为`freePosition`选合法位置、同格耐久目标、原`World.fire`出手后，运行`SC2_QA_MODES=desktop SC2_QA_STAGES=elite,animation,boss SC2_QA_LABEL=incremental node tools/qa-feedback.mjs`退出0、页面／控制台errors为空。六种单位（死神、狂热者、追猎者、高阶圣堂、巨像、虚空）在两档下0／0.03／0.1／0.2秒均已有真实shotSequence且模拟action=idle，renderer仍保持原attack姿态；没有修改地形或射线规则。该夹具只隔离表现，不作为自然战斗验收。
7. 本地浏览器证据：`reports/local/qa-feedback-20260927/report.json`（三输入流程与已修复夹具失败）、`report-incremental.json`（桌面增量通过）、两档攻击截图及窄屏设置截图。已用本地图片查看工具复核其内容，不上传截图。早期顶栏遮挡已由主任务修复，sandbox身份误改已从夹具移除，原失败报告仍保留。

## 开放项

- 本地SC actor XML缓存当前不在工作区。使徒7.833秒Attack仅按自然速度和当前出手周期保持有限表现，未凭空压缩整段；精确发射标记／有效片段仍需原actor及画面核验。
- 高阶圣堂`Spell A`／`Spell`对应仍待原actor和灵能弹／风暴同屏核验；巨像当前采用原Walk，方向行走子段未在缺少依据时猜测映射。
- 已有局部浏览器实播截图与两种尺寸设置焦点证据，仍缺全11普通＋33精英的逐一动态画面、自然战役、两档真实GPU帧时对照和真人视觉／物理输入签收。不能以本轮合成测试通过关闭完整F-AC02、M4-02、M5-03、M6或M7。
