import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const PROVIDER = 'https://opendata.adsb.fi/api/v3';
const ALLOWED_ORIGINS = new Set([
  'https://jasongroce.com',
  'https://www.jasongroce.com',
  'https://jasongroce-admin.github.io'
]);
const CACHE_MS = 120_000;
const STALE_MS = 600_000;
const MIN_UPSTREAM_GAP_MS = 2_000;
const MAX_UPSTREAM_PER_HOUR = 120;
const MAX_CELLS = 128;

function aircraftRecord(a) {
  if (!a || typeof a !== 'object' || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) ||
      Math.abs(a.lat) > 90 || Math.abs(a.lon) > 180 || typeof a.hex !== 'string') return null;
  return {
    hex:a.hex, flight:typeof a.flight === 'string' ? a.flight : undefined,
    r:typeof a.r === 'string' ? a.r : undefined,
    lat:a.lat, lon:a.lon,
    seen_pos:Number.isFinite(a.seen_pos) ? a.seen_pos : undefined,
    alt_baro:typeof a.alt_baro === 'number' || a.alt_baro === 'ground' ? a.alt_baro : undefined,
    gs:Number.isFinite(a.gs) ? a.gs : undefined,
    track:Number.isFinite(a.track) ? a.track : undefined
  };
}

export function createAircraftHandler({fetcher=fetch, clock=Date.now}={}) {
  const cache = new Map();
  const pending = new Map();
  let nextUpstreamAt = 0;
  let hourStart = clock();
  let hourCount = 0;

  const send = (res, status, body, origin='', extra={}) => {
    const headers = {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':status === 200 && Array.isArray(body.ac) ? 'public, max-age=120' : 'no-store',
      'X-Content-Type-Options':'nosniff',
      'X-Robots-Tag':'noindex',
      ...extra
    };
    if (ALLOWED_ORIGINS.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers.Vary = 'Origin';
    }
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
  };

  return async (req, res) => {
    const origin = req.headers.origin || '';
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, {error:'Origin not allowed'});
    if (req.method === 'OPTIONS') {
      if (!origin) return send(res, 400, {error:'Origin required'});
      res.writeHead(204, {
        'Access-Control-Allow-Origin':origin,
        'Access-Control-Allow-Methods':'GET, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type',
        'Access-Control-Max-Age':'86400',
        'Vary':'Origin'
      });
      return res.end();
    }
    if (req.method !== 'GET') return send(res, 405, {error:'GET required'}, origin, {Allow:'GET, OPTIONS'});
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch { return send(res, 400, {error:'Invalid URL'}, origin); }
    if (url.pathname === '/health') return send(res, 200, {ok:true, service:'groce-eye-aircraft-api'}, origin);
    if (url.pathname !== '/v1/aircraft' && url.pathname !== '/aircraft') return send(res, 404, {error:'Unknown route'}, origin);
    if (url.searchParams.has('r') && url.searchParams.get('r') !== '100')
      return send(res, 400, {error:'Radius is fixed at 100 nautical miles'}, origin);
    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));
    if (!url.searchParams.get('lat')?.trim() || !url.searchParams.get('lon')?.trim() ||
        !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
      return send(res, 400, {error:'Valid lat and lon required'}, origin);

    const cellLat = Math.round(lat * 4) / 4;
    const cellLon = Math.round(lon * 4) / 4;
    const key = `${cellLat},${cellLon}`;
    const now = clock();
    const stored = cache.get(key);
    if (stored && now - stored.time < CACHE_MS) return send(res, 200, stored.data, origin);
    if (pending.has(key)) {
      try { return send(res, 200, await pending.get(key), origin); }
      catch { return send(res, 503, {error:'Aircraft provider unavailable'}, origin); }
    }
    if (now - hourStart >= 3_600_000) { hourStart = now; hourCount = 0; }
    if (now < nextUpstreamAt || hourCount >= MAX_UPSTREAM_PER_HOUR) {
      if (stored && now - stored.time < STALE_MS)
        return send(res, 200, {...stored.data, stale:true}, origin, {'Cache-Control':'no-store'});
      return send(res, 429, {error:'Aircraft refresh limit reached; retry shortly'}, origin, {'Retry-After':'5'});
    }
    nextUpstreamAt = now + MIN_UPSTREAM_GAP_MS;
    hourCount++;
    const work = (async () => {
      const response = await fetcher(`${PROVIDER}/lat/${cellLat}/lon/${cellLon}/dist/100`, {
        headers:{Accept:'application/json'}, signal:AbortSignal.timeout(12_000)
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw.ac)) throw new Error('Provider response missing aircraft');
      const data = {
        ac:raw.ac.map(aircraftRecord).filter(Boolean).slice(0, 250),
        now:Number.isFinite(raw.now) ? raw.now : Math.floor(clock()/1000),
        source:'adsb.fi'
      };
      if (cache.size >= MAX_CELLS) cache.delete(cache.keys().next().value);
      cache.set(key, {data, time:clock()});
      return data;
    })();
    pending.set(key, work);
    try { return send(res, 200, await work, origin); }
    catch (error) {
      console.warn('Aircraft upstream:', error.message);
      if (stored && now - stored.time < STALE_MS)
        return send(res, 200, {...stored.data, stale:true}, origin, {'Cache-Control':'no-store'});
      return send(res, 503, {error:'Aircraft provider unavailable'}, origin);
    } finally { pending.delete(key); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8788);
  const host = process.env.HOST || '127.0.0.1';
  createServer(createAircraftHandler()).listen(port, host, () =>
    console.log(`Groce-Eye aircraft API listening on ${host}:${port}`));
}
