import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const ff='sites/v04-compression-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe',root='reports/local/tutorial-20261105',out=root+'/review/recordings';await fs.mkdir(out,{recursive:true});
const seconds=t=>t.split(':').reduce((n,v)=>n*60+Number(v),0);
function duration(file){const r=spawnSync(ff,['-i',file,'-f','null','-'],{encoding:'utf8',maxBuffer:4e6});assert.equal(r.status,0,r.stderr);const t=[...r.stderr.matchAll(/time=(\d+:\d+:[\d.]+)/g)].at(-1)?.[1];assert.ok(t,'No decoded duration');return seconds(t);}
const files=[];
for(const race of (process.argv[2]?[process.argv[2]]:['terran','zerg','protoss'])){
 const dir=root+'/guided-recordings/'+race,r=JSON.parse(await fs.readFile(dir+'/result.json','utf8'));assert.equal(r.passed,true);assert.equal(r.record,true);assert.equal(r.audio?.captured,true,'Game audio was not captured');
 const video=dir+'/screen.webm',audio=dir+'/game-audio.webm',v=duration(video),a=duration(audio),delay=Math.max(0,v-a),file=out+'/'+race+'.mp4';
 const mux=spawnSync(ff,['-y','-i',video,'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af',`adelay=${Math.round(delay*1000)}:all=1,apad`,'-t',String(v),'-movflags','+faststart',file],{encoding:'utf8',maxBuffer:4e6});assert.equal(mux.status,0,mux.stderr);
 const bytes=await fs.readFile(file),decoded=duration(file);assert.ok(Math.abs(v-decoded)<.2);
 const step=r.clicks.find(c=>c.step==='equip-3')??r.clicks[0],frame=step.timestamp&&r.audio.start?delay+(step.timestamp-r.audio.start)/1000:delay+5;
 const poster=out+'/'+race+'.png',shot=spawnSync(ff,['-y','-ss',String(Math.max(0,frame)),'-i',file,'-frames:v','1',poster],{encoding:'utf8',maxBuffer:1e6});assert.equal(shot.status,0,shot.stderr);
 const row={race,appBuildId:r.build.appBuildId,file,poster,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),durationSeconds:decoded,videoDimensions:r.size,clicks:r.clicks.length,gameAudio:true,audioLeadSilenceSeconds:delay,physicalPhone:false,assistance:r.assistance,sourceResult:dir+'/result.json'};files.push(row);await fs.writeFile(dir+'/recording.json',JSON.stringify(row,null,2));console.log(JSON.stringify(row));
}
const existing=await fs.readFile(out+'/manifest.json','utf8').then(JSON.parse,()=>[]);await fs.writeFile(out+'/manifest.json',JSON.stringify([...existing.filter(e=>!files.some(f=>f.race===e.race)),...files],null,2));
