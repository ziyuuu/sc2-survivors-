import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

type Span={name:string;label:string;start:number;end:number;kind:'sync'|'async';ok:boolean};
const spans:Span[]=[];
export function traceSync<T>(name:string,label:string,run:()=>T):T{
 const start=performance.now();let ok=false;try{const value=run();ok=true;return value;}finally{spans.push({name,label,start,end:performance.now(),kind:'sync',ok});}
}
export async function traceAsync<T>(name:string,label:string,run:()=>Promise<T>):Promise<T>{
 const start=performance.now();let ok=false;try{const value=await run();ok=true;return value;}finally{spans.push({name,label,start,end:performance.now(),kind:'async',ok});}
}
export function traceConstructor(name:string,label:string,start:number){spans.push({name,label,start,end:performance.now(),kind:'sync',ok:true});}
export function install7A(world:any,view:any,session:any){
 const root=globalThis as any;root.__7A_NATIVE__={world,view,session};root.__7A_SPANS__=spans;
 if(root.__7A_OPTIONS__?.shader==='parallel-depth'){
  const original=view.warmPresentationBatches.bind(view);
  view.warmPresentationBatches=async(...args:any[])=>{
   view.sceneShadows.prepare();view.contact.prepare(view.scene);
   const target=view.renderer.getRenderTarget(),temporary=new THREE.WebGLRenderTarget(1,1),jobs:Promise<unknown>[]=[],owned:THREE.Material[]=[];
   try{
    jobs.push(view.compilePresentation(view.scene,view.camera));
    for(const shadow of [false,true]){
     const scene=new THREE.Scene();scene.fog=shadow?null:view.scene.fog;
     view.scene.traverseVisible((node:any)=>{if(node.isLight)scene.add(node.clone());});
     view.scene.traverse((node:any)=>{if(!node.isMesh||!node.castShadow)return;const clone=node.clone(false),materials=view.sceneShadows.depth.depthFor(node),sources=Array.isArray(node.material)?node.material:[node.material];
      const prepare=(m:any,i:number)=>{if(!shadow)return m;const copy=m.clone();copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=m.customProgramCacheKey;const source=sources[i];copy.side=source.shadowSide??(source.side===THREE.FrontSide?THREE.BackSide:source.side===THREE.BackSide?THREE.FrontSide:THREE.DoubleSide);owned.push(copy);return copy;};
      clone.material=Array.isArray(materials)?materials.map(prepare):prepare(materials,0);scene.add(clone);
     });
     view.renderer.setRenderTarget(temporary);jobs.push(view.renderer.compileAsync(scene,view.camera));
    }
   }finally{view.renderer.setRenderTarget(target);}
   try{await Promise.all(jobs);return await original(...args);}finally{temporary.dispose();for(const material of owned)material.dispose();}
  };
 }
 if(root.__7A_OPTIONS__?.shader==='link'){
  view.renderer.debug.checkShaderErrors=false;
  const checked=new Set<any>(),validate=()=>{const gl=view.renderer.getContext();if(gl.isContextLost())throw Error('WebGL context lost during shader validation');for(const p of view.renderer.info.programs??[]){if(checked.has(p.program))continue;if(!gl.getProgramParameter(p.program,gl.LINK_STATUS))throw Error('Shader link failed: '+gl.getProgramInfoLog(p.program));checked.add(p.program);}};
  for(const method of ['prewarmBatches','warmPresentationBatches','finishProgramWarmup']){const original=view[method].bind(view);view[method]=async(...args:any[])=>{const value=await original(...args);validate();return value;};}
 }
 for(const method of ['load','ensureUnitVariant','prepareNewRunAssets','prepareCampaignAssets','prepareEndlessAssets','prewarmBatches','warmPresentationBatches','finishProgramWarmup','waitForGpu','commonTask']){
  const original=view[method]?.bind(view);if(!original)continue;
  view[method]=(...args:any[])=>traceAsync('view.'+method,typeof args[0]==='string'?args[0]:'',()=>original(...args));
 }
 for(const method of ['preloadTextures','warmLightingFrame']){const original=view[method].bind(view);view[method]=(...args:any[])=>traceSync('view.'+method,'',()=>original(...args));}
 const parse=GLTFLoader.prototype.parse;GLTFLoader.prototype.parse=function(data,path,onLoad,onError){const start=performance.now();return parse.call(this,data,path,g=>{spans.push({name:'gltf.parse',label:'',start,end:performance.now(),kind:'async',ok:true});onLoad(g);},e=>{spans.push({name:'gltf.parse',label:'',start,end:performance.now(),kind:'async',ok:false});onError?.(e);});};
 const renderer=view.renderer;
 root.__7A_ANIMATION_SNAPSHOT__=async()=>{
  const hash=async(data:ArrayBufferView)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const rows=[];for(const [key,batch]of view.gpu){const atlases=[];for(const texture of batch.ownedPoseTextures)atlases.push({width:texture.image.width,height:texture.image.height,sha256:await hash(texture.image.data)});const points=new Float64Array([...batch.weaponTracks.values()].flatMap((track:any)=>track.flatMap((p:any)=>p.toArray())));rows.push({key,clips:[...batch.clips],trackKeys:[...batch.weaponTracks.keys()],tracks:await hash(points),atlases,scale:batch.scale,normalization:batch.normalization.toArray(),body:batch.bodyOutline.map((p:any)=>p.toArray()),weapon:batch.weapon.toArray()});}return rows;
 };
 if(root.__7A_OPTIONS__?.gpu){
  const gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),samples:any[]=[],pending:any[]=[];root.__7A_GPU__={available:!!ext,samples};
  if(ext){let depth=0;const render=renderer.render.bind(renderer);renderer.render=(...args:any[])=>{const query=depth===0&&pending.length<128?gl.createQuery():null;depth++;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);const at=performance.now();try{return render(...args);}finally{depth--;if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,at,scene:args[0]?.type});}}};
   const poll=()=>{const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(!gl.getQueryParameter(p.query,gl.QUERY_RESULT_AVAILABLE))continue;samples.push({at:p.at,scene:p.scene,disjoint,ms:disjoint?null:gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.query);pending.splice(i,1);}requestAnimationFrame(poll);};requestAnimationFrame(poll);
  }
 }
 for(const method of ['compileAsync']){const original=renderer[method].bind(renderer);renderer[method]=(...args:any[])=>traceAsync('renderer.'+method,'',()=>original(...args));}
 for(const method of ['initTexture']){const original=renderer[method].bind(renderer);renderer[method]=(...args:any[])=>traceSync('renderer.'+method,args[0]?.name??'',()=>original(...args));}
 const gl=renderer.getContext();
 const shaderSources=new WeakMap<object,string>(),programSources=new WeakMap<object,string[]>();
 const shaderSource=gl.shaderSource.bind(gl);gl.shaderSource=(shader:any,source:string)=>{shaderSources.set(shader,source);return shaderSource(shader,source);};
 const attach=gl.attachShader.bind(gl);gl.attachShader=(program:any,shader:any)=>{programSources.set(program,[...(programSources.get(program)??[]),shaderSources.get(shader)??'']);return attach(program,shader);};
 for(const method of ['finish','getProgramInfoLog','getShaderInfoLog']){const original=gl[method].bind(gl);gl[method]=(...args:any[])=>traceSync('gl.'+method,method==='getProgramInfoLog'?(programSources.get(args[0])??[]).map(s=>/\#define SHADER_TYPE (\S+)/.exec(s)?.[1]??'custom').join('/'):'',()=>original(...args));}
}
