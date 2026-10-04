import assert from 'node:assert/strict';
import test from 'node:test';
import { isSwEntryPending } from '../src/helper/swtrack-pending.js';

test('legacy read-only stories are not backfilled when reactions are enabled', () => {
  assert.equal(isSwEntryPending({ read: true, reacted: false }, true), false);
});

test('a read story retries its reaction only when the entry recorded that expectation', () => {
  assert.equal(isSwEntryPending({ read: true, reacted: false, reactionExpected: false }, true), false);
  assert.equal(isSwEntryPending({ read: true, reacted: false, reactionExpected: true }, true), true);
});

test('reaction retry pauses in Read Only mode, while unread stories remain retryable', () => {
  assert.equal(isSwEntryPending({ read: true, reacted: false, reactionExpected: true }, false), false);
  assert.equal(isSwEntryPending({ read: false, reacted: false, reactionExpected: false }, false), true);
});

test('completed and deleted stories are never pending', () => {
  assert.equal(isSwEntryPending({ read: true, reacted: true, reactionExpected: true }, true), false);
  assert.equal(isSwEntryPending({ read: false, reacted: false, deleted: true }, true), false);
});