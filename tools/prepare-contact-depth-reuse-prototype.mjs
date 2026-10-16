import fs from 'node:fs/promises';import path from 'node:path';
const root='reports/local/equipment-fx-performance-20261016',out=root+'/prototypes/depth-reuse',map={};
async function put(file,source){const dest=out+'/'+file;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,source);map[file]=dest;}
let contact=await fs.readFile(root+'/source-r6/src/render/scene/scene-contact.ts','utf8');
contact=contact.replace(' restore(){',' copyDepth(target:THREE.WebGLRenderTarget){if(!this.enabled||!this.ready||!target.depthTexture||target.width!==this.width||target.height!==this.height)return false;this.renderer.initRenderTarget(target);this.renderer.copyTextureToTexture(this.depthTarget.depthTexture!,target.depthTexture);return true;}\n restore(){');
await put('src/render/scene/scene-contact.ts',contact);
await put('src/render/scene/contact-render-pass.ts',`import * as THREE from 'three';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import type {SceneContact} from './scene-contact';
/** Reuse the exact current camera's physical depth; the beauty pass retains all material tests. */
export class ContactRenderPass extends RenderPass {
 copies=0;
 constructor(scene:THREE.Scene,camera:THREE.Camera,private contact:()=>SceneContact|undefined){super(scene,camera);}
 override render(renderer:THREE.WebGLRenderer,write:THREE.WebGLRenderTarget,read:THREE.WebGLRenderTarget){
  const depth=renderer.autoClearDepth;
  try{if(!this.renderToScreen&&this.contact()?.copyDepth(read)){renderer.autoClearDepth=false;this.copies++;}super.render(renderer,write,read);}finally{renderer.autoClearDepth=depth;}
 }
}
`);
let renderer=await fs.readFile(root+'/source-r6/src/render/scene/battle-renderer.ts','utf8');renderer="import {ContactRenderPass} from './contact-render-pass';\n"+renderer;
renderer=renderer.replace('new RenderPass(this.scene,this.camera)','new ContactRenderPass(this.scene,this.camera,()=>this.contact)');
await put('src/render/scene/battle-renderer.ts',renderer);await fs.writeFile(out+'/overrides.json',JSON.stringify(map,null,2));
