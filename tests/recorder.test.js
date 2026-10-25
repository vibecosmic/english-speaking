// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyStartError, createRecorder } from '../src/recorder.js';

class FakeTrack extends EventTarget {
  stopped = false;
  stop() {
    this.stopped = true;
  }
  end() {
    this.dispatchEvent(new Event('ended'));
  }
}

class FakeStream {
  constructor() {
    this.tracks = [new FakeTrack()];
  }
  getTracks() {
    return this.tracks;
  }
}

/** Minimal MediaRecorder double; each test drives data/stop events explicitly. */
class FakeMediaRecorder {
  /** @type {FakeMediaRecorder[]} */
  static instances = [];
  static throwOnConstruct = false;
  static throwOnStart = false;
  /** @param {FakeStream} stream */
  constructor(stream) {
    if (FakeMediaRecorder.throwOnConstruct) throw new Error('NotSupportedError');
    this.stream = stream;
    this.state = 'inactive';
    this.mimeType = 'audio/webm';
    /** @type {((e: {data: Blob}) => void) | null} */
    this.ondataavailable = null;
    /** @type {(() => void) | null} */
    this.onstop = null;
    /** @type {(() => void) | null} */
    this.onerror = null;
    this.stopCalls = 0;
    FakeMediaRecorder.instances.push(this);
  }
  start() {
    if (FakeMediaRecorder.throwOnStart) throw new Error('InvalidStateError');
    this.state = 'recording';
  }
  stop() {
    this.stopCalls += 1;
    this.state = 'inactive';
  }
  /** @param {number} bytes */
  emitData(bytes) {
    this.ondataavailable?.({ data: new Blob([new Uint8Array(bytes)], { type: 'audio/webm' }) });
  }
  finish() {
    this.onstop?.();
  }
  fail() {
    this.onerror?.();
  }
}

function setup(/** @type {Record<string, unknown>} */ overrides = {}) {
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.throwOnConstruct = false;
  FakeMediaRecorder.throwOnStart = false;
  /** @type {FakeStream[]} */
  const streams = [];
  /** @type {string[]} */
  const created = [];
  /** @type {string[]} */
  const revoked = [];
  /** @type {Array<{fn: () => void, ms: number, cleared: boolean}>} */
  const timers = [];
  /** @type {import('../src/recorder.js').RecorderSnapshot[]} */
  const changes = [];
  /** @type {(value?: unknown) => void} */
  let resolvePermission = () => {};
  /** @type {(reason?: unknown) => void} */
  let rejectPermission = () => {};
  const mode = overrides.permission ?? 'grant';
  const mediaDevices = {
    getUserMedia: () =>
      new Promise((resolve, reject) => {
        const stream = new FakeStream();
        streams.push(stream);
        resolvePermission = () => resolve(stream);
        rejectPermission = reject;
        if (mode === 'grant') resolve(stream);
        else if (mode !== 'pending') reject(mode);
      }),
  };
  let counter = 0;
  const recorder = createRecorder(
    /** @type {any} */ ({
      mediaDevices,
      MediaRecorderCtor: FakeMediaRecorder,
      url: {
        createObjectURL: () => {
          const url = `blob:test/${++counter}`;
          created.push(url);
          return url;
        },
        revokeObjectURL: (/** @type {string} */ url) => revoked.push(url),
      },
      isSecureContext: true,
      maxDurationMs: 5000,
      setTimer: (/** @type {() => void} */ fn, /** @type {number} */ ms) => {
        const t = { fn, ms, cleared: false };
        timers.push(t);
        return t;
      },
      clearTimer: (/** @type {{cleared: boolean}} */ t) => {
        t.cleared = true;
      },
      onChange: (/** @type {any} */ s) => changes.push(s),
      ...overrides,
    }),
  );
  return {
    recorder,
    streams,
    created,
    revoked,
    timers,
    changes,
    grant: () => resolvePermission(),
    deny: (/** @type {unknown} */ e) => rejectPermission(e),
    last: () => FakeMediaRecorder.instances.at(-1),
  };
}

const tracksStopped = (/** @type {FakeStream} */ s) => s.tracks.every((t) => t.stopped);

