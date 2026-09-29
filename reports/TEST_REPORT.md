# RhythmLab 0.2.0 — Test Report

Environment: local Node.js test runner, 2026-09-29.

- Automated tests: **30 passed / 0 failed**
- Planner invariants: passed
- Calm / Beat / Build deterministic planning: passed
- Exact target frame count: passed
- No gap / overlap checks: passed
- Source-handle bounds: passed
- Synthetic 120 BPM click-track analysis: passed
- Plugin JavaScript syntax checks: passed

## Host validation status
The panel previously reached **Load Successful** in Premiere Pro 26.2.2 on Windows 11. The pure planning/analyzer layer is covered by automated tests. Creation and playback of generated Premiere sequences still require real-host validation because the local test runner cannot instantiate the Premiere UXP DOM.
