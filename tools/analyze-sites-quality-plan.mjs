/** Read-only packed-resource/quality audit. No browser timings or RAM claims. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {renderPixelRatio} from '../src/render/settings/quality.ts';
import {initialMenuAssetIds} from '../src/assets/menu-assets.ts';
import {ASSETS} from '../src/assets/manifest.ts';
const root=process.argv[2]??'sites/size-optimized-site/public';
const output=process.argv[3]??'reports/qa/sites-quality-research-20261028.json';
const read=p=>fs.readFileSync(p,'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(read(path.join(root,'web-release.json'))),manifest=JSON.parse(read(path.join(root,release.manifest)));
const text=read(path.join(root,'sites-pack-index.js')).trim();
if(!text.startsWith('self.SC2_PACK_INDEX='))throw Error('Unexpected pack index');
const index=JSON.parse(text.slice('self.SC2_PACK_INDEX='.length).replace(/;$/,''));
const unique=new Map(Object.entries(manifest.assets).map(([id,a])=>[a.url,{...a,id}]));
const grouped=new Map();for(const [url,row]of Object.entries(index)){const list=grouped.get(row[0])??[];list.push([url,row]);grouped.set(row[0],list);}
const dims=b=>{
 if(b.subarray(1,4).toString()==='PNG')return [b.readUInt32BE(16),b.readUInt32BE(20)];
 if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')return null;
 for(let p=12;p+8<=b.length;){const kind=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),q=p+8;
  if(kind==='VP8X')return [b.readUIntLE(q+4,3)+1,b.readUIntLE(q+7,3)+1];
  if(kind==='VP8 ')return [b.readUInt16LE(q+6)&16383,b.readUInt16LE(q+8)&16383];
  if(kind==='VP8L'){const v=b.readUInt32LE(q+1);return [(v&16383)+1,((v>>>14)&16383)+1];}p=q+n+(n%2);
 }return null;
};
const opus=b=>{let p=0,last=0n,channels=0,skip=0;while(p+27<=b.length&&b.toString('ascii',p,p+4)==='OggS'){const segments=b[p+26],body=p+27+segments;let n=0;for(let i=0;i<segments;i++)n+=b[p+27+i];const g=b.readBigUInt64LE(p+6);if(g!==0xffffffffffffffffn)last=g;if(b.toString('ascii',body,body+8)==='OpusHead'){channels=b[body+9];skip=b.readUInt16LE(body+10);}p=body+n;}return channels?{channels,seconds:Math.max(0,Number(last)-skip)/48000}:null;};
const mime={},imageStats={external:0,embedded:0,unknown:0,maxDimension:0,dimensions:{},embeddedDuplicatesOfExternal:0};
const imageHashes=new Set(),embeddedHashes=[];const audio={files:0,opusFiles:0,seconds:0,decodedPcmBytesAt48kHz:0,unknown:0};
const glbs=[],bundles=[];let verified=0;
const image=(b,embedded)=>{const d=dims(b);if(!d){imageStats.unknown++;return;}imageStats[embedded?'embedded':'external']++;imageStats.maxDimension=Math.max(imageStats.maxDimension,...d);const key=d.join('x');imageStats.dimensions[key]=(imageStats.dimensions[key]??0)+1;if(embedded)embeddedHashes.push(hash(b));else imageHashes.add(hash(b));};
for(const [name,entries]of grouped){const bundle=fs.readFileSync(path.join(root,'assets',name));bundles.push({name,bytes:bundle.length,files:entries.length});for(const [url,[,offset,length,type,gzip]]of entries){const stored=bundle.subarray(offset,offset+length),b=gzip?gunzipSync(stored):stored,a=unique.get(url);if(!a||b.length!==a.bytes||hash(b)!==a.sha256)throw Error('Resource identity mismatch '+url);verified++;
 const stat=mime[type]??={files:0,packedBytes:0,resourceBytes:0};stat.files++;stat.packedBytes+=length;stat.resourceBytes+=b.length;
 if(type.startsWith('image/'))image(b,false);
 if(type.startsWith('audio/')){audio.files++;const o=opus(b);if(o){audio.opusFiles++;audio.seconds+=o.seconds;audio.decodedPcmBytesAt48kHz+=Math.round(o.seconds*48000*o.channels*4);}else audio.unknown++;}
 if(gzip){const n=b.readUInt32LE(12),j=JSON.parse(b.toString('utf8',20,20+n)),binStart=20+n+8;let imageBytes=0;for(const im of j.images??[]){if(im.bufferView===undefined)continue;const v=j.bufferViews[im.bufferView],raw=b.subarray(binStart+(v.byteOffset??0),binStart+(v.byteOffset??0)+v.byteLength);image(raw,true);imageBytes+=raw.length;}glbs.push({id:a.id,bytes:b.length,packedBytes:length,embeddedImageBytes:imageBytes,images:(j.images??[]).length,meshes:(j.meshes??[]).length,animations:(j.animations??[]).length});}
 }}
imageStats.embeddedDuplicatesOfExternal=embeddedHashes.filter(h=>imageHashes.has(h)).length;
const menuIds=initialMenuAssetIds(Object.keys(manifest.assets)),menuUrls=[...new Set(menuIds.map(id=>manifest.assets[id].url))],menuPacks=new Set(menuUrls.map(url=>index[url][0]));
const audioIds=[...ASSETS.values()].filter(a=>a.kind==='audio'&&a.status==='available').map(a=>a.id);
audio.assetIds=audioIds.length;audio.uniqueReferencedFiles=new Set(audioIds.map(id=>manifest.assets[id]?.url)).size;
const html=read(path.join(root,'index.html')),launcherPath=html.match(/<script type="module"[^>]*src="\.\/([^\"]+\.js)"/)[1],launcher=read(path.join(root,launcherPath));
const codePath=launcher.match(/new URL\('\.\/(sc2-entry[^']+\.js\.gz)'/)[1],compressedCode=fs.readFileSync(path.join(root,'assets',codePath));
const report={date:'2026-10-28',scope:'Static source and packed-byte audit; no browser or physical-device timings',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),release,
 sources:Object.fromEntries(['src/render/settings/quality.ts','src/render/scene/battle-renderer.ts','src/assets/http-store.ts','src/assets/persistent-cache.ts','src/render/effects/audio.ts','src/app/asset-readiness.ts','tools/packed-sites-sw.js','tools/packed-startup.mjs','tools/update-compressed-game.mjs'].map(p=>[p,hash(fs.readFileSync(p))])),
 resources:{entries:Object.keys(manifest.assets).length,unique:unique.size,verified,bundles:bundles.length,packedBytes:bundles.reduce((n,b)=>n+b.bytes,0),maxBundleBytes:Math.max(...bundles.map(x=>x.bytes)),mime},
 entry:{file:codePath,packedBytes:compressedCode.length,unpackedBytes:gunzipSync(compressedCode).length},
 images:imageStats,audio,models:{files:glbs.length,embeddedImageBytes:glbs.reduce((n,g)=>n+g.embeddedImageBytes,0),largest:glbs.sort((a,b)=>b.bytes-a.bytes).slice(0,8)},
 coldMenu:{ids:menuIds.length,uniqueFiles:menuUrls.length,packs:menuPacks.size,neededPackedBytes:menuUrls.reduce((n,u)=>n+index[u][2],0),wholePackBytes:bundles.filter(b=>menuPacks.has(b.name)).reduce((n,b)=>n+b.bytes,0),note:'Ideal one-fetch-per-bundle bytes; HTTP cache/eviction/runtime concurrency may change actual transfers.'},
 pixelRatioProbe:[1,2,3].map(dpr=>({dpr,ratios:Object.fromEntries(['native','adaptive','balanced','performance'].map(q=>[q,renderPixelRatio(q,dpr,1440,900)]))})),
 references:['https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory','https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency','https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream','https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer','https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData','https://threejs.org/docs/pages/KTX2Loader.html','https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices','https://www.rfc-editor.org/rfc/rfc7845'],
 limits:['PCM estimate uses unique Opus files, 48 kHz float32 channels; actual AudioContext resamples, not measured process memory.','Image counts enumerate whole distribution, not simultaneous live textures.','Source findings do not prove the cause of a particular phone crash.','No game implementation, build, deployment or player-storage changes.']};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,resources:report.resources,audio,images:{external:imageStats.external,embedded:imageStats.embedded,maxDimension:imageStats.maxDimension,duplicates:imageStats.embeddedDuplicatesOfExternal},coldMenu:report.coldMenu,pixelRatioProbe:report.pixelRatioProbe},null,2));
