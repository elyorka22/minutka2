"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CartItem, Dish } from "../lib/types";

interface CartContextValue {
  items: CartItem[];
  restaurantId: string | null;
  total: number;
  addToCart: (dish: Dish, restaurantId: string) => void;
  removeFromCart: (dishId: string) => void;
  changeQuantity: (dishId: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.dish.price * item.quantity, 0),
    [items],
  );

  function addToCart(dish: Dish, restId: string) {
    setItems((prev) => {
      if (restaurantId !== null && restaurantId !== restId) {
        return [{ dish, quantity: 1 }];
      }
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { dish, quantity: 1 }];
    });
    setRestaurantId(restId);
  }

  function removeFromCart(dishId: string) {
    setItems((prev) => prev.filter((i) => i.dish.id !== dishId));
  }

  function changeQuantity(dishId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(dishId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.dish.id === dishId ? { ...i, quantity } : i)),
    );
  }

  function clear() {
    setItems([]);
    setRestaurantId(null);
  }

  const value: CartContextValue = {
    items,
    restaurantId,
    total,
    addToCart,
    removeFromCart,
    changeQuantity,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
