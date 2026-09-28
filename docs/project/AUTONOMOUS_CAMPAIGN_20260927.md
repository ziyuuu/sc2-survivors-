# Autonomous campaign audit · 2026-09-27

This is an incomplete campaign closeout, not human playability or win-rate acceptance. The final controller ran all nine approved five-family routes × seeds 7 / 271 / 89241 on original MapTerrain, Normal, zero talents and actual 60 Hz World.step. No gameplay values, wallet, HP, waves, stage, technology or time were granted/edited. All 27 attempts ended in real defeat; none reached stage 10, 16, stage 18 victory or endless. Those checkpoints and corresponding late-game coverage remain unavailable.

## Final recorded execution

Command: `node --import tsx tools/qa-autonomous-campaign.mts`.

Evidence: `reports/local/autonomous-campaign-final/summary.json`, 27 individual JSON logs and `checkpoints/` archives with adjacent provenance files. Final controller SHA256: `f240ec341641f671d9e9bb95a63fa621cd451c38068ed6cebcb17a56bdc52b96`.

| Build | Completed stages, seeds 7 / 271 / 89241 | Peak bodies |
| --- | --- | --- |
| bio | 2 / 2 / 2 | 5 / 4 / 5 |
| siege | 2 / 2 / 2 | 5 / 4 / 5 |
| mech | 2 / 2 / 2 | 6 / 6 / 6 |
| swarm | 2 / 2 / 2 | 5 / 5 / 6 |
| entrench | 2 / 2 / 2 | 5 / 5 / 6 |
| heavy | 2 / 2 / 2 | 5 / 5 / 6 |
| shield | 2 / 1 / 3 | 2 / 1 / 3 |
| psionic | 2 / 1 / 3 | 2 / 1 / 3 |
| fleet | 2 / 1 / 3 | 2 / 1 / 3 |

All 27 initial stage-1 checkpoints and three legally reached stage-4 checkpoints (shield / psionic / fleet, seed 89241) were saved. Stage-4 archives preserve surviving army, actual wallet, pending production and original map. Provenance records source rules, map hash, archive hash and decision-history hash. History is an action log, not a complete replay stream: production selection and mode calls are not all individually recorded. Use the same controller and seed to reproduce; do not treat a history hash as proof of exact replay parity.

## Controller and experiments

`tools/qa-campaign-controller.ts` exports browser-safe `BUILDS`, `observe`, `createCampaignController`. Controller methods never call World.step. Browser callers invoke `tick()` every 0.25 simulation seconds; the host owns 60 Hz stepping and explicit endless-ready resource preparation. `initialize()` is intended before start. The fourth argument `{advanceIntermission:false}` processes each intermission window once but leaves `finishIntermission` and checkpoint capture to the real UI/ready coordinator. The default remains automatic advancement. Tactical observation excludes enemies failing `visibleTo`; no future waves, RNG, AI navigation or enemy cooldown is used. The current game has cloak visibility, not map fog-of-war. Friendly cooldowns, legal firing geometry and visible bile telegraphs drive movement. G detection is scheduled from the public stage-10 warning, not hidden-enemy presence.

Implementation includes paid production, intended family replacement, elite rescue/replacement, public Boss claims, repairs/revival, paid development and all independently eligible shop purchases, hero slots, tank/lurker deployment and recovery. These late-game handlers are implemented but not naturally exercised by failed early attempts; they are not acceptance evidence for their full flows.

The first no-reserve matrix is retained in `reports/local/autonomous-campaign`. Earlier exploratory kiting reached stage 4/5 in individual Terran runs, but also killed the first Marine in stage 1; those older archives are not final-controller lineage. The constrained kiting matrix lost by stage 2/3. A separate reserve experiment is retained in `reports/local/autonomous-campaign-reserve`. Final policy retains 150 minerals / 50 gas below four bodies and 75 / 25 afterward, buys economic goods first and only repairs below 65% HP. This improved seed-89241 Protoss to stage 4 but did not solve progression. No claim is made that these reserves are optimal.

## Objective failure evidence and next investigation

