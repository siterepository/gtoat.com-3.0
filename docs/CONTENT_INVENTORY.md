# GTOAT.COM CONTENT INVENTORY — COMPLETE REBUILD SPEC

## Site Overview
**URL:** https://gtoat.com | **Status:** Live, production
**Tech Stack:** React 18 (inline Babel JSX) + Supabase + EmailJS + Chart.js
**Architecture:** Single-page app (SPA) with static HTML5 + inline React/Babel, 6-screen serpentine scroll UI
**Voice/Tone:** Meme-infused competitive gaming culture meets corporate irony; pseudo-militaristic ("CLASSIFIED," "PROTOCOL," threat levels); psychological warfare framing mixed with genuine team lore. Irreverent, confident, self-aware humor. Heavy use of ellipsis, brackets, and ALL CAPS for dramatic effect.

---

## DESIGN SYSTEM

### Color Tokens (CSS Variables, :root)
```css
--void: #04060d             /* Primary background */
--deep: #080c18             /* Secondary bg */
--surface: #0d1224          /* Surface variant */
--card: rgba(13, 18, 36, .85)
--glass: rgba(255, 255, 255, .03)
--glass-b: rgba(255, 255, 255, .06)
--text: #e8ecf4             /* Primary text */
--dim: #8899b4              /* Dimmed/secondary text */
--purple: #a855f7           /* Primary accent */
--cyan: #22d3ee             /* Secondary accent */
--pink: #f472b6             /* Tertiary accent */
--np: #b24dff               /* Neon purple */
--nc: #00f0ff               /* Neon cyan */
--nk: #ff3d8e               /* Neon pink */
--green: #22c55e
--gold: #f59e0b             /* Gold/warning */
--r: 14px                   /* Border radius (large) */
--rs: 8px                   /* Border radius (small) */
```

### Fonts
- **Unbounded** (wght: 400, 600, 800, 900) — Headlines, titles, hero text
- **Manrope** (wght: 300, 400, 500, 600, 700) — Body text, default sans-serif
- **JetBrains Mono** (wght: 400, 600) — UI labels, tags, monospace elements
- **Orbitron** (wght: 500, 700, 900) — Stats, numbers, threat levels
- **Syne** (wght: 400, 600, 700, 800) — Secondary headings, subtitles

### Key CSS Animations & Effects
- `.rv` (reveal system) — opacity + transform stagger with `--d` delay variable
- `.accPulse` — glow animation on accordion sections
- `.bs` (background slide) — gradient animation on play button
- `arrowBounce`, `arrowLeft`, `arrowRight` — hero section CTA arrows
- `sectionDivider` — timeline dividers in lore
- Progress bar: linear gradient (neon purple → cyan → pink)

---

## SITE STRUCTURE & CONTENT BY SECTION

### SCREEN 1: HERO (`#home`)
**ID:** `home` | **Classes:** `scr scr-hero` | **Background:** `img/banner_bg.png` (fixed attachment, parallax)

#### Hero Headline
```
GREATEST
[JOKE OF] (with neon gradient)
ALL TIME
```

#### Hero Copy
- **Phone:** `(888)-GTOAT-20` — Interactive tel: link
- **Discord:** `@GTOAT` — Discord user link (Discord ID: 1051910783526772808)
- **Game Label:** `▶ CLICK TO PLAY ▶` (animated arrows)
- **Primary CTA:** `GRINCH.io` button with clown emoji (🤡) that triggers embedded Slither.io game
  - OnClick: `window.GTOAT_SLITHER.start()`
  - Button has animated eye pupils that follow mouse position (via clientX/clientY tracking)
- **Hero Secondary Actions:**
  - "Join The Movement" link → https://www.youtube.com/shorts/feva1L-qs08
  - Music links:
    - YouTube Music: https://music.youtube.com/watch?v=KZkuAFyZfio
    - Spotify: https://open.spotify.com/track/1aQ7CBPOohTI2zD0mvukNN
    - Apple Music: https://music.apple.com/us/album/grinchs-speech/1814854157?i=1814854158

