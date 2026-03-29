import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTH_SESSION_QUERY_KEY,
  MEDIA_STATUS_QUERY_KEY,
  buildObservationPhotosQueryKey,
} from './query-keys';

test('auth session query key stays stable', () => {
  assert.deepEqual(AUTH_SESSION_QUERY_KEY, ['auth', 'session']);
});

test('media status query key stays stable', () => {
  assert.deepEqual(MEDIA_STATUS_QUERY_KEY, ['media', 'status']);
});

test('observation photos query key keeps the observation id in the third segment', () => {
  assert.deepEqual(buildObservationPhotosQueryKey('observation-7'), [
    'media',
    'observation-photos',
    'observation-7',
  ]);
  assert.deepEqual(buildObservationPhotosQueryKey(null), [
    'media',
    'observation-photos',
    null,
  ]);
});
