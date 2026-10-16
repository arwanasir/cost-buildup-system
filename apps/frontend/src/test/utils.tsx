import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const testQueryClient = createTestQueryClient();
  return {
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
      </MemoryRouter>,
      options,
    ),
    queryClient: testQueryClient,
  };
}
