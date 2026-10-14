import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/7a-20261013',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),versions={};
for(const variant of ['baseline','final']){
 const r=await read(root+'/resources-'+variant+'-r3/result.json');assert.equal(r.passed,true);assert.equal(r.cycles.length,10);
 const cycles=r.cycles.map(c=>({cycle:c.cycle,theme:c.theme,mapCount:c.resources.maps.length,memory:c.resources.memory,decoder:c.resources.textureDecodeReferences,poseBytes:c.resources.poseBytes,models:c.resources.models,objects:c.resources.objects,meshes:c.resources.meshes,programs:c.resources.programs,retiredDetached:c.resources.watched.detached,retiredResources:c.resources.watched.entries.length,allRetiredDisposed:c.resources.watched.entries.every(e=>e.disposed),heap:c.heap}));
 for(const c of cycles){assert.ok(c.retiredDetached&&c.allRetiredDisposed);assert.ok(c.mapCount<=2);if(c.cycle===1){const first=cycles.find(x=>x.cycle===0&&x.theme===c.theme);assert.deepEqual(c.memory,first.memory);assert.deepEqual(c.decoder,cycles[4].decoder);assert.equal(c.poseBytes,first.poseBytes);}}
 versions[variant]={cycles,peakJS:Math.max(...r.heaps.map(x=>x.usedSize)),peakBacking:Math.max(...r.heaps.map(x=>x.backingStorageSize)),samples:r.heaps.length,build:r.build.jsSha256};
}
for(let i=0;i<10;i++)for(const key of ['memory','decoder','poseBytes','models','objects','meshes','programs'])assert.deepEqual(versions.final.cycles[i][key],versions.baseline.cycles[i][key],key);
const report={passed:true,versions,method:'Same-page five-map traversal twice, after a common Marine/frontier warmup. Retired roots detached and observed geometry/material/texture disposal events fired. GPU object counts and decoded shared references plateau on the second cycle. Heap samples are one-second CDP observations; disposal events and stable counts do not measure physical VRAM or prove absence of all leaks.'};
await fs.writeFile(root+'/resource-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,baselinePeakJS:versions.baseline.peakJS,finalPeakJS:versions.final.peakJS,baselinePeakBacking:versions.baseline.peakBacking,finalPeakBacking:versions.final.peakBacking,finalCycles:versions.final.cycles.map(c=>({cycle:c.cycle,theme:c.theme,memory:c.memory,decoder:c.decoder}))}));
