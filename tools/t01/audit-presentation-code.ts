/** Read-only full catalogue/asset audit. Results are reproducible and temporary. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {UNIT_MATERIAL_CATALOG as rawCatalog} from '../../src/render/materials/unit-material-catalog';
import {presentationMaterialProfile} from '../../src/render/materials/death-material-identity';
const catalog=process.argv.includes('--raw-materials')?rawCatalog:Object.fromEntries(Object.keys(rawCatalog).map(key=>[key,presentationMaterialProfile(key)!]));
import {ASSETS} from '../../src/assets/manifest';
import {SOUND_DATA} from '../../src/render/effects/audio-source-data';
import {COMBAT_FX_PROFILES} from '../../src/render/effects/combat-fx-profile';
import effects from '../../src/render/effects/source/catalog.json';
import {mapAnimations} from '../../src/render/loaders/animations';
import {decodeDds} from '../dds-png.mjs';
import {localSourceFile} from '../local-source-cache.mjs';
import {sourceDependencies} from '../../src/render/effects/source/materials';
import {unitMaterialDependencies} from '../../src/render/materials/unit-material-loader';
import {DYNAMIC_CASES} from './catalogue';
import {buildGallery} from './gallery';
import type {SourceEffectDefinition} from '../../src/render/effects/source/types';

const root='.cache/t01-full-audit-20261026';fs.mkdirSync(root,{recursive:true});
const walk=(dir:string):string[]=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name));
const hash=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=Object.fromEntries([...walk('src'),...walk('test')].map(f=>[f.replaceAll('\\','/'),hash(f)]));
if(!fs.existsSync(root+'/baseline.json'))fs.writeFileSync(root+'/baseline.json',JSON.stringify(before));
const original=JSON.parse(fs.readFileSync(root+'/baseline.json','utf8'));
const sourceChanged=Object.keys(original).filter(f=>before[f]!==original[f]);
const assetMissing=[...ASSETS.values()].filter(a=>a.status==='available'&&!fs.existsSync('public/'+a.url)).map(a=>a.id);
const glbs=new Map<string,any>();
for(const [id,a]of ASSETS)if(id.startsWith('model.')&&a.status==='available'&&a.url.endsWith('.glb')){const b=fs.readFileSync('public/'+a.url);glbs.set(id.slice(6),JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))));}
const deaths:any[]=[],sameDiffuseUnmasked:any[]=[],differentDiffuse:any[]=[],noDeathClip:any[]=[];
for(const [key,p]of Object.entries(catalog)){
 if(!key.endsWith('.death'))continue;
 const live=catalog[key.slice(0,-6)];
 const liveDiffuse=live?.materials.filter(m=>m.layers.diffuse?.filename).map(m=>m.layers.diffuse.filename)??[];
 const rows=p.materials.filter(m=>m.layers.diffuse?.filename).map(m=>{
  const file=m.layers.diffuse.filename,prior=live?.materials.find(n=>n.layers.diffuse?.filename===file&&n.teamTexture);
  let masked=0,total=0,min=255;
  if(prior&&!m.teamTexture){const image=decodeDds(fs.readFileSync(localSourceFile('assets/private/dds/'+file)));total=image.rgba.length/4;for(let i=3;i<image.rgba.length;i+=4){if(image.rgba[i]<255)masked++;min=Math.min(min,image.rgba[i]);}}
  const r={key,name:m.name,index:m.index,blend:m.blend,channel:m.layers.diffuse.channel,diffuse:file,teamTexture:!!m.teamTexture,liveSameDiffuse:!!prior,masked,total,min};
  if(prior&&!m.teamTexture&&masked)sameDiffuseUnmasked.push(r);
  if(live&&file&&!liveDiffuse.includes(file))differentDiffuse.push({...r,liveDiffuse});
  return r;
 });
 deaths.push({key,source:p.source,materials:rows});
}
for(const [key,g]of glbs){if(key.endsWith('.death')||key.startsWith('map.')||key.startsWith('effect.'))continue;
 const death=glbs.get(key+'.death')??g,clips=(death.animations??[]).map((a:any)=>({name:a.name,tracks:[]})),mapped=mapAnimations(clips as any,glbs.has(key+'.death')?undefined:key);
 if(!mapped.dead)noDeathClip.push({key,separate:glbs.has(key+'.death'),animations:clips.map((a:any)=>a.name)});
}
const bankMissing:any[]=[],sampleMissing:any[]=[];
const checkBank=(route:string,id:unknown)=>{if(typeof id==='string'&&!SOUND_DATA.banks[id])bankMissing.push({route,id});};
for(const kind of ['weapons','skills','deaths','special'] as const)for(const [id,route]of Object.entries(SOUND_DATA[kind])){const recurse=(v:any)=>{if(typeof v==='string')checkBank(kind+':'+id,v);else if(v&&typeof v==='object')for(const [key,item]of Object.entries(v))if(key!=='note')recurse(item);};recurse(route);}
for(const [id,bank]of Object.entries(SOUND_DATA.banks))for(const s of bank.samples)if(!ASSETS.has('audio.'+s.asset))sampleMissing.push({bank:id,asset:s.asset});
const fxMissing:any[]=[];
for(const [key,p]of COMBAT_FX_PROFILES)for(const [kind,models]of Object.entries(p.models))for(const id of models)if(!(id in effects))fxMissing.push({key,kind,id});
const dependencyMissing:any[]=[],hashMismatches:any[]=[],hashChecked=new Map<string,string>();
const checkHash=(id:string,expected:string)=>{const a=ASSETS.get(id);if(!a)return;let actual=hashChecked.get(id);if(!actual){actual=hash('public/'+a.url);hashChecked.set(id,actual);}if(actual!==expected)hashMismatches.push({id,expected,actual});};
for(const [key,p]of Object.entries(catalog)){for(const id of unitMaterialDependencies(key))if(!ASSETS.has(id))dependencyMissing.push({key,id});checkHash('model.'+key,p.glbSha256);}
for(const [key,p]of Object.entries(effects as unknown as Record<string,SourceEffectDefinition>)){for(const id of sourceDependencies(p))if(!ASSETS.has(id))dependencyMissing.push({key,id});if(p.glbId)checkHash(p.glbId,p.materialProfile.glbSha256);if(p.displacementGlb)checkHash(p.displacementGlb.id,p.displacementGlb.sha256);}
const gallery=buildGallery(DYNAMIC_CASES),runners=Object.fromEntries([...new Set(DYNAMIC_CASES.map(c=>c.runner))].map(k=>[k,DYNAMIC_CASES.filter(c=>c.runner===k).length]));
const result={scope:'Code/catalogue/original DDS verification; no rendered appearance or listening acceptance',sourceFiles:Object.keys(before).length,sourceChanged,assets:ASSETS.size,assetMissing,models:glbs.size,materialProfiles:Object.keys(catalog).length,deathProfiles:deaths.length,materialSurfaces:Object.values(catalog).reduce((n,p)=>n+p.materials.length,0),sameDiffuseUnmasked,differentDiffuse,noDeathClip,deaths,dependencies:{hashChecked:hashChecked.size,hashMismatches,dependencyMissing},catalogue:{cases:DYNAMIC_CASES.length,runners,gallery:gallery.length,units:gallery.filter(o=>o.unit).length},audio:{banks:Object.keys(SOUND_DATA.banks).length,weapons:Object.keys(SOUND_DATA.weapons).length,heroes:Object.keys(SOUND_DATA.skills).length,deathRoutes:Object.keys(SOUND_DATA.deaths).length,bankMissing,sampleMissing},fx:{profiles:COMBAT_FX_PROFILES.size,sourceEffects:Object.keys(effects).length,fxMissing}};
fs.writeFileSync(root+'/catalogue.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,sameDiffuseUnmasked:{surfaces:sameDiffuseUnmasked.length,models:[...new Set(sameDiffuseUnmasked.map(r=>r.key))]},differentDiffuse:{surfaces:differentDiffuse.length,models:[...new Set(differentDiffuse.map(r=>r.key))]},noDeathClip:noDeathClip.map(r=>r.key),deaths:undefined},null,2));
