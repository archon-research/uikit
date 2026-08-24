import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { createQueryClient, createQueryOptions } from './index.js';

describe('createQueryOptions (deprecated shim)', () => {
  it('still produces options a QueryClient can fetch', async () => {
    const queryClient = createQueryClient();

    expect(queryClient).toBeInstanceOf(QueryClient);
    await expect(
      queryClient.fetchQuery(
        createQueryOptions(['legacy', 'users'], () =>
          Promise.resolve([{ id: 'u1' }]),
        ),
      ),
    ).resolves.toEqual([{ id: 'u1' }]);
  });

  it('keeps the caller-supplied query key verbatim', () => {
    const options = createQueryOptions(['legacy', 'users', { page: 2 }], () =>
      Promise.resolve(null),
    );

    expect(options.queryKey).toEqual(['legacy', 'users', { page: 2 }]);
  });
});
