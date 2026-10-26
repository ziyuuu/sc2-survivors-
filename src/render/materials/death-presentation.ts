import type {Entity,VisualEvent} from '../../simulation/types';
import {modelPresentationScale} from '../../data/combat-presentation';
import {displayDeathModelKey,unitMaterialIdentity} from './elite-visual';

/** A queued death keeps its identity even if native cleanup already reclaimed it. */
export function deathPresentation(event:VisualEvent,live?:Entity){
 if(!event.unitType)return undefined;
 const unit={...live,...event,...event.deathAppearance,unitType:event.unitType,team:event.sourceTeam??live?.team,hp:0,mode:event.siege?'siege':'tank'} as Entity;
 return {type:displayDeathModelKey(unit),scale:modelPresentationScale(unit),...unitMaterialIdentity(unit,event.time)};
}
