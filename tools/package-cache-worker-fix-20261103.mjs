/** Date-scoped local Coze increment. Does not commit, push, or deploy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {packedLauncher} from './packed-startup.mjs';

const base=path.resolve('sites/size-optimized-site/public'),buildRoot=path.resolve('dist/cache-worker-fix-20261103');
const web=buildRoot+'/web',packed=buildRoot+'/packed',root=path.resolve('dist/coze-cache-worker-fix-20261103'),patch=root+'/Coze-Cache-Worker-Fix';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const baseline=JSON.parse(execFileSync('git',['show','b18410e58642d61b94390f2a20d6cc73e8f3428e:sites/size-optimized-site/public/web-release.json'],{encoding:'utf8'})),fresh=await read(web+'/web-release.json');
assert.equal(baseline.appBuildId,'34408a35562ffdf62b278e8a310ae04d06515af98cee00f2c6ab61006922dbab');
assert.equal(baseline.release,'50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a');
assert.equal(fresh.appBuildId,'86c3ca45f17fe278119e0099e023330db4b0140c4c4b8ef7719a35b515889690');
assert.equal(await fs.stat(patch).then(()=>true,()=>false),false,'Current delivery already exists; do not overwrite it');
if(!await fs.stat(packed).then(()=>true,()=>false)){
 await fs.mkdir(packed+'/assets',{recursive:true});
 await fs.writeFile(packed+'/web-release.json',JSON.stringify(baseline,null,2)+'\n');
 for(const name of [baseline.manifest,'sites-pack-index.js','compressed-resource-provenance.json'])await fs.copyFile(base+'/'+name,packed+'/'+name);
 execFileSync(process.execPath,['tools/update-compressed-game.mjs',packed,web],{stdio:'pipe'});
}
const target=await read(packed+'/web-release.json');
assert.equal(target.appBuildId,fresh.appBuildId);assert.equal(target.release,baseline.release);assert.equal(target.runSchema,26);
const html=await fs.readFile(packed+'/index.html','utf8'),launcherName=html.match(/<script type="module"[^>]*src="\.\/([^\"]+\.js)"/)[1],css=html.match(/<link rel="stylesheet"[^>]*href="\.\/([^\"]+\.css)"/)[1];
const indexBytes=await fs.readFile(base+'/sites-pack-index.js'),indexName='sites-pack-index.'+sha(indexBytes).slice(0,20)+'.js';
const index=JSON.parse(indexBytes.toString().trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
const worker=(await fs.readFile('tools/packed-sites-sw.js','utf8')).replace("'./sites-pack-index.js'",JSON.stringify('./'+indexName));
assert.equal(sha(worker),target.packedWorkerSha256);assert.equal(target.packedWorker,'sites-sw.'+sha(worker).slice(0,20)+'.js');
for(const name of [target.packedWorker,'sites-sw.js'])assert.equal(await fs.readFile(packed+'/'+name,'utf8'),worker);
assert.equal(sha(await fs.readFile(packed+'/'+indexName)),sha(indexBytes));
const code='assets/sc2-entry.'+target.compressedEntrySha256.slice(0,16)+'.js.gz';
assert.equal(sha(await fs.readFile(packed+'/'+code)),target.compressedEntrySha256);
assert.equal(await fs.readFile(packed+'/'+launcherName,'utf8'),packedLauncher(path.basename(code),indexName,target.packedWorker));
assert.equal(sha(await fs.readFile(packed+'/'+target.manifest)),sha(await fs.readFile(base+'/'+baseline.manifest)));
const names=[launcherName,code,css,indexName,target.packedWorker,'sites-pack-index.js','sites-sw.js','web-release.json','index.html'],files=[];
assert.equal(new Set(names).size,9);
for(const name of names){
 const bytes=await fs.readFile(packed+'/'+name);await fs.mkdir(path.dirname(patch+'/public/'+name),{recursive:true});await fs.writeFile(patch+'/public/'+name,bytes);
 files.push({path:'public/'+name,bytes:bytes.length,sha256:sha(bytes),role:['index.html','web-release.json'].includes(name)?'switch-last':['sites-sw.js','sites-pack-index.js'].includes(name)?'mutable-compatibility':'immutable'});
}
const manifest=await read(base+'/'+baseline.manifest),retainedNames=new Set([baseline.manifest,'runtime-config.json','basis/basis_transcoder.js','basis/basis_transcoder.wasm',...Object.values(index).map(row=>'assets/'+row[0])]);
for(const row of Object.values(manifest.assets))if(!index[row.url])retainedNames.add(row.url);
const retainedFiles=[];
for(const name of [...retainedNames].sort()){const bytes=await fs.readFile(base+'/'+name);retainedFiles.push({path:name,bytes:bytes.length,sha256:sha(bytes)});}
const gpuFallbacks=[];
for(const asset of Object.values(manifest.gpuTextures??{})){
 const row=index[asset.url];assert(row);const bytes=(await fs.readFile(base+'/assets/'+row[0])).subarray(row[1],row[1]+row[2]);assert.equal(sha(bytes),asset.sha256);
 gpuFallbacks.push({path:asset.url,bytes:asset.bytes,sha256:asset.sha256,required:'Retain the 43 standalone KTX2 fallback files already served by Coze; identical bytes also verified in the existing packs.'});
}
assert.equal(gpuFallbacks.length,43);
const sourceFiles=[];
for(const name of ['src/app/resource-downloads.ts','src/assets/packed-cache.ts','tools/packed-sites-sw.js','tools/packed-startup.mjs','tools/update-compressed-game.mjs']){const bytes=await fs.readFile(name);sourceFiles.push({path:name,bytes:bytes.length,sha256:sha(bytes)});}
const record={date:'2026-11-03',status:'Prepared locally, not deployed',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceWorkingChanges:true,sourceFiles,
 compatibility:{origin:'https://sc-survivors.coze.site',appBuildId:baseline.appBuildId,resourceRelease:baseline.release,runSchema:26,rulesId:'mvp-1.0',assetBaseUrl:''},target,files,retainedFiles,gpuFallbacks,
 activation:{first:files.filter(f=>f.role==='immutable').map(f=>f.path),then:files.filter(f=>f.role==='mutable-compatibility').map(f=>f.path),last:['public/index.html','public/web-release.json'],purgeAllCdnVariants:['/','/index.html','/web-release.json','/runtime-config.json','/sites-sw.js','/sites-pack-index.js'],rollback:'Restore the backed-up deployment or four mutable files (index.html, web-release.json, sites-sw.js and sites-pack-index.js). Keep both generations of immutable files, all databases and player saves.'},
 scope:'Static increment only; existing backend/auth/database/domain/assets remain. The separate /api/config 404 needs Coze route/service verification, not a fabricated enabled response.'};
await fs.writeFile(patch+'/PATCH-MANIFEST.json',JSON.stringify(record,null,2)+'\n');
await fs.copyFile('docs/project/COZE_CACHE_WORKER_FIX_20261103.md',patch+'/README.md');
const zipScript=`from pathlib import Path
import zipfile, hashlib, json, sys
package, archive, checksum = map(Path, sys.argv[1:])
expected = {p.relative_to(package).as_posix():p.read_bytes() for p in sorted(package.rglob('*')) if p.is_file()}
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in expected: z.write(package/name, name)
with zipfile.ZipFile(archive) as z:
    assert set(z.namelist()) == set(expected)
    assert all(z.read(name) == body for name,body in expected.items())
    assert z.testzip() is None
result = {'path':archive.relative_to(Path.cwd()).as_posix(),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'entries':len(expected),'allEntriesReadBack':True}
checksum.write_text(json.dumps(result,indent=2)+'\\n',encoding='utf8')
print(json.dumps(result))
`;
console.log(execFileSync('python',['-c',zipScript,patch,root+'/Coze-Cache-Worker-Fix.zip',root+'/CHECKSUMS.json'],{encoding:'utf8'}).trim());
console.log(JSON.stringify({appBuildId:target.appBuildId,worker:target.packedWorker,files:files.length,retainedFiles:retainedFiles.length,gpuFallbacks:gpuFallbacks.length}));
