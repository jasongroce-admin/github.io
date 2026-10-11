import {getJSON,localEdition,validCoordinates} from './adapters.js';
import {loadWeather,loadEvents,loadDispatch} from './connections.js';
const $=id=>document.getElementById(id);
const C=window.Cesium;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(max-width:700px)').matches;
const duration=()=>reduced?0:1.2;
let viewer, cameras=[], cameraRefresh, selectedMarker, noticeTimer, satellitesTimer, cityCatalog, roadCameras=[], coverage;
const definitions=[
  {id:'roadCameras',name:'Traffic & highway cameras',note:'Verified US and Canadian sources',color:'#72cfc4',refresh:86400000},
  {id:'cameras',name:'Finland road cameras',note:'Finland · refreshing road images',color:'#f18b52',refresh:600000},
  {id:'earthquakes',name:'Earthquakes',note:'USGS · last 24 hours',color:'#ffa75f',refresh:300000},
  {id:'satellites',name:'Space stations',note:'CelesTrak · calculated orbits',color:'#a2cff8',refresh:7200000},
  {id:'radar',name:'US weather radar',note:'NOAA/NWS · contiguous United States',color:'#77d5a0',refresh:600000},
  {id:'clouds',name:'Daily satellite view',note:'NASA VIIRS · yesterday · clouds included',color:'#b3c9ed',refresh:86400000},
  {id:'events',name:'Natural events',note:'NASA EONET · global · reported hazards',color:'#ee9b70',refresh:3600000},
  {id:'dispatch',name:'Fire & EMS dispatch records',note:'Seattle only · recent public reports',color:'#eb7ead',refresh:300000},
  {id:'daynight',name:'Day & night',note:'Sunlight for the current time',color:'#ffdf84'}
];
if(localEdition) definitions.unshift({id:'aircraft',name:'Aircraft near your view',note:'ADSB.lol · 100 nautical mile radius · local only',color:'#e4efee',refresh:60000});
if(localEdition) definitions.push({id:'satelliteCatalog',name:'More satellites',note:'CelesTrak · up to 150 active objects · local only',color:'#e4b7f8',refresh:7200000});
const groupFor=id=>['roadCameras','cameras'].includes(id)?'Cameras':['earthquakes','radar','clouds','events','daynight'].includes(id)?'Weather & natural events':['dispatch'].includes(id)?'Public records':'Space & aircraft';
const groupOrder=['Cameras','Weather & natural events','Space & aircraft','Public records'];
definitions.sort((a,b)=>groupOrder.indexOf(groupFor(a.id))-groupOrder.indexOf(groupFor(b.id)));
const layers=new Map(definitions.map(d=>[d.id,{...d,enabled:false,busy:false,loaded:false,source:null,timer:null}]));
function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
function notice(message){$('notice').replaceChildren(text('span',message));clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').replaceChildren(),6500);}
function state(layer,value,error=false){$('state-'+layer.id).textContent=value;$('state-'+layer.id).classList.toggle('error',error);}
function timestamp(time){return new Date(time).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function setPanel(id,show){$(id).hidden=!show;if(id==='layers-panel')$('layers-button').setAttribute('aria-expanded',String(show));if(id==='help')$('help-button').setAttribute('aria-expanded',String(show));}
function showLayers(show){if(show&&mobile())setPanel('detail-panel',false);setPanel('layers-panel',show);}
function position(lon,lat,height=0){return C.Cartesian3.fromDegrees(lon,lat,height);}
function fly(lon,lat,height=1500000){viewer.trackedEntity=undefined;viewer.camera.cancelFlight();$('weather-here').disabled=true;viewer.camera.flyTo({destination:position(lon,lat,height),duration:duration(),complete:()=>{$('weather-here').disabled=false;},cancel:()=>{$('weather-here').disabled=false;}});}
function preset(name){if(name==='world')fly(-55,28,23000000);if(name==='finland'){fly(25,64,1500000);enable('cameras',true);}if(name==='indiana'){fly(-86.16,39.77,220000);showStateCameraInfo('IN');}if(name==='california'){fly(-121.5,37.7,600000);enable('roadCameras',true);}if(name==='canada'){fly(-123.1,49.2,400000);enable('roadCameras',true);}if(name==='seattle'){fly(-122.33,47.61,100000);enable('dispatch',true);}if(mobile())showLayers(false);}
function buildLayers(){
  let previousGroup;
  definitions.forEach(d=>{
    const section=groupFor(d.id);if(section!==previousGroup){$('layer-list').append(text('h2',section,'layer-heading'));previousGroup=section;}
    const row=text('div','','layer'), label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id='toggle-'+d.id;input.addEventListener('change',()=>enable(d.id,input.checked));label.append(input,text('span',d.name));row.append(label,text('small',d.note));const status=text('small','Off','state');status.id='state-'+d.id;row.append(status);$('layer-list').append(row);if(d.id==='dispatch'){const browse=text('button','Browse recent Seattle dispatch reports');browse.addEventListener('click',()=>browseDispatch(0));$('layer-list').append(browse);}
  });
}
function entity(layer,marker,appearance={}){
  if(!validCoordinates(marker.lon,marker.lat))return;
  const e=layer.source.entities.add({id:layer.id+':'+marker.id,position:position(marker.lon,marker.lat,marker.height||1000),point:{pixelSize:layer.id==='cameras'?9:7,color:C.Color.fromCssColorString(layer.color),outlineColor:C.Color.fromCssColorString('#15222d'),outlineWidth:2,disableDepthTestDistance:0},...appearance});e.groceMarker=marker;marker.entity=e;return e;
}
function sourceFor(layer){if(!layer.source){layer.source=new C.CustomDataSource(layer.id);viewer.dataSources.add(layer.source);}layer.source.show=layer.enabled;layer.source.entities.removeAll();}
function load(layer,force=false){
  if(layer.pending)return layer.pending;
  layer.pending=performLoad(layer,force).finally(()=>{layer.pending=null;});
  return layer.pending;
}
async function performLoad(layer,force=false){
  if(layer.busy||!layer.enabled||document.hidden)return;
  layer.busy=true;state(layer,layer.loaded?'Refreshing…':'Connecting…');
  try{
    if(layer.id==='daynight'){viewer.scene.globe.enableLighting=layer.enabled;state(layer,'Current sunlight');return;}
    if(layer.id==='clouds'){
      if(layer.imagery)viewer.imageryLayers.remove(layer.imagery);
      const date=new Date(Date.now()-86400000).toISOString().slice(0,10);
      const provider=new C.UrlTemplateImageryProvider({url:'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/'+date+'/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',maximumLevel:9,credit:'NASA GIBS / VIIRS SNPP · daily imagery '+date});
      provider.errorEvent.addEventListener(()=>{if(layer.enabled)state(layer,'Daily imagery unavailable or incomplete',true);});
      layer.imagery=viewer.imageryLayers.addImageryProvider(provider);layer.loaded=true;state(layer,'Satellite mosaic '+date+' · not live');return;
    }
    if(layer.id==='roadCameras'){
      const r=await fetch('../assets/camera-catalog.json');if(!r.ok)throw new Error('Camera catalog unavailable');const records=await r.json();if(!layer.enabled)return;
      roadCameras=records.filter(m=>validCoordinates(m.lon,m.lat)&&/^https:\/\//.test(m.imageUrl)).map(m=>({...m,kind:'camera',presets:[{id:m.id,url:m.imageUrl}]}));
      sourceFor(layer);layer.source.clustering.enabled=true;layer.source.clustering.pixelRange=40;layer.source.clustering.minimumClusterSize=4;roadCameras.forEach(m=>entity(layer,m));
      state(layer,roadCameras.length.toLocaleString()+' camera views · selected images load on demand');layer.loaded=true;setupCameraFilters();renderCameraList();return;
    }
    if(layer.id==='events'||layer.id==='dispatch'){
      const records=await (layer.id==='events'?loadEvents():loadDispatch());if(!layer.enabled)return;sourceFor(layer);records.forEach(m=>entity(layer,{...m,kind:layer.id==='dispatch'?'dispatch':'event'}));layer.loaded=true;reconcileSelection(layer);
      state(layer,records.length+' public reports · fetched '+timestamp(Date.now()));return;
    }
    if(layer.id==='radar'){
      if(layer.imagery)viewer.imageryLayers.remove(layer.imagery);
      const provider=new C.WebMapServiceImageryProvider({url:'https://opengeo.ncep.noaa.gov/geoserver/conus/wms',layers:'conus_bref_qcd',parameters:{transparent:true,format:'image/png',version:'1.1.1'},rectangle:C.Rectangle.fromDegrees(-126,24,-66,50),credit:'NOAA / National Weather Service · US radar'});
      provider.errorEvent.addEventListener(()=>{if(layer.enabled)state(layer,'Radar tiles unavailable · toggle to retry',true);});
      layer.imagery=viewer.imageryLayers.addImageryProvider(provider);layer.imagery.alpha=.65;layer.loaded=true;state(layer,'US radar imagery · refreshed '+timestamp(Date.now()));return;
    }
    let result;
    if(layer.id==='aircraft'){
      const center=viewer.camera.positionCartographic; const lat=Math.max(-89,Math.min(89,C.Math.toDegrees(center.latitude))),lon=C.Math.toDegrees(center.longitude);
      result=await getJSON('aircraft',{ttl:60000,params:{lat:lat.toFixed(2),lon:lon.toFixed(2),r:'100'},force});
    }else result=await getJSON(layer.id,{ttl:layer.refresh,force});
    if(!layer.enabled)return;
    // Swap only after the request succeeds. Hide stale moving entities on failure.
    const trackedId=viewer.trackedEntity?.id;
    sourceFor(layer);
    if(layer.id==='cameras'){
      if(!Array.isArray(result.data.features))throw new Error('Unexpected camera data');
      cameras=result.data.features.filter(f=>validCoordinates(f.geometry?.coordinates?.[0],f.geometry?.coordinates?.[1])&&f.properties?.presets?.some(p=>p.inCollection)).map(f=>({id:f.id,kind:'camera',title:f.properties.name.replaceAll('_',' '),lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],country:'Finland',region:'Finland',provider:'Fintraffic',sourceUrl:'https://www.digitraffic.fi/en/terms-of-service/',license:'CC BY 4.0',refreshMs:600000,presets:f.properties.presets.filter(p=>p.inCollection),metadataTime:f.properties.dataUpdatedTime}));
      cameras.forEach(m=>entity(layer,m));setupCameraFilters();renderCameraList();state(layer,cameras.length+' stations · Finland · metadata '+timestamp(result.time));
    }
    if(layer.id==='earthquakes'){
      if(!Array.isArray(result.data.features))throw new Error('Unexpected earthquake data');
      result.data.features.forEach(f=>{const [lon,lat,depth]=f.geometry.coordinates;const mag=f.properties.mag;entity(layer,{id:f.id,kind:'quake',title:f.properties.place||'Earthquake',lon,lat,mag,depth,time:f.properties.time,url:f.properties.url},{point:{pixelSize:Math.max(6,Math.min(24,5+(mag||0)*2)),color:C.Color.fromCssColorString('#ffa75f'),outlineColor:C.Color.fromCssColorString('#562b20'),outlineWidth:2}});});state(layer,result.data.features.length+' observations · updated '+timestamp(result.time));
    }
    if(layer.id==='satellites'||layer.id==='satelliteCatalog'){
      if(!Array.isArray(result.data))throw new Error('Unexpected satellite data');
      const list=result.data.slice(0,layer.id==='satelliteCatalog'?150:50);layer.satMarkers=[];
      for(const record of list){try{const rec=window.satellite.json2satrec(record);const marker={id:record.NORAD_CAT_ID,kind:'satellite',title:record.OBJECT_NAME,lon:0,lat:0,record,rec};const e=entity(layer,marker);if(e)layer.satMarkers.push(marker);}catch{}}
      updateSatellites();state(layer,layer.satMarkers.length+' calculated positions · elements '+timestamp(list[0]?.EPOCH+'Z')); 
    }
    if(layer.id==='aircraft'){
      const list=Array.isArray(result.data.ac)?result.data.ac:[];
      const observedAt=Number.isFinite(result.data.now)?result.data.now:result.time;
      list.filter(a=>validCoordinates(a.lon,a.lat)&&(a.seen_pos??999)<120).slice(0,250).forEach(a=>entity(layer,{id:a.hex,kind:'aircraft',title:(a.flight||a.r||a.hex).trim(),lon:a.lon,lat:a.lat,height:(typeof a.alt_baro==='number'?a.alt_baro:0)*.3048,alt:a.alt_baro,speed:a.gs,track:a.track,time:observedAt-(a.seen_pos||0)*1000},{billboard:{image:'../assets/plane.svg',width:24,height:24,rotation:-C.Math.toRadians(a.track||0),color:C.Color.WHITE},point:undefined}));state(layer,layer.source.entities.values.length+' aircraft · updated '+timestamp(result.time));
    }
    if(trackedId?.startsWith(layer.id+':'))viewer.trackedEntity=layer.source.entities.getById(trackedId);
    if(selectedMarker?.entity?.id?.startsWith(layer.id+':')){const fresh=layer.source.entities.getById(selectedMarker.entity.id);if(fresh)Object.assign(selectedMarker,fresh.groceMarker);else{setPanel('detail-panel',false);selectedMarker=null;notice('The selected observation is no longer in this feed.');}}
    layer.loaded=true;
  }catch(err){if(!layer.enabled)return;if(layer.source){layer.source.show=false;layer.source.entities.removeAll();}if(layer.id==='cameras'||layer.id==='roadCameras'){if(layer.id==='cameras')cameras=[];else roadCameras=[];setupCameraFilters();renderCameraList();}state(layer,'Unavailable · toggle off/on to retry',true);console.warn('groce-eye connection:',layer.id,err.message);}
  finally{layer.busy=false;viewer?.scene.requestRender();}
}
function enable(id,on){const layer=layers.get(id);if(!layer)return;layer.enabled=on;$('toggle-'+id).checked=on;if(layer.source)layer.source.show=on;if(layer.imagery)layer.imagery.show=on;clearInterval(layer.timer);if(id==='cameras'||id==='roadCameras'){setupCameraFilters();renderCameraList();}if(id==='daynight'){viewer.scene.globe.enableLighting=on;state(layer,on?'Current sunlight':'Off');viewer.scene.requestRender();return;}if(on){load(layer);layer.timer=setInterval(()=>load(layer),layer.refresh);}else state(layer,'Off');viewer.scene.requestRender();}
function updateSatellites(){if(document.hidden||!viewer)return;const now=new Date(),gmst=window.satellite.gstime(now);for(const layer of layers.values()){if(!layer.enabled||!layer.satMarkers)continue;for(const m of layer.satMarkers){const pv=window.satellite.propagate(m.rec,now);if(!pv?.position)continue;const g=window.satellite.eciToGeodetic(pv.position,gmst);m.lon=window.satellite.degreesLong(g.longitude);m.lat=window.satellite.degreesLat(g.latitude);m.height=g.height*1000;if(validCoordinates(m.lon,m.lat))m.entity.position=position(m.lon,m.lat,m.height);}}viewer.scene.requestRender();}
function cameraPool(){return [...(layers.get('cameras').enabled?cameras:[]),...(layers.get('roadCameras').enabled?roadCameras:[])];}
function setupCameraFilters(){const current=$('camera-region').value;const regions=[...new Set(cameraPool().map(m=>countryName(m.country)+' · '+m.region))].sort();$('camera-region').replaceChildren(new Option('All available regions',''),...regions.map(r=>new Option(r,r)));$('camera-region').value=regions.includes(current)?current:'';}
function globeCenter(){const canvas=viewer.canvas;const hit=viewer.camera.pickEllipsoid(new C.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2),viewer.scene.globe.ellipsoid);return hit?C.Cartographic.fromCartesian(hit):viewer.camera.positionCartographic;}
function countryName(country){return {US:'United States',CA:'Canada'}[country]||country;}
function cameraDistance(m){const c=globeCenter();let delta=m.lon-C.Math.toDegrees(c.longitude);delta=((delta+540)%360)-180;return Math.hypot(delta*Math.cos(c.latitude),m.lat-C.Math.toDegrees(c.latitude));}
function cameraMatches(){const q=$('camera-search').value.toLowerCase(),region=$('camera-region').value;return cameraPool().filter(m=>(!region||countryName(m.country)+' · '+m.region===region)&&(m.title+' '+m.region+' '+m.country).toLowerCase().includes(q)).sort((a,b)=>cameraDistance(a)-cameraDistance(b));}
function renderCameraList(){const pool=cameraPool();$('camera-list').hidden=!pool.length;const matches=cameraMatches();$('camera-count').textContent=matches.length.toLocaleString()+' matching views · nearest to globe center first';$('camera-results').replaceChildren(...matches.slice(0,12).map(m=>{const b=text('button',m.title+' · '+m.region,'camera-row');b.addEventListener('click',()=>{openMarker(m);fly(m.lon,m.lat,35000);});return b;}));}
function sourceLink(label,url){if(!/^https:\/\//.test(url||''))return text('span',label);const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener';return a;}
function actions(marker){const row=text('div','','actions'),flyButton=text('button','Fly here');flyButton.addEventListener('click',()=>fly(marker.lon,marker.lat,marker.kind==='satellite'?Math.max(2000000,marker.height*3):40000));row.append(flyButton);if(marker.kind==='aircraft'||marker.kind==='satellite'){const track=text('button','Follow');track.addEventListener('click',()=>{viewer.trackedEntity=marker.entity;notice('Following '+marker.title+'. Reset view to stop.');});row.append(track);}return row;}
function openMarker(m){
  weatherRequest++;
  selectedMarker=m;clearInterval(cameraRefresh);setPanel('detail-panel',true);if(mobile())showLayers(false);$('detail-title').textContent=m.title;const content=$('detail-content');content.replaceChildren();content.append(text('p',m.lat.toFixed(3)+'°, '+m.lon.toFixed(3)+'°','source'));
  if(m.kind==='camera'){
    const select=document.createElement('select');select.setAttribute('aria-label','Camera angle');m.presets.forEach((p,i)=>{const o=document.createElement('option');o.value=p.id;o.textContent='View '+(i+1);select.append(o);});if(m.presets.length>1)content.append(select);
    const img=document.createElement('img');img.alt='Public road-camera image from '+m.title;img.referrerPolicy='no-referrer';const status=text('p','Loading camera image…','source');
    let requested=0;const refresh=()=>{requested=Date.now();status.textContent='Loading camera image…';const preset=m.presets.find(p=>p.id===select.value)||m.presets[0];img.src=preset.url||'https://weathercam.digitraffic.fi/'+encodeURIComponent(preset.id)+'.jpg?groce='+Math.floor(requested/600000);};
    img.addEventListener('load',()=>status.textContent='Displayed '+timestamp(requested)+'. Browser/provider caching may apply. Capture time may be earlier.');img.addEventListener('error',()=>status.textContent='Camera image unavailable. Try another view or retry later.');select.addEventListener('change',refresh);
    if(m.provider?.startsWith('DriveBC'))content.append(text('p','Contains information licensed under the Open Government Licence – British Columbia.','source'));
    content.append(img,status,text('p',(m.provider||'Fintraffic')+' · '+countryName(m.country||'Finland')+'. No recording is performed by groce-eye.','source'),sourceLink('Source: '+(m.provider||'Fintraffic')+' · '+(m.license||'CC BY 4.0'),m.sourceUrl||'https://www.digitraffic.fi/en/terms-of-service/'));
    const row=actions(m),refreshButton=text('button','Refresh'),expand=text('button','Expand image');refreshButton.addEventListener('click',refresh);expand.addEventListener('click',()=>{img.classList.toggle('image-expanded');expand.textContent=img.classList.contains('image-expanded')?'Fit image':'Expand image';});row.append(refreshButton,expand);content.append(row);refresh();cameraRefresh=setInterval(()=>{if(!document.hidden&&!$('detail-panel').hidden)refresh();},Math.max(60000,m.refreshMs||600000));
  }else if(m.kind==='event'||m.kind==='dispatch'){
    content.append(text('p',m.time?'Reported '+(m.kind==='dispatch'?String(m.time).replace('T',' ')+' (Seattle local time)':timestamp(m.time)):'Report date unavailable'),text('p',m.note||'Public observation; may be delayed.'),sourceLink('Original public source',m.sourceUrl),actions(m));
  }else if(m.kind==='quake'){
    content.append(text('p','Magnitude '+(m.mag??'unknown')),text('p','Observed '+timestamp(m.time)),text('p','Depth '+m.depth+' km'),sourceLink('USGS observation',m.url),actions(m));
  }else if(m.kind==='satellite'){
    content.append(text('p','Calculated orbit · NORAD '+m.id),text('p','Orbital elements dated '+timestamp(m.record.EPOCH+'Z')),text('p','Position is calculated with SGP4 from public orbital elements. It is an estimate, not a live sensor observation.','source'),sourceLink('CelesTrak orbital data','https://celestrak.org/'),actions(m));
  }else if(m.kind==='aircraft'){
    content.append(text('p','Reported '+timestamp(m.time)),text('p','Altitude: '+(m.alt??'unknown')+' ft · Speed: '+(m.speed??'unknown')+' knots'),sourceLink('ADSB.lol · ODbL data','https://www.adsb.lol/docs/open-data/api/'),actions(m));
  }
}
const PLACES=[['Indianapolis, Indiana',-86.158,39.768],['Kennard, Indiana',-85.518,39.904],['Helsinki, Finland',24.938,60.17],['Tampere, Finland',23.76,61.498],['London, United Kingdom',-.1276,51.5072],['Tokyo, Japan',139.69,35.68],['New York, United States',-74.006,40.7128],['Austin, Texas',-97.743,30.267],['Richfield, Utah',-112.085,38.765],['Sydney, Australia',151.209,-33.869],['Paris, France',2.352,48.857]];
async function search(event){event.preventDefault();const q=$('place-search').value.trim();if(!q)return;const coords=q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);if(coords&&validCoordinates(+coords[2],+coords[1])){fly(+coords[2],+coords[1],150000);if(mobile())showLayers(false);return;}
  const simplify=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let list=PLACES;
  try{if(!cityCatalog){const r=await fetch('../assets/cities.json');if(!r.ok)throw new Error();cityCatalog=await r.json();}list=[...PLACES,...cityCatalog.map(p=>[p[0]+', '+p[1],p[2],p[3]])];}catch{notice('Showing featured cities; the full city catalog could not load.');}
  const matches=list.filter(p=>simplify(p[0]).includes(simplify(q))).slice(0,8);$('search-results').replaceChildren(...matches.map(p=>{const b=text('button',p[0],'search-result');b.addEventListener('click',()=>{fly(p[1],p[2],150000);$('search-results').replaceChildren();if(mobile())showLayers(false);});return b;}));if(!matches.length)$('search-results').append(text('p','No city found. Try latitude, longitude. The catalog covers cities over 15,000 people plus featured places.','hint'));
}
function share(){const c=viewer.camera.positionCartographic;const url=new URL(location.href);url.search='';if(localEdition)url.searchParams.set('local','1');url.searchParams.set('lon',C.Math.toDegrees(c.longitude).toFixed(4));url.searchParams.set('lat',C.Math.toDegrees(c.latitude).toFixed(4));url.searchParams.set('height',Math.round(c.height));url.searchParams.set('layers',[...layers.values()].filter(l=>l.enabled).map(l=>l.id).join(','));if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url.href).then(()=>notice('View link copied.')).catch(()=>shareFallback(url.href));else shareFallback(url.href);}
function shareFallback(url){setPanel('help',true);$('help').append(text('p','Copy this view link:'));const input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Shareable view link');$('help').append(input);input.focus();input.select();}
async function start(){
  try{
    if(!C)throw new Error('The viewer library did not load. Reload the page.');
    C.Ion.defaultAccessToken='';
    const fallback=await C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'),{credit:'Natural Earth II'});
    viewer=new C.Viewer('globe',{baseLayer:new C.ImageryLayer(fallback),baseLayerPicker:false,geocoder:false,animation:false,timeline:false,homeButton:false,sceneModePicker:false,fullscreenButton:false,navigationHelpButton:false,infoBox:false,selectionIndicator:false,terrainProvider:new C.EllipsoidTerrainProvider(),requestRenderMode:true,maximumRenderTimeChange:10,shouldAnimate:true});
    viewer.scene.globe.baseColor=C.Color.fromCssColorString('#183746');viewer.scene.backgroundColor=C.Color.fromCssColorString('#09131e');viewer.targetFrameRate=30;
    const imagery=new C.UrlTemplateImageryProvider({url:'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maximumLevel:18,credit:'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'});
    const satLayer=viewer.imageryLayers.addImageryProvider(imagery);imagery.errorEvent.addEventListener(()=>{satLayer.show=false;notice('Satellite imagery unavailable. Showing the bundled world map.');});
    buildLayers();$('loading').hidden=true;$('edition').textContent=localEdition?'Free desktop connections':'Free public connections';
    if(localEdition)$('desktop-link').hidden=true;
    const params=new URLSearchParams(location.search),lon=Number(params.get('lon')),lat=Number(params.get('lat')),height=Number(params.get('height'));
    if(params.has('lon')&&validCoordinates(lon,lat)&&height>=1000&&height<=50000000)fly(lon,lat,height);else preset('world');
    const requested=params.has('layers')?params.get('layers').split(','):['earthquakes','cameras','roadCameras'];requested.filter(id=>layers.has(id)).forEach(id=>enable(id,true));
    if(mobile())showLayers(false);
    const handler=new C.ScreenSpaceEventHandler(viewer.canvas);handler.setInputAction(e=>{const pick=viewer.scene.pick(e.position);if(pick?.id?.groceMarker)openMarker(pick.id.groceMarker);},C.ScreenSpaceEventType.LEFT_CLICK);
    viewer.camera.moveEnd.addEventListener(()=>{if(cameraPool().length)renderCameraList();});
    satellitesTimer=setInterval(updateSatellites,3000);
    loadCoverage();
    document.addEventListener('visibilitychange',()=>{viewer.clock.shouldAnimate=!document.hidden;if(!document.hidden){for(const l of layers.values())if(l.enabled)load(l);}});
  }catch(error){$('loading').hidden=true;$('fatal').hidden=false;$('fatal-message').textContent=error.message;console.error(error);}
}
$('layers-button').addEventListener('click',()=>showLayers($('layers-panel').hidden));$('close-layers').addEventListener('click',()=>{showLayers(false);$('layers-button').focus();});$('reset').addEventListener('click',()=>preset('world'));
$('zoom-in').addEventListener('click',()=>{viewer.camera.zoomIn(viewer.camera.positionCartographic.height*.4);viewer.scene.requestRender();});$('zoom-out').addEventListener('click',()=>{viewer.camera.zoomOut(viewer.camera.positionCartographic.height*.6);viewer.scene.requestRender();});
$('map-mode').addEventListener('click',()=>{if(viewer.scene.mode===C.SceneMode.SCENE2D){viewer.scene.morphTo3D(duration());$('map-mode').textContent='2D map';}else{viewer.scene.morphTo2D(duration());$('map-mode').textContent='3D globe';}});
if(!document.fullscreenEnabled)$('fullscreen').hidden=true;else $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('Full screen is unavailable. The globe already fills this window.');}});
$('share').addEventListener('click',share);$('help-button').addEventListener('click',()=>setPanel('help',$('help').hidden));$('close-help').addEventListener('click',()=>{setPanel('help',false);$('help-button').focus();});$('close-detail').addEventListener('click',()=>{weatherRequest++;setPanel('detail-panel',false);clearInterval(cameraRefresh);$('layers-button').focus();});
$('low-detail').addEventListener('change',()=>{viewer.resolutionScale=$('low-detail').checked?.65:1;viewer.targetFrameRate=$('low-detail').checked?20:30;viewer.scene.requestRender();});$('search-form').addEventListener('submit',search);$('camera-search').addEventListener('input',renderCameraList);
$('surprise').addEventListener('click',async()=>{if(!cameraPool().length){enable('roadCameras',true);await load(layers.get('roadCameras'));}const matches=cameraMatches();if(matches.length){const m=matches[Math.floor(Math.random()*Math.min(12,matches.length))];openMarker(m);fly(m.lon,m.lat,35000);}else notice('No camera available for this filter. Try another region.');});
$('camera-region').addEventListener('change',renderCameraList);$('nearby-cameras').addEventListener('click',()=>{renderCameraList();notice('Camera list sorted by distance to the globe center.');});
let weatherRequest=0;
$('weather-here').addEventListener('click',async()=>{const request=++weatherRequest,c=globeCenter();const lat=C.Math.toDegrees(c.latitude),lon=C.Math.toDegrees(c.longitude);setPanel('detail-panel',true);if(mobile())showLayers(false);selectedMarker=null;clearInterval(cameraRefresh);$('detail-title').textContent='Weather at globe center';$('detail-content').replaceChildren(text('p','Connecting to weather service…'));try{const w=await loadWeather(lat,lon);if(request!==weatherRequest||$('detail-panel').hidden)return;const content=$('detail-content');content.replaceChildren(text('p',lat.toFixed(2)+'°, '+lon.toFixed(2)),text('p',w.note||''));if(w.updatedAt)content.append(text('p','Forecast updated '+timestamp(w.updatedAt),'source'));if(w.alertStatus==='loaded'&&!w.alerts.length)content.append(text('p','No active NWS alerts returned for this point.','source'));for(const period of (w.periods||[]).slice(0,4)){content.append(text('h3',period.name||'Forecast'),text('p',period.temperature+'°'+period.temperatureUnit+' · Wind '+period.windSpeed+' '+period.windDirection),text('p',period.detail||period.summary||''));}for(const alert of (w.alerts||[]).slice(0,5)){content.append(text('h3',alert.title||'Weather alert'),text('p',alert.description||''));}content.append(sourceLink(w.provider||'Weather source',w.sourceUrl));}catch(error){if(request===weatherRequest&&!$('detail-panel').hidden)$('detail-content').replaceChildren(text('p',error.message),text('p','Try a US location for forecasts. The daily NASA satellite view offers global imagery.'));}});
async function loadCoverage(){try{const r=await fetch('../camera-coverage.json');if(!r.ok)throw new Error();coverage=await r.json();renderCoverage();}catch{$('coverage-results').append(text('p','Coverage directory unavailable.'));}}
function renderCoverage(){const records=Array.isArray(coverage)?coverage:(coverage?.states||coverage?.regions||[]);const q=$('coverage-search').value.toLowerCase();const items=records.filter(r=>(r.name||r.region||r.state||'').toLowerCase().includes(q));$('coverage-results').replaceChildren(...items.map(r=>{const row=text('div','','coverage-row');row.append(text('strong',r.name||r.region||r.state||'Region'),text('p',coverageText(r),'hint'));const url=r.url||r.sourceUrl||r.officialUrl;if(url&&/^https:\/\//.test(url))row.append(sourceLink('Open official camera map ↗',url));return row;}));}
$('coverage-search').addEventListener('input',()=>{if(coverage)renderCoverage();});
document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.place)));document.addEventListener('keydown',e=>{if(e.key==='Escape'){weatherRequest++;setPanel('help',false);setPanel('detail-panel',false);showLayers(false);clearInterval(cameraRefresh);$('layers-button').focus();}});
start();

function reconcileSelection(layer){if(selectedMarker?.entity?.id?.startsWith(layer.id+':')){const fresh=layer.source.entities.getById(selectedMarker.entity.id);if(fresh){Object.assign(selectedMarker,fresh.groceMarker);if(!$('detail-panel').hidden)openMarker(selectedMarker);}else{setPanel('detail-panel',false);selectedMarker=null;notice('The selected report is no longer in this feed.');}}}
async function browseDispatch(page=0){const request=++weatherRequest;selectedMarker=null;enable('dispatch',true);await load(layers.get('dispatch'));if(request!==weatherRequest)return;const records=layers.get('dispatch').source?.entities.values.map(e=>e.groceMarker).sort((a,b)=>String(b.time).localeCompare(String(a.time)))||[];weatherRequest++;selectedMarker=null;clearInterval(cameraRefresh);setPanel('detail-panel',true);if(mobile())showLayers(false);$('detail-title').textContent='Recent Seattle dispatch reports';const content=$('detail-content');content.replaceChildren(text('p','Latest public Fire/EMS dispatch reports. Seattle local time. Preliminary dispatch categories; locations rounded. No patient identities or outcomes.'),sourceLink('Search the official public record','https://data.seattle.gov/Public-Safety/Seattle-Real-Time-Fire-911-Calls/kzjm-xkqj'));if(!records.length)content.append(text('p','Dispatch source unavailable; try again later.'));for(const m of records.slice(page*25,(page+1)*25)){const b=text('button',String(m.time).replace('T',' ')+' · '+m.title,'camera-row');b.addEventListener('click',()=>openMarker(m));content.append(b);}const actions=text('div','','actions');if(page>0){const b=text('button','Previous 25');b.addEventListener('click',()=>browseDispatch(page-1));actions.append(b);}if((page+1)*25<records.length){const b=text('button','Next 25');b.addEventListener('click',()=>browseDispatch(page+1));actions.append(b);}content.append(actions);}

function showStateCameraInfo(code){weatherRequest++;selectedMarker=null;clearInterval(cameraRefresh);setPanel('detail-panel',true);const record=coverage?.states?.find(r=>r.code===code);$('detail-title').textContent=(record?.name||'Indiana')+' public cameras';$('detail-content').replaceChildren(text('p','Indiana cameras are available on the official TrafficWise map. Its data feed requires credentials, so groce-eye opens the public map rather than embedding those images.'),sourceLink('Open official camera map ↗',record?.sourceUrl||'https://511in.org/list/cameras'),text('p','Use Weather at globe center for the free local forecast and alerts.'));}

function coverageText(r){return {'integrated':'Camera views are included on this globe. You can also open the official map.','key-required':'The data feed needs an API key. Open the official public map to see available cameras.','account-required':'The feed needs an account. Open the official public map to see available cameras.','permission-required':'Feed reuse requires permission. Open the official map for available views.','legal-uncertain':'Free image reuse has not been confirmed. Open the official map for available views.','official-map-only':'Use the official public map. A suitable free camera feed has not been confirmed.','permitted-embed':'This state permits sharing its official map. Open it to choose cameras and other traffic layers.','unknown':'Open the official map for available cameras. A usable free feed and its reuse terms have not yet been confirmed.'}[r.status]||'Open the official camera source.';}
