import fs from 'node:fs/promises';
const p='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(p,'utf8'));
if(b.revision!==45)throw Error('Unexpected revision');
for(const id of ['S08','U04']){
 const t=b.tasks.find(t=>t.id===id);t.status='进行中';t.updated='2026-10-20';
 t.result=id==='S08'?'用户批准S08与U04治疗循环音频子项合批。正在核对来源/受益者、动态属性、状态集合的实际扫描与即时失效；尚未实施或验证收益。':'仅治疗循环音频子项已获授权并开始核对；统计/遥测子项仍未开始，不随本批关闭整项。';
}
b.revision++;b.updates.push({date:'2026-10-20',tasks:['S08','U04'],change:'用户批准小合批：S08和U04治疗循环音频扫描进入进行中；同步复核对应审计结论。统计/遥测保持未开始，玩法/频率/存档边界不变。',evidence:['../../src/simulation/combat/team-auras.ts','../../src/render/effects/audio.ts']});
await fs.writeFile(p,JSON.stringify(b,null,2)+'\n');console.log(b.revision);
