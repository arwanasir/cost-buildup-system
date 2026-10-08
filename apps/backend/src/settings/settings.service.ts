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
    const setting = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, key),
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    const beforeValue = {
      valueNumeric: setting.valueNumeric,
      valueText: setting.valueText,
    };

    const updatePayload: any = {
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };

    const afterValue: any = {};

    if (updateSettingDto.valueNumeric !== undefined) {
      if (isNaN(Number(updateSettingDto.valueNumeric))) {
        throw new BadRequestException('valueNumeric must be a number');
      }
      updatePayload.valueNumeric = updateSettingDto.valueNumeric.toString();
      afterValue.valueNumeric = updatePayload.valueNumeric;
    }

    if (updateSettingDto.valueText !== undefined) {
      updatePayload.valueText = updateSettingDto.valueText;
      afterValue.valueText = updatePayload.valueText;
    }

    if (Object.keys(afterValue).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    return this.db.transaction(async (tx) => {
      const [updatedSetting] = await tx
        .update(schema.policySettings)
        .set(updatePayload)
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
