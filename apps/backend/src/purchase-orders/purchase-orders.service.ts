import {
  UpdatePurchaseOrderDto,
  UpdatePoLineDto,
} from './dto/update-purchase-order.dto';
import { CreatePoLineDto } from './dto/create-purchase-order.dto';
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { NumberingService } from '@/core/numbering/numbering.service';
import { PoCalculationService } from './po-calculation.service';
import { ApprovalRoutingService } from './approval-routing.service';
import { eq, inArray, and, gte, lte } from 'drizzle-orm';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly numberingService: NumberingService,
    private readonly poCalculationService: PoCalculationService,
    private readonly approvalRoutingService: ApprovalRoutingService,
  ) {}

  async create(createPoDto: CreatePurchaseOrderDto, userId: string) {
    return this.db.transaction(async (tx) => {
      // 0. Verify active supplier (FR-01.1)
      const supplier = await tx.query.suppliers.findFirst({
        where: eq(schema.suppliers.id, createPoDto.supplierId),
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${createPoDto.supplierId} not found`,
        );
      }

      if (!supplier.isActive) {
        throw new BadRequestException(
          'Cannot create a Purchase Order for an inactive supplier (FR-01.1)',
        );
      }

      // 1. Generate PO Number
      const poNumber = await this.numberingService.generateNextNumber('po');

      // 2. Fetch items to get defaultHsCodes
      const itemIds = createPoDto.lines.map((l) => l.itemId);
      const itemsList = await tx.query.items.findMany({
        where: inArray(schema.items.id, itemIds),
      });
      const itemMap = new Map<string, any>(itemsList.map((i) => [i.id, i]));

      // 3. Fetch tariffs for those hsCodes
      const hsCodes = createPoDto.lines
        .map((l) => l.hsCode || itemMap.get(l.itemId)?.defaultHsCode)
        .filter((code): code is string => !!code);

      const tariffsList =
        hsCodes.length > 0
          ? await tx.query.tariffRates.findMany({
              where: inArray(schema.tariffRates.hsCode, hsCodes),
            })
          : [];
      const tariffMap = new Map<string, any>(
        tariffsList.map((t) => [t.hsCode, t]),
      );

      // 4. Resolve duty rates for calculation payload
      const linesForCalc = createPoDto.lines.map((line) => {
        const item = itemMap.get(line.itemId);
        const resolvedHsCode = line.hsCode || item?.defaultHsCode;

        let dutyRate = line.estimatedDutyRate;
        if (dutyRate === undefined && resolvedHsCode) {
          const tariff = tariffMap.get(resolvedHsCode);
          if (tariff) {
            dutyRate = Number(tariff.dutyRate);
          }
        }

        return {
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          estimatedDutyRate: dutyRate ?? 0,
          resolvedHsCode,
        };
      });

      // 5. Delegate heavily fractional calculation to PoCalculationService
      const calcTotals = this.poCalculationService.calculateTotals({
        fxRate: createPoDto.fxRate,
        estimatedFreightEtb: createPoDto.estimatedFreightEtb,
        estimatedInsuranceEtb: createPoDto.estimatedInsuranceEtb,
        estimatedOtherChargesEtb: createPoDto.estimatedOtherChargesEtb,
        lines: linesForCalc,
      });

      // 6. Insert PO header
      const [po] = await tx
        .insert(schema.importPurchaseOrders)
        .values({
          poNumber,
          poDate: createPoDto.poDate,
          supplierId: createPoDto.supplierId,
          incoterm: createPoDto.incoterm,
          countryOfOrigin: createPoDto.countryOfOrigin,
          estimatedShipmentDate: createPoDto.estimatedShipmentDate,
          estimatedArrivalDate: createPoDto.estimatedArrivalDate,
          currency: createPoDto.currency,
          fxRate: createPoDto.fxRate.toString(),
          portOfLoading: createPoDto.portOfLoading,
          portOfDestination: createPoDto.portOfDestination,
          totalValueForeign: calcTotals.totalValueForeign,
          totalValueEtb: calcTotals.totalValueEtb,
          estimatedFreightEtb: createPoDto.estimatedFreightEtb?.toString(),
          estimatedInsuranceEtb: createPoDto.estimatedInsuranceEtb?.toString(),
          estimatedOtherChargesEtb:
            createPoDto.estimatedOtherChargesEtb?.toString(),
          estimatedDutyEtb: calcTotals.estimatedDutyEtb,
          notes: createPoDto.notes,
          status: 'draft',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // 7. Insert PO lines
      const linesToInsert = createPoDto.lines.map((line, index) => {
        const resolvedDuty = linesForCalc[index].estimatedDutyRate;
        const lineCalc = calcTotals.lines[index];

        return {
          poId: po.id,
          lineNo: index + 1,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity.toString(),
          unitOfMeasure: line.unitOfMeasure,
          unitPrice: line.unitPrice.toString(),
          totalLineValue: lineCalc.totalLineValue,
          hsCode: linesForCalc[index].resolvedHsCode,
          estimatedDutyRate: resolvedDuty.toString(),
        };
      });

      const insertedLines = await tx
        .insert(schema.poLines)
        .values(linesToInsert)
        .returning();

      return {
        ...po,
        lines: insertedLines,
      };
    });
  }
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: string,
    supplierId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (status) {
      conditions.push(eq(schema.importPurchaseOrders.status, status as any));
    }

    if (supplierId) {
      conditions.push(eq(schema.importPurchaseOrders.supplierId, supplierId));
    }

    if (startDate) {
      conditions.push(gte(schema.importPurchaseOrders.poDate, startDate)); // Using raw sql or standard gte
    }

    if (endDate) {
      conditions.push(lte(schema.importPurchaseOrders.poDate, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db.query.importPurchaseOrders.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (pos, { desc }) => [desc(pos.createdAt)],
      with: {
        suppliers: true,
      },
    });

    return {
      data,
      meta: {
        page,
        limit,
      },
    };
  }

  async findOne(id: string) {
    const po = await this.db.query.importPurchaseOrders.findFirst({
      where: eq(schema.importPurchaseOrders.id, id),
      with: {
        suppliers: true,
        poLines: true,
        poApprovals: true,
        lettersOfCredit: true,
        shipments: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }
  private async _recalculatePoTotals(poId: string, tx: any) {
    const po = await tx.query.importPurchaseOrders.findFirst({
      where: eq(schema.importPurchaseOrders.id, poId),
      with: { poLines: true },
    });

    if (!po) return;

    const itemIds = po.poLines.map((l: any) => l.itemId);
    const itemsList =
      itemIds.length > 0
        ? await tx.query.items.findMany({
            where: inArray(schema.items.id, itemIds),
          })
        : [];
    const itemMap = new Map<string, any>(itemsList.map((i: any) => [i.id, i]));

    const hsCodes = po.poLines
      .map((l: any) => l.hsCode || itemMap.get(l.itemId)?.defaultHsCode)
      .filter((code: any): code is string => !!code);

    const tariffsList =
      hsCodes.length > 0
        ? await tx.query.tariffRates.findMany({
            where: inArray(schema.tariffRates.hsCode, hsCodes),
          })
        : [];
    const tariffMap = new Map<string, any>(
      tariffsList.map((t: any) => [t.hsCode, t]),
    );

    const linesForCalc = po.poLines.map((line: any) => {
      const item = itemMap.get(line.itemId);
      const resolvedHsCode = line.hsCode || item?.defaultHsCode;

      let dutyRate = line.estimatedDutyRate;
      if ((!dutyRate || Number(dutyRate) === 0) && resolvedHsCode) {
        const tariff = tariffMap.get(resolvedHsCode);
        if (tariff) {
          dutyRate = tariff.dutyRate;
        }
      }

      return {
        id: line.id,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        estimatedDutyRate: dutyRate ?? 0,
        resolvedHsCode,
      };
    });

    const calcTotals = this.poCalculationService.calculateTotals({
      fxRate: po.fxRate,
      estimatedFreightEtb: po.estimatedFreightEtb,
      estimatedInsuranceEtb: po.estimatedInsuranceEtb,
      estimatedOtherChargesEtb: po.estimatedOtherChargesEtb,
      lines: linesForCalc,
    });

    await tx
      .update(schema.importPurchaseOrders)
      .set({
        totalValueForeign: calcTotals.totalValueForeign,
        totalValueEtb: calcTotals.totalValueEtb,
        estimatedDutyEtb: calcTotals.estimatedDutyEtb,
      })
      .where(eq(schema.importPurchaseOrders.id, po.id));

    for (let i = 0; i < po.poLines.length; i++) {
      const lineCalc = calcTotals.lines[i];
      const lineOrig = linesForCalc[i];

      await tx
        .update(schema.poLines)
        .set({
          totalLineValue: lineCalc.totalLineValue,
          estimatedDutyRate: lineOrig.estimatedDutyRate.toString(),
          hsCode: lineOrig.resolvedHsCode,
        })
        .where(eq(schema.poLines.id, lineOrig.id));
    }
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, userId: string) {
    await this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, id),
      });

      if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
      if (po.status !== 'draft') {
        throw new BadRequestException(
          'Can only update Purchase Orders in draft status',
        );
      }

      await tx
        .update(schema.importPurchaseOrders)
        .set({
          ...dto,
          fxRate: dto.fxRate?.toString(),
          estimatedFreightEtb: dto.estimatedFreightEtb?.toString(),
          estimatedInsuranceEtb: dto.estimatedInsuranceEtb?.toString(),
          estimatedOtherChargesEtb: dto.estimatedOtherChargesEtb?.toString(),
          updatedBy: userId,
        })
        .where(eq(schema.importPurchaseOrders.id, id));

      await this._recalculatePoTotals(id, tx);
    });

    return this.findOne(id);
  }

  async addLine(poId: string, dto: CreatePoLineDto) {
    await this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
        with: { poLines: true },
      });

      if (!po) throw new NotFoundException(`PO ${poId} not found`);
      if (po.status !== 'draft')
        throw new BadRequestException('Can only add lines in draft status');

      const nextLineNo = (po.poLines as any[]).length + 1;

      await tx.insert(schema.poLines).values({
        poId,
        lineNo: nextLineNo,
        itemId: dto.itemId,
        description: dto.description,
        quantity: dto.quantity.toString(),
        unitOfMeasure: dto.unitOfMeasure,
        unitPrice: dto.unitPrice.toString(),
        hsCode: dto.hsCode,
        estimatedDutyRate: dto.estimatedDutyRate?.toString(),
        totalLineValue: '0',
      });

      await this._recalculatePoTotals(poId, tx);
    });
    return this.findOne(poId);
  }

  async updateLine(poId: string, lineId: string, dto: UpdatePoLineDto) {
    await this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
      });

      if (!po) throw new NotFoundException(`PO not found`);
      if (po.status !== 'draft')
        throw new BadRequestException('Can only update lines in draft status');

      await tx
        .update(schema.poLines)
        .set({
          itemId: dto.itemId,
          description: dto.description,
          unitOfMeasure: dto.unitOfMeasure,
          hsCode: dto.hsCode,
          quantity: dto.quantity?.toString(),
          unitPrice: dto.unitPrice?.toString(),
          estimatedDutyRate: dto.estimatedDutyRate?.toString(),
        })
        .where(eq(schema.poLines.id, lineId));

      await this._recalculatePoTotals(poId, tx);
    });
    return this.findOne(poId);
  }

  async removeLine(poId: string, lineId: string) {
    await this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
      });

      if (!po) throw new NotFoundException(`PO not found`);
      if (po.status !== 'draft')
        throw new BadRequestException('Can only remove lines in draft status');

      await tx.delete(schema.poLines).where(eq(schema.poLines.id, lineId));

      await this._recalculatePoTotals(poId, tx);
    });
    return this.findOne(poId);
  }
  async submit(poId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
      });

      if (!po) throw new NotFoundException(`PO ${poId} not found`);
      if (po.status !== 'draft') {
        throw new BadRequestException(
          'Only draft POs can be submitted for approval',
        );
      }

      // Determine required role
      const requiredRole =
        await this.approvalRoutingService.determineRequiredApproverRole(poId);

      // Update PO status
      await tx
        .update(schema.importPurchaseOrders)
        .set({
          status: 'pending_approval',
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.importPurchaseOrders.id, poId));

      // Create Approval Record
      await tx.insert(schema.poApprovals).values({
        poId,
        requiredRole: requiredRole as any,
      });

      // Find all active users with the required role
      const approvers = await tx.query.users.findMany({
        where: and(
          eq(schema.users.role, requiredRole as any),
          eq(schema.users.isActive, true),
        ),
      });

      // Insert Notifications for each approver
      if (approvers.length > 0) {
        const notificationsToInsert = approvers.map((approver) => ({
          userId: approver.id,
          type: 'approval_request' as any,
          channel: 'in_app' as any,
          titleEn: `PO Approval Required: ${po.poNumber}`,
          bodyEn: `Purchase Order ${po.poNumber} has been submitted and requires your approval.`,
          entityType: 'import_purchase_orders',
          entityId: po.id,
        }));

        await tx.insert(schema.notifications).values(notificationsToInsert);
      }
    });
  }
  async approve(poId: string, actorId: string, comment?: string) {
    await this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
        with: { poApprovals: true },
      });

      if (!po) throw new NotFoundException(`PO ${poId} not found`);
      if (po.status !== 'pending_approval') {
        throw new BadRequestException('PO is not pending approval');
      }

      // AC10: Prevent self-approval
      if (po.createdBy === actorId) {
        // ForbiddenException is typically from @nestjs/common
        // If not imported, we can throw BadRequestException or we can ensure it's imported
        throw new BadRequestException(
          'Creator cannot approve their own Purchase Order (AC10)',
        );
      }

      const actor = await tx.query.users.findFirst({
        where: eq(schema.users.id, actorId),
      });

      if (!actor) throw new NotFoundException('Approver user not found');

      const pendingApproval = (po.poApprovals as any[]).find(
        (a: any) => !a.decision,
      );
      if (!pendingApproval) {
        throw new BadRequestException(
          'No pending approval record found for this PO',
        );
      }

      const ROLE_LEVELS: Record<string, number> = {
        finance_officer: 30,
        finance_manager: 40,
        general_manager: 50,
        system_admin: 100,
      };

      const requiredLevel = ROLE_LEVELS[pendingApproval.requiredRole] || 999;
      const actorLevel = ROLE_LEVELS[actor.role] || 0;

      if (actorLevel < requiredLevel) {
        throw new BadRequestException(
          `Role ${actor.role} does not meet required role ${pendingApproval.requiredRole}`,
        );
      }

      const now = new Date().toISOString();

      await tx
        .update(schema.poApprovals)
        .set({
          approverId: actorId,
          decision: 'approved',
          comment: comment || null,
          decidedAt: now,
        })
        .where(eq(schema.poApprovals.id, pendingApproval.id));

      await tx
        .update(schema.importPurchaseOrders)
        .set({
          status: 'approved',
          approvedBy: actorId,
          approvedAt: now,
          updatedBy: actorId,
          updatedAt: now,
        })
        .where(eq(schema.importPurchaseOrders.id, poId));
    });

    return this.findOne(poId);
  }
  async reject(poId: string, actorId: string, comment: string) {
    await this.db.transaction(async (tx) => {
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, poId),
        with: { poApprovals: true },
      });

      if (!po) throw new NotFoundException(`PO ${poId} not found`);
      if (po.status !== 'pending_approval') {
        throw new BadRequestException('PO is not pending approval');
      }

      if (!comment || comment.trim() === '') {
        throw new BadRequestException(
          'A comment is required when rejecting a Purchase Order',
        );
      }

      const actor = await tx.query.users.findFirst({
        where: eq(schema.users.id, actorId),
      });

      if (!actor) throw new NotFoundException('Approver user not found');

      const pendingApproval = (po.poApprovals as any[]).find(
        (a: any) => !a.decision,
      );
      if (!pendingApproval) {
        throw new BadRequestException(
          'No pending approval record found for this PO',
        );
      }

      const ROLE_LEVELS: Record<string, number> = {
        finance_officer: 30,
        finance_manager: 40,
        general_manager: 50,
        system_admin: 100,
      };

      const requiredLevel = ROLE_LEVELS[pendingApproval.requiredRole] || 999;
      const actorLevel = ROLE_LEVELS[actor.role] || 0;

      if (actorLevel < requiredLevel) {
        throw new BadRequestException(
          `Role ${actor.role} does not meet required role ${pendingApproval.requiredRole} to reject`,
        );
      }

      const now = new Date().toISOString();

      // Record the rejection
      await tx
        .update(schema.poApprovals)
        .set({
          approverId: actorId,
          decision: 'rejected',
          comment: comment,
          decidedAt: now,
        })
        .where(eq(schema.poApprovals.id, pendingApproval.id));

      // Revert PO status back to draft
      await tx
        .update(schema.importPurchaseOrders)
        .set({
          status: 'draft',
          updatedBy: actorId,
          updatedAt: now,
        })
        .where(eq(schema.importPurchaseOrders.id, poId));
    });

    return this.findOne(poId);
  }
  async getApprovals(poId: string) {
    const po = await this.db.query.importPurchaseOrders.findFirst({
      where: eq(schema.importPurchaseOrders.id, poId),
    });

    if (!po) throw new NotFoundException(`PO ${poId} not found`);

    const approvals = await this.db.query.poApprovals.findMany({
      where: eq(schema.poApprovals.poId, poId),
      orderBy: (a, { asc }) => [asc(a.decidedAt)],
      with: {
        approver: {
          columns: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return approvals;
  }
  async getOutstandingQuantities(poId: string) {
    const po = await this.db.query.importPurchaseOrders.findFirst({
      where: eq(schema.importPurchaseOrders.id, poId),
      with: { poLines: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order ${poId} not found`);
    }

    const lines = (po.poLines as any[]).map((line: any) => {
      const ordered = new Decimal(line.quantity);
      const shipped = new Decimal(line.shippedQuantity || 0);
      const received = new Decimal(line.receivedQuantity || 0);
      const outstanding = ordered.minus(received);
      const outstandingToShip = ordered.minus(shipped);

      return {
        lineId: line.id,
        lineNo: line.lineNo,
        itemId: line.itemId,
        description: line.description,
        ordered: ordered.toString(),
        shipped: shipped.toString(),
        received: received.toString(),
        outstanding: outstanding.isNegative() ? '0' : outstanding.toString(),
        outstandingToShip: outstandingToShip.isNegative()
          ? '0'
          : outstandingToShip.toString(),
      };
    });

    return {
      poId: po.id,
      poNumber: po.poNumber,
      status: po.status,
      lines,
    };
  }
}
