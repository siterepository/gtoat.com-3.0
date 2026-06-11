(function (global) {
  const LOG_KEY = 'gtoat_activity_logs_v1';
  const LOG_LIMIT = 1200;
  const PENDING_ACTIVITY_KEY = 'gtoat_pending_activity_logs_v1';
  const PENDING_ACTIVITY_LIMIT = 800;
  const CITY_IP_URL = 'https://ipapi.co/json/';

  const SUPABASE_REST_URL = 'https://nndyngflhsqcvryclkbc.supabase.co/rest/v1/activity_logs';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZHluZ2ZsaHNxY3ZyeWNsa2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzMyMTksImV4cCI6MjA5MDIwOTIxOX0.iP63FibyKsAFDKrz1r_-fer1sZ9R39ZOk0WkW2DNRWQ';

  const startedAt = Date.now();
  const clicked = [];
  const deviceType = detectDeviceType(
    global && global.navigator && typeof global.navigator.userAgent === 'string'
      ? global.navigator.userAgent
      : ''
  );
  let city = 'Unknown';
  let state = 'Unknown';
  let ip = 'Unknown';
  let country = 'Unknown';
  let countryCode = 'Unknown';
  let region = 'Unknown';
  let regionCode = 'Unknown';
  let isp = 'Unknown';
  let persisted = false;

  function pad2(v) {
    return String(v).padStart(2, '0');
  }

  function formatDuration(ms) {
    const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
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

  function makeEntryId(prefix) {
    const tag = (typeof prefix === 'string' && prefix) ? prefix : 'al';
    return tag + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function readLogs() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(LOG_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeLogs(logs) {
    try {
      if (!global.localStorage) return;
      const trimmed = Array.isArray(logs) ? logs.slice(-LOG_LIMIT) : [];
      global.localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  function readPendingLogs() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(PENDING_ACTIVITY_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writePendingLogs(logs) {
    try {
      if (!global.localStorage) return;
      const trimmed = Array.isArray(logs) ? logs.slice(-PENDING_ACTIVITY_LIMIT) : [];
      global.localStorage.setItem(PENDING_ACTIVITY_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  function captureGeo() {
    fetch(CITY_IP_URL, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const nextCity = data && typeof data.city === 'string' ? data.city.trim() : '';
        const nextState = data && typeof data.region === 'string' ? data.region.trim() : '';
        const nextIp = data && typeof data.ip === 'string' ? data.ip.trim() : '';
        const nextCountry = data && typeof data.country_name === 'string' ? data.country_name.trim() : '';
        const nextCountryCode = data && typeof data.country_code === 'string' ? data.country_code.trim() : '';
        const nextRegion = data && typeof data.region === 'string' ? data.region.trim() : '';
        const nextRegionCode = data && typeof data.region_code === 'string' ? data.region_code.trim() : '';
        const nextIsp = data && typeof data.org === 'string' ? data.org.trim() : '';
        if (nextCity) city = nextCity;
        if (nextState) state = nextState;
        if (nextIp) ip = nextIp;
        if (nextCountry) country = nextCountry;
        if (nextCountryCode) countryCode = nextCountryCode;
        if (nextRegion) region = nextRegion;
        if (nextRegionCode) regionCode = nextRegionCode;
        if (nextIsp) isp = nextIsp;
      })
      .catch(() => {});
  }

  function mapEntryToSnakeCase(entry) {
    return {
      id: entry.id,
      ts: entry.ts,
      date: entry.date,
      time: entry.time,
      city: entry.city,
      state: entry.state,
      device_type: entry.deviceType,
      ip_address: entry.ipAddress,
      links_clicked: entry.linksClicked,
      time_spent_per_page: entry.timeSpentPerPage,
      page: entry.page,
      country: entry.country,
      country_code: entry.countryCode,
      region: entry.region,
      region_code: entry.regionCode,
      isp: entry.isp
    };
  }

  function postSharedActivity(entry) {
    var mapped = mapEntryToSnakeCase(entry);

    if (global.GTOAT_SUPABASE) {
      return global.GTOAT_SUPABASE
        .from('activity_logs')
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

  function beaconSharedActivity(entry) {
    if (!entry) return false;

    var mapped = mapEntryToSnakeCase(entry);
    var payload = JSON.stringify(mapped);

    // sendBeacon cannot set custom headers (apikey, Authorization, Prefer),
    // so we use fetch with keepalive:true which works during page unload
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

    // Last resort: plain sendBeacon (will likely fail due to missing auth headers,
    // but the pending queue will retry via postSharedActivity)
    if (global.navigator && typeof global.navigator.sendBeacon === 'function') {
      try {
        var blob = new Blob([payload], { type: 'application/json' });
        if (global.navigator.sendBeacon(SUPABASE_REST_URL, blob)) return true;
      } catch (e2) {}
    }

    return false;
  }

  function flushPendingActivityLogs() {
    const queue = readPendingLogs();
    if (!queue.length) return Promise.resolve(0);
    let sent = 0;
    const failed = [];
    function sendAt(i) {
      if (i >= queue.length) {
        writePendingLogs(failed);
        return Promise.resolve(sent);
      }
      return postSharedActivity(queue[i]).then(function (ok) {
        if (ok) sent += 1;
        else failed.push(queue[i]);
        return sendAt(i + 1);
      }).catch(function () {
        failed.push(queue[i]);
        return sendAt(i + 1);
      });
    }
    return sendAt(0);
  }

  function queueSharedActivity(entry) {
    if (!entry || typeof entry !== 'object') return;
    const queue = readPendingLogs();
    queue.push(entry);
    writePendingLogs(queue);
    void flushPendingActivityLogs();
  }

  function onLinkClick(ev) {
    let node = ev.target;
    while (node && node !== document.body && node.tagName !== 'A') node = node.parentElement;
    if (!node || node.tagName !== 'A') return;
    const href = node.getAttribute('href') || node.href || '';
    if (!href) return;
    clicked.push(href.trim().slice(0, 300));
  }

  function persist() {
    if (persisted) return;
    persisted = true;

    const now = new Date();
    const entry = {
      id: makeEntryId('al'),
      ts: Date.now(),
      date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
      time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
      city,
      state,
      deviceType,
      ipAddress: ip,
      country,
      countryCode: countryCode,
      region,
      regionCode: regionCode,
      isp,
      linksClicked: clicked.length ? clicked.join(' | ') : 'None',
      timeSpentPerPage: formatDuration(Date.now() - startedAt),
      page: global.location ? (global.location.pathname || '/') : '/'
    };

    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);
    beaconSharedActivity(entry);
    queueSharedActivity(entry);
  }

  if (document && document.addEventListener) {
    document.addEventListener('click', onLinkClick, true);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') persist();
    });
  }
  if (global && global.addEventListener) {
    global.addEventListener('pagehide', persist);
    global.addEventListener('beforeunload', persist);
    global.addEventListener('online', function () {
      void flushPendingActivityLogs();
    });
  }

  captureGeo();
  void flushPendingActivityLogs();
})(typeof window !== 'undefined' ? window : globalThis);
