import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {equipmentTotals} from '../src/simulation/starship/runtime';
import {identityFactors} from '../src/simulation/starship/attributes';
import {FAMILIES_BY_RACE,type Race} from '../src/data/races';
import {ELITES} from '../src/data/elites';
import {HEROES} from '../src/data/heroes';
import {unitData} from '../src/simulation/combat/expedition-combat';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {tickWeaponAreas} from '../src/simulation/combat/weapon-patterns';
import {tickHeroAttacks} from '../src/simulation/combat/hero-attack-upgrades';
import {tickTerranEliteState} from '../src/simulation/combat/terran-elite-runtime';
import {tickZergEliteState} from '../src/simulation/combat/zerg-elite-runtime';
import {tickProtossEliteState} from '../src/simulation/combat/protoss-elite-runtime';
import {tickZergHeroState} from '../src/simulation/combat/zerg-hero-passives';
import {tickProtossHeroState} from '../src/simulation/combat/protoss-hero-passives';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import type {Entity} from '../src/simulation/types';
type Subject={id:string;type:string;race:Race;elite?:string;hero?:string;mode?:string;weapon?:string};
const subjects:Subject[]=[...Object.entries(FAMILIES_BY_RACE).flatMap(([race,types])=>types.map(type=>({id:type,type,race:race as Race}))),...Object.values(ELITES).map(e=>({id:e.id,type:e.family,race:Object.entries(FAMILIES_BY_RACE).find(([,types])=>(types as readonly string[]).includes(e.family))![0] as Race,elite:e.id})),...Object.entries(HEROES).map(([hero,h])=>({id:hero,type:h.baseFamily,race:h.race,hero})),{id:'tank:siege',type:'tank',race:'terran',mode:'siege'},{id:'hellion:hellbat',type:'hellion',race:'terran',mode:'hellbat'},{id:'viking:assault',type:'viking',race:'terran',mode:'viking_assault'},{id:'thor:javelin',type:'thor',race:'terran',weapon:'JavelinMissileLaunchers'},{id:'lurker:burrow',type:'lurker',race:'zerg',mode:'lurker_burrowed'}];
function run(s:Subject,trueDamage:boolean,cycles:number,rank:number,neighbors=false){const w=new World({race:s.race,seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});const r=grantEquipment(w.starship.account,{template:'attribute.2',race:s.race,slot:'offense1'},'matrix',{kind:'warehouse'});assert.ok(r.ok);r.value.affixes=[{key:trueDamage?'trueDps':'critDamage',score:200}];assert.ok(w.equipItem(r.value.id,'offense1').ok);w.start();w.entities.clear();w.heroes.clear();const u=w.addUnit(s.type as Entity['unitType'],'terran',0,0,rank);
 if(s.hero){u.heroId=s.hero as Entity['heroId'];u.modelKey=HEROES[u.heroId!].model;w.heroes.set(u.heroId!,{id:u.heroId!,rank,entityId:u.id,skillReady:0,revivePaid:false,awaitingSpawn:false});}if(s.elite){u.eliteId=s.elite as Entity['eliteId'];u.modelKey=ELITES[u.eliteId!].model;}if(s.mode==='siege')u.mode=u.desiredMode='siege';else if(s.mode)u.nativeMode=s.mode;if(s.weapon)u.activeWeapon=s.weapon;if(u.unitType==='lurker')u.nativeMode='lurker_burrowed';if(u.unitType==='tank'&&u.eliteId&&u.eliteId!=='tank.1')u.mode=u.desiredMode='siege';w.refreshStats(u,true);
 const d=unitData(u),targets=Array.from({length:neighbors?6:1},(_,i)=>{const e=w.addUnit(i===0?(d.targetType==='air'?'mutalisk':'zergling'):i%2?'zergling':'mutalisk','zerg',(i%3-1)*.2,1.4+Math.floor(i/3)*.2);e.hp=e.maxHp=1e8;e.armor=0;e.attributes=[];e.shield=e.maxShield=0;return e;});w.hash.rebuild(w.entities.values());w.random=()=>.999999;
 const carrier=u.unitType==='carrier'||u.heroId==='purifier_flagship';if(carrier)initializeCarrierSubsystem(w);const actors=carrier?ownedInterceptors(w,u.id):[u],period=actors[0].attackPeriod;let shots=0,liveCycles=0;for(const a of actors){a.x=a.z=0;a.shotInterval=a.attackPeriod;}
 for(let frame=0;frame<=Math.ceil(((cycles-1)*period+5)*60);frame++){w.time=frame/60;if(shots<cycles&&w.time+1e-8>=shots*period){const before=w.stats.shots;for(const a of actors.filter(a=>a.hp>0))w.fire(a,targets[0]);if(w.stats.shots>before)liveCycles++;shots++;}tickWeaponFlights(w,1/60);tickWeaponAreas(w);tickHeroAttacks(w);tickTerranEliteState(w);tickZergEliteState(w,1/60);tickProtossEliteState(w);tickZergHeroState(w);tickProtossHeroState(w);}
 return {damage:targets.reduce((n,e)=>n+e.maxHp-e.hp,0),expected:equipmentTotals(w).trueDps*identityFactors(u).dps*period*liveCycles,shots:w.stats.shots};
}
for(const [title,cycles,rank,neighbors]of [['first cycle across all identities and five forms',1,1,false],['twelve native cycles and conditional bursts',12,5,false],['multiple ground and air targets share each cycle allowance',4,3,true]] as const)test('true DPS: '+title,()=>{
 const failures=[];for(const s of subjects){const a=run(s,false,cycles,rank,neighbors),b=run(s,true,cycles,rank,neighbors),expected=a.shots?b.expected:0,delta=b.damage-a.damage;if(Math.abs(delta-expected)>1e-4)failures.push({id:s.id,delta,expected,ratio:delta/expected});}assert.deepEqual(failures,[]);
});