test('happy path: record, stop, playback URL, discard revokes and releases', async () => {
  const h = setup();
  await h.recorder.start();
  assert.equal(h.recorder.snapshot().state, 'recording');
  assert.deepEqual(
    h.changes.map((c) => c.state),
    ['requesting', 'recording'],
  );
  const rec = h.last();
  assert.ok(rec);
  rec.emitData(10);
  rec.emitData(0); // empty chunks are ignored
  rec.emitData(5);
  h.recorder.stop();
  assert.equal(rec.stopCalls, 1);
  rec.finish();
  const snap = h.recorder.snapshot();
  assert.equal(snap.state, 'recorded');
  assert.equal(snap.sizeBytes, 15);
  assert.equal(snap.mimeType, 'audio/webm');
  assert.equal(snap.audioUrl, 'blob:test/1');
  assert.ok(tracksStopped(h.streams[0]), 'microphone released after stop');

  h.recorder.discard();
  assert.equal(h.recorder.snapshot().state, 'idle');
  assert.equal(h.recorder.snapshot().audioUrl, null);
  assert.deepEqual(h.revoked, ['blob:test/1']);
});

test('retry replaces the previous take and revokes its URL', async () => {
  const h = setup();
  await h.recorder.start();
  h.last()?.emitData(4);
  h.recorder.stop();
  h.last()?.finish();
  assert.equal(h.recorder.snapshot().audioUrl, 'blob:test/1');

  await h.recorder.start();
  assert.deepEqual(h.revoked, ['blob:test/1']);
  assert.equal(h.recorder.snapshot().state, 'recording');
  h.last()?.emitData(6);
  h.recorder.stop();
  h.last()?.finish();
  assert.equal(h.recorder.snapshot().audioUrl, 'blob:test/2');
  assert.equal(h.recorder.snapshot().sizeBytes, 6);
});

test('empty recording is reported, not presented as playable audio', async () => {
  const h = setup();
  await h.recorder.start();
  h.recorder.stop();
  h.last()?.finish();
  const snap = h.recorder.snapshot();
  assert.equal(snap.state, 'error');
  assert.equal(snap.error, 'empty-recording');
  assert.equal(snap.audioUrl, null);
  assert.equal(h.created.length, 0);
  assert.ok(tracksStopped(h.streams[0]));
});

for (const [name, code] of /** @type {const} */ ([
  ['NotAllowedError', 'permission-denied'],
  ['SecurityError', 'permission-denied'],
  ['NotFoundError', 'no-microphone'],
  ['OverconstrainedError', 'no-microphone'],
  ['NotReadableError', 'device-busy'],
  ['AbortError', 'device-busy'],
  ['TypeError', 'start-failed'],
])) {
  test(`getUserMedia ${name} maps to ${code} and allows retry`, async () => {
    const h = setup({ permission: { name } });
    await h.recorder.start();
    assert.equal(h.recorder.snapshot().state, 'error');
    assert.equal(h.recorder.snapshot().error, code);
    assert.equal(h.last(), undefined, 'no recorder constructed');
    h.recorder.discard();
    assert.equal(h.recorder.snapshot().state, 'idle');
  });
}

test('classifyStartError tolerates non-object rejections', () => {
  assert.equal(classifyStartError(undefined), 'start-failed');
  assert.equal(classifyStartError('NotAllowedError'), 'start-failed');
});

test('missing recording API reports unsupported without prompting', async () => {
  let prompted = false;
  const h = setup({
    MediaRecorderCtor: undefined,
    mediaDevices: { getUserMedia: () => ((prompted = true), Promise.reject(new Error('x'))) },
  });
  assert.equal(h.recorder.isSupported(), false);
  await h.recorder.start();
  assert.equal(h.recorder.snapshot().error, 'unsupported');
  assert.equal(prompted, false);
});

test('missing mediaDevices reports unsupported', async () => {
  const h = setup({ mediaDevices: undefined });
  await h.recorder.start();
  assert.equal(h.recorder.snapshot().error, 'unsupported');
});

test('insecure context is reported before any permission request', async () => {
  const h = setup({ isSecureContext: false });
  await h.recorder.start();
  assert.equal(h.recorder.snapshot().error, 'insecure-context');
  assert.equal(h.streams.length, 0);
});

test('MediaRecorder construction failure releases the microphone', async () => {
  const h = setup();
  FakeMediaRecorder.throwOnConstruct = true;
  await h.recorder.start();
  assert.equal(h.recorder.snapshot().error, 'start-failed');
  assert.ok(tracksStopped(h.streams[0]));
});

test('MediaRecorder start failure releases the microphone', async () => {
  const h = setup();
  FakeMediaRecorder.throwOnStart = true;
  await h.recorder.start();
  assert.equal(h.recorder.snapshot().error, 'start-failed');
  assert.ok(tracksStopped(h.streams[0]));
});

