/** Isolated diagnostic entry imported only by verify-audit-browser's Vite transform. */
import * as THREE from 'three';
import {httpStore} from '../src/assets/http-store';
import {gpuTexture,gpuTextureReport} from '../src/render/loaders/gpu-textures';
import {trackTexture,applyPendingTextureTier} from '../src/render/loaders/managed-textures';
import {saveGraphics} from '../src/platform/graphics-profile';

const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export async function probeAuditTextures(renderer:THREE.WebGLRenderer){
 const store=httpStore()!,id='model.science_vessel.death',image=0,record=store.record(id,'high')!;
 check(store.activeTier==='high','probe requires an isolated high-tier context');
 const texture=await gpuTexture(record.imageSources![image].hash);check(texture&&(texture as any).isCompressedTexture,'hardware did not produce a compressed high texture');
 const map=texture!;map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;trackTexture(map,id,image);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
 const material=new THREE.MeshBasicMaterial({map,toneMapped:false,depthTest:false,depthWrite:false}),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(quad);
 const target=new THREE.WebGLRenderTarget(128,128),gl=renderer.getContext() as WebGL2RenderingContext,uploads:number[][]=[],original=gl.texStorage2D.bind(gl);
 gl.texStorage2D=((...args:Parameters<typeof original>)=>{uploads.push([args[3],args[4]]);return original(...args);}) as typeof gl.texStorage2D;
 const draw=(tex:THREE.Texture)=>{material.map=tex;material.needsUpdate=true;const old=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);renderer.setRenderTarget(old);return pixels;};
 const state=()=>({width:map.image.width,height:map.image.height,compressed:!!(map as any).isCompressedTexture,mips:map.mipmaps.length,format:map.format});
 const summarize=(pixels:Uint8Array)=>{let min=255,max=0,sum=0;for(let i=0;i<pixels.length;i++)if(i%4!==3){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);sum+=pixels[i];}return {min,max,sum};};
 const views:{label:string;pixels:Uint8Array}[]=[];
 let expected:THREE.Texture|undefined;
 try{
  const high=state(),first=draw(map);check(high.width===1024,'high upload must be 1024');check(uploads.some(([w,h])=>w===1024&&h===1024),'high dimensions did not reach texStorage2D');views.push({label:'高档压缩纹理 1024',pixels:first});
  saveGraphics({texture:'medium'});await applyPendingTextureTier();const medium=state(),at=uploads.length,current=draw(map);check(medium.width===512,'medium source must be 512');check(uploads.slice(at).some(([w,h])=>w===512&&h===512),'medium dimensions did not reach actual GPU allocation');views.push({label:'切至中档 512',pixels:current});
  // Independent fresh texture from the exact medium GLB image is the GPU oracle.
  const response=await fetch(await store.urlForTier(id,'medium'));check(response.ok,'reference GLB read failed');const bytes=await response.arrayBuffer(),v=new DataView(bytes),length=v.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length))),definition=json.images[image],buffer=json.bufferViews[definition.bufferView],start=28+length+(buffer.byteOffset??0);
  expected=new THREE.Texture(await createImageBitmap(new Blob([bytes.slice(start,start+buffer.byteLength)],{type:definition.mimeType}),{premultiplyAlpha:'none',colorSpaceConversion:'none'}));expected.flipY=false;expected.colorSpace=map.colorSpace;expected.minFilter=map.minFilter;expected.magFilter=map.magFilter;expected.needsUpdate=true;
  const reference=draw(expected);let difference=0;for(let i=0;i<current.length;i++)difference+=Math.abs(current[i]-reference[i]);difference/=current.length;check(difference<3,'switched GPU pixels differ from fresh medium reference');check(summarize(current).max-summarize(current).min>30,'texture output is unexpectedly uniform');views.push({label:'独立中档参考',pixels:reference});
  saveGraphics({texture:'high'});await applyPendingTextureTier();const restored=state(),last=draw(map);check(restored.width===1024&&restored.compressed,'high compressed state not restored');check(first.every((n,i)=>n===last[i]),'high GPU pixels changed after round trip');views.push({label:'切回高档 1024',pixels:last});
  const error=gl.getError();check(error===gl.NO_ERROR,'GPU error '+error);
  const panel=document.createElement('div');Object.assign(panel.style,{position:'fixed',inset:'0',zIndex:'999999',background:'#152032',color:'white',display:'flex',alignItems:'center',justifyContent:'center',gap:'20px'});
  for(const {label,pixels}of views){const box=document.createElement('div'),canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.style.width=canvas.style.height='256px';const flipped=new Uint8ClampedArray(pixels.length);for(let y=0;y<128;y++)flipped.set(pixels.subarray((127-y)*512,(128-y)*512),y*512);canvas.getContext('2d')!.putImageData(new ImageData(flipped,128,128),0,0);box.append(canvas,document.createElement('br'),document.createTextNode(label));panel.append(box);}document.body.append(panel);
  return {name:'actual-gpu-compressed-tier-roundtrip',high,medium,restored,mediumMeanAbsoluteError:difference,highPixelsIdentical:true,output:summarize(current),uploads,gpuError:error,decoder:gpuTextureReport()};
 }finally{gl.texStorage2D=original;map.dispose();expected?.dispose();target.dispose();material.dispose();quad.geometry.dispose();}
}
