import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/t01-20261024/actions-r24-r2',report=JSON.parse(await fs.readFile(root+'/report.json','utf8')),state=JSON.parse(await fs.readFile(root+'/state-recheck-r1.json','utf8'));
const observations=[
 '0.25秒施法者死亡，五枚已发胆汁继续飞行，1.7秒落地，2至2.7秒尾烟，3秒消失；至16秒无技能残留。',
 '五枚胆汁正常飞行，1.7秒落地同时施法者死亡；2至2.7秒烟尾，3秒消失。原生掉落翻牌和新友军另列，至16秒无技能残留。',
 '0.25秒施法者死亡，没有后续三线地刺；原生尸体和掉落后续消失，至16秒无技能残留。',
 '1.35秒施法者死亡后，已提交三线地刺仍完整出现，1.5至1.7秒可见、2秒暗化、2.5秒消失。掉落翻牌遮住部分远端，但三线均可辨；至16秒无技能残留。',
 '0.25秒施法者死亡，没有喷吐或命中效果，至16秒无技能残留。',
 '0.9秒五束绿色喷吐，1.15秒施法者已死亡但已提交尾效继续；1.35秒淡出、1.5秒消失，至16秒无残留。',
 '0.25秒飞龙死亡，没有扇形技能弹；金色死亡粒子约2秒消失，至16秒无技能残留。',
 '1.05秒从空中发射三枚扇形弹，1.15秒施法者死亡后弹体继续降向地面；1.55秒末尾可见、1.7秒技能弹消失，至16秒无残留。',
 '0.25秒飞龙死亡，没有对空扇形弹；原生死亡粒子与掉落另列，至16秒无技能残留。',
 '1.05秒发射三枚对空扇形弹，1.15秒施法者死亡后保持空中高度，1.55秒末尾、1.7秒技能弹消失，至16秒无残留。',
 '0.25秒刺蛇死亡，没有对空扇形弹；掉落招募友军另列，至16秒无技能残留。',
 '1.05秒从地面发射五枚对空扇形弹，1.15秒施法者死亡后继续升向空中目标；1.55秒末尾、1.7秒消失，至16秒无技能残留。',
 '0.25秒精英破坏者死亡，三枚已发胆汁继续飞行；2.7秒落地、3至3.25秒尾烟、4秒消失，至16秒无残留。',
 '三枚胆汁正常飞行，2.7秒落地且施法者死亡，3至3.25秒尾烟、4秒消失，至16秒无技能残留。',
];
assert.equal(report.rows.length,observations.length);assert.equal(state.pass,true);
const review={date:new Date().toISOString(),scope:'Every one of 35 images in each of 14 interrupted native cycles visually inspected. Original five erroneous absolute-counter assertions retained; state recheck is separate. Boss death may produce native loot cards and allied recruits, not counted as enemy skill residue.',rows:[]};
for(const [i,row] of report.rows.entries()){
 assert.equal(state.rows[i].id,row.id);const file=root+'/review-focus/'+row.directory+'.jpg';
 review.rows.push({id:row.id,status:'reviewed',observation:observations[i],images:[{file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')}],stateEvidence:root+'/state-recheck-r1.json',issues:[]});
}
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2),{flag:'wx'});console.log(JSON.stringify({reviewed:review.rows.length,images:35*review.rows.length}));
