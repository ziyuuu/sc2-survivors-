import fs from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
const parse=p=>new DOMParser().parseFromString(fs.readFileSync(p,'utf8'),'text/xml');
const elements=(n,tag)=>Array.from(n.getElementsByTagName(tag));
const value=(n,tag)=>elements(n,tag)[0]?.getAttribute('value');
/** Only bindings verified against this game's actual source identities. */
export function confirmedMotionPlan(db,bank){
 const root='assets/private/movement-research/data/',herds={},herdBindings={};
 const defaults=parse(root+'mods/core.sc2mod/base.sc2data/GameData/HerdData.xml').documentElement;
 const source=parse(root+'mods/swarm.sc2mod/base.sc2data/GameData/HerdData.xml');
 for(const [family,node,id,prefix]of [
  ['zergling','HerdNode_ZergSmall','Herd_ZergSmallUnits','HerdActorSound_ZergSmallUnitsLevel'],
  ['queen','HerdNode_ZergQueens','Herd_ZergQueens','HerdActorSound_ZergQueensLevel'],
 ]){
  const actor=db.actor(family==='queen'?'Queen':'Zergling','melee');
  if(actor?.fields.MovementHerdNode?.value!==node)throw Error('Herd actor binding changed: '+family);
  const herd=elements(source,'CHerd').find(n=>n.getAttribute('id')===id);
  if(!herd||elements(herd,'Nodes')[0]?.getAttribute('Link')!==node)throw Error('Missing original herd '+id);
  const weight=Number(elements(herd,'Nodes')[0].getAttribute('Weight'));
  herds[id]={radius:Number(value(defaults,'NodeSearchRadius')),positionBias:Number(value(defaults,'PositionBias')),
   speedLimit:value(herd,'SpeedLimit')?.split(',').map(Number),
   levels:elements(herd,'Levels').map((n,i)=>{
    const sound=db.actor(prefix+i,'melee')?.fields.Sound?.value;
    if(!sound)throw Error('Missing original herd sound actor: '+prefix+i);
    return {weight:Number(n.getAttribute('Weight')),bank:bank(sound,'melee')};
   })};
  herdBindings[family]={herd:id,weight};
 }
 const actor=db.actor('Barracks','melee'),sound=actor?.fields['SoundArray:Movement']?.value;
 if(sound!=='Barracks_Movement')throw Error('Barracks movement binding changed');
 return {herds,herdBindings,carrierMotion:{terran:bank(sound,'melee')}};
}
