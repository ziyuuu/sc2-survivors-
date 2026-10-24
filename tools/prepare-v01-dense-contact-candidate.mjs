import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const base='reports/local/v01-20261024',dir=base+'/dense-contact-candidate',sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(dir,{recursive:false});
const files=['src/simulation/world.ts','src/simulation/movement/contacts.ts'],changes=new Map(),manifest=[];
for(const file of files){const before=await fs.readFile(file,'utf8');let code=before;const replace=(a,b)=>{assert.equal(code.split(a).length,2,a);code=code.replace(a,b);};
 if(file.endsWith('/world.ts')){
  replace("separation(u:Entity){const v={x:0,z:0};let n=0;", "separation(u:Entity){const v={x:0,z:0},scale=this.specialStages.active?.kind==='crossing'?.6:1,opponentPadding=u.team==='player'?Math.min(.15,u.attackRange*.3):.15;let n=0;");
  replace("if(b.id===u.id||equipmentIgnoreContact(this,u,b))return;const dx=", "if(b.id===u.id)return;const dx=");
  replace("(u.team==='player'&&b.owner!==u.owner?Math.min(.15,u.attackRange*.3):.15))*(this.specialStages.active?.kind==='crossing'?.6:1);if(d2<min*min){if(!u.flying", "(b.owner!==u.owner?opponentPadding:.15))*scale;if(d2<min*min){if(equipmentIgnoreContact(this,u,b))return;if(!u.flying");
 }else{
  replace('for(const a of actors){let checked=0;', 'for(const a of actors){const budget=remaining.get(a.id)??0;let checked=0;');
  replace('if(b.heldBy||ignorePair?.(a,b)||a.id===b.id||a.flying!==b.flying||b.hp<=0||actor(b)&&a.id>b.id)return;', 'if(b.heldBy||a.id===b.id||a.flying!==b.flying||b.hp<=0||actor(b)&&a.id>b.id)return;');
  replace('(remaining.get(a.id)??0)+(remaining.get(b.id)??0);if((a.x-b.x)**2+(a.z-b.z)**2>reach*reach||!a.flying', 'budget+(remaining.get(b.id)??0);if((a.x-b.x)**2+(a.z-b.z)**2>reach*reach||ignorePair?.(a,b)||!a.flying');
 }
 changes.set(file,code);const candidate=dir+'/'+path.basename(file);await fs.writeFile(candidate,code,{flag:'wx'});manifest.push({file,candidate,beforeSha256:sha(before),afterSha256:sha(code)});
}
await fs.writeFile(dir+'/manifest.json',JSON.stringify({scope:'Isolated contact-query candidate. Keep visit/correction order, 12/20 limits, geometry, terrain checks and both solver passes. Hoist per-query invariants; defer pure equipment/contact-ignore predicates until overlap/reach admission.',files:manifest},null,2),{flag:'wx'});
for(const variant of ['baseline','candidate'])await build({stdin:{contents:"export {World} from './src/simulation/world';export {ContactSolver} from './src/simulation/movement/contacts';export {SpatialHash} from './src/simulation/movement/spatial-hash';",resolveDir:process.cwd(),loader:'ts'},outfile:dir+'/'+variant+'.mjs',bundle:true,platform:'node',format:'esm',packages:'external',define:{'import.meta.env.PROD':'true'},plugins:variant==='candidate'?[{name:'dense-contact-candidate',setup(b){b.onLoad({filter:/simulation[\\/](world|movement[\\/]contacts)\.ts$/},args=>({contents:changes.get(path.relative(process.cwd(),args.path).replaceAll('\\','/')),loader:'ts',resolveDir:path.dirname(args.path)}));}}]:[]});
console.log(JSON.stringify(manifest));