#### Scroll Hint
- "SCROLL HINT" text with animated down chevron
- "bob" animation at 2s cycle

#### Game Modal
- **ID:** `.sl-ov` (overlay wrapper)
- **Canvas:** `<canvas class="sl-c">` — Slither.io game instance
- **Header Stats:** Time, Score, Rank (JetBrains Mono, .7rem)
- **Close Button:** "X" button in header
- **Hint Text:** "Use arrow keys or mouse to move. Eat pellets. Don't hit walls or other snakes."

---

### SCREEN 2: THE BRIEF (Accordion + Stats)
**ID:** `maze-anchor` | **Type:** Maze panel (serpentine scroll)
**Background:** Gradient `180deg, #020804, #040a06, #020804`

#### Section Heading
- **Tag:** "STRATEGY" (gold) | **Title:** "The **Origin**" (g = gradient)
- **Copy:** "GRINCH didn't just drop a song — he detonated a masterpiece. Engineered to live rent-free."

#### Brief Cards (2-column grid)
1. **Strategy Card**
   - **H4:** "Strategy"
   - **Copy:** "Go incog. Psychological warfare mastered. When noobs flex, we don't trip — we execute."

2. **The Anthem Card**
   - **H4:** "The Anthem"
   - **Copy:** "GRINCH didn't just drop a song — he detonated a masterpiece. Engineered to live rent-free."

#### Stats Row (3-column, auto-counting)
- Counter format: `.counter(end, duration)` with easing
- **Stat 1:** [COUNT] "VICTORIES"
- **Stat 2:** [COUNT] "LEGENDS"
- **Stat 3:** [COUNT] "SLITHERS"

---

### SCREEN 3: ROSTER (Dossier Cards)
**ID:** `maze-anchor` panel 1 | **Type:** Maze panel
**Background:** Gradient `180deg, #0c0a04, #0f0d08, #0c0a04`

#### Section Heading
- **Tag:** "PERSONNEL" (gold) | **Title:** "The **Roster**"
- **Copy:** "Every card is a warning label."

#### Player Cards (4-column grid, responsive to 2-col, 1-col)
**Card Class:** `.dos` (Dossier) with "CLASSIFIED" watermark

##### Player 1: GRINCH Prime
- **Tag:** `[GTOAT] PRIME`
- **Name:** GRINCH Prime
- **Role:** "Strategy Overlord. Feeds Bella. Runs the show. Slithers with intent. Unmatched."
- **Threat Level:** 92%
  - Animated fill via `.thr-f` (width transition)
  - Color: Linear gradient gold → red

##### Player 2: Bella Protocol
- **Tag:** `[GTOAT] PROTOCOL`
- **Name:** Bella Protocol
- **Role:** "Morale engine. Happiness is mandatory. When Bella's happy, everyone eats."
- **Threat Level:** 88%

##### Player 3: Incog Elite
- **Tag:** `[GTOAT] STEALTH`
- **Name:** Incog Elite
- **Role:** "Ghost division. Stealth verified. Nobody sees the carry coming."
- **Threat Level:** 85%

##### Player 4: Breeze
- **Tag:** `[GTOAT] FUNDING`
- **Name:** Breeze
- **Role:** "Infinite budget for propaganda, vibes, and dominance theater."
- **Threat Level:** 94%

---

### SCREEN 4: INTEL FEED (Community/Media Links)
**ID:** `maze-anchor` panel 2 | **Type:** Maze panel
**Background:** Gradient `180deg, var(--deep), #060a14, var(--deep)`

#### Section Heading
- **Tag:** "INTELLIGENCE" | **Title:** "Intel **Feed**"

#### Tab Filter
Buttons: `All | Reddit | YouTube | Social | Gaming`

#### Intel Card Grid (3-column, responsive)
**20 total entries** with platform icons (Font Awesome) + links

##### Reddit Entries (6)
1. Anti-GTOAT recruitment drive
   - Desc: "Playful rivalry energy and community coordination."
   - URL: https://www.reddit.com/r/Slitherio/comments/11ocbuo

