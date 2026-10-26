import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {prepareCardEffect,stepCardEffectFixture} from './card-effect-fixture';
import entries from './native-cards.generated.json';
import type {Case} from './catalogue';
const rows=[];
for(const race of ['terran','zerg','protoss']){
 const c=entries.find(c=>c.id===`native-card:${race}:fun-shop.tavern.1`)!;
 const w=new World({seed:529,waves:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 prepareCardEffect(w,c as Case);const samples=[];
 for(let i=0;i<3300;i++){
  stepCardEffectFixture(w);w.step();
  if(i%60===59&&w.time>=19)samples.push({time:w.time,anchor:{...w.anchor},order:w.order,input:w.input,decision:w.requiresPlayerDecision,allies:w.allies().map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,action:u.action,move:u.moveSpeed})),mission:w.missions.active?{phase:w.missions.active.phase,workers:[...w.missions.bodies.values()].filter(b=>b.role==='worker').map(b=>({x:b.x,z:b.z,hp:b.hp,path:b.pathIndex}))}:null,last:w.missions.lastResult});
 }
 rows.push({race,samples});
}
await fs.writeFile(process.argv[2]??'reports/local/t01-20261024/tavern-movement-debug-r1.json',JSON.stringify(rows));
console.log(JSON.stringify(rows.map(r=>({race:r.race,samples:r.samples.filter((_,i)=>i%5===0)}))));
