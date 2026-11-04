
globalThis.__SC2_PACKED_GRAPHICS__=true;
globalThis.__SC2_PACK_INDEX_FILE__="sites-pack-index.0bb43ff1011a0ab1462d.js";
globalThis.__SC2_PACK_WORKER_FILE__="sites-sw.bd646d557a5dc16c1b8b.js";
const connectPackedWorker=async function connectPackedWorker(workerURL,scope,timeoutMs=25000){
 const service=navigator.serviceWorker,expected=new URL(workerURL).href,deadline=Date.now()+timeoutMs;
 const remaining=()=>Math.max(1,deadline-Date.now());
 const bounded=async(work,label,ms=remaining())=>{let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]);}finally{clearTimeout(timer);}};
 const registration=await bounded(service.register(expected,{scope,updateViaCache:'none'}),'资源服务连接超时');
 const worker=await new Promise((resolve,reject)=>{
  let settled=false;
  const updating=[...new Set([registration.installing,registration.waiting,registration.active].filter(item=>item?.scriptURL===expected))];
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);service.removeEventListener('controllerchange',check);for(const item of updating)item.removeEventListener('statechange',check);error?reject(error):resolve(value);};
  const check=()=>{const active=service.controller;if(active?.scriptURL===expected&&active.state==='activated')finish(null,active);else if(updating.some(item=>item.state==='redundant'))finish(Error('资源服务更新失败'));};
  const timer=setTimeout(()=>finish(Error('资源服务接管超时')),remaining());
  service.addEventListener('controllerchange',check);for(const item of updating)item.addEventListener('statechange',check);check();
 });
 const channel=new MessageChannel();
 try{
  const reply=await bounded(new Promise((resolve,reject)=>{channel.port1.onmessage=event=>resolve(event.data);channel.port1.onmessageerror=()=>reject(Error('资源服务响应无效'));worker.postMessage({type:'sc2-pack-capabilities'},[channel.port2]);}),'资源服务协议确认超时',Math.min(2000,remaining()));
  if(service.controller!==worker||reply?.protocol!==1||reply?.cacheClear!==true||reply?.versionedIndexes!==true)throw Error('资源服务版本不兼容');
  return worker;
 }finally{channel.port1.close();channel.port2.close();}
};
let workerConnection;
globalThis.__SC2_ENSURE_PACK_WORKER__=()=>{
 if(!workerConnection)workerConnection=connectPackedWorker(new URL('../'+globalThis.__SC2_PACK_WORKER_FILE__,import.meta.url).href,new URL('../',import.meta.url).href).finally(()=>{workerConnection=null;});
 return workerConnection;
};
const memory=navigator.deviceMemory,cores=navigator.hardwareConcurrency;
const limited=(memory&&memory<=2)||(cores&&cores<=2)||(memory&&memory<=4&&cores&&cores<=4)||(memory===undefined&&matchMedia('(pointer:coarse)').matches);
const packBytes=(limited?12:(memory>=8&&cores>=8)?48:24)*1024**2;
const sendBudget=()=>navigator.serviceWorker.controller?.postMessage({type:'sc2-runtime-budget',packBytes,decode:limited?1:2,network:limited?2:4});
navigator.serviceWorker?.addEventListener('controllerchange',sendBudget);
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='sc2-request-budget')sendBudget();});
const progress=message=>document.dispatchEvent(new CustomEvent('sc2-opening-progress',{detail:{value:null,phase:'loading',message}}));
async function bounded(work,label,ms=60000){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]);}finally{clearTimeout(timer);}}
async function connect(){
 await globalThis.__SC2_ENSURE_PACK_WORKER__();
 sendBudget();
 const controller=new AbortController();
 try{
  return await bounded((async()=>{const r=await fetch(new URL('./sc2-entry.c3dff6d37875296d.js.gz',import.meta.url),{signal:controller.signal});if(!r.ok)throw Error('游戏程序下载失败');let bytes=await r.arrayBuffer();if(new Uint8Array(bytes)[0]===31&&new Uint8Array(bytes)[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return bytes;})(),'游戏程序下载超时');
 }finally{controller.abort();}
}
function recover(unsupported=false){
 document.dispatchEvent(new Event('sc2-opening-finish'));
 const root=document.getElementById('interface');if(!root)return;
 const section=document.createElement('section');section.className='pack-loading';
 const label=document.createElement('p');label.textContent=unsupported?'请更新 Chrome 后重试':'游戏加载失败';section.append(label);
 const button=document.createElement('button');button.textContent='重试';button.onclick=()=>location.reload();section.append(button);root.replaceChildren(section);
}
if(!('serviceWorker' in navigator)||!('DecompressionStream' in globalThis)){recover(true);}else{
 let bytes;
 for(let attempt=0;attempt<4;attempt++){
  try{progress(attempt?'正在重新连接 · '+attempt+'/3':'正在连接资源服务');bytes=await connect();break;}
  catch(error){console.warn('Game startup attempt failed',error);if(attempt===3){recover();break;}progress('正在重新连接 · '+(attempt+1)+'/3');await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}
 }
 if(bytes){const url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));try{await import(url);}catch(error){console.error(error);recover();}finally{URL.revokeObjectURL(url);}}
}
