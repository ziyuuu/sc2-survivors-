import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-f05-20261019',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const old=await read(root+'/baseline-1/report.json'),fixed=await read(root+'/fixed-3/report.json');assert.ok(old.pass&&fixed.pass);
const checks=[];
function normalizeUUID(d){const id=d.run.runId;d.run.runId='<run-id>';assert.equal(d.account.run.id,id);d.account.run.id='<run-id>';const receipt=d.run.expedition.support.stageReceipt;if(receipt){assert.ok(receipt.startsWith(id+':'));d.run.expedition.support.stageReceipt='<run-id>'+receipt.slice(id.length);}return d;}
for(const point of fixed.checkpoints){
 const before=old.checkpoints.find(p=>p.label===point.label);assert.ok(before);
 for(const key of ['time','tick','live','rng','equipmentRng','wallet','effects','receipts'])assert.deepEqual(point.state[key],before.state[key],point.label+' '+key);
 const a=normalizeUUID(await read(root+'/baseline-1/'+point.label+'.state.json')),b=normalizeUUID(await read(root+'/fixed-3/'+point.label+'.state.json'));
 const removed=[];const clockChanges=[];const newEntities=new Map(b.run.entities.__map);
 for(const [id,u] of a.run.entities.__map){const actual=newEntities.get(id);if(!actual){assert.ok(u.temporary&&u.hp===0);removed.push(id);}else if(u.deadAt!==actual.deadAt){assert.ok(u.temporary&&u.hp===0);clockChanges.push({id,before:u.deadAt,after:actual.deadAt});u.deadAt=actual.deadAt;}}
 for(const key of ['entities','navigation','movementStall','detours'])a.run[key].__map=a.run[key].__map.filter(([id])=>!removed.includes(id));
 assert.deepEqual(a,b,point.label+' World/account outside declared projection cleanup');
 checks.push({label:point.label,gameplayAndEffectsExact:true,removedProjectionIds:removed,deathClockCorrections:clockChanges,worldAccountExactAfterOnlyDeclaredNormalization:true,before:{entities:before.state.entities,projections:before.state.projections,members:before.state.members,sources:before.state.sources,movement:before.state.movement},after:{entities:point.state.entities,projections:point.state.projections,members:point.state.members,sources:point.state.sources,movement:point.state.movement}});
}
const files=[];for(const report of [old,fixed]){for(const output of report.build.outputs){const bytes=await fs.readFile(output.file);assert.equal(hash(bytes),output.sha256);files.push(output);}for(const screen of report.screens)assert.equal(hash(await fs.readFile(screen.file)),screen.sha256);}
const binding=[];for(const input of fixed.build.inputs.filter(i=>i.file.startsWith('src/'))){const archived=await fs.readFile(root+'/web-inputs/'+input.file);assert.equal(hash(archived),input.sha256);if(input.file==='src/render/units/economic-egg.ts')continue;const current=await fs.readFile(input.file);assert.equal(current.toString().replaceAll('\r\n','\n'),archived.toString().replaceAll('\r\n','\n'),input.file);binding.push({file:input.file,sha256:input.sha256});}
const sourceFiles=['src/simulation/starship/projections.ts','src/simulation/starship/projection-cleanup.ts','src/simulation/world.ts','src/simulation/types.ts','src/render/effects/equipment-effects.ts','test/starship-projection-cleanup.test.ts'];
const sources=[];for(const file of sourceFiles)sources.push({file,sha256:hash(await fs.readFile(file))});
await fs.writeFile(root+'/verification.json',JSON.stringify({pass:true,created:new Date().toISOString(),normalization:'Exact run UUID at run.runId/account.run.id and prefix of support.stageReceipt; only changed projection deadAt and missing dead projection entity/navigation/movementStall/detours entries. No health, damage, live position, time, tick, RNG or economy normalization.',checks,files,sources,compiledGameInputsVerified:binding.length,excludedUnrelatedWorktreeFile:'src/render/units/economic-egg.ts'},null,2));
console.log(JSON.stringify({pass:true,pairs:checks.length,compiledGameInputsVerified:binding.length,checks}));
