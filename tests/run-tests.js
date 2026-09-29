const assert = require('assert');
global.RhythmUtil = require('../plugin/src/util');
global.RhythmPlanner = require('../plugin/src/planner');
global.RhythmWav = require('../plugin/src/wav');
global.RhythmBeat = require('../plugin/src/beat-analysis');
const P=global.RhythmPlanner,U=global.RhythmUtil,B=global.RhythmBeat;
let passed=0, failed=0;
function test(name,fn){ try{fn(); console.log(`PASS ${String(passed+1).padStart(2,'0')} ${name}`); passed++;}catch(e){failed++;console.error(`FAIL ${name}\n  ${e.stack||e}`);} }
function clips(n,d=10){return Array.from({length:n},(_,i)=>({id:`c${i}`,name:`Clip ${i+1}`,inSeconds:0,outSeconds:d}));}
function noGaps(plan){for(let i=1;i<plan.shots.length;i++) assert.equal(plan.shots[i-1].timelineEndFrame,plan.shots[i].timelineStartFrame);}
function total(plan){return plan.shots.reduce((s,x)=>s+x.durationFrames,0);}

// 1-5 utilities/frame conversion
test('secondsToFrames rounds to nearest frame',()=>assert.equal(P.secondsToFrames(1.01,30),30));
test('framesToSeconds converts exactly',()=>assert.equal(P.framesToSeconds(75,25),3));
test('uniqueName keeps unused base',()=>assert.equal(U.uniqueName('A',['B']),'A'));
test('uniqueName increments suffix',()=>assert.equal(U.uniqueName('A',['A','A_2']),'A_3'));
test('allocateFrames exact total',()=>assert.equal(P.allocateFrames(100,[100,100],[1,1]).reduce((a,b)=>a+b,0),100));

// 6-10 allocation safety
test('allocateFrames enforces one frame minimum',()=>assert.deepEqual(P.allocateFrames(3,[10,10,10],[1,1,1]),[1,1,1]));
test('allocateFrames respects capacity',()=>{const a=P.allocateFrames(10,[2,20],[10,1]);assert(a[0]<=2);assert.equal(a[0]+a[1],10);});
test('allocateFrames rejects impossible short target',()=>assert.throws(()=>P.allocateFrames(2,[10,10,10],[1,1,1])));
test('allocateFrames rejects target beyond handles',()=>assert.throws(()=>P.allocateFrames(30,[5,5],[1,1])));
test('allocation deterministic',()=>assert.deepEqual(P.allocateFrames(47,[20,20,20],[1,2,3]),P.allocateFrames(47,[20,20,20],[1,2,3])));

// 11-16 Calm
test('Calm uses every clip once',()=>assert.equal(P.buildPlan({mode:'calm',clips:clips(4),targetSeconds:8,fps:30}).shots.length,4));
test('Calm exact target frames',()=>{const p=P.buildPlan({mode:'calm',clips:clips(4),targetSeconds:8,fps:30});assert.equal(total(p),240);});
test('Calm has no gaps/overlaps',()=>noGaps(P.buildPlan({mode:'calm',clips:clips(5),targetSeconds:9,fps:24})));
test('Calm stays inside source handles',()=>{const p=P.buildPlan({mode:'calm',clips:clips(3,2),targetSeconds:5,fps:30});p.shots.forEach(s=>assert(s.sourceOutFrame<=60));});
test('Calm preserves source order',()=>{const p=P.buildPlan({mode:'calm',clips:clips(3),targetSeconds:6,fps:30});assert.deepEqual(p.shots.map(s=>s.id),['c0','c1','c2']);});
test('Calm rejects invalid source range',()=>assert.throws(()=>P.buildPlan({mode:'calm',clips:[{inSeconds:2,outSeconds:1}],targetSeconds:1,fps:30})));

// 17-21 Build
test('Build exact target',()=>{const p=P.buildPlan({mode:'build',clips:clips(5),targetSeconds:10,fps:30});assert.equal(total(p),300);});
test('Build has no gaps',()=>noGaps(P.buildPlan({mode:'build',clips:clips(6),targetSeconds:12,fps:25})));
test('Build generally decreases shot length',()=>{const p=P.buildPlan({mode:'build',clips:clips(5),targetSeconds:10,fps:30});assert(p.shots[0].durationFrames>p.shots.at(-1).durationFrames);});
test('Build respects small last handle',()=>{const c=clips(4,10);c[3].outSeconds=.3;const p=P.buildPlan({mode:'build',clips:c,targetSeconds:6,fps:30});assert(p.shots[3].durationFrames<=9);});
test('Build preserves exact final end',()=>{const p=P.buildPlan({mode:'build',clips:clips(7),targetSeconds:13.2,fps:30});assert.equal(p.shots.at(-1).timelineEndFrame,p.targetFrames);});

// 22-27 Beat
test('Beat boundaries start at zero and end at target',()=>{const x=P.beatBoundaries(300,5,120,0,30);assert.equal(x.bounds[0],0);assert.equal(x.bounds.at(-1),300);});
test('Beat plan exact target',()=>{const p=P.buildPlan({mode:'beat',clips:clips(4),targetSeconds:8,fps:30,bpm:120,firstBeatSeconds:0});assert.equal(total(p),240);});
test('Beat plan has no gaps',()=>noGaps(P.buildPlan({mode:'beat',clips:clips(4),targetSeconds:8,fps:30,bpm:100,firstBeatSeconds:.1})));
test('Beat validates BPM low bound',()=>assert.throws(()=>P.buildPlan({mode:'beat',clips:clips(3),targetSeconds:6,fps:30,bpm:10,firstBeatSeconds:0})));
test('Beat validates BPM high bound',()=>assert.throws(()=>P.buildPlan({mode:'beat',clips:clips(3),targetSeconds:6,fps:30,bpm:500,firstBeatSeconds:0})));
test('Beat fallback remains handle-safe',()=>{const c=clips(3,10);c[1].outSeconds=.1;const p=P.buildPlan({mode:'beat',clips:c,targetSeconds:4,fps:30,bpm:120,firstBeatSeconds:0});assert(p.shots[1].durationFrames<=3);});

// 28-30 analyzer using generated click train in memory
function clickTrack(bpm=120,sr=48000,dur=10){const n=sr*dur,a=new Float32Array(n),step=Math.round(sr*60/bpm);for(let p=0;p<n;p+=step){for(let j=0;j<240&&p+j<n;j++)a[p+j]=1-j/240;}return a;}
test('Analyzer finds enough peaks',()=>assert(B.analyze(clickTrack(120),48000).peakCount>=3));
test('Analyzer estimates 120 BPM click track',()=>{const r=B.analyze(clickTrack(120),48000);assert(Math.abs(r.bpm-120)<=5,`got ${r.bpm}`);});
test('Analyzer rejects too-short audio',()=>assert.throws(()=>B.analyze(new Float32Array(1000),48000)));

console.log(`\n${passed} passed, ${failed} failed`);
if(failed) process.exit(1);
