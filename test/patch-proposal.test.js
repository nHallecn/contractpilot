import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyReviewedPatch, PAYMENT_PATCH } from '../src/patch-proposal.js';

const source = await readFile(new URL('../examples/repair-lab/src/payment.mjs', import.meta.url), 'utf8');

test('reviewed patch changes a single known source revision', () => {
  const revised = applyReviewedPatch(source);
  assert.match(revised, /status: 201/);
  assert.doesNotMatch(revised, /status: 200/);
});

test('rejects source drift rather than guessing at a repair', () => {
  assert.throws(() => applyReviewedPatch(source + '\n'), /BASELINE_SHA_MISMATCH/);
});

test('rejects unapproved destination paths', () => {
  assert.throws(() => applyReviewedPatch(source, { ...PAYMENT_PATCH, path: '../../secrets' }), /Invalid patch proposal/);
});

test('rejects non-unique anchors', () => {
  assert.throws(() => applyReviewedPatch(source, { ...PAYMENT_PATCH, before: ' ', expectedSha256: PAYMENT_PATCH.expectedSha256 }), /PATCH_ANCHOR_NOT_UNIQUE/);
});
