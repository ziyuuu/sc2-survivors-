import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base='reports/local/t01-20261024',rows=[];
for(const run of ['actions-r4','actions-r5-r2']){
 const report=JSON.parse(await fs.readFile(`${base}/${run}/report.json`,'utf8'));
 for(const row of report.rows){
  const file=`${base}/${run}/${row.directory}/evidence.json`,raw=await fs.readFile(file),e=JSON.parse(raw),a=e.after,out={id:row.id,run,evidence:file,sha256:crypto.createHash('sha256').update(raw).digest('hex'),status:'pending'};
  try{
   assert.equal(row.status,'cycle-captured');assert.equal(a.phase,'battle');assert.equal(a.spells.length,0);assert.equal(a.eliteFields.length,0);assert.equal(a.casts.length,0);
   if(e.case.action==='heal'){assert.ok(e.frames.some(f=>f.actor.healTarget!==null),'Native healing active frame required');assert.equal(a.actor.healTarget,null);assert.ok(Math.abs(a.patient.hp-e.before.initial.patient.maxHp)<1e-6,'Patient must reach full health');out.end={hp:a.patient.hp,maxHp:e.before.initial.patient.maxHp,healTarget:a.actor.healTarget};}
   if(e.case.action==='ability'){assert.ok(e.frames.some(f=>f.actor.cloaked===true));assert.equal(a.actor.cloaked,false);assert.ok(a.receipt.controlledAction.includes('取消隐形'));out.end={cloaked:a.actor.cloaked,cancel:a.receipt};}
   if(e.case.action==='auto-ability'){assert.ok(a.receipt.controlledAction.includes('首轮原生自动施法'));assert.ok(e.frames.some(f=>f.spells.length||f.eliteFields.length)||a.events.some(v=>['storm-start','strategic-impact','barrier-start'].includes(v.kind))||a.patient.hp>e.before.patient.hp);out.end={spells:a.spells.length,fields:a.eliteFields.length,casts:a.casts.length,firstCast:a.receipt};}
   out.status='state-lifecycle-verified';
  }catch(error){out.status='failed';out.failure=String(error);}
  rows.push(out);
 }
}
const report={scope:'Actual native first-effect lifecycle state plus separate per-case visual review. Does not erase the first 0-second terrain readiness gap or certify other ranks/actions.',rows,verified:rows.filter(r=>r.status==='state-lifecycle-verified').length};
await fs.writeFile(`${base}/action-lifecycle-verification-r1.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({total:rows.length,verified:report.verified,failed:rows.filter(r=>r.status==='failed')}));
