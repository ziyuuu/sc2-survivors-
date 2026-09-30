/** Fit a complete source death clip into the bounded corpse lifetime, without
 * slowing shorter clips or changing simulation/reward timing. */
export function deathPoseTime(age:number,sourceDuration:number,lifetime:number):number {
 if(age>=lifetime)return sourceDuration;
 return Math.min(sourceDuration,Math.max(0,age)*Math.max(1,sourceDuration/Math.max(.001,lifetime)));
}
