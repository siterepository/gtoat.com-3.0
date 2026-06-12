import {
  BufferGeometry,
  Camera,
  Color,
  Float32BufferAttribute,
  HalfFloatType,
  LinearFilter,
  Mesh,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import { camera, renderer } from '../engine/stage'
import { onFrame } from '../engine/ticker'
import { quality } from '../engine/quality'
import { mood } from './moods'

/**
 * The ink field — a lightweight GPU fluid (single advection+decay pass,
 * ping-ponged at half resolution, HalfFloat) fed by two emitters: the
 * pointer and the serpent's head. Glowing dye smears and curls through
 * the nebula like bioluminescence in dark water. Production-style
 * constants: dye decay 0.972, curl-noise advection, soft round splats.
 * High tier only.
 */

const updateVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const updateFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform float uTime;
  uniform float uDt;
  uniform vec2 uSplatA;   // pointer (uv)
  uniform vec2 uSplatB;   // serpent head (uv)
  uniform float uStrA;
  uniform float uStrB;
  uniform vec3 uColor;
  uniform vec2 uAspect;   // (aspect, 1) so splats stay round

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    // curl of a drifting noise field → divergence-free-ish swirl
    float e = 0.02;
    vec2 p = vUv * 5.0 + uTime * 0.05;
    float n1 = noise(p + vec2(0.0, e));
    float n2 = noise(p - vec2(0.0, e));
    float n3 = noise(p + vec2(e, 0.0));
    float n4 = noise(p - vec2(e, 0.0));
    vec2 curl = vec2(n1 - n2, n4 - n3) / (2.0 * e);

    // advect the dye along the swirl with a slow rise, then decay
    vec2 adv = vUv - curl * uDt * 0.045 - vec2(0.0, uDt * 0.012);
    vec3 dye = texture2D(uPrev, adv).rgb * 0.972;

    // emitters — soft gaussian splats
    float dA = length((vUv - uSplatA) * uAspect);
    float dB = length((vUv - uSplatB) * uAspect);
    dye += uColor * exp(-dA * dA * 900.0) * uStrA;
    dye += uColor * exp(-dB * dB * 700.0) * uStrB;

    gl_FragColor = vec4(min(dye, vec3(1.4)), 1.0);
  }
`

export class Ink {
  texture: Texture
  private rtA: WebGLRenderTarget
  private rtB: WebGLRenderTarget
  private mat: ShaderMaterial
  private fsScene = new Scene()
  private fsCam = new Camera()
  private prevPointer = new Vector2(0.5, 0.5)
  private headNdc = new Vector3()

  constructor() {
    const w = Math.max(2, Math.floor(window.innerWidth / 2))
    const h = Math.max(2, Math.floor(window.innerHeight / 2))
    const opts = {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    }
    this.rtA = new WebGLRenderTarget(w, h, opts)
    this.rtB = new WebGLRenderTarget(w, h, opts)
    this.texture = this.rtB.texture

    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
    geo.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2))

    this.mat = new ShaderMaterial({
      vertexShader: updateVert,
      fragmentShader: updateFrag,
      uniforms: {
        uPrev: { value: this.rtA.texture },
        uTime: { value: 0 },
        uDt: { value: 0.016 },
        uSplatA: { value: new Vector2(0.5, 0.5) },
        uSplatB: { value: new Vector2(0.5, 0.5) },
        uStrA: { value: 0 },
        uStrB: { value: 0 },
        uColor: { value: new Color(0x22d3ee) },
        uAspect: { value: new Vector2(w / h, 1) },
      },
      depthWrite: false,
      depthTest: false,
    })
    const tri = new Mesh(geo, this.mat)
    tri.frustumCulled = false
    this.fsScene.add(tri)

    window.addEventListener('resize', () => {
      const nw = Math.max(2, Math.floor(window.innerWidth / 2))
      const nh = Math.max(2, Math.floor(window.innerHeight / 2))
      this.rtA.setSize(nw, nh)
      this.rtB.setSize(nw, nh)
      ;(this.mat.uniforms.uAspect.value as Vector2).set(nw / nh, 1)
    })
  }

  /** One sim step + ping-pong. Call before the main render. */
  step(time: number, dt: number, pointerUv: Vector2, headWorld: Vector3) {
    const u = this.mat.uniforms
    u.uTime.value = time
    u.uDt.value = Math.min(dt, 1 / 30)

    // pointer splat strength rides its speed — still cursor stops emitting
    const speed = this.prevPointer.distanceTo(pointerUv)
    this.prevPointer.copy(pointerUv)
    ;(u.uSplatA.value as Vector2).copy(pointerUv)
    u.uStrA.value = Math.min(speed * 14, 0.5)

    // serpent head splat — project world → uv
    this.headNdc.copy(headWorld).project(camera)
    ;(u.uSplatB.value as Vector2).set(this.headNdc.x * 0.5 + 0.5, this.headNdc.y * 0.5 + 0.5)
    u.uStrB.value = 0.14
    ;(u.uColor.value as Color).copy(mood.current.tint)

    u.uPrev.value = this.rtA.texture
    renderer.setRenderTarget(this.rtB)
    renderer.render(this.fsScene, this.fsCam)
    renderer.setRenderTarget(null)

    // swap
    const tmp = this.rtA
    this.rtA = this.rtB
    this.rtB = tmp
    this.texture = this.rtA.texture
  }
}

/** Returns the live dye texture, or null when gated off. */
export function createInk(getHead: () => Vector3): Ink | null {
  if (quality.tier !== 'high' || quality.reducedMotion) return null
  const ink = new Ink()
  const pointerUv = new Vector2(0.5, 0.5)
  window.addEventListener('pointermove', (e) => {
    pointerUv.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight)
  })
  onFrame((time, dt) => {
    ink.step(time, dt, pointerUv, getHead())
  })
  return ink
}
