import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import { scene } from '../engine/stage'

const vert = /* glsl */ `
  attribute float aSeed;
  attribute float aScale;
  varying float vSeed;
  varying float vScale;
  uniform float uTime;
  void main() {
    vSeed = aSeed;
    vScale = aScale;
    vec3 p = position;
    p.x += sin(uTime * 0.5 + aSeed * 17.0) * 0.5;
    p.y += cos(uTime * 0.4 + aSeed * 31.0) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float tw = 0.75 + 0.25 * sin(uTime * (1.5 + aSeed) + aSeed * 40.0);
    gl_PointSize = (26.0 * aScale * tw) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  precision mediump float;
  varying float vSeed;
  varying float vScale;
  uniform vec3 uTint;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float glow = smoothstep(0.5, 0.0, d);
    glow = pow(glow, 2.2);
    vec3 a = vec3(0.70, 0.30, 1.00);
    vec3 b = vec3(0.00, 0.94, 1.00);
    vec3 c3 = vec3(1.00, 0.24, 0.56);
    vec3 col = vSeed < 0.33 ? a : (vSeed < 0.66 ? b : c3);
    col = mix(col, uTint, 0.55); // section mood owns the field
    gl_FragColor = vec4(col * glow * 1.6 * vScale, glow * vScale);
  }
`

/** Food-orb field. The serpent's head "eats" orbs it passes — they pop and respawn. */
export class Orbs {
  points: Points
  private positions: Float32Array
  private scales: Float32Array
  private scaleAttr: BufferAttribute
  private count: number
  private bounds = { w: 9, h: 7, d: 5 }
  private tmp = new Vector3()
  /** fired when the head eats an orb — UI can listen for feeding stats */
  onEat?: () => void

  constructor(count: number) {
    this.count = count
    this.positions = new Float32Array(count * 3)
    this.scales = new Float32Array(count)
    const seeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      this.respawn(i)
      seeds[i] = Math.random()
      this.scales[i] = 0.4 + Math.random() * 0.8
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(this.positions, 3))
    this.scaleAttr = new BufferAttribute(this.scales, 1)
    this.scaleAttr.setUsage(35048)
    geo.setAttribute('aScale', this.scaleAttr)
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))

    const mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uTime: { value: 0 }, uTint: { value: new Color(0xbfd4ff) } },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    this.points = new Points(geo, mat)
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  private respawn(i: number) {
    this.positions[i * 3] = (Math.random() * 2 - 1) * this.bounds.w
    this.positions[i * 3 + 1] = (Math.random() * 2 - 1) * this.bounds.h
    this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * this.bounds.d - 2
  }

  resize(view: { w: number; h: number }) {
    this.bounds.w = view.w * 1.05
    this.bounds.h = view.h * 1.1
  }

  update(time: number, headPos: Vector3, tint: Color) {
    const u = (this.points.material as ShaderMaterial).uniforms
    u.uTime.value = time
    u.uTint.value.copy(tint)

    let dirty = false
    for (let i = 0; i < this.count; i++) {
      const s = this.scales[i]
      if (s < 1.2) {
        // regrow eaten orbs
        if (s < 0.4) {
          this.scales[i] = Math.min(1.2, s + 0.008)
          dirty = true
        }
        this.tmp.set(this.positions[i * 3], this.positions[i * 3 + 1], this.positions[i * 3 + 2])
        if (this.tmp.distanceToSquared(headPos) < 1.1) {
          this.scales[i] = 0.001
          this.respawn(i)
          ;(this.points.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
          dirty = true
          this.onEat?.()
        }
      }
    }
    if (dirty) this.scaleAttr.needsUpdate = true
  }
}
