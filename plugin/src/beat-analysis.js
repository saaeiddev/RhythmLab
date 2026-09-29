(function(global){
  function median(a){ const b=[...a].sort((x,y)=>x-y); const m=Math.floor(b.length/2); return b.length%2?b[m]:(b[m-1]+b[m])/2; }
  function analyze(samples,sampleRate,opts={}){
    const win=opts.windowSize||1024, hop=opts.hopSize||512;
    if(samples.length<win*4) throw new Error('Audio is too short for analysis.');
    const env=[];
    let prev=0;
    for(let p=0;p+win<=samples.length;p+=hop){
      let e=0; for(let i=0;i<win;i++){ const v=samples[p+i]; e+=v*v; }
      e=Math.sqrt(e/win);
      env.push(Math.max(0,e-prev*0.94)); prev=e;
    }
    const base=median(env), mean=env.reduce((a,b)=>a+b,0)/env.length;
    const threshold=Math.max(base*2.4,mean*1.45);
    const peaks=[];
    for(let i=1;i<env.length-1;i++) if(env[i]>threshold && env[i]>=env[i-1] && env[i]>env[i+1]) peaks.push(i);
    if(peaks.length<3) throw new Error('Could not detect enough onsets. Use Manual BPM.');
    const minBpm=60,maxBpm=200;
    const minLag=Math.floor((60/maxBpm)*sampleRate/hop), maxLag=Math.ceil((60/minBpm)*sampleRate/hop);
    let bestLag=minLag,best=-Infinity;
    for(let lag=minLag;lag<=maxLag;lag++){
      let score=0; for(let i=lag;i<env.length;i++) score+=env[i]*env[i-lag];
      if(score>best){best=score;bestLag=lag;}
    }
    let bpm=60*sampleRate/(hop*bestLag);
    while(bpm<80) bpm*=2; while(bpm>180) bpm/=2;
    const firstBeatSeconds=peaks[0]*hop/sampleRate;
    const confidence=Math.min(1,peaks.length/(env.length/8));
    return {bpm:Math.round(bpm*10)/10,firstBeatSeconds:Math.round(firstBeatSeconds*1000)/1000,confidence,peakCount:peaks.length};
  }
  global.RhythmBeat={analyze};
  if(typeof module!=='undefined') module.exports=global.RhythmBeat;
})(typeof globalThis!=='undefined'?globalThis:this);
