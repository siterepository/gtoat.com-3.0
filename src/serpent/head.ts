import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { SerpentEye } from './eye'

const skullVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const skullFrag = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    float facing = max(dot(n, v), 0.0);
    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.65));
    float diff = dot(n, lightDir) * 0.5 + 0.5;
    diff *= diff;
    float fill = max(dot(n, normalize(vec3(-0.3, -0.7, 0.4))), 0.0) * 0.18;
    vec3 h = normalize(lightDir + v);
    float spec = pow(max(dot(n, h), 0.0), 60.0);
    float rim = pow(1.0 - facing, 2.4);
    vec3 base = mix(vec3(0.26, 0.10, 0.46), vec3(0.55, 0.22, 0.95), diff);
    vec3 col = base * (0.55 + fill);
    col += vec3(1.0) * spec * 0.45;
    col += vec3(0.0, 0.94, 1.0) * rim * 0.8;
    col += vec3(1.0, 0.24, 0.56) * pow(rim, 3.0) * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`

export type Expression = 'alert' | 'focused' | 'playful' | 'neutral' | 'curious'

/**
 * Acting targets per expression: lid closure, pupil scale, brow angle
 * (radians; positive = inner edge raised → soft/curious, negative =
 * inner edge dropped → determined/predator), brow height offset.
 */
const EXPRESSIONS: Record<
  Expression,
  {
    lid: number
    pupil: number
    aspect: number // pupil shape: slit when calm, rounds out when excited
    brow: number
    browLift: number
    blinkMin: number // seconds between blinks — alert blinks often,
    blinkMax: number // a locked-on predator barely blinks
  }
> = {
  alert: { lid: 0.04, pupil: 1.3, aspect: 0.95, brow: -0.32, browLift: -0.02, blinkMin: 1.6, blinkMax: 3.2 },
  focused: { lid: 0.32, pupil: 0.82, aspect: 0.55, brow: -0.12, browLift: 0.0, blinkMin: 4.0, blinkMax: 7.0 },
  playful: { lid: 0.5, pupil: 1.1, aspect: 0.8, brow: 0.28, browLift: 0.05, blinkMin: 2.0, blinkMax: 4.5 },
  neutral: { lid: 0.14, pupil: 1.0, aspect: 0.65, brow: 0.06, browLift: 0.02, blinkMin: 2.5, blinkMax: 6.0 },
  curious: { lid: 0.08, pupil: 1.15, aspect: 0.85, brow: 0.34, browLift: 0.07, blinkMin: 1.8, blinkMax: 3.5 }, // leaning in, brows up
}

/**
 * The serpent's face, film-rig edition:
 * - painted-shader eyes (gaze/iris/pupil/lids composited in eye space —
 *   nothing can clip or drift)
 * - saccadic gaze with micro-fixations; pupils dilate for fast prey
 * - asymmetric blinks (fast down, slow up), blink-on-big-gaze-shift
 * - brow ridges that act: determined V when hunting, raised when playing
 * - iris color follows the section mood
 */
export class SerpentHead {
  group = new Group()
  private eyeL: SerpentEye
  private eyeR: SerpentEye
  private browL: Mesh
  private browR: Mesh
  private tongue = new Group()
  private lookTarget = new Vector3()
  private localTarget = new Vector3()
  private eyeDirL = new Vector3()
  private eyeDirR = new Vector3()
  private dir = new Vector3()

  private expression: Expression = 'neutral'
  private lid = 0.14
  private brow = 0.06
  private browLift = 0.02
  private blinkAt = 2.5
  private blinkPhase = -1
  private squintPulse = 0
  private lastGazeL = new Vector3(0, 0, 1)
  private crown = new Group()

  // examine mode: gaze scans across a specimen instead of the cursor
  private scanPoint: Vector3 | null = null
  private scanJitter = new Vector3()
  private scanNextAt = 0

  constructor() {
    const skull = new Mesh(
      new SphereGeometry(0.55, 28, 20),
      new ShaderMaterial({ vertexShader: skullVert, fragmentShader: skullFrag }),
    )
    skull.scale.set(0.95, 0.78, 1.42)
    this.group.add(skull)

    // eyes — bigger and higher: cartoon-snake appeal lives in eye scale
    this.eyeL = new SerpentEye(0.26)
    this.eyeR = new SerpentEye(0.26)
    this.eyeL.mesh.position.set(-0.28, 0.38, 0.4)
    this.eyeR.mesh.position.set(0.28, 0.38, 0.4)
    this.group.add(this.eyeL.mesh, this.eyeR.mesh)

    // brow ridges — soft boxes riding above the eyes; the cheapest, most
    // legible emotion channel a face has
    const browGeo = new BoxGeometry(0.3, 0.075, 0.14)
    const browMat = new MeshBasicMaterial({ color: 0x1d0a3c })
    this.browL = new Mesh(browGeo, browMat)
    this.browR = new Mesh(browGeo, browMat)
    this.browL.position.set(-0.28, 0.66, 0.42)
    this.browR.position.set(0.28, 0.66, 0.42)
    this.group.add(this.browL, this.browR)

    // the crown — GTOAT is royalty; it bobs, slips when hunting,
    // sits proud while playing
    const gold = new MeshBasicMaterial({ color: 0xf5b50b })
    const band = new Mesh(new BoxGeometry(0.42, 0.07, 0.34), gold)
    this.crown.add(band)
    for (let i = -1; i <= 1; i++) {
      const spike = new Mesh(new BoxGeometry(0.09, 0.16, 0.3), gold)
      spike.position.set(i * 0.15, 0.1, 0)
      spike.scale.y = i === 0 ? 1.3 : 1
      this.crown.add(spike)
    }
    const jewel = new Mesh(
      new SphereGeometry(0.045, 10, 8),
      new MeshBasicMaterial({ color: 0xff3d8e }),
    )
    jewel.position.set(0, 0.05, 0.18)
    this.crown.add(jewel)
    this.crown.position.set(0, 0.74, 0.05)
    this.crown.rotation.x = -0.12
    this.group.add(this.crown)

    const tongueMat = new MeshBasicMaterial({ color: 0xff3d8e })
    const stem = new Mesh(new BoxGeometry(0.05, 0.03, 0.5), tongueMat)
    stem.position.z = 0.25
    const forkL = new Mesh(new BoxGeometry(0.035, 0.025, 0.22), tongueMat)
    const forkR = new Mesh(new BoxGeometry(0.035, 0.025, 0.22), tongueMat)
    forkL.position.set(-0.05, 0, 0.56)
    forkL.rotation.y = 0.5
    forkR.position.set(0.05, 0, 0.56)
    forkR.rotation.y = -0.5
    this.tongue.add(stem, forkL, forkR)
    this.tongue.position.set(0, -0.12, 0.72)
    this.group.add(this.tongue)
  }

  setExpression(e: Expression) {
    this.expression = e
  }

  reactEat() {
    this.squintPulse = 1
  }

  /** Enter/exit examine mode — eyes scan across the specimen, not the cursor. */
  setScanPoint(p: Vector3 | null) {
    this.scanPoint = p ? this.scanPoint?.copy(p) ?? p.clone() : null
    this.scanNextAt = 0
  }

  update(
    headPos: Vector3,
    headDir: Vector3,
    pointerWorld: Vector3,
    time: number,
    dt: number,
    pointerSpeed: number,
    moodTint: Color,
  ) {
    this.group.position.copy(headPos)
    this.dir.copy(headPos).add(headDir)
    this.group.lookAt(this.dir)
    this.group.updateMatrixWorld()

    // ── gaze target: cursor — or the specimen being examined, scanned
    //    corner to corner like reading ──
    if (this.scanPoint) {
      if (time > this.scanNextAt) {
        this.scanNextAt = time + 0.35 + Math.random() * 0.45
        this.scanJitter.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.4, 0)
      }
      this.lookTarget.copy(this.scanPoint).add(this.scanJitter)
      this.lookTarget.z += 0.8
    } else {
      this.lookTarget.copy(pointerWorld)
      this.lookTarget.z += 1.6 // bias toward the viewer
    }
    this.localTarget.copy(this.lookTarget)
    this.group.worldToLocal(this.localTarget)
    this.eyeDirL.copy(this.localTarget).sub(this.eyeL.mesh.position).normalize()
    this.eyeDirR.copy(this.localTarget).sub(this.eyeR.mesh.position).normalize()

    // blink-on-big-gaze-shift: animators' rule — large refixation hides
    // the eye snap under a blink
    if (this.eyeDirL.angleTo(this.lastGazeL) > 0.55 && this.blinkPhase < 0) {
      this.blinkPhase = 0
    }
    this.lastGazeL.copy(this.eyeDirL)

    // ── expression acting ─────────────────────────────────────────────
    const t = EXPRESSIONS[this.expression]
    const k = Math.min(1, dt * 5)
    this.lid += (t.lid - this.lid) * k
    this.brow += (t.brow - this.brow) * k
    this.browLift += (t.browLift - this.browLift) * k

    this.squintPulse = Math.max(0, this.squintPulse - dt * 2.2)
    const squint = Math.sin(Math.min(this.squintPulse, 1) * Math.PI) * 0.45

    // film blink: ~70ms slam down, ~70ms held shut, ~110ms ease up,
    // occasional double blink (8%)
    let blink = 0
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt
      const p = this.blinkPhase
      if (p < 0.07) blink = p / 0.07
      else if (p < 0.14) blink = 1
      else if (p < 0.25) blink = 1 - (p - 0.14) / 0.11
      else {
        this.blinkPhase = -1
        blink = 0
        this.blinkAt =
          Math.random() < 0.08
            ? time + 0.3 // double blink
            : time + t.blinkMin + Math.random() * (t.blinkMax - t.blinkMin)
      }
      blink = blink * blink * (3 - 2 * blink) // smooth both ends
    } else if (time > this.blinkAt) {
      this.blinkPhase = 0
    }

    const closure = Math.min(1, this.lid + squint + blink)
    const pupilTarget = t.pupil + Math.min(pointerSpeed * 0.05, 0.3)
    // fast prey also rounds the slit out — excitement opens the aperture
    const aspectTarget = Math.min(1, t.aspect + Math.min(pointerSpeed * 0.02, 0.25))

    this.eyeL.update(time, dt, this.eyeDirL, pupilTarget, aspectTarget, closure, moodTint)
    this.eyeR.update(time, dt, this.eyeDirR, pupilTarget, aspectTarget, closure, moodTint)

    // brows: mirrored rotation (inner edge), lift, and they ride squints up
    this.browL.rotation.z = -this.brow
    this.browR.rotation.z = this.brow
    const browY = 0.66 + this.browLift - closure * 0.07
    this.browL.position.y = browY
    this.browR.position.y = browY

    // crown: bobs gently; slips forward when hunting, sits tall when smug
    const crownTilt =
      this.expression === 'alert' ? 0.18 : this.expression === 'playful' ? -0.22 : -0.12
    this.crown.rotation.x += (crownTilt - this.crown.rotation.x) * Math.min(1, dt * 4)
    this.crown.position.y = 0.74 + Math.sin(time * 1.7) * 0.025 + this.browLift * 0.6
    this.crown.rotation.z = Math.sin(time * 0.9) * 0.04

    // ── tongue flick ──────────────────────────────────────────────────
    const phase = time % 3.4
    const flick = Math.min(1, phase / 0.14) * (1 - Math.min(1, Math.max(0, (phase - 0.34) / 0.18)))
    const out = Math.max(0, flick) * (1 - blink)
    this.tongue.scale.set(1, 1, Math.max(0.001, out))
    this.tongue.rotation.z = Math.sin(time * 42) * 0.18 * out
  }
}
