import {Texture} from 'three';

/** Share decoded immutable pixels across glTF parsers, not material samplers.
 * Weak entries do not keep retired maps/models alive. Failed decodes are retryable. */
export class SharedImageSources {
 private sources=new Map<string,WeakRef<Texture['source']>>();
 private pending=new Map<string,Promise<Texture['source']>>();
 private prototypes=new WeakMap<Texture['source'],Texture>();
 readonly metrics={decodes:0,reuses:0};
 forget(keys:Iterable<string>){for(const key of keys)this.sources.delete(key);}
 keys(){return this.sources.keys();}
 invalidate(source:Texture['source']){for(const [key,ref]of this.sources)if(!ref.deref()||ref.deref()===source)this.sources.delete(key);}
 async texture(key:string,decode:()=>Promise<Texture>){
  let source=this.sources.get(key)?.deref();
  if(source)this.metrics.reuses++;
  else{
   let job=this.pending.get(key);
   if(job)this.metrics.reuses++;
   else{
    job=decode().then(texture=>{this.metrics.decodes++;this.sources.set(key,new WeakRef(texture.source));this.prototypes.set(texture.source,texture.clone());return texture.source;});
    this.pending.set(key,job);
    void job.finally(()=>{if(this.pending.get(key)===job)this.pending.delete(key);}).catch(()=>{});
   }
   source=await job;
  }
  // Preserve compressed mipmaps/format. WeakMap ownership follows the shared
  // Source, so the prototype cannot keep a retired image alive by itself.
  const texture=this.prototypes.get(source)?.clone()??new Texture();texture.source=source;texture.needsUpdate=true;return texture;
 }
}
