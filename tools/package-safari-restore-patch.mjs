/** Prepare a local code-only Coze candidate against the verified packed v16
 * public tree. This neither uploads nor modifies the active Sites snapshot. */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root='dist/safari-stage-20261029/release',base=process.argv[2]??'sites/size-optimized-site/public',packed=root+'/packed',patch=root+'/Coze-Safari-Restore-Candidate';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const old=JSON.parse(await fs.readFile(base+'/web-release.json','utf8'));
if(old.appBuildId!=='fb923fd9ec6430f39c00c0a96400b020a82932ffd4babe4e2a0bbf94a4a457c5')throw Error('Pass the verified version 16 public directory as the first argument; do not generate this historical patch against a newer snapshot');
await fs.mkdir(packed+'/assets',{recursive:true});
for(const file of ['web-release.json',old.manifest,'sites-pack-index.js'])await fs.copyFile(base+'/'+file,packed+'/'+file);
console.log(execFileSync(process.execPath,['tools/update-compressed-game.mjs',packed,root+'/web'],{encoding:'utf8',maxBuffer:1024*1024}));
const changed=[];
async function walk(folder,relative=''){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const rel=relative+entry.name,file=path.join(folder,entry.name);if(entry.isDirectory()){await walk(file,rel+'/');continue;}const bytes=await fs.readFile(file),before=await fs.readFile(base+'/'+rel).catch(()=>null);if(before&&sha(before)===sha(bytes))continue;
 if(!['index.html','web-release.json'].includes(rel)&&!/^assets\/(?:sc2-entry\.[a-f0-9]+\.js\.gz|index-[a-zA-Z0-9_-]+\.(?:js|css))$/.test(rel))throw Error('Unexpected non-code patch: '+rel);
 await fs.mkdir(path.dirname(patch+'/public/'+rel),{recursive:true});await fs.writeFile(patch+'/public/'+rel,bytes);changed.push({path:'public/'+rel,bytes:bytes.length,sha256:sha(bytes)});
}}
await walk(packed);const fresh=JSON.parse(await fs.readFile(packed+'/web-release.json','utf8'));
if(old.release!==fresh.release||old.runSchema!==fresh.runSchema)throw Error('Resource/save contract changed');
const record={date:'2026-10-29',status:'local candidate; original iPhone verification pending; not deployed',baselineAppBuildId:old.appBuildId,appBuildId:fresh.appBuildId,resourceRelease:fresh.release,runSchema:fresh.runSchema,compressedEntrySha256:fresh.compressedEntrySha256,files:changed};
await fs.writeFile(patch+'/PATCH-MANIFEST.json',JSON.stringify(record,null,2)+'\n');
await fs.writeFile(patch+'/README.md',`# Safari 续局资源准备候选\n\n本包修复恢复存档时无条件准备本族全部英雄、精英及无尽资源的问题。画质、玩法、存档格式和资源版本保持。原 iPhone 首关自动刷新根因仍未确认，不能称为实机已修复。\n\n适用基线为已核实的 Coze v5 / Sites 第16版前端，appBuildId：${old.appBuildId}。新 appBuildId：${fresh.appBuildId}。\n\n将 public/ 内文件合并到当前 Coze public/，保留原资源合包、43份独立KTX2、服务器、SW、数据库及玩家数据。新内容hash程序先部署，最后更新 index.html 与 web-release.json。index.html、web-release.json 应返回 no-cache。不要用旧 deploy/coze 前端覆盖当前站点。逐文件长度和SHA见 PATCH-MANIFEST.json。\n\n部署前保存原 index.html 和 web-release.json；回退时恢复这两份入口，保留旧hash程序。不要清浏览器存档。\n\n原机复测：原网址保留现有缓存与存档，刷新后继续游戏通过35%并恢复相同奖励/余额；再测试首关60秒自然结束与进入下一关。记录Safari是否自动刷新及发生阶段。Windows本地首关、同档恢复和资源边界证据见 docs/project/SAFARI_RESTORE_20261029.md。\n\n本包仅本地准备，未推送GitHub、未更新Sites或Coze。\n`);
console.log(JSON.stringify(record,null,2));
