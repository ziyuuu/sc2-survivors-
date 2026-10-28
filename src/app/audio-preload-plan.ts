import {SOUND_DATA} from '../render/effects/audio-source-data';
import {FAMILIES_BY_RACE,type Race} from '../data/races';
import {campaignPreloadModels} from './battle-preload-plan';
/** Conservative closure for the current/next battle; dialogue is streamed separately. */
export function audioPreloadBanks(race:Race,stage:number,identities:Iterable<{unitType?:string;heroId?:string|null}>){
 const keys=new Set<string>([...FAMILIES_BY_RACE[race],...campaignPreloadModels(stage,stage+1).keys(),'scv','drone','probe','egg','interceptor','broodling','locust']);
 for(const u of identities){if(u.unitType)keys.add(u.unitType);if(u.heroId)keys.add('hero:'+u.heroId);}
 const combat=new Set<string>(),dialogue=new Set<string>();
 const add=(v:unknown)=>{if(typeof v==='string'){if(SOUND_DATA.banks[v])combat.add(v);}else if(v&&typeof v==='object')for(const value of Object.values(v))add(value);};
 const matches=(key:string)=>[...keys].some(id=>key===id||key.startsWith(id+'-')||key.startsWith(id+':')||key===id.replaceAll('_','-'))||key.startsWith('building:');
 for(const [key,value]of Object.entries(SOUND_DATA.weapons))if(matches(key)||key==='hellbat'&&keys.has('hellion'))add(value);
 for(const table of [SOUND_DATA.deaths,SOUND_DATA.motion,SOUND_DATA.motionStart,SOUND_DATA.walkEvents,SOUND_DATA.transforms])for(const [key,value]of Object.entries(table))if(matches(key))add(value);
 for(const [key,value]of Object.entries(SOUND_DATA.skills))if(keys.has('hero:'+key)||['yamato_battlecruiser','hots_leviathan','purifier_flagship'].includes(key))add(value);
 add(SOUND_DATA.special);add(SOUND_DATA.herds);add(SOUND_DATA.carrierMotion);
 for(const [key,banks]of Object.entries(SOUND_DATA.dialogue))if(matches(key))for(const bank of banks)dialogue.add(bank);
 return {combat:[...combat],dialogue:[...dialogue]};
}
