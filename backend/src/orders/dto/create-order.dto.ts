export class CreateOrderItemDto {
  dishId: string;
  quantity: number;
}

export class CreateOrderAddressDto {
  label?: string;
  street: string;
  city: string;
  details?: string;
  latitude: number;
  longitude: number;
}

export class CreateOrderDto {
  restaurantId: string;
  address: CreateOrderAddressDto;
  items: CreateOrderItemDto[];
  comment?: string;
  paymentMethod: 'CARD' | 'CASH';
}
