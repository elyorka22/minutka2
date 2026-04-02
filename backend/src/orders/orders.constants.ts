import type { CreateOrderDto } from './dto/create-order.dto';

export const ORDERS_QUEUE_NAME = 'orders';
export const ORDERS_CREATE_JOB = 'createOrder';

export type CreateOrderJobData = {
  customerId: string | null;
  dto: CreateOrderDto;
};
