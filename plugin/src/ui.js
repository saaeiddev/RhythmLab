(function(global){
  const state={items:[],clips:[],music:null,mode:'calm',plans:{},cancelToken:null};
  const $=id=>document.getElementById(id);
  function status(msg,type='neutral'){ const e=$('runStatus'); e.textContent=msg; e.className=`status ${type}`; }
  function setProgress(v){ $('progressBar').style.width=`${Math.round(Math.max(0,Math.min(1,v))*100)}%`; }
  function num(id){ return Number($(id).value); }

  async function refreshSelection(){
    try{
      status('Reading Project selection…');
      const items=await global.RhythmHost.getSelectedItems(); state.items=items;
      const audioExt=/\.(wav|mp3|m4a|aac|aif|aiff)$/i;
      const likelyAudio=items.filter(x=>audioExt.test(x.path||''));
      const likelyVideo=items.filter(x=>!audioExt.test(x.path||''));
      state.music=likelyAudio[0]||null; state.clips=likelyVideo;
      // If Premiere did not expose useful media ranges, initialize conservative editable ranges.
      state.clips.forEach(c=>{ if(!(c.outSeconds>c.inSeconds)) c.outSeconds=(c.inSeconds||0)+10; });
      renderSelection(); buildPreview(); status(`Loaded ${state.clips.length} footage item(s).`,'ok');
    }catch(e){ status(e.message,'error'); }
  }

  function renderSelection(){
    $('selectionSummary').textContent=`${state.clips.length} footage · ${state.items.length-state.clips.length} likely audio`;
    const box=$('clips'); box.innerHTML='';
    state.clips.forEach((c,i)=>{
      const el=document.createElement('div'); el.className='clip';
      el.innerHTML=`<div class="clip-head"><span class="clip-name">${i+1}. ${escapeHtml(c.name)}</span><span class="micro">ordered</span></div><div class="clip-range"><label class="field"><span>In (s)</span><input data-i="${i}" data-k="inSeconds" type="number" step="0.001" value="${c.inSeconds||0}"></label><label class="field"><span>Out (s)</span><input data-i="${i}" data-k="outSeconds" type="number" step="0.001" value="${c.outSeconds||10}"></label></div>`;
      box.appendChild(el);
    });
    box.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{ const i=Number(inp.dataset.i); state.clips[i][inp.dataset.k]=Number(inp.value); buildPreview(); }));
    const ms=$('musicSelect'); ms.innerHTML='';
    state.items.forEach((it,i)=>{ const o=document.createElement('option');o.value=String(i);o.textContent=it.name; if(state.music===it)o.selected=true; ms.appendChild(o); });
    ms.onchange=()=>{ state.music=state.items[Number(ms.value)]||null; };
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function opts(mode){ return {mode,clips:state.clips,targetSeconds:num('targetDuration'),fps:num('frameRate'),bpm:num('bpm'),firstBeatSeconds:num('firstBeat')}; }
  function buildPreview(){
    try{
      const p=global.RhythmPlanner.buildPlan(opts(state.mode)); state.plans[state.mode]=p; renderPlan(p); $('selectionSummary').className='status neutral';
    }catch(e){ $('planPreview').innerHTML=`<div class="status error">${escapeHtml(e.message)}</div>`; }
  }
  function renderPlan(plan){
    const max=Math.max(...plan.shots.map(s=>s.durationFrames),1), box=$('planPreview'); box.innerHTML='';
    plan.shots.forEach((s,i)=>{ const e=document.createElement('div');e.className='shot';e.innerHTML=`<span>#${i+1}</span><div><div class="clip-name">${escapeHtml(s.name)}</div><div class="bar" style="width:${Math.max(8,100*s.durationFrames/max)}%"></div></div><span class="duration">${s.durationSeconds.toFixed(3)}s</span>`;box.appendChild(e); });
    const meta=document.createElement('div');meta.className='micro';meta.textContent=`${plan.shots.length} shots · ${plan.targetFrames} frames · ${plan.targetSeconds.toFixed(3)} s`;box.appendChild(meta);
  }

  async function analyzeMusic(){
    if(!state.music) return status('Choose a music item first.','error');
    if(!/\.wav$/i.test(state.music.path||'')) return status('Automatic analysis supports PCM 16-bit WAV. Use Manual BPM for other formats.','error');
    try{
      status('Analyzing WAV…'); const fs=require('fs'); const b=await fs.readFile(state.music.path); const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
      const wav=global.RhythmWav.parseWav(ab); const r=global.RhythmBeat.analyze(wav.samples,wav.sampleRate);
      $('bpm').value=String(r.bpm);$('firstBeat').value=String(r.firstBeatSeconds);$('analysisResult').textContent=`Detected ${r.bpm} BPM · first beat ${r.firstBeatSeconds}s · ${r.peakCount} onsets`;
      buildPreview();status('Music analysis complete.','ok');
    }catch(e){ status(`${e.message} Manual BPM remains available.`,'error'); }
  }

  async function generateAll(){
    try{
      if(!state.clips.length) throw new Error('Select at least one footage clip.');
      const token={cancelled:false};state.cancelToken=token;$('cancel').disabled=false;$('generateAll').disabled=true;setProgress(0);
      const outputs=[];const modes=['calm','beat','build'];
      for(let m=0;m<modes.length;m++){
        const mode=modes[m]; if(token.cancelled) break; status(`Planning ${mode}…`);
        const plan=global.RhythmPlanner.buildPlan(opts(mode));
        const out=await global.RhythmHost.generateSequence({mode,plan,clips:state.clips,music:state.music,signal:token,onProgress:x=>setProgress((m+x)/modes.length)});
        outputs.push(out.name);
      }
      if(token.cancelled) status(`Cancelled. Created: ${outputs.join(', ') || 'none'}.`,'error');
      else status(`Done: ${outputs.join(', ')}.`,'ok');
    }catch(e){ status(`Stopped: ${e.message}`,'error'); }
    finally{$('cancel').disabled=true;$('generateAll').disabled=false;state.cancelToken=null;}
  }

  function init(){
    $('refreshSelection').onclick=refreshSelection;$('previewPlan').onclick=buildPreview;$('analyzeMusic').onclick=analyzeMusic;$('generateAll').onclick=generateAll;
    $('cancel').onclick=()=>{if(state.cancelToken)state.cancelToken.cancelled=true;};
    document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mode=b.dataset.mode;buildPreview();});
    ['targetDuration','frameRate','bpm','firstBeat'].forEach(id=>$(id).addEventListener('change',buildPreview));
    buildPreview();
  }
  global.RhythmUI={init,state};
})(typeof globalThis!=='undefined'?globalThis:this);
