/** USER_CONFIRMED Survivors hero tuning, independent of SC2 multiplayer units. */
export const HERO_IDS=['raynor','tychus','nova'] as const;
export type HeroId=typeof HERO_IDS[number];
export const HEROES={
 raynor:{name:'雷诺',hp:500,armor:3,damage:20,period:.2,range:6,speed:3.5,skill:'穿透射击',skillDamage:180,skillRange:10,cooldown:12,delay:0,radius:.5,length:10,width:1,model:'hero.raynor'},
 tychus:{name:'泰凯斯',hp:650,armor:4,damage:10,period:.08,range:5,speed:3.15,skill:'手雷',skillDamage:140,skillRange:5,cooldown:12,delay:.6,radius:2.5,length:0,width:0,model:'hero.tychus'},
 nova:{name:'诺娃',hp:300,armor:1,damage:70,period:.8,range:8,speed:3.8,skill:'狙击',skillDamage:300,skillRange:10,cooldown:10,delay:.4,radius:.5,length:0,width:0,model:'hero.nova'},
} as const;
export function heroStats(rank:number){const n=Math.max(0,Math.min(4,rank-1)),attackSpeed=1+.08*n;return {rank,attackSpeed,damage:(1+.25*n)/attackSpeed,skill:1+.25*n,health:1+.2*n,armor:.25*n,movement:1,healing:1,energy:1};}
export function heroRevivalCost(rank:number){const f=1+.25*(Math.max(1,Math.min(5,rank))-1);return {minerals:250*f,gas:100*f};}
