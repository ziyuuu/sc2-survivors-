/** Register the approved locally synthesized loops in Web and single-file builds. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const input=path.resolve(process.argv[2]??'reports/local/bgm-integration-20261029/audio');
const rendered=JSON.parse(await fs.readFile(path.join(input,'render-result.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const records=[];
for(const key of ['menu','intermission']){
 const track=rendered.tracks.find(track=>track.id===key);
 if(!track?.loop||track.seconds<100)throw Error('Expected an approved full cyclic arrangement: '+key);
 const bytes=await fs.readFile(path.join(input,key+'-new-world-loop.mp3'));
 if(bytes.length!==track.bytes||hash(bytes)!==track.sha256)throw Error('Rendered music identity changed: '+key);
 const file=track.sha256+'.mp3',gitPath='deploy/runtime/assets/'+file,url='assets/music/'+file;
 for(const destination of [gitPath,'public/'+url]){
  await fs.mkdir(path.dirname(destination),{recursive:true});
  const old=await fs.readFile(destination).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
  if(old&&hash(old)!==track.sha256)throw Error('Preserving changed music: '+destination);
  if(!old)await fs.writeFile(destination,bytes);
 }
 records.push({id:'music.'+key,kind:'music',status:'available',required:true,url,
  sourceFile:gitPath,gitPath,packedFile:'public/'+url,bytes:bytes.length,
  sourceSha256:track.sha256,packedSha256:track.sha256,seconds:track.seconds,loopSamples:track.loopSamples});
}
const registry='// Locally synthesized Dvorak themes; see docs/project/BGM_INTEGRATION_20261029.md.\n'+
 'export const MUSIC_ASSETS = '+JSON.stringify(records.map(({id,kind,status,required,url})=>({id,kind,status,required,url})),null,2)+';\n';
await fs.writeFile('src/assets/music.ts',registry);
await fs.writeFile('deploy/runtime/music-assets.json',JSON.stringify({version:1,generatedSha256:hash(registry),
 source:'preview/bgm-audition-20261029/arrangements.json',generator:'tools/bgm-audition/render.py --full',records},null,2)+'\n');
console.log(JSON.stringify({tracks:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0)}));
