/**
 * The only sanctioned way to change an AudioParam while audio is running. Never assign
 * `param.value` directly: that steps the value and clicks.
 */
export function smooth(ctx: BaseAudioContext, param: AudioParam, value: number, tau = 0.02): void {
  if (!Number.isFinite(value)) return
  param.setTargetAtTime(value, ctx.currentTime, tau)
}
