import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const base='reports/local/t01-20261024',root=base+'/actions-r20',read=async f=>JSON.parse(await fs.readFile(f,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const report=await read(root+'/report.json'),review=await read(root+'/visual-review.json');
assert.equal(report.profileClosed,true);assert.equal(report.rows.length,23);assert.equal(report.errors.length,0);assert.equal(review.rows.length,12);
const observations=[
 '查看31帧：虫后远距对地抬爪，细长弹体前行、目标黄绿命中，停火后3.3秒余光减弱、3.6秒后至16秒清除；没有冻结在命中点的长针。近源弹体较细，原全尺寸帧保留。',
 '查看31帧：虫后对空抬爪、细针飞向空中目标并出现黄色命中；3.1秒末次命中、3.3秒后消退，后续至16秒无悬停弹体。对空高度与目标对应。',
 '查看31帧：破坏者普攻橙色火束和目标余焰完整，3秒后普通武器停止；自动胆汁仍按原生逻辑在3.1至6秒及12至14秒再次出现，抛物线与落地冲击/烟尘均可见，16秒无可见残留。此为共用渲染控制，自动胆汁重复不是停火后的冻结。',
 '查看31帧：维京对空射击，0.25至0.5秒蓝白命中扩散，后续重复；末次3.1秒余光后3.3秒画面消退，至16秒未见悬停导弹。3.6秒原生粒子仍有8个，未要求全部粒子与网格同时停止。',
 '查看31帧：使徒白色弹核沿蓝纹轨迹到达地面目标，末次3.1秒飞行、3.3秒蓝色命中，3.6秒后至16秒清除；保留原生短促粒子尾迹。',
 '查看31帧：哨兵蓝色曲折光束连接目标，3.3秒仍有末束，3.6秒缩为源头余光、4秒弱化、4.5秒后至16秒清除；机体自身蓝核保持，不当作残留光束。',
 '查看扩大裁切后的全部31帧，保护罩全轮廓在画内：0.05秒小球渐扩，0.4秒后完整蓝色蜂窝球，12秒仍存在，14与16秒清除。普通攻击光束在3.6至4.5秒收尾，保护罩没有被普攻停火提前截断。',
 '查看31帧：高阶圣堂武士普通电弹与目标处风暴并存，0.5秒后紫蓝电团扩展，持续至6秒，7秒后至16秒清除；风暴完整轮廓在画内，未因3秒停止普通攻击而早停。',
 '查看31帧：虚空辉光舰由空中机首向地面目标持续射出蓝白光束，完整起终点在画内；3.1秒仍连线、3.3秒缩至机首、3.6秒后只剩机体原有尾焰，至16秒无冻结光束。',
 '查看31帧：虚空辉光舰对空水平蓝白光束完整连接目标，末次3.1秒后3.3秒收束为机首蓝点，3.6秒后至16秒无残留连线；机体本身发光保留。',
 '查看31帧：巨像双束向地面目标扫动，离束后的双端火球、烟尘与火星继续变化；末次3秒扫束、3.3至4秒余焰/火星、4.5秒后至16秒清除，未把粒子尾迹随光束网格一起截断。'
];
for(let i=12;i<23;i++){const row=report.rows[i],file=root+'/review-focus/'+row.directory+'.jpg';assert.equal(row.status,'cycle-captured');review.rows.push({id:row.id,condition:'normal',file,sha256:sha(await fs.readFile(file)),observation:observations[i-12],status:'reviewed',at:new Date().toISOString()});}
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2));
const rows=[];
for(let i=0;i<23;i++){
 const row=report.rows[i],file=report.evidenceRoot+'/'+row.directory+'/'+report.evidenceFile,bytes=await fs.readFile(file),e=JSON.parse(gunzipSync(bytes));
 const states=e.frames.map(f=>({at:f.at,shots:f.state.actor.shots,models:f.state.render.sourceCombat.source.modelDraws,flights:f.state.projectiles?.flights,lines:f.state.projectiles?.lines}));
 if(i<12){assert.equal(states.at(-1).shots,1);assert.ok(states.filter(s=>s.at>=.5).every(s=>(s.models.find(m=>m.model==='NeedleSpinesWeapon')?.meshes??0)===0));}
 else {assert.ok(states.filter(s=>s.at>=3.6).every(s=>s.shots===states.at(-1).shots));assert.ok(states.at(-1).models.every(m=>m.meshes+m.particles+m.ribbons+m.projections+m.displacementMeshes+m.displacementQuads===0));}
 rows.push({id:row.id,evidence:{file,sha256:sha(bytes)},states});
}
await fs.writeFile(base+'/ending-mesh-fix-r1/control-state.json',JSON.stringify({scope:'12 single-shot wide-camera supplements and 11 native shared-player controls; not full-catalogue acceptance. Ravager native automatic bile remains active and its later casts are distinguished from ordinary attack tails.',rows},null,2),{flag:'wx'});
console.log(JSON.stringify({reviewed:review.rows.length,singleShot:12,sharedControls:11,errors:0}));
