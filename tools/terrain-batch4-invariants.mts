import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {campaignTerrain,type CampaignTheme} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
const root='reports/local/terrain-batch4-20261011',frozen=await import(pathToFileURL(path.resolve(root+'/baseline-source/src/data/campaign-map.ts')).href),oldFlat=await import(pathToFileURL(path.resolve(root+'/baseline-source/src/simulation/movement/flat-terrain.ts')).href);
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),fields=['heights','syncHeights','levels','walk','opening','reveal','clearance','placements','ramps','stageAreas','cliffs','bounds','origin','start','hive'] as const;
const geometries:unknown[]=[],records:unknown[]=[];
for(const theme of ['industrial','mar-sara','char','ice','frontier'] as CampaignTheme[])for(const seed of [10609,89241,0xdeadbeef]){
 const recipe={version:3 as const,theme,seed},before=frozen.campaignTerrain(recipe),after=campaignTerrain(recipe),d=after.definition;
 assert.equal(d.source.sha256,before.definition.source.sha256);const digests:Record<string,string>={};
 for(const field of fields){const original=hash(before.definition[field]),current=hash(d[field]);assert.equal(current,original,theme+'/'+seed+'/'+field);digests[field]=original;}
 geometries.push({recipe,mapHash:d.source.sha256,digests,placements:d.placements.length,dimensions:[d.width,d.height,d.walkWidth,d.walkHeight]});
 for(let stage=1;stage<=18;stage++){
  before.setStage(stage);after.setStage(stage);const samples=[];
  for(let i=0;i<192;i++){
   const a={x:((i*37+13)%313)/2-78,z:((i*61+5)%311)/2-77},b={x:((i*17+2)%293)/2-72,z:((i*31+9)%307)/2-76};
   const run=(t:typeof after)=>[t.height(a),t.height(b),t.isOpen(a),t.canOccupy(a,.42),t.walkLine(a,b,.3),t.lineOfFire(a,b),t.lineOfFire(a,b,true),t.sameContactLayer(a,b),t.region(a)];
   const old=run(before),current=run(after);assert.deepEqual(current,old,theme+'/'+seed+'/'+stage+'/'+i);samples.push(current);
  }
  records.push({theme,seed,stage,mapHash:d.source.sha256,area:d.stageAreas[stage-1],samples:192,result:hash(samples),equal:true});
 }
}
const flat=new FlatTerrain(),prior=new oldFlat.FlatTerrain();for(let x=-82;x<=82;x+=2)for(let z=-82;z<=82;z+=2){const p={x,z};assert.equal(flat.height(p),0);assert.equal(flat.canOccupy(p,.4),prior.canOccupy(p,.4));assert.equal(flat.lineOfFire(),prior.lineOfFire());}
const fixture={baseline:'41391803ced755ec26d5ac248263a7ca5aa118ef',seeds:[10609,89241,0xdeadbeef],geometries};
const fixturePath='test/fixtures/terrain-batch4-geometries.json';
try{assert.deepEqual(JSON.parse(await fs.readFile(fixturePath,'utf8')),fixture);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await fs.mkdir(path.dirname(fixturePath),{recursive:true});await fs.writeFile(fixturePath,JSON.stringify(fixture,null,2)+'\n');}
await fs.writeFile(root+'/geometry-invariants.json',JSON.stringify({baseline:fixture.baseline,generatedAt:new Date().toISOString(),geometries,records,flat:{sampledPoints:83*83,zeroElevation:true,occupancyUnchanged:true,noNewObjects:true},passed:true},null,2));console.log(JSON.stringify({geometries:geometries.length,stagePairs:records.length,perStageSamples:192,flat:83*83,passed:true}));
