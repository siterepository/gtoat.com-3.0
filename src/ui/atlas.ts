import { gsap, lenis, onFrame, scrollProgress } from '../engine/ticker'
import { quality } from '../engine/quality'
import { warp } from '../fx/warp'
import { audio } from '../fx/audio'

/**
 * ATLAS — orbital navigation. A slither.io-minimap homage: the whole
 * dossier drawn as a serpentine route through space, your position as a
 * live glowing marker, every section a node. Click a node and the camera
 * warp-dives there: FOV surge, orbs streak, ambient whooshes.
 */

interface Node {
  id: string
  label: string
  x: number // SVG coords (0..100)
  y: number
}

export function initAtlas() {
  const sections = [...document.querySelectorAll<HTMLElement>('main section[data-scene]')]
  if (!sections.length) return

  const LABELS: Record<string, string> = {
    home: 'HQ',
    brief: 'ORIGIN',
    players: 'ROSTER',
    updates: 'INTEL',
    reviews: 'REVIEWS',
    lore: 'LORE',
    media: 'MEDIA',
    contact: 'ENLIST',
  }

  // serpentine route: nodes along an S-curve down the map
  const nodes: Node[] = sections.map((sec, i) => {
    const t = sections.length === 1 ? 0 : i / (sections.length - 1)
    return {
      id: sec.id,
      label: LABELS[sec.id] ?? sec.id.toUpperCase(),
      x: 50 + Math.sin(t * Math.PI * 2.1 + 0.6) * 26,
      y: 12 + t * 76,
    }
  })

  // smooth path through nodes (quadratic midpoint chain)
  let d = `M ${nodes[0].x} ${nodes[0].y}`
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]
    const cur = nodes[i]
    const mx = (prev.x + cur.x) / 2
    const my = (prev.y + cur.y) / 2
    d += ` Q ${prev.x} ${prev.y + (cur.y - prev.y) * 0.3} ${mx} ${my}`
  }
  d += ` T ${nodes[nodes.length - 1].x} ${nodes[nodes.length - 1].y}`

  const root = document.createElement('nav')
  root.id = 'atlas'
  root.setAttribute('aria-label', 'Atlas navigation')
  root.innerHTML = `
    <p class="atlas-tag mono" aria-hidden="true">ATLAS</p>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path class="atlas-route" d="${d}" />
      <path class="atlas-route-glow" d="${d}" />
      <circle class="atlas-me" r="2.6" />
    </svg>
    <div class="atlas-nodes"></div>
    <p class="atlas-label mono" aria-hidden="true"></p>
  `
  document.body.appendChild(root)

  const svg = root.querySelector('svg')!
  const routeEl = svg.querySelector<SVGPathElement>('.atlas-route')!
  const me = svg.querySelector<SVGCircleElement>('.atlas-me')!
  const nodesWrap = root.querySelector<HTMLElement>('.atlas-nodes')!
  const labelEl = root.querySelector<HTMLElement>('.atlas-label')!

  // section nodes as real buttons (keyboard-reachable)
  nodes.forEach((n, i) => {
    const b = document.createElement('button')
    b.className = 'atlas-node'
    b.style.left = `${n.x}%`
    b.style.top = `${n.y}%`
    b.setAttribute('aria-label', `Travel to ${n.label}`)
    b.addEventListener('mouseenter', () => {
      labelEl.textContent = n.label
      root.classList.add('is-naming')
    })
    b.addEventListener('mouseleave', () => root.classList.remove('is-naming'))
    b.addEventListener('focus', () => {
      labelEl.textContent = n.label
      root.classList.add('is-naming')
    })
    b.addEventListener('blur', () => root.classList.remove('is-naming'))
    b.addEventListener('click', () => travel(i))
    nodesWrap.appendChild(b)
  })

  function travel(i: number) {
    const target = sections[i]
    const from = window.scrollY
    const to = target.getBoundingClientRect().top + window.scrollY - 64
    const dist = Math.abs(to - from)
    if (dist < 10) return
    // duration scales with distance — short hops stay quick, full-page
    // dives get the cinema
    const duration = Math.min(2.6, 0.9 + (dist / window.innerHeight) * 0.28)
    if (!quality.reducedMotion) warp.dive(duration)
    audio.whoosh()
    lenis.scrollTo(to, {
      duration,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    })
    gsap.fromTo(root, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' })
  }

  // live position marker rides the route by page progress
  const routeLen = routeEl.getTotalLength()
  onFrame(() => {
    const p = routeEl.getPointAtLength(scrollProgress() * routeLen)
    me.setAttribute('cx', String(p.x))
    me.setAttribute('cy', String(p.y))
  })

  // active node state
  let lastActive = -1
  document.addEventListener('gtoat:scene', (e) => {
    const name = (e as CustomEvent<string>).detail
    const idx = sections.findIndex((s) => s.dataset.scene === name)
    if (idx === lastActive) return
    lastActive = idx
    nodesWrap.querySelectorAll('.atlas-node').forEach((el, j) => {
      el.classList.toggle('is-here', j === idx)
    })
  })
}
