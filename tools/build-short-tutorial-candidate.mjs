/** Extend verified packed resources with the three advisor portraits. Never mutates the shared Site. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tutorialDistRoot,tutorialVersion} from './tutorial-candidate-paths.mjs';
const baseline='sites/size-optimized-site/public',web=tutorialDistRoot+'/web',out=tutorialDistRoot+'/candidate';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const old=await read(baseline+'/web-release.json'),fresh=await read(web+'/web-release.json'),original=await read(web+'/'+fresh.manifest),prior=await read(baseline+'/'+old.manifest),proof=await read(baseline+'/compressed-resource-provenance.json');
const indexBytes=await fs.readFile(baseline+'/sites-pack-index.js'),index=JSON.parse(indexBytes.toString().replace(/^self.SC2_PACK_INDEX=/,'').replace(/;\s*$/,''));
assert.equal(sha(await fs.readFile(baseline+'/'+old.manifest)),proof.packedManifestSha256);assert.equal(sha(indexBytes),proof.packIndexSha256);
for(const [id,row] of Object.entries(proof.sources))assert.deepEqual(original.assets[id],row,'Existing source changed: '+id);
const added=Object.keys(original.assets).filter(id=>!proof.sources[id]);assert.ok(added.every(id=>/^tutorial\.portrait\.(adjutant|queen|executor)$/.test(id)||/^audio\.tutorial\.voice\.(terran|protoss)\.[a-f0-9]{20}$/.test(id)),'Unexpected new resource');
await fs.mkdir(out+'/assets',{recursive:true});
const files=new Set(Object.values(index).map(row=>'assets/'+row[0]));
for(const row of Object.values(prior.assets)){
 for(const r of [row,...Object.values(row.variants??{})])if(!index[r.url])files.add(r.url);
}
if(prior.gpuTextures)for(const name of ['basis_transcoder.js','basis_transcoder.wasm','README.md','LICENSE.txt'])files.add('basis/'+name);
for(const name of files){assert(!name.includes('..'));const target=out+'/'+name;await fs.mkdir(path.dirname(target),{recursive:true});if(!await fs.stat(target).catch(()=>null)){try{await fs.link(baseline+'/'+name,target);}catch{await fs.copyFile(baseline+'/'+name,target);}}}
const newRows=Object.fromEntries(added.map(id=>[id,original.assets[id]])),bundles=[];let addedResourceTransferBytes=0;
for(const [id,r] of Object.entries(newRows)){
 const b=await fs.readFile(web+'/'+r.url);assert.equal(sha(b),r.sha256);
 const bundle='tutorial-'+id.split('.').at(-1)+'-'+sha(b).slice(0,20)+'.bin';
 index[r.url]=[bundle,0,b.length,r.mime];await fs.writeFile(out+'/assets/'+bundle,b);bundles.push({id,bundle,bytes:b.length});addedResourceTransferBytes+=b.length;
}
const assets={...prior.assets,...newRows},release=sha(JSON.stringify(assets)),manifestName='asset-manifest.'+release+'.json',manifestBytes=Buffer.from(JSON.stringify({...prior,release,assets})),newIndex=Buffer.from('self.SC2_PACK_INDEX='+JSON.stringify(index)+';\n');
await fs.writeFile(out+'/'+manifestName,manifestBytes);await fs.writeFile(out+'/sites-pack-index.js',newIndex);
await fs.writeFile(out+'/web-release.json',JSON.stringify({...old,applicationVersion:tutorialVersion,manifest:manifestName,release,sourceWebRelease:fresh.release,assetCount:Object.keys(assets).length,fileCount:old.fileCount+added.length,assetBytes:old.assetBytes+addedResourceTransferBytes,logicalBytes:old.logicalBytes+addedResourceTransferBytes,packedBytes:old.packedBytes+addedResourceTransferBytes},null,2));
await fs.writeFile(out+'/compressed-resource-provenance.json',JSON.stringify({version:1,sourceRelease:fresh.release,packedRelease:release,packedManifestSha256:sha(manifestBytes),packIndexSha256:sha(newIndex),sources:original.assets}));
await fs.writeFile(out+'/runtime-config.json',JSON.stringify({assetBaseUrl:''}));
execFileSync(process.execPath,['tools/update-compressed-game.mjs',out,web],{stdio:'inherit'});
const report={baselineBuild:old.appBuildId,baselineRelease:old.release,appBuildId:fresh.appBuildId,release,version:tutorialVersion,added:added.map(id=>({id,...newRows[id]})),changedResources:[],reusedResources:Object.keys(prior.assets).length,reusedFiles:[...files],addedResourceTransferBytes,bundles,cache:'All preceding content-hash URLs and bundle bytes retained. New worker/index and entry required. Portraits are separate per-advisor bundles.',publication:'local candidate only'};
await fs.writeFile(out+'/incremental.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report,reusedFiles:files.size}));
