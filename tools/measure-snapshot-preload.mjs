/** node --import tsx tools/measure-snapshot-preload.mjs [report.json]
 * Measures dependency calls, not GPU bytes. Run against each source revision. */
import fs from 'node:fs/promises';import {World} from '../src/simulation/world.ts';import {BattleRenderer} from '../src/render/scene/battle-renderer.ts';import {newEquipmentAccount} from '../src/simulation/starship/inventory.ts';import {writeArchive} from '../src/persistence/archive.ts';
const rows=[];
for(const race of ['terran','zerg','protoss']){
 const world=new World({race,seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});world.start();world.endStage();
 const snapshot=world.captureRun(),models=[],common=[];let endless=0;
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world,gpu:new Map(),prepareRescueAssets:async()=>{},prepareMissionAssets:async()=>{},retainRequiredUnits:()=>{},prepareCommonAssets:async plan=>common.push(plan),ensureUnitVariant:async(key,type)=>{models.push({key,type});return true;},prepareEndlessAssets:async()=>{endless++;}});
 await view.prepareSnapshotAssets(snapshot);const start=performance.now();let raw;for(let i=0;i<5;i++)raw=writeArchive({profile:world.permanentProfile.exportJSON(),run:world.captureRun(),equipment:world.starship.account});
 rows.push({race,scope:'Node renderer dependency interception; immediate legal stage-end fixture, no browser/GPU allocation',models:models.length,heroes:common.flatMap(p=>p.heroes),endlessCalls:endless,archiveBytes:Buffer.byteLength(raw),snapshotAndSerializeMs:(performance.now()-start)/5,modelKeys:models.map(m=>m.key)});
}
const output=process.argv[2]??'reports/local/safari-20261029/restore-candidate.json';await fs.writeFile(output,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(({modelKeys,...row})=>row),null,2));
