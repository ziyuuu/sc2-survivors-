/** Approved Survivors progression, separate from the locked SC2 base profile. */
export function rankStats(rank:number){
 const r=Math.max(1,Math.min(5,Math.trunc(rank))),attackSpeed=1+.15*(r-1);
 return {rank:r,attackSpeed,damage:r/attackSpeed,health:1+.8*(r-1),armor:.5*(r-1),healing:r,energy:r};
}
