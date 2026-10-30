/** Reproduce the code-only Coze v6 increment from the approved source. Does not deploy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve('dist/coze-repair-20261030'),web=root+'/web',packed=root+'/packed',patch=root+'/Coze-Repair-Update';
const bgm=path.resolve('dist/coze-feedback-bgm-20261029/Coze-Feedback-BGM-Update/public'),base=path.resolve('sites/size-optimized-site/public');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sourceCommit='baf0d943fed76a8338310e146f296186d6743934';
assert.equal(execFileSync('git',['diff','--numstat',sourceCommit,'--','src','tools/build-web.mjs','tools/update-compressed-game.mjs','tools/packed-startup.mjs','tools/packed-sites-sw.js'],{encoding:'utf8'}).trim(),'');
const old=await read(bgm+'/web-release.json'),fresh=await read(web+'/web-release.json');
assert.equal(old.appBuildId,'b785addbf5e8ed98de78dd8363d1c9d87cf2a03915c30918df8e2eeef856bc67');
assert.equal(old.release,'50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a');
assert.equal(fresh.appBuildId,'acdcecdc04cf61ebab8822312f20b9a8561eedacfa26d1689dab8f76c2df5f52');
assert.equal(old.runSchema,fresh.runSchema);assert.equal(old.sourceWebRelease,fresh.release);
for(const dir of [packed,patch])assert.equal(await fs.stat(dir).then(()=>true,()=>false),false,'Output already exists: '+dir);
await fs.mkdir(packed+'/assets',{recursive:true});
for(const name of ['web-release.json',old.manifest])await fs.copyFile(bgm+'/'+name,packed+'/'+name);
await fs.copyFile(base+'/sites-pack-index.js',packed+'/sites-pack-index.js');
console.log(execFileSync(process.execPath,['tools/update-compressed-game.mjs',packed,web],{encoding:'utf8'}).trim());
const baseline=async name=>{
 try{return await fs.readFile(bgm+'/'+name);}catch(e){if(e.code!=='ENOENT')throw e;}
 // The working public snapshot is updated after delivery; freeze its v6-era
 // fallback to the source commit so later reproduction still includes new CSS.
 const rel='sites/size-optimized-site/public/'+name;
 if(!execFileSync('git',['ls-tree',sourceCommit,'--',rel],{encoding:'utf8'}).trim())return null;
 return execFileSync('git',['show',sourceCommit+':'+rel],{maxBuffer:16*1024*1024});
};
const files=[],retained=[];
async function walk(folder,rel=''){
 for(const entry of await fs.readdir(folder,{withFileTypes:true})){
  const name=rel+entry.name;if(entry.isDirectory()){await walk(folder+'/'+entry.name,name+'/');continue;}
  const bytes=await fs.readFile(folder+'/'+entry.name),before=await baseline(name);
  if(before&&sha(before)===sha(bytes)){retained.push({path:name,bytes:bytes.length,sha256:sha(bytes)});continue;}
  assert.ok(['index.html','web-release.json'].includes(name)||/^assets\/(?:sc2-entry\.[a-f0-9]+\.js\.gz|index-[A-Za-z0-9_-]+\.(?:js|css))$/.test(name),'Unexpected resource/loader change: '+name);
  await fs.mkdir(path.dirname(patch+'/public/'+name),{recursive:true});await fs.writeFile(patch+'/public/'+name,bytes);
  files.push({path:'public/'+name,bytes:bytes.length,sha256:sha(bytes)});
 }
}
await walk(packed);files.sort((a,b)=>a.path.localeCompare(b.path));
assert.equal(files.length,5);assert.equal(files.filter(f=>f.path.endsWith('.css')).length,1);
const target=await read(packed+'/web-release.json');assert.equal(target.release,old.release);
const manifest={date:'2026-10-30',sourceCommit,status:'Prepared; deployment is separate',compatibility:{origin:'https://sc-survivors.coze.site',version:6,appBuildId:old.appBuildId,resourceRelease:old.release,runSchema:old.runSchema},target,files,retained,
 scope:'Cumulative approved source since v6: unlock feedback, fixed Zerg evolution/melee/equipment, special-stage health, four audited bugs and accepted tank particle fixes. No new resource payloads, no backend/config/schema changes.',
 preserve:['All existing hash resources including two MP3s and 43 standalone KTX2 fallbacks','Existing SW, pack index, Basis decoder, resource manifest','Current server.mjs no-cache rules, domain, authentication, database and player data'],
 rollback:'Back up current index.html and web-release.json and deployment version. Restore these two entry files or prior deployment if needed; retain every old/new immutable file and all data.'};
await fs.writeFile(patch+'/PATCH-MANIFEST.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(patch+'/README.md',`# Coze v6 增量更新\n\n来源Git提交 ${sourceCommit}，体积优化版分支；目标应用 ${target.appBuildId}。资源release仍为 ${old.release}，schema仍为26。\n\npublic/仅5文件增量，合并到现有工程，不替换完整工程。保留v6后端、缓存头修正、域名、认证、数据库、玩家数据、全部旧hash资源、43个KTX2兜底及两首音乐。先核对当前版本与PATCH-MANIFEST.json兼容字段，备份两份入口和部署号，逐文件校验SHA；同一次部署切换新入口。不要直接checkout旧的压缩站点快照替代本包。\n\n上线核验：页面meta及web-release.json均为目标appBuildId；5文件内容、资源manifest与关键依赖SHA匹配（平台HTML注入单列）；web-release/runtime-config继续no-cache，新gzip程序保持原始gzip字节。核验菜单/首战与继续游戏。物理iPhone由原机复测，不能以桌面检查替代。\n\n如失败恢复原部署或两份入口，保留全部资源与玩家数据。\n`);
const zipScript=`from pathlib import Path
import zipfile,hashlib,json,sys
p,z,c=map(Path,sys.argv[1:]); expected={f.relative_to(p).as_posix():f.read_bytes() for f in p.rglob('*') if f.is_file()}
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as a:
 for n in sorted(expected): a.write(p/n,n)
with zipfile.ZipFile(z) as a:
 assert set(a.namelist())==set(expected) and a.testzip() is None
 assert all(a.read(n)==b for n,b in expected.items())
r={'bytes':z.stat().st_size,'sha256':hashlib.sha256(z.read_bytes()).hexdigest(),'entries':len(expected),'readBack':True};c.write_text(json.dumps(r,indent=2)+'\\n');print(json.dumps(r))`;
console.log(execFileSync('python',['-c',zipScript,patch,root+'/Coze-Repair-Update.zip',root+'/CHECKSUMS.json'],{encoding:'utf8'}).trim());
console.log(JSON.stringify({files,appBuildId:target.appBuildId,release:target.release}));
