import { onFrame } from '../engine/ticker'
import { quality } from '../engine/quality'

/**
 * The predator cursor — a slit-pupil reticle. Core snaps to the pointer,
 * ring glides behind it, both magnetize and label over interactives.
 * The prey should know it's prey. Desktop fine-pointer only.
 */
export function initCursor() {
  if (quality.reducedMotion) return
  if (!window.matchMedia('(pointer: fine)').matches) return

  const root = document.getElementById('cursor')
  if (!root) return
  const ring = root.querySelector<HTMLElement>('.cur-ring')!
  const label = root.querySelector<HTMLElement>('.cur-label')!

  document.documentElement.classList.add('has-cursor')

  const pos = { x: innerWidth / 2, y: innerHeight / 2 }
  const ringPos = { x: pos.x, y: pos.y }
  let magnetEl: HTMLElement | null = null
  let visible = false

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX
    pos.y = e.clientY
    if (!visible) {
      visible = true
      root.classList.add('is-on')
    }
    const hit = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      'a, button, [data-cursor], input, textarea, .tab',
    )
    if (hit !== magnetEl) {
      magnetEl = hit ?? null
      const text = magnetEl?.dataset.cursor ?? ''
      label.textContent = text
      root.classList.toggle('is-hover', !!magnetEl)
      root.classList.toggle('has-label', !!text)
    }
  })
  document.documentElement.addEventListener('mouseleave', () => {
    visible = false
    root.classList.remove('is-on')
  })
  window.addEventListener('pointerdown', () => root.classList.add('is-down'))
  window.addEventListener('pointerup', () => root.classList.remove('is-down'))

  onFrame((_t, dt) => {
    if (!visible) return
    // core rides raw position via CSS vars; ring glides + magnetizes
    let tx = pos.x
    let ty = pos.y
    if (magnetEl) {
      const r = magnetEl.getBoundingClientRect()
      if (r.width < 260) {
        // small targets pull the ring onto themselves
        tx = r.left + r.width / 2 + (pos.x - (r.left + r.width / 2)) * 0.35
        ty = r.top + r.height / 2 + (pos.y - (r.top + r.height / 2)) * 0.35
      }
    }
    const k = Math.min(1, dt * 14)
    ringPos.x += (tx - ringPos.x) * k
    ringPos.y += (ty - ringPos.y) * k
    root.style.setProperty('--cx', `${pos.x}px`)
    root.style.setProperty('--cy', `${pos.y}px`)
    ring.style.translate = `${ringPos.x - pos.x}px ${ringPos.y - pos.y}px`
  })
}
