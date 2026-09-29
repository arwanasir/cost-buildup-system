import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '@/db';
import { DrizzleDB } from '@/db';
import { CreateLcDto } from './dto/create-lc.dto';
import { AmendLcDto } from './dto/amend-lc.dto';
import { AddBankChargeDto } from './dto/add-bank-charge.dto';
import * as schema from '@/db/schema';
import { inArray, eq, and, lte } from 'drizzle-orm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Decimal from 'decimal.js';

@Injectable()
export class LettersOfCreditService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createLcDto: CreateLcDto, userId: string) {
    return this.db.transaction(async (tx) => {
      // 1. Fetch all POs
      const pos = await tx.query.importPurchaseOrders.findMany({
        where: inArray(schema.importPurchaseOrders.id, createLcDto.poIds),
      });

      if (pos.length !== createLcDto.poIds.length) {
        throw new BadRequestException('One or more POs not found');
      }

      // 2. Validate all POs belong to same supplier, are approved, and BR08: lcId is null
      const supplierId = pos[0].supplierId;
      for (const po of pos) {
        if (po.supplierId !== supplierId) {
          throw new BadRequestException(
            'All POs must belong to the same supplier',
          );
        }
        if (po.status !== 'approved') {
          throw new BadRequestException(
            `Purchase Order ${po.id} is not in approved status`,
          );
        }
        if (po.lcId) {
          throw new BadRequestException(
            `Purchase Order ${po.id} already has an LC attached (BR08)`,
          );
        }
      }

      // 3. Create LC Header
      const [lc] = await tx
        .insert(schema.lettersOfCredit)
        .values({
          lcNumber: createLcDto.lcNumber,
          supplierId,
          issuingBank: createLcDto.issuingBank,
          advisingBank: createLcDto.advisingBank,
          lcType: createLcDto.lcType as any,
          amountForeign: createLcDto.amountForeign.toString(),
          currency: createLcDto.currency,
          fxRate: createLcDto.fxRate.toString(),
          amountEtb: new Decimal(createLcDto.amountForeign)
            .times(createLcDto.fxRate)
            .toDecimalPlaces(4)
            .toString(),
          openingDate: createLcDto.openingDate,
          expiryDate: createLcDto.expiryDate,
          lastShipmentDate: createLcDto.lastShipmentDate,
          presentationPeriodDays: createLcDto.presentationPeriodDays,
          incoterm: createLcDto.incoterm,
          partialShipmentAllowed: createLcDto.partialShipmentAllowed,
          transhipmentAllowed: createLcDto.transhipmentAllowed,
          specialConditions: createLcDto.specialConditions,
          status: 'applied',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // 4. Attach Documents
      if (
        createLcDto.requiredDocuments &&
        createLcDto.requiredDocuments.length > 0
      ) {
        const docs = createLcDto.requiredDocuments.map((doc) => ({
          lcId: lc.id,
          documentType: doc.documentType as any,
          isRequired: doc.isRequired ?? true,
          notes: doc.notes,
        }));
        await tx.insert(schema.lcRequiredDocuments).values(docs);
      }

      // 5. Update POs with lcId and transition to lc_applied
      await tx
        .update(schema.importPurchaseOrders)
        .set({
          lcId: lc.id,
          status: 'lc_applied',
          updatedBy: userId,
        })
        .where(inArray(schema.importPurchaseOrders.id, createLcDto.poIds));

      return lc;
    });
  }

  async gmApprove(lcId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const lc = await tx.query.lettersOfCredit.findFirst({
        where: eq(schema.lettersOfCredit.id, lcId),
      });
      if (!lc) throw new NotFoundException(`LC ${lcId} not found`);
      if (lc.status !== 'applied')
        throw new BadRequestException(
          `LC is in ${lc.status} status and cannot be GM approved`,
        );
      if (lc.gmApprovedBy)
        throw new BadRequestException(`LC is already GM approved`);

      const [updated] = await tx
        .update(schema.lettersOfCredit)
        .set({ gmApprovedBy: userId, updatedBy: userId })
        .where(eq(schema.lettersOfCredit.id, lcId))
        .returning();

      return updated;
    });
  }
  async amend(lcId: string, amendLcDto: AmendLcDto, userId: string) {
    return this.db.transaction(async (tx) => {
      const lc = await tx.query.lettersOfCredit.findFirst({
        where: eq(schema.lettersOfCredit.id, lcId),
      });

      if (!lc) {
        throw new NotFoundException(`LC ${lcId} not found`);
      }

      if (['applied', 'settled'].includes(lc.status)) {
        throw new BadRequestException(`Cannot amend LC in ${lc.status} status`);
      }

      const existingAmendments = await tx.query.lcAmendments.findMany({
        where: eq(schema.lcAmendments.lcId, lcId),
      });
      const amendmentNo = existingAmendments.length + 1;

      if (amendLcDto.newExpiryDate && amendLcDto.newLastShipmentDate) {
        if (
          new Date(amendLcDto.newLastShipmentDate) >
          new Date(amendLcDto.newExpiryDate)
        ) {
          throw new BadRequestException(
            'newLastShipmentDate must be before newExpiryDate',
          );
        }
      }

      const [amendment] = await tx
        .insert(schema.lcAmendments)
        .values({
          lcId,
          amendmentNo,
          amountDelta: amendLcDto.amountDelta
            ? amendLcDto.amountDelta.toString()
            : '0.0000',
          newExpiryDate: amendLcDto.newExpiryDate,
          newLastShipmentDate: amendLcDto.newLastShipmentDate,
          description: amendLcDto.description,
        })
        .returning();

      if (amendLcDto.amendmentFeeEtb) {
        const [charge] = await tx
          .insert(schema.lcBankCharges)
          .values({
            lcId,
            chargeType: 'amendment_fee',
            amountEtb: amendLcDto.amendmentFeeEtb.toString(),
            chargeDate: new Date().toISOString().split('T')[0],
            createdBy: userId,
            updatedBy: userId,
          })
          .returning();

        this.eventEmitter.emit('lc.charge.recorded', {
          lcId,
          chargeId: charge.id,
          chargeType: charge.chargeType,
          amountEtb: charge.amountEtb,
          issuingBank: lc.issuingBank,
        });
      }

      const updatePayload: any = {
        status: 'amended',
        updatedBy: userId,
      };

      if (amendLcDto.newExpiryDate) {
        updatePayload.expiryDate = amendLcDto.newExpiryDate;
      }
      if (amendLcDto.newLastShipmentDate) {
        updatePayload.lastShipmentDate = amendLcDto.newLastShipmentDate;
      }
      if (amendLcDto.amountDelta) {
        const currentForeign = new Decimal(lc.amountForeign);
        const newForeign = currentForeign.plus(amendLcDto.amountDelta);
        const currentFx = new Decimal(lc.fxRate);

        updatePayload.amountForeign = newForeign.toDecimalPlaces(4).toString();
        updatePayload.amountEtb = newForeign
          .times(currentFx)
          .toDecimalPlaces(4)
          .toString();
      }

      const [updated] = await tx
        .update(schema.lettersOfCredit)
        .set(updatePayload)
        .where(eq(schema.lettersOfCredit.id, lcId))
        .returning();

      return { lc: updated, amendment };
    });
  }
  async findAll(query: {
    status?: string;
    supplierId?: string;
    expiringWithinDays?: number;
  }) {
    const conditions: any[] = [];

    if (query.status) {
      conditions.push(eq(schema.lettersOfCredit.status, query.status as any));
    }
    if (query.supplierId) {
      conditions.push(eq(schema.lettersOfCredit.supplierId, query.supplierId));
    }
    if (query.expiringWithinDays) {
      const targetDate = new Date();
      targetDate.setDate(
        targetDate.getDate() + Number(query.expiringWithinDays),
      );
      conditions.push(
        lte(
          schema.lettersOfCredit.expiryDate,
          targetDate.toISOString().split('T')[0],
        ),
      );
    }

    return this.db.query.lettersOfCredit.findMany({
      where: conditions.length > 0 ? (and as any)(...conditions) : undefined,
    });
  }

  async findOne(lcId: string) {
    const lc = await this.db.query.lettersOfCredit.findFirst({
      where: eq(schema.lettersOfCredit.id, lcId),
    });
    if (!lc) throw new NotFoundException(`LC ${lcId} not found`);

    const documents = await this.db.query.lcRequiredDocuments.findMany({
      where: eq(schema.lcRequiredDocuments.lcId, lcId),
    });
    const charges = await this.db.query.lcBankCharges.findMany({
      where: eq(schema.lcBankCharges.lcId, lcId),
    });
    const amendments = await this.db.query.lcAmendments.findMany({
      where: eq(schema.lcAmendments.lcId, lcId),
    });

    return { ...lc, documents, charges, amendments };
  }

  async update(lcId: string, updateLcDto: any, userId: string) {
    const lc = await this.db.query.lettersOfCredit.findFirst({
      where: eq(schema.lettersOfCredit.id, lcId),
    });
    if (!lc) throw new NotFoundException(`LC ${lcId} not found`);

    const [updated] = await this.db
      .update(schema.lettersOfCredit)
      .set({ ...updateLcDto, updatedBy: userId })
      .where(eq(schema.lettersOfCredit.id, lcId))
      .returning();

    return updated;
  }

  async getCharges(lcId: string) {
    return this.db.query.lcBankCharges.findMany({
      where: eq(schema.lcBankCharges.lcId, lcId),
    });
  }

  async markDocumentReceived(lcId: string, docId: string, isReceived: boolean) {
    const [updated] = await this.db
      .update(schema.lcRequiredDocuments)
      .set({ isReceived })
      .where(
        (and as any)(
          eq(schema.lcRequiredDocuments.id, docId),
          eq(schema.lcRequiredDocuments.lcId, lcId),
        ),
      )
      .returning();

    if (!updated)
      throw new NotFoundException(`Document ${docId} not found on LC ${lcId}`);
    return updated;
  }
}
