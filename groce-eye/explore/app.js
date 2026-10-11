import {getJSON,localEdition,validCoordinates} from './adapters.js';
const $=id=>document.getElementById(id);
const C=window.Cesium;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(max-width:700px)').matches;
const duration=()=>reduced?0:1.2;
let viewer, cameras=[], cameraRefresh, selectedMarker, noticeTimer, satellitesTimer, cityCatalog;
const definitions=[
  {id:'cameras',name:'Public cameras',note:'Finland · refreshing road images',color:'#f18b52',refresh:600000},
  {id:'earthquakes',name:'Earthquakes',note:'USGS · last 24 hours',color:'#ffa75f',refresh:300000},
  {id:'satellites',name:'Space stations',note:'CelesTrak · calculated orbits',color:'#a2cff8',refresh:7200000},
  {id:'radar',name:'US weather radar',note:'NOAA/NWS · contiguous United States',color:'#77d5a0',refresh:600000},
  {id:'daynight',name:'Day & night',note:'Sunlight for the current time',color:'#ffdf84'}
];
if(localEdition) definitions.unshift({id:'aircraft',name:'Aircraft near your view',note:'ADSB.lol · 100 nautical mile radius · local only',color:'#e4efee',refresh:60000});
if(localEdition) definitions.push({id:'satelliteCatalog',name:'More satellites',note:'CelesTrak · up to 150 active objects · local only',color:'#e4b7f8',refresh:7200000});
const layers=new Map(definitions.map(d=>[d.id,{...d,enabled:false,busy:false,loaded:false,source:null,timer:null}]));
function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
function notice(message){$('notice').replaceChildren(text('span',message));clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').replaceChildren(),6500);}
function state(layer,value,error=false){$('state-'+layer.id).textContent=value;$('state-'+layer.id).classList.toggle('error',error);}
function timestamp(time){return new Date(time).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function setPanel(id,show){$(id).hidden=!show;if(id==='layers-panel')$('layers-button').setAttribute('aria-expanded',String(show));if(id==='help')$('help-button').setAttribute('aria-expanded',String(show));}
function showLayers(show){if(show&&mobile())setPanel('detail-panel',false);setPanel('layers-panel',show);}
function position(lon,lat,height=0){return C.Cartesian3.fromDegrees(lon,lat,height);}
function fly(lon,lat,height=1500000){viewer.trackedEntity=undefined;viewer.camera.flyTo({destination:position(lon,lat,height),duration:duration()});}
function preset(name){if(name==='world')fly(-55,28,23000000);if(name==='finland'){fly(25,64,1500000);enable('cameras',true);}if(name==='indiana')fly(-86.16,39.77,220000);if(mobile())showLayers(false);}
function buildLayers(){
  definitions.forEach(d=>{
    const row=text('div','','layer'), label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id='toggle-'+d.id;input.addEventListener('change',()=>enable(d.id,input.checked));label.append(input,text('span',d.name));row.append(label,text('small',d.note));const status=text('small','Off','state');status.id='state-'+d.id;row.append(status);$('layer-list').append(row);
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
      cameras=result.data.features.filter(f=>validCoordinates(f.geometry?.coordinates?.[0],f.geometry?.coordinates?.[1])&&f.properties?.presets?.some(p=>p.inCollection)).map(f=>({id:f.id,kind:'camera',title:f.properties.name.replaceAll('_',' '),lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],presets:f.properties.presets.filter(p=>p.inCollection),metadataTime:f.properties.dataUpdatedTime}));
      cameras.forEach(m=>entity(layer,m));$('camera-list').hidden=false;renderCameraList();state(layer,cameras.length+' stations · Finland · metadata '+timestamp(result.time));
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
  }catch(err){if(!layer.enabled)return;if(layer.source){layer.source.show=false;layer.source.entities.removeAll();}if(layer.id==='cameras'){$('camera-list').hidden=true;cameras=[];}state(layer,'Unavailable · toggle off/on to retry',true);console.warn('groce-eye connection:',layer.id,err.message);}
  finally{layer.busy=false;viewer?.scene.requestRender();}
}
function enable(id,on){const layer=layers.get(id);if(!layer)return;layer.enabled=on;$('toggle-'+id).checked=on;if(layer.source)layer.source.show=on;if(layer.imagery)layer.imagery.show=on;clearInterval(layer.timer);if(id==='cameras')$('camera-list').hidden=!on||!cameras.length;if(id==='daynight'){viewer.scene.globe.enableLighting=on;state(layer,on?'Current sunlight':'Off');viewer.scene.requestRender();return;}if(on){load(layer);layer.timer=setInterval(()=>load(layer),layer.refresh);}else state(layer,'Off');viewer.scene.requestRender();}
function updateSatellites(){if(document.hidden||!viewer)return;const now=new Date(),gmst=window.satellite.gstime(now);for(const layer of layers.values()){if(!layer.enabled||!layer.satMarkers)continue;for(const m of layer.satMarkers){const pv=window.satellite.propagate(m.rec,now);if(!pv?.position)continue;const g=window.satellite.eciToGeodetic(pv.position,gmst);m.lon=window.satellite.degreesLong(g.longitude);m.lat=window.satellite.degreesLat(g.latitude);m.height=g.height*1000;if(validCoordinates(m.lon,m.lat))m.entity.position=position(m.lon,m.lat,m.height);}}viewer.scene.requestRender();}
function renderCameraList(){const q=$('camera-search').value.toLowerCase();const matches=cameras.filter(m=>m.title.toLowerCase().includes(q)).slice(0,12);$('camera-results').replaceChildren(...matches.map(m=>{const b=text('button',m.title,'camera-row');b.addEventListener('click',()=>openMarker(m));return b;}));}
function sourceLink(label,url){const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener';return a;}
function actions(marker){const row=text('div','','actions'),flyButton=text('button','Fly here');flyButton.addEventListener('click',()=>fly(marker.lon,marker.lat,marker.kind==='satellite'?Math.max(2000000,marker.height*3):40000));row.append(flyButton);if(marker.kind==='aircraft'||marker.kind==='satellite'){const track=text('button','Follow');track.addEventListener('click',()=>{viewer.trackedEntity=marker.entity;notice('Following '+marker.title+'. Reset view to stop.');});row.append(track);}return row;}
function openMarker(m){
  selectedMarker=m;clearInterval(cameraRefresh);setPanel('detail-panel',true);if(mobile())showLayers(false);$('detail-title').textContent=m.title;const content=$('detail-content');content.replaceChildren();content.append(text('p',m.lat.toFixed(3)+'°, '+m.lon.toFixed(3)+'°','source'));
  if(m.kind==='camera'){
    const select=document.createElement('select');select.setAttribute('aria-label','Camera angle');m.presets.forEach((p,i)=>{const o=document.createElement('option');o.value=p.id;o.textContent='View '+(i+1);select.append(o);});if(m.presets.length>1)content.append(select);
    const img=document.createElement('img');img.alt='Public road-camera image from '+m.title;img.referrerPolicy='no-referrer';const status=text('p','Loading camera image…','source');
    let requested=0;const refresh=()=>{requested=Date.now();status.textContent='Loading camera image…';img.src='https://weathercam.digitraffic.fi/'+encodeURIComponent(select.value||m.presets[0].id)+'.jpg?groce='+Math.floor(requested/600000);};
    img.addEventListener('load',()=>status.textContent='Image fetched '+timestamp(requested)+'. Provider typically refreshes about every 10 minutes; capture time may be earlier.');img.addEventListener('error',()=>status.textContent='Camera image unavailable. Try another view or retry later.');select.addEventListener('change',refresh);
    content.append(img,status,text('p','Refreshing image · Finland. No recording is performed by groce-eye.','source'),sourceLink('Source: Fintraffic / digitraffic.fi · CC BY 4.0','https://www.digitraffic.fi/en/terms-of-service/'));
    const row=actions(m),refreshButton=text('button','Refresh'),expand=text('button','Expand image');refreshButton.addEventListener('click',refresh);expand.addEventListener('click',()=>{img.classList.toggle('image-expanded');expand.textContent=img.classList.contains('image-expanded')?'Fit image':'Expand image';});row.append(refreshButton,expand);content.append(row);refresh();cameraRefresh=setInterval(()=>{if(!document.hidden&&!$('detail-panel').hidden)refresh();},600000);
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
    const requested=params.has('layers')?params.get('layers').split(','):['earthquakes','cameras'];requested.filter(id=>layers.has(id)).forEach(id=>enable(id,true));
    if(mobile())showLayers(false);
    const handler=new C.ScreenSpaceEventHandler(viewer.canvas);handler.setInputAction(e=>{const pick=viewer.scene.pick(e.position);if(pick?.id?.groceMarker)openMarker(pick.id.groceMarker);},C.ScreenSpaceEventType.LEFT_CLICK);
    satellitesTimer=setInterval(updateSatellites,3000);
    document.addEventListener('visibilitychange',()=>{viewer.clock.shouldAnimate=!document.hidden;if(!document.hidden){for(const l of layers.values())if(l.enabled)load(l);}});
  }catch(error){$('loading').hidden=true;$('fatal').hidden=false;$('fatal-message').textContent=error.message;console.error(error);}
}
$('layers-button').addEventListener('click',()=>showLayers($('layers-panel').hidden));$('close-layers').addEventListener('click',()=>{showLayers(false);$('layers-button').focus();});$('reset').addEventListener('click',()=>preset('world'));
$('zoom-in').addEventListener('click',()=>{viewer.camera.zoomIn(viewer.camera.positionCartographic.height*.4);viewer.scene.requestRender();});$('zoom-out').addEventListener('click',()=>{viewer.camera.zoomOut(viewer.camera.positionCartographic.height*.6);viewer.scene.requestRender();});
$('map-mode').addEventListener('click',()=>{if(viewer.scene.mode===C.SceneMode.SCENE2D){viewer.scene.morphTo3D(duration());$('map-mode').textContent='2D map';}else{viewer.scene.morphTo2D(duration());$('map-mode').textContent='3D globe';}});
if(!document.fullscreenEnabled)$('fullscreen').hidden=true;else $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('Full screen is unavailable. The globe already fills this window.');}});
$('share').addEventListener('click',share);$('help-button').addEventListener('click',()=>setPanel('help',$('help').hidden));$('close-help').addEventListener('click',()=>{setPanel('help',false);$('help-button').focus();});$('close-detail').addEventListener('click',()=>{setPanel('detail-panel',false);clearInterval(cameraRefresh);$('layers-button').focus();});
$('low-detail').addEventListener('change',()=>{viewer.resolutionScale=$('low-detail').checked?.65:1;viewer.targetFrameRate=$('low-detail').checked?20:30;viewer.scene.requestRender();});$('search-form').addEventListener('submit',search);$('camera-search').addEventListener('input',renderCameraList);
$('surprise').addEventListener('click',async()=>{if(!cameras.length){enable('cameras',true);await load(layers.get('cameras'));}if(cameras.length){const m=cameras[Math.floor(Math.random()*cameras.length)];openMarker(m);fly(m.lon,m.lat,35000);}else notice('The camera connection is unavailable. Please retry later.');});
document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.place)));document.addEventListener('keydown',e=>{if(e.key==='Escape'){setPanel('help',false);setPanel('detail-panel',false);showLayers(false);clearInterval(cameraRefresh);$('layers-button').focus();}});
start();
