import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PoTransitionStatus {
  LC_APPLIED = 'lc_applied',
  SHIPPED = 'shipped',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  CLOSED = 'closed',
}

export class TransitionPoStatusDto {
  @IsEnum(PoTransitionStatus)
  @IsNotEmpty()
  @ApiProperty()
  status!: string;
}
