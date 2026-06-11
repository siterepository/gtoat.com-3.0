import { gsap } from '../engine/ticker'
import { quality } from '../engine/quality'

/**
 * Serpentine page flow — the 3.0 answer to the 2.x "maze scroll".
 * Sections don't slide up flat: each one swings in from its side of the
 * zig-zag with perspective rotation and depth, scrubbed by scroll, so the
 * page reads as one continuous winding path.
 */
export function initFlow() {
  if (quality.reducedMotion) return

  const sections = gsap.utils.toArray<HTMLElement>('main section[data-scene]')

  sections.forEach((sec) => {
    const inner = sec.querySelector<HTMLElement>('.sec-in')
    if (!inner) return
    if (sec.id === 'home') return // hero owns its own intro

    const side = sec.classList.contains('flow-r') ? 1 : sec.classList.contains('flow-l') ? -1 : 0

    gsap
      .timeline({
        scrollTrigger: {
          trigger: sec,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      })
      // swing in from its side of the path
      .fromTo(
        inner,
        {
          rotateY: side * 10,
          rotateX: 9,
          z: -160,
          x: side * 70,
          opacity: 0.25,
        },
        {
          rotateY: 0,
          rotateX: 0,
          z: 0,
          x: 0,
          opacity: 1,
          ease: 'power2.out',
          duration: 0.45,
        },
      )
      .to(inner, { duration: 0.1 }) // dwell flat through the middle
      // hand off toward the other side as it leaves
      .to(inner, {
        rotateY: side * -7,
        rotateX: -7,
        z: -120,
        x: side * -50,
        opacity: 0.3,
        ease: 'power2.in',
        duration: 0.45,
      })
  })
}
