import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadAudioSources} from './t01/audio-source.mjs';
const db=await loadAudioSources(),banks={},files=new Map(),out='reports/local/armed-support-design-20261111/audio';
for(const id of ['PlanetaryFortress_AttackLaunch','PlanetaryFortress_AttackImpact']){
 const source=db.sound(id,'melee');if(!source?.assets.length)throw Error('Missing original sound '+id);
 const samples=source.assets.map(a=>{const id='audio.sc2.source.'+createHash('sha256').update(a.path.toLowerCase()).digest('hex').slice(0,24);files.set(a.path.toLowerCase(),{id,path:a.path,module:a.source.replace('assets/private/actor-source/','').replace('/GameData/SoundData.xml','')});return {asset:id.replace('audio.',''),...Object.fromEntries(Object.entries(a).filter(([k])=>!['File','path','source','index'].includes(k)))};});
 banks['melee:'+id]={id,profile:'melee',fields:source.fields,samples};
}
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/requests.json',JSON.stringify([...files.values()],null,2));await fs.writeFile(out+'/banks.json',JSON.stringify(banks,null,2));console.log({banks:Object.keys(banks).length,files:files.size});
