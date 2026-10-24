import fs from 'node:fs';
let s=fs.readFileSync('tools/qa-performance-d02-live.mjs','utf8').replaceAll('performance-d02-medium-20261021','performance-d02-low-20261021').replaceAll("'medium'","'low'").replace("??4)","??3)");fs.writeFileSync('tools/qa-performance-d02-low-live.mjs',s);
s=fs.readFileSync('tools/d02-low-browser-helper.mjs','utf8').replace('JSON.stringify({work:phase,...p})','JSON.stringify({step:phase,...p})');fs.writeFileSync('tools/d02-low-browser-helper.mjs',s);
