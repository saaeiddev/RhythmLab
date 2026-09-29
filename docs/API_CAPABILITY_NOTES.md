# Premiere UXP capability notes

Target: Adobe Premiere Pro 26.2.2 on Windows 11.

RhythmLab 0.2.0 uses Premiere UXP APIs introduced in the 25.6 generation and available in 26.2.x: active project access, ProjectUtils selection, sequence creation from media, SequenceEditor overwrite/remove actions, track item trimming and project transactions.

## Known MVP limitations
- Automatic music analysis is intentionally limited to PCM 16-bit WAV. Other formats use Manual BPM.
- The hard requirement "use every excerpt exactly once" fixes the number of cuts across Calm/Beat/Build. The modes therefore differ in duration distribution and Beat alignment, not in cut count.
- Project-panel selection ordering is treated as the desired source order. Reorder the selection/source list before generation if needed.
- Host API behavior is verified against current Adobe documentation and static tests, but sequence generation/playback still requires real-host validation in Premiere Pro 26.2.2.
- No AI model, cloud login, network service, optical flow, transitions, or speed changes are used.
