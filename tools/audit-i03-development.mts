import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PROJECTS,newBuildingState,linesFor,setDirection,getOffers,purchase,nextPhase,nextWindow,facilityCount,canProduce,groupFamilies} from '../src/simulation/building/rules';
import {ALL_FAMILIES} from '../src/data/races';
const witnesses=new Map<string,unknown>(),productions=new Map<string,unknown>(),counts=new Map<string,number>();
const expected=PROJECTS.flatMap(d=>Array.from({length:d.kind==='evolution'?1:Math.ceil(d.maxLevel/(d.batch??1))},(_,i)=>d.id+':'+((i+1)*(d.batch??1))));
for(const race of ['terran','zerg','protoss'] as const){
 for(let seed=1;seed<=1500;seed++){
  const b=newBuildingState(race,{minerals:100000,gas:100000},seed),path:any[]=[];
  for(const d of PROJECTS.filter(d=>d.race===race&&d.kind==='facility'))if(facilityCount(b,d.id))witnesses.set(d.id+':'+facilityCount(b,d.id),{race,seed,source:'native opening'});
  for(let stage=1;stage<=18;stage++){
   for(const [id,value] of Object.entries(b.tech))if(id.startsWith('unlock.')&&value>0&&!witnesses.has(id+':'+value))witnesses.set(id+':'+value,{race,seed,source:'native opening or facility/evolution automatic unlock',path:structuredClone(path)});
   const all=[] as any[];
   for(const line of linesFor(race)){assert.ok(setDirection(b,line).ok);for(const offer of getOffers(b))all.push({line,offer,project:PROJECTS.find(d=>d.id===offer.projectId)!});}
   // Choice changes across replay seeds; rarity/quotes use the untouched native RNG.
   all.sort((a,b)=>((counts.get(a.project.id+':'+(a.offer.level+1))??0)-(counts.get(b.project.id+':'+(b.offer.level+1))??0))||a.project.id.localeCompare(b.project.id));
   const chosen=all.length?all[(seed+stage*7)%Math.min(all.length,4)]:undefined;
   if(chosen){assert.ok(setDirection(b,chosen.line).ok);const q=getOffers(b).find(o=>o.id===chosen.offer.id)!;assert.ok(q);const target=q.targets[0];const paid=purchase(b,q,target);assert.ok(paid.ok,JSON.stringify({race,seed,stage,q,paid}));const value=chosen.project.kind==='facility'?facilityCount(b,chosen.project.id):chosen.project.kind==='evolution'?1:b.tech[chosen.project.id],key=chosen.project.id+':'+value;
    path.push({stage,line:chosen.line,project:q.projectId,target,quote:q,cost:paid.paid,value});counts.set(key,(counts.get(key)??0)+1);if(!witnesses.has(key))witnesses.set(key,{race,seed,path:structuredClone(path)});
   }
   for(const group of b.groups)for(const family of groupFamilies(group))if(canProduce(b,group,family)&&!productions.has(family))productions.set(family,{race,seed,stage,path:structuredClone(path),group:structuredClone(group)});
   assert.ok(nextPhase(b).ok);assert.ok(nextPhase(b).ok);if(stage<18)assert.ok(nextWindow(b).ok);
  }
 }
}
const missing=expected.filter(id=>!witnesses.has(id));
await fs.writeFile('reports/local/integration-i03-20261022/development-paths.json',JSON.stringify({at:new Date().toISOString(),scope:'Native paid quotes from newBuildingState, at most 18 windows. Wallet funded to isolate prerequisites, not economy/difficulty validation.',expected,witnesses:Object.fromEntries(witnesses),productions:Object.fromEntries(productions),missing,missingProduction:ALL_FAMILIES.filter(f=>!productions.has(f)),retiredAutomaticUnlocks:['unlock.hydralisk','unlock.mutalisk']},null,2));
console.log(JSON.stringify({projects:PROJECTS.length,expected:expected.length,witnesses:witnesses.size,missing,production:productions.size,missingProduction:ALL_FAMILIES.filter(f=>!productions.has(f))},null,2));
