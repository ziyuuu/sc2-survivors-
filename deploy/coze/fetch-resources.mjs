import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const args=process.argv.slice(2),arg=(k,fallback)=>{const i=args.indexOf(k);return i<0?fallback:args[i+1];};
const commit=arg('--commit','');if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Use --commit with the full immutable Git commit SHA.');
const repo=arg('--repo','ziyuuu/sc2-survivors-'),group=arg('--group','all'),out=path.resolve(arg('--out','./public'));
if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('Invalid repository');
const headers=process.env.GITHUB_TOKEN?{Authorization:'Bearer '+process.env.GITHUB_TOKEN}:{};
const request=async(url,extra={})=>{const r=await fetch(url,{headers:{...headers,...extra},signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`${r.status} ${url}`);return r;};
// Fetch the index from the same fixed commit: a local stale manifest cannot silently mix releases.
const index=await (await request(`https://raw.githubusercontent.com/${repo}/${commit}/deploy/coze/resource-groups.json`)).json();
const localRelease=await fs.readFile(path.join(out,'web-release.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
if(!args.includes('--resources-only')&&localRelease&&localRelease.release!==index.release)throw Error('The selected commit resources do not match this app release. Obtain the app from the same commit first.');
const groups=group.split(',');if(group!=='all'&&groups.some(g=>!index.groups.includes(g)))throw Error('Unknown group: '+group);
let rows=index.files.filter(f=>group==='all'||f.groups.some(g=>groups.includes(g)));
// Release verification may stream only changed objects. Normal installation must
// always check the full target index so a different deployed base also works.
if(args.includes('--changed-only')){
 if(!args.includes('--verify-remote'))throw Error('--changed-only is for remote verification, not installation.');
 const delta=await(await request(`https://raw.githubusercontent.com/${repo}/${commit}/deploy/coze/resource-delta.json`)).json();
 if(delta.to!==index.release)throw Error('Delta and full release index disagree');
 const changed=new Set(delta.files.map(f=>f.sha256));rows=rows.filter(f=>changed.has(f.sha256));
}
const digest=b=>createHash('sha256').update(b).digest('hex');
if(args.includes('--verify-remote')){
 let cursor=0,verified=0,bytes=0;await Promise.all(Array.from({length:6},async()=>{for(;;){const f=rows[cursor++];if(!f)break;
  if(!/^deploy\/runtime\/assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(f.gitPath))throw Error('Invalid remote path');
  let valid=false;for(let n=0;n<4&&!valid;n++)try{const r=await request(`https://media.githubusercontent.com/media/${repo}/${commit}/${f.gitPath}`),hash=createHash('sha256');let size=0;for await(const chunk of r.body){hash.update(chunk);size+=chunk.length;}if(size!==f.bytes||hash.digest('hex')!==f.sha256)throw Error('Remote resource mismatch '+f.gitPath);valid=true;verified++;bytes+=size;}catch(e){if(n===3)throw e;await new Promise(r=>setTimeout(r,700*(n+1)));}
  if(verified%50===0)console.log(JSON.stringify({verified,total:rows.length}));
 }}));console.log(JSON.stringify({commit,release:index.release,group,verified,bytes,remote:true}));process.exit(0);
}
let verified=0,downloaded=0,total=0;
for(const f of rows){if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(f.url)||f.gitPath!=='deploy/runtime/'+f.url||!Number.isSafeInteger(f.bytes)||f.bytes<1)throw Error('Invalid manifest row');
 const dest=path.resolve(out,f.url),part=dest+'.partial';await fs.mkdir(path.dirname(dest),{recursive:true});
 const cached=await fs.readFile(dest).catch(()=>null);if(cached&&cached.length===f.bytes&&digest(cached)===f.sha256){verified++;total+=cached.length;continue;}
 let done=false;
 for(let attempt=0;attempt<4&&!done;attempt++)try{
  const old=await fs.stat(part).catch(()=>null),offset=old&&old.size<f.bytes?old.size:0;
  const url=`https://media.githubusercontent.com/media/${repo}/${commit}/${f.gitPath}`,r=await request(url,offset?{Range:`bytes=${offset}-`}:{});
  const append=offset>0&&r.status===206&&r.headers.get('content-range')?.startsWith(`bytes ${offset}-`);const file=await fs.open(part,append?'a':'w');
  try{for await(const bytes of r.body)await file.writeFile(bytes);}finally{await file.close();}
  const bytes=await fs.readFile(part);if(bytes.length!==f.bytes||digest(bytes)!==f.sha256){await fs.rm(part,{force:true});throw Error('Hash/size mismatch (or LFS pointer): '+f.url);}
  await fs.rename(part,dest);done=true;downloaded++;total+=bytes.length;
 }catch(e){if(attempt===3)throw e;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
 console.log(`${verified+downloaded}/${rows.length} verified`);
}
await fs.writeFile(path.join(out,`resource-receipt-${group.replaceAll(',','-')}.json`),JSON.stringify({commit,release:index.release,group,files:rows.length,verified,downloaded,bytes:total},null,2));
console.log(JSON.stringify({commit,release:index.release,group,verified,downloaded,bytes:total}));
