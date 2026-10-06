import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const out='reports/local/p6-20261006';await fs.mkdir(out,{recursive:true});
const previous=JSON.parse(await fs.readFile('reports/local/p5-backend-20261006/preservation.json','utf8'));
async function fingerprint(path){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(path)){h.update(b);bytes+=b.length;}return {path,bytes,sha256:h.digest('hex')};}
const source=[];for(const prior of [...previous.source,...previous.added]){const now=await fingerprint(prior.path);assert.equal(now.sha256,prior.sha256,'Post-P5 source changed: '+prior.path);source.push(now);}
const artifacts=[];for(const prior of [...previous.artifacts,...previous.outputs]){const now=await fingerprint(prior.path);assert.deepEqual(now,prior);artifacts.push(now);}
const proposals=[];for(const p of JSON.parse(await fs.readFile('reports/local/p4-followup-20261005/preservation.json','utf8')).proposals){const now=await fingerprint(p.path);assert.deepEqual(now,p);proposals.push(now);}
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),manifest=JSON.parse(await fs.readFile('dist/web/'+web.manifest,'utf8'));
assert.equal(web.appBuildId,previous.web.appBuildId);assert.equal(web.release,previous.resources.release);
const data={at:new Date().toISOString(),phase:'P6 start; original P5 delivery preserved',source,artifacts,proposals,web,manifest,package:await fingerprint('dist/P5-Coze-Application-20261006.zip')};await fs.writeFile(out+'/baseline.json',JSON.stringify(data,null,2),{flag:'wx'});console.log(JSON.stringify({sources:source.length,html:artifacts.length,release:web.release,app:web.appBuildId}));
