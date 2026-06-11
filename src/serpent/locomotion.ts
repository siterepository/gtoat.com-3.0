import { CatmullRomCurve3, Vector3 } from 'three'

const CTRL = 16 // control points fed to the curve (tail → head)
const BODY_LENGTH = 13 // world units of serpent
const TRAIL_CAP = 900
const MIN_STEP = 0.045

/**
 * Real slither locomotion: the head is a steered agent seeking the pointer
 * (or an idle wander anchor), and the body follows the exact path the head
 * swam — resampled at fixed arc spacing from a trail history. This is what
 * makes it read as an animal instead of a parametric wave.
 */
export class Locomotion {
  curve: CatmullRomCurve3
  head = new Vector3(-14, 6, -2)
  velocity = new Vector3(2, -0.4, 0)

  private pts: Vector3[] = []
  private trail: Vector3[] = [] // oldest → newest
  private target = new Vector3()
  private desired = new Vector3()
  private steer = new Vector3()
  private perp = new Vector3()
  private travel = 0 // accumulated arc distance — undulation is per-meter, not per-second

  constructor() {
    for (let i = 0; i < CTRL; i++) this.pts.push(new Vector3())
    this.curve = new CatmullRomCurve3(this.pts, false, 'centripetal', 0.5)
    // seed the trail so the body exists on first frame
    for (let i = 0; i < 80; i++) {
      this.trail.push(new Vector3(this.head.x - (80 - i) * 0.25, this.head.y + Math.sin(i * 0.2) * 0.8, this.head.z))
    }
  }

  /**
   * @param pointerWorld pointer projected onto the z≈0 plane
   * @param pointerActive pointer moved recently — chase it
   * @param anchor section mood anchor for idle wandering
   */
  update(
    time: number,
    dt: number,
    pointerWorld: Vector3,
    pointerActive: boolean,
    anchor: Vector3,
    view: { w: number; h: number },
  ) {
    const clampedDt = Math.min(dt, 1 / 30)

    // pick target: chase pointer, else wander around the section anchor
    if (pointerActive) {
      this.target.copy(pointerWorld)
    } else {
      this.target.set(
        anchor.x + Math.sin(time * 0.31) * view.w * 0.2 + Math.sin(time * 0.13 + 2.1) * view.w * 0.12,
        anchor.y + Math.cos(time * 0.23 + 1.2) * view.h * 0.3,
        anchor.z + Math.sin(time * 0.4) * 1.4,
      )
    }
    // keep it on stage
    this.target.x = Math.max(-view.w * 1.05, Math.min(view.w * 1.05, this.target.x))
    this.target.y = Math.max(-view.h * 1.05, Math.min(view.h * 1.05, this.target.y))

    // seek steering — fast when far, eases off near the target so the head
    // glides past instead of jittering on top of the cursor
    this.desired.copy(this.target).sub(this.head)
    const dist = this.desired.length()
    const maxSpeed = pointerActive ? 8.5 : 3.2
    const speedScale = Math.min(1, dist / 3.2)
    this.desired.normalize().multiplyScalar(maxSpeed * (0.25 + 0.75 * speedScale))

    // softer steering + drag — the head carries weight; it commits to turns
    // instead of twitching after the cursor
    this.steer.copy(this.desired).sub(this.velocity).multiplyScalar(pointerActive ? 2.3 : 1.4)
    this.velocity.addScaledVector(this.steer, clampedDt)
    this.velocity.multiplyScalar(Math.max(0, 1 - 0.35 * clampedDt))
    if (this.velocity.length() > maxSpeed) this.velocity.normalize().multiplyScalar(maxSpeed)

    // serpentine undulation — phased by distance traveled so the wave
    // crawls along the ground path like a real snake, breathing slowly
    // even at rest
    const speed = this.velocity.length()
    this.travel += speed * clampedDt
    this.perp.set(-this.velocity.y, this.velocity.x, 0).normalize()
    const wiggle =
      Math.sin(this.travel * 1.7 + time * 0.9) * Math.min(0.35 + speed * 0.3, 2.0)

    this.head.addScaledVector(this.velocity, clampedDt)
    this.head.addScaledVector(this.perp, wiggle * clampedDt)
    this.head.z += (Math.sin(time * 0.45) * 1.1 - 1.2 - this.head.z) * clampedDt * 0.8

    // record trail
    const last = this.trail[this.trail.length - 1]
    if (last.distanceToSquared(this.head) > MIN_STEP * MIN_STEP) {
      this.trail.push(this.head.clone())
      if (this.trail.length > TRAIL_CAP) this.trail.splice(0, this.trail.length - TRAIL_CAP)
    }

    // resample the trail at fixed arc spacing behind the head → control points
    const spacing = BODY_LENGTH / (CTRL - 1)
    let need = 0 // distance behind head for the current control point
    let acc = 0
    let ci = CTRL - 1
    this.pts[ci--].copy(this.head)
    need = spacing

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
    // trail shorter than body (early frames): extend straight back
    while (ci >= 0) {
      const ref = this.pts[ci + 1]
      this.pts[ci].set(ref.x - spacing, ref.y, ref.z)
      ci--
    }

    this.curve.updateArcLengths()
  }

  headPosition(out: Vector3): Vector3 {
    return out.copy(this.head)
  }

  headDirection(out: Vector3): Vector3 {
    out.copy(this.velocity)
    return out.lengthSq() > 1e-6 ? out.normalize() : out.set(1, 0, 0)
  }
}
