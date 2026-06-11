(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};
  const C = lib.CONSTANTS;

  // Team tags sampled from public Slither clan/team community threads.
  const BOT_TAGS = [
    '[SN]', '[LK]', '[BAT]', '[BEST]', '[WORST]', '[WORM]', '[HERO]', '[VFF]', '[MG]', '[UOS]',
    '[NGT]', '[SLC]', '[A-Team]', '[SHEEP]', '[BISON]', '[PANDA]', '[HYENA]', '[TIGER]', '[UNICORN]',
    '[NTL]', '[AEO]'
  ];
  const BOT_HANDLES = [
    'Otter', 'JustVibin', 'Mystical', 'Bubbles', 'SillySnake', 'StealYoFud', 'SonOfAGlitch',
    'DoUEvenTrollBro', 'Morsky', 'ScratchNSniff', 'Styn', 'TSOne', 'Hades', 'Vicky', 'Ezzo',
    'AdminKey', 'Breeze', 'CopperJoe', 'Coffin', 'Guasave', 'Apex', 'Murmur', 'Frost', 'Bishop',
    'Knurl', 'Orbit', 'Quartz', 'Havoc', 'Rogue', 'Nox', 'Cinder', 'Vanta', 'Riptide', 'Vector',
    'Kilo', 'Obsidian', 'Echo', 'Shiver', 'Pylon', 'Flux', 'Raven', 'Jolt', 'ViperNerve',
    'GrayComet', 'DuneRider', 'NoScopeNoodle', 'PelletPirate', 'HeadOnHero', 'CornerTrap',
    'DriftGhost', 'BlueFang', 'RedMamba', 'LimeRaptor', 'NeonCrow', 'TacticalWorm', 'MidnightArc',
    'ZeroTurn', 'RazorLoop', 'PulseLine', 'WallKisser', 'DotCollector', 'MegaSpiral', 'Sweeper',
    'MagnetTail', 'PanicBoost', 'SlyOrbit', 'OrbitKing', 'CobraMath', 'ClutchLane', 'GridRunner',
    'SmokeTrail', 'NoMercy', 'RiskyBite', 'LureMaster', 'Slipstream', 'DeltaNoodle', 'NovaBiter',
    'HaloWrap', 'Splice', 'RidgeRunner', 'SnipeCurve', 'HyperBait', 'CometTail', 'WobbleKing',
    'AmbushLine', 'PrimeArc', 'LateTurn', 'QuickFang', 'HeavyWrap', 'RookieEater', 'TurboCoil',
    'PixelHunter', 'FalconSpine', 'SharkLoop', 'VoltSpiral', 'Scarab', 'JesterArc', 'ShadowSpine',
    'NeedleTurn', 'UltraBait', 'ClipMaster', 'DashVector', 'BoomCoil', 'SaberWorm', 'TopLane',
    'LowerLane', 'SnakePilot', 'DeltaWing', 'CloudBiter', 'LionCurve', 'TigerSpine', 'FalconBite',
    'GlideTrap', 'SpinDoctor', 'LuckyFang', 'CandyCoil', 'GoldenArc', 'SilverTail', 'BronzeLoop',
    'MeteorLine', 'PulseBiter', 'WaveKeeper', 'Warden', 'Beacon', 'NightShift'
  ];
  const BANNED_BOT_HANDLES = new Set(['vicky', 'copperjoe', 'breeze']);
  const SAFE_BOT_HANDLES = BOT_HANDLES.filter((name) => !BANNED_BOT_HANDLES.has(String(name).toLowerCase()));
  const BOT_SPECIAL_NAMES = ['[LK] sssss', '[LK] THICC', '[LK] Beto GOKU'];
  const AI_REQUIRED_LEADER_NAME = '[GTOAT] Bella';
  const AI_REQUIRED_LEADER_MIN_SCORE = 91223;
  const AI_REQUIRED_LEADER_MAX_SCORE = 98736;
  const AI_REQUIRED_LEADER_PINK_PATTERN = ['#ffd9f1', '#ff8dc8', '#fff7c2', '#ff8dc8', '#ffd9f1', '#ffc4e6'];
  const GRINCH_ANGRY_PATTERN = [
    ...Array(11).fill('#7b38d8'),
    '#ffe14b',
    '#e23b3b',
    '#ffe14b',
    ...Array(11).fill('#7b38d8'),
    '#ffe14b',
    '#3f75ff'
  ];

  const BOT_SKINS = [
    ['#ff4d4d', '#ffd84d', '#4f93ff', '#ffd84d'],
    ['#36d67a', '#e9f5ff', '#36d67a', '#7cc1ff'],
    ['#f99b2f', '#fff3c4', '#f99b2f', '#ff6655'],
    ['#8f57ff', '#f5e5ff', '#8f57ff', '#ffd84d'],
    ['#2fc7ff', '#eaffff', '#2fc7ff', '#86f0a8'],
    ['#ff6fb1', '#ffe0f2', '#ff6fb1', '#ffd84d'],
    ['#ff9340', '#fff1d6', '#ff9340', '#4fe0b6'],
    ['#00d1ff', '#e8fbff', '#00d1ff', '#ffd84d'],
    ['#7f5cff', '#efe8ff', '#7f5cff', '#ff6f9c'],
    ['#5dff72', '#e9ffe9', '#5dff72', '#29b6ff'],
    ['#ff5f6d', '#ffe4e8', '#ff5f6d', '#ffd84d'],
    ['#4cc9f0', '#e6f9ff', '#4cc9f0', '#b8f13f'],
    ['#f72585', '#ffe1f1', '#f72585', '#4cc9f0'],
    ['#ffbe0b', '#fff6d9', '#ffbe0b', '#8338ec'],
    ['#3a86ff', '#e4efff', '#3a86ff', '#ff006e'],
    ['#06d6a0', '#e5fff6', '#06d6a0', '#ffd166'],
    ['#ef476f', '#ffe3ea', '#ef476f', '#06d6a0'],
    ['#118ab2', '#dff6ff', '#118ab2', '#ffd166'],
    ['#9b5de5', '#efe5ff', '#9b5de5', '#00f5d4'],
    ['#fb5607', '#ffe8da', '#fb5607', '#3a86ff']
  ];
  const DEFAULT_PLAYER_PROFILES = [
    {
      id: 'grinch',
      name: '[GTOAT] GRINCH >:(',
      hue: 270,
      skinPattern: GRINCH_ANGRY_PATTERN
    },
    {
      id: 'grumpy-grinch',
      name: '[GTOAT] Grumpy GRINCH',
      hue: 94,
      skinPattern: ['#1e2f1a', '#2f4a21', '#425f2a', '#2a3a1d', '#1e2f1a', '#6e7f39']
    },
    {
      id: 'happy-grinch',
      name: '[GTOAT] Happy GRINCH',
      hue: 118,
      skinPattern: ['#5fd84f', '#8ef566', '#c9ff7f', '#8ef566', '#5fd84f', '#fff06a']
    },
    {
      id: 'sneaky-grinch',
      name: '[GTOAT] Sneaky GRINCH',
      hue: 148,
      skinPattern: ['#103326', '#1d5b43', '#2f8a66', '#1d5b43', '#103326', '#79d5ad']
    },
    {
      id: 'frosty-grinch',
      name: '[GTOAT] Frosty GRINCH',
      hue: 175,
      skinPattern: ['#2b7f7b', '#4cb8b0', '#9df5ec', '#d7fff8', '#9df5ec', '#4cb8b0']
    },
    {
      id: 'party-grinch',
      name: '[GTOAT] Party GRINCH',
      hue: 108,
      skinPattern: ['#1f8f3a', '#d93a3a', '#f1d75f', '#1f8f3a', '#d93a3a', '#f1d75f']
    }
  ];

  function randomInCircle(rng, radius) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * radius;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  }

  function randomName(rng) {
    if (rng() < 0.15) {
      return BOT_SPECIAL_NAMES[Math.floor(rng() * BOT_SPECIAL_NAMES.length)];
    }
    const tag = BOT_TAGS[Math.floor(rng() * BOT_TAGS.length)];
    const pool = SAFE_BOT_HANDLES.length ? SAFE_BOT_HANDLES : BOT_HANDLES;
    const base = pool[Math.floor(rng() * pool.length)];
    return `${tag} ${base}`;
  }

  function randRangeInt(rng, min, max) {
    return Math.floor(min + rng() * (max - min + 1));
  }

  function sampleBotStartScore(rng) {
    const r = rng();
    if (r < 0.80) return randRangeInt(rng, 10, 1500);
    if (r < 0.90) return randRangeInt(rng, 1500, 5000);
    if (r < 0.99) return randRangeInt(rng, 5000, 7000);
    return randRangeInt(rng, 10000, 15000);
  }

  function massFromScore(score) {
    // Keep visual length closer to Slither: map score to mass sub-linearly.
    const clamped = Math.max(10, score);
    return 24 + 8 * Math.sqrt(clamped / 10);
  }

  function normalizeProfile(raw, fallback) {
    const base = fallback || DEFAULT_PLAYER_PROFILES[0];
    if (!raw || typeof raw !== 'object') return base;
    const name = (typeof raw.name === 'string' && raw.name.trim())
      ? raw.name.trim().slice(0, 28)
      : base.name;
    const fixedName = name.startsWith('[GTOAT]') ? name : `[GTOAT] ${name}`;
    const hue = Number.isFinite(raw.hue) ? raw.hue : base.hue;
    const skinPattern = Array.isArray(raw.skinPattern) && raw.skinPattern.length
      ? raw.skinPattern.slice(0, 32)
      : base.skinPattern;
    return {
      id: (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim() : base.id,
      name: fixedName,
      hue,
      skinPattern
    };
  }

  class World {
    constructor(seed, options) {
      this.options = options || {};
      this.rngSeed = seed >>> 0;
      this.rng = lib.createRng(this.rngSeed);
      this.radius = this.options.worldRadius || C.WORLD_RADIUS;
      this.initialPellets = this.options.initialPellets || C.INITIAL_PELLETS;
      this.botCount = this.options.botCount || C.BOT_COUNT;
      const configuredPlayers = Number.isFinite(this.options.playerCount)
        ? Math.floor(this.options.playerCount)
        : 1;
      this.playerCount = lib.clamp(configuredPlayers, 1, 2);
      const configuredProfiles = Array.isArray(this.options.playerProfiles)
        ? this.options.playerProfiles
        : (this.options.playerProfile ? [this.options.playerProfile] : null);
      if (configuredProfiles && configuredProfiles.length) {
        this.playerProfiles = configuredProfiles.map((p, idx) => normalizeProfile(p, DEFAULT_PLAYER_PROFILES[idx % DEFAULT_PLAYER_PROFILES.length]));
      } else {
        this.playerProfiles = DEFAULT_PLAYER_PROFILES.map((p) => normalizeProfile(p, p));
      }
      this.snakes = [];
      this.pellets = [];
      this.player = null;
      this.players = [];
      this.nextSnakeId = 1;
      this.nextPelletId = 1;
      this.time = 0;
    }

    spawnPellet(x, y, value, hue, fromBoost) {
      if (this.pellets.length >= C.MAX_PELLETS) return;
      const d = Math.hypot(x, y);
      if (d > this.radius - 3) {
        const nx = x / (d || 1);
        const ny = y / (d || 1);
        x = nx * (this.radius - 3);
        y = ny * (this.radius - 3);
      }
      this.pellets.push({
        id: this.nextPelletId++,
        x,
        y,
        px: x,
        py: y,
        value,
        hue,
        fromBoost: !!fromBoost
      });
    }

    createSnake(config) {
      const cfg = (typeof config === 'object' && config !== null)
        ? config
        : { isPlayer: !!config };
      const isPlayer = !!cfg.isPlayer;
      const playerIndex = isPlayer && Number.isFinite(cfg.playerIndex)
        ? Math.max(0, Math.floor(cfg.playerIndex))
        : 0;
      const profile = this.playerProfiles[playerIndex % this.playerProfiles.length];
      const pos = (Number.isFinite(cfg.x) && Number.isFinite(cfg.y))
        ? { x: cfg.x, y: cfg.y }
        : randomInCircle(this.rng, this.radius * 0.66);
      const angle = Number.isFinite(cfg.angle) ? cfg.angle : this.rng() * Math.PI * 2;
      const hue = Number.isFinite(cfg.hue)
        ? cfg.hue
        : (isPlayer ? profile.hue : Math.floor(this.rng() * 360));
      const startScore = Number.isFinite(cfg.startScore)
        ? cfg.startScore
        : (isPlayer ? 10 : sampleBotStartScore(this.rng));
      const startMass = Number.isFinite(cfg.startMass)
        ? cfg.startMass
        : (isPlayer ? C.START_MASS : massFromScore(startScore));
      const maxSegments = isPlayer ? C.MAX_SEGMENTS_PLAYER : C.MAX_SEGMENTS_BOT;
      const forcedPattern = (Array.isArray(cfg.skinPattern) && cfg.skinPattern.length)
        ? cfg.skinPattern.slice(0, 32)
        : null;
      const skinPattern = forcedPattern || (isPlayer
        ? profile.skinPattern
        : BOT_SKINS[Math.floor(this.rng() * BOT_SKINS.length)]);
      const snake = lib.Snake.createSnake({
        id: this.nextSnakeId++,
        name: cfg.name || (isPlayer ? profile.name : randomName(this.rng)),
        hue,
        skinPattern,
        angle,
        x: pos.x,
        y: pos.y,
        isPlayer,
        startScore,
        startMass,
        maxSegments,
        rng: this.rng
      });
      snake.playerIndex = isPlayer ? playerIndex : -1;
      snake.mass += isPlayer ? this.rng() * 1.5 : this.rng() * 3.5;
      if (!isPlayer) {
        // 70% normal, 30% wild personalities.
        snake.aiState = snake.aiState || {};
        const wild = this.rng() < 0.30;
        snake.aiState.personality = wild ? 'wild' : 'normal';
        if (wild) {
          const pr = this.rng();
          snake.aiState.wildType = pr < 0.35 ? 'suicide' : (pr < 0.7 ? 'berserk' : 'chaos');
        } else {
          snake.aiState.wildType = 'none';
        }
      }
      snake.desiredSegments = lib.Snake.targetSegments(snake.mass + snake.growMass, snake.maxSegments);
      while (snake.segments.length < snake.desiredSegments) {
        const tail = snake.segments[snake.segments.length - 1];
        snake.segments.push({ x: tail.x, y: tail.y, px: tail.px, py: tail.py });
      }
      this.snakes.push(snake);
      if (isPlayer) {
        this.players[playerIndex] = snake;
        if (!this.player) this.player = snake;
      }
      return snake;
    }

    setSnakeScoreAndMass(snake, score) {
      if (!snake) return;
      const baseScore = Math.max(10, Math.round(score));
      const nextScore = snake.isGodMode ? Math.max(AI_REQUIRED_LEADER_MIN_SCORE, baseScore) : baseScore;
      snake.score = nextScore;
      snake.mass = massFromScore(nextScore);
      snake.growMass = 0;
      snake.desiredSegments = lib.Snake.targetSegments(snake.mass, snake.maxSegments);
      while (snake.segments.length < snake.desiredSegments) {
        const tail = snake.segments[snake.segments.length - 1];
        snake.segments.push({ x: tail.x, y: tail.y, px: tail.px, py: tail.py });
      }
    }

    enforceRequiredLeaderAppearance(snake) {
      if (!snake) return;
      snake.name = AI_REQUIRED_LEADER_NAME;
      snake.hue = 325;
      snake.skinPattern = AI_REQUIRED_LEADER_PINK_PATTERN.slice();
      snake.isGodMode = true;
      snake.isBellaBot = true;
      snake.boosting = false;
      if (snake.score < AI_REQUIRED_LEADER_MIN_SCORE || snake.score > AI_REQUIRED_LEADER_MAX_SCORE) {
        this.setSnakeScoreAndMass(snake, randRangeInt(this.rng, AI_REQUIRED_LEADER_MIN_SCORE, AI_REQUIRED_LEADER_MAX_SCORE));
      }
    }

    forceRequiredLeaderTop10Spot() {
      const bots = this.snakes.filter((s) => s.alive && !s.isPlayer);
      if (!bots.length) return;

      let required = bots.find((s) => s.name === AI_REQUIRED_LEADER_NAME) || bots[0];
      this.enforceRequiredLeaderAppearance(required);

      const targetRank = 1;
      const targetScore = randRangeInt(this.rng, AI_REQUIRED_LEADER_MIN_SCORE, AI_REQUIRED_LEADER_MAX_SCORE);
      this.setSnakeScoreAndMass(required, targetScore);

      const others = bots.filter((s) => s.id !== required.id)
        .sort((a, b) => (b.score - a.score) || (b.segments.length - a.segments.length));

      for (let i = 0; i < others.length; i++) {
        const snake = others[i];
        if (i < targetRank - 1) {
          if (snake.score <= targetScore) {
            const promoted = targetScore + 40 + randRangeInt(this.rng, 0, 220);
            this.setSnakeScoreAndMass(snake, promoted);
          }
        } else if (snake.score >= targetScore) {
          const demoted = Math.max(10, targetScore - 400 - randRangeInt(this.rng, 120, 900));
          this.setSnakeScoreAndMass(snake, demoted);
        }
      }
    }

    fillPellets() {
      while (this.pellets.length < this.initialPellets) {
        const p = randomInCircle(this.rng, this.radius - 12);
        this.spawnPellet(
          p.x,
          p.y,
          C.PELLET_MIN_VALUE + this.rng() * (C.PELLET_MAX_VALUE - C.PELLET_MIN_VALUE),
          Math.floor(this.rng() * 360),
          false
        );
      }
    }

    reset() {
      this.snakes.length = 0;
      this.pellets.length = 0;
      this.nextSnakeId = 1;
      this.nextPelletId = 1;
      this.time = 0;
      this.player = null;
      this.players.length = 0;
      this.fillPellets();
      const baseSpawnAngle = this.rng() * Math.PI * 2;
      const spawnRadius = this.radius * 0.24;
      for (let i = 0; i < this.playerCount; i++) {
        const spawnAngle = baseSpawnAngle + i * Math.PI;
        const px = Math.cos(spawnAngle) * spawnRadius;
        const py = Math.sin(spawnAngle) * spawnRadius;
        this.createSnake({
          isPlayer: true,
          playerIndex: i,
          x: px,
          y: py,
          angle: lib.normalizeAngle(spawnAngle + Math.PI)
        });
      }
      if (this.botCount > 0) {
        // Keep [LK] sssss reliably visible on the leaderboard when AI mode starts.
        this.createSnake({
          isPlayer: false,
          name: AI_REQUIRED_LEADER_NAME,
          startScore: randRangeInt(this.rng, AI_REQUIRED_LEADER_MIN_SCORE, AI_REQUIRED_LEADER_MAX_SCORE),
          hue: 325,
          skinPattern: AI_REQUIRED_LEADER_PINK_PATTERN
        });
      }
      for (let i = 0; i < Math.max(0, this.botCount - 1); i++) {
        this.createSnake(false);
      }
      this.forceRequiredLeaderTop10Spot();
    }

    respawnBot() {
      const hasRequiredLeader = this.snakes.some((s) => !s.isPlayer && s.alive && s.name === AI_REQUIRED_LEADER_NAME);
      if (!hasRequiredLeader) {
        this.createSnake({
          isPlayer: false,
          name: AI_REQUIRED_LEADER_NAME,
          startScore: randRangeInt(this.rng, AI_REQUIRED_LEADER_MIN_SCORE, AI_REQUIRED_LEADER_MAX_SCORE),
          hue: 325,
          skinPattern: AI_REQUIRED_LEADER_PINK_PATTERN
        });
        this.forceRequiredLeaderTop10Spot();
        return;
      }
      this.createSnake(false);
    }
  }

  lib.World = World;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { World };
  }
})(typeof window !== 'undefined' ? window : globalThis);
