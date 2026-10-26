import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/t01-20261024/menu-level-fix-r1',baseline=JSON.parse(await fs.readFile('reports/local/t01-20261024/baseline.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:false});
const edits=[
 {file:'src/ui/native-hud/battle.css',added:'body[data-ui-phase=menu] #interface.native-hud[data-hud-mode] #topbar{display:none}'},
 {file:'src/ui/intermission-skin/presentation.ts',before:"level=(n:number)=>'level'+n",after:"level=(n:number)=>n+'级'"}
];
const files=[];
for(const [i,e] of edits.entries()){
 const after=await fs.readFile(e.file,'utf8'),before=e.added?after.replace(e.added+'\r\n','').replace(e.added+'\n',''):after.replace(e.after,e.before);
 const original=baseline.files.find(f=>f.file===e.file);assert.ok(original);
 assert.equal(sha(Buffer.from(before)),original.sha256,'Exact pre-change baseline reconstruction');
 await fs.writeFile(root+'/before-'+i,before);
 files.push({file:e.file,beforeFile:root+'/before-'+i,beforeSha256:original.sha256,afterSha256:sha(Buffer.from(after))});
}
const changed=[];for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed.sort(),['src/ui/starship/native.css',...edits.map(e=>e.file)].sort());
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
await fs.writeFile(root+'/authorization.json',JSON.stringify({date:new Date().toISOString(),authorization:['确认，只修复菜单战斗条残留','采用，仅替换等级文字'],scope:['菜单、新游戏阵营/难度/出发确认页隐藏战斗条；仅新增一条menu限定样式。','关间卡牌levelN显示改为N级；其他文案、位置、字号保持。'],files,baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},note:'Initial record command had a syntax error before any write. These pre-change copies are reconstructed by reversing the two exact edits and verified byte-for-byte against the existing frozen baseline hashes.',status:'implemented-pending-validation'},null,2));
console.log(JSON.stringify({files:files.map(f=>f.file),unchanged:baseline.files.length-changed.length,currentUnchanged:true}));
