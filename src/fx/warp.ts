import { camera } from '../engine/stage'
import { gsap, lenis, onFrame } from '../engine/ticker'
import { quality } from '../engine/quality'

/**
 * The warp field — one scalar (0..1) that bends the whole scene when the
 * page moves fast: FOV surges, orbs stretch into anamorphic streaks, the
 * nebula accelerates. Driven by real scroll velocity, and boostable to 1
 * for programmatic warp-dives (ATLAS navigation).
 */
const state = {
  current: 0,
  velocity: 0,
  boost: 0,
}

const BASE_FOV = 42
const MAX_FOV_KICK = 13

export const warp = {
  get value() {
    return state.current
  },
  /** Full warp for `duration`s — used by ATLAS travel. */
  dive(duration: number) {
    gsap.killTweensOf(state)
    gsap
      .timeline()
      .to(state, { boost: 1, duration: Math.min(0.5, duration * 0.3), ease: 'power2.in' })
      .to(state, { boost: 0, duration: duration * 0.55, ease: 'power3.out' }, `+=${duration * 0.15}`)
  },
}

export function initWarp() {
  if (quality.reducedMotion) return

  lenis.on('scroll', (e: { velocity: number }) => {
    state.velocity = e.velocity
  })

  let lastFov = BASE_FOV
  onFrame((_t, dt) => {
    // normalized scroll speed — calibrated so flick-scrolling registers
    // without making ordinary reading feel like a launch
    const fromScroll = Math.min(1, Math.abs(state.velocity) / 95)
    const target = Math.max(fromScroll * 0.7, state.boost)
    const k = Math.min(1, dt * (target > state.current ? 9 : 3.5))
    state.current += (target - state.current) * k
    state.velocity *= 0.92 // decays if lenis stops emitting

    const fov = BASE_FOV + state.current * MAX_FOV_KICK
    if (Math.abs(fov - lastFov) > 0.02) {
      lastFov = fov
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })
}