2. Who are GTOAT?
   - Desc: "Thread debating the team identity."
   - URL: https://www.reddit.com/r/Slitherio/comments/l6pcnt

3. Scoreboard encounter report
   - Desc: "High score thread — multiple GTOAT sightings."
   - URL: https://www.reddit.com/r/Slitherio/comments/l2m4sl

4. Clan support roll-call
   - Desc: "GTOAT listed among top clan allegiances."
   - URL: https://www.reddit.com/r/Slitherio/comments/m0ffnb/what_clan_u_support_the_most/

5. Teams and late-night grinds
   - Desc: "Players vent about team dynamics."
   - URL: https://www.reddit.com/r/Slitherio/comments/1r5zyj1/is_sn_a_good_clan/

6. Discord server rollout
   - Desc: "Community thread with GTOAT roles."
   - URL: https://www.reddit.com/r/Slitherio/comments/l74ft2

##### YouTube Entries (3)
1. They never miss
   - Desc: "Scoreboard inflation conspiracy #442."
   - URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

2. Why are they everywhere?
   - Desc: "Omnipresence detected."
   - URL: https://youtu.be/eQtD4Vb_aPI

3. Join The Movement
   - Desc: "Propaganda escalation in progress."
   - URL: https://www.youtube.com/shorts/feva1L-qs08

##### Social Entries (Twitter, TikTok, SoundCloud, Instagram, Facebook)
1. @gtoatg on X
   - Desc: "Official GTOAT presence."
   - URL: https://twitter.com/gtoatg

2. MONNTEKARLO on TikTok
   - Desc: "World record trapping content."
   - URL: https://www.tiktok.com/@monntekarlo

3. GTOAT Chunny on SoundCloud
   - Desc: "Original tracks by Chunny."
   - URL: https://soundcloud.com/gtoat-chunny-on-slitherio

4. #gtoat on Instagram
   - Desc: "Community content and tagged posts."
   - URL: https://www.instagram.com/explore/tags/gtoat/

5. #gtoat on TikTok
   - Desc: "GTOAT-tagged videos."
   - URL: https://www.tiktok.com/tag/gtoat

6. GTOAT on Facebook
   - Desc: "Community profiles and mentions."
   - URL: https://www.facebook.com/public/GToat

##### Gaming/Discord Entries (5)
1. Join on Discord
   - Desc: "Direct link to GTOAT Discord."
   - URL: https://discordapp.com/users/1051910783526772808

2. Slither.io Wiki
   - Desc: "GTOAT discussed on Fandom."
   - URL: https://slitherio.fandom.com/f

3. GTOAT Tournament
   - Desc: "OOTP sim tournament."
   - URL: https://forums.ootpdevelopments.com/showthread.php?t=317244

4. GTOATLogos on Pinterest
   - Desc: "Logo designs and branding."
   - URL: https://www.pinterest.com/GTOATLogos/

5. #GTOAT Analytics
   - Desc: "Hashtag tracking data."
   - URL: https://www.hashtags.org/analytics/GToAT/

#### "Show More" Toggle
- Button: `{exp ? 'Show Less' : 'Show More'} [+{extra}]`
- Initially shows 6 of 20 entries
- Badge: `<span class="badge">+{extra}</span>`

---

### SCREEN 5: ARCHIVE (Lore & Media Directory)
**ID:** `archive-maze` | **Type:** Maze container with 2 panels

#### PANEL 1: ARCHIVE (Lore Timeline)
**Background:** Gradient `180deg, #0a0806, #0d0b08, #0a0806`

##### Section Heading
- **Tag:** "CHRONICLE" (gold) | **Title:** "Full **Lore**"

##### Timeline (6 eras, `.tl` + `.tle` styles)
Each era is a `.tle` card with gold dot marker on vertical line.

1. **Early Life**
   - Copy: "Before GRINCH was GRINCH, there was just a kid with an internet connection and zero chill. Slither.io wasn't a game — it was a calling. The moment the leaderboard appeared, it became personal."

