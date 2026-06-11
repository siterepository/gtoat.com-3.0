import { Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'

const vert = /* glsl */ `
  varying vec3 vObjN;   // object-space normal — the eye's own latitude/longitude
  varying vec3 vWorldN;
  void main() {
    vObjN = normalize(position);
    vWorldN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Film-rig eye: the eyeball mesh NEVER rotates. Gaze, iris, pupil, lids and
 * catchlights are all painted in the fragment shader in the eye's own fixed
 * space — so lids can't clip, the pupil can't drift off the sclera, and the
 * iris stays a perfect disc from every angle.
 */
const frag = /* glsl */ `
  precision highp float;
  varying vec3 vObjN;
  varying vec3 vWorldN;
  uniform vec3 uGaze;     // eye-local gaze direction (normalized)
  uniform float uPupil;   // 1 = neutral, >1 dilated, <1 constricted
  uniform float uAspect;  // pupil shape: 1 = round, ~0.55 = reptile slit
  uniform float uClosure; // 0 open → 1 shut
  uniform vec3 uIris;     // iris color — follows the section mood
  uniform vec3 uLid;      // lid skin color

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vec3 n = normalize(vObjN);
    vec3 g = normalize(uGaze);

    // ── eyelids: upper comes down, lower rises slightly; soft lash edge ──
    // lid-follows-gaze: the upper lid rides just above where the eye looks
    float gazeLift = g.y * 0.16;
    float upper = mix(1.06, -0.42, uClosure) + gazeLift;
    float lower = mix(-1.06, -0.58, uClosure * 0.5) + g.y * 0.07;
    float lidUpper = 1.0 - smoothstep(upper - 0.06, upper + 0.04, n.y);
    float lidLower = smoothstep(lower - 0.04, lower + 0.06, n.y);
    float open = lidUpper * lidLower; // 1 = eyeball visible

    // lash line — darker crease right at the lid boundary
    float lashU = smoothstep(upper - 0.12, upper - 0.02, n.y) * (1.0 - smoothstep(upper - 0.02, upper + 0.06, n.y));

    // ── eyeball ──────────────────────────────────────────────────────
    float ang = dot(n, g); // 1 at gaze center

    // sclera with soft occlusion shading toward the lids (sells the sphere)
    float lidAO = smoothstep(0.55, 1.0, abs(n.y)) * 0.25;
    vec3 sclera = vec3(0.94, 0.96, 1.0) * (1.0 - lidAO);

    // iris disc ~37deg (cartoon-cute ratio), limbal ring, radial striations
    float irisEdge = 0.80;
    float inIris = smoothstep(irisEdge - 0.015, irisEdge + 0.015, ang);
    float limbal = smoothstep(irisEdge - 0.05, irisEdge - 0.005, ang) *
                   (1.0 - smoothstep(irisEdge + 0.005, irisEdge + 0.05, ang));

    // azimuth around the gaze axis for striations
    vec3 tangentRef = abs(g.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tx = normalize(cross(tangentRef, g));
    vec3 ty = cross(g, tx);
    float azim = atan(dot(n, ty), dot(n, tx));
    float striae = 0.82 + 0.18 * hash(floor(azim * 38.0));

    // radial falloff: brighter ring near pupil (iris collarette)
    float irisT = smoothstep(irisEdge, 1.0, ang);
    vec3 irisCol = uIris * striae * mix(0.55, 1.25, irisT);

    // pupil: elliptical in gaze-tangent space — a vertical reptile slit
    // that rounds out as it dilates
    vec3 dev = n - g * ang; // tangential deviation from gaze center
    float side = dot(dev, tx) / max(uAspect, 0.2);
    float up = dot(dev, ty);
    float rr = length(vec2(side, up));
    float pupilR = mix(0.10, 0.30, clamp((uPupil - 0.5) / 1.1, 0.0, 1.0));
    float inPupil = (1.0 - smoothstep(pupilR - 0.02, pupilR + 0.02, rr)) * step(irisEdge, ang);

    vec3 eyeCol = sclera;
    eyeCol = mix(eyeCol, irisCol, inIris);
    eyeCol = mix(eyeCol, eyeCol * 0.25, limbal);          // limbal ring
    eyeCol = mix(eyeCol, vec3(0.01, 0.01, 0.02), inPupil); // pupil

    // ── catchlights: hero glint at 2 o'clock (~20% iris), soft fill at
    //    8 o'clock (~10%) — the classic double catchlight ──
    vec3 glintA = normalize(vec3(0.38, 0.42, 0.82));
    vec3 glintB = normalize(vec3(-0.3, -0.18, 0.93));
    float gA = pow(max(dot(n, glintA), 0.0), 380.0);
    float gB = pow(max(dot(n, glintB), 0.0), 800.0) * 0.4;
    eyeCol += vec3(1.0) * (gA + gB);

    // ── lid skin: simple lambert so the lid reads as flesh, with crease ──
    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.65));
    float lidDiff = max(dot(vWorldN, lightDir), 0.0) * 0.6 + 0.4;
    vec3 lidCol = uLid * lidDiff;
    lidCol *= 1.0 - lashU * 0.45;

    vec3 col = mix(lidCol, eyeCol, open);
    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * One eye: painted shader eyeball + saccadic gaze controller.
 * Real eyes don't pan — they JUMP to targets (saccade), then sit almost
 * still with tiny micro-fixations. That darting is most of "alive".
 */
export class SerpentEye {
  mesh: Mesh
  private mat: ShaderMaterial
  private gaze = new Vector3(0, 0, 1)
  private gazeTarget = new Vector3(0, 0, 1)
  private microAt = 0
  private microOffset = new Vector3()

  constructor(radius: number) {
    this.mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uGaze: { value: new Vector3(0, 0, 1) },
        uPupil: { value: 1 },
        uAspect: { value: 0.65 },
        uClosure: { value: 0.1 },
        uIris: { value: new Color(0x22d3ee) },
        uLid: { value: new Color(0x2a1052) },
      },
    })
    this.mesh = new Mesh(new SphereGeometry(radius, 28, 22), this.mat)
  }

  /** @param targetDir desired gaze direction in EYE-LOCAL space (normalized) */
  update(
    time: number,
    dt: number,
    targetDir: Vector3,
    pupil: number,
    aspect: number,
    closure: number,
    iris: Color,
  ) {
    // micro-fixation: tiny gaze wander between saccades (~0.7s cadence)
    if (time > this.microAt) {
      this.microAt = time + 0.5 + Math.random() * 0.7
      this.microOffset.set(
        (Math.random() - 0.5) * 0.035,
        (Math.random() - 0.5) * 0.035,
        0,
      )
    }
    this.gazeTarget.copy(targetDir).add(this.microOffset).normalize()

    // saccade: big error → jump fast; small error → settle slowly
    const err = this.gaze.angleTo(this.gazeTarget)
    const k = err > 0.06 ? Math.min(1, dt * 26) : Math.min(1, dt * 7)
    this.gaze.lerp(this.gazeTarget, k).normalize()

    const u = this.mat.uniforms
    ;(u.uGaze.value as Vector3).copy(this.gaze)
    u.uPupil.value += (pupil - (u.uPupil.value as number)) * Math.min(1, dt * 8)
    u.uAspect.value += (aspect - (u.uAspect.value as number)) * Math.min(1, dt * 5)
    u.uClosure.value = closure
    ;(u.uIris.value as Color).lerp(iris, Math.min(1, dt * 3))
  }
}
