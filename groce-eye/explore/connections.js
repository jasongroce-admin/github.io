// Direct public APIs only. No keys, user accounts, patient records, or scanner feeds.
const cache = new Map();
const pending = new Map();
const NWS = 'https://api.weather.gov';
const EONET = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const DISPATCH_PAGE = 'https://data.seattle.gov/Public-Safety/Seattle-Real-Time-Fire-911-Calls/kzjm-xkqj';
const coordinates = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

async function json(url, ttl = 300000) {
  const saved = cache.get(url);
  if (saved && Date.now() - saved.time < ttl) return saved.data;
  if (pending.has(url)) return pending.get(url);
  const request = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16000);
    try {
      const response = await fetch(url, {signal: controller.signal, credentials: 'omit', headers: {Accept: 'application/json'}});
      if (!response.ok) {
        const error = new Error(`Public source returned HTTP ${response.status}. Try again later.`);
        error.status = response.status;
        throw error;
      }
      const data = await response.json();
      cache.set(url, {data, time: Date.now()});
      return data;
    } finally { clearTimeout(timer); }
  })();
  pending.set(url, request);
  try { return await request; } finally { pending.delete(url); }
}

/** US NWS forecast + official alerts. No global numeric weather provider. */
export async function loadWeather(lat, lon) {
  lat = Number(lat); lon = Number(lon);
  if (!coordinates(lat, lon)) throw new Error('Choose a valid map location.');
  let point;
  try { point = await json(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, 86400000); }
  catch (error) {
    if (![400,404,422].includes(error.status)) throw error;
    throw new Error('NWS forecasts cover US locations. This point is outside supported forecast coverage.');
  }
  if (point?.properties?.forecast) {
    const forecastUrl = point.properties.forecast;
    // Follow only an official NWS link; never fetch an arbitrary returned destination.
    if (new URL(forecastUrl).origin !== NWS) throw new Error('Unexpected weather source.');
    const [forecastResult, alertResult] = await Promise.allSettled([
      json(forecastUrl, 600000), json(`${NWS}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, 120000)
    ]);
    if (forecastResult.status !== 'fulfilled') throw forecastResult.reason;
    const data = forecastResult.value;
    const periods = (data.properties?.periods || []).slice(0, 8).map(p => ({name:p.name,time:p.startTime,temperature:p.temperature,temperatureUnit:p.temperatureUnit,windSpeed:p.windSpeed,windDirection:p.windDirection,summary:p.shortForecast,detail:p.detailedForecast,precipitationProbability:p.probabilityOfPrecipitation?.value ?? null}));
    const alerts = alertResult.status === 'fulfilled' ? (alertResult.value.features || []).map(f => ({id:f.id,title:f.properties?.headline || f.properties?.event,time:f.properties?.sent,expires:f.properties?.expires,severity:f.properties?.severity,description:f.properties?.description,sourceUrl:f.id})) : [];
    return {provider:'NOAA / National Weather Service',sourceUrl:forecastUrl,updatedAt:data.properties?.updated || data.properties?.generatedAt || null,current:periods[0] || null,periods,alerts,alertStatus:alertResult.status === 'fulfilled' ? 'loaded' : 'unavailable',note:'US forecast periods, not live sensor observations. Alerts are official NWS notices.' + (alertResult.status === 'rejected' ? ' Alert source unavailable; no-alert status is unknown.' : '')};
  }
  throw new Error('NWS forecast unavailable at this point; this source covers US locations.');
}

/** Curated NASA natural events: newest POINT geometry per event, past 30 days. */
export async function loadEvents() {
  const data = await json(EONET+'?status=open&days=30&limit=100', 900000);
  return (data.events || []).flatMap(event => {
    const g = (event.geometry || []).filter(g => g.type === 'Point' && coordinates(g.coordinates?.[1],g.coordinates?.[0])).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    if (!g) return [];
    return [{id:event.id,title:event.title,lat:g.coordinates[1],lon:g.coordinates[0],time:g.date,sourceUrl:event.link,kind:event.categories?.[0]?.id || 'naturalEvent',note:'NASA EONET · '+(event.categories || []).map(c => c.title).join(', ')+' · Curated open event; location/time may be approximate or delayed. Not a complete emergency warning feed.'}];
  }).sort((a,b) => String(b.time).localeCompare(String(a.time)));
}

/** Seattle-only public Fire/EMS dispatch history; never request addresses. */
export async function loadDispatch() {
  const query = new URLSearchParams({'$select':'incident_number,type,datetime,latitude,longitude','$order':'datetime DESC','$limit':'150'});
  const rows = await json('https://data.seattle.gov/resource/kzjm-xkqj.json?'+query, 300000);
  if (!Array.isArray(rows)) throw new Error('Unexpected public dispatch response.');
  return rows.flatMap(row => {
    const lat = Number(row.latitude), lon = Number(row.longitude);
    if (!coordinates(lat,lon) || row.latitude == null || row.longitude == null) return [];
    return [{id:row.incident_number,title:row.type || 'Fire / EMS dispatch',lat:Math.round(lat*100)/100,lon:Math.round(lon*100)/100,time:row.datetime,sourceUrl:DISPATCH_PAGE,kind:'dispatch',note:'Seattle Fire Department public dispatch log · Seattle local time (America/Los_Angeles) · Location rounded to ~1 km; no address or patient identity. Dispatch type is preliminary; response/outcome status is not supplied. Latest 150 records, not a complete EMS history.'}];
  });
}

