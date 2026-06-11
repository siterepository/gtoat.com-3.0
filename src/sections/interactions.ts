import { ScrollTrigger } from '../engine/ticker'

/** Intel tab filter + show-more. */
function initIntel() {
  const tabs = document.getElementById('intelTabs')
  const grid = document.getElementById('intelGrid')
  const more = document.getElementById('intelMore') as HTMLButtonElement | null
  if (!tabs || !grid || !more) return

  const cards = [...grid.querySelectorAll<HTMLElement>('.intel-card')]

  tabs.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.tab')
    if (!btn) return
    tabs.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('is-on', t === btn)
      t.setAttribute('aria-selected', String(t === btn))
    })
    const f = btn.dataset.f
    cards.forEach((c) => c.classList.toggle('f-out', f !== 'all' && c.dataset.p !== f))
    // filtering implies the user wants to see everything matching
    if (f !== 'all') grid.classList.add('is-open')
    more.style.display = f === 'all' && !grid.classList.contains('is-open') ? '' : 'none'
    ScrollTrigger.refresh()
  })

  more.addEventListener('click', () => {
    grid.classList.add('is-open')
    more.style.display = 'none'
    ScrollTrigger.refresh()
  })
}

/** Dossier cards — pointer-following glow via CSS vars. */
function initDossierGlow() {
  document.querySelectorAll<HTMLElement>('.dos').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    })
  })
}

/** Hero clown button pupils follow the pointer (2.x easter egg). */
function initClownEyes() {
  const btn = document.getElementById('playBtn')
  if (!btn) return
  const pupils = btn.querySelectorAll<HTMLElement>('.pupil')
  window.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 240))
    const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 240))
    pupils.forEach((p) => {
      p.style.translate = `${dx * 36 - 50}% ${dy * 30 - 50}%`
    })
  })
}

/** Serpent feeding counter — quiet flex in the hero kicker. */
function initFeedCounter() {
  const kicker = document.querySelector<HTMLElement>('.hero-kicker')
  if (!kicker) return
  const base = kicker.textContent
  document.addEventListener('gtoat:eat', (e) => {
    const n = (e as CustomEvent<number>).detail
    if (n > 0 && n % 25 === 0) {
      kicker.textContent = `${base} // ORBS CONSUMED: ${n}`
    }
  })
}

export function initInteractions() {
  initIntel()
  initDossierGlow()
  initClownEyes()
  initFeedCounter()
}
