import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import type {AnimatedBatch} from '../../src/render/units/animated-batch';

/** Diagnostic adapter for the b38533c renderer's synchronous visible(body) → add() path.
 * Identity comes from the actual body/corpse object, never from interpolated coordinates.
 * This adapter is imported only by this sample; production sources are unmodified.
 */
export class InstanceIdentity {
 private current=0;private ids=new WeakMap<AnimatedBatch,Float64Array>();assignments=0;
 constructor(r:BattleRenderer){
  const bridge=r as unknown as {visible:(body:{id?:number})=>boolean;corpses:Map<number,object>},visible=bridge.visible.bind(r);
  bridge.visible=body=>{this.current=body.id??0;if(!this.current)for(const [id,corpse] of bridge.corpses)if(corpse===body){this.current=id;break;}return visible(body);};
 }
 register(batch:AnimatedBatch){if(this.ids.has(batch))return;const ids=new Float64Array(batch.meshes[0].instanceMatrix.count),add=batch.add.bind(batch);this.ids.set(batch,ids);
  batch.add=(...args)=>{if(!this.current)throw Error('Diagnostic material draw has no stable body identity');const at=batch.count;add(...args);if(batch.count>at){ids[at]=this.current;this.assignments++;}};
 }
 get(batch:AnimatedBatch,index:number){const id=this.ids.get(batch)?.[index];if(!id)throw Error('Missing diagnostic instance identity');return id;}
}
