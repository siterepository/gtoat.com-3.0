import { Vector3 } from 'three'
import { camera, pointer, renderer, scene } from '../engine/stage'
import { gsap, onFrame } from '../engine/ticker'
import { quality } from '../engine/quality'
import { Locomotion } from './locomotion'
import { SerpentBody } from './body'
import { SerpentHead } from './head'
import { Orbs } from '../fx/orbs'
import { Burst } from '../fx/burst'
import { mood } from '../fx/moods'
import { warp } from '../fx/warp'
import { createInk } from '../fx/ink'
import { attachInk } from '../fx/nebula'
import { pickPoi } from '../sections/poi'
import { reactToExamine } from '../sections/examine'
import type { Poi } from '../sections/poi'

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
    // zero-size viewport (pre-layout boot) yields NaN — never feed it forward
    if (!Number.isFinite(out.x) || !Number.isFinite(out.y) || !Number.isFinite(out.z)) {
      out.set(0, 0, 0)
    }
  }

  // dev introspection
  ;(window as unknown as Record<string, unknown>).__GTOAT = {
    locomotion,
    body,
    head,
    camera,
    renderer,
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

  // bioluminescent ink — the serpent and the pointer both leave dye
  const inkHeadPos = new Vector3()
  const ink = createInk(() => locomotion.headPosition(inkHeadPos))
  if (ink) attachInk(() => ink.texture)

  let eaten = 0
  orbs.onEat = () => {
    eaten++
    head.reactEat()
    document.dispatchEvent(new CustomEvent('gtoat:eat', { detail: eaten }))
  }

  const EXPRESSION_BY_STATE = {
    chase: 'alert',
    rest: 'focused',
    play: 'playful',
    wander: 'neutral',
    curious: 'curious',
  } as const

  const prevGaze = new Vector3()
  const burst = new Burst()

  // cinematic hero entrance: camera starts deep, dollies in as the
  // preloader clears — the serpent swims up into the reveal
  let baseZ = mood.current.camZ
  let examineLean = 0
  const intro = { offset: quality.reducedMotion ? 0 : 9 }
  document.addEventListener(
    'gtoat:ready',
    () => {
      gsap.to(intro, { offset: 0, duration: 3.2, ease: 'power3.out' })
    },
    { once: true },
  )

  // ── curiosity wiring: the serpent picks real page elements to examine ──
  let currentPoi: Poi | null = null
  locomotion.onSeekPoi = () => {
    const poi = pickPoi()
    if (!poi) return null
    currentPoi = poi
    const out = new Vector3()
    unprojectToStage((poi.cx / window.innerWidth) * 2 - 1, -((poi.cy / window.innerHeight) * 2 - 1), out)
    return out
  }
  locomotion.onExamineStart = (point) => {
    head.setScanPoint(point)
    burst.fire(point, mood.current.tint)
    document.dispatchEvent(new CustomEvent('gtoat:examine'))
    if (currentPoi) reactToExamine(currentPoi)
    // examining ends when the state machine moves on
    setTimeout(() => head.setScanPoint(null), 3300)
  }

  // click ON the serpent → delighted burst (research find: feel-good feedback)
  window.addEventListener('pointerdown', (e) => {
    const p = new Vector3()
    unprojectToStage(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1),
      p,
    )
    locomotion.headPosition(headPos)
    if (p.distanceTo(headPos) < 1.5) {
      burst.fire(headPos, mood.current.orb)
      head.reactEat() // happy squint
    }
  })

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

    // pointer speed (world units/s) feeds pupil dilation
    const pointerSpeed = dt > 0 ? prevGaze.distanceTo(gazeWorld) / dt : 0
    prevGaze.copy(gazeWorld)

    head.setExpression(EXPRESSION_BY_STATE[locomotion.state])
    head.update(headPos, headDir, gazeWorld, time, dt, pointerSpeed, mood.current.tint)
    orbs.update(time, headPos, mood.current.orb, warp.value)

    // camera rig — pointer parallax, breathing drift, mood depth,
    // hero dolly-in, and a lean toward whatever the serpent is examining
    baseZ += (mood.current.camZ - baseZ) * Math.min(1, dt * 1.6)
    examineLean += ((locomotion.examining ? -1.5 : 0) - examineLean) * Math.min(1, dt * 1.4)
    camera.position.x = smooth.px * 0.55 + Math.sin(time * 0.12) * 0.12
    camera.position.y = smooth.py * 0.4 + Math.cos(time * 0.1) * 0.1
    camera.position.z = baseZ + intro.offset + examineLean
    camera.lookAt(0, 0, 0)
  })
}
