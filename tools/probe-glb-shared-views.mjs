import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {assetParts} from './offline-pack.mjs';

// Read-only probe: compare byte-exact chunk boundaries, never re-export a GLB.
const manifest=JSON.parse(await fs.readFile('reports/local/asset-reachability.json','utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
function bufferParts(bytes){
 if(bytes.toString('ascii',0,4)!=='glTF')return [bytes];
 let json,bin=0,length=0;
 for(let at=12;at<bytes.length;){const n=bytes.readUInt32LE(at),kind=bytes.readUInt32LE(at+4);if(kind===0x4e4f534a)json=JSON.parse(bytes.toString('utf8',at+8,at+8+n));if(kind===0x004e4942){bin=at+8;length=n;}at+=8+n;}
 const cuts=new Set([0,bytes.length]);
 for(const view of json?.bufferViews??[]){if(view.buffer!==0)throw Error('External buffer');const start=view.byteOffset??0,end=start+view.byteLength;if(start<0||end>length)throw Error('Invalid buffer view');cuts.add(bin+start);cuts.add(bin+end);}
 const ordered=[...cuts].sort((a,b)=>a-b);return ordered.slice(1).map((end,i)=>bytes.subarray(ordered[i],end));
}
const cache=new Map();
function encodedPart(part){const hash=digest(part);let item=cache.get(hash);if(!item){const gzip=gzipSync(part,{level:9}),stored=gzip.length+24<part.length?gzip.length:part.length;item={hash,bytes:part.length,stored,encoded:Math.ceil(stored/4)*5};cache.set(hash,item);}return item;}
function measure(parts,seen){const entries=parts.map(encodedPart),fresh=new Map();for(const item of entries)if(!seen.has(item.hash))fresh.set(item.hash,item);return {entries,fresh,cost:[...fresh.values()].reduce((n,p)=>n+p.encoded+100,0)+entries.length*8};}
const variants=Object.fromEntries(['image','view','adaptive'].map(id=>[id,{seen:new Set(),estimated:0,stored:0,parts:0,choices:[]} ]));
for(const row of manifest.rows){
 const bytes=await fs.readFile(row.packedFile),images=assetParts(bytes),views=bufferParts(bytes);
 if(!Buffer.concat(views).equals(bytes))throw Error('Byte reconstruction failed '+row.id);
 for(const [id,state] of Object.entries(variants)){
  const image=measure(images,state.seen),view=id==='image'?image:measure(views,state.seen),choice=id==='view'?view:id==='adaptive'&&view.cost<image.cost?view:image;
  state.estimated+=choice.cost;state.parts+=choice.entries.length;
  for(const [hash,item] of choice.fresh){state.seen.add(hash);state.stored+=item.stored;}
  if(id==='adaptive'&&choice!==image)state.choices.push({id:row.id,estimatedSaved:image.cost-choice.cost,parts:choice.entries.length});
 }
}
const report={at:new Date().toISOString(),method:'Exact byte splitting at bufferView boundaries; gzip9+base85 estimated with conservative metadata costs; no package/source mutation',results:Object.fromEntries(Object.entries(variants).map(([id,s])=>[id,{estimated:s.estimated,stored:s.stored,chunks:s.seen.size,parts:s.parts,choices:s.choices}]))};
await fs.writeFile('reports/local/autonomous-closeout/shared-view-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.results).map(([id,{choices,...summary}])=>[id,{...summary,chosenAssets:choices.length}]))));
