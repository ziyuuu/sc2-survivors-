import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [origin,siteRoot,reportPath]=process.argv.slice(2);
if(new URL(origin).protocol!=='https:'||!siteRoot||!reportPath)throw Error('Provide HTTPS Site origin, checkout and report path');
const raw=await new Promise(resolve=>{let input='';if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stderr.write('Ready for temporary upload key JSON on stdin (input is hidden).\n');process.stdin.setEncoding('utf8');process.stdin.on('data',s=>{input+=s;if(/[\r\n]/.test(input)){if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();resolve(input.trim());}});process.stdin.resume();});
const {key}=JSON.parse(raw),inventory=JSON.parse(await fs.readFile(path.join(siteRoot,'delivery/assets.json'),'utf8')),entries=Object.entries(inventory);let cursor=0,completed=0,bytes=0;
const results=[],failed=[];
async function worker(){for(;;){const i=cursor++;if(i>=entries.length)return;const [name,entry]=entries[i];if(!/^bundle-[a-z0-9-]+\.bin$/.test(name))throw Error('Invalid inventory name');const body=await fs.readFile(path.join(siteRoot,'public/assets',name));if(body.length!==entry.bytes||createHash('sha256').update(body).digest('hex')!==entry.sha256)throw Error('Local integrity mismatch '+name);
 let error;
 for(let attempt=0;attempt<3;attempt++)try{
  const response=await fetch(origin+'/api/_delivery-assets/'+name,{method:'PUT',redirect:'error',signal:AbortSignal.timeout(90000),headers:{authorization:'Bearer '+key,'content-type':'application/octet-stream','content-length':String(body.length),'x-content-sha256':entry.sha256},body});
  if(!response.ok)throw Error('Upload HTTP '+response.status);const result=await response.json();if(result.sha256!==entry.sha256||result.bytes!==entry.bytes||!result.present)throw Error('Server integrity mismatch');
  results.push({name,sha256:entry.sha256,bytes:entry.bytes});completed++;bytes+=entry.bytes;if(completed%25===0||completed===entries.length)console.log(JSON.stringify({uploaded:completed,total:entries.length,bytes}));error=null;break;
 }catch(e){error=e;if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
 if(error)failed.push({name,error:String(error)});
}}
try{await Promise.all(Array.from({length:4},worker));await fs.writeFile(reportPath,JSON.stringify({uploaded:completed,total:entries.length,bytes,serverSha256Verified:failed.length===0,results,failed},null,2));if(failed.length)throw Error(`${failed.length} assets failed; see bounded report`);console.log('All immutable resources uploaded and server SHA256 verified.');}
catch(error){console.error(String(error));process.exitCode=1;}
finally{process.stdin.destroy();}
