import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function prepareHeroBasicEffects(){
 try{
  const saved=JSON.parse(await fs.readFile('assets/private/hero-basic-effects.json','utf8')).manifest;
  for(const r of saved){const bytes=await fs.readFile(r.packedFile);if(createHash('sha256').update(bytes).digest('hex')!==r.sha256)throw Error('Hero effect changed: '+r.id);}
  if(saved.length===15)return saved;
 }catch(error){if(error.code!=='ENOENT')throw error;}
 const manifest=JSON.parse(await fs.readFile('.cache/hero-attack-lab/texture-manifest.json','utf8'));
 const keys=['flare2b','kenney-smoke_04','kenney-trace_05','energyplane3_red','kenney-twirl_01','kenney-muzzle_03','kenney-muzzle_05','flare1_blueelec','sparks4','fireanim_x4','emergytrailorange','energyplane3','emergytrailcyan','firestreak7','fireball_10'];
 await fs.mkdir('public/assets/hero-basic',{recursive:true});
 const records=[];
 for(const key of keys){
  const source=manifest.find(t=>t.key===key);if(!source)throw Error('Missing approved hero effect '+key);
  const bytes=await fs.readFile(source.file),packedFile=`public/assets/hero-basic/${key}.png`;
  await fs.writeFile(packedFile,bytes);
  const sprite=key==='fireanim_x4'?{columns:8,rows:4}:key==='sparks4'?{columns:2,rows:2}:{columns:1,rows:1};
  records.push({...source,id:'fx.hero-basic.'+key,kind:'effect-texture',required:true,packedFile,sprite,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 await fs.writeFile('assets/private/hero-basic-effects.json',JSON.stringify({manifest:records},null,2));
 return records;
}
