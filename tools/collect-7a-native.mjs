import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/7a-20261013',labels=['release-native-r7','release-native-r8'],runs=[],sources=[];
for(const label of labels){
 const source=JSON.parse(await fs.readFile(root+'/'+label+'/result.json','utf8'));
 sources.push({label,passed:source.passed,failure:source.failure,runnerHashes:source.runnerHashes});
 for(const row of source.runs){
  if(!row.result.passed)continue;
  assert.equal(row.code,0);assert.equal(row.result.runs.length,1);assert.ok(row.result.runs[0].native.passed);assert.ok(row.result.runs[0].native.sampledSeconds>=180);
  assert.ok(!runs.some(r=>r.name===row.name),'A successful native row must not be replaced or cherry-picked: '+row.name);
  runs.push({...row,sourceSeries:label,sourceRunnerHashes:source.runnerHashes});
 }
}
assert.equal(runs.length,6);
for(const variant of ['baseline','final'])for(const race of ['terran','protoss','zerg'])assert.ok(runs.some(r=>r.name===variant+'-web-'+race+'-native'));
const out=root+'/release-native-final';await fs.mkdir(out);
await fs.writeFile(out+'/result.json',JSON.stringify({passed:true,at:new Date().toISOString(),method:'References the first successfully completed row for each formal version/race. The successful r7 final Terran row is retained; only remaining rows are measured after the r8 native UI-navigation sampler correction. Original failed series and their rows remain unchanged. No timings or raw measurements are copied into invented reruns.',sources,runs},null,2));
await fs.copyFile(new URL(import.meta.url),out+'/collector.mjs');console.log(JSON.stringify({passed:true,runs:runs.map(r=>({name:r.name,source:r.run,sampledSeconds:r.result.runs[0].native.sampledSeconds}))}));
