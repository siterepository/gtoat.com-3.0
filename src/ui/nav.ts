import { lenis, ScrollTrigger } from '../engine/ticker'

export function initNav() {
  const nav = document.getElementById('nav')!
  const ham = document.getElementById('navHam')!
  const links = nav.querySelectorAll<HTMLAnchorElement>('.nav-links a')
  const dots = document.getElementById('dots')!
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

  // smooth anchor scroll
  const goTo = (hash: string) => {
    const target = document.querySelector(hash)
    if (!target) return
    document.body.classList.remove('nav-open')
    ham.setAttribute('aria-expanded', 'false')
    lenis.scrollTo(target as HTMLElement, { offset: -64, duration: 1.4 })
  }
  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      goTo(a.getAttribute('href')!)
    })
  })

  // dot nav
  const dotEls = sections.map((sec) => {
    const b = document.createElement('button')
    b.setAttribute('aria-label', sec.id)
    b.addEventListener('click', () => goTo(`#${sec.id}`))
    dots.appendChild(b)
    return b
  })

  sections.forEach((sec, i) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => {
        if (!st.isActive) return
        dotEls.forEach((d, j) => d.classList.toggle('is-on', i === j))
        links.forEach((a) =>
          a.classList.toggle('is-active', a.getAttribute('href') === `#${sec.id}`),
        )
      },
    })
  })
}
