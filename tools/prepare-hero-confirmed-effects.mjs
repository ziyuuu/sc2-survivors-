import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
/** Copies only confirmed original-source assets, retaining pixel/model bytes and provenance. */
export async function prepareHeroConfirmedEffects(){
 const savedFile='assets/private/hero-confirmed-effects.json';
 try{const saved=JSON.parse(await fs.readFile(savedFile,'utf8')).manifest;for(const r of saved){if(createHash('sha256').update(await fs.readFile(r.packedFile)).digest('hex')!==r.sha256)throw Error('Confirmed hero asset changed: '+r.id);}return saved;}catch(e){if(e.code!=='ENOENT')throw e;}
 const textures=JSON.parse(await fs.readFile('.cache/hero-attack-lab/texture-manifest.json','utf8')),models=JSON.parse(await fs.readFile('.cache/hero-combat-lab/upgrade-assets/manifest.json','utf8'));
 const keys=['flare1','flare1_blueelec','flare2b','fireanim_x4','firestreak7','emergytrailorange','emergytrailcyan','energyplane3','shockwave1_burn1','shockwave_blur1_blue','plasmaanimx1_blue','nebulacloudsalphaparticle_purple','kenney-spark_02','kenney-smoke_04','kenney-twirl_01'];
 const upgrades=['smoke_wispy11','newsmoke01','firetile4'],records=[];await fs.mkdir('public/assets/hero-confirmed',{recursive:true});
 for(const [prefix,list] of [['fx.hero-skill.',keys],['fx.hero-upgrade.',upgrades]])for(const key of list){const t=textures.find(t=>t.key===key);if(!t)throw Error('Missing confirmed texture '+key);const bytes=await fs.readFile(t.file),packedFile=`public/assets/hero-confirmed/${key}.png`;await fs.writeFile(packedFile,bytes);records.push({...t,id:prefix+key,kind:'effect-texture',required:true,packedFile,sprite:['fireanim_x4','plasmaanimx1_blue'].includes(key)?{columns:8,rows:4}:key==='nebulacloudsalphaparticle_purple'?{columns:2,rows:2}:{columns:1,rows:1},sha256:createHash('sha256').update(bytes).digest('hex')});}
 const model=models.find(m=>m.id==='model.hero-upgrade.vikingfightermissile');if(!model)throw Error('Missing confirmed missile');const bytes=await fs.readFile(model.file);if(createHash('sha256').update(bytes).digest('hex')!==model.sha256)throw Error('Confirmed original missile hash mismatch');const packedFile='public/assets/hero-confirmed/vikingfightermissile.glb';await fs.writeFile(packedFile,bytes);records.push({...model,kind:'model',required:true,packedFile});
 await fs.writeFile(savedFile,JSON.stringify({manifest:records},null,2));return records;
}
