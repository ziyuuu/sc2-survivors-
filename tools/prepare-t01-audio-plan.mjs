import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadAudioSources} from './t01/audio-source.mjs';
import {AUDIO_WEAPONS,AUDIO_DEATHS,AUDIO_SKILLS,AUDIO_SPECIAL} from './t01/audio-plan.mjs';
import {motionAudioPlan} from './t01/motion-audio-plan.mjs';
const db=await loadAudioSources(),banks={},weapons={},deaths={},skills={},special={},missing=[],nativeSilent=[],files=new Map();
const sha=s=>createHash('sha256').update(s).digest('hex');
// B97563 ROOT has seven Ravager death variants. SoundData still lists an eighth
// missing file; original VariationFallback is enabled. Retain the seven originals.
const unavailable=new Map([['Assets/Sounds/Ravager_Vox_Death08.wav','Absent from the pinned B97563 CASC ROOT; seven other native variants verified.']]);
function bank(id,profile,required=true){
 if(!id||id==='IGNORE')return null;
 const key=profile+':'+id;if(banks[key])return key;
 const source=db.sound(id,profile);if(!source?.assets.length){(required?missing:nativeSilent).push({profile,id,reason:source?'no file in inherited AssetArray':'no SoundData definition'});return null;}
 const samples=source.assets.filter(a=>!unavailable.has(a.path)).map(a=>{const id='audio.sc2.source.'+sha(a.path.toLowerCase()).slice(0,24);if(!files.has(a.path.toLowerCase()))files.set(a.path.toLowerCase(),{id,path:a.path,module:a.source.replace('assets/private/actor-source/','').replace('/GameData/SoundData.xml','')});return {asset:id.replace('audio.',''),...Object.fromEntries(Object.entries(a).filter(([k])=>!['File','path','source','index'].includes(k)))};});
 if(!samples.length)missing.push({profile,id,reason:'No available native variants'});
 banks[key]={id,profile,fields:source.fields,samples,chain:source.chain};return key;
}
for(const [key,row]of Object.entries(AUDIO_WEAPONS)){
 const profile=row.profile??'melee',actor=row.actor?db.actor(row.actor,profile):null;
 if(row.actor&&!actor)missing.push({profile,actor:row.actor});
 const attack=Object.hasOwn(row,'attack')?row.attack:actor?.fields.LaunchAssets?.Sound,impact=Object.hasOwn(row,'impact')?row.impact:actor?.fields['ImpactMap:None']?.Sound;
 weapons[key]={attack:bank(attack,profile,Object.hasOwn(row,'attack')),impact:bank(impact,profile,Object.hasOwn(row,'impact')),...(row.channel?{channel:row.channel.map(id=>bank(id,profile))}:{}),...(row.powered?{powered:bank(row.powered,profile)}:{}),surfaces:Object.fromEntries(['Shield','Flesh','LightArmor','Metal'].flatMap(surface=>{const id=actor?.fields['ImpactMap:'+surface]?.Sound,value=bank(id,profile,false);return value?[[surface.toLowerCase(),value]]:[]})),source:{profile,actor:row.actor,note:row.note,chain:actor?.chain}};
 if(!weapons[key].attack&&!weapons[key].impact&&!row.channel)missing.push({weapon:key,reason:'no weapon sound bank'});
}
for(const [key,[profile,...ids]]of Object.entries(AUDIO_DEATHS))deaths[key]=ids.map(id=>bank(id,profile));
for(const [key,row]of Object.entries(AUDIO_SKILLS))skills[key]=Object.fromEntries(Object.entries(row).filter(([k])=>k!=='profile').map(([k,id])=>[k,k==='note'?id:bank(id,row.profile)]));
for(const [key,[profile,...ids]]of Object.entries(AUDIO_SPECIAL))special[key]=ids.map(id=>bank(id,profile));
const result={version:1,sourceBuild:'B97563',unavailableNativeVariants:Object.fromEntries(unavailable),weapons,deaths,skills,special,...motionAudioPlan(db,bank),banks};
await fs.mkdir('.cache/t01-audio',{recursive:true});await fs.writeFile('.cache/t01-audio/source-plan.json',JSON.stringify(result,null,2));await fs.writeFile('.cache/t01-audio/requests.json',JSON.stringify([...files.values()],null,2));await fs.writeFile('.cache/t01-audio/source-plan-audit.json',JSON.stringify({missing,nativeSilent},null,2));
console.log(JSON.stringify({weapons:Object.keys(weapons).length,heroSkills:Object.keys(skills).length,deaths:Object.keys(deaths).length,banks:Object.keys(banks).length,files:files.size,missing,nativeSilentCount:nativeSilent.length},null,2));
if(missing.length)process.exitCode=1;