- bio seed 271 died at 150.33 s (stage 3), with 234.29 minerals / 212.76 gas and a Marine already training with 12.39 s remaining. Five recent deaths span 90.58–150.33 s. The reserve policy has unspent money, so this is not proof that total income is too low: production throughput, rescue cadence and boss tactics still constrain the controller.
- swarm seed 7 died at 162.48 s, with 273.09 minerals / 138.12 gas and two paid Zerglings waiting in an active delivery. That unsettled delivery blocks another batch on the same production line by existing game rules. Rescue of the paid batch, not a wallet grant, is the actionable tactical bottleneck.
- shield seed 271 died at 99.75 s with only its starter Zealot, 228.98 minerals / 117.11 gas and one paid Zealot waiting in active delivery 96. It had rescued four workers but failed to clear/release the reinforcement before attrition killed the starter. Buying more cards or blind development does not remedy a stalled live delivery.

Final logs include per-10-second visible battlefield samples, actual death times, orders, purchases, paid unresolved ledger and production settings. The failure categories are diagnostic labels, not established game defects. No gameplay implementation defect or numerical balance change was established or applied. A useful next controller experiment should target guarded delivery rescue and survival around the first Boss, measuring paid passenger release delay and damage taken, rather than repeat the same matrix or infer impossibility from a bot loss.

## Verification and limits

`node --import tsx --test test/autonomous-controller.test.ts`: 5 / 5 passed (cloaked enemy filtering, no controller time advancement, nine approved routes, valid development IDs/directions, UI-managed idempotent Continue). `npx tsc --noEmit`: passed. These tests do not establish human viability, visual acceptance or complete public-action coverage. The test-only visibility fixture uses direct entity setup; campaign runs do not.

No build or browser run was performed by this subtask. M4/M5 visual, M6 performance, M7 acceptance and successful 18-stage/endless play remain open.

The browser Continue adapter was added after the final matrix with a failing-then-passing regression. It does not change the default tactical/economy policy. Current adapter source SHA256: `cbe8562f890c5ea9073633ee4c1cf25c6a3c38d3a8c1605e19ae6fda998faf55`; the matrix above records the exact earlier execution source hash. Source-rule provenance was recovered directly from the unchanged archive DTO after correcting the writer field name from `rulesVersion` to `rulesId`.

## Controlled paid-delivery rescue experiment

The frozen browser controller was not modified. `tools/qa-paid-rescue-experiment.mts` ran six actual World attempts using bio 271, swarm 7 and shield 271, each with baseline and a separate paid-rescue tactical policy. Economy, development, production and game values stayed identical. Results: `reports/local/paid-rescue-experiment/results.json`. Actual command: `node --import tsx tools/qa-paid-rescue-experiment.mts`; all six completed with no exception.

Source inspection establishes the real release conditions (`World.updatePods`, `planPassengerReceipt`, `expedition-production`): any surviving assigned guard blocks release even if it moved away; any hostile body in the pod's six-unit safety search blocks/restarts opening; after a clear opening delay, each waiting passenger needs a legal collision-free exit (1.8–4.5 unit search), its next-exit interval, and any necessary family receipt resolution. An unsettled delivery blocks another batch on that same line. The policy does not read hidden guard IDs; it approaches paid pods and visible blockers within their safety neighborhood, holds only for relevant nearby combat or immediate contact threats, and defers to baseline bile avoidance.

| Pair | Completed stages baseline → rescue | Released passengers | Mean landed-to-release delay | Cumulative observed damage |
| --- | --- | --- | --- | --- |
| bio 271 | 2 → 2 | 5 → 5 | 7.82 → 7.89 s | 332.00 → 371.00 |
| swarm 7 | 2 → 2 | 6 → 6 | 9.74 → 6.25 s | 676.84 → 781.29 |
| shield 271 | 1 → 1 | 0 → 0 | none | 200.23 → 200.93 |

Damage is the sum of positive per-step HP+shield decreases across living allies; simultaneous regeneration can reduce the observed decrement, so it is a comparative measurement, not a full combat damage event ledger. Delay excludes passengers still waiting at defeat and therefore must be read alongside release counts.

