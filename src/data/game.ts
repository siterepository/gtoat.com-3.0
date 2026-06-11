/**
 * GRINCH.io — the original GTOAT slither engine, preserved verbatim under
 * /game. It builds its own overlay; we lazy-load the 9 scripts on first
 * click so the experience pays zero cost until someone presses play.
 */

const SCRIPTS = [
  'constants',
  'spatialHash',
  'snake',
  'world',
  'ai',
  'bots',
  'engine',
  'renderer',
  'slither',
]

declare global {
  interface Window {
    GTOAT_SLITHER?: { start: () => void; exit: () => void; playAgain: () => void }
  }
}

let loading: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`failed to load ${src}`))
    document.head.appendChild(s)
  })
}

function loadGame(): Promise<void> {
  if (window.GTOAT_SLITHER) return Promise.resolve()
  if (loading) return loading

  const css = document.createElement('link')
  css.rel = 'stylesheet'
  css.href = '/game/slither.css'
  document.head.appendChild(css)

  // engine files share globals — load strictly in order
  loading = SCRIPTS.reduce(
    (chain, name) => chain.then(() => loadScript(`/game/${name}.js`)),
    Promise.resolve(),
  )
  return loading
}

export function initGame() {
  const btn = document.getElementById('playBtn') as HTMLButtonElement | null
  if (!btn) return

  btn.addEventListener('click', async () => {
    const label = btn.innerHTML
    btn.disabled = true
    btn.style.opacity = '0.7'
    try {
      await loadGame()
      window.GTOAT_SLITHER?.start()
    } catch (err) {
      console.error('[gtoat] game failed to load', err)
    } finally {
      btn.disabled = false
      btn.style.opacity = ''
      btn.innerHTML = label
    }
  })

  // warm the cache once the page is idle — click feels instant
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => void loadGame(), { timeout: 8000 })
  }
}
