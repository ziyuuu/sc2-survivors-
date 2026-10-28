import * as THREE from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
const samples=await(await fetch('./samples.json')).json();
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),alpha:true,antialias:false,preserveDrawingBuffer:true});
renderer.setSize(1024,samples.length*256);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const loader=new KTX2Loader().setTranscoderPath('./basis/').setWorkerLimit(1).detectSupport(renderer),fallback=new KTX2Loader().setTranscoderPath('./basis/').setWorkerLimit(1).detectSupport(renderer);
for(const key of Object.keys(fallback.workerConfig))fallback.workerConfig[key]=false;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,samples.length/2,-samples.length/2,.1,10);camera.position.z=2;
const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{map:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 vUv;uniform sampler2D map;void main(){gl_FragColor=texture2D(map,vUv);}'}));
const metricScene=new THREE.Scene();metricScene.add(quad);
function pixels(texture,w,h){
 const target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:false,stencilBuffer:false});quad.material.uniforms.map.value=texture;
 texture.colorSpace=THREE.NoColorSpace;texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;
 renderer.setRenderTarget(target);renderer.render(metricScene,camera);const bytes=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(target,0,0,w,h,bytes);renderer.setRenderTarget(null);target.dispose();return bytes;
}
const results=[];
try{for(let i=0;i<samples.length;i++){
 const s=samples[i],at=performance.now(),original=await new THREE.TextureLoader().loadAsync('./'+s.name+'.webp');original.flipY=false;
 const decode=performance.now(),compressed=await loader.loadAsync('./'+s.name+'.ktx2'),transcodeMs=performance.now()-decode;
 const a=pixels(original,s.width,s.height),b=pixels(compressed,s.width,s.height);let squared=0,absolute=0,max=0,alphaMax=0;
 for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-b[j]);if(j%4===3){alphaMax=Math.max(alphaMax,d);continue;}squared+=d*d;absolute+=d;max=Math.max(max,d);}
 const raw=await fallback.loadAsync('./'+s.name+'.ktx2');
 const texbytes=t=>t.mipmaps.reduce((n,m)=>n+m.data.byteLength,0);
 results.push({...s,transcodeMs,totalMs:performance.now()-at,format:compressed.format,compressedBytes:texbytes(compressed),rgbaMipEstimate:Math.round(s.width*s.height*16/3),fallbackFormat:raw.format,fallbackBytes:texbytes(raw),rgbPSNR:squared?10*Math.log10(255**2/(squared/(a.length*.75))):100,rgbMAE:absolute/(a.length*.75),rgbMax:max,alphaMax});raw.dispose();
 for(const [col,t]of [original,compressed].entries()){t.colorSpace=s.linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.95),new THREE.MeshBasicMaterial({map:t,transparent:true}));mesh.position.set(col?1:-1,(samples.length-1)/2-i,0);scene.add(mesh);}
 renderer.render(scene,camera);
 }
 globalThis.__KTX_RESULT__={samples:results,capabilities:loader.workerConfig};
}catch(e){globalThis.__KTX_ERROR__=String(e);throw e;}finally{loader.dispose();fallback.dispose();}
