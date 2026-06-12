import { CatmullRomCurve3, Vector3 } from 'three'

const CTRL = 16 // control points fed to the curve (tail → head)
const BODY_LENGTH = 13 // world units of serpent
const TRAIL_CAP = 900
const MIN_STEP = 0.045

type State = 'chase' | 'rest' | 'play' | 'wander' | 'curious'

/**
 * Natural slither locomotion, heading-based:
 *
 * The head is not a particle chasing a point — it has a HEADING and a SPEED.
 * It turns in arcs (turn rate capped, wider at speed), accelerates and
 * brakes smoothly, and the body follows the exact path the head swam.
 *
 * Behavior states:
 *  - chase   cursor moving → pursue (with the intentional head delay)
 *  - rest    cursor still + arrived → settle beneath it, hold focus, breathe
 *  - play    after ~7s of rest → lazy orbit around the rest point, then settle
 *  - wander  cursor gone → drift around the section anchor
 */
export class Locomotion {
  curve: CatmullRomCurve3
  head = new Vector3(-14, 6, -2)
  velocity = new Vector3(2, -0.4, 0) // derived from heading+speed; read by head orientation
  state: State = 'wander'

  private heading = -0.2
  private speed = 2
  private travel = 0 // accumulated arc distance — undulation is per-meter

  private restPoint = new Vector3()
  private restTimer = 0
  private restDelay = 7
  private playTimer = 0

  // curiosity — the serpent notices things on the page
  private curiousPoint = new Vector3()
  private curiousTimer = 0
  private boredom = 0 // builds while wandering/resting; curiosity strikes when full
  private boredomTrigger = 9
  /** host asks for a target when the serpent gets curious; null = nothing interesting */
  onSeekPoi?: () => Vector3 | null
  /** fired once when the serpent reaches its specimen and starts examining */
  onExamineStart?: (point: Vector3) => void
  private examined = false

  /** true while leaning over a specimen — camera leans in with it */
  get examining(): boolean {
    return this.state === 'curious' && this.examined
  }

  private lastTarget = new Vector3()
  private stillTime = 99

  private pts: Vector3[] = []
  private trail: Vector3[] = [] // oldest → newest
  private target = new Vector3()
  private perp = new Vector3()

  constructor() {
    for (let i = 0; i < CTRL; i++) this.pts.push(new Vector3())
    this.curve = new CatmullRomCurve3(this.pts, false, 'centripetal', 0.5)
    for (let i = 0; i < 80; i++) {
      this.trail.push(new Vector3(this.head.x - (80 - i) * 0.25, this.head.y + Math.sin(i * 0.2) * 0.8, this.head.z))
    }
  }

