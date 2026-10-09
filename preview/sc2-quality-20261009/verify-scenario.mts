import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {DECK_BLOCKERS,inspectDeck} from './scenario';
import {sampleTrack,coverAlpha,type SourceProfile} from './source-materials';

const w=new World({seed:10909,waves:false,sandbox:true,obstacles:DECK_BLOCKERS,terrain:new FlatTerrain()});
w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.pickups=[];w.rewardDrops=[];w.expedition.ledger=[];
for(const p of Object.values(w.expedition.production))p.enabled={};w.anchor.x=0;w.anchor.z=-2;w.anchor.facing=Math.PI;
for(let y=0;y<3;y++)for(let x=0;x<2;x++)w.addUnit('thor','terran',-.6+x*3.2,-3.5+y*3.4);
for(let y=0;y<5;y++)for(let x=0;x<4;x++)w.addUnit('marine','terran',-6.2+x*.94,-3.3+y*1.45);
for(let y=0;y<3;y++)for(let x=0;x<2;x++)w.addUnit('marauder','terran',5.3+x*1.25,-2+y*2);
for(let i=0;i<17;i++)w.addUnit(i%4===0?'hydralisk':i%3===0?'roach':'zergling','zerg',-6.5+i%8*1.65,-9.5-Math.floor(i/8)*1.9);
w.hash.rebuild(w.entities.values());w.paused=false;const checks:unknown[]=[];let violations=0;
for(let i=0;i<3601;i++){
 if(i===600)w.issueMove({x:6.7,z:12});if(i===1500)w.issueMove({x:-6.7,z:-13});w.step();const s=inspectDeck(w);violations+=s.blocked.length;
 if(i%300===0)checks.push({tick:i,time:w.time,phase:w.phase,blocked:s.blocked,living:s.units.length,minX:Math.min(...s.units.map(u=>u.x)),maxX:Math.max(...s.units.map(u=>u.x)),minZ:Math.min(...s.units.map(u=>u.z)),maxZ:Math.max(...s.units.map(u=>u.z))});
}
const m=JSON.parse(await fs.readFile(new URL('./materials-source.json',import.meta.url),'utf8'));
const shield=m.profiles.immortal as SourceProfile;
assert.equal(coverAlpha(shield,'inactive',0),0);assert.equal(coverAlpha(shield,'start',0),0);assert.ok(coverAlpha(shield,'start',.17)>.99);assert.equal(coverAlpha(shield,'end',.2),0);
const frames={id:1,frames:[0,1,2],values:[3,5,1]};assert.equal(sampleTrack(frames,.5,0,0),3);assert.equal(sampleTrack(frames,.5,0,1),4);assert.equal(sampleTrack(frames,1,0,0),5);
const result={method:'Diagnostic native World fixture; two movement orders, 3601 ticks, all body radii checked against actual wall footprints. Original shield curves and material interpolation checked.',violations,checks,shieldCurves:true};
if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2));
console.log(JSON.stringify(result));assert.equal(violations,0);
