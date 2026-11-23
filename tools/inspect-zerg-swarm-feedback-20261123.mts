import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {swarmScenario} from '../preview/zerg-swarm-20261120/scenarios';
import {placeZergSixTrial} from '../preview/zerg-six-20261120/scenarios';
import {modelPresentationScale} from '../src/data/combat-presentation';
import type {ZswShort} from '../src/data/zerg-swarm';
import {displayActiveModelKey,unitMaterialIdentity} from '../src/render/materials/elite-visual';
import type {Entity} from '../src/simulation/types';

function trial(card:ZswShort,rank=1,cargo:'delivery'|'overflow'='delivery'){
  return swarmScenario({id:`ZSW-${card}`,rank,hero:'kerrigan',cargo});
}
const round=(time:number)=>Number(time.toFixed(3));

const endings=[];
for(const card of ['G04','G08','B02','B09','W04'] as const){
  for(const rank of [0,1,2,3]){
    const {world}=trial(card,rank);
    world.advance(25);
    endings.push({card,rank,phase:world.phase,seconds:round(world.time),survivors:world.allies().length});
  }
}
console.table(endings);

function banelings(front:number,rank:number){
  const {world}=trial('G02',rank);
  for(const unit of world.entities.values()){
    if(unit.owner==='zerg'){unit.z+=front-9;unit.prev.z=unit.z;}
  }
  world.hash.rebuild(world.entities.values());
  const born=new Set<number>(),targeted=new Set<number>(),fired=new Set<number>();
  let serial=0,firstBirth:number|undefined,firstTarget:number|undefined,firstAttack:number|undefined;
  // End before the second wave at every tier, but include the full first lifespan.
  while(world.phase==='battle'&&world.time<24){
    world.step();
    for(const u of world.allies()){
      if(!u.zergSwarm?.oneUse)continue;
      born.add(u.id);firstBirth??=round(u.bornAt);
      if(u.attackTarget!==null){targeted.add(u.id);firstTarget??=round(world.time);}
    }
    for(const e of world.visualEvents){
      if(e.serial<=serial)continue;
      serial=e.serial;
      if(e.kind==='attack'&&e.unitType==='baneling'&&born.has(e.entityId)){
        fired.add(e.entityId);firstAttack??=round(e.time);
      }
    }
  }
  return {front,rank,born:born.size,targeted:targeted.size,fired:fired.size,firstBirth,firstTarget,firstAttack};
}
console.table([banelings(13,1),banelings(9,2),banelings(9,3),banelings(9,1),banelings(7,1)]);

function revival(removeFixtureDeadline:boolean,retreat:boolean){
  const {world,leadId}=trial('G04');
  if(removeFixtureDeadline)world.entities.get(leadId)!.nextShotAt=0;
  let died=false,revived:number|undefined,origin:{x:number;z:number}|undefined;
  let firstDisplacement:number|undefined,firstAttack:number|undefined;
  while(world.phase==='battle'&&world.time<10){
    world.step();
    const u=world.entities.get(leadId);
    if(!u||u.hp<=0){died=true;continue;}
    if(!died)continue;
    if(!origin){origin={x:u.x,z:u.z};revived=round(world.time);if(retreat)world.issueMove({x:0,z:-10});}
    if(Math.hypot(u.x-origin.x,u.z-origin.z)>.08)firstDisplacement??=round(world.time);
    if(u.lastShotAt>=revived!)firstAttack??=round(u.lastShotAt);
  }
  return {removeFixtureDeadline,retreat,revived,firstDisplacement,firstAttack};
}
console.table([revival(false,false),revival(true,false),revival(false,true)]);

for(const cargo of ['delivery','overflow'] as const){
  const {world}=trial('G01',1,cargo);
  world.advance(5.3);
  console.log('G01',cargo,{delivered:world.expedition.ledger.flatMap(job=>job.passengers).filter(p=>p.status==='released').length,
    overflow:world.allies().filter(u=>u.zergSwarm?.origin==='overflow').length});
}

const manifest=JSON.parse(readFileSync('deploy/runtime/zerg-six-assets.json','utf8')) as {records:{id:string;url:string;packedSha256:string}[]};
function modelSignature(unit:Entity,time:number){
  return JSON.stringify([displayActiveModelKey(unit),modelPresentationScale(unit),unitMaterialIdentity(unit,time)]);
}
for(const [family,card] of [['aberration','G06'],['devourer','B04'],['infestor','B05'],['swarm_host','P04'],['viper','P06'],['brood_lord','P04']] as const){
  const {world}=trial(card),reference=trial(card).world;
  placeZergSixTrial(reference,family);
  world.advance(card.startsWith('P')?9.1:6.1);
  const body=world.allies().find(u=>u.unitType===family)!,original=reference.allies().find(u=>u.unitType===family)!;
  const hashes=['','.death'].every(suffix=>{
    const asset=manifest.records.find(r=>r.id===`model.${family}${suffix}`)!;
    return createHash('sha256').update(readFileSync('public/'+asset.url)).digest('hex')===asset.packedSha256;
  });
  console.log(family,{matchesManifest:hashes,sameBirthAppearance:modelSignature(body,world.time)===modelSignature(original,reference.time)});
}
