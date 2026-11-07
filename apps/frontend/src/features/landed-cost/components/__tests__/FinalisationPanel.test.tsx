import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/server';
import { FinalisationPanel } from '../FinalisationPanel';

describe('FinalisationPanel', () => {
  it('renders the finalisation check response object without crashing', async () => {
    server.use(
      http.get(
        'http://localhost:3000/api/v1/import-shipments/shipment-1/finalisation-check',
        () =>
          HttpResponse.json({
            canFinalise: false,
            blockers: ['BR05: Estimated costs need approval'],
          }),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FinalisationPanel shipmentId="shipment-1" />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Finalisation Blockers Detected'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('BR05: Estimated costs need approval'),
    ).toBeInTheDocument();
  });
});
