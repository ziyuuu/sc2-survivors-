import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const variant=process.argv[2]??'baseline',kind=process.argv[3]??'logic';
const folder='performance-a02-20261020',root=kind==='web'?'preview/'+folder+'-'+variant:'reports/local/'+folder+'/'+variant+'-'+kind;
const previous='reports/local/performance-l03-20261020/candidate-r1-inputs';
const archive='reports/local/'+folder+'/'+variant+'-'+kind+'-inputs';
const changes=['src/simulation/progression/expedition-drafts.ts'];
const instrumented=kind==='probe'||kind==='web',baseline=variant.startsWith('baseline');
const loaded=new Map(),overrides=[],transforms=[],hash=x=>createHash('sha256').update(x).digest('hex');
await fs.mkdir(root,{recursive:true});
function instrument(file,text){
 if(file==='src/render/effects/confirmed-hero/attack-effects.ts'){
  for(const [guard,name,field]of [["p.hero==='swann'","rockets","rocketCount"],["p.kind==='missile'","missiles","missileCount"],["p.kind==='bounce'","rockets","rocketCount"]]){
   const from=`${guard}&&this.${field}<256`,to=`${guard}&&((globalThis as any).__A02Stats?.active&&(globalThis as any).__A02Stats.capacity('confirmed.'+p.hero+'.${name}',Number(this.${field}<256),Number(this.${field}>=256),Math.min(256,this.${field}+1),256),this.${field}<256)`;
   assert.ok(text.includes(from));text=text.replace(from,to);
  }
 }
 if(file==='src/render/effects/confirmed-hero/approved-gun-effects.ts'){
  const from='if(!visible(p.point)||count>=256)continue;',to="if(!visible(p.point))continue;if((globalThis as any).__A02Stats?.active)(globalThis as any).__A02Stats.capacity('approved.'+id+'.cores',Number(count<256),Number(count>=256),Math.min(256,count+1),256);if(count>=256)continue;";
  assert.ok(text.includes(from));text=text.replace(from,to);
  for(const [field,cap]of [['visualFlights',256],['shells',192]]){
   const from=`if(this.${field}.length>=${cap})this.${field}.shift();`;
   assert.ok(text.includes(from));text=text.replace(from,`if((globalThis as any).__A02Stats?.active)(globalThis as any).__A02Stats.capacity('approved.'+id+'.${field}',1,Number(this.${field}.length>=${cap}),Math.min(${cap},this.${field}.length+1),${cap});`+from);
  }
 }
 if(file==='src/render/effects/confirmed-hero/hero-aura-effects.ts'){
  const from='if(this.count+2>this.mesh.instanceMatrix.count)break;';
  assert.ok(text.includes(from));text=text.replace(from,"if((globalThis as any).__A02Stats?.active)(globalThis as any).__A02Stats.capacity('aura.'+this.ids[0],this.count+2<=18?2:0,Number(this.count+2>18),Math.min(18,this.count+2),18);"+from);
 }
 if(file==='src/render/scene/battle-renderer.ts'){
  const first='  for(const [id,mixer] of this.fortMixers){',last='  for(const [id,death] of this.fortDeathViews){death.mixer.update(fortDt);';
  assert.ok(text.includes(first)&&text.includes(last));
  text=text.replace(first,'  const a02FortAt=(globalThis as any).__A02Stats?.active?performance.now():null;\n'+first)
   .replace(last,'  if(a02FortAt!==null)(globalThis as any).__A02Stats.record("fort.loop",performance.now()-a02FortAt);\n'+last);
 }
 const wrappers=file==='src/simulation/expedition-economy.ts'?[
  ['export function draftContext(w:World):ExpeditionDraftContext','function a02DraftContextNative(w:World):ExpeditionDraftContext','export function draftContext(w:World){return (globalThis as any).__A02Stats?.active?(globalThis as any).__A02Stats.measure("reward.context",()=>a02DraftContextNative(w)):a02DraftContextNative(w);}'],
 ]:file==='src/simulation/progression/expedition-drafts.ts'?[
  ['function reinforcementPool(ctx:ExpeditionDraftContext,shop=false):Candidate[]','function a02ReinforcementNative(ctx:ExpeditionDraftContext,shop=false):Candidate[]','function reinforcementPool(ctx:ExpeditionDraftContext,shop=false):Candidate[]{return (globalThis as any).__A02Stats?.active?(globalThis as any).__A02Stats.measure("reward.fullPool",()=>a02ReinforcementNative(ctx,shop)):a02ReinforcementNative(ctx,shop);}'],
  ["export function drawBossLoot(ctx:ExpeditionDraftContext,receipt:string,fixedRarity?:'purple'|'orange'):ExpeditionReward","function a02BossNative(ctx:ExpeditionDraftContext,receipt:string,fixedRarity?:'purple'|'orange'):ExpeditionReward","export function drawBossLoot(ctx:ExpeditionDraftContext,receipt:string,fixedRarity?:'purple'|'orange'):ExpeditionReward{return (globalThis as any).__A02Stats?.active?(globalThis as any).__A02Stats.measure('reward.boss',()=>a02BossNative(ctx,receipt,fixedRarity)):a02BossNative(ctx,receipt,fixedRarity);}"],
 ]:[];
 for(const [from,to,wrapper]of wrappers){assert.ok(text.includes(from),file+' missing transform');text=text.replace(from,to)+'\n'+wrapper+'\n';}
 return text;
}
const plugin={name:'frozen-l03-with-a02',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let raw=await fs.readFile(a.path);
 if(file.startsWith('src/')&&(baseline||!changes.includes(file))){
  let frozen;try{frozen=await fs.readFile(previous+'/'+file);}catch(error){if(error.code!=='ENOENT')throw error;frozen=raw;}
  if(raw.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(file);
  raw=frozen;
 }
 const contents=instrumented?Buffer.from(instrument(file,raw.toString())):raw;
 if(!contents.equals(raw))transforms.push({file,original:hash(raw),instrumented:hash(contents)});
 loaded.set(path.resolve(a.path),{raw,contents});const ext=path.extname(a.path);
 return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};
});}};
let entry;
if(kind==='web'){
 entry=root+'/main.ts';await fs.writeFile(entry,[
  "import '../../tools/performance-a02-runtime';",
  ...['building-panel','game-shell','text-scale-reference.generated'].map(n=>`import '../../src/ui/presentation/${n}.css';`),
  "import '../../src/render/scene/battle-distress.css';import '../../src/ui/presentation/world-labels.css';",
  "import {startGame} from '../../src/app/start-game';import {installPerformanceA02} from '../../tools/performance-a02-runtime';",
  "import {finishOpening} from '../../src/ui/presentation/opening';",
  "startGame(529).then(installPerformanceA02).catch(e=>{finishOpening();document.querySelector('#interface').textContent=String(e);console.error(e);});",
 ].join('\n'));await fs.copyFile('preview/performance-l03-20261020-candidate-r1/index.html',root+'/index.html');
}else{
 entry=root+'/main.ts';await fs.writeFile(entry,[
  'World|simulation/world','draftContext,developmentOffers,reinforcementOffers,offerEligible,refreshOffers|simulation/expedition-economy',
  'drawBossLoot,drawEquipmentUnitLoot,drawExpeditionReinforcements,canTakeExpeditionOffer|simulation/progression/expedition-drafts',
  'selectRunData|simulation/persistence/run-fields','newEquipmentAccount|simulation/starship/inventory',
  'HEROES,ALL_HERO_IDS|data/heroes','ELITES|data/elites','FAMILIES_BY_RACE|data/races',
  'dropBossLoot,collectBossLoot,settlePendingLoot|simulation/boss-loot',
 ].map(row=>{const [names,file]=row.split('|');return `export {${names}} from '${path.posix.relative(root,'src/'+file+'.ts')}';`;}).join('\n'));
}
const result=await build({entryPoints:[entry],bundle:true,platform:kind==='web'?'browser':'node',format:kind==='web'?'iife':'esm',target:'es2022',outfile:root+(kind==='web'?'/main.js':'/main.mjs'),metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){
 const bytes=loaded.get(path.resolve(file));if(!bytes)continue;
 inputs.push({file,bytes:bytes.raw.length,sha256:hash(bytes.raw),bundledSha256:hash(bytes.contents)});
 const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes.raw);
}
const outputs=[];for(const name of kind==='web'?['index.html','main.css','main.js']:['main.mjs']){
 const bytes=await fs.readFile(root+'/'+name);outputs.push({file:root+'/'+name,bytes:bytes.length,sha256:hash(bytes)});
}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({variant,kind,previous,changes:baseline?[]:changes,overrides,instrumented,transforms,inputs,outputs},null,2)+'\n');
console.log(JSON.stringify({root,inputs:inputs.length,overrides,transforms:transforms.length,outputs}));
