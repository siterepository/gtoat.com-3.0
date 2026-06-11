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
    vec3 h = normalize(lightDir + v);
    float spec = pow(max(dot(n, h), 0.0), 60.0);
    float rim = pow(1.0 - facing, 2.4);
    vec3 base = mix(vec3(0.26, 0.10, 0.46), vec3(0.55, 0.22, 0.95), diff);
    vec3 col = base * 0.55;
    col += vec3(1.0) * spec * 0.45;
    col += vec3(0.0, 0.94, 1.0) * rim * 0.8;
    col += vec3(1.0, 0.24, 0.56) * pow(rim, 3.0) * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * The serpent's head: shader skull, forked flicking tongue, and eyes that
 * ALWAYS look at the pointer — real eyeball rotation toward the cursor's
 * world position, not a 2D pupil offset.
 */
export class SerpentHead {
  group = new Group()
  private eyeL = new Group()
  private eyeR = new Group()
  private tongue = new Group()
  private lookTarget = new Vector3()
  private dir = new Vector3()

  constructor() {
    const skull = new Mesh(
      new SphereGeometry(0.55, 28, 20),
      new ShaderMaterial({ vertexShader: skullVert, fragmentShader: skullFrag }),
    )
    skull.scale.set(0.95, 0.78, 1.42) // snouted, not a ball
    this.group.add(skull)

    // eyes — eyeball group rotates to face the cursor; pupil rides its +z pole
    const scleraGeo = new SphereGeometry(0.22, 18, 14)
    const scleraMat = new MeshBasicMaterial({ color: 0xffffff })
    const pupilGeo = new SphereGeometry(0.115, 14, 10)
    const pupilMat = new MeshBasicMaterial({ color: 0x04060d })
    const glintGeo = new SphereGeometry(0.035, 8, 6)
    const glintMat = new MeshBasicMaterial({ color: 0xffffff })

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
    }

    // forked tongue — flicks out of the snout every few seconds
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

  update(headPos: Vector3, headDir: Vector3, pointerWorld: Vector3, time: number) {
    this.group.position.copy(headPos)
    // face travel direction
    this.dir.copy(headPos).add(headDir)
    this.group.lookAt(this.dir)

    // eyes lock onto the cursor's world position — always
    this.lookTarget.copy(pointerWorld)
    this.lookTarget.z += 2 // bias toward the viewer so pupils stay visible
    this.eyeL.lookAt(this.lookTarget)
    this.eyeR.lookAt(this.lookTarget)

    // tongue flick: sharp out-in burst on a ~3.4s cycle, with a tremble
    const phase = time % 3.4
    const flick = Math.min(1, phase / 0.14) * (1 - Math.min(1, Math.max(0, (phase - 0.34) / 0.18)))
    const out = Math.max(0, flick)
    this.tongue.scale.set(1, 1, Math.max(0.001, out))
    this.tongue.rotation.z = Math.sin(time * 42) * 0.18 * out
  }
}
