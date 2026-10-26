import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='.cache/t01-audio',sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:true});
const files=[];
async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else files.push({file:p,sha256:sha(await fs.readFile(p))});}}
if(!await fs.stat(root+'/baseline.json').catch(()=>null)){
 await scan('src');await scan('test');
 await fs.writeFile(root+'/baseline.json',JSON.stringify({date:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files},null,2));
}
const previous=JSON.parse(await fs.readFile('reports/qa/t01-nuke-beams-20261025.json','utf8'));
const plan={date:new Date().toISOString(),status:'in-progress',authorization:'开始吧。另外刚刚那批修复先并入游戏。然后进行全量音效补齐与兴奋剂表现修复。',scope:['全量适用攻击/命中/死亡音效','18英雄普攻及技能音效','原版兴奋剂启动/结束表现'],previousIntegration:{status:'present-in-production-source',sourceFiles:['src/render/effects/source-combat-effects.ts','src/render/effects/source/weapon-channels.ts','src/render/effects/source/player.ts','src/simulation/combat/shop-support.ts'],validation:'reports/qa/t01-nuke-beams-20261025.json',acceptedByUser:true,entry:'src/render/scene/battle-renderer.ts',separatePreviewImplementation:false},mechanics:'只读事件与既有状态；不改变扣血/攻速/移速/持续时间、伤害或冷却',remainingOutsideScope:['截击机比例','模型取景','动态目录清理'],validationPending:true,retention:'保留最新综合HTML、必要输入和简要结论；完成后清理临时产物',previousBoardRevision:previous.boardRevision};
await fs.writeFile('reports/qa/t01-audio-stim-20261025.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({baseline:files.length,productionIntegrated:plan.previousIntegration.sourceFiles}));
