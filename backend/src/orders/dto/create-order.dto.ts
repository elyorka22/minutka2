import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  dishId!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class CreateOrderAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  street!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  restaurantId!: string;

  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  address!: CreateOrderAddressDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsIn(['CARD', 'CASH'])
  paymentMethod!: 'CARD' | 'CASH';
}
