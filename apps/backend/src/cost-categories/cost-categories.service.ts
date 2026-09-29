import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateCostCategoryDto } from './dto/create-cost-category.dto';
import { UpdateCostCategoryDto } from './dto/update-cost-category.dto';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class CostCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(createCostCategoryDto: CreateCostCategoryDto) {
    const existing = await this.db.query.costCategories.findFirst({
      where: eq(schema.costCategories.code, createCostCategoryDto.code),
    });

    if (existing) {
      throw new ConflictException(
        'Cost category with this code already exists',
      );
    }

    const [newCategory] = await this.db
      .insert(schema.costCategories)
      .values({
        code: createCostCategoryDto.code,
        name: createCostCategoryDto.name,
        defaultAllocationMethod:
          (createCostCategoryDto.defaultAllocationMethod ||
            'by_value') as (typeof schema.costCategories.$inferInsert)['defaultAllocationMethod'],
        isItemSpecific: createCostCategoryDto.isItemSpecific ?? false,
        isActive: createCostCategoryDto.isActive ?? true,
        sortOrder: createCostCategoryDto.sortOrder ?? 0,
      })
      .returning();

    return newCategory;
  }

  async findAll() {
    return this.db.query.costCategories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
    });
  }

  async findOne(id: string) {
    const category = await this.db.query.costCategories.findFirst({
      where: eq(schema.costCategories.id, id),
    });

    if (!category) {
      throw new NotFoundException('Cost category not found');
    }

    return category;
  }

  async update(id: string, updateCostCategoryDto: UpdateCostCategoryDto) {
    await this.findOne(id); // ensure exists

    const updateData: Partial<typeof schema.costCategories.$inferInsert> = {};
    if (updateCostCategoryDto.code)
      updateData.code = updateCostCategoryDto.code;
    if (updateCostCategoryDto.name)
      updateData.name = updateCostCategoryDto.name;
    if (updateCostCategoryDto.defaultAllocationMethod) {
      updateData.defaultAllocationMethod =
        updateCostCategoryDto.defaultAllocationMethod;
    }
    if (updateCostCategoryDto.isItemSpecific !== undefined) {
      updateData.isItemSpecific = updateCostCategoryDto.isItemSpecific;
    }
    if (updateCostCategoryDto.isActive !== undefined) {
      updateData.isActive = updateCostCategoryDto.isActive;
    }
    if (updateCostCategoryDto.sortOrder !== undefined) {
      updateData.sortOrder = updateCostCategoryDto.sortOrder;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const [updatedCategory] = await this.db
      .update(schema.costCategories)
      .set(updateData)
      .where(eq(schema.costCategories.id, id))
      .returning();

    return updatedCategory;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Instead of hard deleting which might break foreign keys in importCostEntries,
    // we soft delete by setting isActive to false.
    const [deactivatedCategory] = await this.db
      .update(schema.costCategories)
      .set({ isActive: false })
      .where(eq(schema.costCategories.id, id))
      .returning();

    return deactivatedCategory;
  }
}
