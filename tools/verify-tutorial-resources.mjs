import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root='dist/tutorial-1.1-guided-20261105/candidate',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),r=await read(root+'/web-release.json'),m=await read(root+'/'+r.manifest),oldRoot='sites/size-optimized-site/public',oldR=await read(oldRoot+'/web-release.json'),oldM=await read(oldRoot+'/'+oldR.manifest);
const index=JSON.parse((await fs.readFile(root+'/sites-pack-index.js','utf8')).replace(/^self.SC2_PACK_INDEX=/,'').replace(/;\s*$/,'')),rows=new Map();
for(const row of [...Object.values(m.assets),...Object.values(m.gpuTextures??{})])for(const v of [row,...Object.values(row.variants??{})])rows.set(v.url,v);
for(const [id,row] of Object.entries(oldM.assets))assert.deepEqual(m.assets[id],row,'Old packed resource identity differs: '+id);
const bundles=new Map();for(const row of rows.values()){const p=index[row.url],file=p?'assets/'+p[0]:row.url;const group=bundles.get(file)??[];group.push({row,p});bundles.set(file,group);}
let payloadBytes=0,physicalBytes=0;
for(const [name,group] of bundles){const b=await fs.readFile(root+'/'+name);physicalBytes+=b.length;for(const {row,p} of group){const stored=p?b.subarray(p[1],p[1]+p[2]):b,bytes=row.mime==='model/gltf-binary'&&stored[0]===31&&stored[1]===139?gunzipSync(stored):stored;assert.equal(bytes.length,row.bytes,row.url);assert.equal(sha(bytes),row.sha256,row.url);payloadBytes+=bytes.length;}}
const report={appBuildId:r.appBuildId,release:r.release,logicalAssets:Object.keys(m.assets).length,unchangedOldAssetRecords:Object.keys(oldM.assets).length,uniquePayloadsChecked:rows.size,physicalFilesChecked:bundles.size,physicalBytes,payloadBytes,check:'Every actual high/medium/low and explicit GPU-sidecar slice SHA256/length validated; preceding packed records identical',passed:true};await fs.writeFile('reports/local/tutorial-20261105/resource-integrity.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
