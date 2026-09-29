import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and, gte, lte, ne } from 'drizzle-orm';
import { ReportFilterDto } from './dto/report-filter.dto';

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getLandedCostByShipment(filters: ReportFilterDto) {
    const shipmentConditions = [];
    if (filters.shipment_id)
      shipmentConditions.push(
        eq(schema.importShipments.id, filters.shipment_id),
      );
    if (filters.supplier_id)
      shipmentConditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.status)
      shipmentConditions.push(
        eq(schema.importShipments.status, filters.status as any),
      );
    if (filters.date_from)
      shipmentConditions.push(
        gte(schema.importShipments.createdAt, filters.date_from),
      );
    if (filters.date_to)
      shipmentConditions.push(
        lte(schema.importShipments.createdAt, filters.date_to),
      );

    const query = this.db.select().from(schema.importShipments);
    if (shipmentConditions.length > 0) {
      query.where(and(...shipmentConditions));
    }

    const shipments = await query;
    if (shipments.length === 0) return [];

    const shipmentIds = shipments.map((s: any) => s.id);

    // 1. Cost Entries & Category Totals
    const costEntries = await this.db
      .select({
        id: schema.importCostEntries.id,
        shipmentId: schema.importCostEntries.shipmentId,
        amountEtb: schema.importCostEntries.amountEtb,
        isEstimated: schema.importCostEntries.isEstimated,
        providerName: schema.importCostEntries.providerName,
        invoiceNumber: schema.importCostEntries.invoiceNumber,
        costCategoryName: schema.costCategories.name,
      })
      .from(schema.importCostEntries)
      .leftJoin(
        schema.costCategories,
        eq(schema.importCostEntries.costCategoryId, schema.costCategories.id),
      )
      .where(inArray(schema.importCostEntries.shipmentId, shipmentIds));

    // 2. Per-Item Allocations and Per-Unit Costs
    const landedCosts = await this.db
      .select({
        shipmentId: schema.importLandedCostResults.shipmentId,
        itemId: schema.importLandedCostResults.itemId,
        quantityReceived: schema.importLandedCostResults.quantityReceived,
        perUnitLandedCostEtb:
          schema.importLandedCostResults.perUnitLandedCostEtb,
        totalLandedCostEtb: schema.importLandedCostResults.totalLandedCostEtb,
        ciValueEtb: schema.importLandedCostResults.ciValueEtb,
        customsDutyEtb: schema.importLandedCostResults.customsDutyEtb,
        importVatEtb: schema.importLandedCostResults.importVatEtb,
        freightAllocatedEtb: schema.importLandedCostResults.freightAllocatedEtb,
        insuranceAllocatedEtb:
          schema.importLandedCostResults.insuranceAllocatedEtb,
        bankChargesAllocatedEtb:
          schema.importLandedCostResults.bankChargesAllocatedEtb,
        portChargesAllocatedEtb:
          schema.importLandedCostResults.portChargesAllocatedEtb,
        clearingFeeAllocatedEtb:
          schema.importLandedCostResults.clearingFeeAllocatedEtb,
        otherChargesAllocatedEtb:
          schema.importLandedCostResults.otherChargesAllocatedEtb,
        itemName: schema.items.name,
        hsCode: schema.items.defaultHsCode,
      })
      .from(schema.importLandedCostResults)
      .leftJoin(
        schema.items,
        eq(schema.importLandedCostResults.itemId, schema.items.id),
      )
      .where(inArray(schema.importLandedCostResults.shipmentId, shipmentIds));

    // 3. Estimated vs Actual Variances
    const variances = await this.db
      .select()
      .from(schema.costVariances)
      .where(inArray(schema.costVariances.shipmentId, shipmentIds));

    return shipments.map((shipment: any) => {
      const shipmentCostEntries = costEntries.filter(
        (ce: any) => ce.shipmentId === shipment.id,
      );

      const categoryTotals: Record<string, number> = {};
      shipmentCostEntries.forEach((ce: any) => {
        const cat = ce.costCategoryName || 'Uncategorized';
        categoryTotals[cat] =
          (categoryTotals[cat] || 0) + Number(ce.amountEtb || 0);
      });

      const itemAllocations = landedCosts
        .filter((lc: any) => lc.shipmentId === shipment.id)
        .filter((lc: any) => {
          if (filters.item_id && lc.itemId !== filters.item_id) return false;

          if (filters.hs_code && lc.hsCode !== filters.hs_code) return false;
          return true;
        })
        .map((lc: any) => ({
          itemId: lc.itemId,
          itemName: lc.itemName,
          hsCode: lc.hsCode,
          quantity: lc.quantityReceived,
          perUnitCost: lc.perUnitLandedCostEtb,
          totalLandedCost: lc.totalLandedCostEtb,
          allocations: {
            ciValueEtb: lc.ciValueEtb,
            customsDutyEtb: lc.customsDutyEtb,
            importVatEtb: lc.importVatEtb,
            freightAllocatedEtb: lc.freightAllocatedEtb,
            insuranceAllocatedEtb: lc.insuranceAllocatedEtb,
            bankChargesAllocatedEtb: lc.bankChargesAllocatedEtb,
            portChargesAllocatedEtb: lc.portChargesAllocatedEtb,
            clearingFeeAllocatedEtb: lc.clearingFeeAllocatedEtb,
            otherChargesAllocatedEtb: lc.otherChargesAllocatedEtb,
          },
        }));

      const shipmentVariances = variances.filter(
        (v: any) => v.shipmentId === shipment.id,
      );

      return {
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        status: shipment.status,
        totalWeightKg: shipment.totalWeightKg,
        costEntries: shipmentCostEntries,
        categoryTotals,
        itemAllocations,
        variances: shipmentVariances,
      };
    });
  }
  async getLandedCostByItem(filters: ReportFilterDto) {
    if (!filters.item_id) {
      throw new BadRequestException('item_id is required for this report');
    }

    const conditions = [
      eq(schema.importLandedCostResults.itemId, filters.item_id),
    ];

    if (filters.shipment_id)
      conditions.push(eq(schema.importShipments.id, filters.shipment_id));
    if (filters.supplier_id)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));
    if (filters.date_from)
      conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to)
      conditions.push(lte(schema.importShipments.createdAt, filters.date_to));

    const results = await this.db
      .select({
        shipmentId: schema.importShipments.id,
        shipmentNumber: schema.importShipments.shipmentNumber,
        shipmentDate: schema.importShipments.createdAt,
        supplierId: schema.importShipments.supplierId,
        itemId: schema.items.id,
        itemName: schema.items.name,
        hsCode: schema.items.defaultHsCode,
        quantity: schema.importLandedCostResults.quantityReceived,
        perUnitLandedCostEtb:
          schema.importLandedCostResults.perUnitLandedCostEtb,
        totalLandedCostEtb: schema.importLandedCostResults.totalLandedCostEtb,
        ciValueEtb: schema.importLandedCostResults.ciValueEtb,
        customsDutyEtb: schema.importLandedCostResults.customsDutyEtb,
        importVatEtb: schema.importLandedCostResults.importVatEtb,
        freightAllocatedEtb: schema.importLandedCostResults.freightAllocatedEtb,
        insuranceAllocatedEtb:
          schema.importLandedCostResults.insuranceAllocatedEtb,
        bankChargesAllocatedEtb:
          schema.importLandedCostResults.bankChargesAllocatedEtb,
        portChargesAllocatedEtb:
          schema.importLandedCostResults.portChargesAllocatedEtb,
        clearingFeeAllocatedEtb:
          schema.importLandedCostResults.clearingFeeAllocatedEtb,
        otherChargesAllocatedEtb:
          schema.importLandedCostResults.otherChargesAllocatedEtb,
      })
      .from(schema.importLandedCostResults)
      .innerJoin(
        schema.importShipments,
        eq(
          schema.importLandedCostResults.shipmentId,
          schema.importShipments.id,
        ),
      )
      .innerJoin(
        schema.items,
        eq(schema.importLandedCostResults.itemId, schema.items.id),
      )
      .where(and(...conditions));

    results.sort(
      (a: any, b: any) =>
        new Date(a.shipmentDate).getTime() - new Date(b.shipmentDate).getTime(),
    );

    return results.map((row: any) => {
      const qty = Number(row.quantity);
      const safeDiv = (val: any) => (qty > 0 ? Number(val || 0) / qty : 0);

      return {
        shipmentId: row.shipmentId,
        shipmentNumber: row.shipmentNumber,
        shipmentDate: row.shipmentDate,
        supplierId: row.supplierId,
        itemId: row.itemId,
        itemName: row.itemName,
        hsCode: row.hsCode,
        quantity: qty,
        totalPerUnitCost: Number(row.perUnitLandedCostEtb),
        perUnitBreakdown: {
          ciValue: safeDiv(row.ciValueEtb),
          customsDuty: safeDiv(row.customsDutyEtb),
          importVat: safeDiv(row.importVatEtb),
          freight: safeDiv(row.freightAllocatedEtb),
          insurance: safeDiv(row.insuranceAllocatedEtb),
          bankCharges: safeDiv(row.bankChargesAllocatedEtb),
          portCharges: safeDiv(row.portChargesAllocatedEtb),
          clearingFee: safeDiv(row.clearingFeeAllocatedEtb),
          otherCharges: safeDiv(row.otherChargesAllocatedEtb),
        },
        totalBreakdown: {
          totalLandedCost: Number(row.totalLandedCostEtb),
          ciValue: Number(row.ciValueEtb),
          customsDuty: Number(row.customsDutyEtb),
          importVat: Number(row.importVatEtb),
          freight: Number(row.freightAllocatedEtb),
          insurance: Number(row.insuranceAllocatedEtb),
          bankCharges: Number(row.bankChargesAllocatedEtb),
          portCharges: Number(row.portChargesAllocatedEtb),
          clearingFee: Number(row.clearingFeeAllocatedEtb),
          otherCharges: Number(row.otherChargesAllocatedEtb),
        },
      };
    });
  }

  async getLandedCostBySupplier(filters: ReportFilterDto) {
    const conditions = [];
    if (filters.supplier_id)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.date_from)
      conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to)
      conditions.push(lte(schema.importShipments.createdAt, filters.date_to));
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));

    const query = this.db
      .select({
        supplierId: schema.importShipments.supplierId,
        supplierName: schema.suppliers.name,
        ciValueEtb: schema.importLandedCostResults.ciValueEtb,
        totalLandedCostEtb: schema.importLandedCostResults.totalLandedCostEtb,
      })
      .from(schema.importLandedCostResults)
      .innerJoin(
        schema.importShipments,
        eq(
          schema.importLandedCostResults.shipmentId,
          schema.importShipments.id,
        ),
      )
      .innerJoin(
        schema.suppliers,
        eq(schema.importShipments.supplierId, schema.suppliers.id),
      );

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const results = await query;

    const aggregated = new Map<string, any>();

    for (const row of results) {
      if (!aggregated.has(row.supplierId)) {
        aggregated.set(row.supplierId, {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          totalImportValue: 0,
          totalLandedCost: 0,
          totalCharges: 0,
        });
      }
      const supp = aggregated.get(row.supplierId);
      const ci = Number(row.ciValueEtb || 0);
      const tlc = Number(row.totalLandedCostEtb || 0);
      supp.totalImportValue += ci;
      supp.totalLandedCost += tlc;
      supp.totalCharges += tlc - ci;
    }

    const report = Array.from(aggregated.values()).map((supp) => {
      const markupPercent =
        supp.totalImportValue > 0
          ? (supp.totalCharges / supp.totalImportValue) * 100
          : 0;
      return {
        ...supp,
        averageMarkupPercent: Number(markupPercent.toFixed(2)),
      };
    });

    return report.sort((a, b) => b.totalImportValue - a.totalImportValue);
  }

  async getImportCostSummary(filters: ReportFilterDto) {
    const conditions = [];
    if (filters.supplier_id)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.shipment_id)
      conditions.push(eq(schema.importShipments.id, filters.shipment_id));
    if (filters.date_from)
      conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to)
      conditions.push(lte(schema.importShipments.createdAt, filters.date_to));
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));

    const query = this.db
      .select({
        shipmentDate: schema.importShipments.createdAt,
        ciValueEtb: schema.importLandedCostResults.ciValueEtb,
        customsDutyEtb: schema.importLandedCostResults.customsDutyEtb,
        freightAllocatedEtb: schema.importLandedCostResults.freightAllocatedEtb,
        insuranceAllocatedEtb:
          schema.importLandedCostResults.insuranceAllocatedEtb,
        bankChargesAllocatedEtb:
          schema.importLandedCostResults.bankChargesAllocatedEtb,
        portChargesAllocatedEtb:
          schema.importLandedCostResults.portChargesAllocatedEtb,
        clearingFeeAllocatedEtb:
          schema.importLandedCostResults.clearingFeeAllocatedEtb,
        otherChargesAllocatedEtb:
          schema.importLandedCostResults.otherChargesAllocatedEtb,
        importVatEtb: schema.importLandedCostResults.importVatEtb,
      })
      .from(schema.importLandedCostResults)
      .innerJoin(
        schema.importShipments,
        eq(
          schema.importLandedCostResults.shipmentId,
          schema.importShipments.id,
        ),
      );

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const results = await query;

    const periodType = filters.period || 'month';
    const aggregated = new Map<string, any>();

    for (const row of results) {
      const date = new Date(row.shipmentDate);
      const year = date.getFullYear();
      let periodKey = '';
      if (periodType === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `${year}-Q${quarter}`;
      } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periodKey = `${year}-${month}`;
      }

      if (!aggregated.has(periodKey)) {
        aggregated.set(periodKey, {
          period: periodKey,
          totalCiValue: 0,
          totalCustomsDuty: 0,
          totalFreight: 0,
          totalInsurance: 0,
          totalBankCharges: 0,
          totalPortCharges: 0,
          totalClearingFee: 0,
          totalOtherCharges: 0,
          totalImportVat: 0,
        });
      }

      const group = aggregated.get(periodKey);
      group.totalCiValue += Number(row.ciValueEtb || 0);
      group.totalCustomsDuty += Number(row.customsDutyEtb || 0);
      group.totalFreight += Number(row.freightAllocatedEtb || 0);
      group.totalInsurance += Number(row.insuranceAllocatedEtb || 0);
      group.totalBankCharges += Number(row.bankChargesAllocatedEtb || 0);
      group.totalPortCharges += Number(row.portChargesAllocatedEtb || 0);
      group.totalClearingFee += Number(row.clearingFeeAllocatedEtb || 0);
      group.totalOtherCharges += Number(row.otherChargesAllocatedEtb || 0);
      group.totalImportVat += Number(row.importVatEtb || 0);
    }

    const report = Array.from(aggregated.values()).map((group) => {
      const safePct = (val: number) =>
        group.totalCiValue > 0
          ? Number(((val / group.totalCiValue) * 100).toFixed(2))
          : 0;
      return {
        ...group,
        percentages: {
          customsDutyPct: safePct(group.totalCustomsDuty),
          freightPct: safePct(group.totalFreight),
          insurancePct: safePct(group.totalInsurance),
          bankChargesPct: safePct(group.totalBankCharges),
          portChargesPct: safePct(group.totalPortCharges),
          clearingFeePct: safePct(group.totalClearingFee),
          otherChargesPct: safePct(group.totalOtherCharges),
          importVatPct: safePct(group.totalImportVat),
        },
      };
    });

    return report.sort((a, b) => a.period.localeCompare(b.period));
  }

  async getLcStatusReport(filters: ReportFilterDto) {
    const conditions = [];
    if (!filters.status) {
      conditions.push(ne(schema.lettersOfCredit.status, 'settled'));
    } else {
      conditions.push(eq(schema.lettersOfCredit.status, filters.status as any));
    }

    if (filters.supplier_id)
      conditions.push(
        eq(schema.lettersOfCredit.supplierId, filters.supplier_id),
      );
    if (filters.date_from)
      conditions.push(
        gte(schema.lettersOfCredit.openingDate, filters.date_from),
      );
    if (filters.date_to)
      conditions.push(lte(schema.lettersOfCredit.openingDate, filters.date_to));

    const query = this.db
      .select({
        id: schema.lettersOfCredit.id,
        lcNumber: schema.lettersOfCredit.lcNumber,
        supplierId: schema.lettersOfCredit.supplierId,
        supplierName: schema.suppliers.name,
        issuingBank: schema.lettersOfCredit.issuingBank,
        amountForeign: schema.lettersOfCredit.amountForeign,
        currency: schema.lettersOfCredit.currency,
        amountEtb: schema.lettersOfCredit.amountEtb,
        openingDate: schema.lettersOfCredit.openingDate,
        expiryDate: schema.lettersOfCredit.expiryDate,
        status: schema.lettersOfCredit.status,
      })
      .from(schema.lettersOfCredit)
      .leftJoin(
        schema.suppliers,
        eq(schema.lettersOfCredit.supplierId, schema.suppliers.id),
      );

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const lcs = await query;
    if (lcs.length === 0) return [];

    const lcIds = lcs.map((lc: any) => lc.id);

    const pos = await this.db
      .select({
        id: schema.importPurchaseOrders.id,
        lcId: schema.importPurchaseOrders.lcId,
        poNumber: schema.importPurchaseOrders.poNumber,
        poDate: schema.importPurchaseOrders.poDate,
        status: schema.importPurchaseOrders.status,
      })
      .from(schema.importPurchaseOrders)
      .where(inArray(schema.importPurchaseOrders.lcId, lcIds));

    const shipments = await this.db
      .select({
        id: schema.importShipments.id,
        lcId: schema.importShipments.lcId,
        shipmentNumber: schema.importShipments.shipmentNumber,
        blNumber: schema.importShipments.blNumber,
        eta: schema.importShipments.eta,
        status: schema.importShipments.status,
      })
      .from(schema.importShipments)
      .where(inArray(schema.importShipments.lcId, lcIds));

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return lcs
      .map((lc: any) => {
        const lcPos = pos.filter((po: any) => po.lcId === lc.id);
        const lcShipments = shipments.filter((sh: any) => sh.lcId === lc.id);

        const expiry = new Date(lc.expiryDate);
        const expiringSoon = expiry >= now && expiry <= thirtyDaysFromNow;
        const isExpired = expiry < now;

        return {
          ...lc,
          expiringSoon,
          isExpired,
          purchaseOrders: lcPos.map((po: any) => ({
            poId: po.id,
            poNumber: po.poNumber,
            poDate: po.poDate,
            status: po.status,
          })),
          shipments: lcShipments.map((sh: any) => ({
            shipmentId: sh.id,
            shipmentNumber: sh.shipmentNumber,
            blNumber: sh.blNumber,
            eta: sh.eta,
            status: sh.status,
          })),
        };
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
      );
  }

  async getCustomsDutyReport(filters: ReportFilterDto) {
    const conditions = [];
    if (filters.shipment_id)
      conditions.push(eq(schema.importShipments.id, filters.shipment_id));
    if (filters.supplier_id)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));
    if (filters.date_from)
      conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to)
      conditions.push(lte(schema.importShipments.createdAt, filters.date_to));

    const shipmentsWithDutyVariance = await this.db
      .select({
        shipmentId: schema.importShipments.id,
        shipmentNumber: schema.importShipments.shipmentNumber,
        shipmentDate: schema.importShipments.createdAt,
        assessedDuty: schema.costVariances.estimatedEtb,
        paidDuty: schema.costVariances.actualEtb,
        variance: schema.costVariances.varianceEtb,
      })
      .from(schema.importShipments)
      .leftJoin(
        schema.costVariances,
        and(
          eq(schema.importShipments.id, schema.costVariances.shipmentId),
          eq(schema.costVariances.varianceType, 'duty'),
        ),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const itemAllocations = await this.db
      .select({
        shipmentId: schema.importLandedCostResults.shipmentId,
        itemId: schema.importLandedCostResults.itemId,
        hsCode: schema.items.defaultHsCode,
        customsDutyEtb: schema.importLandedCostResults.customsDutyEtb,
      })
      .from(schema.importLandedCostResults)
      .innerJoin(
        schema.items,
        eq(schema.importLandedCostResults.itemId, schema.items.id),
      )
      .innerJoin(
        schema.importShipments,
        eq(
          schema.importLandedCostResults.shipmentId,
          schema.importShipments.id,
        ),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const periodType = filters.period || 'month';
    const byPeriod = new Map<string, any>();
    const byShipment = new Map<string, any>();
    const byHsCode = new Map<string, any>();

    for (const sh of shipmentsWithDutyVariance) {
      const date = new Date(sh.shipmentDate);
      const year = date.getFullYear();
      let periodKey = '';
      if (periodType === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `-Q`;
      } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periodKey = `-`;
      }

      const assessed = Number(sh.assessedDuty || 0);
      const paid = Number(sh.paidDuty || 0);
      const variance = Number(sh.variance || 0);

      byShipment.set(sh.shipmentId, {
        shipmentId: sh.shipmentId,
        shipmentNumber: sh.shipmentNumber,
        period: periodKey,
        assessedDuty: assessed,
        paidDuty: paid,
        variance: variance,
      });

      if (!byPeriod.has(periodKey)) {
        byPeriod.set(periodKey, {
          period: periodKey,
          assessedDuty: 0,
          paidDuty: 0,
          variance: 0,
        });
      }
      const periodObj = byPeriod.get(periodKey);
      periodObj.assessedDuty += assessed;
      periodObj.paidDuty += paid;
      periodObj.variance += variance;
    }

    const shipmentDutyTotals = new Map<string, number>();
    for (const item of itemAllocations) {
      const current = shipmentDutyTotals.get(item.shipmentId) || 0;
      shipmentDutyTotals.set(
        item.shipmentId,
        current + Number(item.customsDutyEtb || 0),
      );
    }

    for (const item of itemAllocations) {
      const hs = item.hsCode || 'Unknown';
      if (!byHsCode.has(hs)) {
        byHsCode.set(hs, {
          hsCode: hs,
          assessedDuty: 0,
          paidDuty: 0,
          variance: 0,
        });
      }

      const hsObj = byHsCode.get(hs);
      const itemAssessed = Number(item.customsDutyEtb || 0);
      const totalAssessed = shipmentDutyTotals.get(item.shipmentId) || 1;

      const shipmentData = byShipment.get(item.shipmentId);
      const shipmentPaid = shipmentData ? shipmentData.paidDuty : 0;
      const shipmentVariance = shipmentData ? shipmentData.variance : 0;

      const ratio = totalAssessed > 0 ? itemAssessed / totalAssessed : 0;
      const itemPaid = shipmentPaid * ratio;
      const itemVariance = shipmentVariance * ratio;

      hsObj.assessedDuty += itemAssessed;
      hsObj.paidDuty += itemPaid;
      hsObj.variance += itemVariance;
    }

    return {
      byPeriod: Array.from(byPeriod.values()).sort((a, b) =>
        a.period.localeCompare(b.period),
      ),
      byShipment: Array.from(byShipment.values()).sort((a, b) =>
        a.period.localeCompare(b.period),
      ),
      byHsCode: Array.from(byHsCode.values()).sort(
        (a, b) => b.paidDuty - a.paidDuty,
      ),
    };
  }

  async getShipmentStatusReport(filters: ReportFilterDto) {
    const conditions = [];
    if (filters.shipment_id)
      conditions.push(eq(schema.importShipments.id, filters.shipment_id));
    if (filters.supplier_id)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));
    if (filters.date_from)
      conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to)
      conditions.push(lte(schema.importShipments.createdAt, filters.date_to));

    const query = this.db
      .select({
        shipmentId: schema.importShipments.id,
        shipmentNumber: schema.importShipments.shipmentNumber,
        supplierName: schema.suppliers.name,
        status: schema.importShipments.status,
        eta: schema.importShipments.eta,
        actualArrivalDate: schema.importShipments.actualArrivalDate,
        blDate: schema.importShipments.blDate,
        portOfLoading: schema.importShipments.portOfLoading,
        portOfDestination: schema.importShipments.portOfDestination,
        carrier: schema.importShipments.carrier,
      })
      .from(schema.importShipments)
      .leftJoin(
        schema.suppliers,
        eq(schema.importShipments.supplierId, schema.suppliers.id),
      );

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const results = await query;
    const now = new Date();

    return results
      .map((sh: any) => {
        let daysOverdue = 0;
        let isOverdue = false;

        if (sh.eta) {
          const etaDate = new Date(sh.eta);
          if (sh.actualArrivalDate) {
            const arrivalDate = new Date(sh.actualArrivalDate);
            if (arrivalDate > etaDate) {
              isOverdue = true;
              daysOverdue = Math.floor(
                (arrivalDate.getTime() - etaDate.getTime()) /
                  (1000 * 3600 * 24),
              );
            }
          } else {
            // If status denotes it hasn't fully arrived
            if (
              now > etaDate &&
              sh.status !== 'received' &&
              sh.status !== 'customs_cleared' &&
              sh.status !== 'completed'
            ) {
              isOverdue = true;
              daysOverdue = Math.floor(
                (now.getTime() - etaDate.getTime()) / (1000 * 3600 * 24),
              );
            }
          }
        }

        return {
          ...sh,
          isOverdue,
          daysOverdue,
        };
      })
      .sort((a: any, b: any) => {
        const etaA = a.eta ? new Date(a.eta).getTime() : 0;
        const etaB = b.eta ? new Date(b.eta).getTime() : 0;
        return etaB - etaA;
      });
  }

  async getCostVarianceReport(filters: ReportFilterDto) {
    const conditions = [];
    if (filters.shipment_id)
      conditions.push(eq(schema.importShipments.id, filters.shipment_id));
    if (filters.supplier_id)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));
    if (filters.date_from)
      conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to)
      conditions.push(lte(schema.importShipments.createdAt, filters.date_to));

    const rawVariances = await this.db
      .select({
        shipmentId: schema.importShipments.id,
        shipmentNumber: schema.importShipments.shipmentNumber,
        shipmentDate: schema.importShipments.createdAt,
        varianceType: schema.costVariances.varianceType,
        estimatedEtb: schema.costVariances.estimatedEtb,
        actualEtb: schema.costVariances.actualEtb,
        varianceEtb: schema.costVariances.varianceEtb,
        variancePct: schema.costVariances.variancePct,
        status: schema.costVariances.status,
      })
      .from(schema.costVariances)
      .innerJoin(
        schema.importShipments,
        eq(schema.costVariances.shipmentId, schema.importShipments.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const periodType = filters.period || 'month';

    const byShipment = new Map<string, any>();
    const byCategory = new Map<string, any>();
    const byPeriod = new Map<string, any>();

    for (const row of rawVariances) {
      const date = new Date(row.shipmentDate);
      const year = date.getFullYear();
      let periodKey = '';
      if (periodType === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `-Q`;
      } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periodKey = `-`;
      }

      const est = Number(row.estimatedEtb || 0);
      const act = Number(row.actualEtb || 0);
      const varEtb = Number(row.varianceEtb || 0);

      if (!byShipment.has(row.shipmentId)) {
        byShipment.set(row.shipmentId, {
          shipmentId: row.shipmentId,
          shipmentNumber: row.shipmentNumber,
          estimatedEtb: 0,
          actualEtb: 0,
          varianceEtb: 0,
          breakdown: [],
        });
      }
      const shObj = byShipment.get(row.shipmentId);
      shObj.estimatedEtb += est;
      shObj.actualEtb += act;
      shObj.varianceEtb += varEtb;
      shObj.breakdown.push({
        varianceType: row.varianceType,
        rootCause: row.varianceType,
        estimatedEtb: est,
        actualEtb: act,
        varianceEtb: varEtb,
        variancePct: Number(row.variancePct || 0),
        status: row.status,
      });

      const catKey = row.varianceType;
      if (!byCategory.has(catKey)) {
        byCategory.set(catKey, {
          category: catKey,
          rootCause: catKey,
          estimatedEtb: 0,
          actualEtb: 0,
          varianceEtb: 0,
        });
      }
      const catObj = byCategory.get(catKey);
      catObj.estimatedEtb += est;
      catObj.actualEtb += act;
      catObj.varianceEtb += varEtb;

      if (!byPeriod.has(periodKey)) {
        byPeriod.set(periodKey, {
          period: periodKey,
          estimatedEtb: 0,
          actualEtb: 0,
          varianceEtb: 0,
          categories: {},
        });
      }
      const pObj = byPeriod.get(periodKey);
      pObj.estimatedEtb += est;
      pObj.actualEtb += act;
      pObj.varianceEtb += varEtb;
      pObj.categories[catKey] = (pObj.categories[catKey] || 0) + varEtb;
    }

    return {
      byShipment: Array.from(byShipment.values()),
      byCategory: Array.from(byCategory.values()),
      byPeriod: Array.from(byPeriod.values()).sort((a, b) =>
        a.period.localeCompare(b.period),
      ),
    };
  }

  async getSupplierPerformanceReport(filters: ReportFilterDto) {
    const shipmentConditions = [];
    if (filters.supplier_id)
      shipmentConditions.push(
        eq(schema.importShipments.supplierId, filters.supplier_id),
      );
    if (filters.date_from)
      shipmentConditions.push(
        gte(schema.importShipments.createdAt, filters.date_from),
      );
    if (filters.date_to)
      shipmentConditions.push(
        lte(schema.importShipments.createdAt, filters.date_to),
      );
    if (filters.status)
      shipmentConditions.push(
        eq(schema.importShipments.status, filters.status as any),
      );
    if (filters.shipment_id)
      shipmentConditions.push(
        eq(schema.importShipments.id, filters.shipment_id),
      );

    const query = this.db
      .select({
        id: schema.importShipments.id,
        supplierId: schema.importShipments.supplierId,
        eta: schema.importShipments.eta,
        actualArrivalDate: schema.importShipments.actualArrivalDate,
      })
      .from(schema.importShipments);

    if (shipmentConditions.length > 0) {
      query.where(and(...shipmentConditions));
    }
    const shipments = await query;

    if (shipments.length === 0) return [];

    const shipmentIds: string[] = shipments.map((sh: any) => sh.id as string);
    const supplierIds: string[] = Array.from(
      new Set(shipments.map((sh: any) => sh.supplierId as string)),
    );

    const suppliersData = await this.db
      .select({
        id: schema.suppliers.id,
        name: schema.suppliers.name,
      })
      .from(schema.suppliers)
      .where(inArray(schema.suppliers.id, supplierIds));

    const docs = await this.db
      .select({
        shipmentId: schema.shipmentDocuments.shipmentId,
        documentType: schema.shipmentDocuments.documentType,
      })
      .from(schema.shipmentDocuments)
      .where(inArray(schema.shipmentDocuments.shipmentId, shipmentIds));

    const variances = await this.db
      .select({
        shipmentId: schema.costVariances.shipmentId,
        varianceEtb: schema.costVariances.varianceEtb,
      })
      .from(schema.costVariances)
      .where(
        and(
          inArray(schema.costVariances.shipmentId, shipmentIds),
          eq(schema.costVariances.varianceType, 'price'),
        ),
      );

    const grnItems = await this.db
      .select({
        shipmentId: schema.goodsReceipts.shipmentId,
        receivedQuantity: schema.goodsReceiptItems.receivedQuantity,
        rejectedQuantity: schema.goodsReceiptItems.rejectedQuantity,
      })
      .from(schema.goodsReceiptItems)
      .innerJoin(
        schema.goodsReceipts,
        eq(schema.goodsReceiptItems.grnId, schema.goodsReceipts.id),
      )
      .where(inArray(schema.goodsReceipts.shipmentId, shipmentIds));

    const performance = suppliersData.map((supp: any) => {
      const suppShipments = shipments.filter(
        (s: any) => s.supplierId === supp.id,
      );
      const suppShipmentIds = suppShipments.map((s: any) => s.id);

      let totalDaysLate = 0;
      let arrivalCount = 0;
      let onTimeCount = 0;
      for (const sh of suppShipments) {
        if (sh.eta && sh.actualArrivalDate) {
          const e = new Date(sh.eta).getTime();
          const a = new Date(sh.actualArrivalDate).getTime();
          const diffDays = (a - e) / (1000 * 3600 * 24);
          totalDaysLate += diffDays;
          arrivalCount++;
          if (diffDays <= 0) onTimeCount++;
        }
      }
      const avgDaysLate =
        arrivalCount > 0
          ? Number((totalDaysLate / arrivalCount).toFixed(2))
          : 0;
      const onTimePct =
        arrivalCount > 0
          ? Number(((onTimeCount / arrivalCount) * 100).toFixed(2))
          : 0;

      let totalDocScore = 0;
      for (const shId of suppShipmentIds) {
        const sDocs = docs.filter(
          (d: any) => d.shipmentId === shId && d.documentType !== 'other',
        );
        const uniqueDocs = new Set(sDocs.map((d: any) => d.documentType)).size;
        const score = Math.min((uniqueDocs / 8) * 100, 100);
        totalDocScore += score;
      }
      const avgDocScore =
        suppShipments.length > 0
          ? Number((totalDocScore / suppShipments.length).toFixed(2))
          : 0;

      const sVariances = variances.filter((v: any) =>
        suppShipmentIds.includes(v.shipmentId),
      );
      const totalCiVariance = sVariances.reduce(
        (acc: number, v: any) => acc + Number(v.varianceEtb || 0),
        0,
      );

      const sGrnItems = grnItems.filter((g: any) =>
        suppShipmentIds.includes(g.shipmentId),
      );
      let tReceived = 0;
      let tRejected = 0;
      for (const item of sGrnItems) {
        tReceived += Number(item.receivedQuantity || 0);
        tRejected += Number(item.rejectedQuantity || 0);
      }
      const rejectionRate =
        tReceived > 0 ? Number(((tRejected / tReceived) * 100).toFixed(2)) : 0;

      return {
        supplierId: supp.id,
        supplierName: supp.name,
        shipmentsEvaluated: suppShipments.length,
        leadTime: {
          deliveriesTracked: arrivalCount,
          averageDaysLate: avgDaysLate,
          onTimeArrivalPct: onTimePct,
        },
        documentCompletenessAvgScore: avgDocScore,
        ciPriceVarianceEtb: totalCiVariance,
        qualityRejectionRatePct: rejectionRate,
        totalReceivedQty: tReceived,
        totalRejectedQty: tRejected,
      };
    });

    return performance.sort(
      (a: any, b: any) => b.shipmentsEvaluated - a.shipmentsEvaluated,
    );
  }
}
