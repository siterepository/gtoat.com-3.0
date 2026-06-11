import { gsap } from '../engine/ticker'
import type { Poi } from './poi'

/**
 * What happens when the serpent examines something. Every target gets the
 * inspection glow; some kinds get a signature reaction on top — the page
 * notices being noticed.
 */
export function reactToExamine(poi: Poi) {
  const { el, kind } = poi

  // universal: inspected glow + lean toward the inspector
  el.classList.add('is-examined')
  setTimeout(() => el.classList.remove('is-examined'), 2600)

  switch (kind) {
    case 'dossier': {
      // the serpent judges the operative — threat bar surges to 100, settles back
      const fill = el.querySelector<HTMLElement>('.thr-f')
      const label = el.querySelector<HTMLElement>('.thr-v')
      if (!fill || !label) break
      const original = label.textContent
      const restWidth = getComputedStyle(el).getPropertyValue('--thr').trim() || '90%'
      gsap
        .timeline()
        .to(fill, { width: '100%', duration: 0.5, ease: 'power3.out' })
        .add(() => {
          label.textContent = '100%'
          label.style.color = '#ef4444'
        })
        .to(fill, { width: restWidth, duration: 1.1, ease: 'power2.inOut', delay: 0.9 })
        .add(() => {
          label.textContent = original
          label.style.color = ''
        })
      break
    }
    case 'stat': {
      // the serpent adds one. it was there, it counts.
      const n = el.querySelector<HTMLElement>('.stat-n')
      if (!n) break
      const v = parseInt(n.textContent?.replace(/\D/g, '') ?? '', 10)
      if (Number.isFinite(v)) {
        gsap
          .timeline()
          .to(n, { scale: 1.18, duration: 0.18, ease: 'back.out(3)' })
          .add(() => {
            n.textContent = (v + 1).toLocaleString('en-US')
          }, '<0.09')
          .to(n, { scale: 1, duration: 0.35, ease: 'power2.out' })
      }
      break
    }
    case 'title': {
      // nosing the headline ripples its letters
      if (el.dataset.split !== '1') {
        el.dataset.split = '1'
        for (const node of [...el.childNodes]) {
          if (node.nodeType === Node.TEXT_NODE) {
            const frag = document.createDocumentFragment()
            for (const ch of node.textContent ?? '') {
              const s = document.createElement('span')
              s.className = 'ripple-ch'
              s.textContent = ch
              frag.appendChild(s)
            }
            node.replaceWith(frag)
          } else if (node instanceof HTMLElement) {
            node.classList.add('ripple-ch')
          }
        }
      }
      const chars = el.querySelectorAll('.ripple-ch')
      gsap.fromTo(
        chars,
        { y: 0 },
        {
          y: -14,
          duration: 0.28,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: 1,
          stagger: { each: 0.035, from: 'start' },
        },
      )
      break
    }
    case 'play': {
      // it knows what the button does. it wants you to press it.
      gsap
        .timeline()
        .to(el, { scale: 1.12, duration: 0.22, ease: 'back.out(2.5)' })
        .to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
      break
    }
    default: {
      // cards, chips, eras: a nudge — physically poked by a snout
      gsap
        .timeline()
        .to(el, { rotation: 1.6, y: -6, duration: 0.16, ease: 'power2.out' })
        .to(el, { rotation: 0, y: 0, duration: 0.7, ease: 'elastic.out(1.2, 0.4)' })
    }
  }
}