The rescue policy improved swarm delivery latency but neither passenger totals nor stage completion. It increased damage in all three pairs. At swarm defeat the final paid pod was only 0.09 units from the anchor but still blocked by visible enemies including a 752.99-HP Zergling; approaching it alone did not clear the safety bubble. In shield 271 the original Zealot reached 1.60 units from its first delivery but never released the paid passenger: a 145-HP Roach remained 3.78 units from the pod, plus a live Zergling. Baseline also reached the same pod neighborhood (3.40 units). This rejects the simple hypothesis that distant-target holding alone explains these three failures. Bio's final delivery latency improved individually (17.20 → 11.35 s), but earlier delays offset it and overall damage rose.

No additional seeds were expanded: this controlled experiment did not improve completion or released force size. A subsequent hypothesis would need to address guard engagement/targeting and incoming pressure while retaining firing windows, not simply prioritize movement more aggressively. No game implementation defect or balance change was established.

## Read-only identity and F01 multiplier audit

A diagnostic-only replay of swarm 7 and shield 271 captured tier, maximum HP, birth time and guard origin. Command: `node --import tsx tools/qa-paid-rescue-identity-audit.mts`. Evidence: `reports/local/paid-rescue-experiment/identity-audit.json`. Both replayed the exact original rescue-policy defeat times and aggregate damage (167.45 / 100.20 s, 781.29 / 200.93 damage); no tactics, game values or simulation state were edited by the observer.

- **swarm 7, entity 383, 752.99 current HP:** `enemyTier=boss`, `maxHp=810`, `guardianPod=null`, `guardOrigin=false`, born at 150.0166667 s (stage 3 at +30 s). This is the fixed first Boss, not an oversized ordinary/guard Zergling. `campaign18Schedule` selects a stage-3 Zergling Boss at local 30 s (`src/data/campaign18.ts:138`); `World.step` dispatches the budgeted event (`src/simulation/world.ts:808`) to `spawnCampaignSpecial` (`:322`). That function assigns Boss HP from `bossFor` using `data.hp × 0.9 × pressure.health` (`:324`). `BOSSES[3].hp=900` (`src/data/enemies.ts:7`) and Normal pressure is neutral (`src/data/stages.ts:5`, `:17`), hence **900 × 0.9 × 1 = 810**. This assignment replaces the temporary ordinary initialization; it does not multiply the ordinary 30-HP result or apply chapter growth again. Remaining 752.99 is damage after spawning. The cached ordinary `nativeStatScale.hp=30/35` is not an additional Boss HP multiplier in this path; observed actual maximum remains 810.
- **shield 271, entity 98, 145 current HP:** no enemy tier/name, `maxHp=145`, `guardianPod=null`, `guardOrigin=false`, born at 84.6333333 s in stage 2. This is an ordinary wave Roach, not an elite/Boss/assigned delivery guard. `spawnWave → releaseAmbient → addUnit` (`src/simulation/world.ts:765` onward) uses `SC2_UNITS.roach.maxHp=145` (`src/data/sc2-units.ts:38`). `addUnit` applies chapter health and pressure once (`src/simulation/world.ts:383` onward). Stage-2 Normal chapter health=1 and pressure health=1, hence **145 × 1 × 1 = 145**. It was born before paid delivery 96 landed at 87.62 s; it subsequently entered the six-unit safety neighborhood. The remaining 8.33-HP Zergling beside it was also an ordinary wave unit (`maxHp=24`, birth 93.6 s, no guard origin).

These two exact values comply with F01: only ordinary/guard Zergling bases become 18/24/30/35; other ordinary enemy bases are unchanged, and fixed Bosses retain the original base × Normal 0.9 × existing difficulty pressure. No doubled HP multiplier or incorrect elite classification was reproduced. Therefore this audit supplies no justification for a numeric balance patch or failing bug regression. The useful future regression assertion is identity-aware: stage-3 Normal Boss maximum 810, stage-2 Normal ordinary Roach maximum 145, distinct from stage-3 ordinary Zergling maximum 30.
