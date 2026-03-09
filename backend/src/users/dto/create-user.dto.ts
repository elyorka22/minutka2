export class CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'PLATFORM_ADMIN' | 'COURIER';
}

