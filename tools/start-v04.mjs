import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='.cache/v04-20261027';await fs.mkdir(root,{recursive:true});
const hash=async p=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
async function scan(dir){const rows=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())rows.push(...await scan(p));else rows.push({file:p,bytes:(await fs.stat(p)).size,sha256:await hash(p)});}return rows;}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024}).trim();
assert.equal(git('branch','--show-current'),'main');assert.equal(git('diff','--name-only','--','src','test'),'');
const current='dist/SC2-Survivors-Current-20261006.html',t01='reports/local/t01-20261024/offline-r33/T01-综合检测.html';
const baseline={date:'2026-10-27',authorization:'那就开始V04，完成打包和验证，先不要部署发布。',head:git('rev-parse','HEAD'),source:[...await scan('src'),...await scan('test')],mirror:await scan('deploy/coze'),current:{file:current,sha256:await hash(current)},t01:{file:t01,sha256:await hash(t01)},web:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),status:git('status','--porcelain=v1','-z','-uall').split('\0')};
await fs.writeFile(root+'/baseline.json',JSON.stringify(baseline,null,2),{flag:'wx'});
const p='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(p,'utf8'));assert.equal(b.revision,217);b.revision=218;b.updated='2026-10-27';b.next='V04';const t=b.tasks.find(t=>t.id==='V04');assert.equal(t.status,'待办');t.status='进行中';t.updated=b.updated;t.result='用户批准V04本地同版打包与验证；生成命名Web、离线HTML、既定应用及资源包，检查入口/恢复/更新/回退和资源绑定；不部署发布、不推送，不修改现有Current或应用镜像。';b.updates.push({date:b.updated,tasks:['V04'],change:t.result,evidence:[]});await fs.writeFile(p,JSON.stringify(b,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
console.log(JSON.stringify({head:baseline.head,sourceFiles:baseline.source.length,mirrorFiles:baseline.mirror.length,board:218}));
