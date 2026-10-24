import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import {createHash} from 'node:crypto';
import {growthRuntime} from './lib/g03-growth-runtime.mts';import {farmMinorGear} from './lib/g03-farm-minor-cases.mts';
const root='reports/local/g03-farm-minor-20261023',r=await growthRuntime('after'),sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert(!fs.existsSync(root+'/plan.json'));
const before=JSON.parse(fs.readFileSync(root+'/before.json','utf8'));
for(const f of before.files)assert.equal(sha(f.file),f.sha256,f.file);
const cases:any[]=[],inputs:any[]=[];
for(const race of ['terran','zerg','protoss'])for(const difficulty of ['hard','hell'])for(const tier of ['farm','minor'])for(const seed of [529,530]){
 const c={race,difficulty,tier,seed,version:'after',policy:'audited',group:'middle-tier-validation'};cases.push(c);
 const {a,spec}=farmMinorGear(r,c),items=Object.values(a.items) as any[];assert.equal(items.length,12);assert(items.every(i=>r.validateItem(i)));
 const opening=Object.entries(a.equipped[race]).map(([slot,id]:any)=>({slot,...a.items[id]}));
 let previousOpeningMatch:null|boolean=null;
 if(seed===529){const oldPath='reports/local/g03-tier-balance-20261023/'+[race,difficulty,tier,seed].join('-')+'.json',old=JSON.parse(fs.readFileSync(oldPath,'utf8'));previousOpeningMatch=JSON.stringify(a)===JSON.stringify(old.opening);assert(previousOpeningMatch,oldPath);}
 inputs.push({id:[race,difficulty,tier,seed].join('-'),spec,opening,previousOpeningMatch});
}
assert.equal(cases.length,24);
const files=['tools/measure-g03-farm-minor-20261023.mts','tools/lib/g03-delivery-observer.mts','tools/lib/g03-growth-runtime.mts','tools/lib/g03-growth-cases.mts','tools/lib/g03-consumption-controller-r2.mts','tools/lib/g03-consumption-controller-r3.mts','tools/lib/g03-farm-minor-cases.mts','tools/lib/g03-economy-runtime-tier-objectives-r2.mts','tools/qa-campaign-controller.ts','tools/probe-g03-consumption-r3-20261023.mts','tools/probe-g03-strategy-20261023.mts'];
for(const f of files){const dest=root+'/runtime-tools/'+f;fs.mkdirSync(path.dirname(dest),{recursive:true});assert(!fs.existsSync(dest));fs.copyFileSync(f,dest);}
fs.writeFileSync(root+'/plan.json',JSON.stringify({date:'2026-10-23',cases,tools:Object.fromEntries(files.map(f=>[f,sha(f)])),source:before.baseline,scope:{primary:'24: three races x hard/hell x farm/minor x seeds 529/530. Current numbers and same corrected policy throughout.',gear:'Same 12 intermediate opening equipment templates/allocations/affixes as historical 529 cases, validated item by item. New drops may upgrade attribute pieces; sets preserved. Track final gear separately.',finish:'Complete 18 campaign stages and actual endless entry; no endless-duration claim.',budget:'260000 fixed steps / 40 wall minutes each; errors and censors separate from battle losses.',acceptance:'Farm should finish; minor should push through with low pressure. Report deaths, revivals, repairs, stage time, sampled pressure, actual growth and delivery results; success alone is not an automatic push-over verdict.',freeze:'No source, numeric, price, probability, camera or input changes. No injected run currency, heroes, kills or HP lock. Only native public actions. Diagnostic replays and controlled probes are not counted among 24.',policy:'One cheapest active fighter reinforcement reserved, next-development reserve before shopping, unfinished essential development defers fun-shop buys; produce unlocked fighters when army small; visible carrier protection precedes optional pickups/events but mandatory hives and stage18 remain first. Original policies/results preserved.'}},null,2));
fs.writeFileSync(root+'/inputs.json',JSON.stringify({cases:24,items:288,allLegal:true,oldFirstSeedAccountsExact:12,rows:inputs},null,2));
console.log(JSON.stringify({routes:24,openingItems:288,oldFirstSeedAccountsExact:12,source:before.files.length,tools:files.length}));
