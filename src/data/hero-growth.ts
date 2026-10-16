/** Approved orange equipment progression. Existing I–V values are unchanged. */
export function heroGrowth(rank:number){
 const r=Math.max(1,Math.trunc(rank)),n=Math.min(4,r-1),extra=Math.max(0,r-5),basePeriod=1-.05*n;
 const amount=1+.2*extra,period=basePeriod/(1+.05*extra);
 return {health:(1+.35*n)*amount,damage:(1+.35*n)*amount*period,period,armor:.5*n+.5*extra,passive:(1+.35*n)*amount,skill:[9200,12880,16560,20240,23920][n]*amount};
}
