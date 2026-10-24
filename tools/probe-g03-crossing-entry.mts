import fs from 'node:fs';
import assert from 'node:assert/strict';
import {BASE,newCase,startMeasuredCase} from './lib/g03-economy-runtime.mts';
const cases=[{race:'terran',type:'marine',count:16},{race:'terran',type:'marine',count:32},{race:'zerg',type:'ravager',count:30},{race:'zerg',type:'ravager',count:32},{race:'protoss',type:'immortal',count:32}];
const rows=[];
for(const c of cases){
 const {w,r}=await newCase({...c,version:'current',difficulty:'normal',quality:0,seed:529});startMeasuredCase(w,529);
 w.entities.clear();w.pods=[];w.expedition.ledger=[];w.stage=4;w.prepareStage();w.entities.clear();
 for(let i=0;i<c.count;i++)w.addUnit(c.type as any,'terran',w.anchor.x+(i%5-2)*2,w.anchor.z+Math.floor(i/5)*2,1);
 assert.ok(r.beginSpecialStage(w,'crossing','fixture'));assert.ok(r.markSpecialReady(w));
 const before=w.allies().map((u:any)=>({id:u.id,type:u.unitType,x:u.x,z:u.z,radius:u.unitRadius,canOccupy:w.terrain!.canOccupy(u,u.unitRadius)}));
 assert.ok(w.issueMove({x:0,z:47}));for(let n=0;n<600;n++)w.step();
 const after=w.allies().map((u:any)=>({id:u.id,type:u.unitType,x:u.x,z:u.z,radius:u.unitRadius,canOccupy:w.terrain!.canOccupy(u,u.unitRadius)}));
 const invalid=before.filter(u=>!u.canOccupy).map(b=>{const next=after.find(u=>u.id===b.id)!;return {before:b,after:next,distance:Math.hypot(next.x-b.x,next.z-b.z)};});
 rows.push({...c,extent:(w.terrain as any).extent,before,after,invalid,stepCount:600,seconds:10,allInvalidRemainOutside:invalid.length>0&&invalid.every(x=>!x.after.canOccupy&&x.distance<.000001),phase:w.phase,active:w.specialStages.active?.phase});
}
assert.equal(rows[0].invalid.length,0);assert.ok(rows.some(x=>x.count===32&&x.allInvalidRemainOutside));
const report={confirmed:true,method:'Controlled initial roster only, native beginSpecialStage/parkNormalWorld/issueMove/World.step. No position fix, HP lock, damage override or movement override after entry. 10-second movement back toward the open starting area; no combat needed to reproduce.',finding:'Native rectangular entry placement can put back-row permanent members outside SpecialTerrain.extent. Their initial circle cannot occupy terrain and short native movement steps remain invalid. These living participants prevent crossing completion. Full-route controller label was an initial misdiagnosis; repeated native exit commands do not fix this geometry.',productionModified:false,rows};
fs.writeFileSync(BASE+'/crossing-entry-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify({confirmed:true,rows:rows.map(x=>({race:x.race,type:x.type,count:x.count,invalid:x.invalid.length,stuck:x.allInvalidRemainOutside}))}));
