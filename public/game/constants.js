(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};

  lib.CONSTANTS = {
    TICK_RATE: 60,
    FIXED_DT: 1 / 60,
    WORLD_RADIUS: 3600,
    GRID_SIZE: 84,
    INITIAL_PELLETS: 760,
    MAX_PELLETS: 1300,
    BOT_COUNT: 24,
    BASE_SPEED: 132,
    BOOST_SPEED: 272,
    PLAYER_BOOST_MULTIPLIER: 1.5,
    BASE_TURN_RATE: Math.PI * 2,
    SEGMENT_SPACING: 12,
    HEAD_RADIUS: 11,
    BODY_RADIUS: 9,
    START_MASS: 32,
    MIN_MASS: 12,
    MIN_SCORE: 10,
    SCORE_TO_MASS_BASE: 24,
    SCORE_TO_MASS_SCALE: 8,
    SCORE_SYNC_RATE: 12,
    BASE_SEGMENTS: 16,
    MASS_TO_SEGMENTS: 0.33,
    MAX_SEGMENTS_PLAYER: 660,
    MAX_SEGMENTS_BOT: 690,
    BOOST_MASS_LOSS_PER_SEC: 8.2,
    BOOST_SCORE_LOSS_PER_SEC: 12,
    BOOST_DROP_INTERVAL: 0.07,
    PELLET_MIN_VALUE: 0.6,
    PELLET_MAX_VALUE: 2.8,
    CAMERA_LERP: 0.11,
    ZOOM_BASE: 1,
    ZOOM_MIN: 0.55,
    ZOOM_PER_MASS: 0.0027,
    BOT_LOOKAHEAD: 150,
    DEV_SHOW_DEBUG: false,
    LIVE_BASE_BOTS: 12,
    BOTS_PER_PLAYER: 2,
    MIN_LIVE_BOTS: 4,
    MAX_PLAYERS: 20,
    NET_SNAPSHOT_INTERVAL: 67
  };

  lib.clamp = function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  };

  lib.lerp = function lerp(a, b, t) {
    return a + (b - a) * t;
  };

  lib.normalizeAngle = function normalizeAngle(a) {
    let v = a;
    while (v <= -Math.PI) v += Math.PI * 2;
    while (v > Math.PI) v -= Math.PI * 2;
    return v;
  };

  lib.angleDelta = function angleDelta(from, to) {
    return lib.normalizeAngle(to - from);
  };

  lib.createRng = function createRng(seed) {
    let s = seed >>> 0;
    return function rng() {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
