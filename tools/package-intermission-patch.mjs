/** Code-only packed frontend update. Does not deploy or touch server/player data. */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const root='dist/intermission-release-20261029',base='sites/size-optimized-site/public',packed=root+'/packed',patch=root+'/Coze-Intermission-Update',sha=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await fs.readFile(base+'/web-release.json','utf8'));
assert.equal(old.appBuildId,'820a6f82e6dabc06629c36b70df967bd6a272ba76331759b767f677e7f98180c','Use the prior Safari candidate snapshot; this date-specific packager is not an arbitrary updater');
await fs.mkdir(packed+'/assets',{recursive:true});
for(const name of ['web-release.json',old.manifest,'sites-pack-index.js'])await fs.copyFile(base+'/'+name,packed+'/'+name);
console.log(execFileSync(process.execPath,['tools/update-compressed-game.mjs',packed,root+'/web'],{encoding:'utf8',maxBuffer:1024*1024}));
const fresh=JSON.parse(await fs.readFile(packed+'/web-release.json','utf8')),files=[];
assert.equal(fresh.release,old.release);assert.equal(fresh.runSchema,old.runSchema);
async function walk(folder,rel=''){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const name=rel+entry.name;if(entry.isDirectory()){await walk(path.join(folder,entry.name),name+'/');continue;}const bytes=await fs.readFile(path.join(folder,entry.name)),previous=await fs.readFile(base+'/'+name).catch(()=>null);if(previous&&sha(previous)===sha(bytes))continue;
 if(!['index.html','web-release.json'].includes(name)&&!/^assets\/(?:sc2-entry\.[a-f0-9]+\.js\.gz|index-[a-zA-Z0-9_-]+\.(?:js|css))$/.test(name))throw Error('Unexpected non-code patch '+name);
 await fs.mkdir(path.dirname(patch+'/public/'+name),{recursive:true});await fs.writeFile(patch+'/public/'+name,bytes);files.push({path:'public/'+name,bytes:bytes.length,sha256:sha(bytes)});
}}
await walk(packed);
const record={date:'2026-10-29',status:'local verified-source frontend package; not deployed',baselineAppBuildIds:['fb923fd9ec6430f39c00c0a96400b020a82932ffd4babe4e2a0bbf94a4a457c5',old.appBuildId],appBuildId:fresh.appBuildId,resourceRelease:fresh.release,runSchema:fresh.runSchema,compressedEntrySha256:fresh.compressedEntrySha256,files};
await fs.writeFile(patch+'/PATCH-MANIFEST.json',JSON.stringify(record,null,2)+'\n');
await fs.writeFile(patch+'/README.md',`# Coze 关间准备优化更新\n\n包含关间音频重复解码修复及上一批Safari续局资源准备修复。保留原音源、画质、玩法、schema 26、现有域名、服务器、数据库与玩家数据。原iPhone仍待复测。\n\n适用已核对的Coze v5/Sites第16版或Safari候选；资源release必须为 ${fresh.release}。目标appBuildId为 ${fresh.appBuildId}。\n\npublic/是增量覆盖，不是完整站点。先核对PATCH-MANIFEST.json并备份当前index.html和web-release.json；先上传assets/内新hash程序，最后切换index.html与web-release.json。保留旧hash文件、资源合包、43份独立KTX2、索引、SW、basis和现有后台。index.html/web-release.json必须返回no-cache。更新成功后，核对页面meta与web-release.json均为目标appBuildId、主程序SHA与清单一致。失败则恢复原两份入口文件。\n\n原手机使用原网址，先在设置导出存档；不清站点数据/缓存，不导入测试档。关闭其他游戏标签后重新打开。验证继续游戏、余额/装备、连续两个关间，以及已有无尽存档的后续关间。第一次需要新资源仍可能加载。记录是否自动刷新、停留阶段及大概时间。\n\n本包没有执行线上部署；完整说明见仓库docs/project/COZE_INTERMISSION_UPDATE_20261029.md。\n`);
console.log(JSON.stringify(record,null,2));
