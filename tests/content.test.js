// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_LABEL, ERROR_MESSAGES, PROMPTS, demoTip, promptAt } from '../src/content.js';

test('every prompt has a labelled demo tip that does not take audio', () => {
  assert.equal(demoTip.length, 1, 'demoTip only accepts the prompt, never audio');
  for (const prompt of PROMPTS) {
    const tip = demoTip(prompt);
    assert.equal(tip.label, DEMO_LABEL);
    assert.match(tip.label, /^Demo tip/);
    assert.match(tip.label, /not an analysis of your recording/);
    assert.ok(tip.text.length > 0);
  }
});

test('demo tips avoid claiming detected pronunciation errors', () => {
  for (const prompt of PROMPTS) {
    assert.doesNotMatch(demoTip(prompt).text, /\byou (said|mispronounced|made)\b|\bscore\b|\berror\b/i);
  }
});

test('promptAt wraps in both directions', () => {
  assert.equal(promptAt(0), PROMPTS[0]);
  assert.equal(promptAt(PROMPTS.length), PROMPTS[0]);
  assert.equal(promptAt(-1), PROMPTS[PROMPTS.length - 1]);
});

test('prompt ids are unique', () => {
  assert.equal(new Set(PROMPTS.map((p) => p.id)).size, PROMPTS.length);
});

test('every error code has a recovery message', () => {
  const codes = [
    'unsupported', 'insecure-context', 'permission-denied', 'no-microphone', 'device-busy',
    'start-failed', 'interrupted', 'empty-recording', 'playback-failed',
  ];
  assert.deepEqual(Object.keys(ERROR_MESSAGES).sort(), [...codes].sort());
  for (const code of codes) {
    assert.ok(/** @type {Record<string, string>} */ (ERROR_MESSAGES)[code]?.trim());
  }
});
