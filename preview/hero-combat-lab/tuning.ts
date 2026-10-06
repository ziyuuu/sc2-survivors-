/** Local demonstration design. These values do not change the production game. */
export const ATTACK_DEMO_TUNING={
 raynor:{sideFraction:.3,iiiSides:1,vSides:2},
 nova:{iiiFraction:.2,iiiTicks:3,vFraction:.3,vTicks:4,dotPeriod:1,lineWidth:1},
 missiles:{everySalvos:5,damageFraction:1.5,iiiCount:1,vCount:3},
 swann:{retainedFraction:.6,maxHops:2,range:3.5,iiiBranches:1,vBranches:2},
 tosh:{iiiFraction:.35,iiiRadius:1.8,iiiSparks:18,vFraction:.6,vRadius:2.8,vSparks:36},
} as const;
