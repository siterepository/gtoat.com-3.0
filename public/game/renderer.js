(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};
  const C = lib.CONSTANTS;
  const FALLBACK_PLAYER_PATTERN = ['#f3f3f3', '#f3f3f3', '#f3f3f3', '#f3f3f3', '#f3f3f3', '#f3f3f3', '#e34b4b', '#e34b4b', '#ffd84d', '#5fcd70', '#f3f3f3'];

  // --- Cached constants for speed ---
  const TWO_PI = Math.PI * 2;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cam = { x: 0, y: 0, zoom: 1 };
      this.pointerWorldX = 0;
      this.pointerWorldY = 0;
      this.pointerActive = false;
      this.lowFx = false;
      this._frameTime = 0;
      // Gradient caches (invalidated on resize)
      this._bgGrad = null;
      this._nebulaGrad = null;
      this._vignetteGrad = null;
      this._cachedW = 0;
      this._cachedH = 0;
      // Motion trail ring buffer for player head (ghost positions)
      this._trailPositions = [];
      this._trailMax = 8;
      // Death burst flash tracker: pellet id -> flash remaining (0-1)
      this._deathFlashes = new Map();
      // Death explosion particles
      this._deathParticles = [];
      this._cameraShakeFrames = 0;
      // Food collection sparkle particles
      this._eatParticles = [];
      // Ambient dust motes
      this._dustMotes = [];
      this._dustInitialized = false;
      // Boost speed-line particles
      this._boostTrailParticles = [];
      // Bot blink tracking: bot id -> next blink time
      this._botBlinkTimers = new Map();
      this.resize();
    }

    setPointerWorldTarget(x, y, active) {
      this.pointerWorldX = x;
      this.pointerWorldY = y;
      this.pointerActive = !!active;
    }

    setLowFx(enabled) {
      this.lowFx = !!enabled;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.canvas.width = Math.floor(this.width * dpr);
      this.canvas.height = Math.floor(this.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cx = this.width * 0.5;
      this.cy = this.height * 0.5;
      // Invalidate gradient caches
      this._bgGrad = null;
      this._nebulaGrad = null;
      this._vignetteGrad = null;
      this._cachedW = 0;
      this._cachedH = 0;
    }

    updateCamera(player) {
      const head = player.segments[0];
      this.cam.x = lib.lerp(this.cam.x, head.x, C.CAMERA_LERP);
      this.cam.y = lib.lerp(this.cam.y, head.y, C.CAMERA_LERP);
      const targetZoom = lib.clamp(C.ZOOM_BASE - player.mass * C.ZOOM_PER_MASS, C.ZOOM_MIN, C.ZOOM_BASE);
      this.cam.zoom = lib.lerp(this.cam.zoom, targetZoom, 0.09);
    }

    worldToScreen(x, y) {
      const z = this.cam.zoom;
      return { x: (x - this.cam.x) * z + this.cx, y: (y - this.cam.y) * z + this.cy };
    }

    screenToWorld(x, y) {
      const z = this.cam.zoom;
      return { x: (x - this.cx) / z + this.cam.x, y: (y - this.cy) / z + this.cam.y };
    }

    // --- Cached gradient builders ---
    _ensureGradients() {
      const w = this.width;
      const h = this.height;
      if (this._cachedW === w && this._cachedH === h && this._bgGrad) return;
      this._cachedW = w;
      this._cachedH = h;
      const ctx = this.ctx;
      const cx = this.cx;
      const cy = this.cy;
      const diag = Math.sqrt(w * w + h * h) * 0.5;

      // Base radial gradient: dark navy nebula
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, diag);
      bg.addColorStop(0, '#0a1628');
      bg.addColorStop(0.5, '#071020');
      bg.addColorStop(1, '#050a1a');
      this._bgGrad = bg;

      // Nebula glow overlay
      const neb = ctx.createRadialGradient(cx * 0.95, cy * 0.9, 0, cx, cy, diag * 0.7);
      neb.addColorStop(0, 'rgba(25,55,120,0.18)');
      neb.addColorStop(0.4, 'rgba(15,35,80,0.08)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      this._nebulaGrad = neb;

      // Vignette: more dramatic
      const vig = ctx.createRadialGradient(cx, cy, h * 0.14, cx, cy, h * 0.82);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.7, 'rgba(0,0,0,0.18)');
      vig.addColorStop(1, 'rgba(0,0,0,0.58)');
      this._vignetteGrad = vig;
    }

    // --- Enhancement 6: Ambient dust motes ---
    _initDustMotes() {
      this._dustMotes = [];
      for (let i = 0; i < 30; i++) {
        this._dustMotes.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          size: 2 + Math.random() * 2,
          alpha: 0.15 + Math.random() * 0.15
        });
      }
      this._dustInitialized = true;
    }

    _updateAndDrawDustMotes() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      for (let i = 0; i < this._dustMotes.length; i++) {
        const m = this._dustMotes[i];
        m.x += m.vx;
        m.y += m.vy;
        // Wrap around screen edges
        if (m.x < -m.size) m.x = w + m.size;
        if (m.x > w + m.size) m.x = -m.size;
        if (m.y < -m.size) m.y = h + m.size;
        if (m.y > h + m.size) m.y = -m.size;

        ctx.fillStyle = `rgba(160,190,255,${m.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, TWO_PI);
        ctx.fill();
      }
    }

    drawBackground() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      ctx.clearRect(0, 0, w, h);

      this._ensureGradients();

      // Base nebula background
      ctx.fillStyle = this._bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Nebula glow layer
      if (!this.lowFx) {
        ctx.fillStyle = this._nebulaGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Grid lines with subtle pulse
      const z = this.cam.zoom;
      const step = (this.lowFx ? 62 : 42) * z;
      const ox = ((-this.cam.x * z) % step + step) % step;
      const oy = ((-this.cam.y * z) % step + step) % step;
      const pulse = this.lowFx ? 0 : Math.sin(this._frameTime * 0.8) * 0.008;
      const gridAlpha = (this.lowFx ? 0.028 : 0.052) + pulse;
      ctx.strokeStyle = `rgba(140,180,255,${gridAlpha})`;
      ctx.lineWidth = 1;
      const lineStride = this.lowFx ? 2 : 1;
      let lineI = 0;
      ctx.beginPath();
      for (let x = -step; x <= w + step; x += step) {
        if ((lineI++ % lineStride) !== 0) continue;
        const xp = x + ox;
        ctx.moveTo(xp, 0);
        ctx.lineTo(xp, h);
      }
      lineI = 0;
      for (let y = -step; y <= h + step; y += step) {
        if ((lineI++ % lineStride) !== 0) continue;
        const yp = y + oy;
        ctx.moveTo(0, yp);
        ctx.lineTo(w, yp);
      }
      ctx.stroke();

      // Ambient dust motes (after grid, before vignette)
      if (!this.lowFx) {
        if (!this._dustInitialized) this._initDustMotes();
        this._updateAndDrawDustMotes();
      }

      // Vignette overlay (more cinematic)
      ctx.fillStyle = this._vignetteGrad;
      ctx.fillRect(0, 0, w, h);
    }

    drawBoundary(radius) {
      const ctx = this.ctx;
      const c = this.worldToScreen(0, 0);
      ctx.strokeStyle = 'rgba(146,188,255,0.26)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius * this.cam.zoom, 0, TWO_PI);
      ctx.stroke();
    }

    drawPellets(pellets, alpha) {
      const ctx = this.ctx;
      const z = this.cam.zoom;
      const camX = this.cam.x;
      const camY = this.cam.y;
      const cx = this.cx;
      const cy = this.cy;
      const w = this.width;
      const h = this.height;
      const t = this._frameTime;
      const lowFx = this.lowFx;

      // Culling margin: generous so pellets don't pop at edges
      const margin = 40;
      // Edge band: pellets in this outer band skip glow to reduce overdraw
      const edgeBand = 60;

      const sparkleStride = pellets.length > 1800 ? 6 : 4;
      const breatheBase = Math.sin(t * 2.2);

      // Batch: collect pellets then draw in glow-pass / solid-pass / highlight-pass
      // to minimize fillStyle thrashing. For simplicity and memory,
      // we do a single pass but track previous hue bucket to avoid redundant fillStyle sets.
      let prevGlowHue = -1;
      let prevSolidHue = -1;

      for (let i = 0; i < pellets.length; i++) {
        const p = pellets[i];
        const px = lib.lerp(p.px, p.x, alpha);
        const py = lib.lerp(p.py, p.y, alpha);
        const sx = (px - camX) * z + cx;
        const sy = (py - camY) * z + cy;
        // Culling with generous margin
        if (sx < -margin || sx > w + margin || sy < -margin || sy > h + margin) continue;

        const baseR = (2 + p.value * 0.78) * z;

        // Death burst flash
        let flashAlpha = 0;
        if (this._deathFlashes.has(p)) {
          flashAlpha = this._deathFlashes.get(p);
        }

        // Determine if pellet is near the edge (skip glow for edge pellets)
        const nearEdge = sx < edgeBand || sx > w - edgeBand || sy < edgeBand || sy > h - edgeBand;

        // --- Glow layer ---
        if (!lowFx && !nearEdge) {
          // Breathing glow: radius oscillates subtly based on pellet value
          const breathe = 1 + breatheBase * (0.06 + p.value * 0.02);
          const glowR = baseR * (2.2 + p.value * 0.3) * breathe;
          const glowAlpha = 0.22 + flashAlpha * 0.4;
          const hBucket = (p.hue / 10 | 0) * 10; // bucket hues to reduce fillStyle changes
          if (hBucket !== prevGlowHue) {
            ctx.fillStyle = `hsla(${p.hue},96%,60%,${glowAlpha.toFixed(2)})`;
            prevGlowHue = hBucket;
          } else {
            ctx.fillStyle = `hsla(${p.hue},96%,60%,${glowAlpha.toFixed(2)})`;
          }
          ctx.beginPath();
          ctx.arc(sx, sy, glowR, 0, TWO_PI);
          ctx.fill();
        }

        // Death flash burst (extra bright ring)
        if (flashAlpha > 0.01) {
          ctx.fillStyle = `rgba(255,255,255,${(flashAlpha * 0.6).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, baseR * (2.5 + flashAlpha * 2), 0, TWO_PI);
          ctx.fill();
        }

        // --- Solid pellet ---
        const solidHBucket = (p.hue / 10 | 0) * 10;
        if (solidHBucket !== prevSolidHue) {
          ctx.fillStyle = `hsl(${p.hue},96%,61%)`;
          prevSolidHue = solidHBucket;
        } else {
          ctx.fillStyle = `hsl(${p.hue},96%,61%)`;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, baseR, 0, TWO_PI);
        ctx.fill();

        // --- Highlight dot ---
        if ((i % sparkleStride) === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.72)';
          ctx.beginPath();
          ctx.arc(sx - baseR * 0.25, sy - baseR * 0.25, baseR * 0.36, 0, TWO_PI);
          ctx.fill();
        }
      }

      // Decay death flashes
      if (this._deathFlashes.size > 0) {
        for (const [key, val] of this._deathFlashes) {
          const next = val - 0.06;
          if (next <= 0) this._deathFlashes.delete(key);
          else this._deathFlashes.set(key, next);
        }
      }
    }

    // Call this when a snake dies and drops pellets for the burst effect
    notifyDeathPellets(pellets) {
      if (this.lowFx) return;
      for (let i = 0; i < pellets.length; i++) {
        this._deathFlashes.set(pellets[i], 1.0);
      }
    }

    // --- Enhancement 2: Death explosion particles ---
    notifyDeath(x, y, hue) {
      if (this.lowFx) return;
      const screenPos = this.worldToScreen(x, y);
      // Spawn 20 particles radiating outward
      for (let i = 0; i < 20; i++) {
        const angle = (TWO_PI / 20) * i + (Math.random() - 0.5) * 0.4;
        const speed = 60 + Math.random() * 120;
        this._deathParticles.push({
          x: screenPos.x,
          y: screenPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: 0.016 + Math.random() * 0.008,
          size: 2 + Math.random() * 3,
          hue: hue
        });
      }
      // Expanding ring shockwave
      this._deathParticles.push({
        x: screenPos.x,
        y: screenPos.y,
        vx: 0,
        vy: 0,
        life: 1.0,
        decay: 0.025,
        size: 0,
        hue: hue,
        isRing: true,
        ringRadius: 5
      });
      // Camera shake for 3 frames
      this._cameraShakeFrames = 3;
    }

    _updateAndDrawDeathParticles(dt) {
      const ctx = this.ctx;
      for (let i = this._deathParticles.length - 1; i >= 0; i--) {
        const p = this._deathParticles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
          this._deathParticles.splice(i, 1);
          continue;
        }
        if (p.isRing) {
          p.ringRadius += 4;
          ctx.strokeStyle = `hsla(${p.hue},90%,65%,${(p.life * 0.6).toFixed(2)})`;
          ctx.lineWidth = 2 * p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.ringRadius, 0, TWO_PI);
          ctx.stroke();
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.96;
          p.vy *= 0.96;
          ctx.fillStyle = `hsla(${p.hue},90%,65%,${(p.life * 0.8).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, TWO_PI);
          ctx.fill();
        }
      }
    }

    // --- Enhancement 3: Food collection sparkles ---
    notifyPelletEat(x, y, hue) {
      if (this.lowFx) return;
      const screenPos = this.worldToScreen(x, y);
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * TWO_PI;
        const speed = 20 + Math.random() * 40;
        this._eatParticles.push({
          x: screenPos.x,
          y: screenPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: 0.033 + Math.random() * 0.015,
          size: 1.5 + Math.random() * 1.5,
          hue: hue
        });
      }
    }

    _updateAndDrawEatParticles(dt) {
      const ctx = this.ctx;
      const headX = this.cx;
      const headY = this.cy;
      for (let i = this._eatParticles.length - 1; i >= 0; i--) {
        const p = this._eatParticles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
          this._eatParticles.splice(i, 1);
          continue;
        }
        // Attract toward center (player head approx location)
        const dx = headX - p.x;
        const dy = headY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx += (dx / dist) * 3;
        p.vy += (dy / dist) * 3;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const sparkle = 0.5 + Math.sin(this._frameTime * 12 + i) * 0.5;
        ctx.fillStyle = `hsla(${p.hue},95%,75%,${(p.life * 0.7 * sparkle).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TWO_PI);
        ctx.fill();
      }
    }

    // --- Enhancement 4: Boost speed lines ---
    _drawBoostSpeedLines(playerBoosting) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const cx = this.cx;
      const cy = this.cy;
      const t = this._frameTime;
      const lineCount = 10;
      for (let i = 0; i < lineCount; i++) {
        const angle = (TWO_PI / lineCount) * i + t * 0.8;
        const edgeX = cx + Math.cos(angle) * (w * 0.7);
        const edgeY = cy + Math.sin(angle) * (h * 0.7);
        const innerX = cx + Math.cos(angle) * (w * 0.3);
        const innerY = cy + Math.sin(angle) * (h * 0.3);
        const lineAlpha = 0.08 + Math.sin(t * 3 + i * 1.3) * 0.04;
        ctx.strokeStyle = `rgba(180,200,255,${lineAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(edgeX, edgeY);
        ctx.lineTo(innerX, innerY);
        ctx.stroke();
      }
    }

    drawSnake(snake, alpha) {
      const ctx = this.ctx;
      const z = this.cam.zoom;
      const camX = this.cam.x;
      const camY = this.cam.y;
      const cx = this.cx;
      const cy = this.cy;
      const len = snake.segments.length;
      const head = snake.segments[0];
      const hx0 = lib.lerp(head.px, head.x, alpha);
      const hy0 = lib.lerp(head.py, head.y, alpha);
      const hs0x = (hx0 - camX) * z + cx;
      const hs0y = (hy0 - camY) * z + cy;
      const hs0 = { x: hs0x, y: hs0y };
      const segStep = (!snake.isPlayer && this.lowFx) ? 2 : 1;
      const playerPattern = (snake.skinPattern && snake.skinPattern.length) ? snake.skinPattern : FALLBACK_PLAYER_PATTERN;
      const lowFx = this.lowFx;

      const score = typeof snake.score === 'number' ? snake.score : 10;
      const cappedScore = Math.min(50000, Math.max(10, score));
      const sizeFromMass = 1 + lib.clamp((Math.sqrt(Math.max(1, snake.mass)) - 5) * 0.026, 0, 0.24);
      const sizeFromScore = 1 + lib.clamp((Math.log10(cappedScore) - 1) * 0.11, 0, 0.20);
      const baseBody = C.BODY_RADIUS * sizeFromMass * sizeFromScore;

      if (snake.isPlayer) {
        const hs = hs0;
        const tubeR = (baseBody + 1.4) * z;

        // --- Enhancement 1: Enhanced motion trail (ghost positions behind head) ---
        if (!lowFx && len > 1) {
          // Update trail ring buffer
          this._trailPositions.push({
            x: hs.x, y: hs.y,
            boosting: !!snake.boosting
          });
          if (this._trailPositions.length > this._trailMax) {
            this._trailPositions.shift();
          }
          // Draw connected gradient trail segments using skin pattern colors
          const trailLen = this._trailPositions.length;
          if (trailLen > 1) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let ti = 0; ti < trailLen - 1; ti++) {
              const tp = this._trailPositions[ti];
              const tpNext = this._trailPositions[ti + 1];
              const frac = (ti + 1) / (trailLen + 2);
              const trailAlpha = frac * (snake.boosting ? 0.35 : 0.15);
              const trailWidth = tubeR * (snake.boosting ? 2.4 : 1.8) * frac;
              const colorIdx = ti % playerPattern.length;
              const color = playerPattern[colorIdx];
              // Parse color for gradient trail
              ctx.globalAlpha = trailAlpha;
              ctx.strokeStyle = color;
              ctx.lineWidth = trailWidth;
              ctx.beginPath();
              ctx.moveTo(tp.x, tp.y);
              ctx.lineTo(tpNext.x, tpNext.y);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          // When boosting: spawn speed-line trail particles
          if (snake.boosting) {
            for (let bi = 0; bi < 2; bi++) {
              const angle = Math.random() * TWO_PI;
              const speed = 30 + Math.random() * 50;
              this._boostTrailParticles.push({
                x: hs.x + (Math.random() - 0.5) * tubeR * 2,
                y: hs.y + (Math.random() - 0.5) * tubeR * 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.04 + Math.random() * 0.02,
                size: 1 + Math.random() * 2
              });
            }
          }
        }

        // --- Enhancement 5: Drop shadows beneath player body segments ---
        if (!lowFx && len > 1) {
          for (let i = len - 1; i >= 1; i--) {
            const seg = snake.segments[i];
            const x = lib.lerp(seg.px, seg.x, alpha);
            const y = lib.lerp(seg.py, seg.y, alpha);
            const sx = (x - camX) * z + cx;
            const sy = (y - camY) * z + cy;
            if (sx < -140 || sx > this.width + 140 || sy < -140 || sy > this.height + 140) continue;
            const t = i / len;
            const radius = (baseBody + (1 - t) * 2.6) * z;
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.beginPath();
            ctx.arc(sx + 1.5 * z, sy + 2 * z, radius * 1.08, 0, TWO_PI);
            ctx.fill();
          }
        }

        // Layer 2: slither-like tube backbone with body glow
        if (len > 1) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // --- Enhancement 5: Bezier curves for smoother body ---
          if (!lowFx && len > 2) {
            // Use quadratic Bezier curves between segments
            ctx.beginPath();
            const lastSeg = snake.segments[len - 1];
            const lastX = lib.lerp(lastSeg.px, lastSeg.x, alpha);
            const lastY = lib.lerp(lastSeg.py, lastSeg.y, alpha);
            ctx.moveTo((lastX - camX) * z + cx, (lastY - camY) * z + cy);
            for (let i = len - 2; i >= 0; i--) {
              const seg = snake.segments[i];
              const sx = (lib.lerp(seg.px, seg.x, alpha) - camX) * z + cx;
              const sy = (lib.lerp(seg.py, seg.y, alpha) - camY) * z + cy;
              if (i > 0) {
                const nextSeg = snake.segments[i - 1];
                const nx = (lib.lerp(nextSeg.px, nextSeg.x, alpha) - camX) * z + cx;
                const ny = (lib.lerp(nextSeg.py, nextSeg.y, alpha) - camY) * z + cy;
                const midX = (sx + nx) * 0.5;
                const midY = (sy + ny) * 0.5;
                ctx.quadraticCurveTo(sx, sy, midX, midY);
              } else {
                ctx.lineTo(sx, sy);
              }
            }
          } else {
            ctx.beginPath();
            for (let i = len - 1; i >= 0; i--) {
              const seg = snake.segments[i];
              const x = lib.lerp(seg.px, seg.x, alpha);
              const y = lib.lerp(seg.py, seg.y, alpha);
              const sx = (x - camX) * z + cx;
              const sy = (y - camY) * z + cy;
              if (i === len - 1) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
          }

          // Wider soft glow behind body (skip on lowFx)
          if (!lowFx) {
            ctx.shadowColor = 'rgba(100,60,200,0.45)';
            ctx.shadowBlur = tubeR * 1.6;
            // Enhancement 4: Pulsing glow on body when boosting
            if (snake.boosting) {
              const pulseGlow = 1.0 + Math.sin(this._frameTime * 8) * 0.3;
              ctx.shadowBlur = tubeR * 1.6 * pulseGlow;
              ctx.shadowColor = 'rgba(140,80,255,0.6)';
            }
          }
          ctx.strokeStyle = 'rgba(31,19,67,0.82)';
          ctx.lineWidth = tubeR * 2.2;
          ctx.stroke();
          if (!lowFx) {
            ctx.shadowBlur = 0;
          }

          ctx.strokeStyle = 'rgba(101,64,196,0.92)';
          ctx.lineWidth = tubeR * 1.72;
          ctx.stroke();
        }

        // Layer 3: colored pattern bands with head-to-tail gradient
        for (let i = len - 1; i >= 0; i--) {
          if (i === 0) continue;
          const seg = snake.segments[i];
          const x = lib.lerp(seg.px, seg.x, alpha);
          const y = lib.lerp(seg.py, seg.y, alpha);
          const sx = (x - camX) * z + cx;
          const sy = (y - camY) * z + cy;
          if (sx < -140 || sx > this.width + 140 || sy < -140 || sy > this.height + 140) continue;
          const t = i / len;
          const radius = (baseBody + (1 - t) * 2.6) * z;
          const band = playerPattern[(i - 1 + playerPattern.length) % playerPattern.length];

          // Head-to-tail opacity gradient: head is fully opaque, tail fades slightly
          const bodyAlpha = lowFx ? 1 : (0.78 + (1 - t) * 0.22);
          ctx.globalAlpha = bodyAlpha;
          ctx.fillStyle = band;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, TWO_PI);
          ctx.fill();

          if ((i % 3) === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(sx - radius * 0.24, sy - radius * 0.2, radius * 0.34, 0, TWO_PI);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // Player head marker: high-visibility clown emoji
        const clownSize = Math.max(28, 34 * z);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${clownSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        if (!lowFx) {
          ctx.shadowColor = 'rgba(0,0,0,0.72)';
          ctx.shadowBlur = 10 * z;
        }
        ctx.fillText('\uD83E\uDD21', hs.x, hs.y + 0.5);
        ctx.shadowBlur = 0;
      } else {
        // --- Non-player snake with body gradient ---
        // Wider body glow for non-player snakes
        if (!lowFx) {
          ctx.shadowColor = `hsla(${snake.hue || 200},70%,40%,0.35)`;
          ctx.shadowBlur = 8 * z;
        }
        for (let i = len - 1; i >= 0; i -= segStep) {
          const seg = snake.segments[i];
          const x = lib.lerp(seg.px, seg.x, alpha);
          const y = lib.lerp(seg.py, seg.y, alpha);
          const sx = (x - camX) * z + cx;
          const sy = (y - camY) * z + cy;
          if (sx < -140 || sx > this.width + 140 || sy < -140 || sy > this.height + 140) continue;
          const t = i / len;
          const radius = (baseBody + (1 - t) * 3) * z;

          // Head-to-tail alpha gradient
          const bodyAlpha = lowFx ? 1 : (0.74 + (1 - t) * 0.26);

          let baseColor;
          if (snake.skinPattern && snake.skinPattern.length) {
            baseColor = snake.skinPattern[i % snake.skinPattern.length];
          } else {
            // Brighter at head, darker at tail
            const light = (30 + (1 - t) * 28);
            baseColor = `hsl(${(snake.hue + (1 - t) * 18) % 360},86%,${light}%)`;
          }

          ctx.globalAlpha = bodyAlpha;
          // Shadow ring
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.arc(sx, sy, radius * 1.06, 0, TWO_PI);
          ctx.fill();
          // Body
          ctx.fillStyle = baseColor;
          ctx.beginPath();
          ctx.arc(sx, sy, radius, 0, TWO_PI);
          ctx.fill();
          // Specular highlight
          ctx.fillStyle = 'rgba(255,255,255,0.24)';
          ctx.beginPath();
          ctx.arc(sx - radius * 0.25, sy - radius * 0.22, radius * 0.44, 0, TWO_PI);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (!lowFx) {
          ctx.shadowBlur = 0;
        }
      }

      // --- Eyes (shared between player and non-player) ---
      if (len > 1) {
        const n = snake.segments[1];
        const hx = hx0;
        const hy = hy0;
        const nx = lib.lerp(n.px, n.x, alpha);
        const ny = lib.lerp(n.py, n.y, alpha);
        const a = Math.atan2(hy - ny, hx - nx);
        const ownPlayerSteering = snake.isPlayer && (snake.isOwnPlayer || (snake.playerIndex || 0) === 0) && this.pointerActive;
        const eyeAim = ownPlayerSteering
          ? Math.atan2(this.pointerWorldY - hy, this.pointerWorldX - hx)
          : a;
        const hs = hs0;
        if (snake.isPlayer) {
          // Anchor overlay directly over clown eye region.
          const eyeR = 9.6 * z;
          const lx = hs.x - 10.6 * z;
          const rx = hs.x + 10.6 * z;
          const ey = hs.y - 3.2 * z;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(lx, ey, eyeR, 0, TWO_PI);
          ctx.arc(rx, ey, eyeR, 0, TWO_PI);
          ctx.fill();

          const pupilShift = eyeR * 0.62;
          const ppx = Math.cos(eyeAim) * pupilShift;
          const ppy = Math.sin(eyeAim) * pupilShift;
          ctx.fillStyle = '#111';
          ctx.beginPath();
          ctx.arc(lx + ppx, ey + ppy, eyeR * 0.5, 0, TWO_PI);
          ctx.arc(rx + ppx, ey + ppy, eyeR * 0.5, 0, TWO_PI);
          ctx.fill();

          // Eye shine highlight (larger, more visible)
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.arc(lx + ppx - eyeR * 0.18, ey + ppy - eyeR * 0.2, eyeR * 0.2, 0, TWO_PI);
          ctx.arc(rx + ppx - eyeR * 0.18, ey + ppy - eyeR * 0.2, eyeR * 0.2, 0, TWO_PI);
          ctx.fill();

          // Bushy angry eyebrows above the eyeballs.
          const browY = ey - eyeR * 1.15;
          const browHalf = eyeR * 1.05;
          ctx.strokeStyle = '#1b1111';
          ctx.lineWidth = eyeR * 0.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(lx - browHalf, browY - eyeR * 0.18);
          ctx.lineTo(lx + browHalf * 0.72, browY + eyeR * 0.28);
          ctx.moveTo(rx - browHalf * 0.72, browY + eyeR * 0.28);
          ctx.lineTo(rx + browHalf, browY - eyeR * 0.18);
          ctx.stroke();
        } else {
          const d = 7.2 * z;
          const r = 5.8 * z;
          const eyeSpread = 1.03;
          const leX = hs.x + Math.cos(a + eyeSpread) * d;
          const leY = hs.y + Math.sin(a + eyeSpread) * d;
          const reX = hs.x + Math.cos(a - eyeSpread) * d;
          const reY = hs.y + Math.sin(a - eyeSpread) * d;

          // --- Enhancement 5: Bot blink cycle ---
          let blinkScale = 1.0;
          if (!lowFx) {
            const botId = snake.id || 0;
            if (!this._botBlinkTimers.has(botId)) {
              // Random initial blink time 3-5 seconds from now
              this._botBlinkTimers.set(botId, this._frameTime + 3 + Math.random() * 2);
            }
            const nextBlink = this._botBlinkTimers.get(botId);
            const blinkDur = 0.15;
            if (this._frameTime >= nextBlink && this._frameTime < nextBlink + blinkDur) {
              // During blink: squish vertically
              const blinkT = (this._frameTime - nextBlink) / blinkDur;
              blinkScale = blinkT < 0.5
                ? 1.0 - blinkT * 2 * 0.85
                : 0.15 + (blinkT - 0.5) * 2 * 0.85;
            } else if (this._frameTime >= nextBlink + blinkDur) {
              // Schedule next blink
              this._botBlinkTimers.set(botId, this._frameTime + 3 + Math.random() * 2);
            }
          }

          ctx.fillStyle = '#fff';
          ctx.beginPath();
          if (blinkScale < 0.99) {
            // Draw ellipse for blink
            ctx.save();
            ctx.translate(leX, leY);
            ctx.scale(1, blinkScale);
            ctx.arc(0, 0, r, 0, TWO_PI);
            ctx.restore();
            ctx.save();
            ctx.translate(reX, reY);
            ctx.scale(1, blinkScale);
            ctx.arc(0, 0, r, 0, TWO_PI);
            ctx.restore();
          } else {
            ctx.arc(leX, leY, r, 0, TWO_PI);
            ctx.arc(reX, reY, r, 0, TWO_PI);
          }
          ctx.fill();

          if (blinkScale > 0.3) {
            const pupilShift = r * 0.58;
            const ppx = Math.cos(eyeAim) * pupilShift;
            const ppy = Math.sin(eyeAim) * pupilShift;
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(leX + ppx, leY + ppy, r * 0.44, 0, TWO_PI);
            ctx.arc(reX + ppx, reY + ppy, r * 0.44, 0, TWO_PI);
            ctx.fill();

            // Eye shine highlights (non-player)
            if (!lowFx) {
              ctx.fillStyle = 'rgba(255,255,255,0.78)';
              ctx.beginPath();
              ctx.arc(leX + ppx - r * 0.16, leY + ppy - r * 0.18, r * 0.18, 0, TWO_PI);
              ctx.arc(reX + ppx - r * 0.16, reY + ppy - r * 0.18, r * 0.18, 0, TWO_PI);
              ctx.fill();
            }
          }
        }
      }

      // --- Name label ---
      const nameY = hs0.y - (18 * this.cam.zoom) - 10;
      const isPlayer = snake.isPlayer;
      ctx.font = isPlayer
        ? `700 ${Math.max(12, 13 * this.cam.zoom)}px JetBrains Mono, monospace`
        : `600 ${Math.max(10, 11 * this.cam.zoom)}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.lineWidth = isPlayer ? 3 : 2.2;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(snake.name, hs0.x, nameY);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(snake.name, hs0.x, nameY);
    }

    render(world, alpha) {
      this._frameTime = (performance.now() / 1000);
      const dt = 1 / 60;

      // --- Enhancement 4: Boost motion blur overlay ---
      let playerBoosting = false;
      if (!this.lowFx) {
        const players = (Array.isArray(world.players) && world.players.length)
          ? world.players
          : (world.player ? [world.player] : []);
        for (let i = 0; i < players.length; i++) {
          if (players[i] && players[i].alive && players[i].boosting) {
            playerBoosting = true;
            break;
          }
        }
        if (playerBoosting) {
          // Semi-transparent overlay for motion blur effect
          const ctx = this.ctx;
          ctx.fillStyle = 'rgba(5,10,26,0.15)';
          ctx.fillRect(0, 0, this.width, this.height);
        }
      }

      // Camera shake offset
      if (!this.lowFx && this._cameraShakeFrames > 0) {
        this.cam.x += (Math.random() - 0.5) * 6;
        this.cam.y += (Math.random() - 0.5) * 6;
        this._cameraShakeFrames--;
      }

      this.drawBackground();
      this.drawBoundary(world.radius);
      this.drawPellets(world.pellets, alpha);
      const z = this.cam.zoom;
      const camX = this.cam.x;
      const camY = this.cam.y;
      const cx = this.cx;
      const cy = this.cy;
      for (let i = 0; i < world.snakes.length; i++) {
        const s = world.snakes[i];
        if (!s.alive) continue;
        if (!s.isPlayer) {
          // Never cull by head alone; ensure body-near-screen snakes are rendered.
          let visible = false;
          const stride = 6;
          for (let j = 0; j < s.segments.length; j += stride) {
            const seg = s.segments[j];
            const sx = (seg.x - camX) * z + cx;
            const sy = (seg.y - camY) * z + cy;
            if (sx >= -360 && sx <= this.width + 360 && sy >= -360 && sy <= this.height + 360) {
              visible = true;
              break;
            }
          }
          if (!visible) continue;
        }
        this.drawSnake(s, alpha);
      }

      // --- Draw particles after snakes but before HUD ---
      if (!this.lowFx) {
        // Death explosion particles
        if (this._deathParticles.length > 0) {
          this._updateAndDrawDeathParticles(dt);
        }
        // Eat sparkle particles
        if (this._eatParticles.length > 0) {
          this._updateAndDrawEatParticles(dt);
        }
        // Boost trail particles
        if (this._boostTrailParticles.length > 0) {
          const ctx = this.ctx;
          for (let i = this._boostTrailParticles.length - 1; i >= 0; i--) {
            const p = this._boostTrailParticles[i];
            p.life -= p.decay;
            if (p.life <= 0) {
              this._boostTrailParticles.splice(i, 1);
              continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            ctx.fillStyle = `rgba(180,140,255,${(p.life * 0.4).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, TWO_PI);
            ctx.fill();
          }
        }
        // Boost speed lines
        if (playerBoosting) {
          this._drawBoostSpeedLines();
        }
      }
    }
  }

  lib.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
