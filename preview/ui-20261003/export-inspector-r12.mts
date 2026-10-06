import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {World} from '../../src/simulation/world';
import {ALL_FAMILIES,familyRace} from '../../src/data/races';
import {ELITES} from '../../src/data/elites';
import {HEROES} from '../../src/data/heroes';
import {SC2_UNITS} from '../../src/data/sc2-units';
import {unitData,expeditionWeaponBonuses} from '../../src/simulation/combat/expedition-combat';
import {initializeCarrierSubsystem,ownedInterceptors} from '../../src/simulation/combat/carriers';
const root=new URL('./',import.meta.url);
const sourceFiles=['src/data/sc2-units.ts','src/data/heroes.ts','src/data/elites.ts','src/data/terran-elites.ts','src/data/zerg-elites.ts','src/data/protoss-elites.ts','src/data/team-auras.ts','src/simulation/world.ts','src/simulation/combat/expedition-combat.ts','src/simulation/combat/expedition-heroes.ts','src/simulation/combat/carriers.ts'];
const hashes={};for(const f of sourceFiles)hashes[f]=crypto.createHash('sha256').update(await fs.readFile(new URL('../../'+f,root))).digest('hex');
const entries={};
for(const id of [...ALL_FAMILIES,...Object.keys(ELITES),...Object.keys(HEROES)])for(const rank of [2,3]){
 const elite=ELITES[id],hero=HEROES[id],family=elite?.family??hero?.baseFamily??id,race=hero?.race??familyRace(family);
 const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:10606});w.start();w.entities.clear();w.heroes.clear();w.expedition.zerglingPairs=[];w.hive=null;w.pods=[];
 let u;if(hero){if(!w.acquireHero(id))throw Error('Hero unavailable '+id);u=w.heroEntity(id);u.rank=rank;w.heroes.get(id).rank=rank;}else{u=w.addUnit(family,'terran',0,0,rank);if(elite){u.eliteId=id;u.modelKey=elite.model;}}
 u.x=u.z=0;w.refreshStats(u,true);const d=unitData(u);
 let hangar=null;if(family==='carrier'||id==='purifier_flagship'){initializeCarrierSubsystem(w);const children=ownedInterceptors(w,u.id);hangar={count:children.length,damage:children[0]?.weaponDamage??0,period:children[0]?.attackPeriod??0};}
 entries[id+':'+rank]={id,name:hero?.name??elite?.name??SC2_UNITS[family].zh,kind:hero?'hero':elite?'elite':'ordinary',race,family,rank,icon:hero?'hero.'+id:'unit.'+family,attributes:u.attributes,flying:u.flying,target:d.targetType,hp:u.maxHp,shield:u.maxShield??0,energy:u.maxEnergy??0,energyStart:u.energy??0,damage:u.weaponDamage,attacks:d.attacks,period:u.attackPeriod,range:u.attackRange,armor:u.armor,shieldArmor:u.shieldArmor??0,speed:u.moveSpeed,heal:u.healRate??0,bonuses:hero?[]:expeditionWeaponBonuses(w,u).bonuses,skill:hero?{name:hero.skill,cooldown:hero.cooldown}:null,hangar};
 for(const k of ['hp','shield','energy','damage','period','range','armor','speed'])if(!Number.isFinite(entries[id+':'+rank][k]))throw Error(id+' invalid '+k);
}
const fixture={revision:'r12',created:'2026-10-06',basis:'Read-only isolated World snapshots at ranks II / III. Each body has its own native/self effects; no invented team bonus. Wounds and cooldown remaining are explicitly authored static UI states, not a captured live run.',sources:hashes,entries};
await fs.writeFile(new URL('inspector-data-r12.json',root),JSON.stringify(fixture,null,2)+'\n');
console.log(JSON.stringify({entries:Object.keys(entries).length,samples:['marine:2','marine.2:2','zergling:2','medivac:2','artanis:2','carrier:2'].map(k=>entries[k])}));
