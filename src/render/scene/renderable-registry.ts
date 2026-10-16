import * as THREE from 'three';

export type Renderable=THREE.Mesh|THREE.Line|THREE.Points|THREE.Sprite;
const isRenderable=(node:THREE.Object3D):node is Renderable=>node instanceof THREE.Mesh||node instanceof THREE.Line||node instanceof THREE.Points||node instanceof THREE.Sprite;
/** Three's child events maintain membership across pools, warmup reparenting,
 * deaths and map replacement. Material/visibility decisions remain live. */
export class RenderableRegistry {
 readonly objects=new Set<Renderable>();private nodes=new Set<THREE.Object3D>();
 private added=(event:{child:THREE.Object3D})=>this.attach(event.child);
 private removed=(event:{child:THREE.Object3D})=>this.detach(event.child);
 constructor(readonly root:THREE.Object3D){this.attach(root);}
 private attach(node:THREE.Object3D){if(this.nodes.has(node))return;this.nodes.add(node);if(isRenderable(node))this.objects.add(node);node.addEventListener('childadded',this.added);node.addEventListener('childremoved',this.removed);for(const child of node.children)this.attach(child);}
 private detach(node:THREE.Object3D){if(!this.nodes.delete(node))return;if(isRenderable(node))this.objects.delete(node);node.removeEventListener('childadded',this.added);node.removeEventListener('childremoved',this.removed);for(const child of node.children)this.detach(child);}
 dispose(){this.detach(this.root);}
}
const registries=new WeakMap<THREE.Object3D,RenderableRegistry>();
export function sceneRenderables(root:THREE.Object3D){let registry=registries.get(root);if(!registry){registry=new RenderableRegistry(root);registries.set(root,registry);}return registry.objects;}
export function hierarchyVisible(node:THREE.Object3D){for(let current:THREE.Object3D|null=node;current;current=current.parent)if(!current.visible)return false;return true;}
