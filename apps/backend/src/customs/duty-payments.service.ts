import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreateDutyPaymentDto } from './dto/create-duty-payment.dto';
import Decimal from 'decimal.js';

@Injectable()
export class DutyPaymentsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async record(
    declarationId: string,
    dto: CreateDutyPaymentDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx: any) => {
      // 1. Get declaration
      const declaration = await tx.query.customsDeclarations.findFirst({
        where: eq(schema.customsDeclarations.id, declarationId),
      });

      if (!declaration) throw new NotFoundException('Declaration not found');
      if (declaration.status !== 'assessed') {
        throw new BadRequestException('Only assessed declarations can be paid');
      }

      const totalAssessed = new Decimal(declaration.totalAssessmentEtb);
      const amountPaid = new Decimal(dto.amountPaidEtb);

      // Compute variance (Amount Paid - Total Assessed)
      const variance = amountPaid.minus(totalAssessed);

      // Variance % = abs(variance) / totalAssessed * 100
      const variancePct = totalAssessed.isZero()
        ? new Decimal(0)
        : variance.abs().dividedBy(totalAssessed).times(100);

      // 2. Fetch policy setting for tolerance
      const policy = await tx.query.policySettings.findFirst({
        where: eq(schema.policySettings.key, 'duty_payment_tolerance_pct'),
      });

      // Fallback to 1% if not set
      const tolerance = new Decimal(policy?.valueNumeric || 1);

      const isFlagged = variancePct.greaterThan(tolerance);

      // 3. Insert Duty Payment
      const [payment] = await tx
        .insert(schema.dutyPayments)
        .values({
          declarationId,
          paymentDate: dto.paymentDate,
          bankReference: dto.bankReference || null,
          amountPaidEtb: amountPaid.toString(),
          receiptNumber: dto.receiptNumber,
          varianceVsAssessedEtb: variance.toString(), // Raw monetary variance
          isFlagged,
          createdBy: userId,
        })
        .returning();

      // 4. Update Declaration Status
      await tx
        .update(schema.customsDeclarations)
        .set({ status: 'paid' })
        .where(eq(schema.customsDeclarations.id, declarationId));

      // 5. Create Journal Entry in ERP Sync Log (SRS 7.2)
      await tx.insert(schema.erpSyncLog).values({
        entityType: 'journal_entry',
        entityId: payment.id,
        payload: {
          journal_type: 'DUTY_PAYMENT',
          debitAccount: 'Customs Duty Expense',
          creditAccount: 'Bank Account',
          amount: amountPaid.toString(),
          currency: 'ETB',
          reference: dto.receiptNumber,
          date: dto.paymentDate,
          memo: `Duty payment for Customs Declaration ${declaration.declarationNumber}`,
        },
      });

      return payment;
    });
  }
}
