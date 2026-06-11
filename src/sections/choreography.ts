import { gsap, ScrollTrigger } from '../engine/ticker'
import { quality } from '../engine/quality'

/** Typewriter line in The Brief — fires once when scrolled into view. */
function initTypeline() {
  const el = document.getElementById('typeline')
  if (!el) return
  const text = el.dataset.text ?? ''
  const caret = el.querySelector('.caret')!

  if (quality.reducedMotion) {
    el.insertBefore(document.createTextNode(text), caret)
    return
  }

  ScrollTrigger.create({
    trigger: el,
    start: 'top 80%',
    once: true,
    onEnter: () => {
      let i = 0
      const node = document.createTextNode('')
      el.insertBefore(node, caret)
      const tick = () => {
        node.textContent = text.slice(0, ++i)
        if (i < text.length) setTimeout(tick, 18 + Math.random() * 26)
      }
      tick()
    },
  })
}

/** Stats counters — eased count-up, slither style. */
function initCounters() {
  document.querySelectorAll<HTMLElement>('.stat-n[data-count]').forEach((el) => {
    const end = Number(el.dataset.count)
    const state = { v: 0 }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          v: end,
          duration: quality.reducedMotion ? 0 : 2.2,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = Math.round(state.v).toLocaleString('en-US')
          },
        }),
    })
  })
}

/** Threat bars arm when their dossier scrolls in. */
function initThreatBars() {
  document.querySelectorAll<HTMLElement>('.dos').forEach((card) => {
    ScrollTrigger.create({
      trigger: card,
      start: 'top 85%',
      once: true,
      onEnter: () => card.classList.add('is-armed'),
    })
  })
}

/** Lore timeline — spine draws down, eras land one by one. */
function initTimeline() {
  const tl = document.querySelector<HTMLElement>('.tl')
  if (!tl) return
  if (!quality.reducedMotion) {
    gsap.from(tl, {
      scrollTrigger: { trigger: tl, start: 'top 75%', end: 'bottom 65%', scrub: 1 },
      '--tl-draw': 0,
    })
  }
  // ego meter fills to overflow, lands on ∞
  const fill = document.querySelector<HTMLElement>('.ego-fill')
  if (fill) {
    ScrollTrigger.create({
      trigger: '.ego-meter',
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(fill, {
          width: '100%',
          duration: quality.reducedMotion ? 0 : 1.8,
          ease: 'power4.inOut',
        }),
    })
  }
}

/** Hero headline lines get a sharper cinematic entrance. */
function enrichHeroIntro() {
  if (quality.reducedMotion) return
  gsap.set('#home .hero-line', { clipPath: 'inset(0 0 100% 0)' })
  document.addEventListener(
    'gtoat:ready',
    () => {
      gsap.to('#home .hero-line', {
        clipPath: 'inset(0 0 -8% 0)',
        duration: 1.2,
        stagger: 0.14,
        ease: 'power4.out',
        delay: 0.15,
      })
    },
    { once: true },
  )
}

export function initChoreography() {
  initTypeline()
  initCounters()
  initThreatBars()
  initTimeline()
  enrichHeroIntro()
}
