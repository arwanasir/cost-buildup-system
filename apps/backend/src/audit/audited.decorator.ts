import { SetMetadata } from '@nestjs/common';

export const AUDITED_ENTITY_KEY = 'audited_entity';
export const Audited = (entityType: string) =>
  SetMetadata(AUDITED_ENTITY_KEY, entityType);
