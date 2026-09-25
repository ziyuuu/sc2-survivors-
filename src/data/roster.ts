/** Fixed budget, independent of how many unit families a future catalog contains.
 * New families compete for existing seats; they never increase this total. */
export const ROSTER_LIMITS={familyBase:5,ordinaryBase:25,ordinaryExpanded:35,heroes:3} as const;
