import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='D:/星际',dir=root+'/reports/local/integration-i01-20261022',fun='C:/Users/zyuu/.codex/worktrees/mission/星际';
const sha=b=>b===null?null:createHash('sha256').update(b).digest('hex');
const read=p=>fs.existsSync(p)?fs.readFileSync(p):null;
const m=JSON.parse(fs.readFileSync(dir+'/merge-manifest.json','utf8'));
if(fs.existsSync(dir+'/installed.json'))throw Error('Already installed');
const skipped=['test/special-stage-camera.test.ts'];
const selected=m.files.filter(r=>!skipped.includes(r.path)&&read(dir+'/draft/'+r.path)!==null&&sha(read(dir+'/draft/'+r.path))!==r.main);
for(const r of selected){if(sha(read(root+'/'+r.path))!==r.main)throw Error('Main changed since snapshot '+r.path);if(sha(read(fun+'/'+r.path))!==r.fun)throw Error('Fun changed since snapshot '+r.path);if(read(dir+'/draft/'+r.path).includes(Buffer.from('<<<<<<< MAIN_ACCEPTED')))throw Error('Unresolved '+r.path);}
const installed=[];
for(const r of selected){const bytes=read(dir+'/draft/'+r.path);fs.mkdirSync(path.dirname(root+'/'+r.path),{recursive:true});fs.writeFileSync(root+'/'+r.path,bytes);installed.push({path:r.path,before:r.main,after:sha(bytes),merge:r.action});}
const resources=[];
for(const registry of ['combat-effects','mission-assets','fun-props']){
 for(const r of JSON.parse(fs.readFileSync(root+'/deploy/runtime/'+registry+'.json','utf8')).records){
  const p=root+'/'+r.gitPath,existing=read(p);if(existing){if(sha(existing)!==r.packedSha256)throw Error('Existing asset mismatch '+r.gitPath);continue;}
  const source=read(fun+'/'+r.gitPath);if(sha(source)!==r.packedSha256)throw Error('New asset mismatch '+r.gitPath);
  fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,source);resources.push({path:r.gitPath,bytes:source.length,sha256:sha(source)});
 }
}
const boardFile=root+'/docs/project/performance-board.json',boardBytes=fs.readFileSync(boardFile);fs.writeFileSync(dir+'/board-before.json',boardBytes);
const board=JSON.parse(boardBytes);board.revision++;board.updated='2026-10-22';const task=board.tasks.find(t=>t.id==='I01');task.status='进行中';task.updated=board.updated;task.result='用户于2026-10-22授权合流；两侧工作区已冻结，正在逐段整合和验证。按用户最新要求保持合流前main镜头和操作；第三／四批视觉及MVP后续验收仍开放。';task.steps[1]=task.steps[1].replace('当前仅入板，不执行合并。','本次已授权执行本地源码整合，保留历史冻结输入。');board.scope=board.scope.replace('本次仅补全计划，未启动新增任务。','I01已于2026-10-22按用户授权开始；其他后续项尚未实施。');board.updates.push({date:board.updated,tasks:['I01'],change:task.result,evidence:['FUN_UI_MERGE_GUARD_20261022.md']});fs.writeFileSync(boardFile,JSON.stringify(board,null,2)+'\n');
fs.writeFileSync(dir+'/installed.json',JSON.stringify({at:new Date().toISOString(),installed,resources,skipped,reason:'Historical overview-camera test covers a removed behavior; main camera tests retained byte-for-byte.'},null,2));
console.log(JSON.stringify({sourceFiles:installed.length,newResources:resources.length,resourceBytes:resources.reduce((n,r)=>n+r.bytes,0),skipped}));