test('recorder error mid-take discards audio and releases tracks', async () => {
  const h = setup();
  await h.recorder.start();
  const rec = h.last();
  rec?.emitData(8);
  rec?.fail();
  const snap = h.recorder.snapshot();
  assert.equal(snap.error, 'interrupted');
  assert.equal(snap.audioUrl, null);
  assert.ok(tracksStopped(h.streams[0]));
  rec?.finish(); // a late stop event must not resurrect the take
  assert.equal(h.recorder.snapshot().state, 'error');
  assert.equal(h.created.length, 0);
});

test('track ending (device removed / permission revoked) interrupts the take', async () => {
  const h = setup();
  await h.recorder.start();
  h.last()?.emitData(3);
  h.streams[0]?.tracks[0]?.end();
  assert.equal(h.recorder.snapshot().error, 'interrupted');
  assert.equal(h.last()?.state, 'inactive');
  assert.ok(tracksStopped(h.streams[0]));
});

test('interrupt() (page hidden) abandons the take without keeping audio', async () => {
  const h = setup();
  await h.recorder.start();
  h.last()?.emitData(3);
  h.recorder.interrupt();
  assert.equal(h.recorder.snapshot().error, 'interrupted');
  h.last()?.finish();
  assert.equal(h.created.length, 0);
  assert.ok(tracksStopped(h.streams[0]));
});

test('interrupt() is a no-op when idle or already recorded', async () => {
  const h = setup();
  h.recorder.interrupt();
  assert.equal(h.recorder.snapshot().state, 'idle');
  await h.recorder.start();
  h.last()?.emitData(2);
  h.recorder.stop();
  h.last()?.finish();
  h.recorder.interrupt();
  assert.equal(h.recorder.snapshot().state, 'recorded');
});

test('max duration auto-stops the recording', async () => {
  const h = setup();
  await h.recorder.start();
  assert.equal(h.timers.length, 1);
  assert.equal(h.timers[0]?.ms, 5000);
  h.last()?.emitData(7);
  h.timers[0]?.fn();
  assert.equal(h.last()?.stopCalls, 1);
  h.last()?.finish();
  assert.equal(h.recorder.snapshot().state, 'recorded');
});

test('manual stop clears the max-duration timer', async () => {
  const h = setup();
  await h.recorder.start();
  h.recorder.stop();
  assert.equal(h.timers[0]?.cleared, true);
});

test('discard while permission prompt is open stops the late stream', async () => {
  const h = setup({ permission: 'pending' });
  const pending = h.recorder.start();
  assert.equal(h.recorder.snapshot().state, 'requesting');
  h.recorder.discard();
  h.grant();
  await pending;
  assert.equal(h.recorder.snapshot().state, 'idle');
  assert.equal(h.last(), undefined);
  assert.ok(tracksStopped(h.streams[0]), 'late stream released immediately');
});

test('late permission denial after discard does not show an error', async () => {
  const h = setup({ permission: 'pending' });
  const pending = h.recorder.start();
  h.recorder.discard();
  h.deny({ name: 'NotAllowedError' });
  await pending;
  assert.equal(h.recorder.snapshot().state, 'idle');
  assert.equal(h.recorder.snapshot().error, null);
});

test('start is ignored while already requesting or recording', async () => {
  const h = setup({ permission: 'pending' });
  const first = h.recorder.start();
  await h.recorder.start();
  assert.equal(h.streams.length, 1);
  h.grant();
  await first;
  await h.recorder.start();
  assert.equal(h.streams.length, 1);
  assert.equal(FakeMediaRecorder.instances.length, 1);
});

test('dispose releases tracks and URL and blocks reuse', async () => {
  const h = setup();
  await h.recorder.start();
  h.last()?.emitData(2);
  h.recorder.stop();
  h.last()?.finish();
  await h.recorder.start();
  h.recorder.dispose();
  assert.ok(h.streams.every(tracksStopped));
  assert.deepEqual(h.revoked, ['blob:test/1']);
  await h.recorder.start();
  assert.equal(h.streams.length, 2, 'no new microphone request after dispose');
});

test('dispose of a recorded take revokes its object URL', async () => {
  const h = setup();
  await h.recorder.start();
  h.last()?.emitData(2);
  h.recorder.stop();
  h.last()?.finish();
  h.recorder.dispose();
  assert.deepEqual(h.revoked, ['blob:test/1']);
});
