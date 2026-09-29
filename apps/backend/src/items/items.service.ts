import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, or, ilike, and, ne } from 'drizzle-orm';

@Injectable()
export class ItemsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(createItemDto: CreateItemDto, userId: string) {
    const existing = await this.db.query.items.findFirst({
      where: eq(schema.items.itemCode, createItemDto.itemCode),
    });

    if (existing) {
      throw new ConflictException(
        `Item with code ${createItemDto.itemCode} already exists`,
      );
    }

    const [item] = await this.db
      .insert(schema.items)
      .values({
        itemCode: createItemDto.itemCode,
        name: createItemDto.name,
        description: createItemDto.description,
        unitOfMeasure: createItemDto.unitOfMeasure,
        defaultHsCode: createItemDto.defaultHsCode,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return item;
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
      conditions.push(eq(schema.items.isActive, isActive));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.items.name, `%${search}%`),
          ilike(schema.items.itemCode, `%${search}%`),
          ilike(schema.items.description, `%${search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db.query.items.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });

    return {
      data,
      meta: {
        page,
        limit,
      },
    };
  }

  async searchTypeahead(q?: string) {
    const conditions: any[] = [eq(schema.items.isActive, true)];

    if (q) {
      conditions.push(
        or(
          ilike(schema.items.name, `%${q}%`),
          ilike(schema.items.itemCode, `%${q}%`),
        ),
      );
    }

    return this.db.query.items.findMany({
      where: and(...conditions),
      limit: 20,
      columns: {
        id: true,
        itemCode: true,
        name: true,
      },
      orderBy: (items, { asc }) => [asc(items.name)],
    });
  }

  async findOne(id: string) {
    const item = await this.db.query.items.findFirst({
      where: eq(schema.items.id, id),
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: string, updateItemDto: UpdateItemDto, userId: string) {
    await this.findOne(id); // Ensure exists

    if (updateItemDto.itemCode) {
      const existing = await this.db.query.items.findFirst({
        where: and(
          eq(schema.items.itemCode, updateItemDto.itemCode),
          ne(schema.items.id, id),
        ),
      });

      if (existing) {
        throw new ConflictException(
          `Item with code ${updateItemDto.itemCode} already exists`,
        );
      }
    }

    const updateData: Partial<typeof schema.items.$inferInsert> = {
      ...updateItemDto,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };

    const [updatedItem] = await this.db
      .update(schema.items)
      .set(updateData)
      .where(eq(schema.items.id, id))
      .returning();

    return updatedItem;
  }

  async deactivate(id: string) {
    await this.findOne(id);

    await this.db
      .update(schema.items)
      .set({ isActive: false })
      .where(eq(schema.items.id, id));

    return { message: 'Item deactivated successfully' };
  }
}
