import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve('.'),out='reports/local/maintenance-audit-20261008';
const roots=[root,'C:/Users/zyuu/AppData/Local/Temp','C:/Users/zyuu/AppData/Local/npm-cache','C:/Users/zyuu/AppData/Local/pip/Cache','C:/Users/zyuu/.cache'];
const files=[],links=[],errors=[];
async function walk(dir,base){
 let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){errors.push({path:dir,code:e.code});return;}
 for(const e of entries){const full=path.join(dir,e.name);let s;try{s=await fs.lstat(full);}catch(e){errors.push({path:full,code:e.code});continue;}
  if(s.isSymbolicLink()){links.push({path:full,target:await fs.readlink(full).catch(()=>'?')});continue;}
  if(s.isDirectory())await walk(full,base);else files.push({path:full.replaceAll('\\','/'),root:base.replaceAll('\\','/'),relative:path.relative(base,full).replaceAll('\\','/'),bytes:s.size,mtime:s.mtimeMs,links:s.nlink});
 }
}
for(const dir of roots)await walk(path.resolve(dir),path.resolve(dir));
const groups=new Map();for(const f of files){const p=f.relative.split('/');const name=f.root+'/'+p.slice(0,p[0]==='.cache'||p[0]==='dist'||p[0]==='.git'?2:1).join('/');const g=groups.get(name)??{path:name,files:0,bytes:0,newest:0,linkedFiles:0};g.files++;g.bytes+=f.bytes;g.newest=Math.max(g.newest,f.mtime);g.linkedFiles+=Number(f.links>1);groups.set(name,g);}
const protectedFiles=[];for(const f of files.filter(f=>f.root===root.replaceAll('\\','/')&&/^(src|preview|tools\/backend|deploy\/runtime|public\/assets)\//.test(f.relative))){protectedFiles.push({path:f.relative,bytes:f.bytes,sha256:createHash('sha256').update(await fs.readFile(f.path)).digest('hex')});}
const duplicates=new Map();for(const f of protectedFiles){const group=duplicates.get(f.sha256)??[];group.push(f);duplicates.set(f.sha256,group);}
const duplicateGroups=[...duplicates.entries()].filter(([,rows])=>rows.length>1).map(([sha256,rows])=>({sha256,bytes:rows[0].bytes,copies:rows.length,extraLogicalBytes:rows[0].bytes*(rows.length-1),paths:rows.map(r=>r.path)})).sort((a,b)=>b.extraLogicalBytes-a.extraLogicalBytes);
await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/inventory.json',JSON.stringify({at:new Date().toISOString(),root,roots,groups:[...groups.values()].sort((a,b)=>b.bytes-a.bytes),files,links,errors},null,2));
await fs.writeFile(out+'/protected-before.json',JSON.stringify(protectedFiles,null,2));
await fs.writeFile(out+'/duplicates.json',JSON.stringify(duplicateGroups,null,2));
console.log(JSON.stringify({files:files.length,logicalBytes:files.reduce((n,f)=>n+f.bytes,0),top:[...groups.values()].sort((a,b)=>b.bytes-a.bytes).slice(0,45),protected:protectedFiles.length,duplicateGroups:duplicateGroups.length,duplicateBytes:duplicateGroups.reduce((n,g)=>n+g.extraLogicalBytes,0),errors:errors.length},null,2));
