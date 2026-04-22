(async function(){
  try{
    const res=await fetch('./levels/levels.json');
    const manifest=await res.json();
    const latest=(manifest.levels||[]).slice(-1)[0];
    if(!latest)return;
    document.getElementById('sceneInfo').textContent='Latest level file: '+latest.file;
    document.getElementById('sceneTitle').textContent=latest.name||'Scene';
    document.getElementById('gameTitle').textContent=manifest.gameTitle||'Game Runtime';
  }catch(err){
    document.getElementById('sceneInfo').textContent='No manifest found yet.';
  }
})();
