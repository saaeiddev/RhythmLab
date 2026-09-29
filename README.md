# RhythmLab — One Edit, Three Rhythms

**RhythmLab** is an Adobe Premiere Pro UXP plugin that turns one ordered set of video excerpts plus one music track into three editable rhythm variations:

- **Calm** — smooth, low-variance shot timing.
- **Beat** — cuts planned around a detected or manually entered BPM grid.
- **Build** — progressively shorter shots for rising pace.

**Created by Amir Saeid Dehghan**

## Target build

- RhythmLab: **0.2.0**
- Adobe Premiere Pro: **26.2.2** (Windows 11 target)
- UXP Manifest: **v5**
- Development install entry: `plugin/manifest.json`

## What it does

1. Reads the selected media items from Premiere's Project panel.
2. Keeps the footage order and lets you edit each source In/Out range.
3. Accepts a target duration and frame rate.
4. Creates deterministic frame-domain plans for Calm, Beat and Build.
5. Uses manual BPM for any music format, or optional automatic analysis for PCM 16-bit WAV.
6. Generates uniquely named Premiere sequences such as `RhythmLab_Calm`, `RhythmLab_Beat`, and `RhythmLab_Build`.
7. Reports cancellation or partial completion instead of silently failing.

## Core safety rules

RhythmLab's planner enforces these MVP invariants:

- preserve source order;
- use every selected excerpt exactly once;
- final duration equals the requested target to the frame;
- no timeline gaps or overlaps;
- no repeated footage;
- no speed changes;
- no shot exceeds its selected source handles;
- source audio is not intentionally used for the video excerpts;
- music is continuous from the beginning of the generated sequence;
- original media files are never modified.

## Installation — UXP Developer Tool

1. Open **Premiere Pro 26.2.2**.
2. Open **Adobe UXP Developer Tool**.
3. Choose **Add Plugin**.
4. Select `RhythmLab/plugin/manifest.json` (or `plugin/manifest.json` if you opened the repository root).
5. Click **Load**.
6. In Premiere, open **Window > UXP Plugins > RhythmLab**.

If the Developer Tool shows **Load Successful**, the panel registration succeeded.

## Usage

### 1. Select footage and music
Select the footage clips and one music item in Premiere's Project panel, then click **Refresh selection** in RhythmLab.

RhythmLab treats the selected footage list as the intended order. Review the list before generating.

### 2. Define source excerpts
Each footage item has editable **In** and **Out** values in seconds. These are the hard source boundaries the generated shot may use.

### 3. Set timing
Enter:

- **Target duration**
- **Frame rate**
- **Manual BPM**
- **First beat offset**

For PCM 16-bit WAV music, **Analyze selected WAV** can estimate BPM and first onset. For MP3/M4A/AAC/etc., use Manual BPM.

### 4. Preview modes
Switch between **Calm**, **Beat**, and **Build** to preview shot durations before any Premiere sequence is created.

### 5. Generate
Click **Generate all 3 sequences**. RhythmLab creates safe unique names if those sequence names already exist.

## Beat analysis

Automatic analysis is intentionally dependency-free and conservative:

- PCM 16-bit WAV only;
- RMS/onset envelope;
- autocorrelation BPM estimate;
- manual BPM remains the required fallback for unsupported or ambiguous material.

This is not a cloud AI service and requires no login or network request.

## Important MVP limitation

The specification requires **every excerpt to be used exactly once** in every version. That means Calm, Beat and Build necessarily have the same number of shots/cuts. The difference is the **distribution and alignment of shot durations**, not the cut count.

## Tests

Run:

```bash
npm test
```

Current result:

```text
30 passed, 0 failed
```

The test suite covers frame conversion, capped allocation, source-range safety, no-gap/no-overlap invariants, exact target length, all three modes, BPM validation, beat fallback, and synthetic 120 BPM click-track detection.

See `reports/TEST_REPORT.md` and `docs/TESTING.md`.

## Test media

`tests/assets/` includes:

- `click_120bpm.wav` — synthetic PCM 16-bit WAV click track;
- `test_clips_manifest.json` — deterministic fixture data;
- `video/test_clip_*.mp4` — tiny synthetic video fixtures when available in the packaged source.

These assets are generated specifically for this repository and contain no third-party copyrighted footage or music.

## Project structure

```text
RhythmLab/
├─ plugin/
│  ├─ manifest.json
│  ├─ index.html
│  ├─ index.js
│  ├─ styles.css
│  └─ src/
│     ├─ util.js
│     ├─ planner.js
│     ├─ wav.js
│     ├─ beat-analysis.js
│     ├─ host-premiere.js
│     └─ ui.js
├─ docs/
├─ tests/
│  ├─ run-tests.js
│  └─ assets/
├─ reports/TEST_REPORT.md
├─ tools/package.py
├─ package.json
├─ CHANGELOG.md
├─ LICENSE
└─ dist/RhythmLab-0.2.0-Premiere-26.2.2.zip
```

## Troubleshooting

### Plugin Load Failed
- Confirm you selected `plugin/manifest.json`.
- Confirm Premiere is 26.2.x or later.
- Enable UXP Developer Mode/debugging.
- Unload and reload after changing the manifest.

### Panel opens but selection is empty
Select actual media clips in Premiere's Project panel and press **Refresh selection** again. Bins and sequences are ignored.

### WAV analysis fails
Automatic analysis only supports PCM 16-bit WAV in this MVP. Enter BPM manually for compressed audio or other WAV encodings.

### Sequence generation fails after the panel loads
The planning layer may still be valid even if a particular Premiere host operation differs on the installed build. RhythmLab stops and reports the partial output rather than continuing blindly. See `docs/API_CAPABILITY_NOTES.md`.

## Validation status

- UXP panel load/display: previously confirmed on Premiere Pro 26.2.2 / Windows 11.
- Automated planning/analyzer tests: **30/30 passed**.
- Real Premiere sequence creation/playback: requires final in-host validation on the user's Premiere installation.

## License
MIT — see `LICENSE`.
