import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository} from '../src/persistence/save-repository';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {readArchive} from '../src/persistence/archive';
const rows=[];
for(const [inventory,receipts] of [[24,200],[500,5000],[1000,50000]]){
 const account=newEquipmentAccount(529);account.warehouseLevel=3;
 for(let i=0;i<inventory;i++){const r=grantEquipment(account,{template:'attribute.3',race:'terran',slot:'offense1'},'item:'+i,{kind:'warehouse'});assert.ok(r.ok);}
 for(let i=0;i<receipts;i++)account.receipts['completed-run:'+i+':reward']=['ship-item-'+(i%inventory+1)];
 let raw:string|null=null;const repository=new SaveRepository({read:async()=>[raw],commit:async value=>{raw=value;}}),world=new World({equipmentAccount:account,sandbox:true,waves:false,terrain:false}),session=new RunSession(world,repository,{run:null,savedAt:0,notice:''});
 const a=performance.now();world.start();world.endStage();const captureMs=performance.now()-a,b=performance.now(),exported=session.exportJSON(),exportMs=performance.now()-b,c=performance.now(),parsed=readArchive(exported),readMs=performance.now()-c,d=performance.now();await session.saveNow();const saveMs=performance.now()-d,e=performance.now(),copy=new World({equipmentAccount:structuredClone(parsed.bundle.equipment!),sandbox:true,waves:false,terrain:false});copy.restoreRun(parsed.bundle.run!);const restoreMs=performance.now()-e;
 assert.equal(Object.keys(copy.starship.account.items).length,inventory);assert.equal(Object.keys(copy.starship.account.receipts).length,inventory+receipts);assert.ok(raw);rows.push({inventory,receipts,bytes:Buffer.byteLength(exported),nodes:JSON.parse(exported).data.nodes.length,captureMs,exportMs,readMs,saveMs,restoreMs});
}
await fs.writeFile('reports/local/d05-checkpoint-20261023/history-cost.json',JSON.stringify({scope:'Node controlled mechanism timings, not browser FPS or device acceptance',rows},null,2));console.log(JSON.stringify(rows));