2. **Unexpected Love**
   - Copy: "Bella entered the picture and changed everything. What started as a casual duo became doctrine. Bella's happiness became the mission — and GOD MODE became policy."

3. **Identity Crisis**
   - Copy: "Who was GRINCH? A player? A brand? A meme? The identity fractured and reformed stronger. The tag [GTOAT] became a statement, not just a clan prefix."

4. **Realization & Inception**
   - Copy: "GRINCH realized that slither.io wasn't just about high scores — it was about legacy. GTOAT was founded as a vehicle for permanent scoreboard dominance and cultural warfare."

5. **Codification & Doctrine**
   - Copy: "Everything was systematized: incognito tactics, tempo control, psychological theater. GTOAT operations became repeatable, scalable, and inevitable."

6. **The Legacy Continues**
   - Copy: "GTOAT isn't finished — it's expanding. Through players, media, lore operations, and now this very website, GRINCH reorganized slither.io's entire gravitational field."

##### Ego Meter
- `.ego-meter` with `.ego-label` ("Legacy Index") and animated `.ego-bar` + `.ego-fill`

##### Call-to-Action Link
- "Read Full Lore →" link targeting `#lore` (accordion section)

#### PANEL 2: MEDIA DIRECTORY
**Grid:** Split layout (archive-split, 2-column)

##### Media List (5 items, `.ml` cards)
1. **YouTube**
   - **Title:** "Recruitment Short"
   - **Desc:** "Join The Movement propaganda."
   - **URL:** https://www.youtube.com/shorts/feva1L-qs08

2. **YouTube**
   - **Title:** "Momentum Highlight"
   - **Desc:** "They never miss — scoreboard dominance."
   - **URL:** https://www.youtube.com/watch?v=dQw4w9WgXcQ

3. **Spotify**
   - **Title:** "GRINCH's Speech"
   - **Desc:** "Streaming edition — the anthem."
   - **URL:** https://open.spotify.com/track/1aQ7CBPOohTI2zD0mvukNN

4. **Apple Music**
   - **Title:** "GRINCH's Speech"
   - **Desc:** "Apple Music — supremacy certified."
   - **URL:** https://music.apple.com/us/album/grinchs-speech/1814854157?i=1814854158

5. **Tool**
   - **Title:** "NTL Mod Extension"
   - **Desc:** "Chrome extension for Slither.io."
   - **URL:** https://chrome.google.com/webstore/detail/ntl-mod-for-slitherio/hpgaehmokjbdfkbgkeifbfogjalkpfgb?hl=en-US

---

### SCREEN 6: ACCORDION CONTENT (Collapsible Sections)

#### ACCORDION 1: THE ROSTER (Personnel)
**ID:** `players` | **Tag:** "Personnel" (gold) | **Title:** "The **Roster**" | **Num:** "01"
**Accent:** Gold | **Default Open:** true

**Content:** Same 4 player cards as Screen 3 (reused component).

#### ACCORDION 2: COMMUNITY REVIEWS
**ID:** `reviews` | **Tag:** "Intel" (cyan) | **Title:** "Community **Reviews**" | **Num:** "02"
**Accent:** Cyan

##### Review Tabs
Buttons: `All | Reddit | YouTube | Music | Discord`

##### Review Cards (10 total, `.review-card`)
Each card has:
- Platform badge (platform: reddit/youtube/music/discord)
- Title
- Description
- Intensity rating (1-5 stars, `.rv-int`)
- Tag (rant/rivalry/praise/mention)

**Sample Reviews:**
- **Reddit - "Anti-GTOAT Recruitment Drive"** (rant, intensity 4)
  - Desc: "Playful rivalry energy with scoreboard grief counseling."
  - URL: https://www.reddit.com/r/Slitherio/comments/11ocbuo

- **Reddit - "Who Are GTOAT?"** (rivalry, intensity 5)
  - Desc: "Thread debating the team identity, motivations, and slither dominance."
  - URL: https://www.reddit.com/r/Slitherio/comments/l6pcnt

