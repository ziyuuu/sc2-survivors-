/** Approved initial tuning. Durations use effective 60 Hz battle ticks. */
export const MISSION_RULES={
 clock:{grace:600,check:900,gcd:1800,chance:.15},
 escort:{workersMin:3,workersMax:8,speed:3.9375,travel:15,waveTicks:180,lings:30,banes:10,minerals:50,gas:10},
 repair:{perWorker:.015,maximumRate:.06,initialHp:.25,secondWaveHp:.625},
 intel:{weights:[60,30,10],counts:[[3,5],[6,10],[11,15]],residenceTicks:600,identityChance:.5},
 rescue:{signalTicks:240,defendTicks:900,waveTicks:240,armorRatio:.75,outputRatio:.25},
 hives:{minimum:2,maximum:4,waveTicks:360,growthTicks:1200,queueLimit:40},
 eggs:{minimum:12,maximum:18,workerChance:.6,banelingChance:.2,pulseSeconds:3,pulseWarning:.6,pulseRadius:2.2},
 fleet:{towers:8,activationTicks:300,guards:[8,10,12,16],cooldownTicks:18000,lifetimeTicks:3600,arrivalTicks:45,firstSkillTicks:180,skillTicks:900,chargeTicks:75,flightTicks:15,damage:300}
} as const;
/** Later campaign tasks admit reinforcement waves more frequently, with a bounded 20% increase. */
export const missionWaveTicks=(ticks:number,stage:number)=>Math.round(ticks/(1+.2*Math.max(0,Math.min(1,(stage-4)/14))));
