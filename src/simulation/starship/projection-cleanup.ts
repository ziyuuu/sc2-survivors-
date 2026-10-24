import type {World} from '../world';

/** Only inspect active combat queues, never historical source/roster caches. A
 * queued receipt may own its source through attackSources instead of a DTO field. */
function activeSources(w:World){
 const ids=new Set<number>(),seen=new Set<object>(),s=w.starship;
 const visit=(value:unknown):void=>{
  if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
  const bound=s.attackSources.get(value);if(bound)ids.add(bound.id);
  if(value instanceof Map||value instanceof Set){for(const item of value.values())visit(item);return;}
  if(Array.isArray(value)){for(const item of value)visit(item);return;}
  const row=value as Record<string,unknown>;
  if(typeof row.id==='number'&&typeof row.unitType==='string')ids.add(row.id);
  for(const [key,item] of Object.entries(row)){
   if((key==='source'||key==='sourceEntity'||key==='summonOwnerId')&&typeof item==='number')ids.add(item);
   else visit(item);
  }
 };
 for(const root of [w.weaponFlights,w.heroAttacks,w.heroCasts,w.effects,w.corrosionZones,
  w.terranElites,w.zergElites,w.protossElites,w.zergHeroes,w.protossHeroes,w.eliteSupport,w.teamAuras,
  w.expedition.weaponAreas,w.expedition.spells,w.statuses.snapshot(),w.enemySpecials.snapshot(),
  s.combat.burns,s.hero.jobs,[...s.hero.shields.values()].filter(r=>r.until>w.time),s.strikes,s.supportSequences,s.yamatoSequences])visit(root);
 // Live children and deferred child packets still use the mother's identity.
 for(const u of w.entities.values())if(u.summonOwnerId!==undefined)ids.add(u.summonOwnerId);
 for(const id of ids){const owner=s.projections.get(id)?.snapshot.summonOwnerId;if(owner!==undefined)ids.add(owner);}
 return ids;
}

export function pruneEquipmentProjections(w:World){
 const s=w.starship,missing=[...s.projections.keys()].filter(id=>!w.entities.has(id));if(!missing.length)return;
 const retained=activeSources(w);
 for(const id of missing){if(retained.has(id))continue;
  s.projections.delete(id);s.members.delete(id);s.nativeHeroes.delete(id);s.combatSources.delete(id);s.skillSources.delete(id);
  s.combat.movement.delete(id);s.combat.precision.delete(id);s.barriers.delete(id);
  s.hero.seals.delete(id);s.hero.devour.delete(id);s.hero.carriers.delete(id);s.hero.veil.delete(id);s.hero.veilReady.delete(id);s.hero.banelings.delete(id);
  // These keys are body-local combat cursors, not account receipts or cooldowns.
  for(const prefix of ['moving-extra:','assault-until:','dynamic-speed:','pursuit:','shield-broken:'])s.numbers.delete(prefix+id);
 }
}
