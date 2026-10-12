// Only public, keyless sources. No tokens or arbitrary proxy destinations.
async function detectLocalEdition() {
  if (!['127.0.0.1','localhost'].includes(location.hostname)) return false;
  try {
    const response = await fetch('/api/status', {signal:AbortSignal.timeout(2500),credentials:'omit',cache:'no-store'});
    if (!response.ok) return false;
    const status = await response.json();
    return status.local === true && status.freeOnly === true && Array.isArray(status.sources) && status.sources.includes('aircraft');
  } catch { return false; }
}
// Recognize the running desktop server after any local navigation, even when
// a welcome-page link or bookmark does not include the optional local flag.
export const localEdition = await detectLocalEdition();
export const URLs = {
  cameras: 'https://tie.digitraffic.fi/api/weathercam/v1/stations',
  earthquakes: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  satellites: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
  satelliteCatalog: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json'
};
const memoryCache = new Map();
export async function getJSON(source, {ttl=0, params={}, force=false}={}) {
  const key='groce-eye-v1:'+source+JSON.stringify(params);
  let cache=memoryCache.get(key);
  if (!cache && ttl) {try {cache=JSON.parse(localStorage.getItem(key));} catch {}}
  if (!force && cache && Date.now()-cache.time<ttl) return cache;
  let url=URLs[source];
  if(localEdition && ['cameras','satellites','satelliteCatalog','aircraft','aircraftGlobal'].includes(source)) {
    url='/api/proxy?'+new URLSearchParams({source,...params});
  }
  if(!url) throw new Error('This connection is available in the local desktop edition.');
  const result=await fetch(url,{signal:AbortSignal.timeout(20000),credentials:'omit'});
  if(!result.ok) throw new Error('Source returned '+result.status+'. Try again later.');
  const data=await result.json();
  const entry={data,time:Date.now()}; memoryCache.set(key,entry);
  if(ttl) {try {localStorage.setItem(key,JSON.stringify(entry));} catch {}}
  return entry;
}
export function validCoordinates(lon,lat) {return Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90;}
