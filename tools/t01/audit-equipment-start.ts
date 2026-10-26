import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {prepareEquipmentFixture,equipmentFixtureSnapshot,type EquipmentFixture} from './equipment-fixture';
import entries from './equipment.generated.json';
const base='reports/local/t01-20261024',report:{scope:string;rows:any[];complete:boolean}={scope:'Each equipment configuration: native grant, cleansing, equip, start, bound body, active clauses and 0.5 seconds of actual simulation. Not rendered-cycle acceptance.',rows:[],complete:false};
for(const[index,c]of entries.entries()){
 const row:any={id:c.id,status:'running'};report.rows.push(row);
 try{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)}),fixture=prepareEquipmentFixture(w,c.data as EquipmentFixture);const before=equipmentFixtureSnapshot(w);for(let i=0;i<30;i++)w.step();const after=equipmentFixtureSnapshot(w);if(w.phase!=='battle'||w.time<.5-1e-8)throw Error('Controlled equipment battle failed to advance');row.status='passed';row.actor=fixture.actorId;row.effects=after.effects.map(e=>({key:e.key,values:e.values,binding:e.binding,pieces:e.pieces}));row.openingBodies=before.bodies;row.afterBodies=after.bodies;row.receipts=after.receipts;
 }catch(e){row.status='failed';row.failure=String(e);}
 if(index%100===0){console.log(JSON.stringify({done:index+1,total:entries.length,failed:report.rows.filter(r=>r.status==='failed').length}));await fs.writeFile(base+'/equipment-start-audit.json',JSON.stringify(report));}
}
report.complete=true;await fs.writeFile(base+'/equipment-start-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({done:report.rows.length,failed:report.rows.filter(r=>r.status==='failed').length}));
