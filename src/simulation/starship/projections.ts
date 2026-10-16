import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Entity,HeroRecord,Point} from '../types';
import {equipmentUnitTotals} from './runtime';
import {identityFactors} from './attributes';
import {unitData} from '../combat/expedition-combat';
import {activeEquipmentEffects} from './modules';
import {permanentEquipmentBody} from './eligibility';
import {equipmentRandom} from './inventory';

export interface EquipmentProjection {
 effects:import('./selection').ActiveEquipmentEffect[];kind:'phantom'|'phase'|'recall';origin:number;until:number;output:number;
 snapshot:Entity;totals:ReturnType<typeof equipmentUnitTotals>;factors:ReturnType<typeof identityFactors>;share:number;extraTrueDps:number;hero?:HeroRecord;
}
export function projectionFor(w:World,u:Entity){return w.starship.projections.get(u.id);}
export function projectionOutput(w:World,id?:number){return id===undefined?1:w.starship.projections.get(id)?.output??1;}
export function refreshEquipmentProjection(w:World,u:Entity,fill=false){const p=projectionFor(w,u);if(!p)return false;const s=p.snapshot,hp=u.maxHp>0?u.hp/u.maxHp:0,shield=(u.maxShield??0)>0?(u.shield??0)/u.maxShield!:0;
 for(const key of ['maxHp','maxShield','armor','shieldArmor','shieldRegen','shieldDelay','moveSpeed','attackRange','attackPeriod','weaponDamage','maxEnergy','energyRegen','healRate'] as const)(u[key] as number|undefined)=s[key];u.hp=fill?u.maxHp:u.maxHp*hp;u.shield=fill?u.maxShield:(u.maxShield??0)*shield;return true;
}
function pointsFor(w:World,body:Entity,count:number,origin:Point){const points:Point[]=[];for(let n=0;n<count;n++){let found:Point|null=null;for(let i=0;i<20&&!found;i++){const a=(n*7+i)*2.399,q={x:origin.x+Math.sin(a)*(1+i*.2),z:origin.z+Math.cos(a)*(1+i*.2)},p=w.freePosition(body.unitType,q,0,3);if(p&&points.every(other=>Math.hypot(p.x-other.x,p.z-other.z)>body.unitRadius*2+.12))found=p;}if(!found)return null;points.push(found);}return points;}
/** Whole groups commit only after all parent landing points are legal. Each copy freezes one original budget. */
export function createEquipmentProjections(w:World,source:Entity,count:number,kind:EquipmentProjection['kind'],seconds:number,health:number,output:number,extraTrue=.0,origin:Point=source){
 const positions=pointsFor(w,source,count,origin);if(!positions)return [];
 const originals=[source,...[...w.entities.values()].filter(u=>u.summonKind==='interceptor'&&u.summonOwnerId===source.id&&u.hp>0)],children=originals.slice(1),result:Entity[]=[];
 for(const position of positions){let mother:Entity|undefined;
  for(const original of originals){const child=original!==source,p={x:position.x+(child?original.x-source.x:0),z:position.z+(child?original.z-source.z:0)},clone=structuredClone(original),totals=equipmentUnitTotals(w,original),factors=identityFactors(source),share=child?1/Math.max(1,children.length):1,shot=w.starship.attacks.get(original);
   clone.id=w.nextId++;clone.bornAt=w.time;clone.x=p.x;clone.z=p.z;clone.prev={...p};clone.hp=clone.maxHp=original.maxHp*health;clone.shield=clone.maxShield=(original.maxShield??0)*health;clone.deadAt=null;clone.temporary=true;clone.temporaryUntil=w.time+seconds;clone.pairId=undefined;clone.carrierHangar=clone.carrierHangar?{initialized:true,serial:clone.carrierHangar.serial,job:null}:undefined;clone.pendingTarget=null;clone.attackTarget=null;clone.windup=0;clone.attackLock=0;clone.velocity={x:0,z:0};clone.action='spawn';clone.slot=10000+clone.id;clone.temporaryKind=undefined;
   if(shot)clone.weaponDamage=shot.nativeDamage/(1+totals.native);if(child)clone.summonOwnerId=mother!.id;
   const nativeDps=(shot?.nativeDamage??original.weaponDamage*(1+totals.native))*Math.max(1,unitData(original).attacks)/Math.max(.001,original.attackPeriod),record:EquipmentProjection={effects:structuredClone(activeEquipmentEffects(w)),kind,origin:source.id,until:w.time+seconds,output,snapshot:structuredClone(clone),totals:{...totals},factors,share,extraTrueDps:nativeDps*extraTrue/output};
   if(original.heroId){const hero=w.starship.nativeHeroes.get(original.id)?.record??w.heroes.get(original.heroId);if(hero){record.hero={...hero,entityId:clone.id};w.starship.nativeHeroes.set(clone.id,{source:'projection',record:record.hero});}}
   w.starship.projections.set(clone.id,record);w.starship.members.set(clone.id,{source:'projection:'+source.id,items:[],independent:true,cannotGrow:true,cannotRevive:true,origin:kind});w.entities.set(clone.id,clone);equipmentPresentation(w,'projection-birth',clone,undefined,kind);w.visual('squad-transfer',clone);
   if(!child){mother=clone;result.push(clone);}
  }
 }
 w.hash.invalidatePlanes();return result;
}
export function equipmentPhantomAttack(w:World,u:Entity){if(u.summonKind==='interceptor'){const owner=w.entities.get(u.summonOwnerId!);if(!owner)return;u=owner;}if(!permanentEquipmentBody(w,u)||u.heroId||projectionFor(w,u))return;const e=activeEquipmentEffects(w).find(e=>e.key==='phantom');if(!e||w.time<(w.starship.numbers.get('phantom-ready')??0))return;
 const alive=[...w.starship.projections].filter(([id,p])=>p.kind==='phantom'&&!w.entities.get(id)?.summonKind&&(w.entities.get(id)?.hp??0)>0).length,count=e.values[5];if(alive+count>e.values[1]||equipmentRandom(w.starship.account)>=e.values[0])return;
 if(createEquipmentProjections(w,u,count,'phantom',e.values[3],e.values[2],e.values[2]).length===count)w.starship.numbers.set('phantom-ready',w.time+e.values[4]);
}
export function retireEquipmentProjection(w:World,id:number){const u=w.entities.get(id);if(u){if(u.hp>0)equipmentPresentation(w,'projection-end',u,undefined,projectionFor(w,u)?.kind);u.hp=0;u.deadAt=w.time;u.action='dead';u.pendingTarget=null;u.attackTarget=null;for(const child of w.entities.values())if(child.summonOwnerId===id&&projectionFor(w,child)){if(child.hp>0)equipmentPresentation(w,'projection-end',child,undefined,projectionFor(w,child)?.kind);child.hp=0;child.deadAt=w.time;child.action='dead';}}}
export function tickEquipmentProjections(w:World){for(const [id,p] of w.starship.projections){const u=w.entities.get(id);if(!u)continue;if(p.kind!=='phase'&&w.time>=p.until)retireEquipmentProjection(w,id);}}
