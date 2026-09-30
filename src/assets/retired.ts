/** Proven unused payloads, not a size budget. Original source files remain intact.
 * The release audit rejects a direct/model dependency on these IDs, so restoring
 * a future effect requires deliberately removing it from this table. */
const unusedEffect='No current emission/profile or model external dependency; historical catalog-only texture';
const radialProps=new Set(['model.map.crate_00','model.map.compoundsewers_exhaustpipes_00','model.map.barrels_00','model.map.marsaracactus_00','model.map.rock_00','model.map.brambles_00','model.map.redstonerockspiresnobase_00','model.map.rocklarge_00']);
/** Current browser runs only use the saved radial recipe or the independent flat field. */
export const retiredCampaignAsset=(id:string)=>id==='map.kairos'||id==='map.acropolis'||id.startsWith('map.acropolis.')||['map.terrain.mask0','map.terrain.mask1'].includes(id)||id.startsWith('model.map.')&&!radialProps.has(id);
export const isRetiredAsset=(id:string)=>Object.hasOwn(RETIRED_ASSETS,id)||retiredCampaignAsset(id);
export const RETIRED_ASSETS:Readonly<Record<string,string>>={
 ...Object.fromEntries(Array.from({length:17},(_,i)=>i).filter(i=>![1,2,16].includes(i)).map(i=>['fx.support.nuke.'+i,'Support impact consumes only original cloud, shockwave and glow; unused extracted layers are not emitted'])),
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
