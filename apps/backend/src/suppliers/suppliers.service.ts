import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, or, ilike, and, ne } from 'drizzle-orm';

@Injectable()
export class SuppliersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(createSupplierDto: CreateSupplierDto, userId: string) {
    if (createSupplierDto.tin) {
      const existing = await this.db.query.suppliers.findFirst({
        where: eq(schema.suppliers.tin, createSupplierDto.tin),
      });
      if (existing) {
        throw new ConflictException('Supplier with this TIN already exists');
      }
    }

    const supplierCode = `SUP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

    const [supplier] = await this.db
      .insert(schema.suppliers)
      .values({
        supplierCode,
        name: createSupplierDto.name,
        country: createSupplierDto.country,
        tin: createSupplierDto.tin,
        contactPerson: createSupplierDto.contactPerson,
        phone: createSupplierDto.phone,
        email: createSupplierDto.email,
        paymentTerms: createSupplierDto.paymentTerms,
        defaultCurrency: createSupplierDto.defaultCurrency,
        leadTimeDays: createSupplierDto.leadTimeDays,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return supplier;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    isActive?: boolean,
  ) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(schema.suppliers.isActive, isActive));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.suppliers.name, `%${search}%`),
          ilike(schema.suppliers.tin, `%${search}%`),
          ilike(schema.suppliers.supplierCode, `%${search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db.query.suppliers.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (suppliers, { desc }) => [desc(suppliers.createdAt)],
      with: {
        bankAccounts: true,
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
    const supplier = await this.db.query.suppliers.findFirst({
      where: eq(schema.suppliers.id, id),
      with: {
        bankAccounts: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    userId: string,
  ) {
    await this.findOne(id);

    if (updateSupplierDto.tin) {
      const existing = await this.db.query.suppliers.findFirst({
        where: and(
          eq(schema.suppliers.tin, updateSupplierDto.tin),
          ne(schema.suppliers.id, id),
        ),
      });
      if (existing) {
        throw new ConflictException('Supplier with this TIN already exists');
      }
    }

    const updateData: Partial<typeof schema.suppliers.$inferInsert> = {
      ...updateSupplierDto,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };

    const [updatedSupplier] = await this.db
      .update(schema.suppliers)
      .set(updateData)
      .where(eq(schema.suppliers.id, id))
      .returning();

    return updatedSupplier;
  }

  async deactivate(id: string) {
    await this.findOne(id);

    await this.db
      .update(schema.suppliers)
      .set({ isActive: false })
      .where(eq(schema.suppliers.id, id));

    return { message: 'Supplier deactivated successfully' };
  }

  async addBankAccount(supplierId: string, dto: CreateBankAccountDto) {
    await this.findOne(supplierId); // Ensure supplier exists

    return this.db.transaction(async (tx) => {
      if (dto.isDefault) {
        await tx
          .update(schema.suppliersBankAccounts)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.suppliersBankAccounts.supplierId, supplierId),
              eq(schema.suppliersBankAccounts.currency, dto.currency),
            ),
          );
      }

      const [newAccount] = await tx
        .insert(schema.suppliersBankAccounts)
        .values({
          supplierId,
          bankName: dto.bankName,
          swift: dto.swift,
          ibanOrAccount: dto.ibanOrAccount,
          currency: dto.currency,
          isDefault: dto.isDefault ?? false,
        })
        .returning();

      return newAccount;
    });
  }

  async updateBankAccount(
    supplierId: string,
    accountId: string,
    dto: UpdateBankAccountDto,
  ) {
    const account = await this.db.query.suppliersBankAccounts.findFirst({
      where: and(
        eq(schema.suppliersBankAccounts.id, accountId),
        eq(schema.suppliersBankAccounts.supplierId, supplierId),
      ),
    });

    if (!account) {
      throw new NotFoundException(`Bank account not found for this supplier`);
    }

    return this.db.transaction(async (tx) => {
      const currency = dto.currency || account.currency;

      if (dto.isDefault) {
        await tx
          .update(schema.suppliersBankAccounts)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.suppliersBankAccounts.supplierId, supplierId),
              eq(schema.suppliersBankAccounts.currency, currency),
            ),
          );
      }

      const [updatedAccount] = await tx
        .update(schema.suppliersBankAccounts)
        .set({
          bankName: dto.bankName,
          swift: dto.swift,
          ibanOrAccount: dto.ibanOrAccount,
          currency: dto.currency,
          isDefault: dto.isDefault !== undefined ? dto.isDefault : undefined,
        })
        .where(eq(schema.suppliersBankAccounts.id, accountId))
        .returning();

      return updatedAccount;
    });
  }

  async removeBankAccount(supplierId: string, accountId: string) {
    const result = await this.db
      .delete(schema.suppliersBankAccounts)
      .where(
        and(
          eq(schema.suppliersBankAccounts.id, accountId),
          eq(schema.suppliersBankAccounts.supplierId, supplierId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('Bank account not found for this supplier');
    }

    return { message: 'Bank account deleted successfully' };
  }

  async findSupplierPurchaseOrders(
    id: string,
    page: number = 1,
    limit: number = 10,
  ) {
    await this.findOne(id);

    const offset = (page - 1) * limit;

    const data = await this.db.query.importPurchaseOrders.findMany({
      where: eq(schema.importPurchaseOrders.supplierId, id),
      limit,
      offset,
      orderBy: (pos, { desc }) => [desc(pos.poDate), desc(pos.createdAt)],
      with: {
        lines: true,
        approvals: true,
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
}
