// Read-only local verification of the packed Sites snapshot. No deploy, build or source rewrite.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const snapshot=path.resolve(root,process.argv[2]??'sites/size-optimized-site');
const checkout=path.resolve(root,process.argv[3]??'sites/v04-private-test');
const deployedCommit=process.argv[4]??'ffa349c01b3934fcfd2b320bbfcbc9cef6cdff35';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',maxBuffer:20*1024*1024});
const errors=[];
function inside(base,relative){
 const target=path.resolve(base,relative),rel=path.relative(base,target);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Path outside input: '+relative);
 return target;
}
function walk(dir,prefix=''){
 const rows=[];
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(e.isSymbolicLink())throw Error('Unexpected link: '+path.join(dir,e.name));
  const rel=prefix+e.name;
  if(e.isDirectory())rows.push(...walk(path.join(dir,e.name),rel+'/'));
  else rows.push(rel);
 }
 return rows;
}
const pub=path.join(snapshot,'public');
const release=JSON.parse(fs.readFileSync(path.join(pub,'web-release.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(inside(pub,release.manifest),'utf8'));
const text=fs.readFileSync(path.join(pub,'sites-pack-index.js'),'utf8').trim();
const prefix='self.SC2_PACK_INDEX=';
if(!text.startsWith(prefix))throw Error('Unexpected pack index format');
const index=JSON.parse(text.slice(prefix.length).replace(/;\s*$/,''));
const unique=new Map();
for(const [id,row]of Object.entries(manifest.assets)){
 const old=unique.get(row.url);
 if(old&&(old.sha256!==row.sha256||old.bytes!==row.bytes||old.mime!==row.mime))errors.push({kind:'conflicting-manifest-rows',id,url:row.url});
 unique.set(row.url,row);
}
const bundles=new Map(),ranges=new Map();
let decodedBytes=0,packedBytes=0,models=0;
for(const [url,row]of unique){
 try{
  const spec=index[url];if(!Array.isArray(spec)||spec.length!==5)throw Error('Missing/invalid pack index entry');
  const [name,offset,length,mime,gzippedModel]=spec;
  if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<=0)throw Error('Invalid range');
  let bundle=bundles.get(name);if(!bundle){bundle=fs.readFileSync(inside(path.join(pub,'assets'),name));bundles.set(name,bundle);}
  if(offset+length>bundle.length)throw Error('Range exceeds bundle');
  if(mime!==row.mime)throw Error('MIME differs');
  const bytes=bundle.subarray(offset,offset+length);
  const data=gzippedModel&&bytes[0]===31&&bytes[1]===139?zlib.gunzipSync(bytes):bytes;
  if(data.length!==row.bytes)throw Error('Decoded length differs');
  if(sha(data)!==row.sha256)throw Error('Decoded SHA-256 differs');
  if(url.endsWith('.glb')){
   models++;
   if(data.length<12||data.toString('ascii',0,4)!=='glTF'||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw Error('Invalid GLB header');
  }
  decodedBytes+=data.length;packedBytes+=length;
  if(!ranges.has(name))ranges.set(name,[]);ranges.get(name).push([offset,length]);
 }catch(e){errors.push({kind:'resource',url,error:String(e.message)});}
}
for(const key of Object.keys(index))if(!unique.has(key))errors.push({kind:'index-extra',url:key});
for(const [name,rows]of ranges){let end=0;for(const [offset,length]of rows.sort((a,b)=>a[0]-b[0])){if(offset!==end)errors.push({kind:'bundle-gap-or-overlap',name,offset,expected:end});end=offset+length;}if(end!==bundles.get(name).length)errors.push({kind:'bundle-tail',name,end,actual:bundles.get(name).length});}
const physicalBundles=fs.readdirSync(path.join(pub,'assets')).filter(n=>/^bundle-.*\.bin$/.test(n));
for(const name of physicalBundles)if(!bundles.has(name))errors.push({kind:'unused-bundle',name});
const tracked=git(checkout,'ls-files','-z').split('\0').filter(Boolean),trackedSet=new Set(tracked),different=[],missing=[],lineEndingOnly=[];
for(const rel of tracked){
 const left=inside(checkout,rel),right=inside(snapshot,rel);
 if(!fs.existsSync(right)){missing.push(rel);continue;}
 const a=fs.readFileSync(left),b=fs.readFileSync(right);
 if(a.equals(b))continue;
 // Preserve the raw mismatch in the result; normalize only proven UTF-8 text CRLF.
 const textA=a.toString('utf8'),textB=b.toString('utf8');
 if(!a.includes(0)&&!b.includes(0)&&Buffer.from(textA).equals(a)&&Buffer.from(textB).equals(b)&&textA.replaceAll('\r\n','\n')===textB.replaceAll('\r\n','\n'))lineEndingOnly.push(rel);
 else different.push(rel);
}
const extras=walk(snapshot).filter(p=>!trackedSet.has(p));
const commitDiff=git(checkout,'diff','--name-only','-z',deployedCommit,'HEAD').split('\0').filter(Boolean);
const productionCommitDiff=commitDiff.filter(p=>p!=='VERSION-体积优化版.md');
const localSourceChanges=git(checkout,'status','--porcelain').trim();
const rootGameDiff=git(root,'diff','--name-only','main..HEAD','--','src','test').trim();
if(missing.length||different.length||extras.length)errors.push({kind:'snapshot',missing,different,extras});
if(productionCommitDiff.length||localSourceChanges)errors.push({kind:'deployed-source-drift',productionCommitDiff,localSourceChanges});
if(rootGameDiff)errors.push({kind:'root-game-source-diff',files:rootGameDiff});
const measured={assetCount:Object.keys(manifest.assets).length,fileCount:unique.size,assetBytes:decodedBytes,logicalBytes:Object.values(manifest.assets).reduce((sum,row)=>sum+row.bytes,0)};
measured.sharedBytes=measured.logicalBytes-measured.assetBytes;
const metadataMismatches=Object.entries(measured).filter(([key,value])=>release[key]!==value).map(([field,actual])=>({field,recorded:release[field],actual}));
const publicFiles=walk(pub);
const result={scope:'Read-only packed resource and local source correspondence; no runtime, visual, audio or cloud database replay',snapshot:path.relative(root,snapshot).replaceAll('\\','/'),checkout:path.relative(root,checkout).replaceAll('\\','/'),deployedCommit,checkoutCommit:git(checkout,'rev-parse','HEAD').trim(),snapshotFiles:tracked.length,snapshotDifferences:{missing,different,extras,rawByteEqual:tracked.length-missing.length-different.length-lineEndingOnly.length,lineEndingOnlyCount:lineEndingOnly.length,lineEndingOnly},commitDiff,rootGameDiff:rootGameDiff?rootGameDiff.split('\n'):[],resources:{...measured,packIndexEntries:Object.keys(index).length,bundles:bundles.size,packedBytes,modelsWithValidHeader:models,publicFiles:publicFiles.length,publicBytes:publicFiles.reduce((sum,p)=>sum+fs.statSync(inside(pub,p)).size,0),release:manifest.release,releaseMatchesDescriptor:manifest.release===release.release},metadataMismatches,errors,passed:errors.length===0&&metadataMismatches.length===0&&manifest.release===release.release};
console.log(JSON.stringify(result,null,2));
if(!result.passed||metadataMismatches.length)process.exitCode=1;