  update(
    time: number,
    dt: number,
    pointerWorld: Vector3,
    pointerEngaged: boolean,
    anchor: Vector3,
    view: { w: number; h: number },
  ) {
    const clampedDt = Math.min(dt, 1 / 30)

    // ── cursor stillness ──────────────────────────────────────────────
    const targetMoved = this.lastTarget.distanceTo(pointerWorld) > 0.12
    this.lastTarget.copy(pointerWorld)
    this.stillTime = targetMoved ? 0 : this.stillTime + clampedDt

    const dx = pointerWorld.x - this.head.x
    const dy = pointerWorld.y - this.head.y
    const cursorDist = Math.hypot(dx, dy)

    // ── boredom → curiosity ───────────────────────────────────────────
    // idle time builds an itch; when it pops, the serpent goes to examine
    // something real on the page
    if (this.state === 'wander' || this.state === 'rest') {
      this.boredom += clampedDt
    }
    if (
      this.boredom > this.boredomTrigger &&
      this.state !== 'curious' &&
      this.stillTime > 0.5 // not while the cursor is being driven
    ) {
      const poi = this.onSeekPoi?.()
      if (poi) {
        this.state = 'curious'
        this.curiousPoint.copy(poi)
        this.curiousTimer = 0
        this.examined = false
      }
      this.boredom = 0
      this.boredomTrigger = 8 + Math.random() * 8
    }

    // ── state transitions ─────────────────────────────────────────────
    if (this.state === 'curious') {
      // interruptible by a living cursor; otherwise: approach → dwell → done
      if (pointerEngaged && this.stillTime < 0.3) {
        this.state = 'chase'
      } else {
        this.curiousTimer += clampedDt
        const d = Math.hypot(
          this.curiousPoint.x - this.head.x,
          this.curiousPoint.y - this.head.y,
        )
        if (!this.examined && d < 1.6) {
          this.examined = true
          this.curiousTimer = 0
          this.onExamineStart?.(this.curiousPoint)
        }
        const dwellOver = this.examined && this.curiousTimer > 3.2
        const gaveUp = !this.examined && this.curiousTimer > 7
        if (dwellOver || gaveUp) {
          this.state = pointerEngaged ? 'rest' : 'wander'
          this.restTimer = 0
        }
      }
    } else if (!pointerEngaged) {
      this.state = 'wander'
    } else if (this.stillTime < 0.3) {
      this.state = 'chase' // cursor is alive — everything else yields
    } else if (this.state === 'chase' || this.state === 'wander') {
      if (cursorDist < 2.2) {
        this.state = 'rest'
        this.restPoint.set(pointerWorld.x, pointerWorld.y - 1.15, -0.8)
        this.restTimer = 0
        this.restDelay = 6 + Math.random() * 3 // the 5–10s idle window
      }
    } else if (this.state === 'rest') {
      this.restTimer += clampedDt
      if (this.restTimer > this.restDelay) {
        this.state = 'play'
        this.playTimer = 0
      }
    } else if (this.state === 'play') {
      this.playTimer += clampedDt
      if (this.playTimer > 6.8) {
        this.state = 'rest'
        this.restTimer = 0
        this.restDelay = 6 + Math.random() * 3
      }
    }

    // ── target + desired speed per state ──────────────────────────────
    let desiredSpeed = 0
    switch (this.state) {
      case 'curious': {
        if (this.examined) {
          // leaning over the specimen — slow sway around it, nose down
          this.target.set(
            this.curiousPoint.x + Math.sin(time * 0.9) * 0.5,
            this.curiousPoint.y + 0.9 + Math.cos(time * 0.7) * 0.25,
            this.curiousPoint.z,
          )
          desiredSpeed = 0.5
        } else {
          this.target.copy(this.curiousPoint)
          const d = Math.hypot(this.target.x - this.head.x, this.target.y - this.head.y)
          desiredSpeed = Math.min(3.8, d * 1.6) // eager but braking — arrive, don't strike
        }
        break
      }
      case 'chase': {
        this.target.copy(pointerWorld)
        // arrive: brake with distance — no orbiting the cursor
        desiredSpeed = Math.min(8.5, cursorDist * 1.9)
        break
      }
      case 'rest': {
        // hold position under the cursor; drift with its micro-movements
        this.restPoint.x += (pointerWorld.x - this.restPoint.x) * clampedDt * 0.6
        this.restPoint.y += (pointerWorld.y - 1.15 - this.restPoint.y) * clampedDt * 0.6
        this.target.copy(this.restPoint)
        const d = Math.hypot(this.target.x - this.head.x, this.target.y - this.head.y)
        desiredSpeed = d > 0.5 ? Math.min(1.4, d * 1.4) : 0 // settle, then be still
        break
      }
      case 'play': {
        // lazy figure-circle around the rest point — stretch, loop, return
        const a = this.playTimer * 0.95
        const r = 2.6 * (0.75 + 0.25 * Math.sin(this.playTimer * 1.9))
        this.target.set(
          this.restPoint.x + Math.cos(a) * r,
          this.restPoint.y + Math.sin(a * 1.35) * r * 0.7,
          this.restPoint.z,
        )
        desiredSpeed = 2.6
        break
      }
      case 'wander': {
        this.target.set(
          anchor.x + Math.sin(time * 0.31) * view.w * 0.2 + Math.sin(time * 0.13 + 2.1) * view.w * 0.12,
          anchor.y + Math.cos(time * 0.23 + 1.2) * view.h * 0.3,
          anchor.z,
        )
        desiredSpeed = 2.8
        break
      }
    }
    this.target.x = Math.max(-view.w * 1.05, Math.min(view.w * 1.05, this.target.x))
    this.target.y = Math.max(-view.h * 1.05, Math.min(view.h * 1.05, this.target.y))

    // ── heading: turn in arcs, never pivot ────────────────────────────
    const tx = this.target.x - this.head.x
    const ty = this.target.y - this.head.y
    const targetDist = Math.hypot(tx, ty)

    // when settled and focused, don't keep re-aiming at noise
    const focused = this.state === 'rest' && targetDist < 0.6
    if (!focused && targetDist > 0.05) {
      const desiredHeading = Math.atan2(ty, tx)
      let dh = desiredHeading - this.heading
      while (dh > Math.PI) dh -= Math.PI * 2
      while (dh < -Math.PI) dh += Math.PI * 2
      const maxTurn = 1.3 + this.speed * 0.42 // rad/s — wider arcs at speed
      const turn = Math.max(-maxTurn, Math.min(maxTurn, dh * 3.0))
      this.heading += turn * clampedDt
    }

    // ── speed: smooth throttle ────────────────────────────────────────
    this.speed += (desiredSpeed - this.speed) * Math.min(1, clampedDt * 2.2)
    if (this.speed < 0.02) this.speed = 0

    // ── integrate ─────────────────────────────────────────────────────
    // thrust pulses with the undulation — snakes push in strokes, not
    // like motors
    const surge = 1 + 0.09 * Math.sin(this.travel * 1.7 + time * 0.8 - 0.7)
    const hx = Math.cos(this.heading)
    const hy = Math.sin(this.heading)
    this.velocity.set(hx * this.speed * surge, hy * this.speed * surge, 0)
    this.travel += this.speed * clampedDt

    // undulation rides the path; at rest it fades to a faint breathe
    this.perp.set(-hy, hx, 0)
    const wiggleAmp =
      this.speed > 0.05 ? Math.min(0.3 + this.speed * 0.3, 1.9) : 0.07
    const wiggle = Math.sin(this.travel * 1.7 + time * 0.8) * wiggleAmp

    this.head.x += this.velocity.x * clampedDt + this.perp.x * wiggle * clampedDt
    this.head.y += this.velocity.y * clampedDt + this.perp.y * wiggle * clampedDt
    this.head.z += (Math.sin(time * 0.45) * 1.1 - 1.2 - this.head.z) * clampedDt * 0.8

    // ── record trail + resample body ──────────────────────────────────
    const last = this.trail[this.trail.length - 1]
    if (last.distanceToSquared(this.head) > MIN_STEP * MIN_STEP) {
      this.trail.push(this.head.clone())
      if (this.trail.length > TRAIL_CAP) this.trail.splice(0, this.trail.length - TRAIL_CAP)
    }

    const spacing = BODY_LENGTH / (CTRL - 1)
    let need = spacing
    let acc = 0
    let ci = CTRL - 1
    this.pts[ci--].copy(this.head)

    for (let i = this.trail.length - 1; i > 0 && ci >= 0; i--) {
      const a = this.trail[i]
      const b = this.trail[i - 1]
      const seg = a.distanceTo(b)
      while (acc + seg >= need && ci >= 0) {
        const f = (need - acc) / seg
        this.pts[ci--].copy(a).lerp(b, f)
        need += spacing
      }
      acc += seg
    }
    while (ci >= 0) {
      const ref = this.pts[ci + 1]
      this.pts[ci].set(ref.x - spacing, ref.y, ref.z)
      ci--
    }

    // NOTE: no updateArcLengths() — control points are already arc-evenly
    // resampled, so the body samples the curve in parameter space (getPoint)
    // and skips the O(n) arc table rebuild every frame.
  }

  headPosition(out: Vector3): Vector3 {
    return out.copy(this.head)
  }

  headDirection(out: Vector3): Vector3 {
    // heading survives zero speed — a resting snake still faces somewhere
    return out.set(Math.cos(this.heading), Math.sin(this.heading), 0)
  }
}
