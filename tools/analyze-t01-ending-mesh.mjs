import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const old=await read(base+'/actions-r18/report.json'),review=await read(base+'/actions-r18/visual-review.json');
const catalogue=await read('src/render/effects/source/catalog.json'),def=catalogue.NeedleSpinesWeapon;
assert.equal(sha(await fs.readFile(def.source)),def.sourceSha256);
const rows=[];
for(const row of old.rows){
 const raw=await fs.readFile(old.evidenceRoot+'/'+row.directory+'/'+old.evidenceFile),e=JSON.parse(gunzipSync(raw));
 const tail=e.frames.filter(f=>f.at>=3.3).map(f=>({at:f.at,shots:f.state.actor.shots,pose:f.state.presentation?.action,needleMeshes:f.state.render.sourceCombat.source.modelDraws.find(d=>d.model===def.id)?.meshes??0,needleRequests:f.state.render.sourceCombat.source.activeRequests.filter(k=>k.includes(def.id))}));
 const residual=tail.filter(t=>t.at>=3.6&&t.needleMeshes>0);
 rows.push({id:row.id,evidence:old.evidenceRoot+'/'+row.directory+'/'+old.evidenceFile,sha256:sha(raw),tail,residualAfter3_6:residual.length>0});
 if(residual.length)Object.assign(review.rows.find(v=>v.id===row.id),{issue:'T01-SOURCE-DEATH-MESH',status:'issue',resolved:false});
}
const original=old.evidenceRoot+'/0001/003-0.15.jpg';
Object.assign(review.rows.find(r=>r.id===old.rows[0].id),{supplements:[{file:original,sha256:sha(await fs.readFile(original))}],supplementObservation:'已在首次审查中查看0.15秒原尺寸图和三页完整视口；近距两身体遮挡仍需密帧。'});
await fs.writeFile(base+'/actions-r18/visual-review.json',JSON.stringify(review,null,2));
const result={issue:'T01-SOURCE-DEATH-MESH',source:def.source,sourceSha256:def.sourceSha256,clips:def.materialProfile.clips.map(c=>({name:c.name,duration:c.duration})),particles:def.particles.length,ribbons:def.ribbons.length,clockRate:1.4,cause:'The loop owner submits its selected Death mesh until sourceLife (Stand plus Death), while sourcePhase clamps playback at the Death end pose. The mesh should stop at Death.duration; pre-existing and Death-emitted particles retain their individual lifetimes.',frozenBuild:base+'/actions-r18/frozen-web/build.json',rows,residualRows:rows.filter(r=>r.residualAfter3_6).length};
await fs.writeFile(base+'/ending-mesh-fix-r1/before-analysis.json',JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,residualRows:result.residualRows,reviewed:review.rows.length}));
