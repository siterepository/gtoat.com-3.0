(function (global) {
  const lib = global.GTOAT_SLITHER_LIB = global.GTOAT_SLITHER_LIB || {};
  const C = lib.CONSTANTS;
  const TOP_COLORS = ['#ffe600', '#00f0ff', '#ff7a00', '#39ff14', '#ff2fd1', '#6f7dff', '#00ffa8', '#ff3b3b', '#c7ff00', '#7affff'];
  const BANNED_BOT_NAMES = new Set(['vicky', 'copperjoe', 'breeze']);
  const BELLA_BOT_NAME = '[GTOAT] Bella';
  const BELLA_MIN_SCORE = 91223;
  const BELLA_MAX_SCORE = 98736;
  const PLAYER_LOGS_KEY = 'gtoat_player_logs_v1';
  const PLAYER_LOGS_LIMIT = 800;
  const PENDING_SHARED_HS_KEY = 'gtoat_pending_shared_highscores_v1';
  const PENDING_SHARED_HS_LIMIT = 400;
  const CITY_LOOKUP_URL = 'https://ipapi.co/json/';
  const SUPABASE_REST_URL = 'https://nndyngflhsqcvryclkbc.supabase.co/rest/v1/highscores';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZHluZ2ZsaHNxY3ZyeWNsa2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzMyMTksImV4cCI6MjA5MDIwOTIxOX0.iP63FibyKsAFDKrz1r_-fer1sZ9R39ZOk0WkW2DNRWQ';
  const DEVICE_TYPE = detectDeviceType(
    global && global.navigator && typeof global.navigator.userAgent === 'string'
      ? global.navigator.userAgent
      : ''
  );
  const GRINCH_ANGRY_PATTERN = [
    ...Array(11).fill('#7b38d8'),
    '#ffe14b',
    '#e23b3b',
    '#ffe14b',
    ...Array(11).fill('#7b38d8'),
    '#ffe14b',
    '#3f75ff'
  ];

  const PLAYER_SELECT_PROFILES = [
    { id: 'grinch', name: '[GTOAT] GRINCH >:)', hue: 270, skinPattern: GRINCH_ANGRY_PATTERN }
  ];

  function readPlayerLogs() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(PLAYER_LOGS_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writePlayerLogs(logs) {
    try {
      if (!global.localStorage) return;
      const trimmed = Array.isArray(logs) ? logs.slice(-PLAYER_LOGS_LIMIT) : [];
      global.localStorage.setItem(PLAYER_LOGS_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  function readPendingSharedHighscores() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(PENDING_SHARED_HS_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writePendingSharedHighscores(entries) {
    try {
      if (!global.localStorage) return;
      const trimmed = Array.isArray(entries) ? entries.slice(-PENDING_SHARED_HS_LIMIT) : [];
      global.localStorage.setItem(PENDING_SHARED_HS_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  function pad2(v) {
    return String(v).padStart(2, '0');
  }

  function makeMatchId() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `m_${Date.now().toString(36)}_${rand}`;
  }

  function formatPlayTime(ms) {
    const safeMs = Math.max(0, Number.isFinite(ms) ? ms : 0);
    const total = Math.floor(safeMs / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
    return `${m}:${pad2(s)}`;
  }

  function detectDeviceType(uaRaw) {
    const ua = (uaRaw || '').toLowerCase();
    if (!ua) return 'Unknown';
    if (/bot|crawl|spider|slurp|facebookexternalhit|monitoring|pingdom/.test(ua)) return 'Bot';
    if (/tablet|ipad|playbook|silk|kindle|nexus 7|nexus 9|sm-t|tab/.test(ua)) return 'Tablet';
    if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function sanitizeBotDisplayName(nameRaw) {
    const raw = (typeof nameRaw === 'string' && nameRaw.trim()) ? nameRaw.trim() : 'Snake';
    if (raw === BELLA_BOT_NAME) return BELLA_BOT_NAME;
    const lower = raw.toLowerCase();
    const hasBannedToken = Array.from(BANNED_BOT_NAMES).some((n) => {
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(lower);
    });
    if (hasBannedToken) return '[BOT] NightShift';
    return raw;
  }

  function buildPinnedBellaLeaderboard(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const cleaned = [];
    for (let i = 0; i < list.length; i++) {
      const row = list[i] || {};
      const isPlayer = !!row.isPlayer;
      const score = Number.isFinite(row.score) ? Math.max(10, Math.round(row.score)) : 10;
      const nameRaw = (typeof row.name === 'string' && row.name.trim()) ? row.name.trim() : 'Snake';
      const name = isPlayer ? nameRaw : sanitizeBotDisplayName(nameRaw);
      cleaned.push({
        id: row.id || 0,
        name,
        score,
        isPlayer
      });
    }

    let bella = cleaned.find((r) => !r.isPlayer && r.name === BELLA_BOT_NAME) || null;
    if (!bella) {
      bella = {
        id: 'bella_virtual',
        name: BELLA_BOT_NAME,
        score: Math.floor((BELLA_MIN_SCORE + BELLA_MAX_SCORE) / 2),
        isPlayer: false
      };
    } else {
      bella.score = Math.max(BELLA_MIN_SCORE, bella.score);
    }

    const others = cleaned
      .filter((r) => !(r.name === BELLA_BOT_NAME && !r.isPlayer))
      .sort((a, b) => (b.score - a.score));

    const ordered = [bella, ...others].slice(0, 10);
    return ordered.map((r, idx) => ({
      rank: idx + 1,
      id: r.id,
      name: r.name,
      score: r.score,
      isPlayer: !!r.isPlayer
    }));
  }

  function buildLogApiCandidates(pathname) {
    const out = [];
    const seen = new Set();
    const add = (value) => {
      if (typeof value !== 'string') return;
      const s = value.trim();
      if (!s || seen.has(s)) return;
      seen.add(s);
      out.push(s);
    };
    const inferType = (path) => {
      if (/highscores/.test(path)) return 'highscores';
      if (/activity/.test(path)) return 'activity';
      return '';
    };
    const addTypedRelative = (type) => {
      if (!type) return;
      add(`log_api.php?type=${type}`);
      add(`./log_api.php?type=${type}`);
      add(`api/logs/${type}.php`);
      add(`./api/logs/${type}.php`);
      add(`api/logs/${type}/`);
      add(`./api/logs/${type}/`);
      add(`api/logs/${type}/index.php`);
      add(`./api/logs/${type}/index.php`);
    };
    const addTypedAbsolute = (base, type) => {
      if (!base || !type) return;
      add(`${base}/log_api.php?type=${type}`);
      add(`${base}/api/logs/${type}.php`);
      add(`${base}/api/logs/${type}/`);
      add(`${base}/api/logs/${type}/index.php`);
    };
    const path = typeof pathname === 'string' ? pathname : '';
    const noLead = path.replace(/^\/+/, '');
    const type = inferType(path);

    if (typeof global.GTOAT_LOG_API_URL === 'string' && global.GTOAT_LOG_API_URL.trim()) {
      const customBase = global.GTOAT_LOG_API_URL.trim().replace(/\/$/, '');
      addTypedAbsolute(customBase, type);
      if (path) add(customBase + path);
      if (noLead) add(`${customBase}/${noLead}`);
    }

    addTypedRelative(type);
    if (path) add(path);
    if (noLead) {
      add(noLead);
      add(`./${noLead}`);
    }

    if (global.location && global.location.origin) {
      const originBase = global.location.origin.replace(/\/$/, '');
      addTypedAbsolute(originBase, type);
      if (path) add(originBase + path);
      if (noLead) add(`${originBase}/${noLead}`);
    }
    return out;
  }

  function mapHsToSnakeCase(entry) {
    return {
      id: entry.id,
      ts: entry.ts,
      date: entry.date,
      time: entry.time,
      score_at_death: entry.scoreAtDeath,
      time_played: entry.timePlayed,
      city: entry.city,
      state: entry.state,
      device_type: entry.deviceType,
      ip_address: entry.ipAddress,
      mode: entry.mode
    };
  }

  function postSharedHighscore(entry) {
    var mapped = mapHsToSnakeCase(entry);

    if (global.GTOAT_SUPABASE) {
      return global.GTOAT_SUPABASE
        .from('highscores')
        .upsert(mapped)
        .then(function (result) {
          return !(result && result.error);
        })
        .catch(function () {
          return false;
        });
    }

    return fetch(SUPABASE_REST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(mapped),
      keepalive: true
    }).then(function (res) {
      return res && res.ok;
    }).catch(function () {
      return false;
    });
  }

  function beaconSharedHighscore(entry) {
    if (!entry) return false;
    var mapped = mapHsToSnakeCase(entry);
    var payload = JSON.stringify(mapped);

    try {
      fetch(SUPABASE_REST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: payload,
        keepalive: true
      }).catch(function () {});
      return true;
    } catch (e) {}

    if (global.navigator && typeof global.navigator.sendBeacon === 'function') {
      try {
        var blob = new Blob([payload], { type: 'application/json' });
        if (global.navigator.sendBeacon(SUPABASE_REST_URL, blob)) return true;
      } catch (e2) {}
    }

    return false;
  }

  function flushPendingSharedHighscores() {
    const queue = readPendingSharedHighscores();
    if (!queue.length) return Promise.resolve(0);
    let sent = 0;
    const failed = [];
    const sendAt = (i) => {
      if (i >= queue.length) {
        writePendingSharedHighscores(failed);
        return Promise.resolve(sent);
      }
      const entry = queue[i];
      return postSharedHighscore(entry)
        .then((ok) => {
          if (ok) sent++;
          else failed.push(entry);
          return sendAt(i + 1);
        })
        .catch(() => {
          failed.push(entry);
          return sendAt(i + 1);
        });
    };
    return sendAt(0);
  }

  function queueSharedHighscore(entry) {
    if (!entry || typeof entry !== 'object') return;
    const queue = readPendingSharedHighscores();
    queue.push(entry);
    writePendingSharedHighscores(queue);
    beaconSharedHighscore(entry);
    void flushPendingSharedHighscores();
  }

  if (global && global.addEventListener) {
    global.addEventListener('online', () => {
      void flushPendingSharedHighscores();
    });
  }

  function defaultWsUrl() {
    if (typeof global.GTOAT_SLITHER_WS_URL === 'string' && global.GTOAT_SLITHER_WS_URL.trim()) {
      return global.GTOAT_SLITHER_WS_URL.trim();
    }
    const host = (global.location && global.location.hostname) ? global.location.hostname : 'localhost';
    const proto = (global.location && global.location.protocol === 'https:') ? 'wss' : 'ws';
    return `${proto}://${host}:8080`;
  }

  function buildWsCandidates(preferred) {
    const candidates = [];
    if (typeof preferred === 'string' && preferred.trim()) {
      candidates.push(preferred.trim());
    }
    if (!candidates.length) candidates.push('wss://gtoat-server.onrender.com');
    return candidates;
  }

  function ensureGtoatTag(name, fallback) {
    const base = (typeof name === 'string' && name.trim()) ? name.trim() : fallback;
    if (!base) return '[GTOAT] Player';
    const fixed = base.startsWith('[GTOAT]') ? base : `[GTOAT] ${base}`;
    return fixed.slice(0, 28);
  }

  function patternGradient(pattern) {
    if (!Array.isArray(pattern) || !pattern.length) return '#ffffff';
    const step = 100 / pattern.length;
    const stops = [];
    for (let i = 0; i < pattern.length; i++) {
      stops.push(`${pattern[i]} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`);
    }
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }

  class NetSession {
    constructor(url, handlers) {
      this.url = url;
      this.handlers = handlers || {};
      this.ws = null;
      this.connected = false;
      this.clientId = 0;
      this.snakeId = 0;
      this.closedByClient = false;
    }

    connect(name, profileId) {
      this.disconnect();
      this.closedByClient = false;
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener('open', () => {
        this.connected = true;
        this.send({ type: 'join', name, profileId });
        if (this.handlers.onOpen) this.handlers.onOpen();
      });
      this.ws.addEventListener('close', () => {
        this.connected = false;
        if (this.handlers.onClose) this.handlers.onClose(this.closedByClient);
      });
      this.ws.addEventListener('error', (err) => {
        if (this.handlers.onError) this.handlers.onError(err);
      });
      this.ws.addEventListener('message', (event) => {
        let msg = null;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'welcome') {
          this.clientId = msg.clientId || 0;
          this.snakeId = msg.snakeId || 0;
          if (this.handlers.onWelcome) this.handlers.onWelcome(msg);
          return;
        }
        if (msg.type === 'spawn') {
          this.snakeId = msg.snakeId || 0;
          if (this.handlers.onSpawn) this.handlers.onSpawn(msg);
          return;
        }
        if (msg.type === 'died') {
          if (this.handlers.onDied) this.handlers.onDied(msg);
          return;
        }
        if (msg.type === 'snapshot') {
          if (this.handlers.onSnapshot) this.handlers.onSnapshot(msg);
          return;
        }
        if (msg.type === 'pong') {
          if (this.handlers.onPong) this.handlers.onPong(msg);
          return;
        }
      });
    }

    disconnect() {
      if (!this.ws) return;
      this.closedByClient = true;
      try { this.ws.close(); } catch {}
      this.ws = null;
      this.connected = false;
    }

    send(payload) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.ws.send(JSON.stringify(payload));
    }

    sendInput(payload) {
      this.send({
        type: 'input',
        targetX: payload.targetX,
        targetY: payload.targetY,
        hasPointer: !!payload.hasPointer,
        boost: !!payload.boost,
        hasAngle: !!payload.hasAngle,
        targetAngle: payload.targetAngle || 0
      });
    }
  }

  class SlitherOverlayApp {
    constructor() {
      this.engine = null;
      this.renderer = null;
      this.overlay = null;
      this.canvas = null;
      this.minimapCanvas = null;
      this.minimapCtx = null;
      this.musicBtn = null;
      this.modeAiBtn = null;
      this.modal = null;
      this.hudStats = null;
      this.leaderboard = null;
      this.deathLayer = null;
      this.deathTitle = null;
      this.dyingLayer = null;
      this.setupLayer = null;
      this.setupProfilePreview = null;
      this.setupAiBotBtn = null;
      this.setupStatus = null;
      this.mobileControls = null;
      this.mobileBoostBtn = null;
      this.mobileSteerZone = null;
      this.mobileSteerThumb = null;
      this.deathTimer = null;
      this.boundResize = this.handleResize.bind(this);
      this.pointer = { x: 0, y: 0, active: false, boost: false };
      this.mobileBoostTouchId = null;
      this.mobileSteerTouchId = null;
      this.boundHandlers = null;
      this.lowPerf = false;
      this.minimapFrame = 0;
      this.hudFrame = 0;
      this.musicCtx = null;
      this.musicTimer = 0;
      this.musicEnabled = false;
      this.musicStep = 0;

      this.mode = 'AI';
      this.serverUrl = defaultWsUrl();
      this.net = null;
      this.netWorld = null;
      this.netClientId = 0;
      this.netConnected = false;
      this.netLoopHandle = 0;
      this.lastNetInputTs = 0;
      this.lastHudStats = null;
      this.liveConnectState = 'IDLE';
      this.liveError = '';
      this.playConnectToken = 0;
      this.playConnectTimer = 0;
      this.playConnectEndpoints = [];
      this.playConnectIndex = -1;
      this.matchStartedAt = 0;
      this.matchId = '';
      this.loggedMatchId = '';
      this.playerCity = 'Unknown';
      this.playerState = 'Unknown';
      this.playerIp = 'Unknown';
      this.cityLookupDone = false;
      this.cityLookupPromise = null;

      this.selectedProfileId = null;
      this.matchActive = false;
    }

    ensureCityLookup() {
      if (this.cityLookupPromise) return this.cityLookupPromise;
      if (this.cityLookupDone) return Promise.resolve(this.playerCity);

      this.cityLookupPromise = fetch(CITY_LOOKUP_URL, { cache: 'no-store' })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          const city = data && typeof data.city === 'string' ? data.city.trim() : '';
          const stateName = data && typeof data.region === 'string' ? data.region.trim() : '';
          const ip = data && typeof data.ip === 'string' ? data.ip.trim() : '';
          if (city) this.playerCity = city;
          if (stateName) this.playerState = stateName;
          if (ip) this.playerIp = ip;
          this.cityLookupDone = true;
          return this.playerCity;
        })
        .catch(() => {
          this.cityLookupDone = true;
          return this.playerCity;
        })
        .finally(() => {
          this.cityLookupPromise = null;
        });

      return this.cityLookupPromise;
    }

    beginSession() {
      this.matchStartedAt = Date.now();
      this.matchId = makeMatchId();
      this.loggedMatchId = '';
      this.ensureCityLookup();
    }

    getCurrentScore() {
      if (this.mode === 'PLAY' && this.netWorld && this.netWorld.player && Number.isFinite(this.netWorld.player.score)) {
        return Math.max(10, Math.round(this.netWorld.player.score));
      }
      if (this.lastHudStats && Number.isFinite(this.lastHudStats.score)) {
        return Math.max(10, Math.round(this.lastHudStats.score));
      }
      return 10;
    }

    logDeathSession() {
      if (!this.matchId || this.loggedMatchId === this.matchId) return;
      if (!this.matchStartedAt) this.matchStartedAt = Date.now();

      const now = new Date();
      const year = now.getFullYear();
      const month = pad2(now.getMonth() + 1);
      const day = pad2(now.getDate());
      const hour = pad2(now.getHours());
      const minute = pad2(now.getMinutes());
      const second = pad2(now.getSeconds());
      const playedMs = Date.now() - this.matchStartedAt;

      const entry = {
        id: this.matchId,
        ts: Date.now(),
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}:${second}`,
        scoreAtDeath: this.getCurrentScore(),
        timePlayed: formatPlayTime(playedMs),
        city: this.playerCity || 'Unknown',
        state: this.playerState || 'Unknown',
        deviceType: DEVICE_TYPE,
        ipAddress: this.playerIp || 'Unknown',
        mode: this.mode
      };

      const logs = readPlayerLogs();
      logs.push(entry);
      writePlayerLogs(logs);
      queueSharedHighscore(entry);
      this.loggedMatchId = this.matchId;
    }

    getSelectedProfile() {
      const key = (this.selectedProfileId || '').toLowerCase();
      const found = PLAYER_SELECT_PROFILES.find((p) => p.id.toLowerCase() === key);
      return found || PLAYER_SELECT_PROFILES[0];
    }

    setSelectedProfile(profileId) {
      const found = PLAYER_SELECT_PROFILES.find((p) => p.id === profileId);
      if (!found) return;
      this.selectedProfileId = found.id;
      this.renderSetupProfilePreview();
    }

    mount() {
      if (this.overlay) return;
      if (!this.selectedProfileId && PLAYER_SELECT_PROFILES.length) {
        this.selectedProfileId = PLAYER_SELECT_PROFILES[0].id;
      }

      const overlay = document.createElement('div');
      overlay.className = 'gtoat-slither-overlay';
      overlay.innerHTML = '' +
        '<div class="gtoat-slither-modal" role="dialog" aria-modal="true" aria-label="Slither Game">' +
          '<div class="gtoat-slither-hud">' +
            '<div class="gtoat-slither-panel" id="gtoat-slither-stats">Score: 10<br>Kills: 0<br>Boost: OFF<br>Bots: 0</div>' +
            '<div class="gtoat-slither-actions">' +
              '<button class="gtoat-slither-btn" id="gtoat-slither-mode-ai" type="button">AI</button>' +
              '<div class="gtoat-slither-panel gtoat-slither-leaderboard" id="gtoat-slither-leaderboard"><h4>Top 10</h4><ol></ol></div>' +
            '</div>' +
          '</div>' +
          '<canvas class="gtoat-slither-canvas"></canvas>' +
          '<div class="gtoat-mobile-controls" id="gtoat-mobile-controls">' +
            '<button class="gtoat-mobile-boost" id="gtoat-mobile-boost" type="button" aria-label="Boost">' +
              '<span class="gtoat-mobile-boost-arrow">&#9650;</span>' +
              '<span class="gtoat-mobile-boost-label">BOOST</span>' +
            '</button>' +
            '<div class="gtoat-mobile-steer-zone" id="gtoat-mobile-steer-zone" aria-label="Steer">' +
              '<span class="gtoat-mobile-joy-thumb" id="gtoat-mobile-joy-thumb"></span>' +
            '</div>' +
          '</div>' +
          '<div class="gtoat-slither-minimap-wrap"><canvas id="gtoat-slither-minimap" width="170" height="170"></canvas></div>' +
          '<button class="gtoat-slither-btn gtoat-slither-music-btn" id="gtoat-slither-music" type="button">Music (OFF)</button>' +
          '<button class="gtoat-slither-btn gtoat-slither-close-corner" id="gtoat-slither-exit" type="button">Close</button>' +
          '<div class="gtoat-slither-setup" id="gtoat-slither-setup">' +
            '<div class="gtoat-slither-setup-card">' +
              '<div class="gtoat-setup-profile-preview" id="gtoat-setup-profile-preview"></div>' +
              '<div class="gtoat-setup-mode-buttons">' +
                '<button class="gtoat-slither-btn gtoat-setup-btn-ai" id="gtoat-setup-ai-bot" type="button">' +
                  '<span class="gtoat-setup-btn-icon">\uD83E\uDD16</span>' +
                  '<span class="gtoat-setup-btn-label">Play with AI Bots</span>' +
                '</button>' +
              '</div>' +
              '<div class="gtoat-setup-status" id="gtoat-setup-status"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gtoat-slither-dying" id="gtoat-slither-dying"></div>' +
          '<div class="gtoat-slither-death" id="gtoat-slither-death">' +
            '<div class="gtoat-slither-card">' +
              '<h2 class="gtoat-slither-title" id="gtoat-slither-death-title">You died</h2>' +
              '<div class="gtoat-slither-actions">' +
                '<button class="gtoat-slither-btn" id="gtoat-slither-replay" type="button">Play Again</button>' +
                '<button class="gtoat-slither-btn" id="gtoat-slither-exit2" type="button">Exit</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      this.overlay = overlay;
      this.modal = overlay.querySelector('.gtoat-slither-modal');
      this.canvas = overlay.querySelector('.gtoat-slither-canvas');
      this.minimapCanvas = overlay.querySelector('#gtoat-slither-minimap');
      this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
      this.musicBtn = overlay.querySelector('#gtoat-slither-music');
      this.modeAiBtn = overlay.querySelector('#gtoat-slither-mode-ai');
      this.hudStats = overlay.querySelector('#gtoat-slither-stats');
      this.leaderboard = overlay.querySelector('#gtoat-slither-leaderboard ol');
      this.setupLayer = overlay.querySelector('#gtoat-slither-setup');
      this.setupProfilePreview = overlay.querySelector('#gtoat-setup-profile-preview');
      this.setupAiBotBtn = overlay.querySelector('#gtoat-setup-ai-bot');
      this.setupStatus = overlay.querySelector('#gtoat-setup-status');
      this.mobileControls = overlay.querySelector('#gtoat-mobile-controls');
      this.mobileBoostBtn = overlay.querySelector('#gtoat-mobile-boost');
      this.mobileSteerZone = overlay.querySelector('#gtoat-mobile-steer-zone');
      this.mobileSteerThumb = overlay.querySelector('#gtoat-mobile-joy-thumb');
      this.deathLayer = overlay.querySelector('#gtoat-slither-death');
      this.deathTitle = overlay.querySelector('#gtoat-slither-death-title');
      this.dyingLayer = overlay.querySelector('#gtoat-slither-dying');
      this.renderer = new lib.Renderer(this.canvas);
      this.engine = new lib.Engine({
        playerCount: 1,
        playerProfile: this.getSelectedProfile(),
        playerProfiles: [this.getSelectedProfile()],
        onHud: this.updateHud.bind(this),
        onDeath: this.showDeath.bind(this),
        onRender: (world, alpha) => {
          if (this.mode !== 'AI') return;
          const players = (Array.isArray(world.players) && world.players.length)
            ? world.players
            : (world.player ? [world.player] : []);
          const focus = players.find((p) => p && p.alive) || world.player;

          if (focus && focus.alive) this.renderer.updateCamera(focus);
          this.renderer.render(world, alpha);
          this.renderMinimap(world);

          if (focus && focus.alive && this.pointer.active) {
            const worldPt = this.renderer.screenToWorld(this.pointer.x, this.pointer.y);
            this.renderer.setPointerWorldTarget(worldPt.x, worldPt.y, true);
            this.engine.setPlayerInput(0, worldPt.x, worldPt.y, this.pointer.boost, true, 0, false);
          } else {
            this.renderer.setPointerWorldTarget(0, 0, false);
            this.engine.setPlayerInput(0, 0, 0, this.pointer.boost, false, 0, false);
          }
        }
      });

      // Wire engine pellet-eat callback to renderer sparkle effect
      this.engine.onPelletEat = (x, y, hue) => {
        this.renderer.notifyPelletEat(x, y, hue);
      };

      this.bindInputs();
      window.addEventListener('resize', this.boundResize);
      // Mobile viewport resize: respond to visualViewport changes (keyboard pop, orientation change)
      if (global.visualViewport) {
        global.visualViewport.addEventListener('resize', this.boundResize);
        global.visualViewport.addEventListener('orientationchange', this.boundResize);
      }

      overlay.querySelector('#gtoat-slither-exit').addEventListener('click', () => this.exit());
      overlay.querySelector('#gtoat-slither-exit2').addEventListener('click', () => this.exit());
      overlay.querySelector('#gtoat-slither-replay').addEventListener('click', () => this.playAgain());
      if (this.musicBtn) this.musicBtn.addEventListener('click', () => this.toggleCircusMusic());
      if (this.modeAiBtn) this.modeAiBtn.addEventListener('click', () => this.setMode('AI', true));
      if (this.setupAiBotBtn) this.setupAiBotBtn.addEventListener('click', () => this.beginAiFromSetup());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) this.exit(); });

      this.renderSetupProfilePreview();
      this.updateModeButtons();
      this.showSetup();
    }

    renderSetupProfilePreview() {
      if (!this.setupProfilePreview) return;
      const profile = this.getSelectedProfile();
      this.setupProfilePreview.innerHTML = '' +
        `<span class="gtoat-profile-name">${profile.name}</span>` +
        `<span class="gtoat-profile-skin" style="background:${patternGradient(profile.skinPattern)}"></span>`;
    }

    beginLiveFromSetup() {
      // Live mode removed — always use AI
      this.beginAiFromSetup();
    }

    beginAiFromSetup() {
      this.clearPlayConnectTimer();
      this.playConnectToken += 1;
      this.mode = 'AI';
      this.updateModeButtons();
      this.setSetupStatus('', '');
      this.beginMatchFromSetup();
    }

    setSetupStatus(type, msg) {
      if (!this.setupStatus) return;
      this.setupStatus.className = 'gtoat-setup-status' + (type ? ' gtoat-setup-status--' + type : '');
      this.setupStatus.textContent = msg || '';
    }

    disableSetupButtons(disabled) {
      if (this.setupAiBotBtn) this.setupAiBotBtn.disabled = disabled;
    }

    showSetup() {
      if (this.setupLayer) this.setupLayer.classList.add('active');
      this.setSetupStatus('', '');
      this.disableSetupButtons(false);
    }

    hideSetup() {
      if (this.setupLayer) this.setupLayer.classList.remove('active');
    }

    beginMatchFromSetup() {
      const profile = this.getSelectedProfile();
      this.selectedProfileId = profile.id;
      this.hideSetup();
      this.hideDeath();
      this.matchActive = true;
      this.pointer.active = false;
      this.pointer.boost = false;
      this.mobileBoostTouchId = null;
      this.mobileSteerTouchId = null;
      this.resetMobileJoystick();
      this.minimapFrame = 0;
      this.lowPerf = false;
      this.hudFrame = 0;
      if (this.renderer) this.renderer.setLowFx(false);
      if (this.musicBtn) this.musicBtn.textContent = this.musicEnabled ? 'Music (ON)' : 'Music (OFF)';

      if (this.mode === 'PLAY') {
        this.startPlayMatch();
      } else {
        const seed = (Date.now() & 0xffffffff) >>> 0;
        this.startAiMatch(seed);
      }
      this.handleResize();
    }

    bindInputs() {
      const canvas = this.canvas;
      const boostBtn = this.mobileBoostBtn;
      const steerZone = this.mobileSteerZone;
      const steerThumb = this.mobileSteerThumb;

      const setPointerFromClient = (clientX, clientY) => {
        const r = canvas.getBoundingClientRect();
        this.pointer.x = lib.clamp(clientX - r.left, 0, r.width);
        this.pointer.y = lib.clamp(clientY - r.top, 0, r.height);
        this.pointer.active = true;
      };
      const setPointerFromJoystick = (clientX, clientY) => {
        if (!steerZone) return;
        const joyRect = steerZone.getBoundingClientRect();
        const joyCenterX = joyRect.left + (joyRect.width * 0.5);
        const joyCenterY = joyRect.top + (joyRect.height * 0.5);
        let dx = clientX - joyCenterX;
        let dy = clientY - joyCenterY;
        const maxOffset = Math.max(10, Math.min(joyRect.width, joyRect.height) * 0.34);
        const dist = Math.hypot(dx, dy);
        const deadZone = maxOffset * 0.16;
        if (dist <= deadZone) {
          if (steerThumb) {
            steerThumb.style.setProperty('--joy-x', '0px');
            steerThumb.style.setProperty('--joy-y', '0px');
          }
          this.pointer.active = false;
          return;
        }
        if (dist > maxOffset && dist > 0) {
          const scale = maxOffset / dist;
          dx *= scale;
          dy *= scale;
        }
        if (steerThumb) {
          steerThumb.style.setProperty('--joy-x', `${dx}px`);
          steerThumb.style.setProperty('--joy-y', `${dy}px`);
        }

        const nx = maxOffset > 0 ? (dx / maxOffset) : 0;
        const ny = maxOffset > 0 ? (dy / maxOffset) : 0;
        const r = canvas.getBoundingClientRect();
        const pointerRange = Math.max(42, Math.min(r.width, r.height) * 0.34);
        this.pointer.x = lib.clamp((r.width * 0.5) + nx * pointerRange, 0, r.width);
        this.pointer.y = lib.clamp((r.height * 0.5) + ny * pointerRange, 0, r.height);
        this.pointer.active = true;
      };
      const clearJoystickPointer = () => {
        this.pointer.active = false;
        this.resetMobileJoystick();
      };

      const touchFromList = (touchList, id) => {
        if (!touchList || id === null || typeof id === 'undefined') return null;
        for (let i = 0; i < touchList.length; i++) {
          if (touchList[i].identifier === id) return touchList[i];
        }
        return null;
      };

      const onMouseMove = (e) => {
        setPointerFromClient(e.clientX, e.clientY);
      };
      const onTouchStart = (e) => {
        if (!e.touches[0]) return;
        setPointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onTouchMove = (e) => {
        if (!e.touches[0]) return;
        setPointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onTouchEnd = (e) => {
        if (!e.touches || e.touches.length === 0) this.pointer.active = false;
      };
      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.pointer.boost = true;
      };
      const onMouseUp = () => { this.pointer.boost = false; };
      const onBoostTouchStart = (e) => {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        e.preventDefault();
        this.mobileBoostTouchId = e.changedTouches[0].identifier;
        this.pointer.boost = true;
      };
      const onBoostTouchEnd = (e) => {
        if (this.mobileBoostTouchId === null || !e.changedTouches) return;
        const ended = !!touchFromList(e.changedTouches, this.mobileBoostTouchId);
        if (!ended) return;
        this.mobileBoostTouchId = null;
        this.pointer.boost = false;
      };
      const onBoostMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.pointer.boost = true;
      };
      const onBoostMouseUp = () => { this.pointer.boost = false; };
      const onSteerTouchStart = (e) => {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.mobileSteerTouchId = touch.identifier;
        setPointerFromJoystick(touch.clientX, touch.clientY);
      };
      const onSteerTouchMove = (e) => {
        if (this.mobileSteerTouchId === null) return;
        const touch = touchFromList(e.touches, this.mobileSteerTouchId) || touchFromList(e.changedTouches, this.mobileSteerTouchId);
        if (!touch) return;
        e.preventDefault();
        setPointerFromJoystick(touch.clientX, touch.clientY);
      };
      const onSteerTouchEnd = (e) => {
        if (this.mobileSteerTouchId === null || !e.changedTouches) return;
        const ended = !!touchFromList(e.changedTouches, this.mobileSteerTouchId);
        if (!ended) return;
        this.mobileSteerTouchId = null;
        clearJoystickPointer();
      };
      const onWindowTouchEnd = (e) => {
        if (e && e.changedTouches) {
          if (this.mobileBoostTouchId !== null && touchFromList(e.changedTouches, this.mobileBoostTouchId)) {
            this.mobileBoostTouchId = null;
            this.pointer.boost = false;
          }
          if (this.mobileSteerTouchId !== null && touchFromList(e.changedTouches, this.mobileSteerTouchId)) {
            this.mobileSteerTouchId = null;
            clearJoystickPointer();
          }
        }
      };
      const onWindowBlur = () => {
        this.mobileBoostTouchId = null;
        this.mobileSteerTouchId = null;
        clearJoystickPointer();
        this.pointer.boost = false;
      };
      const onKeyDown = (e) => {
        if (e.code === 'Space') {
          this.pointer.boost = true;
          e.preventDefault();
        }
        if (e.code === 'Digit1') this.setMode('AI', this.matchActive);
        if (e.key === 'Escape') this.exit();
      };
      const onKeyUp = (e) => {
        if (e.code === 'Space') this.pointer.boost = false;
      };

      this.boundHandlers = {
        onMouseMove,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onMouseDown,
        onMouseUp,
        onBoostTouchStart,
        onBoostTouchEnd,
        onBoostMouseDown,
        onBoostMouseUp,
        onSteerTouchStart,
        onSteerTouchMove,
        onSteerTouchEnd,
        onWindowTouchEnd,
        onWindowBlur,
        onKeyDown,
        onKeyUp
      };

      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      canvas.addEventListener('touchmove', onTouchMove, { passive: true });
      canvas.addEventListener('touchend', onTouchEnd);
      canvas.addEventListener('touchcancel', onTouchEnd);
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('dragstart', lib.preventDefaultHandler);
      canvas.addEventListener('selectstart', lib.preventDefaultHandler);
      if (boostBtn) {
        boostBtn.addEventListener('touchstart', onBoostTouchStart, { passive: false });
        boostBtn.addEventListener('touchend', onBoostTouchEnd);
        boostBtn.addEventListener('touchcancel', onBoostTouchEnd);
        boostBtn.addEventListener('mousedown', onBoostMouseDown);
      }
      if (steerZone) {
        steerZone.addEventListener('touchstart', onSteerTouchStart, { passive: false });
        steerZone.addEventListener('touchmove', onSteerTouchMove, { passive: false });
        steerZone.addEventListener('touchend', onSteerTouchEnd);
        steerZone.addEventListener('touchcancel', onSteerTouchEnd);
      }
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mouseup', onBoostMouseUp);
      window.addEventListener('touchend', onWindowTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true });
      window.addEventListener('blur', onWindowBlur);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    unbindInputs() {
      if (!this.boundHandlers || !this.canvas) return;
      const h = this.boundHandlers;
      this.canvas.removeEventListener('mousemove', h.onMouseMove);
      this.canvas.removeEventListener('touchstart', h.onTouchStart);
      this.canvas.removeEventListener('touchmove', h.onTouchMove);
      this.canvas.removeEventListener('touchend', h.onTouchEnd);
      this.canvas.removeEventListener('touchcancel', h.onTouchEnd);
      this.canvas.removeEventListener('mousedown', h.onMouseDown);
      this.canvas.removeEventListener('dragstart', lib.preventDefaultHandler);
      this.canvas.removeEventListener('selectstart', lib.preventDefaultHandler);
      if (this.mobileBoostBtn) {
        this.mobileBoostBtn.removeEventListener('touchstart', h.onBoostTouchStart);
        this.mobileBoostBtn.removeEventListener('touchend', h.onBoostTouchEnd);
        this.mobileBoostBtn.removeEventListener('touchcancel', h.onBoostTouchEnd);
        this.mobileBoostBtn.removeEventListener('mousedown', h.onBoostMouseDown);
      }
      if (this.mobileSteerZone) {
        this.mobileSteerZone.removeEventListener('touchstart', h.onSteerTouchStart);
        this.mobileSteerZone.removeEventListener('touchmove', h.onSteerTouchMove);
        this.mobileSteerZone.removeEventListener('touchend', h.onSteerTouchEnd);
        this.mobileSteerZone.removeEventListener('touchcancel', h.onSteerTouchEnd);
      }
      window.removeEventListener('mouseup', h.onMouseUp);
      window.removeEventListener('mouseup', h.onBoostMouseUp);
      window.removeEventListener('touchend', h.onWindowTouchEnd);
      window.removeEventListener('touchcancel', h.onWindowTouchEnd);
      window.removeEventListener('blur', h.onWindowBlur);
      window.removeEventListener('keydown', h.onKeyDown);
      window.removeEventListener('keyup', h.onKeyUp);
      this.boundHandlers = null;
    }

    setMode(mode, restart) {
      this.mode = 'AI';
      this.updateModeButtons();
    }

    updateModeButtons() {
      if (!this.modeAiBtn) return;
      this.modeAiBtn.style.borderColor = 'rgba(120,255,180,0.96)';
      this.modeAiBtn.style.background = 'rgba(12,88,57,0.9)';
      this.modeAiBtn.style.color = '#e2ffed';
    }

    updateSetupModeButtons() {
    }

    clearPlayConnectTimer() {
      if (!this.playConnectTimer) return;
      clearTimeout(this.playConnectTimer);
      this.playConnectTimer = 0;
    }

    netStatusLabel() {
      return 'LOCAL';
    }

    handlePlayConnectFailed(token) {
      if (token !== this.playConnectToken) return;
      this.liveConnectState = 'FAILED';
      this.netConnected = false;
      this.clearPlayConnectTimer();
      this.stopNetworkLoop();
      if (this.net) {
        this.net.disconnect();
        this.net = null;
      }
      if (this.setupLayer) this.showSetup();
      this.matchActive = false;
      this.disableSetupButtons(false);
      this.setSetupStatus('failed', 'Server waking up\u2026 retrying in 10s');
      this.playConnectTimer = setTimeout(() => {
        if (token !== this.playConnectToken) return;
        this.beginLiveFromSetup();
      }, 10000);
      this.refreshPlayHud();
    }

    async connectPlayEndpoint(token, endpoints, idx, playerName, profileId) {
      if (token !== this.playConnectToken || this.mode !== 'PLAY') return;
      if (idx >= endpoints.length) {
        this.handlePlayConnectFailed(token);
        return;
      }

      const url = endpoints[idx];
      this.playConnectEndpoints = endpoints;
      this.playConnectIndex = idx;
      this.liveConnectState = 'CONNECTING';
      this.netConnected = false;

      if (this.net) {
        this.net.disconnect();
        this.net = null;
      }

      // Health check pre-flight (only on first attempt)
      if (idx === 0 && !this._healthChecked) {
        const httpUrl = url.replace(/^wss?:\/\//, (m) => m === 'wss://' ? 'https://' : 'http://');
        const healthUrl = httpUrl.replace(/\/?(ws|multiplayer|socket)?$/, '') + '/health';
        try {
          this.setSetupStatus('connecting', 'Checking server\u2026');
          const healthResp = await fetch(healthUrl, { signal: AbortSignal.timeout(6000) }).catch(() => null);
          if (!healthResp || !healthResp.ok) {
            this.setSetupStatus('connecting', 'Server waking up\u2026 please wait');
            // Wait 5s for cold start, then try connecting
            await new Promise(r => setTimeout(r, 5000));
          }
          this._healthChecked = true;
        } catch (e) {
          this._healthChecked = true;
        }
      }

      let opened = false;
      let advanced = false;
      const advance = () => {
        if (advanced) return;
        advanced = true;
        this.clearPlayConnectTimer();
        if (token !== this.playConnectToken || this.mode !== 'PLAY') return;
        this.connectPlayEndpoint(token, endpoints, idx + 1, playerName, profileId);
      };

      // Calculate timeout with exponential backoff: 8s, 12s, 16s
      const timeout = Math.min(16000, 8000 + (idx * 4000));

      this.net = new NetSession(url, {
        onOpen: () => {
          if (token !== this.playConnectToken) return;
          opened = true;
          this.clearPlayConnectTimer();
          this.netConnected = true;
          this.liveConnectState = 'LIVE';
          this.liveError = '';
          this._healthChecked = false;
          this.refreshPlayHud();
        },
        onClose: (closedByClient) => {
          if (token !== this.playConnectToken) return;
          this.netConnected = false;
          if (!opened && !closedByClient) {
            advance();
            return;
          }
          if (opened && !closedByClient) {
            // Connection was established then lost — show reconnection
            this.liveConnectState = 'CONNECTING';
            this._reconnectAttempt = (this._reconnectAttempt || 0) + 1;
            const delay = Math.min(16000, 2000 * Math.pow(2, this._reconnectAttempt - 1));
            this.setSetupStatus('connecting', `Connection lost \u2014 reconnecting in ${Math.round(delay/1000)}s\u2026`);
            this.refreshPlayHud();
            this.clearPlayConnectTimer();
            this.playConnectTimer = setTimeout(() => {
              if (token !== this.playConnectToken) return;
              this.connectPlayEndpoint(token, endpoints, 0, playerName, profileId);
            }, delay);
            return;
          }
          this.refreshPlayHud();
        },
        onError: () => {
          if (token !== this.playConnectToken) return;
          this.liveError = `Failed endpoint: ${url}`;
          if (!opened) advance();
        },
        onWelcome: (msg) => {
          if (token !== this.playConnectToken) return;
          this.netClientId = msg.clientId || 0;
          this._reconnectAttempt = 0;
        },
        onSpawn: () => {
          if (token !== this.playConnectToken) return;
          this.hideDeath();
        },
        onDied: (msg) => {
          if (token !== this.playConnectToken) return;
          this.showDeath({ multiplayerRespawn: true, killerName: msg.killerName || null });
        },
        onSnapshot: (msg) => {
          if (token !== this.playConnectToken) return;
          this.applyNetworkSnapshot(msg.world);
        },
        onPong: (msg) => {
          if (token !== this.playConnectToken) return;
          if (msg.t) {
            this._latencyMs = Date.now() - msg.t;
          }
        },
      });

      this.net.connect(playerName, profileId);
      this.clearPlayConnectTimer();
      this.playConnectTimer = setTimeout(() => {
        if (token !== this.playConnectToken) return;
        if (!opened) advance();
      }, timeout);

      this.refreshPlayHud();
    }

    updateHud(stats) {
      if (!stats) return;
      this.lastHudStats = stats;
      this.hudFrame++;

      const debugLine = C.DEV_SHOW_DEBUG ? ('<br>FPS: ' + stats.fps + ' Ticks: ' + stats.ticks) : '';
      if ((this.hudFrame % 3) === 0 && this.hudStats) {
        let html = 'Score: ' + stats.score;
        html += '<br>Kills: ' + stats.kills;
        html += '<br>Boost: ' + (stats.boosting ? 'ON' : 'OFF');
        html += '<br>Bots: ' + stats.bots;
        this.hudStats.innerHTML = html + debugLine;
      }

      if (this.renderer) this.renderer.setLowFx(false);
      if (this.leaderboard && stats.leaderboard && (this.hudFrame % 6) === 0) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < stats.leaderboard.length; i++) {
          const row = stats.leaderboard[i];
          const color = row.rankColor || TOP_COLORS[i] || '#e9f4ff';
          const li = document.createElement('li');
          if (row.isOwnPlayer) li.className = 'player';
          else if (row.isPlayer) li.className = 'player player2';
          li.style.color = color;
          const nameSpan = document.createElement('span');
          nameSpan.textContent = row.rank + '. ' + row.name;
          const scoreSpan = document.createElement('span');
          scoreSpan.className = 'score';
          scoreSpan.style.color = color;
          scoreSpan.textContent = String(row.score);
          li.appendChild(nameSpan);
          li.appendChild(scoreSpan);
          frag.appendChild(li);
        }
        this.leaderboard.textContent = '';
        this.leaderboard.appendChild(frag);
      }
    }

    renderMinimap(world) {
      if (!this.minimapCtx || !this.minimapCanvas || !world) return;
      const ctx = this.minimapCtx;
      const w = this.minimapCanvas.width;
      const h = this.minimapCanvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rr = Math.min(w, h) * 0.44;
      const invR = 1 / world.radius;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(6,14,28,0.88)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(170,210,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();

      const top10 = world.snakes.filter((s) => s.alive).sort((a, b) => (b.score - a.score) || (b.segments.length - a.segments.length)).slice(0, 10);
      const topMap = new Map();
      for (let i = 0; i < top10.length; i++) topMap.set(top10[i].id, TOP_COLORS[i] || '#ffffff');

      for (let i = 0; i < world.snakes.length; i++) {
        const s = world.snakes[i];
        if (!s.alive || !s.segments || !s.segments[0]) continue;
        const head = s.segments[0];
        const mx = cx + (head.x * invR) * rr;
        const my = cy + (head.y * invR) * rr;
        const isTop = topMap.has(s.id);
        const isOwn = !!(world.player && world.player.id === s.id) || !!s.isOwnPlayer;
        const playerColor = isOwn ? '#9dffd2' : '#ffb987';
        ctx.fillStyle = isTop ? topMap.get(s.id) : (s.isPlayer ? playerColor : 'rgba(224,238,255,0.82)');
        const r = s.isPlayer ? 3.5 : (isTop ? 2.6 : 2);
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();

        if (s.isPlayer) {
          ctx.strokeStyle = playerColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(mx, my, r + 4.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    applyNetworkSnapshot(worldData) {
      if (!worldData) return;
      this._prevNetWorld = this.netWorld;
      this._netPrevSnapshotTime = this._netSnapshotTime || 0;
      this._netSnapshotTime = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
      const prevWorld = this.netWorld;
      const prevSnakes = new Map();
      const prevPellets = new Map();
      if (prevWorld && prevWorld.snakes) for (let i = 0; i < prevWorld.snakes.length; i++) prevSnakes.set(prevWorld.snakes[i].id, prevWorld.snakes[i]);
      if (prevWorld && prevWorld.pellets) for (let i = 0; i < prevWorld.pellets.length; i++) prevPellets.set(prevWorld.pellets[i].id, prevWorld.pellets[i]);

      const pellets = Array.isArray(worldData.pellets)
        ? worldData.pellets.map((p) => {
            const prev = prevPellets.get(p.id);
            return { id: p.id, x: p.x, y: p.y, px: prev ? prev.x : p.x, py: prev ? prev.y : p.y, value: p.value, hue: p.hue };
          })
        : [];

      const snakes = [];
      if (Array.isArray(worldData.snakes)) {
        for (let i = 0; i < worldData.snakes.length; i++) {
          const src = worldData.snakes[i];
          const prevSnake = prevSnakes.get(src.id);
          const segments = [];
          const srcSegs = Array.isArray(src.segments) ? src.segments : [];
          for (let j = 0; j < srcSegs.length; j++) {
            const seg = srcSegs[j];
            const prevSeg = prevSnake && prevSnake.segments ? prevSnake.segments[j] : null;
            segments.push({ x: seg.x, y: seg.y, px: prevSeg ? prevSeg.x : seg.x, py: prevSeg ? prevSeg.y : seg.y });
          }
          if (!segments.length) continue;

          const isOwn = !!this.netClientId && src.ownerId === this.netClientId;
          const isPlayer = !!src.isPlayer;
          const nameRaw = src.name || 'Snake';
          const cleanName = isPlayer ? nameRaw : sanitizeBotDisplayName(nameRaw);
          const scoreRaw = typeof src.score === 'number' ? src.score : 10;
          const isBellaBot = !isPlayer && cleanName === BELLA_BOT_NAME;
          snakes.push({
            id: src.id,
            name: cleanName,
            hue: typeof src.hue === 'number' ? src.hue : 200,
            skinPattern: Array.isArray(src.skinPattern) ? src.skinPattern : null,
            isPlayer,
            isBot: !!src.isBot,
            ownerId: src.ownerId || null,
            isOwnPlayer: isOwn,
            playerIndex: isOwn ? 0 : 1,
            alive: true,
            score: isBellaBot ? Math.max(BELLA_MIN_SCORE, scoreRaw) : scoreRaw,
            kills: typeof src.kills === 'number' ? src.kills : 0,
            mass: typeof src.mass === 'number' ? src.mass : C.START_MASS,
            angle: typeof src.angle === 'number' ? src.angle : 0,
            isBellaBot,
            isGodMode: isBellaBot,
            segments
          });
        }
      }

      const players = snakes.filter((s) => s.isPlayer);
      const ownSnakeId = this.net ? this.net.snakeId : 0;
      let me = snakes.find((s) => s.id === ownSnakeId) || snakes.find((s) => s.isOwnPlayer) || null;
      if (!me && players.length) me = players[0];
      if (me) me.isOwnPlayer = true;

      this.netWorld = {
        radius: Number.isFinite(worldData.radius) ? worldData.radius : C.WORLD_RADIUS,
        pellets,
        snakes,
        players,
        player: me,
        botCount: Number.isFinite(worldData.botCount) ? worldData.botCount : snakes.filter((s) => s.isBot).length,
        livePlayers: Number.isFinite(worldData.livePlayers) ? worldData.livePlayers : players.length,
        leaderboard: buildPinnedBellaLeaderboard(Array.isArray(worldData.leaderboard) ? worldData.leaderboard : []),
        tick: Number.isFinite(worldData.tick) ? worldData.tick : 0
      };

      this.updateHud(this.buildNetworkStats(this.netWorld));
    }

    buildNetworkStats(world) {
      const me = world.player;
      const pinnedRows = buildPinnedBellaLeaderboard(world.leaderboard || []);
      const leaderboard = pinnedRows.map((row, idx) => ({
        rank: row.rank || (idx + 1),
        name: row.name,
        score: row.score,
        rankColor: TOP_COLORS[idx] || '#e9f4ff',
        isPlayer: !!row.isPlayer,
        isOwnPlayer: !!me && row.id === me.id
      }));
      return {
        playerCount: 1,
        livePlayers: Number.isFinite(world.livePlayers) ? world.livePlayers : 0,
        players: me ? [{ index: 0, id: me.id, name: me.name, alive: true, score: Math.max(10, Math.round(me.score)), kills: me.kills, boosting: !!this.pointer.boost, length: me.segments.length, mass: me.mass }] : [],
        length: me ? me.segments.length : 0,
        score: me ? Math.max(10, Math.round(me.score)) : 10,
        kills: me ? me.kills : 0,
        mass: me ? me.mass : C.START_MASS,
        boosting: !!this.pointer.boost,
        bots: world.botCount || 0,
        leaderboard,
        fps: '--',
        ticks: world.tick || 0
      };
    }

    refreshPlayHud() {
      const world = this.netWorld || {
        radius: C.WORLD_RADIUS,
        pellets: [],
        snakes: [],
        players: [],
        player: null,
        botCount: 0,
        livePlayers: 0,
        leaderboard: [],
        tick: 0
      };
      this.updateHud(this.buildNetworkStats(world));
    }

    sendNetworkInput() {
      if (!this.net || !this.net.connected || !this.renderer) return;
      const now = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
      if (now - this.lastNetInputTs < 33) return;

      let targetX = 0;
      let targetY = 0;
      let hasPointer = false;

      if (this.pointer.active) {
        const worldPt = this.renderer.screenToWorld(this.pointer.x, this.pointer.y);
        targetX = worldPt.x;
        targetY = worldPt.y;
        hasPointer = true;
        this.renderer.setPointerWorldTarget(worldPt.x, worldPt.y, true);
      } else {
        this.renderer.setPointerWorldTarget(0, 0, false);
      }

      this.net.sendInput({ targetX, targetY, hasPointer, boost: this.pointer.boost, hasAngle: false, targetAngle: 0 });
      this.lastNetInputTs = now;
    }

    _sendPingIfNeeded() {
      if (!this.net || !this.net.connected) return;
      const now = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
      if (!this._lastPingTime || now - this._lastPingTime > 5000) {
        this._lastPingTime = now;
        this._pingStart = Date.now();
        this.net.send({ type: 'ping', t: this._pingStart });
      }
    }

    startNetworkLoop() {
      this.stopNetworkLoop();
      this._prevNetWorld = null;
      this._netSnapshotTime = 0;
      this._netPrevSnapshotTime = 0;
      const loop = (now) => {
        if (!this.overlay || this.mode !== 'PLAY') return;
        if (this.netWorld && this.renderer) {
          // Calculate interpolation alpha between snapshots
          const snapshotInterval = C.NET_SNAPSHOT_INTERVAL || 67;
          let alpha = 1;
          if (this._netSnapshotTime && this._netPrevSnapshotTime) {
            const elapsed = now - this._netSnapshotTime;
            alpha = Math.min(1, Math.max(0, elapsed / snapshotInterval));
          }

          const focus = this.netWorld.player || (this.netWorld.players && this.netWorld.players[0]) || null;
          if (focus && focus.segments && focus.segments[0]) this.renderer.updateCamera(focus);
          this.renderer.render(this.netWorld, alpha);
          this.renderMinimap(this.netWorld);
          this.sendNetworkInput();
          this._sendPingIfNeeded();
        }
        this.netLoopHandle = requestAnimationFrame(loop);
      };
      this.netLoopHandle = requestAnimationFrame(loop);
    }

    stopNetworkLoop() {
      if (this.netLoopHandle) {
        cancelAnimationFrame(this.netLoopHandle);
        this.netLoopHandle = 0;
      }
    }

    showDeath(info) {
      // Trigger death explosion at camera position (player head)
      if (this.renderer) {
        this.renderer.notifyDeath(this.renderer.cam.x, this.renderer.cam.y, 270);
      }
      this.logDeathSession();
      if (this.deathTimer) {
        clearTimeout(this.deathTimer);
        this.deathTimer = null;
      }

      if (this.deathTitle) this.deathTitle.textContent = 'You died';
      this.dyingLayer.classList.remove('active');
      void this.dyingLayer.offsetWidth;
      this.dyingLayer.classList.add('active');
      this.deathTimer = setTimeout(() => {
        this.deathLayer.classList.add('active');
        this.dyingLayer.classList.remove('active');
      }, 820);
    }

    hideDeath() {
      if (this.deathTimer) {
        clearTimeout(this.deathTimer);
        this.deathTimer = null;
      }
      this.deathLayer.classList.remove('active');
      this.dyingLayer.classList.remove('active');
    }

    handleResize() {
      if (this.renderer) this.renderer.resize();
    }

    resetMobileJoystick() {
      if (!this.mobileSteerThumb) return;
      this.mobileSteerThumb.style.setProperty('--joy-x', '0px');
      this.mobileSteerThumb.style.setProperty('--joy-y', '0px');
    }

    toggleCircusMusic() {
      if (this.musicEnabled) this.stopEntryMusic();
      else this.startEntryMusic();
      if (this.musicBtn) this.musicBtn.textContent = this.musicEnabled ? 'Music (ON)' : 'Music (OFF)';
    }

    startEntryMusic() {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.musicCtx) this.musicCtx = new AudioCtx();
      if (this.musicCtx.state === 'suspended') this.musicCtx.resume();
      this.musicEnabled = true;
      this.musicStep = 0;
      const lead = [523.25, 659.25, 783.99, 659.25, 523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 523.25, 659.25, 739.99, 880.0, 987.77, 880.0, 783.99, 659.25, 523.25, 587.33, 659.25, 739.99, 783.99, 739.99, 698.46, 659.25, 587.33, 523.25, 587.33, 659.25, 698.46, 0];
      const bass = [130.81, 0, 130.81, 0, 146.83, 0, 146.83, 0, 164.81, 0, 164.81, 0, 174.61, 0, 174.61, 0, 130.81, 0, 130.81, 0, 123.47, 0, 123.47, 0, 110.0, 0, 110.0, 0, 123.47, 0, 130.81, 0];
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = setInterval(() => {
        if (!this.musicEnabled || !this.musicCtx) return;
        const now = this.musicCtx.currentTime;
        const i = this.musicStep % lead.length;

        const leadOsc = this.musicCtx.createOscillator();
        const leadGain = this.musicCtx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(lead[i], now);
        leadGain.gain.setValueAtTime(0.0001, now);
        leadGain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        leadOsc.connect(leadGain);
        leadGain.connect(this.musicCtx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.15);

        const b = bass[i];
        if (b > 0) {
          const bassOsc = this.musicCtx.createOscillator();
          const bassGain = this.musicCtx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(b, now);
          bassGain.gain.setValueAtTime(0.0001, now);
          bassGain.gain.exponentialRampToValueAtTime(0.032, now + 0.008);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
          bassOsc.connect(bassGain);
          bassGain.connect(this.musicCtx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.12);
        }

        this.musicStep++;
      }, 150);
    }

    stopEntryMusic() {
      this.musicEnabled = false;
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = 0;
      }
    }
    startAiMatch(seed) {
      this.logDeathSession();
      this.stopPlayMatch();
      this.netWorld = null;
      this.netConnected = false;
      this.liveConnectState = 'IDLE';
      this.liveError = '';
      this.beginSession();
      const profile = this.getSelectedProfile();
      if (this.engine) {
        this.engine.options.playerCount = 1;
        this.engine.options.playerProfile = profile;
        this.engine.options.playerProfiles = [profile];
        this.engine.start(seed);
      }
      this.matchActive = true;
    }

    startPlayMatch() {
      this.logDeathSession();
      if (this.engine) this.engine.stop();
      this.stopPlayMatch();

      this.netConnected = false;
      this.netClientId = 0;
      this.liveError = '';
      this.liveConnectState = 'CONNECTING';
      this.playConnectEndpoints = [];
      this.playConnectIndex = -1;
      this.netWorld = { radius: C.WORLD_RADIUS, pellets: [], snakes: [], players: [], player: null, botCount: 0, livePlayers: 0, leaderboard: [], tick: 0 };

      const profile = this.getSelectedProfile();
      const playerName = ensureGtoatTag(profile.name, profile.name);
      const endpoints = buildWsCandidates(this.serverUrl);
      const token = ++this.playConnectToken;
      this.beginSession();

      this.startNetworkLoop();
      this.refreshPlayHud();
      this.connectPlayEndpoint(token, endpoints, 0, playerName, profile.id);
      this.matchActive = true;
    }

    stopPlayMatch() {
      this.playConnectToken += 1;
      this.clearPlayConnectTimer();
      this.stopNetworkLoop();
      if (this.net) {
        this.net.disconnect();
        this.net = null;
      }
      this.netConnected = false;
      this.playConnectEndpoints = [];
      this.playConnectIndex = -1;
      if (this.liveConnectState !== 'FAILED') this.liveConnectState = 'IDLE';
      this._healthChecked = false;
      this._reconnectAttempt = 0;
    }

    start() {
      void flushPendingSharedHighscores();
      this.logDeathSession();
      this.mount();
      this.hideDeath();
      this.pointer.active = false;
      this.pointer.boost = false;
      this.mobileBoostTouchId = null;
      this.mobileSteerTouchId = null;
      this.resetMobileJoystick();
      this.minimapFrame = 0;
      this.lowPerf = false;
      this.hudFrame = 0;
      if (this.renderer) this.renderer.setLowFx(false);
      if (this.musicBtn) this.musicBtn.textContent = this.musicEnabled ? 'Music (ON)' : 'Music (OFF)';

      if (this.engine) this.engine.stop();
      this.stopPlayMatch();
      this.matchStartedAt = 0;
      this.matchId = '';
      this.loggedMatchId = '';
      this.matchActive = false;
      this.showSetup();
      this.handleResize();
    }

    _checkServerStatus() {
      if (this._statusTimer) clearInterval(this._statusTimer);
      const check = () => {
        const serverBase = (this.serverUrl || 'wss://gtoat-server.onrender.com').replace(/^wss?:\/\//, (m) => m === 'wss://' ? 'https://' : 'http://');
        const healthUrl = serverBase.replace(/\/?(ws|multiplayer|socket)?$/, '') + '/health';
        const start = Date.now();
        fetch(healthUrl, { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            const ms = Date.now() - start;
            if (data && data.ok) {
              this._serverStatus = { online: true, ping: ms, players: data.players || 0 };
            } else {
              this._serverStatus = { online: false, ping: 0, players: 0 };
            }
            this._updateServerStatusDisplay();
          })
          .catch(() => {
            this._serverStatus = { online: false, ping: 0, players: 0 };
            this._updateServerStatusDisplay();
          });
      };
      check();
      this._statusTimer = setInterval(check, 15000);
    }

    _updateServerStatusDisplay() {
      if (!this._serverStatusEl) {
        this._serverStatusEl = document.querySelector('.server-status');
        if (!this._serverStatusEl) {
          // Create server status element near the Play Live button
          const playBtn = document.querySelector('[data-action="play-live"]') || document.getElementById('playBtn');
          if (playBtn && playBtn.parentElement) {
            this._serverStatusEl = document.createElement('div');
            this._serverStatusEl.className = 'server-status';
            this._serverStatusEl.style.cssText = 'font-size:12px;margin-top:6px;text-align:center;font-family:monospace;';
            playBtn.parentElement.insertBefore(this._serverStatusEl, playBtn.nextSibling);
          }
        }
      }
      if (!this._serverStatusEl) return;
      const s = this._serverStatus;
      if (!s) return;
      if (s.online) {
        const color = s.ping < 100 ? '#39ff14' : s.ping < 200 ? '#ffe600' : '#ff3b3b';
        this._serverStatusEl.innerHTML = `<span style="color:${color}">●</span> Server Online (${s.ping}ms) — ${s.players} player${s.players !== 1 ? 's' : ''}`;
      } else {
        this._serverStatusEl.innerHTML = '<span style="color:#ff3b3b">●</span> Server Offline';
      }
    }

    playAgain() {
      if (!this.matchActive) {
        this.beginMatchFromSetup();
        return;
      }

      this.hideDeath();
      this.pointer.active = false;
      this.pointer.boost = false;
      this.mobileBoostTouchId = null;
      this.mobileSteerTouchId = null;
      this.resetMobileJoystick();
      this.minimapFrame = 0;
      this.lowPerf = false;
      this.hudFrame = 0;
      if (this.renderer) this.renderer.setLowFx(false);
      if (this.musicBtn) this.musicBtn.textContent = this.musicEnabled ? 'Music (ON)' : 'Music (OFF)';

      const seed = ((Date.now() * 2654435761) & 0xffffffff) >>> 0;
      this.startAiMatch(seed);
    }

    exit() {
      this.logDeathSession();
      if (this.engine) this.engine.stop();
      this.stopPlayMatch();
      this.stopEntryMusic();
      this.unbindInputs();
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      this.canvas = null;
      this.minimapCanvas = null;
      this.minimapCtx = null;
      this.musicBtn = null;
      this.modeAiBtn = null;
      this.modal = null;
      this.hudStats = null;
      this.leaderboard = null;
      this.setupLayer = null;
      this.setupProfilePreview = null;
      this.setupAiBotBtn = null;
      this.setupStatus = null;
      this.mobileControls = null;
      this.mobileBoostBtn = null;
      this.mobileSteerZone = null;
      this.mobileSteerThumb = null;
      this.deathLayer = null;
      this.deathTitle = null;
      this.dyingLayer = null;
      if (this.deathTimer) {
        clearTimeout(this.deathTimer);
        this.deathTimer = null;
      }
      this.pointer.active = false;
      this.pointer.boost = false;
      this.mobileBoostTouchId = null;
      this.mobileSteerTouchId = null;
      this.matchActive = false;
      this.selectedProfileId = null;
      this.liveConnectState = 'IDLE';
      this.liveError = '';
      this.matchStartedAt = 0;
      this.matchId = '';
      this.loggedMatchId = '';
      document.body.style.overflow = '';
      window.removeEventListener('resize', this.boundResize);
      // Remove mobile viewport listeners
      if (global.visualViewport) {
        global.visualViewport.removeEventListener('resize', this.boundResize);
        global.visualViewport.removeEventListener('orientationchange', this.boundResize);
      }
    }
  }

  const app = new SlitherOverlayApp();
  if (global && global.addEventListener) {
    const flushSessionOnLeave = () => {
      app.logDeathSession();
    };
    global.addEventListener('pagehide', flushSessionOnLeave);
    global.addEventListener('beforeunload', flushSessionOnLeave);
  }
  lib.preventDefaultHandler = lib.preventDefaultHandler || function (e) { e.preventDefault(); };
  global.GTOAT_SLITHER = {
    start: () => app.start(),
    exit: () => app.exit(),
    playAgain: () => app.playAgain(),
    setModeAi: () => app.setMode('AI', true)
  };
})(typeof window !== 'undefined' ? window : globalThis);
