import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { OnEvent } from '@nestjs/event-emitter';
import Decimal from 'decimal.js';

@Injectable()
export class VariancesService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async evaluate(shipmentId: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch Shipment, PO, and CI
      const [shipment] = await tx
        .select()
        .from(schema.importShipments)
        .where(eq(schema.importShipments.id, shipmentId));
      if (!shipment) throw new NotFoundException('Shipment not found');

      const [po] = await tx
        .select()
        .from(schema.importPurchaseOrders)
        .where(eq(schema.importPurchaseOrders.id, shipment.poId));
      if (!po) throw new NotFoundException('PO not found');

      const [ci] = await tx
        .select()
        .from(schema.commercialInvoices)
        .where(eq(schema.commercialInvoices.shipmentId, shipmentId));
      // Cost entries can be recorded before the supplier's commercial invoice
      // is uploaded. There is no price baseline to compare yet; the invoice
      // upload emits cost.changed and will trigger this evaluation again.
      if (!ci) return [];

      // 1.5 Fetch Threshold Setting
      const [thresholdSetting] = await tx
        .select()
        .from(schema.policySettings)
        .where(eq(schema.policySettings.key, 'variance_threshold_pct'));
      const thresholdPct = new Decimal(
        thresholdSetting?.valueNumeric || '0.0000',
      );

      // 2. Fetch Cost Categories and Actual Costs
      const categories = await tx.select().from(schema.costCategories);
      const catMap = new Map(categories.map((c: any) => [c.id, c.code]));

      const costEntries = await tx
        .select()
        .from(schema.importCostEntries)
        .where(
          and(
            eq(schema.importCostEntries.shipmentId, shipmentId),
            eq(schema.importCostEntries.isEstimated, false),
            ne(schema.importCostEntries.source, 'commercial_invoice'),
          ),
        );

      let actualFreight = new Decimal(0);
      let actualDuty = new Decimal(0);
      let actualOther = new Decimal(0);

      for (const entry of costEntries) {
        const code = String(
          catMap.get(entry.costCategoryId) || '',
        ).toUpperCase();
        const amount = new Decimal(String(entry.amountEtb));

        if (code === 'FREIGHT') {
          actualFreight = actualFreight.plus(amount);
        } else if (code === 'DUTY' || code === 'CUSTOMS_DUTY') {
          actualDuty = actualDuty.plus(amount);
        } else if (
          [
            'VAT',
            'IMPORT_VAT',
            'EXCISE',
            'EXCISE_TAX',
            'SURTAX',
            'WITHHOLDING',
          ].includes(code)
        ) {
          // Assessed customs taxes have no matching PO estimate in the SRS
          // variance model. Comparing them with insurance/other estimates
          // creates a false, often very large, "other" variance.
          continue;
        } else {
          actualOther = actualOther.plus(amount);
        }
      }

      // 3. Prepare Estimations
      const poTotalForeign = new Decimal(String(po.totalValueForeign));
      const poFx = new Decimal(String(po.fxRate));
      const estimatedPriceEtb = poTotalForeign.times(poFx);
      const ciTotalForeign = new Decimal(String(ci.totalForeign));

      const estimatedFreight = new Decimal(String(po.estimatedFreightEtb || 0));
      const estimatedDuty = new Decimal(String(po.estimatedDutyEtb || 0));
      const estimatedInsurance = new Decimal(
        String(po.estimatedInsuranceEtb || 0),
      );
      const estimatedOtherBase = new Decimal(
        String(po.estimatedOtherChargesEtb || 0),
      );
      const estimatedOtherTotal = estimatedInsurance.plus(estimatedOtherBase);

      const totalEstimatedLandedCost = estimatedPriceEtb
        .plus(estimatedFreight)
        .plus(estimatedDuty)
        .plus(estimatedOtherTotal);

      // Helper function to build row object with BR07 logic
      const buildRow = (type: string, estimated: any, actual: any) => {
        const varianceEtb = actual.minus(estimated);
        const variancePct = totalEstimatedLandedCost.isZero()
          ? new Decimal(0)
          : varianceEtb.dividedBy(totalEstimatedLandedCost).times(100);

        const status = variancePct.abs().lessThanOrEqualTo(thresholdPct)
          ? 'auto_approved'
          : 'pending_approval';

        return {
          shipmentId,
          varianceType: type as any,
          estimatedEtb: estimated.toFixed(4),
          actualEtb: actual.toFixed(4),
          varianceEtb: varianceEtb.toFixed(4),
          variancePct: variancePct.toFixed(6),
          status,
        };
      };

      // 4. Calculate Variances
      const actualPriceEtb = ciTotalForeign.times(poFx);
      const rowPrice = buildRow('price', estimatedPriceEtb, actualPriceEtb);

      const ciFx = new Decimal(String(ci.fxRate));
      const estimatedExchangeEtb = actualPriceEtb; // ciTotalForeign * poFx
      const actualExchangeEtb = ciTotalForeign.times(ciFx);
      const rowExchange = buildRow(
        'exchange_rate',
        estimatedExchangeEtb,
        actualExchangeEtb,
      );

      const rowFreight = buildRow('freight', estimatedFreight, actualFreight);
      const rowDuty = buildRow('duty', estimatedDuty, actualDuty);
      const rowOther = buildRow('other', estimatedOtherTotal, actualOther);
      const rows = [rowPrice, rowExchange, rowFreight, rowDuty, rowOther];

      const existingRows = await tx
        .select()
        .from(schema.costVariances)
        .where(eq(schema.costVariances.shipmentId, shipmentId));

      for (const row of rows) {
        const previous = existingRows.find(
          (existing: any) => existing.varianceType === row.varianceType,
        );
        if (
          previous &&
          new Decimal(String(previous.estimatedEtb)).equals(row.estimatedEtb) &&
          new Decimal(String(previous.actualEtb)).equals(row.actualEtb)
        ) {
          Object.assign(row, {
            id: previous.id,
            status: previous.status,
            approverId: previous.approverId,
            decidedAt: previous.decidedAt,
            comment: previous.comment,
          });
        }
      }

      // 5. Replace recalculated rows while retaining unchanged decisions.
      await tx
        .delete(schema.costVariances)
        .where(eq(schema.costVariances.shipmentId, shipmentId));

      // 6. Insert new variances
      const insertedRows = await tx
        .insert(schema.costVariances)
        .values(rows)
        .returning();

      // 7. Notification (BR07) for pending_approval rows
      const pendingRows = insertedRows.filter(
        (r: any) =>
          r.status === 'pending_approval' &&
          !existingRows.some(
            (previous: any) =>
              previous.varianceType === r.varianceType &&
              previous.status === 'pending_approval' &&
              new Decimal(String(previous.estimatedEtb)).equals(
                r.estimatedEtb,
              ) &&
              new Decimal(String(previous.actualEtb)).equals(r.actualEtb),
          ),
      );
      if (pendingRows.length > 0) {
        const financeManagers = await tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.role, 'finance_manager'));
        const pendingTypes = pendingRows
          .map((r: any) => r.varianceType)
          .join(', ');

        const notifications = financeManagers.map((fm: any) => ({
          userId: fm.id,
          type: 'variance', // Maps correctly to enum
          channel: 'in_app',
          titleEn: 'Landed Cost Variance Approval Required',
          bodyEn: `Shipment ${shipment.shipmentNumber} has cost variances (${pendingTypes}) exceeding the ${thresholdPct.toString()}% threshold against total estimated landed cost.`,
          entityType: 'import_shipment',
          entityId: shipmentId,
        }));

        if (notifications.length > 0) {
          await tx.insert(schema.notifications).values(notifications);
        }
      }

      return insertedRows;
    });
  }
  async approve(varianceId: string, actor: any, comment?: string) {
    if (
      actor?.role !== 'finance_manager' &&
      actor?.role !== 'general_manager'
    ) {
      throw new ForbiddenException(
        'Only Finance Manager or General Manager can approve variances',
      );
    }

    const [updated] = await this.db
      .update(schema.costVariances)
      .set({
        status: 'approved',
        approverId: actor.id,
        decidedAt: new Date().toISOString(),
        comment: comment || null,
      })
      .where(eq(schema.costVariances.id, varianceId))
      .returning();

    if (!updated) throw new NotFoundException('Variance not found');

    return updated;
  }

  async reject(varianceId: string, actor: any, comment?: string) {
    if (
      actor?.role !== 'finance_manager' &&
      actor?.role !== 'general_manager'
    ) {
      throw new ForbiddenException(
        'Only Finance Manager or General Manager can reject variances',
      );
    }

    const [updated] = await this.db
      .update(schema.costVariances)
      .set({
        status: 'rejected',
        approverId: actor.id,
        decidedAt: new Date().toISOString(),
        comment: comment || null,
      })
      .where(eq(schema.costVariances.id, varianceId))
      .returning();

    if (!updated) throw new NotFoundException('Variance not found');

    return updated;
  }
  @OnEvent('cost.changed')
  async handleCostChanged(payload: { shipmentId: string }) {
    await this.evaluate(payload.shipmentId).catch((err) => {
      console.error(
        `Failed to automatically evaluate variance for shipment ${payload.shipmentId}`,
        err,
      );
    });
  }
  async findAll(filters: { status?: string; shipmentId?: string }) {
    const conditions = [];
    if (filters.status)
      conditions.push(eq(schema.costVariances.status, filters.status as any));
    if (filters.shipmentId)
      conditions.push(eq(schema.costVariances.shipmentId, filters.shipmentId));

    return this.db
      .select()
      .from(schema.costVariances)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  async findByShipment(shipmentId: string) {
    return this.db
      .select()
      .from(schema.costVariances)
      .where(eq(schema.costVariances.shipmentId, shipmentId));
  }
}
