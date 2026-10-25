// @ts-check
/**
 * Synthetic practice prompts, demo tips and user-facing messages.
 * Everything here is generic example text; nothing describes a real learner.
 */

/**
 * @typedef {object} PracticePrompt
 * @property {string} id
 * @property {string} text
 * @property {string} focus  A generic reading focus, not a judgement of any recording.
 */

/** @type {readonly PracticePrompt[]} */
export const PROMPTS = Object.freeze([
  { id: 'p1', text: 'Good morning! Could I have a cup of tea, please?', focus: 'polite request' },
  { id: 'p2', text: 'My favourite season is autumn because the leaves turn red.', focus: 'linking words' },
  { id: 'p3', text: 'The library opens at nine and closes at six.', focus: 'numbers and times' },
  { id: 'p4', text: 'Excuse me, how do I get to the train station?', focus: 'question intonation' },
  { id: 'p5', text: 'Yesterday we walked to the park and fed the ducks.', focus: 'past tense endings' },
]);

/** @type {Readonly<Record<string, string>>} */
const DEMO_TIPS = Object.freeze({
  'polite request': 'Try letting your voice rise gently on "please" to sound friendly.',
  'linking words': 'Try pausing briefly before "because", then read the reason smoothly.',
  'numbers and times': 'Try saying "nine" and "six" a little more slowly and clearly.',
  'question intonation': 'Try a small rise at the end of the question.',
  'past tense endings': 'Try making the endings of "walked" and "fed" easy to hear.',
});

export const DEMO_LABEL = 'Demo tip — a general suggestion for this sentence, not an analysis of your recording.';

/**
 * Return a fixed, prompt-based practice suggestion. It intentionally takes no audio
 * input: the prototype performs no speech analysis and must not imply that it does.
 * @param {PracticePrompt} prompt
 * @returns {{ label: string, text: string }}
 */
export function demoTip(prompt) {
  return {
    label: DEMO_LABEL,
    text: DEMO_TIPS[prompt.focus] ?? 'Try reading the sentence once more at a comfortable pace.',
  };
}

/**
 * @param {number} index
 * @returns {PracticePrompt}
 */
export function promptAt(index) {
  const n = PROMPTS.length;
  return /** @type {PracticePrompt} */ (PROMPTS[((index % n) + n) % n]);
}

/** @type {Readonly<Record<import('./recorder.js').RecorderErrorCode | 'playback-failed', string>>} */
export const ERROR_MESSAGES = Object.freeze({
  unsupported:
    'This browser cannot record audio here. Try a current version of Chrome, Edge, Firefox or Safari.',
  'insecure-context':
    'Recording needs a secure page. Open the app over HTTPS or on localhost.',
  'permission-denied':
    'Microphone access was blocked. Allow the microphone in your browser settings, then try again.',
  'no-microphone': 'No microphone was found. Connect a microphone, then try again.',
  'device-busy':
    'The microphone could not be started. Close other apps that may be using it, then try again.',
  'start-failed': 'Recording could not start. Please try again.',
  interrupted: 'Recording was interrupted, so nothing was kept. Please try again.',
  'empty-recording': 'No audio data was captured. Check your microphone and record again.',
  'playback-failed':
    'This recording cannot be played back in this browser. Discard it and record again.',
});
