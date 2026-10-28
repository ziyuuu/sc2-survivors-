import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=path.resolve(process.argv[2]??'dist/quality-20261028/public'),release=JSON.parse(await fs.readFile(root+'/web-release.json','utf8')),manifest=JSON.parse(await fs.readFile(root+'/'+release.manifest,'utf8'));
const code=await fs.readFile(root+'/sites-pack-index.js','utf8'),index=JSON.parse(code.replace(/^self.SC2_PACK_INDEX=/,'').replace(/;\s*$/,''));
const bundles=new Map(),seen=new Set(),totals={high:0,medium:0,low:0},transfers={};let files=0,models=0;
const rows=Object.values(manifest.assets).flatMap(r=>[r,...Object.values(r.variants??{})]);
for(const row of rows){if(seen.has(row.url))continue;seen.add(row.url);const entry=index[row.url];if(!entry)throw Error('No pack entry '+row.url);const [name,offset,length,,glb]=entry;
 if(!bundles.has(name))bundles.set(name,await fs.readFile(root+'/assets/'+name));let bytes=bundles.get(name).subarray(offset,offset+length);if(glb)bytes=gunzipSync(bytes);
 if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Integrity mismatch '+row.url);
 if(glb){if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(8)!==bytes.length)throw Error('GLB invalid');models++;}files++;
}
for(const tier of Object.keys(totals)){const selected=new Map(Object.values(manifest.assets).map(a=>{const r=a.variants?.[tier]??a;return [r.url,r];}));for(const r of selected.values())totals[tier]+=r.bytes;
 const packs=new Set([...selected.values()].map(r=>index[r.url][0]));transfers[tier]=[...packs].reduce((n,k)=>n+bundles.get(k).length,0);
 if(tier==='low'&&[...packs].some(name=>name.startsWith('bundle-high-')))throw Error('Low tier requires high-only pack');
}
const report={release:release.release,files,models,totals,allContentPackBytes:transfers,checks:['every variant length and SHA256','GLB headers','low excludes high-only packs']};
await fs.writeFile('reports/qa/sites-quality-assets-20261028.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
