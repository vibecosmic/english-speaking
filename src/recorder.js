// @ts-check
/**
 * Memory-only microphone recording session.
 *
 * Browser APIs are injected so the lifecycle and every error path can be tested
 * deterministically without a real microphone. Audio never leaves this module
 * except as an in-memory Blob and a revocable object URL for local playback.
 */

/** @typedef {'idle' | 'requesting' | 'recording' | 'recorded' | 'error'} RecorderState */

/**
 * @typedef {'unsupported' | 'insecure-context' | 'permission-denied' | 'no-microphone'
 *   | 'device-busy' | 'start-failed' | 'interrupted' | 'empty-recording'} RecorderErrorCode
 */

/**
 * @typedef {object} RecorderSnapshot
 * @property {RecorderState} state
 * @property {RecorderErrorCode | null} error
 * @property {string | null} audioUrl
 * @property {number} sizeBytes
 * @property {string} mimeType
 */

/**
 * @typedef {object} UrlApi
 * @property {(blob: Blob) => string} createObjectURL
 * @property {(url: string) => void} revokeObjectURL
 */

/**
 * @typedef {object} RecorderDeps
 * @property {Pick<MediaDevices, 'getUserMedia'> | undefined} mediaDevices
 * @property {typeof MediaRecorder | undefined} MediaRecorderCtor
 * @property {UrlApi} url
 * @property {boolean} [isSecureContext]
 * @property {(snapshot: RecorderSnapshot) => void} [onChange]
 * @property {number} [maxDurationMs]
 * @property {(fn: () => void, ms: number) => unknown} [setTimer]
 * @property {(handle: unknown) => void} [clearTimer]
 */

export const DEFAULT_MAX_DURATION_MS = 60_000;

/**
 * Map a getUserMedia rejection to a recoverable, user-explainable error code.
 * @param {unknown} err
 * @returns {RecorderErrorCode}
 */
export function classifyStartError(err) {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'permission-denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
    case 'DevicesNotFoundError':
      return 'no-microphone';
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError':
      return 'device-busy';
    default:
      return 'start-failed';
  }
}

/**
 * @param {RecorderDeps} deps
 */
export function createRecorder(deps) {
  const maxDurationMs = deps.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer =
    deps.clearTimer ?? ((handle) => clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (handle)));

  /** @type {RecorderState} */
  let state = 'idle';
  /** @type {RecorderErrorCode | null} */
  let error = null;
  /** @type {string | null} */
  let audioUrl = null;
  let sizeBytes = 0;
  let mimeType = '';
  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {MediaRecorder | null} */
  let recorder = null;
  /** @type {Blob[]} */
  let chunks = [];
  /** @type {unknown} */
  let timer = null;
  /** Incremented on every start/discard/dispose so stale async callbacks are ignored. */
  let generation = 0;
  let disposed = false;

  /** @returns {RecorderSnapshot} */
  function snapshot() {
    return { state, error, audioUrl, sizeBytes, mimeType };
  }

  function emit() {
    deps.onChange?.(snapshot());
  }

  function clearTimerIfAny() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function releaseStream() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
  }

  function revokeAudio() {
    if (audioUrl !== null) {
      deps.url.revokeObjectURL(audioUrl);
      audioUrl = null;
    }
    sizeBytes = 0;
    mimeType = '';
  }

  function detachRecorder() {
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Already stopping; handlers are detached so nothing is kept.
        }
      }
      recorder = null;
    }
    chunks = [];
  }

  /** @param {RecorderErrorCode} code */
  function fail(code) {
    clearTimerIfAny();
    detachRecorder();
    releaseStream();
    revokeAudio();
    state = 'error';
    error = code;
    emit();
  }

  /** @param {number} gen */
  function finalize(gen) {
    if (gen !== generation) return;
    clearTimerIfAny();
    const parts = chunks;
    const type = recorder?.mimeType || parts[0]?.type || '';
    recorder = null;
    chunks = [];
    releaseStream();
    const blob = new Blob(parts, type ? { type } : undefined);
    if (blob.size === 0) {
      state = 'error';
      error = 'empty-recording';
      emit();
      return;
    }
    audioUrl = deps.url.createObjectURL(blob);
    sizeBytes = blob.size;
    mimeType = blob.type;
    state = 'recorded';
    error = null;
    emit();
  }

  function isSupported() {
    return (
      typeof deps.mediaDevices?.getUserMedia === 'function' &&
      typeof deps.MediaRecorderCtor === 'function'
    );
  }

  async function start() {
    if (disposed) return;
    if (state === 'requesting' || state === 'recording') return;
    clearTimerIfAny();
    detachRecorder();
    releaseStream();
    revokeAudio();
    error = null;
    const gen = ++generation;

    if (deps.isSecureContext === false) {
      fail('insecure-context');
      return;
    }
    if (!isSupported()) {
      fail('unsupported');
      return;
    }

    state = 'requesting';
    emit();

    /** @type {MediaStream} */
    let acquired;
    try {
      acquired = await /** @type {Pick<MediaDevices, 'getUserMedia'>} */ (
        deps.mediaDevices
      ).getUserMedia({ audio: true });
    } catch (err) {
      if (gen === generation) fail(classifyStartError(err));
      return;
    }
    if (gen !== generation || disposed) {
      // Discarded or disposed while the permission prompt was open.
      for (const track of acquired.getTracks()) track.stop();
      return;
    }
    stream = acquired;

    try {
      const Ctor = /** @type {typeof MediaRecorder} */ (deps.MediaRecorderCtor);
      recorder = new Ctor(acquired);
    } catch {
      fail('start-failed');
      return;
    }

    const active = recorder;
    active.ondataavailable = (event) => {
      if (gen === generation && event.data && event.data.size > 0) chunks.push(event.data);
    };
    active.onstop = () => finalize(gen);
    active.onerror = () => {
      if (gen === generation) fail('interrupted');
    };
    for (const track of acquired.getTracks()) {
      track.addEventListener('ended', () => {
        // Device unplugged or permission revoked mid-recording.
        if (gen === generation && state === 'recording') fail('interrupted');
      });
    }

    try {
      active.start();
    } catch {
      fail('start-failed');
      return;
    }
    state = 'recording';
    emit();
    timer = setTimer(() => {
      timer = null;
      if (gen === generation && state === 'recording') stop();
    }, maxDurationMs);
  }

  function stop() {
    if (state !== 'recording' || !recorder) return;
    clearTimerIfAny();
    try {
      recorder.stop();
    } catch {
      fail('interrupted');
    }
  }

  /** Abandon the current take without keeping any audio. */
  function interrupt() {
    if (state === 'recording' || state === 'requesting') {
      generation++;
      fail('interrupted');
    }
  }

  /** Remove the current take or error and return to idle so the learner can retry. */
  function discard() {
    generation++;
    clearTimerIfAny();
    detachRecorder();
    releaseStream();
    revokeAudio();
    state = 'idle';
    error = null;
    emit();
  }

  /** Release every resource; the instance cannot be reused. */
  function dispose() {
    disposed = true;
    generation++;
    clearTimerIfAny();
    detachRecorder();
    releaseStream();
    revokeAudio();
    state = 'idle';
    error = null;
  }

  return { start, stop, discard, interrupt, dispose, snapshot, isSupported };
}
