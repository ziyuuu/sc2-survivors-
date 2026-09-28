/** Proven unused payloads, not a size budget. Original source files remain intact.
 * The release audit rejects a direct/model dependency on these IDs, so restoring
 * a future effect requires deliberately removing it from this table. */
const unusedEffect='No current emission/profile or model external dependency; historical catalog-only texture';
export const RETIRED_ASSETS:Readonly<Record<string,string>>={
 'model.droppod':'F05 replaces all race carriers with barracks/hatchery/pylon; no new/load/delivery path selects the old pod',
 ...Object.fromEntries([
  'fx.blood.1','fx.blast.1','fx.blast.2','fx.blast.5','fx.blast.7','fx.acid.1',
  'fx.bile.1','fx.bile.2','fx.bile.3','fx.bile.5','fx.bile.7','fx.bile.8',
  'fx.flameimpact.1','fx.marauder.launch.0','fx.marauder.missile.0',
  'fx.marauder.missile.1','fx.marauder.missile.2','fx.marauder.missile.3',
  'fx.marauder.missile.4','fx.marauder.impact.1','fx.marauder.impact.4',
  'fx.hydralisk.missile.0',
 ].map(id=>[id,unusedEffect])),
};
