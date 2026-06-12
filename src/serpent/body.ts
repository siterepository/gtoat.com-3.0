import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
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
  uniform vec3 uMoodTint;
  uniform float uMoodAmt;

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
    base = mix(base, base * uMoodTint * 2.2, uMoodAmt * 0.5);

    // scale lattice — staggered diamond rows, denser along the body
    vec2 sc = vec2(vUv.x * 110.0, vUv.y * 14.0);
    sc.x += step(0.5, fract(sc.y * 0.5)); // brick offset every other row
    vec2 cell = (fract(sc) - 0.5) * vec2(1.0, 1.45);
    float cd = length(cell);
    float scale = smoothstep(0.52, 0.30, cd);          // scale plate
    float seam = 1.0 - smoothstep(0.30, 0.52, cd);      // valley between plates

    // half-lambert key light
    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.65));
    float diff = dot(n, lightDir) * 0.5 + 0.5;
    diff = diff * diff;

    // wet-skin specular, glinting per scale plate
    vec3 h = normalize(lightDir + v);
    float spec = pow(max(dot(n, h), 0.0), 56.0) * (0.35 + 0.65 * scale);

    // slither.io glow bands flowing toward the head
    float band = fract(vUv.x * 26.0 - uTime * 1.35);
    float stripe = smoothstep(0.42, 0.5, band) * smoothstep(0.66, 0.58, band);

    // fresnel rim
    float rim = pow(1.0 - max(facing, 0.0), 2.6);

    // dorsal stripe: darker saturated ridge along the spine — gives the
    // body a top and a bottom, like a real animal
    float dorsal = smoothstep(0.55, 0.95, n.y);
    base = mix(base, base * vec3(0.45, 0.4, 0.62), dorsal * 0.6);

    // belly: lighter keeled plates underneath, darker top shading
    float bellyMask = smoothstep(0.15, -0.55, n.y);
    float keel = 0.85 + 0.15 * smoothstep(0.4, 0.5, fract(vUv.x * 60.0));
    vec3 bellyCol = vec3(0.78, 0.86, 0.96) * diff * 0.42 * keel;
    float topShade = smoothstep(-0.9, 0.6, n.y) * 0.35 + 0.65;

    vec3 col = base * diff * 0.34 * topShade;
    col *= 0.72 + 0.28 * seam;                       // scale valleys read as texture
    col = mix(col, bellyCol, bellyMask * 0.55);
    col += base * stripe * 0.7;                      // luminous bands, no blowout
    col += vec3(1.0) * spec * 0.45;
    col += vec3(0.0, 0.94, 1.0) * rim * 0.4;
    col += base * 0.05;
    col += base * smoothstep(0.82, 1.0, vUv.x) * 0.18; // life gathers at the neck

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
  private prevTangent = new Vector3()
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
        uMoodTint: { value: new Color(1, 1, 1) },
        uMoodAmt: { value: 0 },
      },
      side: DoubleSide,
    })

    this.mesh = new Mesh(this.geo, this.material)
    this.mesh.frustumCulled = false
  }

  /** Radius profile: slim tail → full body → tapered neck into head. */
  private radius(t: number): number {
    const s = Math.min(t / 0.62, 1)
    const grow = 0.14 + 0.86 * Math.pow(s * s * (3 - 2 * s), 0.6) // smoothstep'd — no kink
    const neck = 1.0 - 0.22 * Math.max(0, (t - 0.9) / 0.1)
    return 0.45 * grow * neck
  }

  update(curve: CatmullRomCurve3, time: number, hue: number, tint: Color, tintAmt: number) {
    this.material.uniforms.uMoodTint.value.copy(tint)
    this.material.uniforms.uMoodAmt.value = tintAmt
    const pos = this.posAttr.array as Float32Array
    const nrm = this.nrmAttr.array as Float32Array

    for (let i = 0; i <= this.segments; i++) {
      const t = i / this.segments
      // parameter space — control points are arc-evenly spaced upstream,
      // so this skips the per-frame arc-length table entirely
      curve.getPoint(t, this.p)
      curve.getTangent(t, this.tangent)

      // parallel-transport-ish frame: keep normal stable vs previous tangent
      if (i === 0) {
        this.normal.crossVectors(this.tangent, this.up)
        if (this.normal.lengthSq() < 1e-5) this.normal.set(1, 0, 0)
        this.normal.normalize()
      } else {
        this.binormal.crossVectors(this.prevTangent, this.tangent)
        if (this.binormal.lengthSq() > 1e-7) {
          this.binormal.normalize()
          const angle = Math.acos(Math.min(1, Math.max(-1, this.prevTangent.dot(this.tangent))))
          this.normal.applyAxisAngle(this.binormal, angle)
        }
      }
      this.prevTangent.copy(this.tangent)
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
