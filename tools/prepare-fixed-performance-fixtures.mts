import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {TUNING} from '../src/data/game';
import {SC2_UNITS} from '../src/data/sc2-units';
const out='reports/local/fixed-performance-20261006/fixtures';await fs.mkdir(out,{recursive:true});
const source='reports/local/ui-integration-20261006/full-roster-third/web/protoss-1.json',text=await fs.readFile(source,'utf8'),bundle=readArchive(text).bundle;
const w=new World({race:'protoss'});w.permanentProfile.importJSON(bundle.profile);w.restoreRun(bundle.run!);
// Explicit render-density diagnostic, not pickups earned in a natural campaign.
for(let i=0;i<60;i++){const angle=i*2.3999632297,r=4+(i%9)*1.75;w.pickups.push({id:w.nextId++,x:Math.cos(angle)*r,z:Math.sin(angle)*r,minerals:30,gas:0});}
const snapshot=w.captureRun(),clone=new World({race:'protoss'});clone.permanentProfile.importJSON(w.permanentProfile.exportJSON());clone.restoreRun(snapshot);assert.equal(clone.pickups.length,w.pickups.length);
const file=out+'/protoss-large-drops.json',archive=writeArchive({profile:w.permanentProfile.exportJSON(),run:snapshot});await fs.writeFile(file,archive);
await fs.writeFile(file+'.provenance.json',JSON.stringify({method:'Explicit render-density diagnostic: schema26 fixed UI fixture plus 60 large mineral pickups. No natural-play provenance or P6-V01 closure claim.',source,sourceSha256:createHash('sha256').update(text).digest('hex'),sha256:createHash('sha256').update(archive).digest('hex'),pickups:w.pickups.length},null,2));console.log(file);
for(const count of [100,300]){
 const p=new World({race:'protoss'});p.permanentProfile.importJSON(bundle.profile);p.restoreRun(bundle.run!);
 const radius=SC2_UNITS.roach.unitRadius*TUNING.unitScale,candidates=[];
 for(let z=-27;z<=27;z+=1.2)for(let x=-27;x<=27;x+=1.2)if(Math.hypot(x,z)>7&&p.terrain!.canOccupy({x,z},radius))candidates.push({x,z});
 candidates.sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
 let added=0;for(const point of candidates){if([...p.entities.values()].some(u=>!u.flying&&Math.hypot(u.x-point.x,u.z-point.z)<u.unitRadius+radius+.08))continue;
  const u=p.addUnit('roach','zerg',point.x,point.z);u.hp=u.maxHp=2e6;u.nextShotAt=u.specialReady=1e9;u.moveSpeed=0;if(++added===count)break;
 }
 assert.equal(added,count);p.hash.rebuild(p.entities.values());const run=p.captureRun(),check=new World({race:'protoss'});check.permanentProfile.importJSON(p.permanentProfile.exportJSON());check.restoreRun(run);
 const data=writeArchive({profile:p.permanentProfile.exportJSON(),run}),name=out+'/protoss-targets-'+count+'.json';await fs.writeFile(name,data);await fs.writeFile(name+'.provenance.json',JSON.stringify({method:'Synthetic broad-phase/target/renderer density only: original frozen diagnostic roster plus stationary, non-firing, high-health Roach targets. No natural enemy combat, FPS acceptance or increased production roster claim.',source,additionalTargets:count,totalEntities:p.entities.size,sha256:createHash('sha256').update(data).digest('hex')},null,2));console.log(name);
}
