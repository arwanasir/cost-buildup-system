import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class TariffsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(createTariffDto: CreateTariffDto) {
    const existing = await this.db.query.tariffRates.findFirst({
      where: eq(schema.tariffRates.hsCode, createTariffDto.hsCode),
    });

    if (existing) {
      throw new ConflictException(
        'Tariff rate with this HS Code already exists',
      );
    }

    const [tariff] = await this.db
      .insert(schema.tariffRates)
      .values({
        hsCode: createTariffDto.hsCode,
        description: createTariffDto.description,
        dutyStructure: createTariffDto.dutyStructure as
          'ad_valorem' | 'specific',
        dutyRate: createTariffDto.dutyRate?.toString(),
        specificDutyPerUnit: createTariffDto.specificDutyPerUnit?.toString(),
        exciseRate: createTariffDto.exciseRate?.toString(),
        withholdingRate: createTariffDto.withholdingRate?.toString(),
        effectiveFrom: createTariffDto.effectiveFrom,
      })
      .returning();

    return tariff;
  }

  async findAll() {
    return this.db.query.tariffRates.findMany({
      orderBy: (rates, { desc }) => [desc(rates.hsCode)],
    });
  }

  async findOne(hsCode: string) {
    const tariff = await this.db.query.tariffRates.findFirst({
      where: eq(schema.tariffRates.hsCode, hsCode),
    });

    if (!tariff) {
      throw new NotFoundException(
        `Tariff rate with HS Code ${hsCode} not found`,
      );
    }

    return tariff;
  }

  async update(hsCode: string, updateTariffDto: UpdateTariffDto) {
    await this.findOne(hsCode); // Ensure it exists

    const updateData: Partial<typeof schema.tariffRates.$inferInsert> = {};
    if (updateTariffDto.description !== undefined)
      updateData.description = updateTariffDto.description;
    if (updateTariffDto.dutyStructure !== undefined)
      updateData.dutyStructure = updateTariffDto.dutyStructure;
    if (updateTariffDto.dutyRate !== undefined)
      updateData.dutyRate = updateTariffDto.dutyRate?.toString();
    if (updateTariffDto.specificDutyPerUnit !== undefined)
      updateData.specificDutyPerUnit =
        updateTariffDto.specificDutyPerUnit?.toString();
    if (updateTariffDto.exciseRate !== undefined)
      updateData.exciseRate = updateTariffDto.exciseRate?.toString();
    if (updateTariffDto.withholdingRate !== undefined)
      updateData.withholdingRate = updateTariffDto.withholdingRate?.toString();
    if (updateTariffDto.effectiveFrom !== undefined)
      updateData.effectiveFrom = updateTariffDto.effectiveFrom;

    if (Object.keys(updateData).length === 0) {
      return this.findOne(hsCode);
    }

    const [updatedTariff] = await this.db
      .update(schema.tariffRates)
      .set(updateData)
      .where(eq(schema.tariffRates.hsCode, hsCode))
      .returning();

    return updatedTariff;
  }

  async remove(hsCode: string) {
    await this.findOne(hsCode);

    await this.db
      .delete(schema.tariffRates)
      .where(eq(schema.tariffRates.hsCode, hsCode));

    return { message: 'Tariff rate deleted successfully' };
  }
}
