import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
let script=await fs.readFile('tools/cleanup-v01-dense-final.ps1','utf8');
const start=script.indexOf('$specs = @('),end=script.indexOf('\n$targets = @()',start);assert.ok(start>=0&&end>start);
script=script.slice(0,start)+`$specs = @(
  @{ run='dense-quality-r1'; profile='dense-quality-r1-profile' },
  @{ run='dense-quality-r2'; profile='dense-quality-r2-profile' }
)
`+script.slice(end);
script=script.replaceAll('dense-final-profile-cleanup.json','dense-quality-profile-cleanup.json').replace('this completed dense diagnostic/comparison batch','this completed high/medium/low preset comparison');
await fs.writeFile('tools/cleanup-v01-dense-quality.ps1',script,{flag:'wx'});
console.log('Prepared two explicit closed-profile targets; no deletion performed.');
