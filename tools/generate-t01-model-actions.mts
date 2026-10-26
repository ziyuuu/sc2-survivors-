import fs from 'node:fs/promises';
import {AnimationClip} from 'three';
import {mapAnimations} from '../src/render/loaders/animations';
const base='reports/local/t01-20261024',source=JSON.parse(await fs.readFile(base+'/active-source.json','utf8'));
const assets=JSON.parse(await fs.readFile(source.out+'/'+source.manifest,'utf8')).assets;
const models:Record<string,unknown>={};
for(const[id,a]of Object.entries(assets) as [string,{url:string}][]){
 if(!id.startsWith('model.')||!a.url.endsWith('.glb'))continue;
 const handle=await fs.open(source.out+'/'+a.url,'r');let data:any;
 try{const header=Buffer.alloc(20);await handle.read(header,0,20,0);if(header.toString('ascii',0,4)!=='glTF')continue;const json=Buffer.alloc(header.readUInt32LE(12));await handle.read(json,0,json.length,20);data=JSON.parse(json.toString('utf8'));}finally{await handle.close();}
 const key=id.slice(6),clips=(data.animations??[]).map((a:any)=>new AnimationClip(a.name,Math.max(0,...a.samplers.map((s:any)=>data.accessors[s.input]?.max?.[0]??0)),[])),mapped=mapAnimations(clips,key);
 models[key]={idle:mapped.idle?{name:mapped.idle.name,seconds:mapped.idle.duration}:null,birth:mapped.spawn?{name:mapped.spawn.name,seconds:mapped.spawn.duration}:null};
}
await fs.writeFile('tools/t01/model-actions.generated.json',JSON.stringify(models));console.log(JSON.stringify({models:Object.keys(models).length}));
