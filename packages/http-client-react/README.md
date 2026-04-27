# @archon-research/http-client-react

React Query integration for @archon-research/http-client-core, providing hooks for data fetching and caching.

## Installation

```bash
npm install @archon-research/http-client-react @archon-research/http-client-core @tanstack/react-query react react-dom
```

## Features

- React Query hooks for HTTP client
- Automatic request/response validation
- Caching and synchronization
- Error handling and retry logic
- TypeScript support

## Usage

### Setup provider

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@archon-research/http-client-core';

const queryClient = new QueryClient();
const httpClient = createClient({ baseUrl: 'https://api.example.com' });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### Use hooks in components

```typescript
import { useQuery } from '@archon-research/http-client-react';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery(
    ['user', userId],
    () => httpClient.GET('/users/{id}', { params: { path: { id: userId } } })
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{data.name}</div>;
}
```

## Peer dependencies

- `react`: React components library
- `react-dom`: React DOM rendering
- `@tanstack/react-query`: Data fetching library

## See also

- [http-client-core](../http-client-core) for core client utilities
