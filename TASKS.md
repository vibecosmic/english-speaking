# Task queue

Executable work and current dependencies are in GitHub Issues. Roles claim when available.

- F001 Implement a browser recording/playback/discard/retry prototype, no backend calls.
- F002 Review microphone lifecycle, privacy, recovery and test evidence; held until F001 PR.
- F003 Record actual-device trial and experience evidence; held until a working preview
  and Human Operator scheduling. Do not claim a release or device test before it occurs.

F001 status: draft PR proposes a zero-dependency native web stack (ADR 0001) with
deterministic recorder tests; awaiting independent review (F002). Open follow-ups:
lockfile-locked TypeScript/ESLint dev dependencies once registry access is available,
and physical-device verification (F003). Backend/framework extraction is separate.
