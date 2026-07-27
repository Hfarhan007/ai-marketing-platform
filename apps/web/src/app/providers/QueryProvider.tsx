import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { createApplicationQueryClient } from './query-client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createApplicationQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
