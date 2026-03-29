import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { invalidateQueryKeys } from './query-invalidation';

test('invalidateQueryKeys forwards every query key to react-query invalidation', async () => {
  const calls: QueryKey[] = [];
  const queryClient = {
    invalidateQueries: async ({ queryKey }: { queryKey: QueryKey }) => {
      calls.push(queryKey);
    },
  } as unknown as QueryClient;

  const queryKeys = [
    ['dashboard-summary'],
    ['media', 'observation-photos', 'obs-7'],
  ] satisfies QueryKey[];

  await invalidateQueryKeys(queryClient, queryKeys);

  assert.deepEqual(calls, queryKeys);
});
