(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};
  const C = lib.CONSTANTS;
  const BELLA_BOT_NAME = '[GTOAT] Bella';
  const BELLA_MIN_SCORE = 91223;

  function resolveHeadOn(a, b) {
    const ah = a.segments[0];
    const bh = b.segments[0];
    const rr = (C.HEAD_RADIUS * 1.9) * (C.HEAD_RADIUS * 1.9);
    const dx = ah.x - bh.x;
    const dy = ah.y - bh.y;
    if (dx * dx + dy * dy > rr) return null;
    if (a.isGodMode && !b.isGodMode) return b;
    if (b.isGodMode && !a.isGodMode) return a;
    if (Math.abs(a.mass - b.mass) > 0.0001) return a.mass > b.mass ? b : a;
    return a.id > b.id ? a : b;
  }

  class Engine {
    constructor(options) {
      this.options = options || {};
      this.onHud = this.options.onHud || function () {};
      this.onDeath = this.options.onDeath || function () {};
      this.world = null;
      this.running = false;
      this.playerDead = false;
      this.pelletHash = new lib.SpatialHash(C.GRID_SIZE);
      this.bodyHash = new lib.SpatialHash(C.GRID_SIZE);
      this.tmpA = [];
      this.tmpB = [];
      this.tmpC = [];
      this.frameHandle = 0;
      this.lastTs = 0;
      this.acc = 0;
      this.fpsTs = 0;
      this.frames = 0;
      this.fps = 0;
      this.ticks = 0;
      this.inputs = [];
      this.boundStep = this.frame.bind(this);
      this.seed = 0;
    }

    defaultInputState() {
      return {
        targetX: 0,
        targetY: 0,
        boost: false,
        hasPointer: false,
        targetAngle: 0,
        hasAngle: false
      };
    }

    getPlayers() {
      if (!this.world) return [];
      if (Array.isArray(this.world.players) && this.world.players.length) {
        return this.world.players.filter(Boolean);
      }
      return this.world.player ? [this.world.player] : [];
    }

    resetInputs() {
      const players = this.getPlayers();
      const count = Math.max(1, players.length);
      this.inputs = new Array(count);
      for (let i = 0; i < count; i++) this.inputs[i] = this.defaultInputState();
    }

    start(seed) {
      this.seed = seed >>> 0;
      this.world = new lib.World(this.seed, this.options);
      this.world.reset();
      this.resetInputs();
      this.playerDead = false;
      this.running = true;
      this.lastTs = 0;
      this.acc = 0;
      this.fpsTs = 0;
      this.frames = 0;
      this.fps = 0;
      this.ticks = 0;
      if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
      this.frameHandle = requestAnimationFrame(this.boundStep);
    }

    stop() {
      this.running = false;
      if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }

    setPlayerInput(a, b, c, d, e, f, g) {
      let playerIndex = 0;
      let targetX = 0;
      let targetY = 0;
      let boost = false;
      let hasPointer = false;
      let targetAngle = 0;
      let hasAngle = false;

      // Backward compatible signature:
      // setPlayerInput(targetX, targetY, boost, hasPointer)
      if (arguments.length <= 4) {
        targetX = a;
        targetY = b;
        boost = c;
        hasPointer = d;
      } else {
        playerIndex = Number.isFinite(a) ? Math.max(0, Math.floor(a)) : 0;
        targetX = b;
        targetY = c;
        boost = d;
        hasPointer = e;
        targetAngle = f;
        hasAngle = g;
      }

      if (!this.inputs[playerIndex]) this.inputs[playerIndex] = this.defaultInputState();
      const input = this.inputs[playerIndex];
      input.targetX = Number.isFinite(targetX) ? targetX : 0;
      input.targetY = Number.isFinite(targetY) ? targetY : 0;
      input.boost = !!boost;
      input.hasPointer = !!hasPointer;
      input.targetAngle = Number.isFinite(targetAngle) ? targetAngle : 0;
      input.hasAngle = !!hasAngle;
    }

    rebuildHashes() {
      this.pelletHash.clear();
      this.bodyHash.clear();
      const pellets = this.world.pellets;
      const snakes = this.world.snakes;

      for (let i = 0; i < pellets.length; i++) this.pelletHash.insert(pellets[i].x, pellets[i].y, pellets[i]);
      for (let i = 0; i < snakes.length; i++) {
        const s = snakes[i];
        if (!s.alive) continue;
        const stride = s.isPlayer ? 1 : 2;
        for (let j = 1; j < s.segments.length; j += stride) {
          const seg = s.segments[j];
          seg._sid = s.id;
          seg._sidx = j;
          this.bodyHash.insert(seg.x, seg.y, seg);
        }
      }
    }

    creditKill(killerId) {
      if (!killerId || !this.world) return;
      for (let i = 0; i < this.world.snakes.length; i++) {
        const s = this.world.snakes[i];
        if (s && s.id === killerId && s.isPlayer) {
          s.kills += 1;
          return;
        }
      }
    }

    killSnake(snake, killerId = null) {
      if (snake.isGodMode) return;
      if (!snake.alive) return;
      snake.alive = false;
      snake.boosting = false;
      for (let i = 0; i < snake.segments.length; i++) {
        const seg = snake.segments[i];
        const count = i % 2 === 0 ? 2 : 1;
        for (let j = 0; j < count; j++) {
          const a = this.world.rng() * Math.PI * 2;
          const r = this.world.rng() * 10;
          this.world.spawnPellet(seg.x + Math.cos(a) * r, seg.y + Math.sin(a) * r, 0.9 + this.world.rng() * 2.2, snake.hue, false);
        }
      }
      this.creditKill(killerId);

      if (snake.isPlayer) {
        const alivePlayers = this.getPlayers().filter((p) => p.alive);
        if (alivePlayers.length === 0) {
          this.playerDead = true;
          this.running = false;
          this.onDeath({ playersTotal: this.getPlayers().length });
        }
      } else {
        const idx = this.world.snakes.indexOf(snake);
        if (idx >= 0) this.world.snakes.splice(idx, 1);
        this.world.respawnBot();
      }
    }

    updatePlayerControl() {
      const players = this.getPlayers();
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (!player || !player.alive) continue;
        const input = this.inputs[i] || this.inputs[0];
        if (!input) continue;
        if (input.hasAngle) {
          player.targetAngle = lib.normalizeAngle(input.targetAngle);
        } else if (input.hasPointer) {
          player.targetAngle = Math.atan2(input.targetY - player.segments[0].y, input.targetX - player.segments[0].x);
        }
        player.boosting = !!input.boost;
      }
    }

    step(dt) {
      if (!this.world || !this.running) return;
      this.world.time += dt;
      this.updatePlayerControl();
      this.rebuildHashes();

      lib.Bots.updateBots(this.world, {
        pelletHash: this.pelletHash,
        bodyHash: this.bodyHash,
        tmpA: this.tmpA,
        tmpB: this.tmpB,
        tmpC: this.tmpC
      }, dt);

      const snakes = this.world.snakes;
      for (let i = 0; i < snakes.length; i++) {
        const s = snakes[i];
        if (!s.alive) continue;
        if (s.isGodMode) {
          s.boosting = false;
          if (s.score < BELLA_MIN_SCORE) s.score = BELLA_MIN_SCORE;
        }
        lib.Snake.syncMassToScore(s, dt);
        lib.Snake.applyBoostMassLossAndDrops(s, dt, this.world.spawnPellet.bind(this.world), this.world.rng);
        lib.Snake.moveSnake(s, dt, this.world.radius);
        if (s.hitWall) {
          this.killSnake(s, null);
        }
      }

      this.rebuildHashes();

      const eaten = new Set();
      for (let i = 0; i < snakes.length; i++) {
        const s = snakes[i];
        if (!s.alive) continue;
        const head = s.segments[0];
        this.tmpA.length = 0;
        this.pelletHash.query(head.x, head.y, 28, this.tmpA);
        for (let j = 0; j < this.tmpA.length; j++) {
          const p = this.tmpA[j];
          if (eaten.has(p.id)) continue;
          const dx = head.x - p.x;
          const dy = head.y - p.y;
          if (dx * dx + dy * dy <= (C.HEAD_RADIUS + 4) * (C.HEAD_RADIUS + 4)) {
            eaten.add(p.id);
            s.dotsEaten += 1;
            s.score += 15;
            if (this.onPelletEat) this.onPelletEat(p.x, p.y, p.hue);
          }
        }
      }
      if (eaten.size) {
        this.world.pellets = this.world.pellets.filter((p) => !eaten.has(p.id));
        this.world.fillPellets();
      }

      for (let i = 0; i < snakes.length; i++) {
        const a = snakes[i];
        if (!a || !a.alive) continue;
        for (let j = i + 1; j < snakes.length; j++) {
          const b = snakes[j];
          if (!b || !b.alive) continue;
          const loser = resolveHeadOn(a, b);
          if (loser) {
            const winner = loser.id === a.id ? b : a;
            this.killSnake(loser, winner.id);
          }
        }
      }

      for (let i = 0; i < snakes.length; i++) {
        const s = snakes[i];
        if (!s || !s.alive) continue;
        const head = s.segments[0];
        this.tmpB.length = 0;
        this.bodyHash.query(head.x, head.y, C.HEAD_RADIUS + C.BODY_RADIUS + 6, this.tmpB);
        for (let j = 0; j < this.tmpB.length; j++) {
          const body = this.tmpB[j];
          if (body._sid === s.id) continue;
          const dx = head.x - body.x;
          const dy = head.y - body.y;
          if (dx * dx + dy * dy <= (C.HEAD_RADIUS + C.BODY_RADIUS - 1) * (C.HEAD_RADIUS + C.BODY_RADIUS - 1)) {
            this.killSnake(s, body._sid);
            break;
          }
        }
      }

      let botCount = 0;
      for (let i = 0; i < this.world.snakes.length; i++) {
        const s = this.world.snakes[i];
        if (s.alive && !s.isPlayer) botCount++;
      }
      const alive = this.world.snakes.filter((s) => s.alive);
      const bella = alive.find((s) => s.isGodMode || s.isBellaBot || s.name === BELLA_BOT_NAME) || null;
      const others = alive
        .filter((s) => !bella || s.id !== bella.id)
        .sort((a, b) => (b.score - a.score) || (b.segments.length - a.segments.length));
      const ordered = bella ? [bella, ...others] : others;
      const leaderboard = ordered
        .slice(0, 10)
        .map((s, idx) => ({
          rank: idx + 1,
          name: s.name,
          score: (s === bella) ? Math.max(BELLA_MIN_SCORE, s.score) : s.score,
          rankColor: ['#ffe600', '#00f0ff', '#ff7a00', '#39ff14', '#ff2fd1', '#6f7dff', '#00ffa8', '#ff3b3b', '#c7ff00', '#7affff'][idx] || '#e9f4ff',
          isPlayer: !!s.isPlayer,
          playerIndex: typeof s.playerIndex === 'number' ? s.playerIndex : -1
        }));
      const players = this.getPlayers();
      if (players.length) {
        const alivePlayers = players.filter((p) => p && p.alive);
        const primary = players[0];
        this.onHud({
          playerCount: players.length,
          livePlayers: alivePlayers.length,
          players: players.map((p, idx) => ({
            index: idx,
            id: p.id,
            name: p.name,
            alive: !!p.alive,
            score: Math.max(10, Math.round(p.score)),
            kills: p.kills,
            boosting: !!p.boosting,
            length: p.segments.length,
            mass: p.mass
          })),
          length: primary ? primary.segments.length : 0,
          score: primary ? Math.max(10, Math.round(primary.score)) : 10,
          kills: primary ? primary.kills : 0,
          mass: primary ? primary.mass : C.START_MASS,
          boosting: primary ? !!primary.boosting : false,
          bots: botCount,
          leaderboard: leaderboard.map((r) => ({ ...r, score: Math.max(10, Math.round(r.score)) })),
          fps: this.fps,
          ticks: this.ticks
        });
      }

      this.ticks++;
    }

    frame(ts) {
      if (!this.running || !this.world) return;
      if (!this.lastTs) {
        this.lastTs = ts;
        this.fpsTs = ts;
      }
      let delta = (ts - this.lastTs) / 1000;
      this.lastTs = ts;
      if (delta > 0.2) delta = 0.2;
      this.acc += delta;

      while (this.acc >= C.FIXED_DT) {
        this.step(C.FIXED_DT);
        this.acc -= C.FIXED_DT;
      }

      if (this.options.onRender) this.options.onRender(this.world, this.acc / C.FIXED_DT);

      this.frames++;
      if (ts - this.fpsTs >= 500) {
        this.fps = Math.round((this.frames * 1000) / (ts - this.fpsTs));
        this.frames = 0;
        this.fpsTs = ts;
      }

      this.frameHandle = requestAnimationFrame(this.boundStep);
    }
  }

  lib.Engine = Engine;
  lib.resolveHeadOn = resolveHeadOn;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { resolveHeadOn };
  }
})(typeof window !== 'undefined' ? window : globalThis);
