import fs from 'node:fs';
for(const p of ['confirmed-hero/attack-effects.ts','confirmed-hero/skill-effects.ts','confirmed-hero/hero-aura-effects.ts','protoss-hero-effects.ts','zerg-hero-effects.ts']){const f='src/render/effects/'+p,s=fs.readFileSync(f,'utf8').replace(/((?:this\.)?view)\.effectScene/g,'($1.effectScene??$1.scene)');fs.writeFileSync(f,s);}
