# Architecture

RhythmLab intentionally separates deterministic edit planning from Premiere host mutation.

- `planner.js`: pure frame-domain planning and invariants.
- `wav.js`: dependency-free PCM 16-bit WAV parser.
- `beat-analysis.js`: lightweight onset-envelope/autocorrelation estimator.
- `host-premiere.js`: the only module that calls `require("premierepro")`.
- `ui.js`: panel state, preview, validation, cancellation, and partial-output reporting.

## Editing model
All calculations happen in integer frames. A generated plan contains ordered shots with source and timeline frame ranges. The planner verifies that every selected excerpt is used once, no shot exceeds its selected source range, adjacent timeline ranges are contiguous, and the final end frame equals the requested target duration.

## Host mutation strategy
A new uniquely named sequence is created for each mode. Timeline edits are added through Premiere's undoable transaction API. Source project items are not renamed, moved, deleted, speed-changed or permanently trimmed by RhythmLab.
