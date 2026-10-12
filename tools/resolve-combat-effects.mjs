import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {COMBAT_EFFECT_ROUTES,COMBAT_REACTION_MODELS} from './combat-effects-routes.mjs';

const root='reports/local/combat-effects-20261012',sha=b=>createHash('sha256').update(b).digest('hex');
const lock=JSON.parse(await fs.readFile('tools/sc2-casc-lock.json','utf8'));
const sourceRecords=JSON.parse(await fs.readFile('tools/closeout-actor-dependencies.json','utf8'));
const extra=await fs.readFile('tools/combat-effects-catalog-dependencies.json','utf8').then(s=>JSON.parse(s.replace(/^\uFEFF/,'')),()=>[]);
const byFile=new Map([...sourceRecords,...extra].map(r=>[r.installFile.replaceAll('\\','/').toLowerCase(),r]));
const layers=['core','liberty','swarm','void','libertymulti','swarmmulti','voidmulti','balancemulti'];
const catalogs={ActorData:new Map(),ModelData:new Map(),WeaponData:new Map(),EffectData:new Map()},sources=[];
const elements=n=>Array.from(n.childNodes??[]).filter(n=>n.nodeType===1);
const attrs=n=>Object.fromEntries(Array.from(n.attributes??[]).map(a=>[a.name,a.value]));
for(const layer of layers)for(const kind of Object.keys(catalogs)){
 const file=`assets/private/actor-source/mods/${layer}.sc2mod/base.sc2data/GameData/${kind}.xml`,record=byFile.get(file.toLowerCase());
 if(!record)continue;
 const bytes=await fs.readFile(file);assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256,'Changed original XML '+file);sources.push({file,bytes:bytes.length,sha256:sha(bytes)});
 const doc=new DOMParser().parseFromString(bytes.toString('utf8'),'text/xml');
 for(const n of elements(doc.documentElement)){const id=n.getAttribute('id')||(n.getAttribute('default')==='1'?'@'+n.nodeName:'');if(!id)continue;const list=catalogs[kind].get(id)??[];list.push({file,node:n});catalogs[kind].set(id,list);}
}
function chain(kind,id,seen=new Set()){
 if(seen.has(id))throw Error('Cyclic original catalog '+id);seen.add(id);
 const own=catalogs[kind].get(id)??[],parent=own.map(x=>x.node.getAttribute('parent')).filter(Boolean).at(-1),tag=own[0]?.node.nodeName;
 const bases=!parent&&!id.startsWith('@')&&tag?['@'+(kind==='ActorData'&&/^CActor(?:Model|Beam|Unit|Missile)/.test(tag)?'CActorModel':tag),...(kind==='ActorData'&&tag!=='CActorModel'&&/^CActor(?:Beam|Unit|Missile)/.test(tag)?['@'+tag]:[])]:[];
 return [...bases.flatMap(base=>chain(kind,base,new Set(seen))),...(parent?chain(kind,parent,new Set(seen)):[]),...own.map(({file,node})=>({file,id,tag:node.nodeName,attributes:attrs(node),fields:elements(node).map(n=>({tag:n.nodeName,attributes:attrs(n),children:elements(n).map(c=>({tag:c.nodeName,attributes:attrs(c)}))})),tokens:Array.from(node.childNodes??[]).filter(n=>n.nodeType===7&&n.target==='token').map(n=>n.data)}))];
}
function model(id){
 const definitions=chain('ModelData',id),fields=definitions.flatMap(r=>r.fields),assetPath=fields.filter(f=>f.tag==='Model').map(f=>f.attributes.value).filter(Boolean).at(-1);
 if(!assetPath)return null;
 const scale=fields.filter(f=>f.tag==='ScaleMin').map(f=>f.attributes.value).filter(Boolean).at(-1)??'1,1,1';
 return {modelDataId:id,assetPath:assetPath.replaceAll('\\','/'),scale:scale.split(',').map(Number),definitions};
}
function actor(id){
 const definitions=chain('ActorData',id),tokens={id},fields=new Map();
 for(const d of definitions){for(const token of d.tokens){const parts=Object.fromEntries([...token.matchAll(/(\w+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));if(parts.id)tokens[parts.id]=parts.value??'';}Object.assign(tokens,d.attributes);}
 tokens.id=id;
 const expand=s=>s.replace(/##([^#]+)##/g,(_,key)=>tokens[key]??'##'+key+'##');
 for(const d of definitions)for(const f of d.fields){if(f.tag==='On')continue;const key=f.tag+':'+(f.attributes.index??'');fields.set(key,{tag:f.tag,attributes:{...(fields.get(key)?.attributes??{}),...Object.fromEntries(Object.entries(f.attributes).map(([k,v])=>[k,expand(v)]))},source:d.file});}
 return {id,definitions,fields:[...fields.values()]};
}
function actorModel(id){const a=actor(id),value=a.fields.find(f=>f.tag==='Model')?.attributes.value??id;return model(value)?value:null;}
const models=new Map(),missing=[];
for(const r of COMBAT_EFFECT_ROUTES)for(const [stage,ids]of Object.entries(r.models))for(const id of ids){const m=model(id);if(!m){missing.push({route:r.key,stage,model:id});continue;}models.set(id,m);}
for(const id of COMBAT_REACTION_MODELS){const m=model(id);if(m)models.set(id,m);else missing.push({reaction:id});}
const routes=COMBAT_EFFECT_ROUTES.map(r=>{
 const actorChains=r.actors.map(actor),resolvedModels=structuredClone(r.models),sourceMappings=[];
 const add=(stage,id,from)=>{if(!id||!model(id))return;resolvedModels[stage]??=[];if(!resolvedModels[stage].includes(id))resolvedModels[stage].push(id);models.set(id,model(id));sourceMappings.push({stage,model:id,...from});};
 for(const a of actorChains)for(const f of a.fields){
  if(f.tag==='LaunchAssets')add('launch',f.attributes.Model,{actor:a.id,field:f.tag,file:f.source});
  if(f.tag==='ImpactMap'){const suffix=f.attributes.index==='None'?'':f.attributes.index;add('impact'+suffix,f.attributes.Model,{actor:a.id,field:f.tag,index:f.attributes.index,file:f.source});add('reaction'+suffix,f.attributes.ModelReaction,{actor:a.id,field:f.tag,index:f.attributes.index,file:f.source});}
  if(f.tag==='Beam')add('beam',actorModel(f.attributes.value??''),{actor:a.id,field:f.tag,file:f.source});
  if(f.tag==='Model')add(a.definitions.at(-1)?.tag.startsWith('CActorBeam')?'beam':r.models.impact?.includes(f.attributes.value)?'impact':r.kind==='field'?'field':r.kind==='spikes'?'impact':r.kind==='healing'?'impact':r.kind==='sweep'?'beam':'source',f.attributes.value,{actor:a.id,field:f.tag,file:f.source});
 }
 return {...r,models:resolvedModels,sourceMappings,actorChains};
});
const missingActors=routes.flatMap(r=>r.actorChains.filter(a=>!a.definitions.length).map(a=>({route:r.key,actor:a.id})));
await fs.mkdir(root,{recursive:true});
await fs.writeFile('tools/combat-effects-models.json',JSON.stringify([...models.values()].map(m=>({id:'model.combat-fx.'+m.modelDataId,name:path.posix.basename(m.assetPath).replace(/\.m3$/i,'').toLowerCase(),assetPath:m.assetPath,modelDataId:m.modelDataId})),null,2)+'\n');
await fs.writeFile(root+'/source-map.json',JSON.stringify({version:1,build:lock.version,layers,sources,routes,models:[...models.values()],missing,missingActors,method:'Explicit active-weapon routes; recorded core/melee catalog inheritance and later-layer definitions. Campaign and co-op overrides are never merged into ordinary weapons.'},null,2));
await fs.writeFile('src/data/combat-fx-routes.json',JSON.stringify(routes.map(({actorChains,sourceMappings,...r})=>r),null,2)+'\n');
console.log(JSON.stringify({routes:routes.length,models:models.size,sources:sources.length,missing,missingActors}));
if(missing.length||missingActors.length)process.exitCode=2;
