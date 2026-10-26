import fs from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
const root='assets/private/actor-source/';
const mod=id=>`mods/${id}.sc2mod/base.sc2data/GameData/`,campaign=id=>`campaigns/${id}.sc2campaign/base.sc2data/GameData/`;
export const AUDIO_SOURCE_PROFILES={
 liberty:[mod('core'),mod('liberty'),campaign('liberty')],
 swarm:[mod('core'),mod('liberty'),mod('swarm'),campaign('liberty'),campaign('swarm')],
 void:[mod('core'),mod('liberty'),mod('swarm'),mod('void'),campaign('liberty'),campaign('swarm'),campaign('void')],
 melee:[mod('core'),mod('liberty'),mod('swarm'),mod('void'),mod('libertymulti'),mod('swarmmulti'),mod('voidmulti')],
 coop:[mod('core'),mod('liberty'),mod('swarm'),mod('void'),campaign('liberty'),campaign('swarm'),campaign('void'),mod('starcoop/starcoop')],
 nova:[mod('core'),mod('liberty'),mod('swarm'),mod('void'),campaign('liberty'),campaign('swarm'),campaign('void'),mod('novastoryassets')],
};
const attrs=node=>Object.fromEntries(Array.from(node.attributes??[]).map(a=>[a.name,a.value]));
const props=node=>({...attrs(node),...Object.fromEntries(Array.from(node.childNodes??[]).filter(n=>n.nodeType===1&&n.hasAttribute('value')).map(n=>[n.tagName,n.getAttribute('value')]))});
export async function loadAudioSources(){
 const raw=new Map(),tables=new Map(),cache=new Map();
 for(const p of new Set(Object.values(AUDIO_SOURCE_PROFILES).flat()))for(const kind of ['Actor','Sound']){
  const file=root+p+kind+'Data.xml',xml=await fs.readFile(file,'utf8').catch(()=>null);if(!xml)continue;
  const doc=new DOMParser().parseFromString(xml,'text/xml');raw.set(p+kind,Array.from(doc.documentElement.childNodes).filter(n=>n.nodeType===1).map(n=>({id:n.getAttribute('id')??'@default:'+n.tagName,parent:n.getAttribute('parent'),tag:n.tagName,attributes:attrs(n),children:Array.from(n.childNodes).filter(c=>c.nodeType===1).map(c=>({tag:c.tagName,attrs:props(c)})),file})));
 }
 function table(kind,profile){const key=kind+':'+profile;if(tables.has(key))return tables.get(key);const t=new Map();for(const p of AUDIO_SOURCE_PROFILES[profile])for(const n of raw.get(p+kind)??[]){const list=t.get(n.id)??[];list.push(n);t.set(n.id,list);}tables.set(key,t);return t;}
 function resolve(id,kind='Sound',profile='melee',seen=new Set()){
  const key=profile+':'+kind+':'+id;if(cache.has(key))return cache.get(key);if(seen.has(key))throw Error('Cyclic original data: '+key);
  const t=table(kind,profile),nodes=t.get(id);if(!nodes)return null;seen=new Set(seen).add(key);
  const parent=nodes.findLast(n=>n.parent)?.parent,base=parent?resolve(parent,kind,profile,seen):!id.startsWith('@default:')?resolve('@default:'+nodes[0].tag,kind,profile,seen):null;
  const value=base?structuredClone(base):{attributes:{},fields:{},assets:[],chain:[]};
  for(const n of nodes){Object.assign(value.attributes,n.attributes);value.chain.push({id:n.id,file:n.file});let append=[];
   for(const c of n.children){const index=c.attrs.index;
    if(c.tag==='AssetArray'){if(index!==undefined){const i=Number(index);if(c.attrs.removed==='1')value.assets[i]=null;else value.assets[i]={...value.assets[i],...c.attrs,source:n.file};}else append.push({...c.attrs,source:n.file});}
    else{const k=c.tag+(index===undefined?'':':'+index);value.fields[k]={...value.fields[k],...c.attrs};}
   }if(append.length)value.assets=append;
  }
  cache.set(key,value);return value;
 }
 function sound(id,profile='melee'){
  const r=resolve(id,'Sound',profile);if(!r)return null;
  return {...r,id,profile,assets:r.assets.filter(Boolean).map(a=>({...a,File:a.File??(a.TemplateParam?r.fields.AssetArrayTemplate?.File?.replace(/\^TemplateParam[12]\^/g,a.TemplateParam):undefined)})).filter(a=>a.File).map(a=>({...a,path:a.File.replaceAll('\\','/').replaceAll('##id##',id)}))};
 }
 function actor(id,profile='melee'){
  const r=resolve(id,'Actor',profile);if(!r)return null;
  const tokens={id,...r.attributes},sub=s=>s?.replace(/##([^#]+)##/g,(_,key)=>tokens[key]??'');
  return {...r,id,profile,fields:Object.fromEntries(Object.entries(r.fields).map(([key,v])=>[key,Object.fromEntries(Object.entries(v).map(([k,s])=>[k,sub(s)]))]))};
 }
 return {sound,actor,resolve};
}
