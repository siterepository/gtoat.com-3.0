import { gsap, ScrollTrigger } from '../engine/ticker'
import { quality } from '../engine/quality'

/** Hero intro plays once the preloader clears; everything else reveals on scroll. */
export function initReveals() {
  if (quality.reducedMotion) {
    gsap.set('.rv', { opacity: 1, y: 0 })
    return
  }

  const hero = gsap.utils.toArray<HTMLElement>('#home .rv')
  const heroTl = gsap.timeline({ paused: true })
  heroTl.to(hero, {
    opacity: 1,
    y: 0,
    duration: 1.1,
    stagger: 0.09,
    ease: 'power4.out',
  })
  document.addEventListener('gtoat:ready', () => heroTl.play(), { once: true })

  ScrollTrigger.batch('main section:not(#home) .rv', {
    start: 'top 88%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
      }),
  })
}
