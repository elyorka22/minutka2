import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ORDER_STATUSES = [
  'NEW',
  'ACCEPTED',
  'READY',
  'ON_THE_WAY',
  'DONE',
  'CANCELLED',
] as const;

export class PatchOrderStatusDto {
  @IsIn([...ORDER_STATUSES])
  status!: (typeof ORDER_STATUSES)[number];

  /** Majburiy bekor qilishda — `OrdersService` ham tekshiradi */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
