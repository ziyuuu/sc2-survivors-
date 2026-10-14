import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {campaignTerrain,MAP_STAGE_AREAS,type CampaignTheme} from '../src/data/campaign-map';
import {makeEnvironmentFullPlan} from '../src/render/terrain/environment-full-plan';
import {fullEnvironmentModelIds} from '../src/render/terrain/environment-compositions';
import {boundaryPoint} from '../src/render/terrain/environment-sample-plan';

const themes:CampaignTheme[]=['industrial','mar-sara','char','ice','frontier'];
const hash=(v:unknown)=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
test('full layouts preserve native walk cells, stages, height, spawn and all four trunk routes across five themes and three seeds',()=>{
 for(const theme of themes)for(const seed of [529,1,4294967295]){
  const terrain=campaignTerrain({version:3,theme,seed}),d=terrain.definition,before=hash(d),plan=makeEnvironmentFullPlan(terrain),repeat=makeEnvironmentFullPlan(terrain);
  assert.equal(hash(d),before);assert.equal(hash(plan),hash(repeat));assert.deepEqual(d.stageAreas,MAP_STAGE_AREAS);assert.equal(plan.protection.nativeBlockers,20);assert.equal(plan.placements.filter(p=>p.type==='landmark').length,20);
  for(const region of Object.values(plan.protection.regionGroups))assert.ok(region>0,theme+' region coverage');
  assert.equal(plan.boundaries.length,4);assert.equal(plan.sites.length,6);
  const ids=new Set(fullEnvironmentModelIds(theme));for(const id of plan.assetIds)assert.ok(ids.has(id),'Missing formal resource dependency: '+id);
  for(let i=0;i<d.walk.length;i++)if(d.walk[i]&&d.opening[i]){
   const x=(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z=d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize;
   assert.equal(plan.groundHeight(x,z),terrain.height({x,z}),theme+' walk height');
  }
  for(const b of plan.boundaries)for(let angle=0;angle<360;angle++){
   const q=boundaryPoint(b,angle*Math.PI/180,1.2);assert.ok(Math.hypot(q.x,q.z)>plan.protection.finalRadius+.79,'Outer rim overlaps playable terrain');assert.ok(Math.abs(q.x)<80&&Math.abs(q.z)<80);
  }
  for(const p of plan.placements){const x=p.position[0]-80,z=80-p.position[1];if(p.type==='ground-detail')assert.ok(Math.hypot(x,z)>=7&&Math.min(Math.abs(x),Math.abs(z))>=5.8);if(p.type==='landmark'||p.type==='cluster-detail'){const solid=plan.solidFor(p);assert.ok(solid);for(const b of plan.boundaries)assert.ok(Math.hypot(solid.x-b.x,solid.z-b.z)>b.boundRadius+solid.r+.59,'Shore overlaps an existing scenery footprint');}}
  terrain.setStage(18);for(const q of [{x:0,z:50},{x:0,z:-50},{x:50,z:0},{x:-50,z:0}])assert.ok(terrain.walkLine({x:0,z:0},q,.9),theme+' trunk');
 }
});
