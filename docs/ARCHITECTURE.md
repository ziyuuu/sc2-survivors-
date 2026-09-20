# V3 runtime

`src/simulation/world.ts` owns fixed 60 Hz state. Three.js never owns HP, cooldowns, target selection, paths, production, rank or timers. V2 `rules.mjs` is retained and reused for atomic payment, damage and biological healing; its older lab-only production/reward primitives remain regression tested. The current complete runtime loop is `World`.

`src/data/sc2-units.ts` is the one locked unit profile. `src/data/game.ts` contains explicitly experimental Survivors balance, the 12 stages and static obstacles. Production/reward costs share these data objects in the browser and standalone build.

Ground actors use steering, separation, a 4-unit spatial hash, small static obstacle visibility/corner routing and a shared anchor breadcrumb trail with independent progress per actor. Movement always integrates velocity. Reversal preserves positions, cooldowns and identity. Soft leash stops chasing; hard leash prioritizes returning and applies at most 1.22x catch-up, while retaining close self-defense within 2.5 range. It must never disarm a surrounded straggler. No teleport correction exists. Tanks can remain behind while morphing; vehicles have finite turning rates.

Each job is charged when queued, counts down in its building and emits one physical pod. Pod guardians attack immediately. A 30-second deadline is independent of player distance. Death/timeout takes precedence over success. Clearing guardians plus local threats spawns a new recruit at the pod, or promotes the lowest rank when all five slots are full. Dead identities are never restored. Reward screens freeze all clocks and permit one purchase or supply claim. Four supply fallbacks guarantee three unique cards and a changed combination after reroll.

Corner routing targets are cached for 0.15–0.18 seconds, invalidated when the requested goal changes substantially or the corner is reached. Actual acceleration, turning, separation and collision still run at 60 Hz. This reduces repeated static-obstacle queries without moving actors through terrain or snapping their positions.

`src/render/scene/battle-renderer.ts` adapts state to the original GLB geometry. Static exported meshes are batched by unit type/material with `InstancedMesh`. Local vertex motion provides visible gait, firing recoil, vehicle suspension, rolling Banelings and tank morph changes. If replacement GLBs contain clips, the animation mapper/mixer path takes priority. These are not claims of original SC2 animation equivalence.

GPU instance buffers pool units, health bars, resource pickups and effects. Off-camera units are culled from rendering while simulation continues. DPR is capped at 1.5 and dynamic shadows/postprocessing are omitted. No KTX2 texture compression or real-phone validation is claimed. Existing textures are small; external maps are extracted for development without changing their pixels.

`src/ui/hud.ts` responds to simulation change notifications at up to 10 Hz. It does not own rules. `src/ui/mobile/input.ts` handles independent keyboard/joystick state, pointer capture, cancellation, blur and visibility changes. UI buttons remain clickable while a movement pointer is captured. Reward/production overlays have their own vertical scrolling.

`tools/download-runtime.mjs` extends the existing exact-match asset catalog, validates bytes before writing and generates the manual download list. `tools/prepare-assets.mjs` creates separate development glTF/bin/texture files and a local generated ID manifest. `tools/build-demo.mjs` bundles the same TypeScript entry with esbuild and embeds GLB, image, audio and configuration data. Offline GLBs use data/Blob resources without file-relative fetches. Missing mandatory assets cause a failed friend-demo build rather than substitute units. Development first-run setup attempts the documented source automatically.

F1 and mutation APIs are compiled only in Vite development mode. The friend bundle exposes only a read-only metrics snapshot function, useful for QA. No debug speed, resource or spawn controls are compiled into its normal UI.
