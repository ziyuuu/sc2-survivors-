import type {World} from '../../simulation/world';
import type {HeroCast,Entity} from '../../simulation/types';
import type {HeroId} from '../../data/heroes';
/** View-only casts: never inserted into hero ownership or combat scheduling. */
export function fleetPresentationCasts(w:World):HeroCast[]{
 const result:HeroCast[]=[];
 const add=(source:Entity,target:number,at:number,launched:boolean)=>{const b=w.body(target);if(!b)return;result.push({id:source.id,hero:'yamato_battlecruiser',source:source.id,target,origin:{x:source.x,z:source.z},point:{x:b.x,z:b.z},at:at/60,damage:300,rank:1,launched});};
 for(const [id,s]of w.missions.fleet.ships){const u=w.entities.get(id);if(u?.hp&&s.cast)add(u,s.cast.target,s.cast.at+15,false);}
 for(const p of w.missions.fleet.flights)add(p.source,p.target,p.at,true);
 return result;
}

/** Adapt only the visual flight view; approved geometry and combat identities stay intact. */
export function fleetGunWorld(w:World,owner:HeroId='yamato_battlecruiser'):World {
 const weaponFlights=w.weaponFlights.flatMap(p=>{
  const hero=p.source.mission?.fleet?'yamato_battlecruiser':p.source.heroId;
  if(hero!==owner)return [];
  return [p.source.mission?.fleet?{...p,source:{...p.source,heroId:'yamato_battlecruiser' as const}}:p];
 });
 return Object.assign(Object.create(w),{weaponFlights});
}
