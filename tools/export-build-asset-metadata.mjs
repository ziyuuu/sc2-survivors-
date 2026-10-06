import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Explicit snapshot from the completed source conversion audit, never inferred.
const catalog=JSON.parse(await fs.readFile('deploy/runtime/source-assets.json','utf8'));
const old=new Map(JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8')).map(r=>[r.id,r]));
const derivatives=new Map(JSON.parse(await fs.readFile('assets/private/m6-texture-webp-manifest.json','utf8')).records.map(r=>[r.id,r]));
const fields=['source','sourcePath','sourceFile','sourceSha256','sourceBuild','optimization','animations','materialPipelineVersion'];
const records=[];
for(const row of catalog.entries){
 const record=old.get(row.runtime.id),bytes=await fs.readFile(row.packedFile);
 if(!record||record.packedFile!==row.packedFile||bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Asset audit does not match current Git bytes: '+row.runtime.id);
 const data={...row.runtime,packedFile:row.packedFile,bytes:row.bytes,packedSha256:row.sha256};
 for(const key of fields)if(record[key]!==undefined)data[key]=record[key];
 if(record.materials)data.materials=record.materials.map(m=>({name:m.name,layers:m.layers.map(l=>({role:l.role,filename:l.filename}))}));
 const derivative=derivatives.get(record.id);if(derivative?.packedFile===row.packedFile)data.textureDerivative={packedFile:derivative.packedFile,sha256:derivative.sha256,sourceFile:derivative.sourceFile,sourceSha256:derivative.sourceSha256};
 records.push(data);
}
await fs.writeFile('deploy/runtime/build-assets.json',JSON.stringify({version:1,records},null,2)+'\n');
console.log(JSON.stringify({records:records.length,bytes:(await fs.stat('deploy/runtime/build-assets.json')).size}));
