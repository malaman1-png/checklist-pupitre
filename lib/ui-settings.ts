export const DEFAULT_TOUCH_TAP_SLOP_PX = 10
export const MIN_TOUCH_TAP_SLOP_PX = 0
export const MAX_TOUCH_TAP_SLOP_PX = 28

export function clampTouchTapSlopPx(value: number): number {
  const rounded = Math.round(value)
  if (!Number.isFinite(rounded)) return DEFAULT_TOUCH_TAP_SLOP_PX
  return Math.min(MAX_TOUCH_TAP_SLOP_PX, Math.max(MIN_TOUCH_TAP_SLOP_PX, rounded))
}

export function getTouchTapSlopPxFromSettings(settings: any): number {
  return clampTouchTapSlopPx(Number(settings?.touch_tap_slop_px ?? DEFAULT_TOUCH_TAP_SLOP_PX))
}
