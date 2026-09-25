# Development contract · V26

## Current MVP progress · 2026-09-25

- M1–M3 are complete. M4 samples and M5's 90 elite / 18 hero content are implemented and machine-tested; the user explicitly deferred visual acceptance until the full MVP. Do not mark M4-02, M5-03 or M7 complete on automation alone. Use \`docs/project/status.json\`, \`M5_PROGRESS.md\` and \`M6_PROGRESS.md\` for current evidence.
- M6's latest offline HTML is under the 380 MiB package ceiling. A real-screen loading prewarm removed the diagnosed first-unit GPU gaps in three-race stage-1 samples; full stages 1–6, late campaign, endless and real input/hardware acceptance remain outstanding. 300-enemy synthetic pressure is tracked separately. M7 engineering preflight and a local Web directory are recorded in `docs/project/M7_PREFLIGHT.md`, but no release candidate is frozen.

## M2 runtime foundation · 2026-09-25

- M1-01 through M1-05 are complete. M2 runs use only mvp-1.0, three races and 18 stages, with the purchased four-line talent allocation frozen in RunConfig. The current permanent profile is v5 with independent race wallets; the run schema has advanced since M2. MVP development saves from earlier profile versions are not a compatibility target. M2 implementation and validation are recorded in docs/project/M2_VALIDATION.md.
- V1 developer battles do not resume. They may be exported byte-for-byte and, after validation, their permanent resource principal may be imported once. Historical 12-stage, multi-purchase shop, old training and old-talent compatibility notes below are reference only.
- The approved original three main lines plus micro-control share the 80-point/player-level cap and tiered resource prices. The unapproved 117-node/50-point design is historical input only; its prices may be read for old development-resource import, never used as the running talent tree.


