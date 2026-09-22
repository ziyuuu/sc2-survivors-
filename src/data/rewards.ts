export type Rarity='white'|'green'|'blue'|'purple'|'orange';
/** Game-specific reward tuning, independent of SC2's locked multiplayer table. */
export const RARITIES={
 white:{name:'普通',color:'#c6d1d9',weight:64,mapWeight:84.8},
 green:{name:'精良',color:'#79df91',weight:20,mapWeight:10},
 blue:{name:'稀有',color:'#6aafff',weight:10,mapWeight:4},
 purple:{name:'史诗',color:'#c58cff',weight:5,mapWeight:1},
 orange:{name:'传说',color:'#ffb35c',weight:1,mapWeight:.2},
} as const;
export const MAP_REWARDS={combatChance:.02,droneChance:.08};
export function rollRarity(rng:()=>number,map=false):Rarity {
 let roll=rng()*100;for(const [id,data] of Object.entries(RARITIES)){roll-=map?data.mapWeight:data.weight;if(roll<0)return id as Rarity;}return 'orange';
}
export const BUFFS={
 weapon:{name:'武器强化',icon:'tech.attack',values:[.10,.20,.35,.60]},
 vitality:{name:'强化装甲',icon:'tech.shield',values:[.12,.25,.45,.75]},
 recovery:{name:'医疗增效',icon:'tech.heal',values:[.15,.30,.50,.80]},
 tactical:{name:'战术推进强化',icon:'tech.stim',values:[.10,.20,.30,.45]},
} as const;
