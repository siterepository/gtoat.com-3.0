import { Color, Vector3 } from 'three'
import { onFrame, ScrollTrigger } from '../engine/ticker'

export interface MoodState {
  nebA: Color // nebula primary tint
  nebB: Color // nebula secondary tint
  orb: Color // orb field tint
  tint: Color // serpent mood tint
  tintAmt: number // how hard the tint bites
  serpentHue: number // hue phase offset along the body ramp
  camZ: number // camera depth — closer = more intense
  anchor: Vector3 // idle-wander anchor for the serpent
}

interface MoodDef {
  nebA: number
  nebB: number
  orb: number
  tint: number
  tintAmt: number
  serpentHue: number
  camZ: number
  ax: number // anchor x as fraction of view width (set in world units ~9)
  ay: number
}

/**
 * Every section is its own room. Same serpent, same nebula — different
 * light, depth, and temperament. Hue keys nod to the 2.x section gradients
 * (origin was green, roster gold, intel deep blue).
 */
const MOODS: Record<string, MoodDef> = {
  hero:    { nebA: 0x6b2eb8, nebB: 0x008ca8, orb: 0xbfd4ff, tint: 0xa855f7, tintAmt: 0.0,  serpentHue: 0.0,  camZ: 14.0, ax: 4.2,  ay: 0.6 },
  brief:   { nebA: 0x0c5a30, nebB: 0x00a86b, orb: 0x7dff9e, tint: 0x22c55e, tintAmt: 0.5,  serpentHue: 0.3,  camZ: 13.2, ax: -4.6, ay: 0.4 },
  roster:  { nebA: 0x8a5a00, nebB: 0xc2410c, orb: 0xffd166, tint: 0xf59e0b, tintAmt: 0.55, serpentHue: 0.52, camZ: 12.6, ax: 4.6,  ay: -0.4 },
  intel:   { nebA: 0x0a2a6e, nebB: 0x0090b8, orb: 0x66e0ff, tint: 0x22d3ee, tintAmt: 0.5,  serpentHue: 0.62, camZ: 14.6, ax: -4.4, ay: 0.8 },
  reviews: { nebA: 0x7a1030, nebB: 0xb8064e, orb: 0xff7aa8, tint: 0xff3d8e, tintAmt: 0.55, serpentHue: 0.78, camZ: 13.0, ax: 4.4,  ay: 0.2 },
  lore:    { nebA: 0x6e4a08, nebB: 0x3a2a06, orb: 0xffe9b0, tint: 0xd9a441, tintAmt: 0.45, serpentHue: 0.45, camZ: 15.4, ax: -4.8, ay: -0.6 },
  media:   { nebA: 0x4a1a9e, nebB: 0x8a2be2, orb: 0xc9a0ff, tint: 0xa855f7, tintAmt: 0.5,  serpentHue: 0.12, camZ: 13.4, ax: 4.5,  ay: 0.5 },
  contact: { nebA: 0x9a0f6e, nebB: 0x00b0c8, orb: 0xff9ad0, tint: 0xff3d8e, tintAmt: 0.6,  serpentHue: 0.88, camZ: 11.8, ax: -3.6, ay: -0.5 },
}

const target: MoodState = {
  nebA: new Color(MOODS.hero.nebA),
  nebB: new Color(MOODS.hero.nebB),
  orb: new Color(MOODS.hero.orb),
  tint: new Color(MOODS.hero.tint),
  tintAmt: MOODS.hero.tintAmt,
  serpentHue: MOODS.hero.serpentHue,
  camZ: MOODS.hero.camZ,
  anchor: new Vector3(MOODS.hero.ax, MOODS.hero.ay, -1),
}

export const mood = {
  current: {
    nebA: new Color(MOODS.hero.nebA),
    nebB: new Color(MOODS.hero.nebB),
    orb: new Color(MOODS.hero.orb),
    tint: new Color(MOODS.hero.tint),
    tintAmt: MOODS.hero.tintAmt,
    serpentHue: MOODS.hero.serpentHue,
    camZ: MOODS.hero.camZ,
    anchor: new Vector3(MOODS.hero.ax, MOODS.hero.ay, -1),
  } as MoodState,
}

function setTarget(name: string) {
  const d = MOODS[name]
  if (!d) return
  target.nebA.setHex(d.nebA)
  target.nebB.setHex(d.nebB)
  target.orb.setHex(d.orb)
  target.tint.setHex(d.tint)
  target.tintAmt = d.tintAmt
  target.serpentHue = d.serpentHue
  target.camZ = d.camZ
  target.anchor.set(d.ax, d.ay, -1)
}

export function initMoods() {
  document.querySelectorAll<HTMLElement>('main section[data-scene]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (st) => {
        if (st.isActive) setTarget(sec.dataset.scene!)
      },
    })
  })

  onFrame((_t, dt) => {
    const c = mood.current
    const k = Math.min(1, dt * 1.8) // slow cross-fade between rooms
    c.nebA.lerp(target.nebA, k)
    c.nebB.lerp(target.nebB, k)
    c.orb.lerp(target.orb, k)
    c.tint.lerp(target.tint, k)
    c.tintAmt += (target.tintAmt - c.tintAmt) * k
    c.serpentHue += (target.serpentHue - c.serpentHue) * k
    c.camZ += (target.camZ - c.camZ) * k
    c.anchor.lerp(target.anchor, k)
  })
}
