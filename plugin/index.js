const { entrypoints } = require('uxp');
let initialized=false;
function initOnce(){ if(initialized) return; initialized=true; try{ window.RhythmUI.init(); }catch(e){ console.error('RhythmLab init failed',e); } }
entrypoints.setup({
  plugin:{ create(){ console.log('RhythmLab 0.2.0 created'); }, destroy(){ console.log('RhythmLab destroyed'); } },
  panels:{ rhythmlabPanel:{ create(){ initOnce(); }, show(){ initOnce(); } } }
});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initOnce); else initOnce();
