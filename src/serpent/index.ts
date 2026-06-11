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


export function createSerpent() {
  const locomotion = new Locomotion()
  const body = new SerpentBody(quality.tubeSegments)
  const head = new SerpentHead()
  const orbs = new Orbs(quality.orbCount)
  scene.add(body.mesh, head.group)

  const headPos = new Vector3()
  const headDir = new Vector3()
  const chaseWorld = new Vector3() // delayed — the head's quarry
  const gazeWorld = new Vector3() // instant — the eyes' lock
  const rayDir = new Vector3()
  const smooth = { px: 0, py: 0 }

  const unprojectToStage = (nx: number, ny: number, out: Vector3) => {
    rayDir.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize()
    const t = -camera.position.z / rayDir.z
    out.copy(camera.position).addScaledVector(rayDir, t)
  }

  let view = viewExtents()
  window.addEventListener('resize', () => {
    view = viewExtents()
    orbs.resize(view)
  })
  orbs.resize(view)

  // pointer engagement — the snake cares about the cursor as long as it's
  // on the page (still or not); it wanders only when the cursor leaves
  let pointerEngaged = false
  window.addEventListener('pointermove', () => {
    pointerEngaged = true
  })
  document.documentElement.addEventListener('mouseleave', () => {
    pointerEngaged = false
  })

  let eaten = 0
  orbs.onEat = () => {
    eaten++
    document.dispatchEvent(new CustomEvent('gtoat:eat', { detail: eaten }))
  }

  onFrame((time, dt) => {
    // the head hunts a DELAYED pointer — weight and intent in the pursuit
    const k = Math.min(1, dt * 2.6)
    smooth.px += (pointer.x - smooth.px) * k
    smooth.py += (pointer.y - smooth.py) * k
    unprojectToStage(smooth.px, smooth.py, chaseWorld)

    // the eyes lock the RAW pointer — zero lag, predator attention
    unprojectToStage(pointer.x, pointer.y, gazeWorld)

    // reduced motion: serpent holds its seeded pose; everything else static
    if (!quality.reducedMotion) {
      locomotion.update(time, dt, chaseWorld, pointerEngaged, mood.current.anchor, view)
    }
    body.update(locomotion.curve, time, mood.current.serpentHue, mood.current.tint, mood.current.tintAmt)
    locomotion.headPosition(headPos)
    locomotion.headDirection(headDir)
    head.update(headPos, headDir, gazeWorld, time)
    orbs.update(time, headPos, mood.current.orb)

    // camera rig — pointer parallax, breathing drift, mood depth
    camera.position.x = smooth.px * 0.55 + Math.sin(time * 0.12) * 0.12
    camera.position.y = smooth.py * 0.4 + Math.cos(time * 0.1) * 0.1
    camera.position.z += (mood.current.camZ - camera.position.z) * Math.min(1, dt * 1.6)
    camera.lookAt(0, 0, 0)
  })
}
