import { HalfFloatType } from 'three'
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { camera, renderer, scene, setRenderFn } from '../engine/stage'

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
}
