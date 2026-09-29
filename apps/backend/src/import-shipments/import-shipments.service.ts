import { ShipmentQuantityService } from './shipment-quantity.service';
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and, gte, lte } from 'drizzle-orm';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CreateClearingInvoiceDto } from './dto/create-clearing-invoice.dto';
import { CreateShipmentChargeDto } from './dto/create-shipment-charge.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { NumberingService } from '@/core/numbering/numbering.service';
import Decimal from 'decimal.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ImportShipmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly numberingService: NumberingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly quantityService: ShipmentQuantityService,
  ) {}

  async create(createDto: CreateShipmentDto, userId: string) {
    return this.db.transaction(async (tx) => {
      // 1. Fetch PO to get supplier, LC, fxRate
      const po = await tx.query.importPurchaseOrders.findFirst({
        where: eq(schema.importPurchaseOrders.id, createDto.poId),
      });

      if (!po) {
        throw new NotFoundException(`PO ${createDto.poId} not found`);
      }

      if (po.status !== 'lc_applied' && po.status !== 'approved') {
        throw new BadRequestException(
          `PO ${createDto.poId} is not in a valid state to be shipped`,
        );
      }

      // 2. Fetch PO Lines to resolve itemId
      const lineIds = createDto.items.map((i) => i.poLineId);
      const poLines = await tx.query.poLines.findMany({
        where: inArray(schema.poLines.id, lineIds),
      });
      const poLineMap = new Map(poLines.map((l) => [l.id, l]));

      // 3. Generate shipment number
      const shipmentNumber =
        await this.numberingService.generateNextNumber('shipment');

      // 4. Insert Shipment header
      const [shipment] = await tx
        .insert(schema.importShipments)
        .values({
          shipmentNumber,
          poId: po.id,
          lcId: po.lcId, // Auto-link the LC attached to the PO
          supplierId: po.supplierId,
          vesselName: createDto.vesselName,
          blNumber: createDto.blNumber,
          blDate: createDto.blDate,
          portOfLoading: createDto.portOfLoading,
          portOfDestination: createDto.portOfDestination,
          incoterm: createDto.incoterm,
          carrier: createDto.carrier,
          containerNumbers: createDto.containerNumbers,
          eta: createDto.eta,
          status: 'ordered' as any,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      const user = await tx.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      // 5. Insert Shipment Items
      const itemsToInsert = createDto.items.map((itemDto) => {
        const poLine = poLineMap.get(itemDto.poLineId);
        if (!poLine) {
          throw new BadRequestException(
            `PO Line ${itemDto.poLineId} does not belong to the PO`,
          );
        }

        const shippedQty = new Decimal(itemDto.shippedQuantity);
        const unitPrice = new Decimal(itemDto.ciUnitPrice);
        const fxRate = new Decimal(po.fxRate);

        const ciValueForeign = shippedQty.times(unitPrice).toDecimalPlaces(4);
        const ciValueEtb = ciValueForeign.times(fxRate).toDecimalPlaces(4);

        const totalOrdered = new Decimal(poLine.quantity);
        const previouslyShipped = new Decimal(poLine.shippedQuantity || 0);
        const currentlyShipping = new Decimal(itemDto.shippedQuantity);
        const totalAfterShipment = previouslyShipped.plus(currentlyShipping);

        if (totalAfterShipment.greaterThan(totalOrdered)) {
          if (!createDto.allowOverShipment) {
            throw new BadRequestException(
              `Item ${poLine.itemId} exceeds PO quantity. Ordered: ${totalOrdered}, Prev Shipped: ${previouslyShipped}, Current: ${currentlyShipping}. Pass allowOverShipment: true if authorized.`,
            );
          }
          const allowedRoles = [
            'procurement_manager',
            'system_admin',
            'general_manager',
          ];
          if (!user || !allowedRoles.includes(user.role)) {
            throw new ForbiddenException(
              `Only a Procurement Manager can authorize over-shipments. Current role is unauthorized.`,
            );
          }
        }

        const quantityFlag = this.quantityService.compare(
          poLine,
          itemDto.shippedQuantity,
        );

        return {
          shipmentId: shipment.id,
          poLineId: poLine.id,
          itemId: poLine.itemId,
          shippedQuantity: shippedQty.toString(),
          ciUnitPrice: unitPrice.toString(),
          ciValueForeign: ciValueForeign.toString(),
          ciValueEtb: ciValueEtb.toString(),
          weightKg: itemDto.weightKg?.toString(),
          volumeCbm: itemDto.volumeCbm?.toString(),
          quantityFlag,
        };
      });

      const insertedItems = await tx
        .insert(schema.shipmentItems)
        .values(itemsToInsert)
        .returning();

      // 5b. Insert Cost Entries for PO Estimates and CI Values
      const categories = await tx.query.costCategories.findMany();
      const catMap = new Map(categories.map((c) => [c.code, c.id]));
      const costEntriesToInsert: any[] = [];

      // FOB - Supplier Cost (Actual per item)
      const fobCatId = catMap.get('FOB');
      if (fobCatId) {
        for (const item of insertedItems) {
          costEntriesToInsert.push({
            shipmentId: shipment.id,
            costCategoryId: fobCatId,
            isEstimated: false,
            isItemSpecific: true,
            shipmentItemId: item.id,
            amountEtb: item.ciValueEtb,
            source: 'commercial_invoice' as any,
            allocationMethod: 'by_value' as any,
          });
        }
      }

      // FREIGHT (Estimated)
      const freightCatId = catMap.get('FREIGHT');
      if (
        freightCatId &&
        po.estimatedFreightEtb &&
        Number(po.estimatedFreightEtb) > 0
      ) {
        costEntriesToInsert.push({
          shipmentId: shipment.id,
          costCategoryId: freightCatId,
          isEstimated: true,
          isItemSpecific: false,
          amountEtb: po.estimatedFreightEtb,
          source: 'po_estimate' as any,
          allocationMethod: 'by_weight' as any,
        });
      }

      // INSURANCE (Estimated)
      const insCatId = catMap.get('INSURANCE');
      if (
        insCatId &&
        po.estimatedInsuranceEtb &&
        Number(po.estimatedInsuranceEtb) > 0
      ) {
        costEntriesToInsert.push({
          shipmentId: shipment.id,
          costCategoryId: insCatId,
          isEstimated: true,
          isItemSpecific: false,
          amountEtb: po.estimatedInsuranceEtb,
          source: 'po_estimate' as any,
          allocationMethod: 'by_value' as any,
        });
      }

      // OTHER CHARGES (Estimated)
      let otherCatId = catMap.get('OTHER');
      if (
        !otherCatId &&
        po.estimatedOtherChargesEtb &&
        Number(po.estimatedOtherChargesEtb) > 0
      ) {
        const [newCat] = await tx
          .insert(schema.costCategories)
          .values({
            code: 'OTHER',
            name: 'Other PO Estimates',
            defaultAllocationMethod: 'by_value',
          })
          .onConflictDoNothing()
          .returning();
        if (newCat) otherCatId = newCat.id;
        if (!otherCatId) {
          const fallback = await tx.query.costCategories.findFirst({
            where: eq(schema.costCategories.code, 'OTHER'),
          });
          otherCatId = fallback?.id;
        }
      }

      if (
        otherCatId &&
        po.estimatedOtherChargesEtb &&
        Number(po.estimatedOtherChargesEtb) > 0
      ) {
        costEntriesToInsert.push({
          shipmentId: shipment.id,
          costCategoryId: otherCatId,
          isEstimated: true,
          isItemSpecific: false,
          amountEtb: po.estimatedOtherChargesEtb,
          source: 'po_estimate' as any,
          allocationMethod: 'by_value' as any,
        });
      }

      if (costEntriesToInsert.length > 0) {
        await tx.insert(schema.importCostEntries).values(costEntriesToInsert);
      }

      // 6. Update PO Lines shippedQuantity
      for (const itemDto of createDto.items) {
        const poLine = poLineMap.get(itemDto.poLineId);
        if (poLine) {
          const currentShipped = new Decimal(poLine.shippedQuantity || 0);
          const newShipped = currentShipped.plus(itemDto.shippedQuantity);
          await tx
            .update(schema.poLines)
            .set({ shippedQuantity: newShipped.toString() })
            .where(eq(schema.poLines.id, poLine.id));
        }
      }

      // 7. Move PO to 'shipped'
      await tx
        .update(schema.importPurchaseOrders)
        .set({ status: 'shipped' })
        .where(eq(schema.importPurchaseOrders.id, po.id));

      // Emit event so LcChargeSyncListener catches it
      this.eventEmitter.emit('shipment.created', {
        shipmentId: shipment.id,
        lcId: po.lcId,
        createdBy: userId,
      });

      return shipment;
    });
  }

  async findOne(id: string) {
    const shipment = await this.db.query.importShipments.findFirst({
      where: eq(schema.importShipments.id, id),
      with: { items: true, costEntries: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return shipment;
  }

  async findAll(filters: {
    status?: string;
    poId?: string;
    supplierId?: string;
    etaStart?: string;
    etaEnd?: string;
  }) {
    const conditions = [];
    if (filters.status)
      conditions.push(eq(schema.importShipments.status, filters.status as any));
    if (filters.poId)
      conditions.push(eq(schema.importShipments.poId, filters.poId));
    if (filters.supplierId)
      conditions.push(
        eq(schema.importShipments.supplierId, filters.supplierId),
      );
    if (filters.etaStart)
      conditions.push(gte(schema.importShipments.eta, filters.etaStart));
    if (filters.etaEnd)
      conditions.push(lte(schema.importShipments.eta, filters.etaEnd));

    return this.db.query.importShipments.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });
  }

  async update(id: string, updateDto: any) {
    const [updated] = await this.db
      .update(schema.importShipments)
      .set(updateDto)
      .where(eq(schema.importShipments.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    return updated;
  }

  async getItems(id: string) {
    return this.db.query.shipmentItems.findMany({
      where: eq(schema.shipmentItems.shipmentId, id),
    });
  }

  async getQuantityCheck(id: string) {
    const items = await this.getItems(id);
    let hasOverShipment = false;
    let hasShortfall = false;

    const details = items.map((i: any) => {
      if (i.quantityFlag === 'over_shipment') hasOverShipment = true;
      if (i.quantityFlag === 'shortfall') hasShortfall = true;
      return {
        shipmentItemId: i.id,
        itemId: i.itemId,
        poLineId: i.poLineId,
        shippedQuantity: i.shippedQuantity,
        quantityFlag: i.quantityFlag,
      };
    });

    return {
      shipmentId: id,
      overallStatus: hasOverShipment
        ? 'over_shipment'
        : hasShortfall
          ? 'shortfall'
          : 'exact',
      details,
    };
  }

  async addClearingAgentInvoice(
    shipmentId: string,
    dto: CreateClearingInvoiceDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      // 1. Verify shipment exists
      const shipment = await tx.query.importShipments.findFirst({
        where: eq(schema.importShipments.id, shipmentId),
      });
      if (!shipment) {
        throw new NotFoundException('Shipment not found');
      }

      // 2. Find Cost Category for CLEARING_FEE
      let category = await tx.query.costCategories.findFirst({
        where: eq(schema.costCategories.code, 'CLEARING_FEE'),
      });
      if (!category) {
        category = await tx.query.costCategories.findFirst({
          where: eq(schema.costCategories.code, 'CLEARING'),
        });
      }
      if (!category) {
        throw new BadRequestException(
          'Cost category for CLEARING_FEE not found in the system',
        );
      }

      // 3. Compute ETB amount
      const amountEtb = new Decimal(dto.amount).times(dto.fxRate).toString();

      // 4. Insert cost entry
      const [entry] = await tx
        .insert(schema.importCostEntries)
        .values({
          shipmentId,
          costCategoryId: category.id,
          costSubcategory: 'Clearing Agent Invoice',
          providerName: dto.provider,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.date,
          amountForeign: dto.amount.toString(),
          currency: dto.currency,
          fxRate: dto.fxRate.toString(),
          amountEtb,
          allocationMethod: 'by_value', // Default allocation
          isEstimated: false,
          isItemSpecific: false,
          attachmentKey: dto.attachment || null,
          source: 'manual',
          createdBy: userId,
        })
        .returning();

      return entry;
    });
  }

  async addCharge(
    shipmentId: string,
    categoryCodes: string[],
    subcategory: string,
    dto: CreateShipmentChargeDto,
    userId: string,
  ) {
    return this.db.transaction(async (tx: any) => {
      // 1. Verify shipment
      const shipment = await tx.query.importShipments.findFirst({
        where: eq(schema.importShipments.id, shipmentId),
      });
      if (!shipment) throw new NotFoundException('Shipment not found');

      // 2. Resolve Category
      const categories = await tx.query.costCategories.findMany({
        where: inArray(schema.costCategories.code, categoryCodes),
      });
      if (categories.length === 0) {
        throw new BadRequestException(
          `None of the target categories (${categoryCodes.join(', ')}) were found in the system.`,
        );
      }
      // Pick the first matched category
      const category = categories[0];

      // 3. Compute ETB amount
      const amountEtb = new Decimal(dto.amount).times(dto.fxRate).toString();

      // 4. Insert cost entry using SRS default allocation
      const [entry] = await tx
        .insert(schema.importCostEntries)
        .values({
          shipmentId,
          costCategoryId: category.id,
          costSubcategory: subcategory,
          providerName: dto.provider,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.date,
          amountForeign: dto.amount.toString(),
          currency: dto.currency,
          fxRate: dto.fxRate.toString(),
          amountEtb,
          allocationMethod: category.defaultAllocationMethod, // Pulls default natively from SRS rule DB
          isEstimated: false,
          isItemSpecific: false,
          attachmentKey: dto.attachment || null,
          source: 'manual',
          createdBy: userId,
        })
        .returning();

      return entry;
    });
  }

  async getCostEntries(shipmentId: string, isEstimated?: boolean) {
    return this.db.transaction(async (tx: any) => {
      if (isEstimated !== undefined) {
        return tx
          .select()
          .from(schema.importCostEntries)
          .where(
            and(
              eq(schema.importCostEntries.shipmentId, shipmentId),
              eq(schema.importCostEntries.isEstimated, isEstimated),
            ),
          );
      }
      return tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.shipmentId, shipmentId));
    });
  }
}
