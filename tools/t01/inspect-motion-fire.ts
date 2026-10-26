import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {prepareEquipmentFixture} from './equipment-fixture';
import {prepareEquipmentPreview,beforeEquipmentPreview} from './equipment-preview-runtime';
import {DYNAMIC_CASES} from './catalogue';
import {ALL_FAMILIES,familyRace,type FamilyId} from '../../src/data/races';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {ELITES,type EliteId} from '../../src/data/elites';
import {unitData,talentModifiers} from '../../src/simulation/combat/expedition-combat';
import {CombatAudioRouter} from '../../src/render/effects/combat-audio-router';
import {SIEGE} from '../../src/data/sc2-units';
const root='.cache/t01-motion-feedback',output=process.argv.includes('--after')?'native-after.json':'native.json';await fs.mkdir(root,{recursive:true});
const make=()=>new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
const demos=[];
for(const race of ['terran','zerg','protoss'] as const){const c=DYNAMIC_CASES.find(c=>c.id===`equipment:module.moving_fire.3:${race}:1:unbound`)!;
 const w=make(),p=prepareEquipmentPreview(w,c),initial=w.allies().map(u=>({id:u.id,type:u.unitType,hp:u.hp,nextShotAt:String(u.nextShotAt),role:u.id===p.actorId?'actor':u.id===p.patientId?'patient':'other'}));
 const movingShots=new Map<number,number>();for(let n=0;n<720;n++){beforeEquipmentPreview(w,p);const before=new Map(w.allies().map(u=>[u.id,u.shotSequence??0]));w.step();for(const u of w.allies())if((u.shotSequence??0)>(before.get(u.id)??0)&&Math.hypot(u.velocity.x,u.velocity.z)>.01)movingShots.set(u.id,(movingShots.get(u.id)??0)+1);}
 demos.push({race,id:c.id,initial,result:w.allies().map(u=>({id:u.id,type:u.unitType,shots:u.shotSequence,movingShots:movingShots.get(u.id)??0,nextShotAt:String(u.nextShotAt)}))});
}
const rows=[];
const actors=[...ALL_FAMILIES.map(family=>({id:family,family,race:familyRace(family)})),...Object.entries(ELITES).map(([id,e])=>({id:'elite.'+id,family:e.family,race:familyRace(e.family)})),...Object.entries(HEROES).map(([id,h])=>({id:'hero.'+id,family:h.baseFamily,race:h.race}))];
const forms=actors.filter(a=>!a.id.startsWith('hero.')&&['hellion','viking','thor'].includes(a.family)).map(a=>({...a,mode:({hellion:'hellbat',viking:'viking_assault',thor:'thor_high_impact'} as Record<string,string>)[a.family]}));
for(const a of [...actors.map(a=>({...a,mode:''})),...forms]){const w=make();prepareEquipmentFixture(w,{template:'module.moving_fire.3',race:a.race,pieces:1,binding:{}});w.entities.clear();w.heroes.clear();w.starship.members.clear();w.expedition.familySlots=[a.family as FamilyId];
 let u;if(a.id.startsWith('hero.')){w.expedition.heroRewardsUnlocked=true;w.acquireHero(a.id.slice(5) as HeroId);u=w.heroEntity(a.id.slice(5) as HeroId)!;}else if(a.id.startsWith('elite.')){w.acquireElite(a.id.slice(6) as EliteId);u=w.eliteOwned(a.id.slice(6) as EliteId)!;}else u=w.addFamilyMember(a.family as FamilyId,{x:0,z:0});
 if(a.mode){u.nativeMode=u.desiredNativeMode=a.mode;w.expedition.familyModes[a.family as FamilyId]=a.mode;w.refreshStats(u,true);}
 const d=unitData(u);if(d.targetType==='none'||d.attackRange<=1.5||['medivac','science_vessel'].includes(u.unitType))continue;
 Object.assign(u,{x:0,z:0,prev:{x:0,z:0},nextShotAt:0,weaponCooldown:0,thinkAt:0});
 const t=w.addUnit(d.targetType==='air'?'mutalisk':'roach','zerg',0,5);Object.assign(t,{hp:1e8,maxHp:1e8,moveSpeed:0,nextShotAt:Infinity,weaponCooldown:Infinity,stoppedUntil:Infinity});
 w.hash.rebuild(w.entities.values());w.issueMove({x:30,z:0});let shots=0,movingShots=0,distance=0,minimumSpeed=Infinity,allowedTicks=0;const audio=new CombatAudioRouter(),banks=new Set<string>();
 const ownedShots=()=>[...w.entities.values()].filter(a=>a.id===u.id||a.summonOwnerId===u.id).reduce((n,a)=>n+(a.shotSequence??0),0);
 for(let n=0;n<600;n++){const gap=((u.eliteId==='tank.1'?SIEGE.minRange:0)+u.attackRange)*.5+u.unitRadius+t.unitRadius;t.x=u.x+(u.unitType==='hellion'?gap:0);t.z=u.z+(u.unitType==='hellion'?0:gap);t.prev={x:t.x,z:t.z};const before=ownedShots(),x=u.x,z=u.z;w.step();distance+=Math.hypot(u.x-x,u.z-z);if(w.canFireAt(u,t))allowedTicks++;const delta=ownedShots()-before;if(delta>0){shots+=delta;const speed=Math.hypot(u.velocity.x,u.velocity.z);minimumSpeed=Math.min(minimumSpeed,speed);if(speed>.01)movingShots+=delta;}const af=audio.update(w);af.cues.forEach(c=>banks.add(c.bank));af.channels.forEach(c=>banks.add(c.bank));}
 rows.push({actor:a.id+(a.mode?':'+a.mode:''),race:a.race,family:a.family,range:u.attackRange,target:d.targetType,mode:u.mode,nativeMode:u.nativeMode,movingGear:talentModifiers(w,u),shots,movingShots,minimumSpeed:Number.isFinite(minimumSpeed)?minimumSpeed:null,distance,damage:1e8-t.hp,allowedTicks,audioBanks:[...banks]});
}
const report={scope:'Read-only controlled native audit; moving target maintains legal range, no public gameplay mutation.',demos,rows,withoutShots:rows.filter(r=>!r.shots),withoutMovingShots:rows.filter(r=>!r.movingShots)};
await fs.writeFile(root+'/'+output,JSON.stringify(report,null,2));console.log(JSON.stringify({demos,actors:rows.length,withoutMovingShots:report.withoutMovingShots.map(r=>({actor:r.actor,shots:r.shots,allowedTicks:r.allowedTicks,distance:r.distance})),tank:rows.filter(r=>r.family==='tank')},null,2));
