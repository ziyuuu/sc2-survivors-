import fs from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {localSourceFile} from './local-source-cache.mjs';
import {materialEntries} from './m3-materials.mjs';
import {UNIT_MATERIAL_CATALOG as catalog} from '../src/render/materials/unit-material-catalog.ts';
const keys=['marine.2','baneling.1','queen.1','high_templar.1','reaper.1','mutalisk.1','colossus.1'].map(k=>'elite.'+k);
const expansion=JSON.parse(await fs.readFile('tools/expansion-models.json','utf8'));
const records=[...JSON.parse(await fs.readFile('tools/combat-death-models.json','utf8')),...expansion];
const models=[...JSON.parse(await fs.readFile('tools/three-race-elite-models.json','utf8')),...expansion];
const xml=await fs.readFile('assets/private/actor-source/mods/liberty.sc2mod/base.sc2data/GameData/ModelData.xml','utf8');
const nodes=Array.from(new DOMParser().parseFromString(xml,'text/xml').documentElement.childNodes).filter(n=>n.nodeType===1),byId=new Map(nodes.map(n=>[n.getAttribute('id'),n]));
function chain(id,seen=new Set()){if(!id||seen.has(id))return [];seen.add(id);const n=byId.get(id);return n?[...chain(n.getAttribute('parent'),seen),n.toString()]:[];}
const results=keys.map(key=>{const live=catalog[key],dead=catalog[key+'.death'],record=records.find(r=>r.id==='model.'+key+'.death'),body=models.find(r=>r.id==='model.'+key);return {key,live:live.source,dead:dead.source,body,record,liveMaterials:live.materials.map(m=>({name:m.name,layers:Object.fromEntries(Object.entries(m.layers).filter(([,l])=>l.filename).map(([k,l])=>[k,l.filename]))})),deadMaterials:dead.materials.map(m=>({name:m.name,layers:Object.fromEntries(Object.entries(m.layers).filter(([,l])=>l.filename).map(([k,l])=>[k,l.filename]))})),source:chain(record?.modelDataId),bodySource:chain(body?.modelDataId)};});
const skinsXml=await fs.readFile('assets/private/actor-source/mods/liberty.sc2mod/base.sc2data/GameData/SkinData.xml','utf8'),skinNodes=Array.from(new DOMParser().parseFromString(skinsXml,'text/xml').documentElement.childNodes).filter(n=>n.nodeType===1),skinById=new Map(skinNodes.map(n=>[n.getAttribute('id'),n]));
function skinChain(id){const n=skinById.get(id);return n?[...skinChain(n.getAttribute('parent')),n.toString()]:[];}
const skins=['MarineXPR','BanelingWebby','QueenWebby','HighTemplarPurifier','ReaperCovertOps','MutaliskWebby','ColossusPurifier'];
const parser=await import(pathToFileURL(path.resolve('.cache/visual-restoration-reader/m3-loader.js')).href);
for(const [i,r]of results.entries()){
 r.skin=skins[i];r.skinSource=skinChain(r.skin);assert.ok(r.source.length&&r.bodySource.length&&r.skinSource.length,r.key+' source chain');
 r.originals=[];
 for(const key of [r.key,r.key+'.death']){const p=catalog[key],file=localSourceFile('assets/private/m3/'+p.source),bytes=await fs.readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,p.sourceSha256);
  const entries=materialEntries(await parser.loadM3FromFile(path.resolve(file)));for(const m of p.materials){const original=entries.find(n=>n.index===m.index);assert.ok(original);for(const role of ['diffuse','normal','specular','emissive','alpha','alpha2'])if(m.layers[role]?.filename)assert.equal(original.layers[role]?.filename.toLowerCase(),m.layers[role].filename,m.name+':'+role);}
  r.originals.push({file,sha256,materialsVerified:p.materials.length});
 }
 r.decision=r.key==='elite.baneling.1'?'replace-with-source-MP-death-pair':'retain-original-authored-death-materials';
 r.reason=r.key==='elite.baneling.1'?'liberty CModel pairs the MP live body with MP death; remove the unrelated coop definition override.':'CSkin replaces the live/death CModel pair. The shipped pair and its per-surface texture references match the original M3; no texture replacement is declared in this skin chain. Retain native fragments, burnt surfaces and body variants; repair team masks separately.';
 assert.ok(!r.skinSource.some(s=>/Reference="Texture|Catalog="Texture|TextureSelectById|TextureSetById/.test(s)),r.key+' needs explicit texture override resolution');
}
await fs.mkdir('.cache/t01-audit-repairs',{recursive:true});await fs.writeFile('.cache/t01-audit-repairs/skin-source.json',JSON.stringify(results,null,2));
for(const r of results)console.log(JSON.stringify({key:r.key,live:r.live,dead:r.dead,skin:r.skin,decision:r.decision,verified:r.originals}));