<!-- MVP10_PLANNING_ENTRY -->
**最新战斗规则确认：**仅玩家爆虫自爆后存活并停止5秒，敌方爆虫仍自爆死亡，跳虫不获得自爆。英雄相对常规尺寸友军更大、更强；三族各新增一名高阶空中英雄：人族大和战列巡洋舰、虫族HotS利维坦、神族净化者航母，目标18候选且本局仍最多招3。人族/虫族仅有锁定SC原模型路径、可玩GLB尚未导入；三舰和火焰/冰霜/核爆具体数值已随M0 r6获批准，尚未实施，见[战斗素材稿第9节](docs/MVP10_COMBAT_ASSETS.md#9-三族空中英雄英雄强化与友方爆虫r6)。

**最新精英覆盖纠正：**1.0 MVP目标为每族10普通家族×每家族3款＝90款精英。现有40款只是当前实现/历史策划，不是完整目标；新增50款的机制与表现见[MVP精英补全稿](docs/MVP10_ELITE_CATALOG.md)，已随M0 r6获批准，尚未实施。 用户随后要求用共用的体型、局部肤色/装甲色和实际攻击效果区分三款，避免90套逐款复杂特效；精英战力基准要明显高于普通Rank5，候选倍率已随M0 r6获批准，尚待运行验收。

**最新微操配点纠正：**微操与三条主线共用80点，每购买一级均占1点并使玩家等级增加1级；微操花费更多永久资源，点满17级花64资源、占17点。下文“是否占80点待定”“微操不影响玩家等级”等旧表述已被这一明确答复取代。

## Latest MVP iteration instruction · 2026-09-24

- M0 r6 design was explicitly confirmed by the user on 2026-09-24. M1 and M2 are implemented; do not repeat the same approval request. Start from `docs/MVP10_ITERATION_PLAN.md`, its companion drafts, `docs/project/status.json` and `docs/project/M2_VALIDATION.md`.
- User explicitly no longer requires multiple runtime systems for developer-save compatibility. Legacy 12-stage/shop/talent branches below are historical V26 behavior, not a requirement to preserve in MVP. Consolidate only after approved planning; do not delete or overwrite original save files in this documentation task.
- The original three mechanism-based main talent lines, 41 ranks each, 80 combined main-plus-micro ranks/player level cap, confirmed tier prices and full resource refunds remain the base. All three-race adaptations and micro/cost interactions must be written and confirmed; no silent replacement with the 117-node design.
- Model/attack identity, stronger heroes, explicit endless preparation, a truly flat endless field with authentic SC buildings, saved difficulty, three-entry menus, preload progress, package/performance work and document-first change control are tracked as R00–R11. Distinguish confirmed directions from proposed numbers.
- `docs/project/` is planning/task state. `reports/STATUS.json` remains actual prior runtime QA evidence. Do not report a design or planning check as game acceptance.

<!-- /MVP10_PLANNING_ENTRY -->

## Latest user correction · 2026-09-24

- The replacement 117-node talent design is **not approved**. Restore/adapt the user's original design in `docs/TALENT_TREE_V20.md`; do not substitute a newly invented tree. Confirm unresolved talent design choices before changing runtime talent rules.
- Five bodies per family and ordinary Rank 5 are the **untalented baseline**. The user revised the original three main lines to 41 purchasable ranks each. Each purchased rank in either a main line or micro-control occupies 1 of the same 80 points and raises player level by 1. Per-rank permanent-resource prices by tier 1–7 are 1/1/1/2/1/3/5. Micro-control retains its old tier prices 1/3/3/6/3/6/10. There is no separate XP leveling. A respec refunds all resources actually spent by the active allocation. Switching presets refunds the old allocation and charges the new one at its tier prices atomically; if unaffordable, the old state remains. Player level equals the active allocation count and is recalculated after either operation. Existing 50-point code is implementation history, not the accepted target.
- Design micro-control as a separate visible line using the same 80-point allocation and permanent-resource earnings; its higher tier prices consume more resources, not more points. The interaction between original free-purchase talents and the newer shop is also unresolved. Do not silently choose new currencies, acquisition rules or replacement effects.
- The 117-node code/data mentioned in older sections describe V26 history and the frozen import price reader, not M2 gameplay. M2 uses the approved 165-node M0 r6 design.

## Current implementation contract

- Work in `D:\星际`; preserve existing uncommitted work. Use TypeScript＋Three.js＋Vite, one World and 60 Hz simulation. Read docs/BUILD_RESEARCH.md, docs/DESIGN.md, docs/ARCHITECTURE.md and current QA status.
- Earlier three-race-18-v1 implementation targeted 30 ordinary families, 15 heroes (five per race, three identities per run), 40 elite variants; latest user correction targets 90 elite variants, three per family, after design approval. Five family slots × five bodies and ordinary ranks1—5 remain. Modes/summons/workers are not extra families.
- Replace only upon safe receipt of a paid new-family passenger at full five slots. Inherited rank is 1+floor((oldRank-1)/2), not minus two. Preserve exact paid ledgers, refund only unlaunched training/awaiting passengers, never reward retirement. Freeze the entire simulation for decisions.
- Medivac biological full/mechanical one third; Science Vessel the reverse; charge energy on actual HP restored. Creep uses each Zerg unit actual source multiplier once. Native shields, cloak/detection, legal traversal and owned interceptors are required.
- Current M2 runtime has 165 nodes across three races, 80 shared allocations/player levels, tier-priced resources and nine presets. Preserve old resource awards and freeze old 1/3/5/6/10 prices only for developer-file principal import; old battles do not resume. Micro-control shares the 80-point cap and counts toward player level.
- New campaign18 stages/1800 combat seconds, fixed threat, building paid three-choice once and reinforcement free three-choice once.6/9/12 hero options,15 purple.24 stages deferred. All new exact values in generated GAME_DATA_REFERENCE and approved BUILD_RESEARCH.
- Never report a build/test/export/visual playtest passed without running it. Record actual commands, gaps and artifact path/hash. Art, models and screenshots remain local; never send private images through remote/image-return services. No force push, deployment, cloud account, online multiplayer or second engine.

## Legacy gameplay compatibility (V25 and earlier)

The following older gameplay notes describe only the legacy branch; they do not override the contract above.



- Start with one Rank-1 Marine, one completed Barracks, 50 minerals, no gas. Diagnostic overrides must be labeled.
- Current Terran families: Marine, Marauder, Hellion, Tank, Medivac. Current Zerg families: Zergling, Roach, Baneling, Ravager, Hydralisk. SCV and Drone are economic actors.
- Ordinary ranks default to 5, existing talents may reach 7. Fifteen unique elites occupy same-family seats, use same-card ranks and permanent death. Three unique heroes occupy extra seats; paid intermission revival deploys next stage. Preserve damage, cooldowns and modes on upgrades.
- V25 current production: the building intermission has a “This Round Production” section. Barracks, Factory and Starport each select one or two currently unlocked outputs; only a selected pair alternates, with no third automatic type. New choices affect future batches only; paid Jobs and pods keep their original type, payment, participants and progress. Three building groups still train prepaid whole batches, one passenger per eligible building snapshot and one pod per batch. Expensive batches wait for funds; reservations rotate and other groups spend only actual surplus. The later three-action building redesign is still pending.
- Keep paid capacity across jobs, unreleased pod passengers and pending cards. New units/elites cannot erase prepaid capacity. Pods never time out; collision-safe exits release passengers individually. Destruction kills only unreleased passengers, with no refund; guards remain.
- V25 current campaign only: twelve stages run 60/120/180/240 seconds in groups of three; the confirmed future target is 18 stages. Preserve living state across stages; stage 12 needs hive destruction plus survival. No army-strength difficulty adjustment or unrequested safety nets.
- Easy/Normal/Hard/Hell, permanent talents, enemy ranks/statuses/lords and Hell expansion hives are implemented. Use current data files and generated reference; old “design only” passages are historical.
- Preserve fixed 60Hz simulation, independent entities, legal target layers, energy, cooldowns, finite movement/turning, collision, local avoidance and spatial hashing. Renderer events cannot deal damage, award rewards or consume gameplay RNG.
- Movement commands store destinations, not enemy IDs. Auto targeting never creates orders or moves the anchor. Directional input wins, release never resumes pursuit. Preserve stop/fire/reposition timing and actual shot periods.
- Tank siege is manual. No teleport/automatic unsiege to unjam. V25 Medivacs currently heal biological allies and unlocked mechanical allies, never self/structures; this legacy implementation must be distinguished from the newly confirmed Science Vessel/Medivac split above. Original map/range/speed scale and 0.8 unit model/body scale remain.
- Ground units cross cliffs through ramps; melee cannot hit through cliffs; ranged elevation shots check obstruction; air collision is separate. Keep wider open-ground firing slots and reachable passage slots.
- V25 current intermission has building/random rounds with multiple purchases, optional Continue, discounts, shared reroll cost and no wallet filtering. Generated offers do not reroll on load or new intelligence.
- Post-victory endless moves surviving state to Acropolis LE. Preserve army HP/identity, economy, production and unresolved pods; clear the old battlefield as specified in DESIGN. Four bunkers and one repair facility start the new field. Rounds remain 240 seconds with accelerated waves/specials and independent permanent-point minutes.

## Persistence and structure

- Keep World identity across restart/load; input, renderer and listeners refer to it. Reset presentation clocks and run-owned state without reloading the page or disposing shared asset resources.
- `RunState` additions must explicitly choose saved or rebuilt status in `simulation/persistence/run-fields.ts`. V24 migrates V23 snapshots with default per-building production choices. Save DTOs only: never serialize World, callbacks, terrain assets or Three objects.
- Preserve Maps/Sets, shared Jobs and shared missile hit sets, infinite timer sentinels, RNG, receipts, pending paid transactions and the run's frozen talent choices. Rebuild derived caches.
- Commit run + permanent profile in one IndexedDB transaction with two backups. Restore into a paused battle; do not advance offline time, refill HP, reset cooldowns or revive a valid ended run. Failed writes keep in-memory state and offer export.
- Keep save orchestration in `app/`, format/storage in `persistence/`, simulation DTO boundaries in `simulation/persistence/`, DOM templates in `ui/hud/`. Do not introduce a generic framework before a concrete playable need.
- Update DESIGN/ARCHITECTURE with behavior/boundary changes. Regenerate `docs/GAME_DATA_REFERENCE.md` with `npm run docs:data`; verify `npm run docs:check`. Do not create conflicting new design baselines.

## Art, UI and delivery

- All art processing is local. Never upload original art, screenshots, textures, models or private references to image/model-return services. Do not use remote generation or Mixamo uploads. Inspect tool capabilities first.
- V24 Nova gun-to-hand correction is a runtime bone assembly adjustment, not a texture replacement. Heroes and friendly elites have stronger distinct markers/effects; these do not alter combat math. Exact source bytes, conversion, animation playback, human visual acceptance and distribution rights are separate statuses. Do not substitute geometry, generated art or another unit for missing authentic models.
- Keep credentials, private caches and screenshots out of Git. Preserve the existing user-authorized LFS tracking for original assets / standalone HTML; do not silently change the distribution scope or add unrelated proprietary archives. Keep fonts as system fallbacks; do not download/package font files.
- Ordinary UI contains gameplay only. Asset reports and implementation notes belong in docs or development F1. Development and offline builds share the same World; production has no state-changing debug API.
- Retain keyboard/touch/gamepad controls and independent settings. Test focus and layout of new menus. No physical-phone or physical-gamepad result without actually testing one.
- Report runnable path, actual tests/build hash/size, browser/viewport evidence and remaining limits. Headless success is not human visual/performance approval. Avoid speculative adversarial tests; prioritize actual gameplay, crash and data-loss issues.
