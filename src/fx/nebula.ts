import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Vector2,
} from 'three'
import { scene } from '../engine/stage'
import { onFrame, scrollProgress } from '../engine/ticker'
import { mood } from './moods'

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uRes;
  uniform vec3 uTintA;
  uniform vec3 uTintB;
  uniform sampler2D uInk;
  uniform float uInkOn;

  // simplex-ish value noise + fbm — cheap, fullscreen-safe
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
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
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(7.3, 1.7);
      a *= 0.52;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 ar = vec2(uRes.x / uRes.y, 1.0);
    vec2 p = (uv - 0.5) * ar;

    float t = uTime * 0.022;
    float drift = uScroll * 1.6;

    float n1 = fbm(p * 1.6 + vec2(t, -drift));
    float n2 = fbm(p * 3.1 - vec2(t * 1.4, drift * 0.6) + n1);
    float neb = smoothstep(0.42, 0.95, n1 * 0.65 + n2 * 0.45);

    vec3 void_ = vec3(0.016, 0.024, 0.051);

    // each section is a different room — mood system drives the tints
    vec3 tint = mix(uTintA, uTintB, smoothstep(0.3, 0.8, n2));

    vec3 col = void_ + tint * neb * 0.22;
    col += uTintB * pow(fbm(p * 6.0 + t * 2.0), 8.0) * 0.3; // starfield sparkle

    // ink field — bioluminescent dye trailing the pointer and the serpent
    col += texture2D(uInk, vUv).rgb * 0.5 * uInkOn;

    // vignette
    float vig = smoothstep(1.25, 0.35, length(p));
    col *= mix(0.55, 1.0, vig);

    // film grain
    col += (hash(uv * uRes + uTime) - 0.5) * 0.035;

    gl_FragColor = vec4(col, 1.0);
  }
`

let inkHook: ((tex: import('three').Texture) => void) | null = null

/** Late-bind the ink dye texture once the serpent (its emitter) exists. */
export function attachInk(getTexture: () => import('three').Texture) {
  inkHook?.(getTexture())
  // keep texture fresh across ping-pong swaps
  inkSource = getTexture
}
let inkSource: (() => import('three').Texture) | null = null

export function createNebula() {
  // fullscreen triangle (cheaper than quad, no camera dependency)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  geo.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2))

  const mat = new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uRes: { value: new Vector2(innerWidth, innerHeight) },
      uTintA: { value: new Color(0x6b2eb8) },
      uTintB: { value: new Color(0x008ca8) },
      uInk: { value: null },
      uInkOn: { value: 0 },
    },
    depthWrite: false,
    depthTest: false,
  })

  const mesh = new Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -10
  scene.add(mesh)

  window.addEventListener('resize', () => {
    mat.uniforms.uRes.value.set(innerWidth, innerHeight)
  })

  inkHook = (tex) => {
    mat.uniforms.uInk.value = tex
    mat.uniforms.uInkOn.value = 1
  }

  let smoothScroll = 0
  onFrame((time, dt) => {
    mat.uniforms.uTime.value = time
    smoothScroll += (scrollProgress() - smoothScroll) * Math.min(1, dt * 4)
    mat.uniforms.uScroll.value = smoothScroll
    mat.uniforms.uTintA.value.copy(mood.current.nebA)
    mat.uniforms.uTintB.value.copy(mood.current.nebB)
    if (inkSource) mat.uniforms.uInk.value = inkSource()
  })

  return mesh
}
