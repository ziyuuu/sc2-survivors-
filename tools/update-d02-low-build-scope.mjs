import fs from 'node:fs';
const f='tools/build-performance-d02-low.mjs';let s=fs.readFileSync(f,'utf8').replace("const changes=['src/ui/hud.ts'","const changes=['src/simulation/combat/enemy-specials.ts','src/ui/hud.ts'");fs.writeFileSync(f,s);
