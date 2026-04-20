import { queryOptions, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

export { createApiClient } from '@archon-research/http-client-core';
export type { JsonSchema } from '@archon-research/http-client-core';

export const createQueryClient = () => new QueryClient();

const defaultQueryClient = createQueryClient();

export type HttpProviderProps = PropsWithChildren<{
  client?: QueryClient;
}>;

export function HttpProvider({ client, children }: HttpProviderProps) {
  return (
    <QueryClientProvider client={client ?? defaultQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function createQueryOptions<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
) {
  return queryOptions({ queryKey, queryFn });
}
