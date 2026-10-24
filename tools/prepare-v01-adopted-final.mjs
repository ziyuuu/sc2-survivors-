import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const source=await fs.readFile('tools/qa-v01-final.mjs','utf8');assert.ok(source.includes("variant:'final-r1'")&&source.includes('offline-game-final-r1.html'));
const code=source.replace("variant:'final-r1'","variant:'background-final-r1'").replace('offline-game-final-r1.html','offline-game-background-final-r1.html').replace('final-terran-r3/cycle0-stage3-archive.json','background-terran-r1/cycle0-stage3-archive.json');
await fs.writeFile('tools/qa-v01-adopted-final.mjs',code,{flag:'wx'});console.log('Prepared normal Web/offline verification using the newly adopted source and its native stage-3 checkpoint.');
