import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { SpeciesService } from './species.service';

function createSpeciesService(options?: {
  configured?: boolean;
  listSpecies?: () => Promise<unknown[]>;
  getBySpeciesRef?: (speciesRef: string) => Promise<unknown>;
}) {
  return new SpeciesService(
    {
      recordEvent: async () => {},
    } as never,
    {
      getSession: async () => ({ session: null }),
    } as never,
    {
      getBySpeciesRef:
        options?.getBySpeciesRef
        ?? (async () => {
          throw new Error('not used in this test');
        }),
      isConfigured: () => options?.configured ?? true,
      listSpecies:
        options?.listSpecies
        ?? (async () => {
          throw new Error('not used in this test');
        }),
      mapRecordToDetail: () => {
        throw new Error('not used in this test');
      },
      mapRecordToRow: () => {
        throw new Error('not used in this test');
      },
    } as never,
  );
}

test('listSpecies returns an empty structured state when Bakki Core connectivity fails', async () => {
  const service = createSpeciesService({
    listSpecies: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    },
  });

  const species = await service.listSpecies();

  assert.deepEqual(species, []);
});

test('listSpecies returns an empty structured state when Bakki Core is not configured', async () => {
  const service = createSpeciesService({
    configured: false,
  });

  const species = await service.listSpecies();

  assert.deepEqual(species, []);
});

test('getDetail translates Bakki Core connectivity failures into a preview-friendly service error', async () => {
  const service = createSpeciesService({
    getBySpeciesRef: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    },
  });

  await assert.rejects(
    () => service.getDetail('downy-birch'),
    (error: unknown) =>
      error instanceof ServiceUnavailableException
      && error.message === 'Bakki Core species detail is currently unavailable.',
  );
});