- **YouTube - "They Never Miss"** (praise, intensity 5)
  - Desc: "Scoreboard inflation conspiracy confirmed by visual evidence."
  - URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

- **Music - "GRINCH's Speech"** (praise, intensity 5)
  - Desc: "The anthem. Available on Spotify, Apple Music, YouTube Music."
  - URL: https://open.spotify.com/track/1aQ7CBPOohTI2zD0mvukNN

[... 6 more entries follow same pattern ...]

#### ACCORDION 3: FULL LORE
**ID:** `lore` | **Tag:** "Chronicle" (gold) | **Title:** "Full **Lore**" | **Num:** "03"
**Accent:** Purple

**Content:** Same 6 timeline eras as Archive Panel 1, displayed as `.lore-card` grid.

#### ACCORDION 4: MEDIA DIRECTORY
**ID:** `media` | **Tag:** "Media" (purple) | **Title:** "Media **Directory**" | **Num:** "04"
**Accent:** Purple

**Content:** Media links grid + Community mentions section (Reddit cards with platform badges).

---

### SCREEN 7: CONTACT (Forms & Footer)
**ID:** `contact` | **Classes:** `scr scr-connect`
**Background:** Dark, no explicit gradient (inherits default)

#### Left Column: "LET'S CONNECT" Headline
```
LET'S
[CONNECT] (gradient)
```

**Subheading:** "Ready to join the greatest team in Slither.io history? Drop us a message."

#### Contact Chips (5 quick links)
1. `<a href="https://discordapp.com/users/1051910783526772808" target="_blank" class="chip">`
   - Icon: `fab fa-discord`
   - Text: "Discord"

2. `<a href="https://twitter.com/gtoatg" target="_blank" class="chip">`
   - Icon: `fab fa-twitter`
   - Text: "Twitter"

3. `<a href="tel:+18884862820" class="chip">`
   - Icon: `fas fa-phone`
   - Text: "(888)-GTOAT-20"

4. `<a href="https://www.tiktok.com/@monntekarlo" target="_blank" class="chip">`
   - Icon: `fab fa-tiktok`
   - Text: "TikTok"

5. `<a href="https://soundcloud.com/gtoat-chunny-on-slitherio" target="_blank" class="chip">`
   - Icon: `fab fa-soundcloud`
   - Text: "SoundCloud"

#### Right Column: Contact Form
**Form ID:** (unnamed) | **Method:** JavaScript (EmailJS)

**Fields:**
1. **In-Game Name**
   - Input ID: `cf-ign`
   - Placeholder: "Your Slither.io name"
   - Required: true
   - AutoComplete: off

2. **Discord Username**
   - Input ID: `cf-discord`
   - Placeholder: "username#0000"
   - Required: true
   - AutoComplete: off
   - SpellCheck: false

3. **Message**
   - TextArea ID: `cf-message`
   - Placeholder: "Tell us why you're ready…"
   - Required: true

**Submit Button:**
- Text: "SEND MESSAGE" (or "TRANSMITTING…" when loading)
- Disabled state while sending
- Status message (`.fst`):
  - Success: "Message transmitted." (`.ok` class)
  - Error: "Transmission failed — check your connection and try again." (`.er` class)

#### EmailJS Configuration
- **Service ID:** `service_7zuc9uf`
- **Template ID:** `template_i8cfmmc`
- **Public Key:** `kgGZFZlIe8-RoS2vx`
- **Payload Fields:** `inGameName`, `discordUsername`, `message`

#### Footer
- **Copyright:** "GTOAT © [year]"
- **Hidden Easter Egg Link:** `.` (opacity .12, size .45rem) → `hs.html` (high scores)
- **Social Links (`.ftr-s`):**
  - Twitter: https://twitter.com/gtoatg
  - YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  - Discord: https://discord.com/users/1051910783526772808
  - TikTok: https://www.tiktok.com/@monntekarlo
  - Instagram: https://www.instagram.com/explore/tags/gtoat/
  - Pinterest: https://www.pinterest.com/GTOATLogos/
- **Another Hidden Link:** `.` (opacity .1, size .4rem) → `al.html` (activity log)

