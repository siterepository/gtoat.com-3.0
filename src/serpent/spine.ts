import { CatmullRomCurve3, Vector3 } from 'three'

const POINTS = 9

/**
 * The serpent's spine — a living CatmullRom curve in camera-facing space.
 * Index 0 = tail (top of journey), last = head. Scroll drives the body's
 * journey down the page; time drives the slither; the pointer tugs the head.
 */
export class Spine {
  curve: CatmullRomCurve3
  private pts: Vector3[] = []
  private headTarget = new Vector3()

  constructor() {
    for (let i = 0; i < POINTS; i++) this.pts.push(new Vector3())
    this.curve = new CatmullRomCurve3(this.pts, false, 'centripetal', 0.5)
  }

  /**
   * @param time seconds
   * @param scroll smoothed 0..1 page progress
   * @param pointer NDC pointer (-1..1)
   * @param view world-units half-extents of the viewport at z=0
   */
  update(time: number, scroll: number, pointer: { x: number; y: number }, view: { w: number; h: number }) {
    const t = time * 0.55
    // the serpent swims a slow figure through the page; scroll re-poses it
    const sweep = scroll * Math.PI * 2.2
    const ampX = view.w * (0.62 + 0.2 * Math.sin(sweep * 0.7))
    const ampY = view.h * 0.78
    const drop = (scroll - 0.5) * view.h * 0.55

    for (let i = 0; i < POINTS; i++) {
      const f = i / (POINTS - 1) // 0 tail → 1 head
      const phase = t + f * 4.6 + sweep
      const x = Math.sin(phase) * ampX * (0.35 + 0.65 * f)
      const y = (f - 0.5) * -2 * ampY * 0.5 + Math.cos(phase * 0.83 + 1.7) * view.h * 0.22 - drop
      const z = Math.sin(phase * 0.62 + f * 2.2) * 2.6 - 2.4 - 4.4 * (1 - f)
      this.pts[i].set(x, y, z)
    }

    // head seeks the pointer — slither.io steering, subtle
    const head = this.pts[POINTS - 1]
    this.headTarget.set(pointer.x * view.w * 0.8, pointer.y * view.h * 0.8, 0.6)
    head.lerp(this.headTarget, 0.22)

    // neck follows softly for continuity
    this.pts[POINTS - 2].lerp(
      new Vector3().copy(head).add(new Vector3(0, 0, -1.4)),
      0.1,
    )

    this.curve.updateArcLengths()
  }

  headPosition(out: Vector3): Vector3 {
    return out.copy(this.pts[POINTS - 1])
  }

  headDirection(out: Vector3): Vector3 {
    return out.copy(this.pts[POINTS - 1]).sub(this.pts[POINTS - 2]).normalize()
  }
}
