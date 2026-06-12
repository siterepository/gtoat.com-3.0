import { lenis, ScrollTrigger } from '../engine/ticker'
import { quality } from '../engine/quality'
import { warp } from '../fx/warp'

export function initNav() {
  const nav = document.getElementById('nav')!
  const ham = document.getElementById('navHam')!
  const links = nav.querySelectorAll<HTMLAnchorElement>('.nav-links a')
  const sections = [...document.querySelectorAll<HTMLElement>('main section[id]')]

  // scrolled state
  lenis.on('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 24)
  })

  // mobile menu
  ham.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open')
    ham.setAttribute('aria-expanded', String(open))
  })

  // warp-dive anchor travel — every nav jump is a flight
  const goTo = (hash: string) => {
    const target = document.querySelector<HTMLElement>(hash)
    if (!target) return
    document.body.classList.remove('nav-open')
    ham.setAttribute('aria-expanded', 'false')
    const to = target.getBoundingClientRect().top + window.scrollY - 64
    const dist = Math.abs(to - window.scrollY)
    const duration = Math.min(2.6, 0.9 + (dist / window.innerHeight) * 0.28)
    if (!quality.reducedMotion && dist > window.innerHeight * 0.5) warp.dive(duration)
    lenis.scrollTo(to, { duration, easing: (t: number) => 1 - Math.pow(1 - t, 4) })
  }
  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      goTo(a.getAttribute('href')!)
    })
  })

  sections.forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => {
        if (!st.isActive) return
        links.forEach((a) =>
          a.classList.toggle('is-active', a.getAttribute('href') === `#${sec.id}`),
        )
      },
    })
  })
}
