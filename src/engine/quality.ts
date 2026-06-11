export type Tier = 'high' | 'mid' | 'low'

export interface Quality {
  tier: Tier
  dprCap: number
  bloom: boolean
  orbCount: number
  tubeSegments: number
  reducedMotion: boolean
}

function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mem = nav.deviceMemory ?? 8
  const cores = navigator.hardwareConcurrency ?? 8
  const touch = navigator.maxTouchPoints > 1

  if (mem <= 2 || cores <= 2) return 'low'
  if (touch || mem <= 4 || cores <= 4) return 'mid'
  return 'high'
}

export function detectQuality(): Quality {
  const tier = detectTier()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const presets: Record<Tier, Omit<Quality, 'tier' | 'reducedMotion'>> = {
    high: { dprCap: 2, bloom: true, orbCount: 900, tubeSegments: 420 },
    mid: { dprCap: 1.6, bloom: true, orbCount: 450, tubeSegments: 280 },
    low: { dprCap: 1, bloom: false, orbCount: 180, tubeSegments: 160 },
  }

  return { tier, reducedMotion, ...presets[tier] }
}

export const quality = detectQuality()
