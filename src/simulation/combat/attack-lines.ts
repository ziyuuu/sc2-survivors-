import type {TerrainQuery} from '../../data/map-definition';
import type {Body,Entity} from '../types';
type Sample={ax:number;az:number;bx:number;bz:number;stage:number;airA:boolean;airB:boolean;melee:boolean;clear:boolean};
/** Exact endpoints only. Movement, air/ground or weapon-mode changes invalidate immediately.
 * Weak keys let dead actors and their cached target lines be collected automatically. */
export class AttackLineCache {
 private terrain?:TerrainQuery;
 private samples=new WeakMap<Body,WeakMap<Body,Sample>>();
 clear(terrain:TerrainQuery,stage:number,a:Entity,b:Body){
  if(this.terrain!==terrain){this.terrain=terrain;this.samples=new WeakMap();}
  let targets=this.samples.get(a);if(!targets){targets=new WeakMap();this.samples.set(a,targets);}
  const old=targets.get(b),melee=a.attackRange<1;
  if(old&&old.ax===a.x&&old.az===a.z&&old.bx===b.x&&old.bz===b.z&&old.stage===stage&&old.airA===a.flying&&old.airB===b.flying&&old.melee===melee)return old.clear;
  const clear=terrain.lineOfFire(a,b,a.flying,b.flying,melee);
  targets.set(b,{ax:a.x,az:a.z,bx:b.x,bz:b.z,stage,airA:a.flying,airB:b.flying,melee,clear});return clear;
 }
}