---

## SECONDARY PAGES

### PAGE: hs.html (Highscores Dashboard)
**Title:** "GTOAT Highscores Dashboard"
**Purpose:** Private dashboard (password-protected auth screen) displaying score analytics

**Key Sections:**
1. **Auth Screen** (`.auth-overlay`)
   - Username field
   - Password field
   - "Remember me" checkbox
   - Submit button
   - Error message display

2. **Dashboard** (`.dashboard`, hidden until auth)
   - **Header:** Title + Session badge + Logout button
   - **Time Range Tabs:** Buttons for different date ranges (all active)
   - **Summary Cards Grid** (6-column): Key metrics with color-coded values
     - Each card: label, numeric value, sub-text
     - Color scheme: green, blue, gold, purple, pink, cyan
   - **Snapshot Cards** (4 columns): Time-specific metric cards
   - **Top 5 Grid** (5 columns): Leaderboard cards
   - **Charts Section:** Chart.js instances (line, bar, pie)
   - **Responsive Breakpoints:**
     - 1200px: 3-column summary grid
     - 768px: 2-column summary, 2-column snapshot
     - 480px: 1-column for all grids

**Design Tokens:** Separate color palette (--bg, --bg2, --panel, --line, --text, --muted, --green, --blue, --pink, --gold, --purple, --red, --cyan)

**Data Source:** Supabase queries (tables not visible in code, but client initialized)

---

### PAGE: al.html (Activity Log)
**Title:** "GTOAT Activity Log"
**Purpose:** Public/private visitor analytics and activity tracking

**Key Sections:**
1. **Auth Screen** (`.login-card` with gradient border + glow animation)
   - Password field
   - "Remember login" checkbox
   - Submit button with gradient
   - Error display

2. **Dashboard** (`.dash-wrap`, hidden until auth)
   - **Header:** Title + Visit badge + Back button
   - **Time Range Tabs:** Date range selectors
   - **Summary Cards Grid** (6-column, responsive)
   - **Snapshot Cards** (4-column)
   - **Geo Breakdown** (3-column geo panels)
     - Country/region + visit count badges
     - Scrollable lists
   - **Charts Grid** (2-column, wide option)
     - Chart.js instances (visit trends, device types, etc.)
   - **Insights Row** (2-column)
     - Top referrers list (scrollable)
     - Top links list (scrollable)
   - **Activity Table** (filterable, sortable)
     - Columns: timestamp, IP, country, device, referrer, page, action
     - Search input field
     - Pagination controls
     - Sort arrows on headers

**Design Tokens:** Same palette as hs.html

**Data Source:** Supabase queries + Chart.js visualizations

---

## ASSET PATHS

### Image Assets
```
img/logo.png                 — Header nav logo
img/banner_bg.png            — Hero background image
img/favicon.png              — Favicon
```

### Script Files (Game Engine)
```
game/constants.js            — Game constants
game/spatialHash.js          — Spatial partitioning
game/snake.js                — Snake entity
game/world.js                — Game world/state
game/ai.js                   — AI logic
game/bots.js                 — Bot implementations
game/engine.js               — Game engine loop
game/renderer.js             — Canvas renderer
game/slither.js              — Main game wrapper
game/slither.css             — Game styles
```

### JS Files
```
js/activity-logger.js        — Analytics logging for al.html
```

---

## SUPABASE INTEGRATION

### Client Initialization
```javascript
window.GTOAT_SUPABASE = window.supabase.createClient(
  'https://nndyngflhsqcvryclkbc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZHluZ2ZsaHNxY3ZyeWNsa2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzMyMTksImV4cCI6MjA5MDIwOTIxOX0.iP63FibyKsAFDKrz1r_-fer1sZ9R39ZOk0WkW2DNRWQ'
);
```

### Likely Tables (inferred from usage)
- `scores` or `leaderboard` — High score data (hs.html queries)
- `visits` or `activity_log` — Activity tracking (al.html queries)
- `users` — Player profiles (if stored)
- `contacts` or `messages` — Contact form submissions (EmailJS integration)

