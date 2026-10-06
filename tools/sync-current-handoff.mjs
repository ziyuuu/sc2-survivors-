// Copy a verified local candidate into the tracked application directory.
// This edits repository files only; it never contacts or updates a deployment.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const app=path.resolve(process.argv[2]??''),dist=path.resolve('dist'),target=path.resolve('deploy/coze');
const inside=(base,file)=>{const r=path.relative(base,file);return !!r&&!r.startsWith('..')&&!path.isAbsolute(r);};
assert.ok(inside(dist,app),'Application must be inside dist');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const before=await read(path.join(target,'delivery.json')),after=await read(path.join(app,'delivery.json')),newPaths=new Set(after.appFiles.map(r=>r.path));
const checkedPath=(base,file)=>{const full=path.resolve(base,file);assert.ok(inside(base,full),'Path escapes package: '+file);return full;};
for(const r of after.appFiles){const b=await fs.readFile(checkedPath(app,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(sha(b),r.sha256,r.path);checkedPath(target,r.path);}
// Refuse to replace or remove repository application files changed since its
// previous delivery manifest was generated.
for(const r of before.appFiles){const b=await fs.readFile(checkedPath(target,r.path));assert.equal(b.length,r.bytes,r.path);assert.equal(sha(b),r.sha256,r.path);}
const superseded=before.appFiles.filter(r=>!newPaths.has(r.path));
for(const r of after.appFiles){const file=checkedPath(target,r.path);await fs.mkdir(path.dirname(file),{recursive:true});await fs.copyFile(checkedPath(app,r.path),file);}
for(const r of superseded)await fs.unlink(checkedPath(target,r.path));
await fs.copyFile(path.join(app,'delivery.json'),path.join(target,'delivery.json'));
console.log(JSON.stringify({localRepositoryOnly:true,appBuildId:after.appBuildId,packageBuildId:after.packageBuildId,copied:after.appFiles.length,superseded:superseded.map(r=>r.path),deployed:false}));
