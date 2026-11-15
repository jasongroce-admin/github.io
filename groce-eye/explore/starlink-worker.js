importScripts('../vendor/satellite.min.js');
let records=[], fetchedAt='';
function decodeIds(xs){let v=0;return xs.map(x=>(v+=x));}
async function load(){
 const base='https://raw.githubusercontent.com/dev-Armaan/satellites/main/public/data/';
 let cat,names;
 try {const responses=await Promise.all([fetch(base+'catalog.json'),fetch(base+'catalog-names.json')]);if(responses.some(r=>!r.ok))throw Error('catalog unavailable');[cat,names]=await Promise.all(responses.map(r=>r.json()));}
 catch {const responses=await Promise.all([fetch('../history-engine/data/catalog.json'),fetch('../history-engine/data/catalog-names.json')]);if(responses.some(r=>!r.ok))throw Error('catalog unavailable');[cat,names]=await Promise.all(responses.map(r=>r.json()));}
 const ids=decodeIds(cat.norad),nameIds=decodeIds(names.norad), map=new Map();nameIds.forEach((id,i)=>{if(/^STARLINK[- ]/i.test(names.name[i]))map.set(id,names.name[i]);});
 const baseTime=Date.parse(cat.fetchedAt);fetchedAt=cat.fetchedAt;records=[];
 for(let i=0;i<ids.length;i++){const name=map.get(ids[i]);if(!name)continue;try {const record={OBJECT_NAME:name,NORAD_CAT_ID:ids[i],EPOCH:new Date(baseTime+cat.epoch[i]*1000).toISOString().replace('Z',''),MEAN_MOTION:cat.n[i],ECCENTRICITY:cat.e[i],INCLINATION:cat.i[i],RA_OF_ASC_NODE:cat.raan[i],ARG_OF_PERICENTER:cat.argp[i],MEAN_ANOMALY:cat.ma[i],BSTAR:cat.bstar[i],MEAN_MOTION_DOT:cat.ndot[i],MEAN_MOTION_DDOT:cat.nddot[i]};records.push({record,rec:satellite.json2satrec(record)});}catch{}}
 if(!records.length)throw Error('No Starlink records in catalog');
}
onmessage=async e=>{try{if(!records.length)await load();if(Date.now()-Date.parse(fetchedAt)>72*3600000)throw Error('Orbital catalog is older than 72 hours');const now=new Date(),gmst=satellite.gstime(now),center=e.data,items=[];
 for(const {record,rec} of records){const pv=satellite.propagate(rec,now);if(!pv?.position)continue;const g=satellite.eciToGeodetic(pv.position,gmst),lon=satellite.degreesLong(g.longitude),lat=satellite.degreesLat(g.latitude);if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;const d=((lon-center.lon+540)%360)-180;items.push({record,lon,lat,height:g.height*1000,distance:(d*Math.cos(center.lat*Math.PI/180))**2+(lat-center.lat)**2});}
 items.sort((a,b)=>a.distance-b.distance);postMessage({ok:true,items:items.slice(0,200),total:items.length,fetchedAt});}catch(error){postMessage({ok:false,error:error.message});}};
