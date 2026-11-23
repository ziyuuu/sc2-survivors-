import type {HeroId} from '../../data/heroes';
import type {Entity} from '../types';
import type {World} from '../world';

/** Only the two permanent bodies belong to this identity; equipment projections remain independent. */
export function swarmHeroBodies(w:World,id:HeroId):Entity[]{
 const primary=w.heroEntity(id),twin=w.expedition.zergSwarm?.twin;
 const extra=twin?.hero===id&&twin.body!==undefined?w.entities.get(twin.body):undefined;
 const bodies=primary?[primary]:[];
 if(extra&&extra.id!==primary?.id&&extra.heroId===id)bodies.push(extra);
 return bodies;
}
export function swarmHeroGroup(w:World,u:Entity):HeroId|undefined{
 const twin=w.expedition.zergSwarm?.twin;
 if(!twin||!u.heroId||twin.hero!==u.heroId)return undefined;
 return w.heroes.get(u.heroId)?.entityId===u.id||twin.body===u.id?u.heroId:undefined;
}
