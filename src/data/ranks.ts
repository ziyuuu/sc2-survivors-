/** Approved Survivors progression, separate from the locked SC2 base profile. */
export function rankStats(rank:number){
 const r=Math.max(1,Math.trunc(rank));
 if(r<=5){const attackSpeed=1+.15*(r-1);return {rank:r,attackSpeed,damage:r/attackSpeed,health:1+.8*(r-1),armor:.5*(r-1),healing:r,energy:r};}
 const extra=Math.max(0,r-7),dps=r===6?6.8:9+2.2*extra,attackSpeed=r===6?1.85:2.2+.2*extra;
 return {rank:r,attackSpeed,damage:dps/attackSpeed,health:r===6?5.8:8+1.2*extra,armor:r===6?3.5:5+.5*extra,healing:dps,energy:r};
}
