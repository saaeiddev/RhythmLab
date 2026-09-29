(function(global){
  const U = global.RhythmUtil || (typeof require!=='undefined' ? require('./util') : null);

  function secondsToFrames(seconds,fps){ return Math.max(0, Math.round(Number(seconds)*Number(fps))); }
  function framesToSeconds(frames,fps){ return Number(frames)/Number(fps); }

  function normalizeClip(c, i, fps){
    const inS=Number(c.inSeconds||0), outS=Number(c.outSeconds);
    U.invariant(Number.isFinite(outS) && outS>inS, `Clip ${i+1} has an invalid range.`);
    const inF=secondsToFrames(inS,fps), outF=secondsToFrames(outS,fps);
    U.invariant(outF>inF, `Clip ${i+1} is shorter than one frame.`);
    return {...c,index:i,inFrame:inF,outFrame:outF,capacityFrames:outF-inF};
  }

  // Deterministic capped weighted allocation. Every clip receives >= 1 frame.
  function allocateFrames(totalFrames, capacities, weights){
    const n=capacities.length;
    U.invariant(n>0,'At least one footage clip is required.');
    U.invariant(totalFrames>=n,'Target duration is too short to use every clip once.');
    U.invariant(U.sum(capacities)>=totalFrames,'Target duration exceeds total selected excerpt duration.');
    const result=new Array(n).fill(1);
    const caps=capacities.map(c=>c-1);
    let remaining=totalFrames-n;
    let active=Array.from({length:n},(_,i)=>i);
    const w=weights.map(x=>Math.max(.0001,Number(x)||1));
    while(remaining>0 && active.length){
      const wsum=active.reduce((s,i)=>s+w[i],0);
      let granted=0;
      const desires=active.map(i=>({i,want:remaining*w[i]/wsum}));
      for(const {i,want} of desires){
        if(remaining<=0) break;
        const room=caps[i]-(result[i]-1);
        if(room<=0) continue;
        const add=Math.min(room,Math.floor(want));
        if(add>0){ result[i]+=add; remaining-=add; granted+=add; }
      }
      if(remaining<=0) break;
      // Largest remainder / capacity pass guarantees progress and exact total.
      const ranked=desires
        .map(x=>({i:x.i,rem:x.want-Math.floor(x.want),room:caps[x.i]-(result[x.i]-1)}))
        .filter(x=>x.room>0)
        .sort((a,b)=>b.rem-a.rem || a.i-b.i);
      if(!ranked.length) break;
      for(const x of ranked){
        if(remaining<=0) break;
        if(caps[x.i]-(result[x.i]-1)>0){ result[x.i]++; remaining--; granted++; }
      }
      active=active.filter(i=>caps[i]-(result[i]-1)>0);
      if(granted===0) throw new Error('Unable to allocate frame-accurate durations.');
    }
    U.invariant(remaining===0,'Unable to satisfy target duration within clip handles.');
    return result;
  }

  function calmWeights(n){
    // Low variance with a gentle center emphasis.
    if(n===1) return [1];
    const mid=(n-1)/2;
    return Array.from({length:n},(_,i)=>1.0+0.12*(1-Math.abs(i-mid)/(mid||1)));
  }
  function buildWeights(n){
    if(n===1) return [1];
    // Longer opening shots, progressively shorter toward the end.
    return Array.from({length:n},(_,i)=>Math.pow(0.72,i/(n-1)*3));
  }

  function beatBoundaries(totalFrames,n,bpm,firstBeatSeconds,fps){
    U.invariant(bpm>=20 && bpm<=400,'BPM must be between 20 and 400.');
    const beatFrames=fps*60/bpm;
    const first=firstBeatSeconds*fps;
    const bounds=[0];
    for(let i=1;i<n;i++){
      const ideal=totalFrames*i/n;
      const k=Math.round((ideal-first)/beatFrames);
      let b=Math.round(first+k*beatFrames);
      b=Math.max(bounds[i-1]+1, Math.min(totalFrames-(n-i),b));
      bounds.push(b);
    }
    bounds.push(totalFrames);
    return {bounds,beatFrames};
  }

  function durationsFromBounds(bounds){ return bounds.slice(1).map((b,i)=>b-bounds[i]); }

  function fitBeatDurations(totalFrames, capacities, bpm, firstBeatSeconds, fps){
    const n=capacities.length;
    const {bounds}=beatBoundaries(totalFrames,n,bpm,firstBeatSeconds,fps);
    let d=durationsFromBounds(bounds);
    // If any beat-snapped segment exceeds a source range, fall back to a weighted exact allocation.
    if(d.some((x,i)=>x>capacities[i])){
      d=allocateFrames(totalFrames,capacities,new Array(n).fill(1));
    }
    return d;
  }

  function buildPlan(opts){
    const fps=Number(opts.fps||30);
    U.invariant(Number.isFinite(fps) && fps>0,'Frame rate must be positive.');
    const clips=(opts.clips||[]).map((c,i)=>normalizeClip(c,i,fps));
    const targetFrames=secondsToFrames(opts.targetSeconds,fps);
    U.invariant(targetFrames>0,'Target duration must be positive.');
    const capacities=clips.map(c=>c.capacityFrames);
    let durations;
    const mode=opts.mode||'calm';
    if(mode==='calm') durations=allocateFrames(targetFrames,capacities,calmWeights(clips.length));
    else if(mode==='build') durations=allocateFrames(targetFrames,capacities,buildWeights(clips.length));
    else if(mode==='beat') durations=fitBeatDurations(targetFrames,capacities,Number(opts.bpm||120),Number(opts.firstBeatSeconds||0),fps);
    else throw new Error(`Unknown mode: ${mode}`);

    let cursor=0;
    const shots=clips.map((clip,i)=>{
      const durationFrames=durations[i];
      const shot={
        index:i,
        id:clip.id,
        name:clip.name || `Clip ${i+1}`,
        sourceInFrame:clip.inFrame,
        sourceOutFrame:clip.inFrame+durationFrames,
        timelineStartFrame:cursor,
        timelineEndFrame:cursor+durationFrames,
        durationFrames,
        durationSeconds:framesToSeconds(durationFrames,fps)
      };
      cursor+=durationFrames;
      return shot;
    });
    const plan={mode,fps,targetFrames,targetSeconds:framesToSeconds(targetFrames,fps),shots};
    validatePlan(plan,clips);
    return plan;
  }

  function validatePlan(plan, normalizedClips){
    const shots=plan.shots;
    U.invariant(shots.length===normalizedClips.length,'Every excerpt must be used exactly once.');
    let cursor=0;
    shots.forEach((s,i)=>{
      const c=normalizedClips[i];
      U.invariant(s.timelineStartFrame===cursor,'Timeline contains a gap or overlap.');
      U.invariant(s.timelineEndFrame>s.timelineStartFrame,'Shot duration must be positive.');
      U.invariant(s.sourceInFrame>=c.inFrame && s.sourceOutFrame<=c.outFrame,'Shot exceeds source excerpt handles.');
      U.invariant(s.sourceOutFrame-s.sourceInFrame===s.durationFrames,'Source and timeline durations differ.');
      cursor=s.timelineEndFrame;
    });
    U.invariant(cursor===plan.targetFrames,'Plan must match target duration exactly.');
    return true;
  }

  global.RhythmPlanner={secondsToFrames,framesToSeconds,allocateFrames,beatBoundaries,buildPlan,validatePlan};
  if(typeof module!=='undefined') module.exports=global.RhythmPlanner;
})(typeof globalThis!=='undefined'?globalThis:this);
