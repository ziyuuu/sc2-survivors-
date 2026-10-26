import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
async function edit(file,changes){let s=await fs.readFile(file,'utf8');for(const [from,to]of changes){assert.ok(s.includes(from),file+': '+from.slice(0,70));s=s.replaceAll(from,to);}await fs.writeFile(file,s);}
await edit('test/queen-corrosion.test.ts',[[`Math.max(.5,cast.corruptionDot!)`,`cast.corruptionDot!`],[`Math.max(.5,f.cast.corruptionDot!)`,`f.cast.corruptionDot!`],[`copy.updateUnit=()=>{};`,`copy.updateUnit=()=>{};copy.paused=false;`]]);
await edit('tools/t01/enemy-catalogue.ts',[
 [`function skills(formPrefix='',mode=enemy.mode){\n  const kind=enemySkill(tier,family,mode),`,`function skills(formPrefix='',mode=enemy.mode,override?:EnemySkill){\n  const kind=override??enemySkill(tier,family,mode),`],
 [` skills();\n if(family==='queen')`,` skills();\n if(family==='queen'&&tier!=='elite')skills('corrosive-bile:',enemy.mode,'bile');\n if(family==='queen')`],
 [`(formPrefix?'地表 · ':'')`,`(formPrefix==='form:lurker:'?'地表 · ':'')`]
]);
await edit('tools/t01/enemy-fixture.ts',[
 [`actor.specialReady=Infinity;actor.abilityReady=Infinity;`,`actor.specialReady=Infinity;actor.corrosiveBileReady=Infinity;actor.abilityReady=Infinity;`],
 [`if(c.action==='skill')u.specialReady=w.time;`,`if(c.action==='skill'){if(u.unitType==='queen'&&u.enemyTier!=='elite'&&p.spec.skill==='bile')u.corrosiveBileReady=w.time;else u.specialReady=w.time;}`],
 [`p.receipt.firstCast=structuredClone(cast);u.specialReady=Infinity;`,`p.receipt.firstCast=structuredClone(cast);u.specialReady=Infinity;u.corrosiveBileReady=Infinity;`]
]);
await edit('tools/run-t01-mechanic-tests.mts',[
 [`const root='reports/local/t01-20261024/mechanics-20261025';`,`const root=process.argv[2]??'reports/local/t01-20261024/mechanics-20261025';`],
 [`const currentEffects=`,`for(const file of ['test/queen-corrosion.test.ts','test/t01-enemy-status-contracts.test.ts'])files.add(file);\nconst currentEffects=`]
]);
await edit('tools/t01/audit-enemy-branches.ts',[
 [`maxAura:{armor:0,damage:0,speed:0},`,`maxAura:{armor:0,damage:0,speed:0},maxCorruption:0,`],
 [`const u=w.entities.get(p.actor.id),patient=w.entities.get(p.patientId),s=w.enemySpecials;`,`const u=w.entities.get(p.actor.id),patient=w.entities.get(p.patientId),s=w.enemySpecials;\n   const witness=p.receipt.groundWitnessId??p.targetId;if(witness)stats.maxCorruption=Math.max(stats.maxCorruption,w.statuses.value(witness,'corruption',w.time));`],
 [`else assert.ok(stats.damage>0,'Native special did not damage a witness');`,`else {assert.ok(stats.damage>0,'Native special did not damage a witness');if(c.family==='queen'&&p.spec.skill==='bile'){assert.ok(stats.maxCorruption>0,'Queen bile never applied healing suppression');assert.equal(p.receipt.firstCast.damage,0,'Queen bile must have zero direct impact damage');}}`]
]);
