import { onFrame } from './ticker'
import { renderer } from './stage'
import { quality } from './quality'
import { disableBloom } from '../fx/bloom'

/**
 * Frame-budget watchdog. Device hints lie; measured frame time doesn't.
 * If we sustain < ~42fps for two seconds, step down once: drop bloom,
 * cap DPR at 1.25. One-way — no oscillation.
 */
export function initWatchdog() {
  if (quality.reducedMotion) return

  let slow = 0
  let stepped = false

  onFrame((_t, dt) => {
    if (stepped) return
    if (dt > 1 / 42) {
      slow += dt
      if (slow > 2) {
        stepped = true
        disableBloom()
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
        console.info('[gtoat] perf watchdog: stepped quality down')
      }
    } else {
      slow = Math.max(0, slow - dt * 0.5)
    }
  })
}
