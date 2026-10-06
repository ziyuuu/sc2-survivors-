import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {createAssetPack} from './offline-pack.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
const sources=JSON.parse(await fs.readFile('.cache/hero-attack-lab/texture-manifest.json','utf8'));
const heroes=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'];
const basic=['flare2b','kenney-smoke_04','kenney-trace_05','energyplane3_red','flare1_blueelec','fireanim_x4','emergytrailcyan','firestreak7','kenney-muzzle_05','kenney-muzzle_03','sparks4','kenney-twirl_01','energyplane3','emergytrailorange','fireball_10'];
const chosen=new Set([...heroes.flatMap(k=>['model.hero.'+k,'hero.'+k]),...['roach','zergling','mutalisk'].flatMap(k=>['model.'+k,'model.'+k+'.death']),'model.tank','model.hellion','model.projectile.marauder','model.projectile.hydralisk','map.terrain.diffuse','fx.blood.0',...basic.map(k=>'fx.hero-basic.'+k)]);
const resources=[],provenance=[];
for(const id of chosen){
 const r=records.find(r=>r.id===id);if(!r||r.status!=='available')throw Error('Missing original '+id);
 const file=id==='map.terrain.diffuse'?'.cache/hero-skill-lab/metal-floor.webp':r.packedFile,bytes=await fs.readFile(file);
 resources.push({id,bytes,mime:r.kind==='model'?'model/gltf-binary':file.endsWith('.webp')?'image/webp':'image/png'});
 provenance.push({id,file,...id==='map.terrain.diffuse'?{sourceFile:r.packedFile,conversion:'Exact original atlas tile (0,1024)-(1024,2048), local lossless WebP, decoded pixels verified'}:id.startsWith('fx.hero-basic.')?{originalTexture:sources.find(s=>s.key===id.slice(14))}:{},sha256:hash(bytes)});
}
const extra=[];
const missileAssets=JSON.parse(await fs.readFile('.cache/hero-combat-lab/upgrade-assets/manifest.json','utf8'));
const missile=missileAssets.find(a=>a.name==='vikingfightermissile');if(!missile)throw Error('Original Viking missile not prepared');
const missileBytes=await fs.readFile(missile.file);if(hash(missileBytes)!==missile.sha256)throw Error('Original missile bytes changed');
resources.push({id:missile.id,bytes:missileBytes,mime:'model/gltf-binary'});chosen.add(missile.id);provenance.push(missile);
for(const key of ['smoke_wispy11','newsmoke01','firetile4']){const source=sources.find(a=>a.key===key);if(!source)throw Error('Missing original upgrade texture '+key);const id='fx.hero-upgrade.'+key,bytes=await fs.readFile(source.file);resources.push({id,bytes,mime:'image/png'});chosen.add(id);extra.push({id,key,sprite:{columns:1,rows:1}});provenance.push({id,...source,sha256:hash(bytes)});}
for(const key of ['flare1','flare1_blueelec','flare2b','fireanim_x4','firestreak7','emergytrailorange','emergytrailcyan','energyplane3','shockwave1_burn1','shockwave_blur1_blue','plasmaanimx1_blue','nebulacloudsalphaparticle_purple','kenney-spark_02','kenney-smoke_04','kenney-twirl_01']){
 const source=sources.find(s=>s.key===key);if(!source)throw Error('Missing texture '+key);
 const id='fx.hero-skill.'+key,bytes=await fs.readFile(source.file);resources.push({id,bytes,mime:'image/png'});chosen.add(id);
 extra.push({id,key,sprite:key==='fireanim_x4'||key==='plasmaanimx1_blue'?{columns:8,rows:4}:key==='nebulacloudsalphaparticle_purple'?{columns:2,rows:2}:{columns:1,rows:1}});provenance.push({id,...source,sha256:hash(bytes)});
}
const {pack,stats}=createAssetPack(resources);
const js=await build({entryPoints:['preview/hero-combat-lab/app.ts'],bundle:true,write:false,format:'iife',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const html=(await fs.readFile('preview/hero-combat-lab/shell.html','utf8')).replace('__IDS__',()=>JSON.stringify([...chosen])).replace('__EXTRAS__',()=>JSON.stringify(extra)).replace('__PACK__',()=>JSON.stringify(pack)).replace('__JS__',()=>js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
const output='dist/Six-Terran-Heroes-Attacks-And-Skills.html';await fs.writeFile(output,html);await fs.mkdir('reports/local/hero-combat-lab',{recursive:true});
const sourceFiles=['app.ts','fixture.ts','attack-simulation.ts','attack-effects.ts','approved-gun-effects.ts','upgrade-materials.ts','tuning.ts','skill-effects.ts','shell.html'];
const sourceHashes={};for(const file of sourceFiles)sourceHashes[file]=hash(await fs.readFile('preview/hero-combat-lab/'+file));
const report={output,bytes:Buffer.byteLength(html),sha256:hash(html),resourceCount:resources.length,pack:stats,provenance,sourceHashes,scope:'Local independent HTML with separate ordinary attack and active skill demonstrations. Original models shared once. New attack mechanics only in preview; no production integration or save access.',delivery:'local_only_by_user_request',swannSource:'Recovered exact first SkillEffects source from this chat, 2026-10-05T00:46:25.940Z. Protection, repair echo, ring geometry/helper and shield shaders retained exactly.'};
report.gunBaseline={source:'src/render/effects/hero-basic-effects.ts',sha256:hash(await fs.readFile('src/render/effects/hero-basic-effects.ts')),raynor:{diameter:.07*2.6,length:1.15},nova:{diameter:.07*1.35,length:2.6},tychus:{diameter:.07*1.2,length:.65},swann:{diameter:.07*1.2,length:.4},tosh:{diameter:.07*1.8,length:.4},yamato_battlecruiser:{diameter:.07*5,length:1.9},preserved:'All six main guns use the copied approved core geometry, dimensions, muzzle/impact/trace and casing methods. Swann retains its original projectile size/pose; Yamato retains both gun mounts. Raynor III–V alone uses the requested burning red material on its unchanged original body. Other tier enhancements are overlays. Side bullets target other enemies; Nova applies DOT along its aimed firing line.'};
report.upgradePresentation={missileSource:missile.original,missileBodySha256:missile.sha256,style:'Original gun feedback preserved. Raynor III–V original body uses animated SC2 firetile4 and flame/ember overlays. Feathered hot secondary bullets, fine anti-aliased violet filaments and multi-color fading firework sparks. Actual SC2 Viking missile body with original material channels; exhaust and smoke authored locally. Fixed right-handed ribbon orientation.',gameplaySourceUnchanged:sourceHashes['attack-simulation.ts'],tuningSourceUnchanged:sourceHashes['tuning.ts'],skillSourceUnchanged:sourceHashes['skill-effects.ts']};
await fs.writeFile('reports/local/hero-combat-lab/build.json',JSON.stringify(report,null,2));console.log(JSON.stringify({output,bytes:report.bytes,sha256:report.sha256,resources:resources.length,deduplicatedBytes:stats.deduplicatedBytes}));
