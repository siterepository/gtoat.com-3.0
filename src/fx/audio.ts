/**
 * The sound layer — entirely synthesized in Web Audio. No files, no
 * library, ~0KB. Unlocks on first user gesture (autoplay policy),
 * persistent mute, ambient bed pitched by section mood.
 */

const STORE_KEY = 'gtoat_snd'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private muted = localStorage.getItem(STORE_KEY) === 'off'
  private lastPop = 0

  get isMuted() {
    return this.muted
  }

  /** Build the graph — call only from a user gesture. */
  private ensure() {
    if (this.ctx) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.6
    this.master.connect(this.ctx.destination)

    // ── ambient bed: two detuned lows + filtered noise, breathing ──
    this.ambient = this.ctx.createGain()
    this.ambient.gain.value = 0
    this.filter = this.ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 240
    this.filter.Q.value = 0.8
    this.ambient.connect(this.filter)
    this.filter.connect(this.master)

    const o1 = this.ctx.createOscillator()
    o1.type = 'sawtooth'
    o1.frequency.value = 54
    const g1 = this.ctx.createGain()
    g1.gain.value = 0.05
    o1.connect(g1)
    g1.connect(this.ambient)
    o1.start()

    const o2 = this.ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = 81.4 // detuned fifth — slow beat against o1
    const g2 = this.ctx.createGain()
    g2.gain.value = 0.045
    o2.connect(g2)
    g2.connect(this.ambient)
    o2.start()

    // noise bed
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.4
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const ng = this.ctx.createGain()
    ng.gain.value = 0.015
    const nf = this.ctx.createBiquadFilter()
    nf.type = 'bandpass'
    nf.frequency.value = 420
    nf.Q.value = 0.4
    noise.connect(nf)
    nf.connect(ng)
    ng.connect(this.ambient)
    noise.start()

    // breathing LFO on the bed
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 0.015
    lfo.connect(lfoGain)
    lfoGain.connect(this.ambient.gain)
    lfo.start()

    // fade the bed in
    this.ambient.gain.setTargetAtTime(0.06, this.ctx.currentTime, 2.5)
  }

  unlock() {
    this.ensure()
    void this.ctx?.resume()
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    localStorage.setItem(STORE_KEY, this.muted ? 'off' : 'on')
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.12)
    }
    return this.muted
  }

  /** Section mood shifts re-voice the ambient bed. */
  setMoodIndex(i: number) {
    if (!this.ctx || !this.filter) return
    this.filter.frequency.setTargetAtTime(190 + i * 38, this.ctx.currentTime, 1.2)
  }

  /** Orb eaten — tiny ascending pop. Throttled; feeding frenzies stay subtle. */
  pop() {
    if (!this.ctx || !this.master || this.muted) return
    const now = performance.now()
    if (now - this.lastPop < 90) return
    this.lastPop = now
    const t = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(320, t)
    o.frequency.exponentialRampToValueAtTime(740, t + 0.09)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.07, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + 0.16)
  }

  /** The serpent found something interesting — two-note curiosity chime. */
  chime() {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime
    for (const [freq, at, vol] of [
      [659, 0, 0.05],
      [988, 0.11, 0.04],
    ] as const) {
      const o = this.ctx!.createOscillator()
      o.type = 'triangle'
      o.frequency.value = freq
      const g = this.ctx!.createGain()
      g.gain.setValueAtTime(0.0001, t + at)
      g.gain.exponentialRampToValueAtTime(vol, t + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.5)
      o.connect(g)
      g.connect(this.master!)
      o.start(t + at)
      o.stop(t + at + 0.55)
    }
  }

  /** Section transition — filtered noise sweep. */
  whoosh() {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime
    const len = this.ctx.sampleRate * 0.6
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const f = this.ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.2
    f.frequency.setValueAtTime(220, t)
    f.frequency.exponentialRampToValueAtTime(1300, t + 0.45)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.055, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t)
  }
}

export const audio = new AudioEngine()

const SCENE_INDEX: Record<string, number> = {
  hero: 0, brief: 1, roster: 2, intel: 3, reviews: 4, lore: 5, media: 6, contact: 7,
}

export function initAudio() {
  // unlock on first gesture — standard autoplay-policy pattern
  const unlock = () => audio.unlock()
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })

  document.addEventListener('gtoat:eat', () => audio.pop())
  document.addEventListener('gtoat:examine', () => audio.chime())
  document.addEventListener('gtoat:scene', (e) => {
    const name = (e as CustomEvent<string>).detail
    audio.setMoodIndex(SCENE_INDEX[name] ?? 0)
    audio.whoosh()
  })

  // mute toggle
  const btn = document.getElementById('sndBtn')
  if (btn) {
    const paint = (muted: boolean) => {
      btn.setAttribute('aria-pressed', String(!muted))
      btn.textContent = muted ? 'SND OFF' : 'SND ON'
      btn.classList.toggle('is-off', muted)
    }
    paint(audio.isMuted)
    btn.addEventListener('click', () => paint(audio.toggleMute()))
  }
}
