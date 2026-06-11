import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three'

const vert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform float uTime;
  uniform float uHue;

  // body palette — neon purple / cyan / pink
  vec3 ramp(float t) {
    vec3 a = vec3(0.70, 0.30, 1.00); // purple
    vec3 b = vec3(0.00, 0.94, 1.00); // cyan
    vec3 c = vec3(1.00, 0.24, 0.56); // pink
    vec3 ab = mix(a, b, smoothstep(0.0, 0.55, t));
    return mix(ab, c, smoothstep(0.6, 1.0, t));
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);

    // iridescent base — hue flows along the body and with view angle
    float along = fract(vUv.x + uHue);
    float facing = dot(n, v);
    vec3 base = ramp(fract(along + (1.0 - facing) * 0.22));

    // half-lambert key light
    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.65));
    float diff = dot(n, lightDir) * 0.5 + 0.5;
    diff = diff * diff;

    // slither.io glow bands flowing toward the head
    float band = fract(vUv.x * 26.0 - uTime * 1.35);
    float stripe = smoothstep(0.42, 0.5, band) * smoothstep(0.66, 0.58, band);

    // fresnel rim
    float rim = pow(1.0 - max(facing, 0.0), 2.6);

    // belly darkening for volume
    float belly = smoothstep(-0.9, 0.6, n.y) * 0.35 + 0.65;

    vec3 col = base * diff * 0.34 * belly;
    col += base * stripe * 1.5;            // glow segments (bloom feeds on these)
    col += vec3(0.0, 0.94, 1.0) * rim * 0.55;
    col += base * 0.05;

    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * Updatable tube — fixed topology, vertices rewritten in place each frame.
 * No per-frame allocation, no TubeGeometry churn.
 */
export class SerpentBody {
  mesh: Mesh
  material: ShaderMaterial
  private geo: BufferGeometry
  private segments: number
  private radial = 12
  private posAttr: BufferAttribute
  private nrmAttr: BufferAttribute

  // scratch
  private p = new Vector3()
  private tangent = new Vector3()
  private normal = new Vector3()
  private binormal = new Vector3()
  private radialVec = new Vector3()
  private up = new Vector3(0, 1, 0)

  constructor(segments: number) {
    this.segments = segments
    const vertCount = (segments + 1) * (this.radial + 1)

    this.geo = new BufferGeometry()
    this.posAttr = new BufferAttribute(new Float32Array(vertCount * 3), 3)
    this.nrmAttr = new BufferAttribute(new Float32Array(vertCount * 3), 3)
    const uvs = new Float32Array(vertCount * 2)
    const idx: number[] = []

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= this.radial; j++) {
        const k = i * (this.radial + 1) + j
        uvs[k * 2] = i / segments
        uvs[k * 2 + 1] = j / this.radial
      }
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < this.radial; j++) {
        const a = i * (this.radial + 1) + j
        const b = (i + 1) * (this.radial + 1) + j
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }

    this.posAttr.setUsage(35048) // DYNAMIC_DRAW
    this.nrmAttr.setUsage(35048)
    this.geo.setAttribute('position', this.posAttr)
    this.geo.setAttribute('normal', this.nrmAttr)
    this.geo.setAttribute('uv', new BufferAttribute(uvs, 2))
    this.geo.setIndex(idx)

    this.material = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uHue: { value: 0 },
      },
      side: DoubleSide,
    })

    this.mesh = new Mesh(this.geo, this.material)
    this.mesh.frustumCulled = false
  }

  /** Radius profile: slim tail → full body → tapered neck into head. */
  private radius(t: number): number {
    const grow = 0.16 + 0.84 * Math.pow(Math.min(t / 0.7, 1), 0.55)
    const neck = 1.0 - 0.25 * Math.max(0, (t - 0.92) / 0.08)
    return 0.42 * grow * neck
  }

  update(curve: CatmullRomCurve3, time: number, hue: number) {
    const pos = this.posAttr.array as Float32Array
    const nrm = this.nrmAttr.array as Float32Array
    let prevTangent: Vector3 | null = null

    for (let i = 0; i <= this.segments; i++) {
      const t = i / this.segments
      curve.getPointAt(t, this.p)
      curve.getTangentAt(t, this.tangent)

      // parallel-transport-ish frame: keep normal stable vs previous tangent
      if (!prevTangent) {
        this.normal.crossVectors(this.tangent, this.up)
        if (this.normal.lengthSq() < 1e-5) this.normal.set(1, 0, 0)
        this.normal.normalize()
      } else {
        this.binormal.crossVectors(prevTangent, this.tangent)
        if (this.binormal.lengthSq() > 1e-7) {
          this.binormal.normalize()
          const angle = Math.acos(Math.min(1, Math.max(-1, prevTangent.dot(this.tangent))))
          this.normal.applyAxisAngle(this.binormal, angle)
        }
      }
      prevTangent = prevTangent ? prevTangent.copy(this.tangent) : this.tangent.clone()
      this.binormal.crossVectors(this.tangent, this.normal).normalize()

      // breathing — faint pulse traveling the body
      const r = this.radius(t) * (1 + 0.06 * Math.sin(t * 18 - time * 2.2))

      for (let j = 0; j <= this.radial; j++) {
        const a = (j / this.radial) * Math.PI * 2
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        this.radialVec
          .set(0, 0, 0)
          .addScaledVector(this.normal, cos)
          .addScaledVector(this.binormal, sin)

        const k = (i * (this.radial + 1) + j) * 3
        pos[k] = this.p.x + this.radialVec.x * r
        pos[k + 1] = this.p.y + this.radialVec.y * r
        pos[k + 2] = this.p.z + this.radialVec.z * r
        nrm[k] = this.radialVec.x
        nrm[k + 1] = this.radialVec.y
        nrm[k + 2] = this.radialVec.z
      }
    }

    this.posAttr.needsUpdate = true
    this.nrmAttr.needsUpdate = true
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uHue.value = hue
  }
}
