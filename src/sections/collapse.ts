import { gsap, lenis, ScrollTrigger } from '../engine/ticker'

/**
 * Dossier files — the long sections ship closed (the 2.x accordion,
 * reborn). Opening one reveals its body, forces the reveal system's
 * resting-state elements visible, and re-measures every ScrollTrigger.
 */
export function initCollapse() {
  const sections = [...document.querySelectorAll<HTMLElement>('section.clp')]

  const setOpen = (sec: HTMLElement, open: boolean) => {
    sec.classList.toggle('is-open', open)
    const btn = sec.querySelector<HTMLButtonElement>('.clp-btn')
    if (btn) {
      btn.setAttribute('aria-expanded', String(open))
      const label = btn.childNodes[btn.childNodes.length - 1]
      if (label) label.textContent = open ? ' CLOSE FILE' : ' OPEN FILE'
    }
    if (open) {
      // .rv children inside were never revealed (zero height while closed)
      gsap.set(sec.querySelectorAll('.rv'), { opacity: 1, y: 0 })
      sec.querySelectorAll<HTMLElement>('.dos').forEach((d) => d.classList.add('is-armed'))
    }
    ScrollTrigger.refresh()
  }

  sections.forEach((sec) => {
    const head = sec.querySelector<HTMLElement>('.clp-head')
    if (!head) return
    head.addEventListener('click', (e) => {
      // links inside the header should still behave
      if ((e.target as HTMLElement).closest('a')) return
      setOpen(sec, !sec.classList.contains('is-open'))
    })
  })

  /** Navigation into a closed file opens it first. */
  const openFor = (hash: string) => {
    const el = document.querySelector<HTMLElement>(hash)
    const sec = el?.closest<HTMLElement>('section.clp')
    if (sec && !sec.classList.contains('is-open')) setOpen(sec, true)
  }
  // nav links + atlas travel both end at section ids — watch the hashes
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', () => openFor(a.getAttribute('href')!))
  })
  document.addEventListener('gtoat:travel', (e) => {
    openFor(`#${(e as CustomEvent<string>).detail}`)
  })

  // deep links (/#lore) open their file on load
  if (location.hash) {
    openFor(location.hash)
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(location.hash)
      if (el) lenis.scrollTo(el, { offset: -64 })
    }, 400)
  }
}
