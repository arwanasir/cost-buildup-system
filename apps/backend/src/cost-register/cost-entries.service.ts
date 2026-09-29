import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { CreateCostEntryDto } from './dto/create-cost-entry.dto';
import { UpdateCostEntryDto } from './dto/update-cost-entry.dto';
import { MarkActualCostEntryDto } from './dto/mark-actual-cost-entry.dto';
import { ReverseCostEntryDto } from './dto/reverse-cost-entry.dto';
import { StorageService } from '@/storage/storage.service';
import { FxToleranceService } from './fx-tolerance.service';

@Injectable()
export class CostEntriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly fxToleranceService: FxToleranceService,
  ) {}

  async create(
    dto: CreateCostEntryDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    return this.db.transaction(async (tx: any) => {
      // 1. Verify Shipment if provided
      if (dto.shipmentId) {
        const [shipment] = await tx
          .select()
          .from(schema.importShipments)
          .where(eq(schema.importShipments.id, dto.shipmentId));
        if (!shipment) throw new NotFoundException('Shipment not found');
        if (shipment.isFinalised) {
          throw new BadRequestException(
            'Cannot add cost entries to a finalized shipment',
          );
        }
      }

      // 2. Fetch Category for default allocation method
      const [category] = await tx
        .select()
        .from(schema.costCategories)
        .where(eq(schema.costCategories.id, dto.costCategoryId));
      if (!category) throw new NotFoundException('Cost category not found');

      // 3. Check FX Tolerance
      const fxResult = await this.fxToleranceService.checkTolerance(
        dto.currency,
        dto.fxRate,
        tx,
      );

      // 4. Compute Amount ETB
      let amountEtb: string;
      if (dto.currency.toUpperCase() === 'ETB' && dto.amountEtb !== undefined) {
        amountEtb = new Decimal(dto.amountEtb).toString();
      } else {
        amountEtb = new Decimal(dto.amountForeign).times(dto.fxRate).toString();
      }

      // 5. Upload Attachment
      let attachmentKey = dto.attachment || null;
      if (file) {
        const key = `cost-entries/${Date.now()}-${file.originalname}`;
        attachmentKey = await this.storageService.upload(
          file.buffer,
          key,
          file.mimetype,
        );
      }

      // 6. Insert Entry
      const [entry] = await tx
        .insert(schema.importCostEntries)
        .values({
          shipmentId: dto.shipmentId,
          costCategoryId: dto.costCategoryId,
          costSubcategory: dto.costSubcategory || null,
          providerName: dto.providerName,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate,
          amountForeign: dto.amountForeign.toString(),
          currency: dto.currency.toUpperCase(),
          fxRate: dto.fxRate.toString(),
          amountEtb,
          allocationMethod:
            dto.allocationMethod || category.defaultAllocationMethod,
          isEstimated: dto.isEstimated,
          isItemSpecific: dto.allocationMethod === 'item_specific',
          attachmentKey,
          hasFxWarning: fxResult.hasFxWarning,
          fxWarningMessage: fxResult.fxWarningMessage || null,
          source: 'manual',
          createdBy: userId,
        })
        .returning();

      return entry;
    });
  }

  async update(id: string, dto: UpdateCostEntryDto) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch entry
      const [entry] = await tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.id, id));
      if (!entry) throw new NotFoundException('Cost entry not found');

      // 2. Check if shipment is finalised
      if (entry.shipmentId) {
        const [shipment] = await tx
          .select()
          .from(schema.importShipments)
          .where(eq(schema.importShipments.id, entry.shipmentId));
        if (shipment?.isFinalised) {
          throw new BadRequestException(
            'Cannot update a cost entry on a finalized shipment',
          );
        }
      }

      // 3. BR10: fx_rate is strictly immutable
      if (dto.fxRate !== undefined) {
        const dbFxRate = new Decimal(entry.fxRate);
        const dtoFxRate = new Decimal(dto.fxRate);
        if (!dbFxRate.equals(dtoFxRate)) {
          throw new BadRequestException(
            'FX Rate is immutable once saved (BR10 / FR-08.3)',
          );
        }
      }

      // 4. Handle Amounts and Recalculations
      let newAmountEtb = entry.amountEtb;
      let newAmountForeign = entry.amountForeign;

      if (dto.amountForeign !== undefined || dto.amountEtb !== undefined) {
        const currentFx = new Decimal(entry.fxRate);

        if (entry.currency.toUpperCase() === 'ETB') {
          // If ETB, Foreign and ETB are the same
          if (dto.amountEtb !== undefined) {
            newAmountEtb = new Decimal(dto.amountEtb).toString();
            newAmountForeign = newAmountEtb;
          } else if (dto.amountForeign !== undefined) {
            newAmountForeign = new Decimal(dto.amountForeign).toString();
            newAmountEtb = newAmountForeign;
          }
        } else {
          // If not ETB, derive ETB from foreign via immutable FX rate
          if (dto.amountForeign !== undefined) {
            newAmountForeign = new Decimal(dto.amountForeign).toString();
            newAmountEtb = new Decimal(dto.amountForeign)
              .times(currentFx)
              .toString();
          }
        }
      }

      // 5. Build dynamic updates object
      const updates: any = {
        amountForeign: newAmountForeign,
        amountEtb: newAmountEtb,
      };

      if (dto.costSubcategory !== undefined)
        updates.costSubcategory = dto.costSubcategory;
      if (dto.providerName !== undefined)
        updates.providerName = dto.providerName;
      if (dto.invoiceNumber !== undefined)
        updates.invoiceNumber = dto.invoiceNumber;
      if (dto.invoiceDate !== undefined) updates.invoiceDate = dto.invoiceDate;

      // 6. Execute update
      const [updatedEntry] = await tx
        .update(schema.importCostEntries)
        .set(updates)
        .where(eq(schema.importCostEntries.id, id))
        .returning();

      return updatedEntry;
    });
  }

  async markActual(id: string, dto: MarkActualCostEntryDto, userId: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch entry
      const [entry] = await tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.id, id));
      if (!entry) throw new NotFoundException('Cost entry not found');

      if (!entry.isEstimated) {
        throw new BadRequestException('Cost entry is already marked as actual');
      }

      // 2. Check if shipment is finalised
      if (entry.shipmentId) {
        const [shipment] = await tx
          .select()
          .from(schema.importShipments)
          .where(eq(schema.importShipments.id, entry.shipmentId));
        if (shipment?.isFinalised) {
          throw new BadRequestException(
            'Cannot modify a cost entry on a finalized shipment',
          );
        }
      }

      // 3. Capture the original estimated ETB amount
      const previousEstimateEtb = entry.amountEtb;

      // 4. Calculate new amounts using the natively locked immutable FX rate
      const currentFx = new Decimal(entry.fxRate);
      let newAmountEtb: string;
      let newAmountForeign: string;

      if (entry.currency.toUpperCase() === 'ETB') {
        if (dto.amountEtb !== undefined) {
          newAmountEtb = new Decimal(dto.amountEtb).toString();
          newAmountForeign = newAmountEtb;
        } else {
          newAmountForeign = new Decimal(dto.amountForeign).toString();
          newAmountEtb = newAmountForeign;
        }
      } else {
        newAmountForeign = new Decimal(dto.amountForeign).toString();
        newAmountEtb = new Decimal(dto.amountForeign)
          .times(currentFx)
          .toString();
      }

      // 5. Update and convert to actual
      const [updatedEntry] = await tx
        .update(schema.importCostEntries)
        .set({
          isEstimated: false,
          previousEstimateEtb: previousEstimateEtb,
          providerName: dto.providerName,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate,
          amountForeign: newAmountForeign,
          amountEtb: newAmountEtb,
          estimateAcceptedBy: userId, // Traceability
        })
        .where(eq(schema.importCostEntries.id, id))
        .returning();

      return updatedEntry;
    });
  }

  async reverse(id: string, dto: ReverseCostEntryDto, userId: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch the original entry
      const [entry] = await tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.id, id));
      if (!entry) throw new NotFoundException('Cost entry not found');

      // 2. Validate it's not already reversed
      if (entry.reversedByEntryId) {
        throw new BadRequestException(
          'This cost entry has already been reversed.',
        );
      }

      // 3. Prevent reversing a reversal (optional but good practice)
      if (entry.reversesEntryId) {
        throw new BadRequestException(
          'Cannot reverse an entry that is itself a reversal.',
        );
      }

      // 4. Calculate negative mirrored amounts
      const negativeAmountForeign = new Decimal(entry.amountForeign)
        .negated()
        .toString();
      const negativeAmountEtb = new Decimal(entry.amountEtb)
        .negated()
        .toString();

      // 5. Insert the mirror reversal entry
      const [reversalEntry] = await tx
        .insert(schema.importCostEntries)
        .values({
          shipmentId: entry.shipmentId,
          costCategoryId: entry.costCategoryId,
          costSubcategory: entry.costSubcategory,
          providerName: entry.providerName,
          invoiceNumber: entry.invoiceNumber
            ? `REV-${entry.invoiceNumber}`
            : 'REVERSAL',
          invoiceDate: new Date().toISOString().split('T')[0], // Use today's date for reversal posting
          amountForeign: negativeAmountForeign,
          currency: entry.currency,
          fxRate: entry.fxRate,
          amountEtb: negativeAmountEtb,
          allocationMethod: entry.allocationMethod,
          isEstimated: entry.isEstimated,
          isItemSpecific: entry.isItemSpecific,
          shipmentItemId: entry.shipmentItemId,
          source: entry.source,
          sourceRefId: entry.sourceRefId,
          reversesEntryId: entry.id, // Point back to original
          reversalReason: dto.reason,
          createdBy: userId,
          hasFxWarning: false,
        })
        .returning();

      // 6. Mark the original entry as reversed
      await tx
        .update(schema.importCostEntries)
        .set({ reversedByEntryId: reversalEntry.id })
        .where(eq(schema.importCostEntries.id, entry.id));

      return reversalEntry;
    });
  }

  async delete(id: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch entry
      const [entry] = await tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.id, id));
      if (!entry) throw new NotFoundException('Cost entry not found');

      // 2. Prevent deletion of system-sourced entries
      if (entry.source !== 'manual') {
        throw new BadRequestException(
          'System-sourced entries are immutable and cannot be deleted.',
        );
      }

      // 3. Prevent deletion if shipment is finalised
      if (entry.shipmentId) {
        const [shipment] = await tx
          .select()
          .from(schema.importShipments)
          .where(eq(schema.importShipments.id, entry.shipmentId));
        if (shipment?.isFinalised) {
          throw new BadRequestException(
            'Cannot delete a cost entry on a finalized shipment.',
          );
        }
      }

      // 4. Prevent deletion of reversed entries or reversal entries (optional but keeps ledger clean)
      if (entry.reversedByEntryId || entry.reversesEntryId) {
        throw new BadRequestException(
          'Cannot hard-delete reversed or reversal entries. They are locked to the ledger.',
        );
      }

      // 5. Delete the entry
      await tx
        .delete(schema.importCostEntries)
        .where(eq(schema.importCostEntries.id, id));

      return { success: true };
    });
  }

  async acceptEstimates(
    shipmentId: string,
    userId: string,
    justification: string,
  ) {
    if (!justification || justification.trim() === '') {
      throw new BadRequestException(
        'Mandatory estimate_justification is required to accept estimates (BR05 exception).',
      );
    }

    const updated = await this.db
      .update(schema.importCostEntries)
      .set({
        estimateAcceptedBy: userId,
        estimateJustification: justification,
      })
      .where(
        and(
          eq(schema.importCostEntries.shipmentId, shipmentId),
          eq(schema.importCostEntries.isEstimated, true),
          isNull(schema.importCostEntries.reversedByEntryId),
          isNull(schema.importCostEntries.estimateAcceptedBy),
        ),
      )
      .returning();

    return { acceptedCount: updated.length };
  }
}
