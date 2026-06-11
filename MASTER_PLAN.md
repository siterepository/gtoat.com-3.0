# GTOAT 3.0 — Master Plan

> Rebuild of [gtoat.com](https://gtoat.com) as an award-tier 3D web experience.
> Same soul — neon serpents, meme-military bravado, "feed Bella" lore — 10X the execution.

## Vision

**"THE SERPENT"** — a single-page cinematic experience. One signature 3D idea executed
with restraint: a glowing, iridescent neon serpent living in a full-viewport WebGL canvas.
It slithers continuously through the page as you scroll — coiling behind the roster,
winding through the lore timeline, striking at the contact section. Slither.io made
mythic. Everything else (typography, cards, data) stays DOM — crisp, readable, accessible.

Award-tier means: one strong idea > ten gimmicks. Custom shaders, deliberate easing,
choreographed camera, premium loading sequence, micro-interactions, no default-material
plastic look, 60fps on mid-tier hardware.

## Spirit Preserved (from docs/CONTENT_INVENTORY.md)

- Voice: irreverent gaming-meme energy wrapped in pseudo-military dossier framing.
  "Every card is a warning label." / "Infinite budget for propaganda, vibes, and dominance theater."
- Lore: 6-era saga ending in "GRINCH reorganized slither.io's entire gravitational field."
- Mission: "If Bella ain't Happy, NO ONE IS! Join GTOAT and feed Bella!"
- Roster: GRINCH Prime, Bella Protocol, Incog Elite, Breeze — threat-level dossiers.
- Easter eggs kept: rickroll on "They never miss," pupil-tracking eyes (now on the serpent),
  hidden footer links, GOD MODE doctrine.
- Data: Supabase (scores, activity log), EmailJS contact, GA4.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 6 + TypeScript | Static output, instant HMR, no framework tax |
| 3D | Three.js (r17x) | Vanilla — full control, smallest bundle; R3F adds React weight we don't need |
| Post | `postprocessing` (bloom only) | One effect, aggressively tuned; stacked effects = mud |
| Animation | GSAP 3 + ScrollTrigger | Scroll choreography, single `gsap.ticker` heartbeat |
| Scroll | Lenis | Smooth scroll feeding ScrollTrigger; iOS-safe |
| Shaders | Custom GLSL | Fresnel iridescence on serpent, simplex-noise nebula background, GPU orb particles |
| Data | Supabase JS (existing project) | Reuse `nndyngflhsqcvryclkbc` tables |
| Contact | EmailJS (existing service/template) | Drop-in |
| Deploy | Static `dist/` → Vercel/any host | Same as original hosting model |

No models to download — serpent is procedural geometry (TubeGeometry along animated
CatmullRom spline). Zero glTF, zero draco pipeline needed, tiny payload.

## Architecture

```
src/
  main.ts                 # boot: preloader → engine → sections
  engine/
    renderer.ts           # WebGL renderer, adaptive DPR, resize, visibility pause
    scene.ts              # scene graph, camera rig, lights
    ticker.ts             # single heartbeat: gsap.ticker → lenis.raf + render
    quality.ts            # device tier detect (deviceMemory/cores/touch) → quality preset
  serpent/
    spine.ts              # animated CatmullRom spline; scroll-driven waypoints
    body.ts               # TubeGeometry rebuild per frame (or shader-displaced), iridescent material
    head.ts               # head mesh + eyes with pupil tracking (easter egg, kept)
    shaders/              # vertex/fragment GLSL: fresnel, iridescence, stripe flow
  fx/
    orbs.ts               # GPU particle food-orbs (points + shader), serpent "eats" on scroll
    nebula.ts             # fullscreen simplex-noise background plane
    bloom.ts              # selective bloom composer
  sections/               # DOM sections + their ScrollTrigger choreography
    hero.ts  brief.ts  roster.ts  intel.ts  lore.ts  media.ts  contact.ts
  data/
    supabase.ts  emailjs.ts
  ui/
    preloader.ts          # premium load sequence: serpent wireframe → solid → strike
    nav.ts  progress.ts  cursor.ts
  styles/                 # design tokens (original palette), typography, sections
index.html                # semantic DOM, all copy verbatim from inventory
hs.html / al.html         # leaderboard + activity log (Supabase dashboards, restyled)
```

## Design tokens (carried over, refined)

- Void `#04060d`, deep `#080c18`, surface `#0d1224`
- Neon: purple `#a855f7`/`#b24dff`, cyan `#22d3ee`/`#00f0ff`, pink `#f472b6`/`#ff3d8e`, gold `#f59e0b`
- Type: Unbounded (display), Syne (headers), Manrope (body), JetBrains Mono (dossier/data), Orbitron (stats)

## Sprints

### Sprint 0 — Research, plan, repo ✅
Research agents (3D techniques + content extraction), this plan, repo `siterepository/gtoat.com-3.0`.

### Sprint 1 — Foundation
Vite+TS scaffold, design tokens, semantic index.html with all verbatim copy, ticker/renderer/
quality engine, Lenis+ScrollTrigger wired, nebula background, preloader shell.
**Done when:** dev server renders dark nebula scene at 60fps, scroll smooth, copy in DOM.

### Sprint 2 — The Serpent
Procedural serpent (spline+tube), iridescent GLSL material, scroll-driven path through
all sections, head/eye pupil tracking, hero mouse-follow, orb particles + eat events.
**Done when:** serpent slithers full page, looks premium (no plastic), 60fps desktop.

### Sprint 3 — Section choreography
All 7 sections styled + ScrollTrigger reveals (SplitText-style staggers), roster dossier
cards, lore timeline typed-text, intel feed, media, accordions content parity.
**Done when:** full scroll story reads end-to-end, all original copy/eggs present.

### Sprint 4 — Data + secondary pages
Supabase wiring (stats counters, updates), EmailJS contact form, hs.html + al.html
restyled to 3.0 design, footer hidden links.
**Done when:** form sends, dashboards render live data, links verified.

### Sprint 5 — Polish + ship
Adaptive DPR + mobile tier (reduced geometry, bloom off), `prefers-reduced-motion`
static fallback, a11y pass (focus, contrast, semantic), SEO/OG/JSON-LD parity, Lighthouse,
visual QA via headless preview, code-review agent audit, final push.
**Done when:** 60fps mid-tier, Lighthouse perf ≥ 85 desktop, review findings fixed.

## Skills & agents

- **Skills:** `frontend-design` (Sprint 1-3 UI quality), `verify`/preview tools (Sprint 5 QA),
  `code-review` (Sprint 5 audit).
- **Sub-agents:** 2 research agents (Sprint 0, done); section-builder agents where parallel
  (Sprint 3-4: secondary pages, intel/media sections); QA + review agents (Sprint 5).
- Main thread owns engine + serpent (coherence-critical code).

## Performance budget

- < 100 draw calls; serpent+orbs+nebula ≈ 5 draw calls
- JS bundle < 350KB gz (three ~160KB + gsap ~70KB + app)
- LCP < 2.5s (DOM-first, canvas progressive), no CLS from canvas
- DPR cap 2; mobile tier: 0.75× segments, bloom off, orbs halved

## Anti-tacky rules (enforced)

1. Text never 3D geometry — DOM always.
2. One post effect (bloom). No DOF+chromatic+grain stacks.
3. No linear easing anywhere; custom cubic-beziers.
4. Serpent material: fresnel + iridescence + emissive stripes — never MeshStandard default.
5. Canvas pauses when tab hidden; reduced-motion gets static art.
