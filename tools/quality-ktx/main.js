import * as THREE from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setSize(1024,1280);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
const loader=new KTX2Loader().setTranscoderPath('./basis/').setWorkerLimit(1).detectSupport(renderer),fallback=new KTX2Loader().setTranscoderPath('./basis/').setWorkerLimit(1).detectSupport(renderer);
for(const key of Object.keys(fallback.workerConfig))fallback.workerConfig[key]=false;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,2.5,-2.5,.1,10);camera.position.z=2;
const samples=await(await fetch('./samples.json')).json(),results=[];renderer.setClearColor(0,0);
try{for(let i=0;i<samples.length;i++){
 const s=samples[i],times={},textures=[];for(const kind of ['webp','ktx2']){const at=performance.now();const t=await(kind==='webp'?new THREE.TextureLoader():loader).loadAsync('./'+s.name+'.'+kind);times[kind+'LoadMs']=performance.now()-at;t.flipY=false;t.colorSpace=s.linear?THREE.NoColorSpace:THREE.SRGBColorSpace;const upload=performance.now();renderer.initTexture(t);renderer.getContext().finish();times[kind+'UploadMs']=performance.now()-upload;textures.push(t);}
 const at=performance.now(),raw=await fallback.loadAsync('./'+s.name+'.ktx2');times.fallbackLoadMs=performance.now()-at;
 const [webp,ktx2]=textures;for(let col=0;col<2;col++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.94),new THREE.MeshBasicMaterial({map:textures[col],transparent:s.name==='alpha',depthTest:false}));m.position.set(col?1:-1,2-i,0);scene.add(m);}
 results.push({...s,...times,format:ktx2.format,compressedBytes:ktx2.mipmaps.reduce((n,m)=>n+m.data.byteLength,0),rgbaMipEstimate:Math.round(s.width*s.height*4*4/3),fallbackFormat:raw.format,fallbackBytes:raw.mipmaps?.reduce((n,m)=>n+m.data.byteLength,0)||raw.image?.data?.byteLength});raw.dispose();renderer.render(scene,camera);
 }
 globalThis.__KTX_RESULT__={samples:results,capabilities:loader.workerConfig,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
}catch(error){globalThis.__KTX_ERROR__=String(error);throw error;}finally{loader.dispose();fallback.dispose();}
