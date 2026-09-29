import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateShipmentStatusDto {
  @IsString()
  @IsIn([
    'ordered',
    'shipped',
    'at_customs',
    'cleared',
    'partially_received',
    'received',
  ])
  @ApiProperty()
  status!:
    | 'ordered'
    | 'shipped'
    | 'at_customs'
    | 'cleared'
    | 'partially_received'
    | 'received';

  @IsDateString()
  @IsOptional()
  @ApiProperty()
  actualArrivalDate?: string;
}
