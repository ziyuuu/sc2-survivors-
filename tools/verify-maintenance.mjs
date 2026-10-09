import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='reports/local/maintenance-audit-20261008',read=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const allowed=['src/ui/hud.ts','src/ui/hud/expedition-panel.ts','src/ui/gamepad/controller.ts','src/ui/presentation/intermission.ts'];
const protectedBefore=await read(out+'/protected-before.json'),unchanged=[],changed=[],excluded=[];
for(const f of protectedBefore){
 if(f.path.startsWith('preview/intermission-ui-kit-20261008/')){excluded.push(f.path);continue;}
 const hash=await sha(f.path);(hash===f.sha256?unchanged:changed).push(f.path);
}
assert.deepEqual(changed.sort(),allowed.sort());
const app='dist/Maintenance-Coze-Application-20261008',baseline='dist/Battle-UI-Coze-Application-Final-20261008';
const current=await read(app+'/delivery.json'),prior=await read(baseline+'/delivery.json');
for(const f of current.appFiles){const b=await fs.readFile(path.join(app,f.path));assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);}
const oldVendor=prior.appFiles.filter(f=>f.path.startsWith('vendor/')),newVendor=current.appFiles.filter(f=>f.path.startsWith('vendor/'));
const omitted=oldVendor.filter(f=>!newVendor.some(n=>n.path===f.path));
assert.ok(omitted.every(f=>/\.(?:map|d\.(?:ts|cts|mts))$/.test(f.path)));
for(const f of newVendor)assert.deepEqual(f,oldVendor.find(o=>o.path===f.path));
for(const f of current.appFiles.filter(f=>f.path.startsWith('backend/')||['start-coze.mjs','sc2-backend.conf','coze-web-server.mjs'].includes(f.path)))assert.equal(f.sha256,prior.appFiles.find(o=>o.path===f.path)?.sha256,f.path);
const oldGroups=await read(baseline+'/resource-groups.json'),groups=await read(app+'/resource-groups.json');
assert.deepEqual(groups,oldGroups);
const cleanup={};
for(const kind of ['project-cache','c-cache']){const r=await read(out+'/cleanup-'+kind+'.json');let absent=0,present=0;for(const f of r.skipped){try{await fs.access(f.path);present++;}catch{absent++;}}cleanup[kind]={removedFiles:r.removedFiles,logicalBytes:r.logicalBytes,hardlinkedBytes:r.hardlinkedBytes,observedFreeIncrease:r.observedFreeIncrease,skipped:r.skipped.length,skippedAbsentNow:absent,skippedPresentNow:present};}
const offline={};for(const name of ['SC2-Survivors-Battle-UI-Final-20261008.html','SC2-Survivors-Maintenance-20261008.html'])offline[name]={bytes:(await fs.stat('dist/'+name)).size,sha256:await sha('dist/'+name)};
const sum=rows=>rows.reduce((n,f)=>n+f.bytes,0);
const report={at:new Date().toISOString(),baseline:'d8c30c43415473cc12d64ddf83a27d38d667bce6',preservation:{compared:unchanged.length+changed.length,unchanged:unchanged.length,authorizedChanges:changed,otherThreadExcluded:excluded.length},package:{appBuildId:current.appBuildId,packageBuildId:current.packageBuildId,oldFiles:prior.appFiles.length,newFiles:current.appFiles.length,oldBytes:sum(prior.appFiles),newBytes:sum(current.appFiles),reducedBytes:sum(prior.appFiles)-sum(current.appFiles),vendorRetained:newVendor.length,vendorOmitted:omitted.length,vendorReducedBytes:sum(omitted),allRetainedVendorByteIdentical:true,omitted},resources:{release:groups.release,files:groups.files.length,bytes:sum(groups.files),unchanged:true},cleanup,offline};
await fs.writeFile(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,package:{...report.package,omitted:undefined}},null,2));
