/** Approved game changes stay separate from the pinned SC source export. */
export const PLAYER_REAPER_DAMAGE_BONUS=2;

/** Approved 2026-09-28: combat bodies only; never source exports or buildings. */
export const PLAYER_COMBAT_FACTOR=1.15;

/** Approved 2026-10-29 player adaptations; pinned source/hostile units stay unchanged. */
export const PLAYER_BANELING={productionSeconds:20,moveSpeed:4.2,recoverySeconds:1.5} as const;
export const PLAYER_ZERGLING_BANELING_REDUCTION=.4;
export const PLAYER_LURKER={surfaceDamage:.6,burrowMove:.7} as const;
export const APPROACH_CHARGE={
 shortRange:4,minimumSourceRadius:.5,
 standard:{cooldown:6,speed:1.6,seconds:1,maxDistance:4},
 baneling:{cooldown:4,speed:1.8,seconds:.8,maxDistance:4},
} as const;
