import { Vector3 } from 'three'
import { camera, pointer, scene } from '../engine/stage'
import { onFrame } from '../engine/ticker'
import { quality } from '../engine/quality'
import { Locomotion } from './locomotion'
import { SerpentBody } from './body'
import { SerpentHead } from './head'
import { Orbs } from '../fx/orbs'
import { mood } from '../fx/moods'

/** World-space half-extents of the viewport at z=0 for the current camera. */
function viewExtents() {
  const h = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
  return { w: h * camera.aspect, h }
}

const POINTER_IDLE_MS = 2600

export function createSerpent() {
  const locomotion = new Locomotion()
  const body = new SerpentBody(quality.tubeSegments)
  const head = new SerpentHead()
  const orbs = new Orbs(quality.orbCount)
  scene.add(body.mesh, head.group)

  const headPos = new Vector3()
  const headDir = new Vector3()
  const pointerWorld = new Vector3()
  const rayDir = new Vector3()
  const smooth = { px: 0, py: 0 }

  let view = viewExtents()
  window.addEventListener('resize', () => {
    view = viewExtents()
    orbs.resize(view)
  })
  orbs.resize(view)

  // pointer activity — chase the mouse while it's alive, wander when idle
  let lastPointerMove = -1e9
  window.addEventListener('pointermove', () => {
    lastPointerMove = performance.now()
  })

  let eaten = 0
  orbs.onEat = () => {
    eaten++
    document.dispatchEvent(new CustomEvent('gtoat:eat', { detail: eaten }))
  }

  onFrame((time, dt) => {
    const k = Math.min(1, dt * 7)
    smooth.px += (pointer.x - smooth.px) * k
    smooth.py += (pointer.y - smooth.py) * k

    // unproject the pointer onto the z=0 plane — true 3D cursor position
    rayDir.set(smooth.px, smooth.py, 0.5).unproject(camera).sub(camera.position).normalize()
    const t = -camera.position.z / rayDir.z
    pointerWorld.copy(camera.position).addScaledVector(rayDir, t)

    const pointerActive =
      !quality.reducedMotion && performance.now() - lastPointerMove < POINTER_IDLE_MS

    locomotion.update(time, dt, pointerWorld, pointerActive, mood.current.anchor, view)
    body.update(locomotion.curve, time, mood.current.serpentHue, mood.current.tint, mood.current.tintAmt)
    locomotion.headPosition(headPos)
    locomotion.headDirection(headDir)
    head.update(headPos, headDir, pointerWorld, time)
    orbs.update(time, headPos, mood.current.orb)

    // camera rig — pointer parallax, breathing drift, mood depth
    camera.position.x = smooth.px * 0.55 + Math.sin(time * 0.12) * 0.12
    camera.position.y = smooth.py * 0.4 + Math.cos(time * 0.1) * 0.1
    camera.position.z += (mood.current.camZ - camera.position.z) * Math.min(1, dt * 1.6)
    camera.lookAt(0, 0, 0)
  })
}
