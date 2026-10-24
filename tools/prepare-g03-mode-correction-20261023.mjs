import fs from 'node:fs';import assert from 'node:assert/strict';
let s=fs.readFileSync('tools/lib/g03-consumption-controller-r3.mts','utf8');
const old="const hold=()=>{if(w.order)w.cancelOrder();};";
assert(s.includes(old));assert(!fs.existsSync('tools/lib/g03-consumption-controller-r4.mts'));
s=s.replace(old,"const hold=()=>{if(w.order)w.cancelOrder();if(race==='zerg'&&w.familyUnits('lurker').some((u:any)=>visible.some((e:any)=>!e.flying&&distance(u,e)<10)))if(w.setFamilyMode('lurker','lurker_burrowed'))record('pod-lurker-deploy',true);};");
fs.writeFileSync('tools/lib/g03-consumption-controller-r4.mts',s);
