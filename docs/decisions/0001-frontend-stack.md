# ADR 0001 · Zero-dependency native web stack for the recording prototype

Status: proposed with F001 (pending independent review).

## Context
F001 needs a lightweight, current, stable stack for a memory-only
prompt → record → stop → playback → discard/retry loop, with pinned dependencies,
a committed lockfile and CI build/lint/typecheck/tests. The prototype has one screen,
no routing, no backend calls and no shared state beyond one recording session.

## Decision
- Native browser platform only: ES modules, `MediaDevices.getUserMedia`,
  `MediaRecorder`, `Blob`/object URLs and `<audio>`. No UI framework or bundler.
- Plain JavaScript with JSDoc types and `// @ts-check`, type-checked by TypeScript
  (`strict`, `checkJs`, `noUncheckedIndexedAccess`) without a compile step.
- Tests use Node's built-in `node:test` runner. Browser APIs are injected into
  `createRecorder`, so lifecycle and error paths are tested with deterministic fakes.
- Build copies static files to `dist/`. A local-only Node static server binds to
  `127.0.0.1` for manual testing (localhost counts as a secure context for the mic).
- Zero runtime and zero installed dev dependencies; `package-lock.json` is committed
  and `npm ci` installs nothing. The TypeScript checker is pinned to an exact version
  (`typescript@6.0.3`) and fetched by `npx` in CI.
- A dependency-free lint script parses every module, rejects network, storage,
  `eval`/`innerHTML` APIs in `src/`, and requires the CSP to keep `connect-src 'none'`.

## Alternatives considered
- Vite + TypeScript, or a UI framework (React/Preact/Svelte): better ergonomics as the
  app grows, but adds a dependency tree for a single static screen. Revisit when a
  second screen, routing or backend integration arrives.
- ESLint: deferred; see consequences.

## Consequences
- Anyone can run the app and tests with only Node ≥ 20.11; nothing to install.
- The exact-version `npx` download of TypeScript is not integrity-locked by the lockfile.
  The authoring cloud environment had no npm registry access, so lockfile-locked dev
  dependencies (TypeScript, ESLint) could not be resolved honestly there. Follow-up:
  add them as exact devDependencies with a regenerated lockfile from an environment
  with registry access, then switch `typecheck` to the locked binary. Whether 6.0.3 is
  the newest stable TypeScript release was not verified from that environment.
- Playwright browser checks were run locally with a fake microphone but are not part of
  CI, to avoid an unpinned dependency. Physical-device verification remains F003.
