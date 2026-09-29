import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema/schema';
import { eq } from 'drizzle-orm';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db.query.policySettings.findMany();
  }

  async update(
    key: string,
    updateSettingDto: UpdateSettingDto,
    userId: string,
  ) {
    if (typeof updateSettingDto.valueNumeric !== 'number') {
      throw new BadRequestException('Numeric value is required');
    }

    const setting = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, key),
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    const beforeValue = { valueNumeric: setting.valueNumeric };
    const afterValue = {
      valueNumeric: updateSettingDto.valueNumeric.toString(),
    };

    return this.db.transaction(async (tx) => {
      const [updatedSetting] = await tx
        .update(schema.policySettings)
        .set({
          valueNumeric: updateSettingDto.valueNumeric.toString(),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.policySettings.key, key))
        .returning();

      await tx.insert(schema.auditLedger).values({
        entityType: 'POLICY_SETTING',
        entityId: setting.id,
        action: 'update',
        actorId: userId,
        beforeValue,
        afterValue,
      });

      return updatedSetting;
    });
  }
}
