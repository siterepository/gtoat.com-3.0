import { onFrame, scrollProgress } from '../engine/ticker'

export function initProgress() {
  const bar = document.getElementById('prog')!
  let shown = 0
  onFrame((_t, dt) => {
    shown += (scrollProgress() - shown) * Math.min(1, dt * 10)
    bar.style.transform = `scaleX(${shown})`
  })
}
