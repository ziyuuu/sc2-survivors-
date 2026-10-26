import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',read=async name=>JSON.parse(await fs.readFile(base+'/'+name,'utf8'));
const files=['enemy-branches-audit-r5-before.json','enemy-branches-audit-r5-after.json'],[a,b]=await Promise.all(files.map(read));
const prior=new Map([...a.rows,...a.failures].map(r=>[r.id,r]));
let presentationAdditions=0;
const rows=[...b.rows,...b.failures].map(r=>{
 const old=prior.get(r.id);assert.ok(old);
 const after=structuredClone(r);
 if(after.receipt?.firstCast?.visual){assert.equal(old.receipt?.firstCast?.visual,undefined);delete after.receipt.firstCast.visual;presentationAdditions++;}
 if(after.state?.receipt?.firstCast?.visual){assert.equal(old.state?.receipt?.firstCast?.visual,undefined);delete after.state.receipt.firstCast.visual;}
 return {id:r.id,statsEqual:isDeepStrictEqual(old.stats,r.stats),initialEqual:isDeepStrictEqual(old.initial,r.initial),finalEqual:isDeepStrictEqual(old.final,r.final),completeRowEqual:isDeepStrictEqual(old,after)};
});
assert.equal(rows.length,2633);
const differences=rows.filter(r=>!r.completeRowEqual);
const evidence=await Promise.all(files.map(async file=>({file:base+'/'+file,sha256:createHash('sha256').update(await fs.readFile(base+'/'+file)).digest('hex')})));
const result={scope:'Same audit fixture with per-case fixed runId, old frozen EnemySpecials source versus current source. Compare entire native audit rows except newly added firstCast.visual presentation metadata in the receipt and its failure-state duplicate. This is not full World equality or visual acceptance.',evidence,rows,differences,presentationAdditions,passed:b.rows.length,retainedFailures:b.failures.map(r=>({id:r.id,error:r.error})),previousComparison:'reports/local/t01-20261024/enemy-visual-fix-r1/native-comparison.json',previousDifferenceCause:'The earlier audit allowed crypto-generated runId values. Death-triggered boss receipts used that runId when choosing loot variants; collected loot could recruit different allied units. Fixing the fixture runId removes the 22 observed damage differences without changing production gameplay.',retainedComparisonFailure:'native-comparison-fixed.json did not remove the duplicated firstCast.visual field in 10 failure-state receipts; its 2633 stats comparisons already matched.'};
await fs.writeFile(base+'/enemy-visual-fix-r1/native-comparison-fixed-r2.json',JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,differences,presentationAdditions,passed:b.rows.length,retainedFailures:b.failures.length}));
assert.equal(differences.length,0);assert.equal(b.failures.length,10);
