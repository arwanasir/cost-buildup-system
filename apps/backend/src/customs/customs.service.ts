import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateDeclarationItemDto } from './dto/update-declaration-item.dto';
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { CreateDeclarationDto } from './dto/create-declaration.dto';
import { DutyCalculatorService } from './duty-calculator.service';
import Decimal from 'decimal.js';

@Injectable()
export class CustomsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly dutyCalculatorService: DutyCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDeclaration(
    shipmentId: string,
    dto: CreateDeclarationDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx: any) => {
      // 1. Validate shipment
      const shipment = await tx.query.importShipments.findFirst({
        where: eq(schema.importShipments.id, shipmentId),
        with: {
          items: {
            with: {
              poLine: {
                with: {
                  item: true,
                },
              },
            },
          },
        },
      });

      if (!shipment) throw new NotFoundException('Shipment not found');

      // 2. Fetch tariffs for the HS codes associated with the shipment items
      const hsCodes = shipment.items
        .map((i: any) => i.poLine.item.defaultHsCode)
        .filter((c: any) => !!c);

      let tariffs: any[] = [];
      if (hsCodes.length > 0) {
        tariffs = await tx.query.tariffRates.findMany({
          where: inArray(schema.tariffRates.hsCode, hsCodes),
        });
      }

      const tariffMap = new Map(tariffs.map((t) => [t.hsCode, t]));
      const overridesMap = new Map(
        dto.itemOverrides?.map((o) => [o.shipmentItemId, o]) || [],
      );

      // 3. Prepare calculation variables
      let totalCifValueEtb = new Decimal(0);
      let totalDutyEtb = new Decimal(0);
      let totalVatEtb = new Decimal(0);
      let totalExciseEtb = new Decimal(0);
      let totalWithholdingEtb = new Decimal(0);
      let totalAssessmentEtb = new Decimal(0);

      const itemsToInsert = [];

      for (const shipItem of shipment.items) {
        const hsCode = shipItem.poLine.item.defaultHsCode;
        if (!hsCode) {
          throw new BadRequestException(
            `Item ${shipItem.poLine.item.itemCode} does not have an HS Code assigned.`,
          );
        }

        const override = overridesMap.get(shipItem.id);
        const tariff = tariffMap.get(hsCode);

        if (!tariff && !override?.isRateOverridden) {
          throw new BadRequestException(
            `No tariff rate found for HS Code ${hsCode} and no manual override provided.`,
          );
        }

        if (override?.isRateOverridden && !override?.overrideReason) {
          throw new BadRequestException(
            `Manual override for item ${shipItem.id} requires a mandatory override reason.`,
          );
        }

        const dutyRate = new Decimal(
          override?.isRateOverridden && override.dutyRate !== undefined
            ? override.dutyRate
            : tariff?.dutyRate || 0,
        );
        const exciseRate = new Decimal(
          override?.isRateOverridden && override.exciseRate !== undefined
            ? override.exciseRate
            : tariff?.exciseRate || 0,
        );
        const vatRate = new Decimal(
          override?.isRateOverridden && override.vatRate !== undefined
            ? override.vatRate
            : 15,
        );
        const withholdingRate = new Decimal(
          override?.isRateOverridden && override.withholdingRate !== undefined
            ? override.withholdingRate
            : tariff?.withholdingRate || 3,
        );

        // Get CIF
        const itemCif = new Decimal(
          await this.dutyCalculatorService.computeItemCif(shipItem.id),
        );

        const dutyEtb = itemCif.times(dutyRate).dividedBy(100);
        const exciseEtb = itemCif
          .plus(dutyEtb)
          .times(exciseRate)
          .dividedBy(100);
        const vatEtb = itemCif
          .plus(dutyEtb)
          .plus(exciseEtb)
          .times(vatRate)
          .dividedBy(100);
        const withholdingEtb = itemCif.times(withholdingRate).dividedBy(100);

        itemsToInsert.push({
          shipmentItemId: shipItem.id,
          hsCode,
          dutyStructure: tariff?.dutyStructure || 'ad_valorem',
          dutyRate: dutyRate.toString(),
          cifValueEtb: itemCif.toString(),
          dutyEtb: dutyEtb.toString(),
          vatRate: vatRate.toString(),
          vatEtb: vatEtb.toString(),
          exciseRate: exciseRate.toString(),
          exciseEtb: exciseEtb.toString(),
          withholdingRate: withholdingRate.toString(),
          withholdingEtb: withholdingEtb.toString(),
          isRateOverridden: override?.isRateOverridden || false,
          overrideReason: override?.overrideReason || null,
        });

        totalCifValueEtb = totalCifValueEtb.plus(itemCif);
        totalDutyEtb = totalDutyEtb.plus(dutyEtb);
        totalExciseEtb = totalExciseEtb.plus(exciseEtb);
        totalVatEtb = totalVatEtb.plus(vatEtb);
        totalWithholdingEtb = totalWithholdingEtb.plus(withholdingEtb);
        totalAssessmentEtb = totalAssessmentEtb
          .plus(dutyEtb)
          .plus(exciseEtb)
          .plus(vatEtb)
          .plus(withholdingEtb);
      }

      const [declaration] = await tx
        .insert(schema.customsDeclarations)
        .values({
          shipmentId,
          declarationNumber: dto.declarationNumber,
          declarationDate: dto.declarationDate,
          clearingAgent: dto.clearingAgent,
          cifValueEtb: totalCifValueEtb.toString(),
          totalDutyEtb: totalDutyEtb.toString(),
          totalVatEtb: totalVatEtb.toString(),
          totalExciseEtb: totalExciseEtb.toString(),
          totalWithholdingEtb: totalWithholdingEtb.toString(),
          totalAssessmentEtb: totalAssessmentEtb.toString(),
          status: 'draft',
          createdBy: userId,
        })
        .returning();

      const preparedItems = itemsToInsert.map((i) => ({
        ...i,
        declarationId: declaration.id,
      }));

      if (preparedItems.length > 0) {
        await tx.insert(schema.customsDeclarationItems).values(preparedItems);
      }

      return declaration;
    });
  }

  async findAll() {
    return this.db.select().from(schema.customsDeclarations);
  }

  async findOne(id: string) {
    const [declaration] = await this.db
      .select()
      .from(schema.customsDeclarations)
      .where(eq(schema.customsDeclarations.id, id));
    if (!declaration) throw new NotFoundException('Declaration not found');

    const items = await this.db
      .select()
      .from(schema.customsDeclarationItems)
      .where(eq(schema.customsDeclarationItems.declarationId, id));
    const payments = await this.db
      .select()
      .from(schema.dutyPayments)
      .where(eq(schema.dutyPayments.declarationId, id));

    return {
      ...declaration,
      items,
      payments,
    };
  }

  async getPayments(declarationId: string) {
    return this.db
      .select()
      .from(schema.dutyPayments)
      .where(eq(schema.dutyPayments.declarationId, declarationId));
  }

  async getTariffByHsCode(hsCode: string) {
    const [tariff] = await this.db
      .select()
      .from(schema.tariffRates)
      .where(eq(schema.tariffRates.hsCode, hsCode));
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  async overrideItemRate(
    declarationId: string,
    itemId: string,
    dto: UpdateDeclarationItemDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx: any) => {
      const [declaration] = await tx
        .select()
        .from(schema.customsDeclarations)
        .where(eq(schema.customsDeclarations.id, declarationId));
      if (!declaration) throw new NotFoundException('Declaration not found');
      if (declaration.status !== 'draft') {
        throw new BadRequestException(
          'Can only override rates while declaration is in draft status',
        );
      }

      const [item] = await tx
        .select()
        .from(schema.customsDeclarationItems)
        .where(eq(schema.customsDeclarationItems.id, itemId));
      if (!item) throw new NotFoundException('Item not found');
      if (item.declarationId !== declarationId)
        throw new BadRequestException(
          'Item does not belong to this declaration',
        );

      if (dto.isRateOverridden && !dto.overrideReason) {
        throw new BadRequestException(
          'An override reason is strictly required when manually overriding a rate.',
        );
      }

      // Recompute the duties
      const itemCif = new Decimal(item.cifValueEtb);
      const dutyRate = new Decimal(
        dto.isRateOverridden && dto.dutyRate !== undefined
          ? dto.dutyRate
          : item.dutyRate,
      );
      const exciseRate = new Decimal(
        dto.isRateOverridden && dto.exciseRate !== undefined
          ? dto.exciseRate
          : item.exciseRate,
      );
      const vatRate = new Decimal(
        dto.isRateOverridden && dto.vatRate !== undefined
          ? dto.vatRate
          : item.vatRate,
      );
      const withholdingRate = new Decimal(
        dto.isRateOverridden && dto.withholdingRate !== undefined
          ? dto.withholdingRate
          : item.withholdingRate,
      );

      const dutyEtb = itemCif.times(dutyRate).dividedBy(100);
      const exciseEtb = itemCif.plus(dutyEtb).times(exciseRate).dividedBy(100);
      const vatEtb = itemCif
        .plus(dutyEtb)
        .plus(exciseEtb)
        .times(vatRate)
        .dividedBy(100);
      const withholdingEtb = itemCif.times(withholdingRate).dividedBy(100);

      await tx
        .update(schema.customsDeclarationItems)
        .set({
          dutyRate: dutyRate.toString(),
          exciseRate: exciseRate.toString(),
          vatRate: vatRate.toString(),
          withholdingRate: withholdingRate.toString(),
          dutyEtb: dutyEtb.toString(),
          exciseEtb: exciseEtb.toString(),
          vatEtb: vatEtb.toString(),
          withholdingEtb: withholdingEtb.toString(),
          isRateOverridden: dto.isRateOverridden,
          overrideReason: dto.overrideReason || null,
        })
        .where(eq(schema.customsDeclarationItems.id, itemId));

      // Re-sum header
      const allItems = await tx
        .select()
        .from(schema.customsDeclarationItems)
        .where(eq(schema.customsDeclarationItems.declarationId, declarationId));
      let totalDuty = new Decimal(0);
      let totalVat = new Decimal(0);
      let totalExcise = new Decimal(0);
      let totalWithholding = new Decimal(0);

      for (const i of allItems) {
        totalDuty = totalDuty.plus(i.dutyEtb);
        totalVat = totalVat.plus(i.vatEtb);
        totalExcise = totalExcise.plus(i.exciseEtb);
        totalWithholding = totalWithholding.plus(i.withholdingEtb);
      }
      const totalAssessment = totalDuty
        .plus(totalExcise)
        .plus(totalVat)
        .plus(totalWithholding);

      await tx
        .update(schema.customsDeclarations)
        .set({
          totalDutyEtb: totalDuty.toString(),
          totalVatEtb: totalVat.toString(),
          totalExciseEtb: totalExcise.toString(),
          totalWithholdingEtb: totalWithholding.toString(),
          totalAssessmentEtb: totalAssessment.toString(),
        })
        .where(eq(schema.customsDeclarations.id, declarationId));

      return { success: true };
    });
  }

  async assessDeclaration(declarationId: string, userId: string) {
    return this.db.transaction(async (tx: any) => {
      const [declaration] = await tx
        .select()
        .from(schema.customsDeclarations)
        .where(eq(schema.customsDeclarations.id, declarationId));
      if (!declaration) throw new NotFoundException('Declaration not found');
      const items = await tx
        .select()
        .from(schema.customsDeclarationItems)
        .where(eq(schema.customsDeclarationItems.declarationId, declarationId));
      declaration.items = items;

      if (!declaration) throw new NotFoundException('Declaration not found');
      if (declaration.status !== 'draft') {
        throw new BadRequestException(
          'Only draft declarations can be assessed',
        );
      }

      // 1. Fetch categories
      const categories = await tx.query.costCategories.findMany();
      const catMap = new Map(categories.map((c: any) => [c.code, c.id]));

      const dutyCatId = catMap.get('CUSTOMS_DUTY') || catMap.get('DUTY');
      const vatCatId = catMap.get('IMPORT_VAT') || catMap.get('VAT');
      const otherCatId = catMap.get('OTHER');

      if (!dutyCatId || !vatCatId || !otherCatId) {
        throw new BadRequestException(
          'Required cost categories (DUTY, VAT, OTHER) are missing from the system.',
        );
      }

      // 2. Clear any existing customs cost entries for this shipment (upsert logic)
      await tx
        .delete(schema.importCostEntries)
        .where(
          and(
            eq(schema.importCostEntries.shipmentId, declaration.shipmentId),
            eq(schema.importCostEntries.source, 'customs'),
          ),
        );

      const costEntriesToInsert = [];

      for (const item of declaration.items) {
        if (Number(item.dutyEtb) > 0) {
          costEntriesToInsert.push({
            shipmentId: declaration.shipmentId,
            costCategoryId: dutyCatId,
            amountEtb: item.dutyEtb,
            allocationMethod: 'item_specific',
            isItemSpecific: true,
            shipmentItemId: item.shipmentItemId,
            source: 'customs',
            sourceRefId: declaration.id,
            createdBy: userId,
          });
        }

        if (Number(item.vatEtb) > 0) {
          costEntriesToInsert.push({
            shipmentId: declaration.shipmentId,
            costCategoryId: vatCatId,
            amountEtb: item.vatEtb,
            allocationMethod: 'item_specific',
            isItemSpecific: true,
            shipmentItemId: item.shipmentItemId,
            source: 'customs',
            sourceRefId: declaration.id,
            createdBy: userId,
          });
        }

        if (Number(item.exciseEtb) > 0) {
          costEntriesToInsert.push({
            shipmentId: declaration.shipmentId,
            costCategoryId: otherCatId,
            costSubcategory: 'Excise Tax',
            amountEtb: item.exciseEtb,
            allocationMethod: 'item_specific',
            isItemSpecific: true,
            shipmentItemId: item.shipmentItemId,
            source: 'customs',
            sourceRefId: declaration.id,
            createdBy: userId,
          });
        }
      }

      if (costEntriesToInsert.length > 0) {
        await tx.insert(schema.importCostEntries).values(costEntriesToInsert);
      }

      // 3. Update declaration status
      const [updated] = await tx
        .update(schema.customsDeclarations)
        .set({ status: 'assessed' })
        .where(eq(schema.customsDeclarations.id, declarationId))
        .returning();

      return updated;
    });
  }

  async releaseDeclaration(
    declarationId: string,
    dto: CreateReleaseDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx: any) => {
      // 1. Get declaration
      const declaration = await tx.query.customsDeclarations.findFirst({
        where: eq(schema.customsDeclarations.id, declarationId),
      });

      if (!declaration) throw new NotFoundException('Declaration not found');
      if (declaration.status !== 'paid') {
        throw new BadRequestException('Only paid declarations can be released');
      }

      // 2. Update Declaration Status
      const [updatedDeclaration] = await tx
        .update(schema.customsDeclarations)
        .set({
          status: 'released',
          releaseDate: dto.releaseDate,
          releaseReference: dto.releaseReference,
          customsOfficer: dto.customsOfficer,
        })
        .where(eq(schema.customsDeclarations.id, declarationId))
        .returning();

      // 3. Update Shipment Status
      await tx
        .update(schema.importShipments)
        .set({
          status: 'cleared',
          customsReleaseDate: dto.releaseDate,
          customsReleaseRef: dto.releaseReference,
        })
        .where(eq(schema.importShipments.id, declaration.shipmentId));

      // 4. Emit event (FR-05.3, BR01A)
      this.eventEmitter.emit('customs.released', {
        declarationId,
        shipmentId: declaration.shipmentId,
        releaseDate: dto.releaseDate,
        releaseReference: dto.releaseReference,
      });

      return updatedDeclaration;
    });
  }
}
