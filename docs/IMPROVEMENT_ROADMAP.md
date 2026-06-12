# GTOAT 3.0 — State of the Project & Improvement Roadmap

> Compiled 2026-06-12 from two research passes: a deep survey of 2025–2026
> award-winning 3D web (Awwwards/FWA/Codrops) and a full codebase audit
> against that bar.

## Where the project stands

Eleven sprints shipped. Current feature set:

- **The serpent**: procedural zero-allocation tube body, custom GLSL (iridescent ramp,
  scale lattice + wet specular, dorsal stripe, belly keel, flowing glow bands), film-rig
  painted-shader eyes (slit pupils, saccades, lid-follows-gaze, double catchlights,
  asymmetric blinks), brow acting, crown, tongue
- **Behavior**: heading-based locomotion (arcs, arrive-braking, distance-phased
  undulation, thrust surge), state machine — chase / rest / play / wander / **curious**
  (examines real page elements; page reacts: threat surges, +1 stats, letter ripples,
  nudges, sparkle bursts)
- **Stage**: FBM nebula, per-section mood rooms (color/depth/anchor cross-fade),
  selective bloom, GPU orb food field, camera parallax rig
- **Page**: serpentine zig-zag layout, 3D scroll section transitions, full 2.x content
  parity + easter eggs, playable original game, EmailJS contact, Supabase dashboards,
  EVAR + top-5 video sections
- **Engineering**: single ticker heartbeat, quality tiers, reduced-motion path,
  self-healing resize, ~208KB gz JS, ~7 draw calls

## Audit scores (vs award bar)

| Area | /10 | Headline gap |
|---|---|---|
| Visual polish | 7.5 | nebula is vanilla noise; scale pattern repetitive |
| Motion design | 6.8 | hero has zero camera motion; easing monoculture |
| Code health | 7.2 | callback guards, uniform mutability |
| Typography/content | 7.0 | hero line-wrap on mobile; small-caps tags |
| Performance | 6.5 | CPU tube rebuild ~4ms/frame; O(n) arc-length per tick; bloom ungated on mid tier |
| Loading | 6.2 | progress bar is fake; no failure state |
| Mobile | 6.0 | no touch/gyro parity for tilt/parallax; soft DPR on low tier |
| Accessibility | 5.5 | tabs not keyboard-navigable; harsh reduced-motion freeze; borderline gold contrast |
| **Sensory layers** | **4.0** | **zero audio, default cursor, no haptics** |

## Top 5 improvements (ranked)

### 1. Sound design — the missing sense
Every 2025–2026 award winner ships audio. Plan: Web Audio/Howler (~7KB), muted-until-
first-gesture unlock (autoplay-policy standard), persistent mute toggle in nav.
Layer: low ambient nebula hum (mood-pitched per section), orb-eat pop, examine chime,
tongue-flick tick, section-transition whoosh, anthem hook on hero music links.
**Effort: 1–2 days. Impact: biggest single jump in perceived production value.**

### 2. Custom predator cursor
Default arrow kills the fantasy. Slit-pupil reticle cursor (canvas/SVG, GSAP-smoothed),
magnetic pull onto interactives, context labels ("PLAY", "ENLIST", "INSPECT"),
scale-pulse when the serpent is hunting the cursor — the prey knows it's prey.
**Effort: 1 day. Impact: instant top-tier polish signal on every pixel of mouse travel.**

### 3. Cinematic camera work + hero sequence
Audit: "hero intro has zero camera motion." Plan: preloader dissolves → camera dollies
in from deep z while serpent swims through frame → title clip-reveals on its wake.
Add camera saccade micro-cuts on section changes, slight DOF/vignette pulse during
examine moments, and one pinned scrubbed sequence (lore timeline as camera journey).
**Effort: 2–3 days. Impact: turns a page into a film; this is what SOTD juries reward.**

### 4. Performance architecture pass
Three compounding fixes: (a) move tube deformation to the vertex shader (spline
sampled into a small data texture; kills the ~4ms/frame CPU rebuild), (b) replace
per-frame `updateArcLengths` on a 900-point trail with incremental arc bookkeeping,
(c) gate bloom by measured frame time, not just device hints + add an FPS watchdog
that steps quality tiers live. Protects 60fps on mid-tier mobile — the award
submission floor.
**Effort: 2–3 days. Impact: invisible when it works, disqualifying when it doesn't.**

### 5. WebGPU/TSL migration + compute-shader particle moments
Jan 2026: WebGPU is baseline in all major browsers; Three's `WebGPURenderer` falls
back to WebGL automatically. TSL shaders compile to both. Unlocks compute particles:
100k+ orb field, the hero headline assembling from particles the serpent scatters,
trail nebula dust. This is the current frontier separating 2026 winners (IVRESS,
Shader.se) from 2024-style sites.
**Effort: ~1 week (port shaders to TSL, then compute systems). Impact: headline wow +
8–100x particle headroom; future-proofs the stack.**

### Honorable mentions
Touch/gyro parallax parity (60% of traffic gets no tilt today) · real preloader
progress + error state · keyboard-navigable intel tabs (WCAG AA) · scroll-scrubbed
mood blending (replace toggle) · gentler reduced-motion pose · Rapier physics for
coil-around-element moments · mood-following lid color · Draco/KTX2 pipeline (only
relevant if imported models arrive).
