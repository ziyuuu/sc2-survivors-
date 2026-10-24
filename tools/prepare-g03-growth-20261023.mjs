import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/g03-growth-consumption-20261023',before=JSON.parse(fs.readFileSync(root+'/before.json','utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.ok(!fs.existsSync(root+'/after.json'),'Do not overwrite frozen candidate');
const changes=before.files.filter(r=>r.file.startsWith('src/')&&sha(r.file)!==r.sha256).map(r=>r.file);
assert.deepEqual(changes.sort(),['src/simulation/starship/attributes.ts','src/simulation/starship/runtime.ts','src/ui/starship/equipment-description.ts','src/ui/starship/legacy-view.ts'].sort());
const files=before.files.filter(r=>r.file.startsWith('src/')).map(r=>({file:r.file,sha256:sha(r.file)}));
for(const row of files){const dest=root+'/after/'+row.file;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(row.file,dest);assert.equal(sha(dest),row.sha256);}
fs.writeFileSync(root+'/after.json',JSON.stringify({files,changed:changes,baseline:before.baseline,current:before.current,scope:'Approved equipment values only; complete frozen source tree used for candidate routes.'},null,2));
for(const sub of ['routes','pilot','logs'])fs.mkdirSync(root+'/'+sub,{recursive:true});
const cases=[];
for(const race of ['terran','zerg','protoss'])for(const difficulty of ['hard','hell'])for(const tier of ['entry','graduation']){
 for(const [version,policy] of [['before','legacy'],['before','spending'],['after','spending']])cases.push({race,difficulty,tier,seed:529,version,policy,group:'paired-primary'});
 cases.push({race,difficulty,tier,seed:530,version:'after',policy:'spending',group:'second-seed'});
}
for(const race of ['terran','zerg','protoss']){
 for(const difficulty of ['easy','normal'])cases.push({race,difficulty,tier:'graduation',seed:529,version:'after',policy:'spending',group:'low-quality-control'});
 cases.push({race,difficulty:'hell',tier:'polluted',seed:529,version:'after',policy:'spending',group:'polluted-origin-supplement'});
}
fs.writeFileSync(root+'/plan.json',JSON.stringify({date:'2026-10-23',cases,scope:{primary:'36 routes: 3 races x hard/hell x entry/graduation x old-values/old-policy, old-values/spending-policy, new-values/spending-policy, seed 529.',supplements:'12 candidate seed 530 + 6 low-quality controls + 3 cleansed polluted-origin orange routes.',end:'18 stages and actual entry to endless; not six-minute endless survival.',budget:'260000 fixed simulation steps, 40 wall minutes per route; failures/censors preserved, never count censor as defeat or pass.',policy:'Same visible-threat combat and mandatory-objective priority across all arms. Spending uses public prices, native quotas, actual supply/training/elite actions and bounded refreshes; no future-RNG inspection.',restrictions:'No extra run wallet, HP lock, hero grants, forced drops or kills; prepared legal initial equipment/account only. No legacy talents enabled. Equipment may change from native drops, set pieces preserved.',interpretation:'Program results do not establish human win rates, easy push-over gameplay or globally optimal gear.'}},null,2));console.log(JSON.stringify({source:files.length,changed:changes,routes:cases.length}));
