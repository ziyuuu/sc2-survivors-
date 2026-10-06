import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import type {WebGLRenderer} from 'three';
/** Times completed parsing/compilation only. No bytes, paths or model identities leave the browser. */
export class LoadObserver {
 active=false;generation=0;parseMs=0;gpuMs=0;failures=0;
 constructor(renderer:WebGLRenderer){const self=this,original=GLTFLoader.prototype.parse;GLTFLoader.prototype.parse=function(data,path,onLoad,onError){if(!self.active)return original.call(this,data,path,onLoad,onError);const start=performance.now(),generation=self.generation;let finished=false;const finish=(failed=false)=>{if(finished)return;finished=true;if(self.active&&self.generation===generation){self.parseMs+=performance.now()-start;if(failed)self.failures++;}};try{return original.call(this,data,path,g=>{finish();onLoad(g);},e=>{finish(true);onError?.(e);});}catch(e){finish(true);throw e;}};
  const compile=renderer.compileAsync;renderer.compileAsync=async function(...args:Parameters<WebGLRenderer['compileAsync']>){const generation=self.generation,start=performance.now(),active=self.active;try{return await compile.apply(this,args);}finally{if(active&&self.active&&generation===self.generation)self.gpuMs+=performance.now()-start;}};
 }
 setActive(active:boolean){if(this.active!==active){this.generation++;this.active=active;this.parseMs=this.gpuMs=this.failures=0;}}
 snapshot(){return {parseMs:this.parseMs,gpuMs:this.gpuMs,failures:this.failures};}
}
