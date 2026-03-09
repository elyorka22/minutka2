export interface Restaurant { id: string; name: string; description?: string | null; logoUrl?: string | null; coverUrl?: string | null; rating: number; }

export interface Dish { id: string; name: string; description?: string | null; price: number; imageUrl?: string | null; }

export interface CartItem { dish: Dish; quantity: number; }
