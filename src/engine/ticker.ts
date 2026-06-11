import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { quality } from './quality'

gsap.registerPlugin(ScrollTrigger)

export const lenis = new Lenis({
  duration: 1.15,
  easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
  smoothWheel: !quality.reducedMotion,
})

lenis.on('scroll', ScrollTrigger.update)

type FrameFn = (time: number, dt: number) => void
const frameFns = new Set<FrameFn>()

/** Register a per-frame callback on the single gsap.ticker heartbeat. */
export function onFrame(fn: FrameFn): () => void {
  frameFns.add(fn)
  return () => frameFns.delete(fn)
}

let paused = false
document.addEventListener('visibilitychange', () => {
  paused = document.hidden
})

gsap.ticker.add((time, dt) => {
  lenis.raf(time * 1000)
  if (paused) return
  // reduced motion: freeze time-driven animation, keep scroll-driven state
  const t = quality.reducedMotion ? 0 : time
  for (const fn of frameFns) fn(t, dt / 1000)
})
gsap.ticker.lagSmoothing(0)

/** 0..1 page scroll progress, updated by lenis. */
export function scrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? window.scrollY / max : 0
}

export { gsap, ScrollTrigger }
