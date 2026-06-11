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
import { onFrame } from '../engine/ticker'

const COUNT = 90

const vert = /* glsl */ `
  attribute vec3 aVel;
  attribute float aSeed;
  uniform float uAge;
  uniform vec3 uOrigin;
  varying float vFade;
  void main() {
    float t = uAge;
    vec3 p = uOrigin + aVel * t * (1.0 - t * 0.45); // decelerating spray
    p.y -= t * t * 1.4;                              // a little gravity
    vFade = 1.0 - t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (20.0 + aSeed * 16.0) * vFade / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = pow(smoothstep(0.5, 0.0, d), 1.8);
    gl_FragColor = vec4(uColor * glow * 2.2, glow * vFade);
  }
`

/**
 * One-shot sparkle burst — the puff of pixie dust when the serpent boops
 * something. A single pooled Points cloud, re-armed per burst.
 */
export class Burst {
  private points: Points
  private mat: ShaderMaterial
  private age = 1e9

  constructor() {
    const geo = new BufferGeometry()
    const pos = new Float32Array(COUNT * 3) // positions live in the shader
    const vel = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 1.6 + Math.random() * 2.6
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      vel[i * 3 + 2] = Math.cos(phi) * speed * 0.5
      seed[i] = Math.random()
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('aVel', new BufferAttribute(vel, 3))
    geo.setAttribute('aSeed', new BufferAttribute(seed, 1))

    this.mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uAge: { value: 2 },
        uOrigin: { value: new Vector3() },
        uColor: { value: new Color(0x00f0ff) },
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    this.points = new Points(geo, this.mat)
    this.points.frustumCulled = false
    this.points.visible = false
    scene.add(this.points)

    onFrame((_t, dt) => {
      if (this.age > 1.1) {
        this.points.visible = false
        return
      }
      this.age += dt * 0.9
      this.mat.uniforms.uAge.value = this.age
    })
  }

  fire(at: Vector3, color: Color) {
    this.age = 0
    ;(this.mat.uniforms.uOrigin.value as Vector3).copy(at)
    ;(this.mat.uniforms.uColor.value as Color).copy(color)
    this.points.visible = true
  }
}
