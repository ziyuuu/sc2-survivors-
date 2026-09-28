/** Build the Git delivery tree from a verified Web build. Source art is never included. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {HEROES} from '../src/data/heroes';
import {ELITES} from '../src/data/elites';
const web='dist/web',dest='deploy/coze',resources='deploy/runtime';
const release=JSON.parse(await fs.readFile(web+'/web-release.json','utf8'));
const manifest=JSON.parse(await fs.readFile(web+'/'+release.manifest,'utf8'));
const files=new Map<string,{url:string;sha256:string;bytes:number;groups:Set<string>;ids:string[]}>();
const raceModels=new Map<string,string>();
for(const [race,families] of Object.entries(FAMILIES_BY_RACE))for(const f of families)raceModels.set(f,race);
for(const hero of Object.values(HEROES))raceModels.set(hero.model,hero.race);
for(const elite of Object.values(ELITES))raceModels.set(elite.model,raceModels.get(elite.family)!);
for(const [key,race] of Object.entries({scv:'terran',barracks:'terran',drone:'zerg',hatchery:'zerg',probe:'protoss',pylon:'protoss',interceptor:'protoss'}))raceModels.set(key,race);
function group(id:string){if(id.startsWith('map.')||id.startsWith('doodad.')||id.startsWith('texture.'))return 'campaign';if(id.startsWith('model.fort.'))return 'endless';
 if(id.startsWith('model.')){const key=id.slice(6);const match=[...raceModels.keys()].sort((a,b)=>b.length-a.length).find(k=>key===k||key.startsWith(k+'.'));if(match)return raceModels.get(match)!;if(['hive','egg','projectile.hydralisk'].some(k=>key===k||key.startsWith(k+'.')))return 'enemies';}
 return 'common';}
for(const [id,value] of Object.entries(manifest.assets)){const a=value as {url:string;sha256:string;bytes:number};let row=files.get(a.url);if(!row){row={...a,groups:new Set(),ids:[]};files.set(a.url,row);}row.ids.push(id);row.groups.add(group(id));if(FAMILIES_BY_RACE.zerg.some(f=>id==='model.'+f||id.startsWith('model.'+f+'.')))row.groups.add('enemies');}
await fs.mkdir(dest+'/public/assets',{recursive:true});await fs.mkdir(resources+'/assets',{recursive:true});
// Delete only stale generated app files listed by the previous build, never project/source assets.
let previous:{app:string[]}={app:[]};try{previous=JSON.parse(await fs.readFile(dest+'/delivery.json','utf8'));}catch{}
const app:string[]=[];
async function copyApp(folder:string){for(const e of await fs.readdir(web+'/'+folder,{withFileTypes:true})){const relative=folder+e.name;if(e.isDirectory())await copyApp(relative+'/');else if(!files.has(relative)){const to=dest+'/public/'+relative;await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(web+'/'+relative,to);app.push(relative);}}}
await copyApp('');
for(const old of previous.app)if(!app.includes(old)&&/^[a-zA-Z0-9_./-]+$/.test(old)&&!old.split('/').includes('..'))await fs.rm(dest+'/public/'+old,{force:true});
for(const row of files.values()){const bytes=await fs.readFile(web+'/'+row.url);if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Resource mismatch '+row.url);await fs.writeFile(resources+'/'+row.url,bytes);}
const index={version:1,release:release.release,groups:['common','terran','zerg','protoss','enemies','campaign','endless'],files:[...files.values()].map(f=>({...f,groups:[...f.groups],gitPath:resources+'/'+f.url})).sort((a,b)=>a.url.localeCompare(b.url))};
await fs.writeFile(dest+'/resource-groups.json',JSON.stringify(index,null,2));
await fs.copyFile('tools/coze-web-server.mjs',dest+'/coze-web-server.mjs');await fs.copyFile('tools/fetch-coze-resources.mjs',dest+'/fetch-resources.mjs');
await fs.copyFile('docs/project/COZE_GITHUB_DEPLOY.md',dest+'/DEPLOY.md');
await fs.writeFile(dest+'/package.json',JSON.stringify({name:'sc2-coze-release',private:true,type:'module',engines:{node:'>=22'},scripts:{start:'node coze-web-server.mjs'}},null,2));
await fs.writeFile(dest+'/delivery.json',JSON.stringify({release:release.release,app,assets:files.size,resourceBytes:[...files.values()].reduce((n,f)=>n+f.bytes,0)},null,2));
console.log(JSON.stringify({app:dest,resources,files:files.size,groups:index.groups}));
