import { HalfFloatType } from 'three'
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { camera, renderer, scene, setRenderFn } from '../engine/stage'

let teardown: (() => void) | null = null

/** Watchdog escape hatch — drop bloom when the frame budget is blown. */
export function disableBloom() {
  teardown?.()
  teardown = null
}

/** One post effect, tuned hard. Bloom only — stacked effects read as mud. */
export function initBloom() {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({
        intensity: 1.05,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.22,
        mipmapBlur: true,
      }),
    ),
  )

  const resize = () => composer.setSize(window.innerWidth, window.innerHeight)
  window.addEventListener('resize', resize)
  resize()

  setRenderFn(() => composer.render())

  teardown = () => {
    window.removeEventListener('resize', resize)
    setRenderFn(() => renderer.render(scene, camera))
    composer.dispose()
  }
}
