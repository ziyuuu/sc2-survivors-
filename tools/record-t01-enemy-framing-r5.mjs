import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',root=base+'/actions-r22-r5',report=JSON.parse(await fs.readFile(root+'/report.json','utf8')),prior=JSON.parse(await fs.readFile(base+'/actions-r22-r4/visual-review.json','utf8'));
const observations=[
 '32帧全部已看。缩小取景后，飞龙包括2/2.55秒的完整翅膀及8秒尾段均在视口内；3秒受益单位移出，无独立光环，原观察保留。',
 '32帧全部已看。0.05秒展开后身体完整，3秒受益单位移出，8秒身体与镰刀均位于HUD上方；无独立光环。',
 '32帧全部已看。身体和转向动作均完整，3秒受益单位移出，8秒完整身体位于HUD上方；无独立光环。',
 '32帧全部已看。缩小取景后8秒身体、腿部和镰刀完整位于HUD上方；3秒受益单位移出，无独立光环，原观察保留。',
];
assert.equal(report.rows.length,4);assert.deepEqual(report.errors,[]);
const review={date:new Date().toISOString(),scope:'Additional camera-only zoom-out using frozen R21 build; all 128 images inspected. Two still-clipped cases and two large-body controls. No production camera or UI changes.',rows:[]};
for(const [i,row] of report.rows.entries()){
 assert.equal(row.status,'cycle-captured');const previous=prior.rows.find(r=>r.id===row.id);assert.ok(previous);const file=root+'/review-focus/'+row.directory+'.jpg';
 review.rows.push({id:row.id,status:'reviewed',observation:observations[i],images:[{file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')}],issues:previous.issues.filter(k=>k!=='T01-FIXTURE-FRAMING'),resolvedIssues:previous.issues.includes('T01-FIXTURE-FRAMING')?['T01-FIXTURE-FRAMING']:[],baseline:base+'/actions-r22-r4/visual-review.json'});
}
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2),{flag:'wx'});console.log(JSON.stringify({reviewed:4,images:128}));
