if (!('serviceWorker' in navigator) || !('DecompressionStream' in globalThis)) throw new Error('该浏览器不支持本测试版的资源解压，请使用新版 Chrome 或 Edge');
await navigator.serviceWorker.register(new URL('../sites-sw.js', import.meta.url), {scope:'../'});
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller) await new Promise((resolve,reject) => {const t=setTimeout(()=>reject(new Error('资源服务启动超时')),15000); navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(t);resolve()}, {once:true}); if(navigator.serviceWorker.controller){clearTimeout(t);resolve()}});
const response=await fetch(new URL('./sc2-entry.js.gz',import.meta.url)); if(!response.ok) throw new Error('游戏程序下载失败：'+response.status);
let bytes=await response.arrayBuffer(); if(new Uint8Array(bytes)[0]===31 && new Uint8Array(bytes)[1]===139) bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
const url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'})); try {await import(url)} finally {URL.revokeObjectURL(url)}
