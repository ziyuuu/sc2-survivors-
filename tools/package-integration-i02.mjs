import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {createReadStream} from 'node:fs';import assert from 'node:assert/strict';
const root='D:/星际',base=root+'/reports/local/integration-i02-20261022',dest=root+'/preview/integration-i02-20261022',read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
async function hash(f){const h=createHash('sha256');for await(const p of createReadStream(f))h.update(p);return h.digest('hex');}
const verification=await read(base+'/verification.json');assert.ok(verification.pass);await fs.mkdir(dest,{recursive:false});
const shared=[];
for(const version of ['r1','r2'])for(const mode of ['game','lab']){
 const build=await read(base+'/web-'+mode+'-'+version+'-build.json');
 for(const r of build.resources){
  const file=path.resolve(build.out,r.url),donor=path.resolve(root+'/reports/local/integration-i01-20261022/web-game-r2',r.url);assert.ok(file.startsWith(path.resolve(base)+path.sep));
  assert.equal(await hash(donor),r.sha256);assert.equal(await hash(file),r.sha256);const a=await fs.stat(file),b=await fs.stat(donor);
  if(a.ino!==b.ino){const temp=file+'.i02-shared';await fs.link(donor,temp);await fs.rename(temp,file);shared.push({file,donor,bytes:r.bytes});}
 }
}
async function linkTree(source,target){await fs.mkdir(target,{recursive:true});for(const e of await fs.readdir(source,{withFileTypes:true})){const s=source+'/'+e.name,t=target+'/'+e.name;if(e.isDirectory())await linkTree(s,t);else if(e.isFile())await fs.link(s,t);}}
for(const mode of ['game','lab']){
 await linkTree(base+'/web-'+mode+'-r2',dest+'/'+mode);
 await fs.link(base+'/offline-'+mode+'-r2.html',dest+'/'+(mode==='game'?'星际幸存者-I02正式候选.html':'星际幸存者-I02趣味试玩.html'));
 for(const kind of ['web','offline'])await fs.copyFile(base+'/'+kind+'-'+mode+'-r2-build.json',dest+'/'+kind+'-'+mode+'-build.json');
}
await fs.writeFile(dest+'/README.md',`# I02 本地候选 · 2026-10-22\n\n正式普通游戏：game/，或双击「星际幸存者-I02正式候选.html」。\n\n独立39入口试玩：lab/，或双击「星际幸存者-I02趣味试玩.html」。默认无敌可关闭，使用内存账户。\n\n沿用当前main镜头与鼠标左右键／触屏摇杆操作；仅修复特殊关状态与结算边界。\n\n本机预览：正式 http://127.0.0.1:4482/game/ ，试玩 http://127.0.0.1:4482/ 。服务重启：在项目根目录设置I02_VERSION=r2，运行 reports/local/integration-i02-20261022/serve.mjs。\n\n核验与范围见 ../../docs/project/INTEGRATION_I02_20261022.md 。当前为本地候选，未替换Current、提交、推送或发布。I03、第三／四批视觉、T01、自然战役／真机与最终平衡／性能验收保持开放，存档D05仍延期。\n\nWeb资源和离线包使用相同字节硬链接；请勿原地改写哈希命名资源。\n`);
const report={pass:true,dest,sharedFiles:shared.length,sharedBytes:shared.reduce((n,r)=>n+r.bytes,0),shared,delivery:verification.delivery};
await fs.writeFile(base+'/packaging.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,dest,sharedFiles:shared.length,sharedBytes:report.sharedBytes}));
