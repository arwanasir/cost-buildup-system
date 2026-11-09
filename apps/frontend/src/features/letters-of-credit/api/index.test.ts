import { describe, expect, it } from 'vitest';
import { normalizeLettersOfCreditResponse } from './index';

describe('normalizeLettersOfCreditResponse', () => {
  it('normalizes the backend plain-array response for the LC list', () => {
    const lc = { id: 'lc-1', lcNumber: 'LC-001', status: 'applied' };

    expect(normalizeLettersOfCreditResponse([lc])).toEqual({
      data: [lc],
      total: 1,
    });
  });

  it('preserves an already wrapped list response', () => {
    const lc = { id: 'lc-1', lcNumber: 'LC-001', status: 'applied' };

    expect(normalizeLettersOfCreditResponse({ data: [lc], total: 3 })).toEqual({
      data: [lc],
      total: 3,
    });
  });
});
