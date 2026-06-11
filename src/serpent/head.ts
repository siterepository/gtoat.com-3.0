import {
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
    float diff = dot(n, normalize(vec3(0.4, 0.8, 0.65))) * 0.5 + 0.5;
    diff *= diff;
    float rim = pow(1.0 - facing, 2.4);
    vec3 base = mix(vec3(0.26, 0.10, 0.46), vec3(0.55, 0.22, 0.95), diff);
    vec3 col = base * 0.55;
    col += vec3(0.0, 0.94, 1.0) * rim * 0.8;
    col += vec3(1.0, 0.24, 0.56) * pow(rim, 3.0) * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * The serpent's head: emissive skull sphere + cartoon eyes whose pupils
 * track the pointer — the 2.x clown-eye easter egg, reincarnated.
 */
export class SerpentHead {
  group = new Group()
  private pupilL: Mesh
  private pupilR: Mesh
  private dir = new Vector3()

  constructor() {
    const skull = new Mesh(
      new SphereGeometry(0.55, 24, 18),
      new ShaderMaterial({ vertexShader: skullVert, fragmentShader: skullFrag }),
    )
    skull.scale.set(1, 0.82, 1.25)
    this.group.add(skull)

    const eyeGeo = new SphereGeometry(0.21, 16, 12)
    const eyeMat = new MeshBasicMaterial({ color: 0xffffff })
    const pupilGeo = new SphereGeometry(0.105, 12, 10)
    const pupilMat = new MeshBasicMaterial({ color: 0x04060d })

    const eyeL = new Mesh(eyeGeo, eyeMat)
    const eyeR = new Mesh(eyeGeo, eyeMat)
    eyeL.position.set(-0.26, 0.3, 0.34)
    eyeR.position.set(0.26, 0.3, 0.34)
    this.pupilL = new Mesh(pupilGeo, pupilMat)
    this.pupilR = new Mesh(pupilGeo, pupilMat)
    eyeL.add(this.pupilL)
    eyeR.add(this.pupilR)
    this.group.add(eyeL, eyeR)
  }

  update(headPos: Vector3, headDir: Vector3, pointer: { x: number; y: number }) {
    this.group.position.copy(headPos)
    // face travel direction
    this.dir.copy(headPos).add(headDir)
    this.group.lookAt(this.dir)

    // pupils chase the pointer (clamped to the sclera)
    const px = Math.max(-1, Math.min(1, pointer.x))
    const py = Math.max(-1, Math.min(1, pointer.y))
    const tx = px * 0.09
    const ty = py * 0.07
    this.pupilL.position.set(tx, ty, 0.13)
    this.pupilR.position.set(tx, ty, 0.13)
  }
}
