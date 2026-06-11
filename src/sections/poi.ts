/**
 * Points of interest — real page elements the serpent can notice, swim to,
 * and examine. Candidates are whatever is on stage in the viewport.
 */

export interface Poi {
  el: HTMLElement
  kind: 'dossier' | 'stat' | 'title' | 'play' | 'card' | 'chip' | 'era'
  /** viewport-relative center, in pixels */
  cx: number
  cy: number
}

const SELECTORS: Array<[string, Poi['kind']]> = [
  ['.dos', 'dossier'],
  ['.stat', 'stat'],
  ['.sec-title', 'title'],
  ['.btn-play', 'play'],
  ['.ml', 'card'],
  ['.intel-card', 'card'],
  ['.review-card', 'card'],
  ['.chip', 'chip'],
  ['.tle', 'era'],
]

let lastEl: HTMLElement | null = null

/** Pick a random examinable element currently well inside the viewport. */
export function pickPoi(): Poi | null {
  const candidates: Poi[] = []
  const vw = window.innerWidth
  const vh = window.innerHeight

  for (const [sel, kind] of SELECTORS) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el === lastEl) continue
      const r = el.getBoundingClientRect()
      if (r.width < 40 || r.height < 24) continue
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      // must sit comfortably on screen — the snake won't chase offcuts
      if (cx < vw * 0.08 || cx > vw * 0.92 || cy < vh * 0.15 || cy > vh * 0.85) continue
      candidates.push({ el, kind, cx, cy })
    }
  }

  if (!candidates.length) return null
  const poi = candidates[Math.floor(Math.random() * candidates.length)]
  lastEl = poi.el
  return poi
}
