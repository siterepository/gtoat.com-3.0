const MIN_SHOW = 900 // ms — long enough to read, short enough to respect

const statusLines = [
  'DECRYPTING DOSSIER…',
  'WAKING THE SERPENT…',
  'CHECKING BELLA’S MOOD…',
  'GOD MODE: STANDBY',
]

export function runPreloader(): Promise<void> {
  const el = document.getElementById('preloader')!
  const fill = document.getElementById('preFill')!
  const status = document.getElementById('preStatus')!

  const start = performance.now()
  let line = 0
  const lineTimer = setInterval(() => {
    line = (line + 1) % statusLines.length
    status.textContent = statusLines[line]
  }, 420)

  let progress = 0
  const progTimer = setInterval(() => {
    // ease toward 90%; the real "done" signal closes the gap
    progress += (90 - progress) * 0.12
    fill.style.width = `${progress}%`
  }, 80)

  const ready = Promise.all([
    document.fonts.ready,
    new Promise((r) => {
      if (document.readyState === 'complete') r(null)
      else window.addEventListener('load', () => r(null), { once: true })
    }),
  ])

  return ready.then(() => {
    const elapsed = performance.now() - start
    const wait = Math.max(0, MIN_SHOW - elapsed)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        clearInterval(lineTimer)
        clearInterval(progTimer)
        fill.style.width = '100%'
        status.textContent = 'ACCESS GRANTED'
        setTimeout(() => {
          el.classList.add('is-done')
          document.body.classList.add('is-ready')
          resolve()
        }, 260)
      }, wait)
    })
  })
}
