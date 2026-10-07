# UI fidelity QA · started 2026-10-06

final result: passed — original UI surfaces restored; necessary actual-data/function adaptations explicitly retained.

Reference: preserved R12 (`reports/local/ui-redesign-20261003/SC2-UI-Preview-r12.html`), incorporating approved R7/R8 battlefield and R11 cards; original conversation and the user's current removals govern the comparison.

Implementation: production game, current World/Profile/RunSession. No prototype combat, economy, fake roster, or preview toolbar is imported.

Evidence: `reports/local/ui-fidelity-round-20261006/`. The original audit remains separate before evidence.

## Measurement

Normalize only preview toolbar/shell/frame chrome. Confirm reference and runtime frame rectangles and viewport dimensions before comparing. Capture home/new-game/load/talents/intermission/catalogue/production/inspector/battle/pause/settings/end states at matching desktop, portrait and short landscape dimensions. Compare layout, typography, art, color, copy, focus, scrolling and overlap. Document actual-data adaptations explicitly.

## Iterations

1. Imported the exact 12-style cascade, original icon paths, R11 engravings and minimap housing. Restored layered raster painting and constant body normalization, actual training targets, R12 inspection composition and full talent-tree composition.
2. Closed old CSS leakage, overlay/inspector focus and live repaint resets, mismatched card actions, three-variant choice layout, free-drop eligibility and mandatory-receipt return. Restored home/title responsive sizes, exact settings navigation/padding, small-screen header/console dimensions and progress-row height. The font adapter preserves complete original responsive expressions at 100%.
3. Five viewport groups / 320 main captures, 80 final paired corrections, 25 special-branch captures, 12 final font captures, 10 auxiliary-window captures and 33 operations/target captures passed. All 571 measured font/color pairs match; 542 position/size pairs match. The remaining 29 measurements only reflect complete current talent text, retained production controls and the archive setting tab. Their screenshots and actual deltas are preserved. No unexplained P0/P1/P2 UI finding remains within this engineering scope.
4. Native full-run/Profile transaction comparisons, 690 identity/rank checks, three 180-tick fixed-view comparisons, 32 control checks and 1161 regressions passed. Final Web six groups / fully offline six groups pass; the previous exact-UI build's seven full-identity groups cover 90 elites and 18 heroes. The last build differs only in the offline encoded container; UI, simulation and HTTP source remain identical.
5. Preserved initial failure evidence. Private/parallel runs hit Blob budget errors; the offline store now retains original Base85 strings instead of encoded Blobs. Exact bytes, shared chunks, lazy loading and damaged-batch retry remain verified. The final resource/application update checks pass with all 629 old files reused, no additions, old environment/rollback retained, corruption rejected and backend disabled.

## Scope and retained external gates

- All original requirements and 109 audit rows are mapped in `comparison.json`; no prototype prices, wallets, obsolete mechanisms or fake armies are copied into the game.
- Literal identical dynamic pixels are not claimed. Complete current game descriptions, current maps/state and retained real functions are documented adaptations.
- Continuous control points have no collision volume. Actual soldiers, click-order routing, weapons and approved combat rules remain protected. The independent correction follows the UI acceptance snapshot.
- Human visual, physical/mobile/controller, high-refresh/long-term/low-memory and JavaScript-heap acceptance, natural/full M6/M7, P6-V01, Science Vessel source gaps and production backend/operator acceptance remain OPEN. No Coze deployment or backend activation occurred.
- Evidence and build identities: `reports/local/ui-fidelity-round-20261006/delivery.json`; original audit remains unchanged. Main/correction captures retain their true candidate IDs; final transport-only source equality is separately proved.
