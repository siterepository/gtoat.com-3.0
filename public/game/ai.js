(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};
  const C = lib.CONSTANTS;

  function findPelletById(pellets, id) {
    if (id < 0) return null;
    for (let i = 0; i < pellets.length; i++) {
      if (pellets[i].id === id) return pellets[i];
    }
    return null;
  }

  function chooseFoodTarget(bot, nearbyPellets) {
    let best = null;
    let bestScore = -Infinity;
    const maxCandidates = Math.min(nearbyPellets.length, 26);
    for (let i = 0; i < maxCandidates; i++) {
      const p = nearbyPellets[i];
      const dx = p.x - bot.segments[0].x;
      const dy = p.y - bot.segments[0].y;
      const dist = Math.hypot(dx, dy) || 1;
      let cluster = 0;
      for (let j = i + 1; j < nearbyPellets.length; j += 3) {
        const q = nearbyPellets[j];
        const qdx = p.x - q.x;
        const qdy = p.y - q.y;
        if (qdx * qdx + qdy * qdy < 120 * 120) cluster += q.value;
      }
      const score = (p.value * 8.8 + cluster * 0.78) / (dist + 32);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    return best;
  }

  function nearestAlivePlayerHead(world, fromX, fromY) {
    const players = (Array.isArray(world.players) && world.players.length)
      ? world.players
      : (world.player ? [world.player] : []);
    let bestHead = null;
    let bestD2 = Infinity;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p || !p.alive || !p.segments || !p.segments[0]) continue;
      const head = p.segments[0];
      const dx = head.x - fromX;
      const dy = head.y - fromY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestHead = head;
      }
    }
    return bestHead;
  }

  function updateBotDecision(bot, world, hashes, dt) {
    const head = bot.segments[0];
    const nearbyPellets = hashes.tmpA;
    const nearbyBodies = hashes.tmpB;
    nearbyPellets.length = 0;
    nearbyBodies.length = 0;

    const ai = bot.aiState || (bot.aiState = {});
    ai.thinkCooldown = (ai.thinkCooldown || 0) - dt;
    ai.mode = ai.mode || 'farm';
    ai.targetPelletId = typeof ai.targetPelletId === 'number' ? ai.targetPelletId : -1;
    ai.jitter = typeof ai.jitter === 'number' ? ai.jitter : ((world.rng ? world.rng() : Math.random()) * 0.2 - 0.1);
    const personality = ai.personality || 'normal';
    const isWild = personality === 'wild';
    const wildType = ai.wildType || 'none';
    const avoidMul = isWild ? 0.62 : 1;
    const thinkBase = isWild ? 0.1 : 0.06;
    const thinkRand = isWild ? 0.18 : 0.11;
    const wobbleAmp = isWild ? 0.1 : 0.05;
    ai.wobble = (ai.wobble || 0) + dt * (0.6 + (world.rng ? world.rng() : Math.random()) * 0.7);

    hashes.pelletHash.query(head.x, head.y, 560, nearbyPellets);
    hashes.bodyHash.query(head.x, head.y, 250, nearbyBodies);

    let avoidX = 0;
    let avoidY = 0;
    let danger = 0;

    for (let i = 0; i < nearbyBodies.length; i++) {
      const b = nearbyBodies[i];
      if (b._sid === bot.id && b._sidx < 14) continue;
      const dx = head.x - b.x;
      const dy = head.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 250) {
        const w = (250 - dist) / 250;
        avoidX += (dx / dist) * w * 2.05 * avoidMul;
        avoidY += (dy / dist) * w * 2.05 * avoidMul;
        danger = Math.max(danger, w);
      }
    }

    let interceptX = 0;
    let interceptY = 0;
    let interceptWeight = 0;
    for (let i = 0; i < world.snakes.length; i++) {
      const other = world.snakes[i];
      if (!other.alive || other.id === bot.id) continue;
      const oh = other.segments[0];
      const dx = oh.x - head.x;
      const dy = oh.y - head.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 320) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const forward = nx * Math.cos(bot.angle) + ny * Math.sin(bot.angle);

      const predict = 90;
      const px = oh.x + Math.cos(other.angle) * predict;
      const py = oh.y + Math.sin(other.angle) * predict;
      const pdx = px - head.x;
      const pdy = py - head.y;
      const pd = Math.hypot(pdx, pdy) || 1;

      if (forward > 0.4 && bot.mass > other.mass * 1.11 && dist < 190) {
        interceptX += pdx / pd;
        interceptY += pdy / pd;
        interceptWeight += 1;
      } else {
        avoidX -= nx * 0.78 * avoidMul;
        avoidY -= ny * 0.78 * avoidMul;
        danger = Math.max(danger, 0.45);
      }
    }

    const headNorm = Math.hypot(head.x, head.y) || 1;
    const wallDist = world.radius - headNorm;
    if (wallDist < 360) {
      const nx = -head.x / headNorm;
      const ny = -head.y / headNorm;
      const w = (360 - wallDist) / 360;
      avoidX += nx * w * 3.1 * avoidMul;
      avoidY += ny * w * 3.1 * avoidMul;
      danger = Math.max(danger, w);
    }

    if (ai.thinkCooldown <= 0) {
      let target = findPelletById(nearbyPellets, ai.targetPelletId);
      if (target) {
        const td = Math.hypot(target.x - head.x, target.y - head.y);
        if (td > 620) target = null;
      }
      if (!target || danger > 0.56) {
        target = chooseFoodTarget(bot, nearbyPellets);
      }
      ai.targetPelletId = target ? target.id : -1;
      ai.thinkCooldown = thinkBase + (world.rng ? world.rng() : Math.random()) * thinkRand;
    }

    let steerX = Math.cos(bot.angle);
    let steerY = Math.sin(bot.angle);

    const chosen = findPelletById(nearbyPellets, ai.targetPelletId);
    if (chosen && danger < 0.68) {
      const fx = chosen.x - head.x;
      const fy = chosen.y - head.y;
      const fd = Math.hypot(fx, fy) || 1;
      steerX = fx / fd;
      steerY = fy / fd;
      ai.mode = 'farm';
    }

    if (interceptWeight > 0 && danger < 0.52) {
      steerX = steerX * 0.55 + (interceptX / interceptWeight) * 0.45;
      steerY = steerY * 0.55 + (interceptY / interceptWeight) * 0.45;
      ai.mode = 'intercept';
    }

    if (danger > (isWild ? 0.47 : 0.33)) {
      steerX += avoidX * 1.75;
      steerY += avoidY * 1.75;
      ai.mode = 'evade';
    }

    if (isWild && (world.rng ? world.rng() : Math.random()) < 0.08) {
      steerX = Math.cos(bot.angle + (world.rng ? world.rng() : Math.random()) * 1.6 - 0.8);
      steerY = Math.sin(bot.angle + (world.rng ? world.rng() : Math.random()) * 1.6 - 0.8);
    }

    const closestPlayerHead = nearestAlivePlayerHead(world, head.x, head.y);

    if (isWild && closestPlayerHead) {
      const p = closestPlayerHead;
      const pdx = p.x - head.x;
      const pdy = p.y - head.y;
      const pd = Math.hypot(pdx, pdy) || 1;
      const pnx = pdx / pd;
      const pny = pdy / pd;
      const chargeWindow = wildType === 'suicide' ? 420 : (wildType === 'berserk' ? 300 : 240);
      const chargeChance = wildType === 'suicide' ? 0.28 : (wildType === 'berserk' ? 0.18 : 0.1);
      if (pd < chargeWindow && (world.rng ? world.rng() : Math.random()) < chargeChance) {
        // Wild charge patterns: some bots intentionally rush the player.
        steerX = pnx;
        steerY = pny;
        ai.mode = 'charge';
      }
    }

    const wobble = Math.sin(ai.wobble * 1.8 + ai.jitter * 8) * wobbleAmp;
    bot.targetAngle = Math.atan2(steerY + wobble, steerX + wobble);

    bot.boosting = false;
    if (ai.mode === 'charge' && bot.mass > 12) {
      bot.boosting = true;
    } else if (ai.mode === 'evade' && bot.mass > 17 && danger > 0.56) {
      bot.boosting = true;
    } else if (ai.mode === 'intercept' && bot.mass > 19 && danger < 0.4) {
      bot.boosting = true;
    } else if (ai.mode === 'farm' && chosen && bot.mass > 18) {
      const fdx = chosen.x - head.x;
      const fdy = chosen.y - head.y;
      const fdist = Math.hypot(fdx, fdy);
      if (fdist > 160 && fdist < 300 && danger < 0.22) bot.boosting = true;
    }

    if (isWild && wildType === 'suicide' && closestPlayerHead) {
      // Suicide type ignores safety and keeps charging.
      bot.boosting = true;
    }
    if (wallDist < 120) bot.boosting = false;
  }

  lib.BotAI = { updateBotDecision };
})(typeof window !== 'undefined' ? window : globalThis);
