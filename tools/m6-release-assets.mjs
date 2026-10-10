/** M6 release reachability. This only selects packaged bytes; source art is untouched. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ALL_FAMILIES} from '../src/data/races.ts';
import {HEROES} from '../src/data/heroes.ts';
import {ELITES} from '../src/data/elites.ts';
import {RETIRED_ASSETS} from '../src/assets/retired.ts';
import {CAMPAIGN_MAP_ID,MAP_THEMES} from '../src/data/campaign-map.ts';
import {loadBuildAssets} from './load-build-assets.mjs';

const records=await loadBuildAssets();
const textureDerivatives=new Map(records.filter(record=>record.textureDerivative).map(record=>[record.id,record.textureDerivative]));
const available=records.filter(record=>record.status==='available');
const byId=new Map(available.map(record=>[record.id,record]));
const reasons=new Map();
const requireAsset=(id,reason)=>{
 if(!byId.has(id))throw Error(`M6 release asset missing: ${id} (${reason})`);
 const list=reasons.get(id)??[];if(!list.includes(reason))list.push(reason);reasons.set(id,list);
};
const useIfPresent=(id,reason)=>{if(byId.has(id))requireAsset(id,reason);};
for(const r of available.filter(r=>r.kind==='ui-art'))requireAsset(r.id,'Approved R11 painted cards and nine covers used by formal UI');
for(const r of available.filter(r=>r.kind==='material-texture'))requireAsset(r.id,'Source-bound original unit material channel');
const requireModel=(key,reason)=>{
 requireAsset(`model.${key}`,reason);
 for(const suffix of ['.death',...(key==='tank'||key.startsWith('elite.tank.')?['.siege','.morph']:[]),...(key==='viking'||key.startsWith('elite.viking.')?['.assault']:[])])
  useIfPresent(`model.${key}${suffix}`,`${reason}: ${suffix.slice(1)} action`);
};

for(const id of ['p4.texture.beam','p4.texture.flare','p4.texture.heal'])requireAsset(id,'Verified original Terran elite healing presentation');
requireAsset('model.support.mine','Terran support card persistent Spider Mine');
for(const key of ['scv','drone','probe','barracks','hatchery','pylon','pylon.birth','barracks.death','hatchery.death','pylon.death'])requireAsset(`model.${key}`,'Required authentic worker/carrier and matching death');

// New-run, enemy, summon, three-race hero and elite paths are all reachable.
for(const family of ALL_FAMILIES)requireModel(family,`ordinary/enemy family ${family}`);
for(const [id,hero] of Object.entries(HEROES))requireModel(hero.model,`hero ${id}`);
for(const [id,elite] of Object.entries(ELITES))requireModel(elite.model,`elite ${id}`);
for(const key of ['hellion.hellbat','viking.assault','interceptor','scv','drone','probe','egg','hive','barracks','hatchery','pylon','pylon.birth','loot.mineral','loot.gas','loot.large','projectile.marauder','projectile.hydralisk','fort.bunker','fort.bunker.death','fort.repair','fort.repair.death'])
 useIfPresent(`model.${key}`,`mode/summon/economy/effect/fortification ${key}`);
for(const family of ['lurker','thor'])for(const record of available)
 if(record.id.startsWith(`model.${family}.`)&&!record.id.endsWith('.death'))requireAsset(record.id,`manual mode ${family}`);

const activeProps=new Set(Object.values(MAP_THEMES).flatMap(theme=>[...theme.props]));
for(const id of activeProps)requireAsset(id,'One of five centered campaign maps');
for(const id of ['map.terrain.diffuse','map.terrain.normal','terrain.char'])requireAsset(id,'Original terrain pixels for radial campaign / endless flat');
const retiredMapIds=new Set(available.filter(r=>r.id==='map.kairos'||['map.terrain.mask0','map.terrain.mask1'].includes(r.id)||r.id.startsWith('model.map.')&&!activeProps.has(r.id)).map(r=>r.id));

// Models imported by GLTFLoader contain their images, while exported map
// materials may also refer to standalone semantic sc2asset: texture IDs.
for(const record of available.filter(record=>(record.kind==='model'||record.kind==='map-model')&&!retiredMapIds.has(record.id))){
 const bytes=await fs.readFile(record.packedFile);
 const json=record.kind==='map-model'?bytes.toString('utf8'):(()=>{
  if(bytes.toString('ascii',0,4)!=='glTF')throw Error(`Invalid release GLB: ${record.id}`);
  return bytes.toString('utf8',20,20+bytes.readUInt32LE(12));
 })();
 for(const [,id] of json.matchAll(/sc2asset:([a-zA-Z0-9_.-]+)/g))
  requireAsset(id,`external material of ${record.id}`);
}

const sourceRoots=['src/app','src/render','src/ui','src/data'];
const sourceFiles=[];
async function collect(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){
 const file=path.join(folder,entry.name);if(entry.isDirectory())await collect(file);
 else if(/\.(ts|mjs)$/.test(entry.name)&&!/(runtime\.generated|expansion-content-readiness)\./.test(entry.name))sourceFiles.push(file);
}}
for(const root of sourceRoots)await collect(root);
const sources=await Promise.all(sourceFiles.filter(file=>!/[\\/](original-map|char-terrain|map-surface)\.ts$/.test(file)).map(async file=>({file,text:await fs.readFile(file,'utf8')})));
for(const record of available){
 const mention=sources.find(({text})=>text.includes(record.id));
 if(mention)useIfPresent(record.id,`runtime source ${mention.file.replaceAll('\\','/')}`);
 if(record.kind==='effect-texture'&&!Object.hasOwn(RETIRED_ASSETS,record.id))requireAsset(record.id,'BattleEffects loads active effect texture catalog');
 if(record.kind==='audio')requireAsset(record.id,'AudioEffects loads audio catalog');
}

// Icons used through data-driven cards and the four talent icon arrays are
// packed conservatively until all UI data tables have a typed reference map.
for(const record of available.filter(record=>record.kind==='icon'))
 requireAsset(record.id,'dynamic UI/talent/card icon catalog');

const excluded=records.filter(record=>record.id==='map.acropolis'||record.id.startsWith('map.acropolis.')||retiredMapIds.has(record.id));
// Do not turn an unproven candidate into a release deletion. Add explicit,
// reviewed IDs here only after a zero-reference proof covers every run phase.
const provenUnused=new Set(Object.keys(RETIRED_ASSETS));
const unusedProof=RETIRED_ASSETS;
for(const id of provenUnused){if(reasons.has(id))throw Error(`Referenced asset cannot be pruned: ${id}`);if(!byId.has(id))throw Error(`Unknown pruned asset: ${id}`);}
for(const id of retiredMapIds)if(reasons.has(id))throw Error('Retired campaign asset still referenced: '+id);
const candidates=available.filter(record=>!reasons.has(record.id)&&!provenUnused.has(record.id)&&!excluded.includes(record));
const selected=available.filter(record=>!excluded.includes(record)&&!provenUnused.has(record.id));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const rows=[];
for(const record of selected){
 const bytes=await fs.readFile(record.packedFile),packedSha256=sha256(bytes),derived=textureDerivatives.get(record.id);
 if(derived&&derived.packedFile===record.packedFile&&derived.sha256!==packedSha256)throw Error(`Texture derivative changed: ${record.id}`);
 const localSource=derived?.packedFile===record.packedFile?derived.sourceFile:null;
 // The locked packed bytes have already been checked. Optional old conversion
 // inputs can be cleaned; when present, their original audit hash still applies.
 if(localSource){const original=await fs.readFile(localSource).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});if(original&&sha256(original)!==derived.sourceSha256)throw Error(`Texture source changed: ${record.id}`);}
 const sourceFile=record.sourceSha256?(record.sourcePath??record.sourceFile??record.packedFile):(localSource??record.packedFile);
 const sourceSha256=record.sourceSha256??(localSource?derived.sourceSha256:packedSha256);
 rows.push({id:record.id,kind:record.kind,packedFile:record.packedFile,sourceFile,upstreamSourcePath:record.sourcePath??null,sourceBuild:record.sourceBuild??null,sourceSha256,bytes:bytes.length,sha256:packedSha256,optimization:record.optimization??null,reasons:reasons.get(record.id)??['conservatively retained: reachability not yet proven']});
}
const category=Object.values(Object.groupBy(rows,row=>row.kind)).map(group=>({kind:group[0].kind,count:group.length,bytes:group.reduce((sum,row)=>sum+row.bytes,0)})).sort((a,b)=>b.bytes-a.bytes);
const identicalContentGroups=Object.values(Object.groupBy(rows,row=>row.sha256)).filter(group=>group.length>1).map(group=>({sha256:group[0].sha256,bytes:group[0].bytes,ids:group.map(row=>row.id),policy:'Semantic IDs retained; offline pack shares identical byte chunks, not duplicate payloads'}));
const report={rulesId:'mvp-1.0',mapId:CAMPAIGN_MAP_ID,selectedIds:rows.map(row=>row.id),excluded:[...excluded.map(record=>({id:record.id,bytes:record.bytes,reason:'Production new/load uses one of five saved campaign recipes or endless-flat-v1. Five theme prop tables omit this ID; UI/source assets remain in the restoration catalog.'})),...[...provenUnused].map(id=>({id,reason:unusedProof[id],bytes:byId.get(id).bytes}))],provenUnused:[...provenUnused],identicalContentGroups,unprovenCandidates:candidates.map(record=>({id:record.id,kind:record.kind,bytes:record.bytes})),category,rows};
await fs.mkdir('reports/local',{recursive:true});
await fs.writeFile('reports/local/asset-reachability.json',JSON.stringify(report,null,2));
console.log(`M6 release closure: ${selected.length} assets, ${candidates.length} conservative candidates, ${excluded.length} legacy Acropolis and ${provenUnused.size} proven unused excluded; ${identicalContentGroups.length} identical-content groups share payloads.`);
