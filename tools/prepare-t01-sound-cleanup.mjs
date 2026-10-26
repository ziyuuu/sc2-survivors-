import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root='.cache/t01-sound-recheck',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const baseline=await read(root+'/baseline.json'),registry=await read('deploy/runtime/combat-audio.json'),active=await read('reports/local/t01-20261024/active-source.json'),stage=await read(root+'/stage-assets.json');
const retained=new Set([...registry.records.map(r=>r.packedSha256),...active.resources.map(r=>r.sha256)]);let buffer='',metadata;
for await(const b of createReadStream(baseline.delivery.file,{encoding:'utf8',highWaterMark:1048576})){
 buffer+=b;const i=buffer.indexOf('<script id="sc2-resource-pack"');if(i<0){buffer=buffer.slice(-64);continue;}
 const end=buffer.indexOf('</script>',i);if(end<0)continue;metadata=JSON.parse(buffer.slice(buffer.indexOf('>',i)+1,end));break;
}
assert.ok(metadata);const files=[];
for(const id of stage.removed){const a=metadata.assets[id];assert.ok(a,id);if(retained.has(a.sha256))continue;
 for(const folder of ['public/assets/combat-audio','deploy/runtime/assets']){const file=path.resolve(folder,a.sha256+'.wav');if(await fs.stat(file).catch(()=>null))files.push({file,sha256:a.sha256});}
}
await fs.writeFile(root+'/retired-audio.json',JSON.stringify(files,null,2));console.log(JSON.stringify({files:files.length}));
