import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { quality } from './quality'
import { onFrame } from './ticker'

export const canvas = document.getElementById('gl') as HTMLCanvasElement

export const renderer = new WebGLRenderer({
  canvas,
  antialias: quality.tier !== 'low',
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
})
renderer.setClearColor(new Color('#04060d'), 1)

export const scene = new Scene()

export const camera = new PerspectiveCamera(42, 1, 0.1, 120)
camera.position.set(0, 0, 14)
scene.add(camera)

function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio, quality.dprCap)
  renderer.setPixelRatio(dpr)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

/** Mouse in NDC (-1..1), smoothed by consumers as needed. */
export const pointer = { x: 0, y: 0 }
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
})

/** Composer hook — Sprint 2 swaps plain render for selective bloom. */
let renderFn: () => void = () => renderer.render(scene, camera)
export function setRenderFn(fn: () => void) {
  renderFn = fn
}

let started = false
export function startStage() {
  if (started) return
  started = true
  onFrame(() => renderFn())
  if (quality.reducedMotion) {
    // single styled frame; no continuous animation
    renderFn()
  }
}
