import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'

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
    // soft fill bounced from below — kills the flat-toy look
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

export type Expression = 'alert' | 'focused' | 'playful' | 'neutral'

/** Target lid closure + pupil scale per expression. */
const EXPRESSIONS: Record<Expression, { lid: number; pupil: number }> = {
  alert: { lid: 0.02, pupil: 1.25 }, // chasing — eyes wide, pupils blown
  focused: { lid: 0.3, pupil: 0.85 }, // resting, watching — relaxed, narrowed
  playful: { lid: 0.45, pupil: 1.05 }, // idle play — happy squint
  neutral: { lid: 0.12, pupil: 1.0 }, // wandering
}

/**
 * The serpent's face. Eyes never stop caring about the cursor — eyeballs
 * rotate to the raw pointer every frame. Personality lives in the lids:
 * expression states, random blinks, a happy squint when it eats, pupils
 * that dilate when the prey (cursor) moves fast.
 */
export class SerpentHead {
  group = new Group()
  private eyeL = new Group()
  private eyeR = new Group()
  private lids: Mesh[] = []
  private pupils: Mesh[] = []
  private tongue = new Group()
  private lookTarget = new Vector3()
  private dir = new Vector3()

  // expression machinery
  private expression: Expression = 'neutral'
  private lid = 0.12 // current closure 0 open → 1 shut
  private pupil = 1
  private blinkAt = 2.5 // next blink time
  private blinkPhase = -1 // <0 idle, 0..1 mid-blink
  private squintPulse = 0 // eat reaction decay

  constructor() {
    const skull = new Mesh(
      new SphereGeometry(0.55, 28, 20),
      new ShaderMaterial({ vertexShader: skullVert, fragmentShader: skullFrag }),
    )
    skull.scale.set(0.95, 0.78, 1.42)
    this.group.add(skull)

    const scleraGeo = new SphereGeometry(0.22, 18, 14)
    const scleraMat = new MeshBasicMaterial({ color: 0xffffff })
    const pupilGeo = new SphereGeometry(0.115, 14, 10)
    const pupilMat = new MeshBasicMaterial({ color: 0x04060d })
    const glintGeo = new SphereGeometry(0.035, 8, 6)
    const glintMat = new MeshBasicMaterial({ color: 0xffffff })
    // eyelid: dome shell over the eye, rotates down over the front
    const lidGeo = new SphereGeometry(0.245, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)
    const lidMat = new MeshBasicMaterial({ color: 0x2a1052 })

    for (const [eye, x] of [
      [this.eyeL, -0.27],
      [this.eyeR, 0.27],
    ] as const) {
      const sclera = new Mesh(scleraGeo, scleraMat)
      const pupil = new Mesh(pupilGeo, pupilMat)
      pupil.position.z = 0.15
      const glint = new Mesh(glintGeo, glintMat)
      glint.position.set(0.05, 0.06, 0.21)
      eye.add(sclera, pupil, glint)
      eye.position.set(x, 0.34, 0.42)
      this.group.add(eye)
      this.pupils.push(pupil)

      // lid is parented to the HEAD (not the eyeball) so the eye can look
      // around underneath a half-closed lid
      const lid = new Mesh(lidGeo, lidMat)
      lid.position.copy(eye.position)
      this.group.add(lid)
      this.lids.push(lid)
    }

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

  /** Happy squint when an orb goes down. */
  reactEat() {
    this.squintPulse = 1
  }

  update(
    headPos: Vector3,
    headDir: Vector3,
    pointerWorld: Vector3,
    time: number,
    dt: number,
    pointerSpeed: number,
  ) {
    this.group.position.copy(headPos)
    this.dir.copy(headPos).add(headDir)
    this.group.lookAt(this.dir)

    // ── gaze: raw pointer, zero lag, always interested ────────────────
    this.lookTarget.copy(pointerWorld)
    this.lookTarget.z += 2
    this.eyeL.lookAt(this.lookTarget)
    this.eyeR.lookAt(this.lookTarget)

    // ── expression → lids + pupils ────────────────────────────────────
    const targetSet = EXPRESSIONS[this.expression]
    // fast prey dilates pupils on top of the expression baseline
    const dilate = Math.min(pointerSpeed * 0.05, 0.3)
    const k = Math.min(1, dt * 6)
    this.lid += (targetSet.lid - this.lid) * k
    this.pupil += (targetSet.pupil + dilate - this.pupil) * k

    // eat reaction: quick joyful squint, decays out
    this.squintPulse = Math.max(0, this.squintPulse - dt * 2.4)
    const squint = Math.sin(Math.min(this.squintPulse, 1) * Math.PI) * 0.5

    // blink scheduler
    let blink = 0
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt / 0.22 // full blink ≈ 220ms
      blink = Math.sin(Math.min(this.blinkPhase, 1) * Math.PI)
      if (this.blinkPhase >= 1) {
        this.blinkPhase = -1
        this.blinkAt = time + 2 + Math.random() * 4
      }
    } else if (time > this.blinkAt) {
      this.blinkPhase = 0
    }

    const closure = Math.min(1, this.lid + squint + blink)
    for (const lid of this.lids) {
      // rotate the dome down over the eye's front; resting tilt keeps the
      // shell tucked behind the brow when fully open
      lid.rotation.x = -Math.PI * 0.62 + closure * Math.PI * 0.55
    }
    for (const p of this.pupils) {
      p.scale.setScalar(this.pupil)
    }

    // ── tongue flick (skipped while mid-blink — snakes multitask poorly) ──
    const phase = time % 3.4
    const flick = Math.min(1, phase / 0.14) * (1 - Math.min(1, Math.max(0, (phase - 0.34) / 0.18)))
    const out = Math.max(0, flick) * (1 - blink)
    this.tongue.scale.set(1, 1, Math.max(0.001, out))
    this.tongue.rotation.z = Math.sin(time * 42) * 0.18 * out
  }
}
