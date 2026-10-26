import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildGallery,visibleVariants,birthAvailable} from './t01/gallery';
import {DYNAMIC_CASES,STATIC_CASES} from './t01/catalogue';
import prototypes from './t01/prototype.generated.json';

const objects=buildGallery(DYNAMIC_CASES),ids=new Set(objects.flatMap(o=>o.actions.flatMap(a=>a.cases.map(c=>c.id))));
assert.equal(new Set(objects.map(o=>o.id)).size,objects.length);
for(const object of objects.filter(o=>o.unit))assert.equal(new Set(object.actions.map(a=>a.name)).size,object.actions.length,'Ambiguous action names: '+object.id);
const hiddenBirth=DYNAMIC_CASES.filter(c=>!c.applicability&&c.action==='spawn'&&!birthAvailable(c));
const missing=DYNAMIC_CASES.filter(c=>!ids.has(c.id)&&!c.applicability&&!hiddenBirth.includes(c));assert.deepEqual(missing,[]);
const marine=objects.find(o=>o.id==='actor:marine')!,raynor=objects.find(o=>o.id==='actor:hero.raynor')!,queen=objects.find(o=>o.id==='enemy:elite:queen')!;
assert.equal(visibleVariants(marine.actions.find(a=>a.id==='idle')!,marine).length,1);
assert.deepEqual(visibleVariants(raynor.actions.find(a=>a.id==='attack')!,raynor).map(c=>c.rank),[1,3,5]);
assert.deepEqual(visibleVariants(queen.actions.find(a=>a.id==='skill')!,queen).map(c=>c.rank),[1,3]);
assert.equal(prototypes.templates.length,STATIC_CASES.length);assert.deepEqual(new Set(prototypes.templates.map(t=>t.id)),new Set(STATIC_CASES.map(c=>c.id)));
for(const t of prototypes.templates){assert.ok(!/<(?:script|canvas|iframe|object|embed)\b/i.test(t.html),t.id);assert.ok(!/\son\w+=/i.test(t.html),t.id);assert.ok(!t.html.includes('blob:'),t.id);}
const baseline=JSON.parse(await fs.readFile('.cache/t01-gallery-20261025/baseline.json','utf8')),changed:string[]=[];let sourceSame=0;
for(const r of baseline.files.filter((r:{file:string})=>r.file.startsWith('src/')||r.file.startsWith('test/'))){if(createHash('sha256').update(await fs.readFile(r.file)).digest('hex')===r.sha256)sourceSame++;else changed.push(r.file);}assert.deepEqual(changed,[]);
const report={pass:true,rawDynamic:DYNAMIC_CASES.length,objects:objects.length,unitObjects:objects.filter(o=>o.unit).length,visibleActions:objects.reduce((sum,o)=>sum+o.actions.length,0),missing:missing.length,hiddenUnsupportedBirth:hiddenBirth.length,prototypeStates:prototypes.templates.length,sourceSame,sourceChanged:changed,checks:['unique-object-identities','raw-case-coverage-with-explicit-birth-applicability','ordinary-rank-merging','hero-III-V-visual-branches','enemy-III-acid-ground-branch','prototype-catalogue-coverage','prototype-no-script-canvas-transient-assets','production-source-and-tests-unchanged']};
await fs.writeFile('.cache/t01-gallery-20261025/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
