import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='.cache/t01-gallery-20261025';
await fs.mkdir(root,{recursive:true});
const files=[];
for(const dir of ['src','test','tools/t01'])for(const entry of await fs.readdir(dir,{recursive:true,withFileTypes:true}))if(entry.isFile()){
 const file=(entry.parentPath+'/'+entry.name).replaceAll('\\','/'),bytes=await fs.readFile(file);
 files.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(root+'/baseline.json',JSON.stringify({files},null,2),{flag:'wx'});
const plan={date:'2026-10-25',status:'in-progress',authorization:'用户批准按对象浏览方案，要求先定位出生/待机静止，合并重复等级，交付单个综合离线HTML。静态UI澄清为不接完整业务逻辑的界面原型。',scope:['实际复现并归因出生/待机静止','按对象、动作及有意义视觉分支组织目录，保留内部机制覆盖','单击准备并播放，重播从完整起点开始，暂停/继续/循环/速度','静态页面使用展示数据与原型导航，不调用战斗、购买、存档流程','有限操作/布局/动画与离线验证；用户负责最终画面检查'],retention:'仅保留当前交付、必要输入、简短结论及代码；临时截图、浏览器缓存和被替代构建完成后删除。',gameUiChanged:false,commit:false,push:false,publish:false};
await fs.writeFile('reports/qa/t01-gallery-20261025.json',JSON.stringify(plan,null,2)+'\n');
const path='docs/project/performance-board.json',board=JSON.parse(await fs.readFile(path,'utf8'));
if(board.revision!==198)throw Error('Unexpected board revision');
board.revision=199;board.updated='2026-10-25';board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.title='综合HTML：按单位查看动作与独立UI原型';task.result=plan.authorization;task.evidence.push('../../reports/qa/t01-gallery-20261025.json');board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../reports/qa/t01-gallery-20261025.json']});
await fs.writeFile(path,JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
await fs.writeFile('AGENTS.md','## T01按对象浏览与独立UI原型改造已批准 · 2026-10-25\n\n- '+plan.authorization+'\n- 先做有限原生复现与源动画核对，再修改检测工具；不扩展游戏UI或玩法。用户最终看画面，T01/MVP不提前通过。\n- 看板199；计划 reports/qa/t01-gallery-20261025.json。按最新保留规则清理可复现临时产物，Current保持，未提交/推送/发布。\n\n'+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({board:199,frozen:files.length}));
