import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='reports/local/combat-effects-20261012',read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const selection=await read(root+'/final-selection-r3.json'),pairs=await read(root+'/paired-states-r3.json'),coverage=await read(root+'/coverage-r3.json'),support=await read(root+'/coverage-support-r3.json');
const byImage=new Map(pairs.rows.map(r=>[r.after,r])),pairedHashes=new Map(pairs.rows.flatMap(r=>[[r.before,r.beforeSha256],[r.after,r.afterSha256]]));
const records=selection.records.map(r=>{const p=byImage.get(r.image);return {...r,identities:[],...(p?{before:p.before,beforeBuild:p.beforeBuild,state:p.state}:{} )};});
for(const run of new Set(records.map(r=>r.run))){const raw=await read(root+'/'+run+'/result.json'),rows=new Map(raw.records.map(r=>[r.name,r]));for(const item of records.filter(r=>r.run===run))item.identities=[...new Set((rows.get(item.name)?.subjects??[]).map(s=>s.identity))];}
for(const [label,suite]of [['formal-web-r1','formal-web'],['formal-offline-r1','formal-offline'],['formal-missing-r1','formal-missing'],['controls-web-r1','controls-web'],['controls-offline-r1','controls-offline']]){
 const run='final-r3/'+label,r=await read(root+'/'+run+'/result.json');assert.ok(r.passed,label);for(const name of r.screens)records.push({run,suite,group:suite,name,image:run+'/'+name+'.png',build:r.build.appBuildId,identities:[],time:null,tick:null});
}
const review=await read(root+'/video-review-r2/result.json');assert.ok(review.passed);for(const r of review.frames)records.push({run:'video-review-r2',suite:'video-keyframes',group:r.race,name:r.file.slice(0,-4),image:'video-review-r2/'+r.file,build:selection.diagnostic,identities:[],time:null,tick:null,videoTime:r.time});
const recordings=await read(root+'/final-recordings-r2/result.json');assert.ok(recordings.passed);const videos=recordings.records.map(r=>({race:r.race,file:'final-recordings-r2/'+r.video,wallSeconds:r.clock.wallSeconds,ticks:r.clock.ticks,discarded:r.clock.discarded,build:recordings.build.jsSha256}));
const routes=coverage.routes.map(r=>{const extra=support.supplementalSupportRoutes.find(s=>s.route===r.key);return {...r,jump:(r.witnesses[0]??extra?.witnesses[0])?.image};});assert.ok(routes.every(r=>r.jump));
const data={records,videos,routes,identities:coverage.identities.map(({id,name,race,kind})=>({id,name,race,kind}))};
const images=[...new Set(records.flatMap(r=>[r.image,...r.before?[r.before]:[]]))],files=[];
for(const file of images){const fd=await fs.open(root+'/'+file,'r'),header=Buffer.alloc(24);await fd.read(header,0,24,0);await fd.close();assert.equal(header.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file);assert.ok(header.readUInt32BE(16)>0&&header.readUInt32BE(20)>0,file);const h=createHash('sha256');for await(const b of createReadStream(root+'/'+file))h.update(b);const sha256=h.digest('hex');if(pairedHashes.has(file))assert.equal(sha256,pairedHashes.get(file),file);files.push({file,width:header.readUInt32BE(16),height:header.readUInt32BE(20),sha256});}
const template=await fs.readFile('preview/combat-effects-20261012/comparison-template.html','utf8'),html=template.replace('__GALLERY_DATA__',JSON.stringify(data).replaceAll('<','\\u003c'));
await fs.writeFile(root+'/comparison.html',html,{flag:'wx'});await fs.writeFile(root+'/gallery-data.json',JSON.stringify(data),{flag:'wx'});await fs.writeFile(root+'/gallery-files.json',JSON.stringify({passed:true,records:records.length,pairs:pairs.pairedStates,images:images.length,videos:videos.length,identities:data.identities.length,files},null,2),{flag:'wx'});console.log(JSON.stringify({records:records.length,pairs:pairs.pairedStates,images:images.length,videos:videos.length,identities:data.identities.length}));