### Queries Pattern
- `.from('table_name')` pattern expected in Supabase queries
- No explicit query code visible in main HTML; likely in activity-logger.js or dashboard JS bundles

---

## EXTERNAL SERVICES

### EmailJS
- **Service:** Contact form submissions
- **Service ID:** `service_7zuc9uf`
- **Template ID:** `template_i8cfmmc`
- **Public Key:** `kgGZFZlIe8-RoS2vx`
- **Endpoint:** https://api.emailjs.com

### Google Analytics
- **GA4 Property ID:** `G-ZWH1CDXERZ`
- **Script:** https://www.googletagmanager.com/gtag/js

### CDN Libraries
- React 18.2.0 (production build)
- React-DOM 18.2.0 (production build)
- Babel Standalone 7.22.9 (for JSX compilation)
- Supabase JS 2.x (UMD)
- Chart.js 4.x (UMD)
- Font Awesome 6.4.0 (CSS + icons)
- Google Fonts: Unbounded, Manrope, JetBrains Mono, Orbitron, Syne

---

## NAVIGATION & SCREEN IDs

### Main Screens Array
```javascript
const SCREENS = ['home', 'maze-anchor', 'archive-maze', 'content-maze', 'contact'];
const SCREEN_LABELS = ['Home', 'Archive', 'Dossier', 'Content', 'Contact'];
```

### Navigation Elements
- **Dot Nav:** Fixed right side, clickable dots scrolling to each screen
- **Header Nav:** Logo + music links + mobile hamburger menu
- **Mobile Nav:** Fixed right sidebar, slides in on hamburger click
- **Nav Links:** Home, Explore, Archive, Intel, Contact (with smooth scroll)

---

## EASTER EGGS & PERSONALITY QUIRKS

