# 舰装 R20：统一显示设置与接口状态

2026-10-16。用户要求把字体等显示选项放进游戏设置，移出舰装内部；字号改为小号、标准、大号，标准比原来略小。

## 交付

- [独立入口 R20](../../preview/starship-ui-settings-20261016-r20/index.html)，[离线 HTML](../../dist/Starship-UI-Flow-R20-20261016.html)。
- 50,566,437 字节，SHA-256 `64acff406053834aab6b8dbdbc183af56d13b819d74999d2848f28dcc798c79f`。
- [验证摘要](../../reports/qa/starship-display-settings-20261016.json)；原始证据位于 `reports/local/starship-display-settings-20261016/`。
- R19 的三个 HTML 副本及原报告保留；本轮没有替换正式游戏、Current、提交、推送或在线发布。

## 显示设置

舰装导航移除了“设置”页。主游戏原有“设置 → 画面”与独立入口窗口外的“设置”使用同一份控件渲染和偏好配置，字体与界面动效不再放在装备账户管理状态或装备命令中。

| 选项 | 相对 R19 标准字号 | 实际桌面导航字号 | 实际装备名称字号 |
| --- | --- | --- | --- |
| 小号 | 85% | 12.75 px | 11.22 px |
| 标准（默认） | 95% | 14.25 px | 12.54 px |
| 大号 | 115% | 17.25 px | 15.18 px |

旧导航标准为 15 px，装备名称为 13.2 px。固定像素标题、属性数值和详情也使用同一缩放因子；控件区域与舰船槽位几何不按字号整体缩放。窄屏大号继续采用双列物品栏。

配置位于 `src/ui/display-preferences.ts`，公共操作为 `displayPreferences()`、`setDisplayPreferences()` 和 `applyDisplayPreferences()`。已有 `textScale()`／`setTextScale()` 委托给这份配置。主游戏 `settings-screen.ts` 及独立入口共用 `renderDisplaySettings()`。舰装挂载后监听配置变更，卸载时通过自己的 AbortSignal 解除监听。

复用既有 `sc2.text-scale`／`sc2.ui-motion` 浏览器显示偏好键；读取旧 100% 为新标准，125%／150% 为新大号。不能访问浏览器存储时仍能在当前页面调整显示。此处是既有界面偏好处理，没有新增装备或战局存档、恢复或迁移方案。

独立入口设置弹窗自己申请和释放真实宿主暂停租约，返回恢复设置按钮焦点。修改字号不改变当前装备选择、筛选条件、页面、装备账户或管理修订号。

## 游戏接口的当前状态

已经完成共享规则、UI 命令层和真实 `World` 适配器的对接验证。`mountStarshipUI()` 与 `createWorldStarshipHost()` 可用于正式主游戏；同一个 World 内的装备账户、拾取、换装、支付、结算及事件都是实际逻辑。R20 的显示调整继续使用这条管线。

正式主游戏尚未挂载整套舰装 UI。挂载方仍需提供实际打开入口、图片解析、清理按住输入，以及主游戏自己的资源准备／出征／续关回调。现有独立 World 演示的默认续关会跳过其未展示的原生关间窗口，因此正式挂载必须传入主游戏的续关流程，不能把演示默认流程直接当作完整主游戏流程。

```ts
import {createWorldStarshipHost} from '../../ui/starship/world-host';
import {mountStarshipUI} from '../../ui/starship/view';
import '../../ui/starship/style.css';
import '../../ui/starship/legacy-r12.css';
import '../../ui/starship/polish.css';

const host=createWorldStarshipHost(world,{
 resolveImage,
 inputReset:clearHeldInput,
 begin:beginThroughApplication,       // () => boolean，接受后由原入口推进资源／出征流程
 continue:continueThroughApplication, // () => boolean，保留原生关间选择与资源就绪流程
});
const ui=mountStarshipUI(root,host,{startOpen:false});
ui.open('loadout');
// 所属界面销毁时：ui.dispose(); host.dispose?.();
```

更完整的规则历史见 [R18 接口与实逻辑验证](STARSHIP_UI_FLOW_R18_20261015.md)；最新布局及满仓直接分解规则见 [R19](STARSHIP_UI_POLISH_R19_20261016.md)。R18 中“待入仓”及舰装内部设置描述属于历史，分别由 R19 与本记录取代。独立真实 World 验证不等于正式全流程挂载、自然通关、完整装备特效或整个 MVP 验收。存档延期约定保持。

## 本次验证

- TypeScript 类型检查通过；23 项现有舰装接口回归通过。未重跑或重标旧版 1,607 项全套回归。
- 实际 Chrome 10 项检查通过，页面错误、控制台错误和外部 HTTP 请求均为 0。测试覆盖三档实测字号、设置位置、重载／重新挂载保留偏好、选中装备不丢失、两宿主真实合成付款和真实 World 暂停租约。
- 三族 × 三档字号 × 1440×900／844×390／320×740 的配装、仓库、工坊、图册无横向溢出；十二槽位没有碰撞。
- 实际主游戏设置渲染函数用受控视图参数验证相同选项；没有运行完整主游戏入口。离线 HTML 的触屏设置操作无 HTTP 请求；8 次卸载重挂后已卸载界面不响应显示变更。
- 9 张截图包括 1 张未改的 R19 基线和 8 张 R20 图片，均做了目视检查。两张窄屏长图在查看时缩至 2048 像素高，属于布局检查，不作为逐像素或用户视觉验收。
- 第一次构建和测试因沙箱禁止创建子进程而 `EPERM`，保留原日志；允许本地子进程后构建和测试成功。没有删除或改写历史失败。

图片、截图与验证文件均在 D 盘项目下。旧装备及 54 张英雄素材保持原字节，没有新增图像生成。
