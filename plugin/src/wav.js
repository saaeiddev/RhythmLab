(function(global){
  function str(dv,o,n){ let s=''; for(let i=0;i<n;i++) s+=String.fromCharCode(dv.getUint8(o+i)); return s; }
  function parseWav(arrayBuffer){
    const dv=new DataView(arrayBuffer);
    if(str(dv,0,4)!=='RIFF' || str(dv,8,4)!=='WAVE') throw new Error('Not a RIFF/WAVE file.');
    let pos=12, fmt=null, dataOffset=-1, dataSize=0;
    while(pos+8<=dv.byteLength){
      const id=str(dv,pos,4), size=dv.getUint32(pos+4,true), body=pos+8;
      if(id==='fmt '){
        fmt={audioFormat:dv.getUint16(body,true),channels:dv.getUint16(body+2,true),sampleRate:dv.getUint32(body+4,true),bitsPerSample:dv.getUint16(body+14,true)};
      } else if(id==='data'){ dataOffset=body; dataSize=size; break; }
      pos=body+size+(size%2);
    }
    if(!fmt || dataOffset<0) throw new Error('WAV is missing fmt or data chunk.');
    if(fmt.audioFormat!==1 || fmt.bitsPerSample!==16) throw new Error('Automatic analysis currently supports PCM 16-bit WAV only.');
    const bytesPerSample=2, frameBytes=fmt.channels*bytesPerSample;
    const frames=Math.floor(dataSize/frameBytes), mono=new Float32Array(frames);
    let p=dataOffset;
    for(let i=0;i<frames;i++){
      let s=0; for(let c=0;c<fmt.channels;c++){ s+=dv.getInt16(p,true)/32768; p+=2; }
      mono[i]=s/fmt.channels;
    }
    return {sampleRate:fmt.sampleRate,channels:fmt.channels,samples:mono};
  }
  global.RhythmWav={parseWav};
  if(typeof module!=='undefined') module.exports=global.RhythmWav;
})(typeof globalThis!=='undefined'?globalThis:this);
