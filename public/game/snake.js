(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};
  const C = lib.CONSTANTS;

  function createSegment(x, y) {
    return { x, y, px: x, py: y };
  }

  function targetSegments(mass, maxSegments) {
    const raw = C.BASE_SEGMENTS + Math.floor(mass * C.MASS_TO_SEGMENTS);
    if (typeof maxSegments === 'number') return Math.min(raw, maxSegments);
    return raw;
  }

  function scoreToMass(score) {
    const s = Math.max(C.MIN_SCORE, score);
    return C.SCORE_TO_MASS_BASE + C.SCORE_TO_MASS_SCALE * Math.sqrt(s / C.MIN_SCORE);
  }

  function syncMassToScore(snake, dt) {
    const target = scoreToMass(snake.score);
    const upRate = lib.clamp(dt * C.SCORE_SYNC_RATE, 0, 1);
    const downRate = lib.clamp(dt * (C.SCORE_SYNC_RATE * 0.45), 0, 1);
    if (snake.mass < target) {
      snake.mass = lib.lerp(snake.mass, target, upRate);
    } else if (snake.mass > target * 1.08) {
      snake.mass = lib.lerp(snake.mass, target, downRate);
    }
    // Keep length tied to score-derived mass to avoid runaway body growth.
    snake.growMass = 0;
  }

  function createSnake(cfg) {
    const segments = [];
    for (let i = 0; i < C.BASE_SEGMENTS; i++) {
      const x = cfg.x - Math.cos(cfg.angle) * i * C.SEGMENT_SPACING;
      const y = cfg.y - Math.sin(cfg.angle) * i * C.SEGMENT_SPACING;
      segments.push(createSegment(x, y));
    }
    return {
      id: cfg.id,
      name: cfg.name,
      hue: cfg.hue,
      skinPattern: cfg.skinPattern || null,
      isPlayer: !!cfg.isPlayer,
      alive: true,
      mass: typeof cfg.startMass === 'number' ? cfg.startMass : C.START_MASS,
      score: typeof cfg.startScore === 'number' ? cfg.startScore : 10,
      dotsEaten: 0,
      kills: 0,
      growMass: 0,
      angle: cfg.angle,
      targetAngle: cfg.angle,
      boosting: false,
      boostDropTimer: 0,
      speed: C.BASE_SPEED,
      hitWall: false,
      maxSegments: typeof cfg.maxSegments === 'number'
        ? cfg.maxSegments
        : (cfg.isPlayer ? C.MAX_SEGMENTS_PLAYER : C.MAX_SEGMENTS_BOT),
      segments,
      desiredSegments: C.BASE_SEGMENTS,
      aiState: {
        mode: 'farm',
        jitter: (cfg.rng ? cfg.rng() : Math.random()) * 0.2 - 0.1,
        danger: 0,
        targetPelletId: -1,
        thinkCooldown: 0
      }
    };
  }

  function applyTurn(snake, dt) {
    // Keep turning tight at higher mass: much softer mass penalty than before.
    const turnRate = C.BASE_TURN_RATE / (1 + snake.mass * 0.00105);
    const d = lib.angleDelta(snake.angle, snake.targetAngle);
    const maxTurn = turnRate * dt;
    const step = Math.abs(d) <= maxTurn ? d : Math.sign(d) * maxTurn;
    snake.angle = lib.normalizeAngle(snake.angle + step);
  }

  function applyBoostMassLossAndDrops(snake, dt, emitPellet, rng) {
    if (!snake.boosting) return 0;
    // Slither-like boost tradeoff: speed for body mass.
    const massLoss = C.BOOST_MASS_LOSS_PER_SEC * dt;
    snake.mass = Math.max(C.MIN_MASS, snake.mass - massLoss);
    snake.growMass = Math.max(0, snake.growMass - massLoss * 0.4);
    snake.score = Math.max(C.MIN_SCORE, snake.score - C.BOOST_SCORE_LOSS_PER_SEC * dt);

    snake.boostDropTimer += dt;
    let drops = 0;
    while (snake.boostDropTimer >= C.BOOST_DROP_INTERVAL) {
      snake.boostDropTimer -= C.BOOST_DROP_INTERVAL;
      const tail = snake.segments[snake.segments.length - 1];
      const a = snake.angle + Math.PI + (rng() * 0.6 - 0.3);
      const r = 4 + rng() * 8;
      emitPellet(tail.x + Math.cos(a) * r, tail.y + Math.sin(a) * r, 0.35 + rng() * 0.45, snake.hue, true);
      drops++;
    }
    return drops;
  }

  function moveSnake(snake, dt, worldRadius) {
    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      seg.px = seg.x;
      seg.py = seg.y;
    }

    applyTurn(snake, dt);

    const boostActive = !!snake.boosting;
    const boostSpeed = snake.isPlayer ? (C.BOOST_SPEED * C.PLAYER_BOOST_MULTIPLIER) : C.BOOST_SPEED;
    snake.speed = boostActive ? boostSpeed : C.BASE_SPEED;
    snake.boosting = boostActive;

    const head = snake.segments[0];
    head.x += Math.cos(snake.angle) * snake.speed * dt;
    head.y += Math.sin(snake.angle) * snake.speed * dt;

    snake.hitWall = false;
    const d = Math.hypot(head.x, head.y);
    if (d > worldRadius - 3) {
      const nx = head.x / (d || 1);
      const ny = head.y / (d || 1);
      head.x = nx * (worldRadius - 3);
      head.y = ny * (worldRadius - 3);
      snake.hitWall = true;
      snake.boosting = false;
    }

    snake.desiredSegments = Math.max(C.BASE_SEGMENTS, targetSegments(snake.mass + snake.growMass, snake.maxSegments));
    while (snake.segments.length < snake.desiredSegments) {
      const tail = snake.segments[snake.segments.length - 1];
      snake.segments.push(createSegment(tail.x, tail.y));
    }

    for (let i = 1; i < snake.segments.length; i++) {
      const prev = snake.segments[i - 1];
      const cur = snake.segments[i];
      const dx = prev.x - cur.x;
      const dy = prev.y - cur.y;
      const dist = Math.hypot(dx, dy) || 1;
      const stretch = dist - C.SEGMENT_SPACING;
      cur.x += (dx / dist) * stretch * 0.54;
      cur.y += (dy / dist) * stretch * 0.54;
    }
  }

  function applyGrowthFromPellet(snake, value) {
    snake.mass += value;
    snake.growMass += value * 0.62;
  }

  lib.Snake = {
    createSnake,
    moveSnake,
    applyGrowthFromPellet,
    applyBoostMassLossAndDrops,
    targetSegments,
    scoreToMass,
    syncMassToScore
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createSnake,
      moveSnake,
      applyGrowthFromPellet,
      applyBoostMassLossAndDrops,
      targetSegments,
      scoreToMass,
      syncMassToScore
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
