import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
const home=path.dirname(fileURLToPath(import.meta.url)),pointer=path.join(home,'active-release.json');
// Load optional backend configuration (non-.env name so the deploy archive keeps it).
const envFile=path.join(home,'sc2-backend.conf');
if(fs.existsSync(envFile)){
 for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){
  const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(!m)continue;
  const key=m[1],value=m[2].trim();
  // Resolve filesystem paths against the deploy root; the cloud mount point is not known in advance.
  if(key==='SC2_PGLITE_DIR'||key==='SC2_DELETION_JOURNAL')process.env[key]=path.isAbsolute(value)?value:path.resolve(home,value);
  else process.env[key]=value;
 }
}
let app=home,resourceRoot=process.env.ASSET_ROOT||path.join(home,'public');
if(fs.existsSync(pointer)){const active=JSON.parse(fs.readFileSync(pointer,'utf8'));if(!/^releases\/[a-f0-9]{64}$/.test(active.directory))throw Error('Invalid active release');app=path.join(home,active.directory);resourceRoot=process.env.ASSET_ROOT||path.resolve(home,active.assetRoot);}
const {createGameServer}=await import(pathToFileURL(path.join(app,'coze-web-server.mjs')).href);
// --- 最小 tar.gz 解压器（部署产物只读时用于还原 pglite 数据到可写目录）---
function cstr8(b){const i=b.indexOf(0);return i<0?b.toString('utf8'):b.subarray(0,i).toString('utf8');}
function extractTgz(buf,dest){
 const data=zlib.gunzipSync(buf);let off=0;
 while(off+512<=data.length){
  const head=data.subarray(off,off+512);
  if(head.every(b=>b===0))break;
  const rawName=cstr8(head.subarray(0,100));const prefix=cstr8(head.subarray(345,500));
  let full=(prefix?prefix+'/':'')+rawName;full=full.replace(/^\.\//,'');
  if(!full){off+=512;continue;}
  const size=parseInt(cstr8(head.subarray(124,136)).trim()||'0',8);
  const type=String.fromCharCode(head[156]||48);
  const total=512+Math.ceil(size/512)*512;
  if(type==='x'||type==='g'){off+=total;continue;}
  if(full.includes('..')||full.startsWith('/')){off+=total;continue;}
  if(type==='5'||((type==='0'||type===48||type==='\0')&&full.endsWith('/'))){
   fs.mkdirSync(path.join(dest,full),{recursive:true});
  } else if(type==='0'||type===48||type==='\0'){
   const filePath=path.join(dest,full);fs.mkdirSync(path.dirname(filePath),{recursive:true});
   fs.writeFileSync(filePath,data.subarray(off+512,off+512+size));
  }
  off+=total;
 }
}
// --- pglite 数据重定向：部署产物目录只读时，把数据还原到可写工作目录（如 /tmp）---
try{
  const pgliteDir=process.env.SC2_PGLITE_DIR,journalFile=process.env.SC2_DELETION_JOURNAL;
  if(pgliteDir){
    let homeWritable=true;
    const probe=path.join(home,'.wprobe-'+process.pid);
    try{fs.writeFileSync(probe,'x');fs.unlinkSync(probe);}catch(e){homeWritable=false;}
    if(!homeWritable){
      const workRoot=path.join('/tmp','sc2-pglite-work');
      const workDir=path.join(workRoot,'pglite');
      fs.mkdirSync(workRoot,{recursive:true});
      if(!fs.existsSync(workDir)||fs.readdirSync(workDir).length===0){
        const bundle=path.join(home,'data','pglite-bundle.tgz');
        if(fs.existsSync(bundle)){extractTgz(fs.readFileSync(bundle),workRoot);console.error('PGLITE_EXTRACT bundle='+bundle+' to='+workRoot);}
        else if(fs.existsSync(pgliteDir)){fs.cpSync(pgliteDir,workDir,{recursive:true});}
      }
      if(!fs.existsSync(workDir))fs.mkdirSync(workDir,{recursive:true});
      process.env.SC2_PGLITE_DIR=workDir;
      if(journalFile){
        const jFile=path.join(workRoot,'deletions.jsonl');
        if(!fs.existsSync(jFile)&&fs.existsSync(journalFile))fs.copyFileSync(journalFile,jFile);
        process.env.SC2_DELETION_JOURNAL=jFile;
      }
      console.error('PGLITE_REDIRECT '+JSON.stringify({from:pgliteDir,to:workDir,journal:process.env.SC2_DELETION_JOURNAL||'',pgver:(fs.existsSync(path.join(workDir,'PG_VERSION'))?fs.readFileSync(path.join(workDir,'PG_VERSION'),'utf8').trim():'missing')}));
    }
  }
}catch(e){console.error('PGLITE_REDIRECT_ERR',e&&(e.stack||e.message||e));}
const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const server=createGameServer({webRoot:fs.existsSync(pointer)?path.join(app,'public'):process.env.WEB_ROOT||path.join(app,'public'),assetRoot:resourceRoot,assetBaseUrl:process.env.ASSET_BASE_URL||''});
// --- 启动诊断：云端可写路径与 pglite 数据目录状态 ---
try{
 const probes=[home,process.cwd(),'/tmp',process.env.TMPDIR||'',process.env.SC2_PGLITE_DIR||'',path.dirname(process.env.SC2_PGLITE_DIR||'')];
 const diag={cwd:process.cwd(),uid:(typeof process.getuid==='function'?process.getuid():-1),gid:(typeof process.getgid==='function'?process.getgid():-1),pglite:process.env.SC2_PGLITE_DIR||''};
 for(const dir of probes){if(!dir)continue;
  try{const st=fs.statSync(dir);const entry={mode:(st.mode&0o7777).toString(8),dir:st.isDirectory(),size:st.size};
   const probe=path.join(dir,'.wprobe-'+process.pid);
   try{fs.writeFileSync(probe,'x');fs.unlinkSync(probe);entry.writable=true;}catch(e){entry.writable=false;}
   if(dir.endsWith('pglite')&&st.isDirectory()){
    try{entry.files=fs.readdirSync(dir).length;}catch(e){entry.files='err:'+e.code;}
    try{entry.pgver=fs.readFileSync(path.join(dir,'PG_VERSION'),'utf8').trim();}catch(e){entry.pgver='err:'+e.code;}
   }
   diag[dir]=entry;
  }catch(e){diag[dir]='stat_err:'+e.code;}
 }
 console.error('START_DIAG '+JSON.stringify(diag));
}catch(e){console.error('START_DIAG_ERR',e&&e.stack||e);}
if(server.backend?.ready)server.backend.ready.then(ok=>console.log('backend ready:',ok)).catch(e=>console.error('backend init error:',e&&(e.stack||e.message||e)));
server.listen(port,'0.0.0.0',()=>console.log('SC2 ready on '+port));
