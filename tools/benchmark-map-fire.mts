import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import {terrainFireClear} from '../src/simulation/combat/terrain-fire';
import {AIR_HEIGHT} from '../src/data/terrain';
import type {MapDefinition} from '../src/data/map-definition';
import type {Point} from '../src/simulation/types';

const definition=JSON.parse(fs.readFileSync('assets/private/maps/map-runtime.json','utf8')) as MapDefinition;
const terrain=new MapTerrain(definition);
let seed=89421;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const cases:{a:Point;b:Point;airA:boolean;airB:boolean}[]=[];
for(let i=0;i<400;i++){
 const a={x:random()*100,z:random()*100},angle=random()*Math.PI*2,length=1+random()*10;
 const b={x:a.x+Math.sin(angle)*length,z:a.z+Math.cos(angle)*length};
 const airA=i%3===0,airB=i%7===0;
 cases.push({a,b,airA,airB});
}
for(const {a,b,airA,airB} of cases){
 const actual=terrain.lineOfFire(a,b,airA,airB);
 const reference=terrainFireClear(p=>terrain.height(p),a,b,airA,airB,AIR_HEIGHT);
 if(actual!==reference)throw Error('Terrain ray result mismatch');
}
function measure(fn:(a:Point,b:Point,airA:boolean,airB:boolean)=>boolean){
 let yes=0;const start=performance.now();
 for(let repeat=0;repeat<100;repeat++)for(const {a,b,airA,airB} of cases)if(fn(a,b,airA,airB))yes++;
 return {ms:performance.now()-start,yes};
}
measure((a,b,airA,airB)=>terrain.lineOfFire(a,b,airA,airB));
measure((a,b,airA,airB)=>terrainFireClear(p=>terrain.height(p),a,b,airA,airB,AIR_HEIGHT));
const reference=measure((a,b,airA,airB)=>terrainFireClear(p=>terrain.height(p),a,b,airA,airB,AIR_HEIGHT));
const candidate=measure((a,b,airA,airB)=>terrain.lineOfFire(a,b,airA,airB));
if(reference.yes!==candidate.yes)throw Error('Benchmark results changed');
console.log(JSON.stringify({mapHash:definition.source.sha256,cases:cases.length,calls:cases.length*100,
 referenceMs:reference.ms,candidateMs:candidate.ms,ratio:candidate.ms/reference.ms,
 maxHeight:Math.max(...definition.heights),airCases:cases.filter(c=>c.airA||c.airB).length}));
