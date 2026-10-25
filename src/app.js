// @ts-check
import { createRecorder } from './recorder.js';
import { ERROR_MESSAGES, demoTip, promptAt } from './content.js';

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @param {new () => T} type
 * @returns {T}
 */
function el(id, type) {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Missing #${id}`);
  return node;
}

const promptText = el('prompt-text', HTMLElement);
const nextButton = el('next-prompt', HTMLButtonElement);
const recordButton = el('record', HTMLButtonElement);
const stopButton = el('stop', HTMLButtonElement);
const discardButton = el('discard', HTMLButtonElement);
const statusText = el('status', HTMLElement);
const errorText = el('error', HTMLElement);
const timerText = el('timer', HTMLElement);
const player = el('player', HTMLAudioElement);
const playbackSection = el('playback', HTMLElement);
const tipLabel = el('tip-label', HTMLElement);
const tipText = el('tip-text', HTMLElement);

let promptIndex = 0;
/** @type {ReturnType<typeof setInterval> | null} */
let ticker = null;
let startedAt = 0;
let playbackFailed = false;

const recorder = createRecorder({
  mediaDevices: navigator.mediaDevices,
  MediaRecorderCtor: typeof MediaRecorder === 'function' ? MediaRecorder : undefined,
  url: URL,
  isSecureContext: window.isSecureContext,
  onChange: render,
});

function showPrompt() {
  promptText.textContent = promptAt(promptIndex).text;
}

function stopTicker() {
  if (ticker !== null) clearInterval(ticker);
  ticker = null;
}

/** @param {import('./recorder.js').RecorderSnapshot} snap */
function render(snap) {
  const busy = snap.state === 'requesting' || snap.state === 'recording';
  recordButton.disabled = busy;
  recordButton.textContent = snap.state === 'idle' ? 'Record' : 'Record again';
  stopButton.disabled = snap.state !== 'recording';
  discardButton.disabled = snap.state !== 'recorded' && snap.state !== 'error';
  nextButton.disabled = busy;
  document.body.dataset.state = snap.state;

  if (snap.state === 'recording') {
    if (ticker === null) {
      startedAt = Date.now();
      timerText.textContent = '0:00';
      ticker = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        timerText.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      }, 250);
    }
  } else {
    stopTicker();
  }

  statusText.textContent = {
    idle: 'Ready. Read the sentence aloud after pressing Record.',
    requesting: 'Waiting for microphone permission…',
    recording: 'Recording… press Stop when you finish.',
    recorded: 'Recorded. Listen back, then record again or discard.',
    error: 'Something went wrong.',
  }[snap.state];
  errorText.textContent = snap.error ? ERROR_MESSAGES[snap.error] : '';

  if (snap.state === 'recorded' && snap.audioUrl) {
    playbackFailed = false;
    if (player.src !== snap.audioUrl) player.src = snap.audioUrl;
    playbackSection.hidden = false;
    const tip = demoTip(promptAt(promptIndex));
    tipLabel.textContent = tip.label;
    tipText.textContent = tip.text;
  } else {
    player.pause();
    player.removeAttribute('src');
    player.load();
    playbackSection.hidden = true;
  }
}

player.addEventListener('error', () => {
  // Ignore the error fired by clearing src; only report a failed take.
  if (!player.getAttribute('src') || playbackFailed) return;
  playbackFailed = true;
  errorText.textContent = ERROR_MESSAGES['playback-failed'];
});

recordButton.addEventListener('click', () => void recorder.start());
stopButton.addEventListener('click', () => recorder.stop());
discardButton.addEventListener('click', () => recorder.discard());
nextButton.addEventListener('click', () => {
  promptIndex += 1;
  recorder.discard();
  showPrompt();
});

// Leaving or hiding the page mid-take abandons it; nothing is kept or uploaded.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') recorder.interrupt();
});
window.addEventListener('pagehide', () => {
  stopTicker();
  recorder.dispose();
});

showPrompt();
if (!recorder.isSupported() || !window.isSecureContext) {
  void recorder.start(); // Reports unsupported/insecure context immediately, never prompts.
} else {
  render(recorder.snapshot());
}