1. **"GRINCH" Identity** — Framed as a player persona; references to "Bella's happiness" as mission-critical
2. **"GOD MODE" Policy** — Kept Bella happy is explicitly tied to dominance doctrine
3. **Rickroll Link** — YouTube link "They never miss" points to famous rickroll (https://www.youtube.com/watch?v=dQw4w9WgXcQ)
4. **Hidden Footer Links** — `.hs.html` and `.al.html` hidden in footer via opacity .12/.1, tiny font (.45rem/.4rem)
5. **Threat Levels** — Framed as military/espionage metrics; highest threat is "Breeze" (94%), "GRINCH Prime" (92%)
6. **Clown Emoji in CTA** — Plays into self-aware "Greatest JOKE Of All Time" premise
7. **Pupil-Tracking Eyes** — Interactive mouse-following eyes on clown face during hero stage
8. **Typing Effect** — Lore text animates with typewriter effect on scroll (ref: `const full = 'GRINCH needs your HELP!...'`)
9. **Psychological Warfare Framing** — "incognito tactics," "psychological theater," "cultural warfare" used legitimately in lore
10. **"If Bella ain't Happy, NO ONE IS"** — Running joke tied to strategy; Bella is the "morale engine"

---

## TYPOGRAPHY & VOICE EXAMPLES

### 5 Most Personality-Defining Copy Lines (VERBATIM)
1. **"GRINCH needs your HELP! If Bella ain't Happy, NO ONE IS! We can't let that happen! Join GTOAT and feed Bella!"**
   - *Context:* Typing effect text in maze panel; existential team mission

2. **"Every card is a warning label."**
   - *Context:* Roster section subtitle; framing players as dangerous

3. **"Everything was systematized: incognito tactics, tempo control, psychological theater. GTOAT operations became repeatable, scalable, and inevitable."**
   - *Context:* Lore "Codification & Doctrine" era; pseudo-corporate-military tone

4. **"GRINCH reorganized slither.io's entire gravitational field."**
   - *Context:* Final lore line; grandiloquent, maximalist language

5. **"Infinite budget for propaganda, vibes, and dominance theater."**
   - *Context:* Breeze player card role description; self-aware irony meeting actual team function

---

## MOBILE RESPONSIVENESS

### Key Breakpoints
- **768px:** Mobile hamburger nav appears; maze-track disables; panels stack vertically
- **640px:** Roster grid switches 4-col → 2-col → 1-col; brief-grid → single column
- **480px:** Single-column layouts throughout; reduced font sizes (clamp usage)

### Mobile-Specific UI
- `.mobile-bar` — Fixed bottom bar with action buttons (hidden on desktop)
- `.nav-ham` — Hamburger button (hidden > 768px)
- `.nav-overlay` — Tap-away overlay for mobile menu
- Scrollbar hidden via `scrollbar-width: none` on body

---

## GLOBAL PAGE METADATA

### Meta Tags
- **Charset:** UTF-8
- **Viewport:** `width=device-width, initial-scale=1.0`
- **Robots:** `index, follow, max-image-preview:large`
- **Description:** "GTOAT - The Greatest Team Of All Time, dominating Slither.io with style and strategy."
- **Keywords:** "GTOAT, Slither.io, gaming, team, Discord, GRINCH"
- **Author:** "GTOAT Team"
- **Theme Color:** `#04060d`

### OG/Social Tags
- **OG Title:** "GTOAT - Greatest Team Of All Time"
- **OG Description:** "Elite Slither.io dominance, relentless discipline, and the loudest team on the board."
- **OG Image:** https://gtoat.com/img/banner_bg.png
- **OG URL:** https://gtoat.com/
- **Twitter Card:** `summary_large_image`

### Structured Data (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "GTOAT",
  "url": "https://gtoat.com/",
  "logo": "https://gtoat.com/img/logo.png",
  "description": "Elite Slither.io dominance.",
  "sameAs": [
    "https://discord.com/users/1051910783526772808",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://twitter.com/gtoatg"
  ]
}
```

### Canonical URL
```html
<link rel="canonical" href="https://gtoat.com/">
```

---

## BUILD & DEPLOYMENT NOTES

### Performance Optimizations
- CSS animations use `will-change` and `transform3d` for GPU acceleration
- Images preloaded: `<link rel="preload" as="image" href="img/banner_bg.png">`
- DNS prefetch: Supabase + EmailJS + Google Fonts + CDN
- Progress bar (`.prog`) on document scroll (top 2px strip)
- Reduce-motion media query: All animations disabled for accessibility

### Browser Support
- Modern CSS Grid/Flexbox (no IE11 fallbacks visible)
- CSS custom properties (var() throughout)
- ES6+ JavaScript (arrow functions, const/let, fetch API)
- Smooth scroll behavior via CSS

### Accessibility
- ARIA labels on buttons: `aria-label`, `aria-current`, `aria-expanded`, `aria-live`
- Focus-visible outlines (2px cyan)
- Semantic HTML5 (nav, section, label, form, button)
- Color contrast ratios meet WCAG AA on main text
- Reduced-motion support

---

## DEVELOPMENT WORKFLOW

### File Organization for Rebuild
```
gtoat.com-3.0/
├── index.html              (main SPA)
├── hs.html                 (dashboard)
├── al.html                 (activity log)
├── css/
│   ├── main.css            (refactored from inline)
│   ├── dashboard.css       (hs + al shared)
│   └── animations.css
├── js/
│   ├── app.jsx             (React components, split)
│   ├── activity-logger.js
│   └── game/               (slither.io game files)
├── img/
│   ├── logo.png
│   ├── banner_bg.png
│   └── favicon.png
└── docs/
    └── CONTENT_INVENTORY.md (this file)
```

### Key Implementation Details
- **React State Mgmt:** useState hooks for form, screen nav, accordion toggles
- **Scroll Observers:** IntersectionObserver for lazy animations, screen detection
- **Maze Scroll:** requestAnimationFrame + serpentine waypoints (odd panels drop 40vh)
- **Form Handling:** Controlled inputs, EmailJS SDK async submit, error/success states
- **Supabase:** Async queries for dashboard data; real-time listeners possible
- **Analytics:** Google Analytics gtag() calls; activity-logger.js for custom events

