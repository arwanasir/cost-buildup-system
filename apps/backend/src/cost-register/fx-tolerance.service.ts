import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class FxToleranceService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async checkTolerance(
    currency: string,
    fxRate: number | string,
    txClient?: any,
  ): Promise<{ hasFxWarning: boolean; fxWarningMessage?: string }> {
    const dbClient = txClient || this.db;

    // Base currency doesn't need FX warning
    if (currency.toUpperCase() === 'ETB') {
      return { hasFxWarning: false };
    }

    // Get policy setting
    const [policy] = await dbClient
      .select()
      .from(schema.policySettings)
      .where(eq(schema.policySettings.key, 'fx_tolerance_pct'));

    // Default to 5% if not configured
    const tolerancePct = new Decimal(policy?.valueNumeric || '5');

    // Get latest NBE rate
    const [latestNbe] = await dbClient
      .select()
      .from(schema.nbeExchangeRates)
      .where(eq(schema.nbeExchangeRates.currency, currency))
      .orderBy(desc(schema.nbeExchangeRates.rateDate))
      .limit(1);

    if (!latestNbe) {
      return {
        hasFxWarning: true,
        fxWarningMessage: `No official NBE exchange rate found for currency ${currency} to validate against.`,
      };
    }

    const nbeRate = new Decimal(latestNbe.rate);
    const submittedRate = new Decimal(fxRate);

    // If NBE rate is zero to avoid division by zero
    if (nbeRate.isZero()) {
      return {
        hasFxWarning: true,
        fxWarningMessage: 'NBE Exchange rate is recorded as zero.',
      };
    }

    // Variance = |submitted - NBE| / NBE * 100
    const variance = submittedRate.minus(nbeRate).abs();
    const variancePct = variance.dividedBy(nbeRate).times(100);

    if (variancePct.greaterThan(tolerancePct)) {
      return {
        hasFxWarning: true,
        fxWarningMessage: `Submitted FX Rate (${submittedRate.toFixed(4)}) exceeds the NBE Rate (${nbeRate.toFixed(4)}) by ${variancePct.toFixed(2)}%, which is above the ${tolerancePct.toFixed(2)}% tolerance threshold.`,
      };
    }

    return { hasFxWarning: false };
  }
}
