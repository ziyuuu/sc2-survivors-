import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read('.cache/t01-motion-feedback/baseline.json'),data=await read('src/data/combat-audio.json'),registry=await read('deploy/runtime/combat-audio.json');
const priorBanks=new Set();
for(const r of Object.values(data.weapons))for(const k of [r.attack,r.impact,r.powered,...r.channel??[],...Object.values(r.surfaces)])if(k)priorBanks.add(k);
for(const rows of [data.special,data.deaths])for(const values of Object.values(rows))values.forEach(k=>priorBanks.add(k));
for(const r of Object.values(data.skills))for(const[k,v]of Object.entries(r))if(k!=='note')priorBanks.add(v);
const banks=Object.fromEntries(Object.entries(data.banks).filter(([k])=>priorBanks.has(k)).map(([k,b])=>{const c={...b};delete c.maxDuration;return [k,c];}));
const previous={version:data.version,sourceBuild:data.sourceBuild,unavailableNativeVariants:data.unavailableNativeVariants,weapons:data.weapons,deaths:data.deaths,skills:data.skills,special:data.special,banks};
assert.equal(sha(JSON.stringify(previous)),baseline.files['src/data/combat-audio.json'],'all prior audio routes and bank metadata preserved');
const oldAssets=new Set(Object.values(banks).flatMap(b=>b.samples.map(s=>'audio.'+s.asset))),oldRuntime=registry.records.filter(r=>oldAssets.has(r.id)).map(r=>Object.fromEntries(['id','kind','status','required','url'].map(k=>[k,r[k]])));
const oldGenerated='// Generated from pinned SC2 B97563 SoundData by tools/prepare-combat-audio.py.\nexport const COMBAT_AUDIO_ASSETS = '+JSON.stringify(oldRuntime)+';\n';
assert.equal(sha(oldGenerated),baseline.files['src/assets/combat-audio.ts'],'all previous runtime audio assets byte-for-byte preserved');
let sources=0,gameplay=0;for(const [p,hash]of Object.entries(baseline.files))if(p.startsWith('src/simulation/')){assert.equal(sha(await fs.readFile(p)),hash,p);gameplay++;}
for(const r of registry.records){assert.equal(sha(await fs.readFile(r.sourceFile)),r.sourceSha256,r.sourceFile);assert.equal(sha(await fs.readFile(r.gitPath)),r.packedSha256,r.gitPath);sources++;}
const report={originals:sources,oldAudioAssets:oldRuntime.length,addedAudioAssets:sources-oldRuntime.length,previousAudioUnchanged:true,gameplayFilesUnchanged:gameplay,movementIdentities:Object.entries(data.motion).filter(([,v])=>v).map(([k])=>k),dialogueIdentities:Object.entries(data.dialogue).filter(([,v])=>v.length).map(([k])=>k),silentIdentities:data.motionSourceAudit.filter(r=>!r.movement).map(r=>({key:r.key,sourceActor:r.actor,movementToken:r.movementToken})),transformDirections:Object.keys(data.transforms).length,transformTiming:data.transformTiming,sourceBytes:registry.records.reduce((n,r)=>n+r.bytes,0),locale:{zhcn:registry.records.filter(r=>r.sourcePath.includes('/zhcn.')).length,enus:registry.records.filter(r=>r.sourcePath.includes('/enus.')).length,unlocalized:registry.records.filter(r=>r.sourcePath.includes('/base.')).length}};
await fs.writeFile('.cache/t01-motion-feedback/data-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,silentIdentities:report.silentIdentities.length,movementIdentities:report.movementIdentities.length,dialogueIdentities:report.dialogueIdentities.length}));
