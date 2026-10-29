# 解锁卡残留修复与首次解锁自动排期

2026-10-29，归属 `V06-QUEEN-UNLOCK-001`、`V06-UNLOCK-SCHEDULE-001`。用户要求修复虫后解锁卡残留，保留其他卡牌和价格、检查相关问题、完成本地验证并暂不部署；同时明确新增首次解锁自动排期。多设施只选一个运行中且有空位的兼容生产组；重型兵种提前预排、第10关开工，并允许现有按钮取消预排，均已得到具体确认。这是本次授权范围，不扩大1.0冻结后的开发清单。

## 修复与规则

- 额外发展选择在建造附赠科技后，会清理已完成、旧等级或失去资格的发展候选。覆盖虫后解锁、技能／攻防系统、研究等级和进化目标变化；其他卡牌的编号、名称、报价、折扣及顺序保留，不补抽，不消耗随机数或刷新次数。资金不足不会使合法卡消失，清空的缓存不会自行重抽。
- 恢复当前版本的旧关间档时执行同一清理。生产安排沿用已有字段；Run schema 26、账户事务、两份备份及已付款订单保持。此前已解锁或被玩家取消的兵种不会因读档重新排期。
- 首次解锁兵种自动追加到一个运行中、兼容且少于两个产出的生产组。满位、手动暂停和其他生产组保持原状；没有合适空位就只解锁。付费解锁、建造附赠科技、虫族方向进化、任务科技奖励共用此路径。
- 自动排期不打断已付费批次，不直接送兵，也不提前扣生产费用。按原轮换与训练配方开工；资源不足继续等待。雷神、雷兽、航母可提前占位，第10关才开工；关间可取消预排，取消后不能绕过门槛手动重加。
- 用户截图中卡面右下循环箭头是**简略／详细说明切换**，不会刷新候选、价格或消耗资源。该图标本次保持。

## 实际验证

- **123项定向回归全部通过**，其中新增14项，覆盖三族付费首次解锁、免费科技＋额外选择、旧档清理、进化、任务回执、满位／暂停／无兼容设施、已付款订单、资金不足、保存恢复与重型开工／取消。包含D05检查点及现有生产、任务、舰装与I03相关回归。
- `npm run typecheck`、`npm run docs:data`、`npm run docs:check`通过。
- Windows Chrome 实际HUD事件处理，在1440×900、844×390和390×844上各检查虫后、雷神两组，共6组通过。鼠标与模拟触屏验证了购买后失效卡移除、其余卡牌和报价保留、首次解锁自动勾选、预排取消／应用／再次打开，以及说明切换不影响钱包、随机数或卡牌。无页面异常或失败资源请求，无页面横向溢出；已查看三尺寸代表性截图。
- 未注入检测代码的正式本地Web入口另行检查菜单和新游戏种族选择。最终结论及源码SHA见[机器报告](../../reports/qa/unlock-feedback-fix-20261029.json)。

方法边界：使用受控装备、关卡结束和任务／旧档夹具；未做自然整局、物理手机或线上验收，也不重新启动平衡／性能矩阵。原玩家是否正好遇到同一组合仍无原档证据；本轮关闭的是已复现的卡牌残留及批准的排期逻辑。

初次新增断言误把“建造承包”附带的双建造当作仅一座，修正了测试预期，未为此改游戏。浏览器首跑被本机网络权限拦截，随后在获准环境复验；检测脚本最初使用已隐藏的旧生产入口，改为实际“设施调整”按钮后通过。正式构建已完成编译及资源校验，但末步因命名输出父目录不存在而无法移动；核验完整暂存路径后补建父目录并移入指定目录，随后正式入口和服务端逐资源SHA校验通过。以上均不记为新游戏bug。

## 版本、文件与复现

基于`体积优化版`的`674c528ee8657f7b2f6ba743e2aac6c13f644eec`本地修改。正式Web `appBuildId`为`18f96dd6c6f05b28b691a32699f338f0d276d4d5dafcd9e5b0c7aa1d836dc270`，资源release为`c57126842b2eebe90f278e5dfe9c5ad54eaaec683b3e611e697abada0118fdad`。

生产文件：`src/simulation/building/rules.ts`、`progression/expedition-drafts.ts`、`expedition-economy.ts`、`starship/economy.ts`、`missions/rewards.ts`、`world.ts`及`src/ui/presentation/building-panel.ts`。规则参考由`tools/docs/export-game-reference.mts`生成。新增复现为`test/development-unlock-feedback.test.ts`与`tools/qa-unlock-feedback.mjs`；修复前调查工具已标明历史适用版本。

```powershell
node --import tsx --test test/development-unlock-feedback.test.ts test/mvp1-building-integration.test.ts test/expedition-production.test.ts test/expedition-drafts.test.ts test/missions.test.ts test/starship-support-economy.test.ts test/starship-production-integration.test.ts test/integration-i03.test.ts test/d05-checkpoint.test.ts
npm run typecheck
npm run docs:check
New-Item -ItemType Directory -Path dist/unlock-feedback-20261029 -Force
$env:SC2_WEB_OUTPUT='dist/unlock-feedback-20261029/web'
try { npm run build:web } finally { Remove-Item Env:SC2_WEB_OUTPUT -ErrorAction SilentlyContinue }
node tools/qa-unlock-feedback.mjs
node tools/qa-unlock-feedback.mjs --entry-only
```

本地独立浏览器服务自动选择端口并关闭；没有读取真实玩家档案。截图、日志、检测页及本轮可重建构建完成后按保留规则清理，保留简要结论与复现代码。

**未提交、推送或部署；既有Coze ZIP、Sites及阿里云保持原版本，本批修复不在此前的BGM更新包中。** `V06`仍为待验证，原iPhone及其他既有具体反馈继续按原范围保留。下一步仅按用户指示进行复测或准备后续交付。
