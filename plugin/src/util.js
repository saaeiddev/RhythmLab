(function(global){
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
  function round3(v){ return Math.round(v*1000)/1000; }
  function uniqueName(base, existing){
    const names = new Set(existing || []);
    if(!names.has(base)) return base;
    let i=2; while(names.has(`${base}_${i}`)) i++; return `${base}_${i}`;
  }
  function normalizeWindowsPath(p){ return String(p||'').replace(/\\/g,'/'); }
  function invariant(condition,message){ if(!condition) throw new Error(message); }
  global.RhythmUtil={clamp,sum,round3,uniqueName,normalizeWindowsPath,invariant};
  if(typeof module!=='undefined') module.exports=global.RhythmUtil;
})(typeof globalThis!=='undefined'?globalThis:this);
