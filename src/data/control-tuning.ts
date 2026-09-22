/** Survivors control tuning, not SC2 unit statistics or a claim of measured player APM. */
export const CONTROL_COMBAT = {
  thinkSeconds: .24, thinkSpread: .015,
  movingWindup: .10, repositionSeconds: .22,
  maxMovingAim: .38, infantryTurnRate: 10,
  forwardPreference: 4, retention: .65,
} as const;
