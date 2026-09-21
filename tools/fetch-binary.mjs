import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
/** Same public URL, no credentials or shell interpolation. Native Windows TLS handles local proxy routing. */
export async function fetchBinary(url){
 if(process.platform==='win32'){const {stdout}=await run('curl.exe',['--fail','--silent','--show-error','--location','--connect-timeout','12','--max-time','45',url],{encoding:'buffer',maxBuffer:64*1024*1024,windowsHide:true});return stdout;}
 const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);return Buffer.from(await r.arrayBuffer());
}
