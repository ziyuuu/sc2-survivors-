import type {Entity,HeroCast,VisualEvent} from '../../simulation/types';
import {AIR_HEIGHT} from '../../data/terrain';
import {HEROES} from '../../data/heroes';

/** Presentation adapter: a flagship child's actual shot keeps its own mount and event identity. */
export function heroFeedbackEvent(event:VisualEvent,entities:ReadonlyMap<number,Entity>):VisualEvent{
 const source=entities.get(event.entityId),owner=source?.summonOwnerId===undefined?undefined:entities.get(source.summonOwnerId);
 return !event.heroId&&source?.summonKind==='interceptor'&&owner?.heroId==='purifier_flagship'?{...event,heroId:'purifier_flagship'}:event;
}
/** Original weapon attachment transformed by the same fixed scale, facing and altitude as the body. */
export function weaponWorldPoint(event:VisualEvent,weapon:{x:number;y:number;z:number},scale:number,ground:number){
 return {x:event.x+scale*(weapon.x*Math.cos(event.facing)+weapon.z*Math.sin(event.facing)),y:(event.flying?AIR_HEIGHT:ground)+scale*weapon.y,z:event.z+scale*(-weapon.x*Math.sin(event.facing)+weapon.z*Math.cos(event.facing))};
}
/** Rebuilt from an unresolved saved cast; completed events are never recreated. */
export function castLaunchEvent(cast:HeroCast,source:Entity|undefined,time:number):VisualEvent{
 const launch=cast.presentationLaunch,hero=HEROES[cast.hero];
 return {serial:0,kind:'skill-launch',time,castId:cast.id,entityId:cast.source,heroId:cast.hero,unitType:source?.unitType??hero.baseFamily,modelKey:source?.modelKey??hero.model,race:hero.race,shotSequence:source?.shotSequence,flying:!!hero.flying,facing:launch?.facing??Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),x:launch?.x??cast.origin.x,z:launch?.z??cast.origin.z,weaponPoseSeconds:launch?.poseSeconds??0,y:0,endY:0,end:cast.point,siege:false};
}
