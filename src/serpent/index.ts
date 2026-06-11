import { Vector3 } from 'three'
import { camera, pointer, scene } from '../engine/stage'
import { onFrame, scrollProgress } from '../engine/ticker'
import { quality } from '../engine/quality'
import { Spine } from './spine'
import { SerpentBody } from './body'
import { SerpentHead } from './head'
import { Orbs } from '../fx/orbs'

/** World-space half-extents of the viewport at z=0 for the current camera. */
function viewExtents() {
  const h = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
  return { w: h * camera.aspect, h }
}

export function createSerpent() {
  const spine = new Spine()
  const body = new SerpentBody(quality.tubeSegments)
  const head = new SerpentHead()
  const orbs = new Orbs(quality.orbCount)
  scene.add(body.mesh, head.group)

  const headPos = new Vector3()
  const headDir = new Vector3()
  const smooth = { scroll: 0, px: 0, py: 0 }

  let view = viewExtents()
  window.addEventListener('resize', () => {
    view = viewExtents()
    orbs.resize(view)
  })
  orbs.resize(view)

  let eaten = 0
  orbs.onEat = () => {
    eaten++
    document.dispatchEvent(new CustomEvent('gtoat:eat', { detail: eaten }))
  }

  onFrame((time, dt) => {
    const k = Math.min(1, dt * 5)
    smooth.scroll += (scrollProgress() - smooth.scroll) * k
    smooth.px += (pointer.x - smooth.px) * k
    smooth.py += (pointer.y - smooth.py) * k

    spine.update(time, smooth.scroll, { x: smooth.px, y: smooth.py }, view)
    body.update(spine.curve, time, smooth.scroll * 0.65)
    spine.headPosition(headPos)
    spine.headDirection(headDir)
    head.update(headPos, headDir, { x: smooth.px, y: smooth.py })
    orbs.update(time, headPos)

    // camera rig — pointer parallax + faint breathing drift
    camera.position.x = smooth.px * 0.55 + Math.sin(time * 0.12) * 0.12
    camera.position.y = smooth.py * 0.4 + Math.cos(time * 0.1) * 0.1
    camera.lookAt(0, 0, 0)
  })
}
