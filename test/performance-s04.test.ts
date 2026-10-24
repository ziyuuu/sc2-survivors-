import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {equipmentAttackEffects} from '../src/simulation/starship/combat';
import type {AttackBudget} from '../src/simulation/starship/runtime';
import type {ActiveEquipmentEffect} from '../src/simulation/starship/selection';
import {castExpeditionHero,canCastExpeditionHero,refreshExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {tickZergEliteState} from '../src/simulation/combat/zerg-elite-runtime';
import type {Entity} from '../src/simulation/types';

function fixture(entries:[string,...number[]][]=[]) {
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.hive=null;w.expansionHives.clear();
 const u=w.addUnit('marine','terran',0,0);u.attackRange=10;
 const add=(z:number)=>{const b=w.addUnit('zergling','zerg',0,z);b.hp=b.maxHp=1e6;b.armor=0;return b;},target=add(2),fx:ActiveEquipmentEffect[]=entries.map(([key,...values])=>({key,values,source:key,items:[]}));
 const shot:AttackBudget={target:target.id,remaining:0,truePerHit:0,nativeDamage:10,attackFactor:1,owner:u.id,sequence:1,hits:1,weaponDamage:10,bonuses:[],effects:fx,handled:false,derived:false};
 return {w,u,target,shot,add};
}
test('pure attributes and DOT do not enumerate secondary target eligibility',()=>{
 for(const fx of [[],[['true_burn',.2,3]]] as [string,...number[]][][]){const {w,u,target,shot,add}=fixture(fx);for(let i=0;i<50;i++)add(3+i*.01);let calls=0;const original=w.targetAllowed.bind(w);w.targetAllowed=(...a)=>{calls++;return original(...a);};
  equipmentAttackEffects(w,u,target,shot,1);assert.equal(calls,0);assert.equal(shot.handled,true);assert.equal(w.starship.combat.burns.length,fx.length);}
});
test('split retains the pre-hit roster even if double damage spawns a closer enemy',()=>{
 const {w,u,target,shot,add}=fixture([['double_attack',1],['split',1,1]]),originalCandidate=add(3),hit=w.hit.bind(w);let spawned:Entity|undefined;
 w.hit=(...args)=>{const r=hit(...args);if(args[0]===target&&!spawned)spawned=add(2.1);return r;};
 equipmentAttackEffects(w,u,target,shot,1);assert.equal(originalCandidate.hp,originalCandidate.maxHp-10);assert.equal(spawned!.hp,spawned!.maxHp);
});
test('each bounce sees membership changes from the preceding hit',()=>{
 const {w,u,target,shot,add}=fixture([['bounce',1,.5,2,4]]),first=add(3),converted=add(4),hit=w.hit.bind(w),ids:number[]=[];let spawned:Entity|undefined;
 w.hit=(...args)=>{ids.push(args[0].id);const r=hit(...args);if(args[0]===first&&!spawned){converted.owner='terran';spawned=add(3.5);}return r;};
 equipmentAttackEffects(w,u,target,shot,1);assert.deepEqual(ids,[first.id,spawned!.id]);assert.equal(converted.hp,converted.maxHp);
});
test('bounce resolves equal distance by ID regardless of insertion order and stale cells',()=>{
 const {w,u,target,shot,add}=fixture([['bounce',1,.5,1,4]]),low=add(50),high=add(50);w.hash.rebuild(w.entities.values());low.x=-1;low.z=3;high.x=1;high.z=3;w.entities=new Map([...w.entities].reverse());
 equipmentAttackEffects(w,u,target,shot,1);assert.equal(low.hp,low.maxHp-5);assert.equal(high.hp,high.maxHp);
});
test('acid overlap retains same-source maximum, gate timing and future-area contribution',()=>{
 const {w,u,target}=fixture();target.hp=target.maxHp=1000;u.eliteId='baneling.2';w.time=1;
 w.zergElites.areas=[{id:w.nextId++,source:structuredClone(u),point:{x:0,z:2},kind:'acid',radius:4,damage:10,next:1,until:3},{id:w.nextId++,source:structuredClone(u),point:{x:0,z:2},kind:'acid',radius:4,damage:30,next:2,until:3},{id:w.nextId++,source:{...structuredClone(u),id:u.id+1000},point:{x:0,z:2},kind:'acid',radius:4,damage:70,next:2,until:3}];
 tickZergEliteState(w);assert.equal(target.hp,970);tickZergEliteState(w);assert.equal(target.hp,970);w.time=2;tickZergEliteState(w);assert.equal(target.hp,870);
});
test('hero execution queries once but a preview cannot authorize a later invalid target',()=>{
 const {w,u,target}=fixture();u.heroId='raynor';const record={id:'raynor' as const,rank:1,entityId:u.id,skillReady:0,revivePaid:false,awaitingSpawn:false};w.heroes.set('raynor',record);refreshExpeditionHero(w,u);w.hash.rebuild(w.entities.values());
 assert.equal(canCastExpeditionHero(w,'raynor'),true);target.hp=0;assert.equal(castExpeditionHero(w,'raynor'),false);target.hp=target.maxHp;
 let queries=0;const original=w.hash.query.bind(w.hash);w.hash.query=(...args)=>{if(args[0]===u)queries++;return original(...args);};assert.equal(castExpeditionHero(w,'raynor'),true);assert.equal(queries,1);
});
