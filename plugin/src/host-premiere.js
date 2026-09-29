(function(global){
  let ppro=null;
  try{ ppro=require('premierepro'); }catch(e){}

  function requireHost(){ if(!ppro) throw new Error('Premiere UXP host API is unavailable. Load RhythmLab inside Premiere Pro.'); return ppro; }
  async function activeProject(){ const p=requireHost(); const project=await p.Project.getActiveProject(); if(!project) throw new Error('Open a Premiere project first.'); return project; }

  async function getSelectedItems(){
    const p=requireHost(), project=await activeProject();
    const selection=await p.ProjectUtils.getSelection(project);
    const items=selection ? await selection.getItems() : [];
    const out=[];
    for(const item of items){
      try{
        const clip=p.ClipProjectItem.cast(item);
        const path=await clip.getMediaFilePath();
        const inPoint=await clip.getInPoint(p.Constants.MediaType.VIDEO).catch(()=>null);
        const outPoint=await clip.getOutPoint(p.Constants.MediaType.VIDEO).catch(()=>null);
        out.push({
          raw:item, clip,
          id:item.getId ? item.getId() : `${item.name}-${out.length}`,
          name:item.name,
          path,
          inSeconds:inPoint ? inPoint.seconds : 0,
          outSeconds:outPoint && outPoint.seconds>0 ? outPoint.seconds : null
        });
      }catch(e){ /* ignore bins/sequences/non-clip items */ }
    }
    return out;
  }

  async function getExistingSequenceNames(project){ return (await project.getSequences()).map(s=>s.name); }

  async function createBaseSequence(project, name, firstClip){
    // 26.2.2 has createSequenceFromMedia; it reliably derives settings from the first footage item.
    const bin=await project.getInsertionBin();
    return await project.createSequenceFromMedia(name,[firstClip.clip],bin);
  }

  function actionTransaction(project, label, actions){
    const ok=project.executeTransaction(compound=>{ actions.forEach(a=>compound.addAction(a)); },label);
    if(!ok) throw new Error(`${label} transaction was rejected by Premiere.`);
  }

  async function removeAllTimelineItems(project, sequence){
    const p=requireHost();
    const editor=p.SequenceEditor.getEditor(sequence), actions=[];
    const vCount=await sequence.getVideoTrackCount();
    for(let i=0;i<vCount;i++){
      const track=await sequence.getVideoTrack(i); const items=track.getTrackItems(p.Constants.TrackItemType.CLIP,false);
      if(items.length){
        p.TrackItemSelection.createEmptySelection(sel=>{ items.forEach(it=>p.TrackItemSelection.addItem(sel,it,true)); actions.push(editor.createRemoveItemsAction(sel,false,p.Constants.MediaType.VIDEO,false)); });
      }
    }
    const aCount=await sequence.getAudioTrackCount();
    for(let i=0;i<aCount;i++){
      const track=await sequence.getAudioTrack(i); const items=track.getTrackItems(p.Constants.TrackItemType.CLIP,false);
      if(items.length){
        p.TrackItemSelection.createEmptySelection(sel=>{ items.forEach(it=>p.TrackItemSelection.addItem(sel,it,true)); actions.push(editor.createRemoveItemsAction(sel,false,p.Constants.MediaType.AUDIO,false)); });
      }
    }
    if(actions.length) actionTransaction(project,'RhythmLab: clear generated sequence',actions);
  }

  async function newestVideoItem(sequence){
    const p=requireHost(); const track=await sequence.getVideoTrack(0);
    const items=track.getTrackItems(p.Constants.TrackItemType.CLIP,false);
    if(!items.length) throw new Error('Premiere did not create the expected video track item.');
    return items[items.length-1];
  }
  async function newestAudioItem(sequence){
    const p=requireHost(); const count=await sequence.getAudioTrackCount();
    if(!count) return null; const track=await sequence.getAudioTrack(0);
    const items=track.getTrackItems(p.Constants.TrackItemType.CLIP,false); return items.length?items[items.length-1]:null;
  }

  async function generateSequence({mode,plan,clips,music,signal,onProgress}){
    const p=requireHost(), project=await activeProject();
    if(signal && signal.cancelled) throw new Error('Cancelled.');
    const existing=await getExistingSequenceNames(project);
    const base=`RhythmLab_${mode[0].toUpperCase()+mode.slice(1)}`;
    const name=(global.RhythmUtil || {}).uniqueName ? global.RhythmUtil.uniqueName(base,existing) : `${base}_${Date.now()}`;
    const sequence=await createBaseSequence(project,name,clips[0]);
    await removeAllTimelineItems(project,sequence);
    const editor=p.SequenceEditor.getEditor(sequence);
    for(let i=0;i<plan.shots.length;i++){
      if(signal && signal.cancelled) throw new Error('Cancelled.');
      const shot=plan.shots[i], clip=clips[i];
      const at=p.TickTime.createWithFrameAndFrameRate ? p.TickTime.createWithSeconds(shot.timelineStartFrame/plan.fps) : p.TickTime.createWithSeconds(shot.timelineStartFrame/plan.fps);
      const insert=editor.createOverwriteItemAction(clip.raw,at,0,999);
      actionTransaction(project,`RhythmLab: place ${clip.name}`,[insert]);
      const ti=await newestVideoItem(sequence);
      const srcIn=p.TickTime.createWithSeconds(shot.sourceInFrame/plan.fps);
      const srcOut=p.TickTime.createWithSeconds(shot.sourceOutFrame/plan.fps);
      const seqStart=p.TickTime.createWithSeconds(shot.timelineStartFrame/plan.fps);
      const seqEnd=p.TickTime.createWithSeconds(shot.timelineEndFrame/plan.fps);
      actionTransaction(project,`RhythmLab: trim ${clip.name}`,[ti.createSetInPointAction(srcIn),ti.createSetOutPointAction(srcOut),ti.createSetStartAction(seqStart),ti.createSetEndAction(seqEnd)]);
      if(onProgress) onProgress((i+1)/(plan.shots.length+1));
    }
    if(music){
      if(signal && signal.cancelled) throw new Error('Cancelled.');
      const at=p.TickTime.createWithSeconds(0);
      actionTransaction(project,'RhythmLab: place music',[editor.createOverwriteItemAction(music.raw,at,999,0)]);
      const ai=await newestAudioItem(sequence);
      if(ai){
        const end=p.TickTime.createWithSeconds(plan.targetFrames/plan.fps);
        actionTransaction(project,'RhythmLab: trim music',[ai.createSetStartAction(at),ai.createSetEndAction(end)]);
      }
    }
    await project.openSequence(sequence);
    if(onProgress) onProgress(1);
    return {name,guid:sequence.guid};
  }

  global.RhythmHost={getSelectedItems,generateSequence,activeProject};
  if(typeof module!=='undefined') module.exports=global.RhythmHost;
})(typeof globalThis!=='undefined'?globalThis:this);
