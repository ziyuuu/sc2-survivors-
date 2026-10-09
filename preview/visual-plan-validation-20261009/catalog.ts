import {ENEMY_NAMES} from '../../src/data/enemies';
import {ALL_FAMILIES,FAMILIES_BY_RACE,familyRace,type Race} from '../../src/data/races';
import {ELITES,type EliteId} from '../../src/data/elites';
import {HEROES,HERO_IDS_BY_RACE,type HeroId} from '../../src/data/heroes';
import {SC2_UNITS} from '../../src/data/sc2-units';
import {FAMILY_MODES,type ModeFamily} from '../../src/simulation/combat/family-actions';
export type Identity={id:string;kind:'ordinary'|'elite'|'hero';race:Race;family:string;name:string;model:string;elite?:EliteId;hero?:HeroId};
export const identities:Identity[]=[
 ...ALL_FAMILIES.map(f=>({id:f,kind:'ordinary' as const,race:familyRace(f),family:f,name:SC2_UNITS[f].name,model:f})),
 ...Object.values(ELITES).map(e=>({id:e.id,kind:'elite' as const,race:familyRace(e.family),family:e.family,name:e.name,model:e.model,elite:e.id})),
 ...Object.entries(HEROES).map(([id,h])=>({id,kind:'hero' as const,race:h.race,family:h.baseFamily,name:h.name,model:h.model,hero:id as HeroId})),
];
export type Group={id:string;name:string;race:Race;identities:Identity[];modeFamily?:ModeFamily;density?:number;actors?:boolean;enemyType?:string};
export const groups:Group[]=[
 ...ALL_FAMILIES.map(f=>({id:f,name:SC2_UNITS[f].name,race:familyRace(f),identities:identities.filter(i=>i.family===f&&i.kind!=='hero')})),
 ...(['terran','zerg','protoss'] as const).flatMap(r=>[0,1].map(n=>({id:`heroes-${r}-${n}`,name:`${r} 英雄 ${n+1}`,race:r,identities:HERO_IDS_BY_RACE[r].slice(n*3,n*3+3).map(id=>identities.find(i=>i.hero===id)!)}))),
];
export const modeGroups=groups.filter(g=>g.id in FAMILY_MODES).map(g=>({...g,id:'mode-'+g.id,name:g.name+' · 形态',modeFamily:g.id as ModeFamily}));
export const themes=['industrial','mar-sara','char','ice','frontier'] as const;
export {FAMILY_MODES,FAMILIES_BY_RACE};

/** Synthetic stress cohorts are labelled separately from legal acquisition/cap acceptance. */
export const densityGroups:Group[]=(['terran','zerg','protoss'] as const).flatMap(race=>[18,48,96].map(count=>{
 const slots=identities.filter(i=>i.race===race&&i.kind==='ordinary'&&!['baneling','lurker','medivac','science_vessel'].includes(i.family)).slice(0,5).map(i=>i.family);const pool=identities.filter(i=>i.race===race&&i.kind!=='hero'&&slots.includes(i.family));
 const heroes=identities.filter(i=>i.race===race&&i.kind==='hero').slice(0,3);
 return {id:'density-'+race+'-'+count,name:race+' · '+count+' 体诊断负载',race,density:count,identities:[...Array.from({length:count-3},(_,n)=>pool[n%pool.length]),...heroes]};
}));
export const actorGroups:Group[]=(['terran','zerg','protoss'] as const).map(race=>({id:'actors-'+race,name:race+' · 载体/工人/建筑',race,actors:true,identities:[identities.find(i=>i.kind==='ordinary'&&i.race===race)!]}));
export const enemyGroups:Group[]=Object.keys(ENEMY_NAMES.elite).map(type=>({id:'enemies-'+type,name:type+' · 精英/Boss/领主',race:'zerg',enemyType:type,identities:['elite','boss','lord'].map(tier=>({...identities.find(i=>i.id===type)!,id:'enemy.'+type+'.'+tier,name:type+' '+tier}))}));
