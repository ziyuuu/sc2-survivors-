
const progress=message=>document.dispatchEvent(new CustomEvent('sc2-opening-progress',{detail:{value:null,phase:'loading',message}}));
async function bounded(work,label,ms=60000){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]);}finally{clearTimeout(timer);}}
async function connect(){
 await bounded(navigator.serviceWorker.register(new URL('../sites-sw.js',import.meta.url),{scope:'../',updateViaCache:'none'}),'资源服务连接超时',25000);
 await bounded(navigator.serviceWorker.ready,'资源服务启动超时',25000);
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{
  const ready=()=>{if(!navigator.serviceWorker.controller)return;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',ready);resolve();};
  const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',ready);reject(Error('资源服务启动超时'));},15000);
  navigator.serviceWorker.addEventListener('controllerchange',ready);ready();
 });
 if(matchMedia('(pointer:coarse)').matches)navigator.serviceWorker.controller.postMessage({type:'sc2-pack-memory-limit',entries:4});
 const controller=new AbortController();
 try{
  return await bounded((async()=>{const r=await fetch(new URL('./sc2-entry.14c03c55a64693b2.js.gz',import.meta.url),{signal:controller.signal});if(!r.ok)throw Error('游戏程序下载失败');let bytes=await r.arrayBuffer();if(new Uint8Array(bytes)[0]===31&&new Uint8Array(bytes)[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return bytes;})(),'游戏程序下载超时');
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
