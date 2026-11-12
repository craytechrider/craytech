import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartProduct {
  id: number;
  name: string;
  description?: string;
  price: number;

  // CRAYTECH NOW SELLS BY KG
  selling_type: "kilogram";

  image?: string;

  available_weight_kg?: number;
}

export interface CartItem extends CartProduct {
  // Actual quantity in the cart.
  // Example: 0.5, 1, 1.5, 2, etc.
  cartQuantity: number;
}

interface CartContextType {
  cart: CartItem[];

  addToCart: (product: CartProduct, quantity?: number) => void;

  removeFromCart: (productId: number) => void;

  updateQuantity: (productId: number, quantity: number) => void;

  clearCart: () => void;

  cartCount: number;

  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // =========================================================
  // LOAD CART
  // =========================================================

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("craytech_cart");

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      // -------------------------------------------------------
      // Clean old cart data
      //
      // This removes old "piece" products that may still be
      // stored in localStorage from the previous system.
      // -------------------------------------------------------

      return parsed.filter(
        (item: CartItem) => item.selling_type === "kilogram",
      );
    } catch (error) {
      console.error("Failed to load cart:", error);

      return [];
    }
  });

  // =========================================================
  // SAVE CART
  // =========================================================

  useEffect(() => {
    try {
      localStorage.setItem("craytech_cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [cart]);

  // =========================================================
  // ADD TO CART
  // =========================================================

  const addToCart = (product: CartProduct, quantity: number = 0.5) => {
    // -------------------------------------------------------
    // KG ONLY
    // -------------------------------------------------------

    const requestedQuantity = Number(quantity);

    if (requestedQuantity < 0.5) {
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === product.id && item.selling_type === "kilogram",
      );

      if (existing) {
        return currentCart.map((item) => {
          if (item.id !== product.id || item.selling_type !== "kilogram") {
            return item;
          }

          return {
            ...item,
            cartQuantity: Number(
              (item.cartQuantity + requestedQuantity).toFixed(2),
            ),
          };
        });
      }

      return [
        ...currentCart,
        {
          ...product,

          selling_type: "kilogram",

          cartQuantity: requestedQuantity,
        },
      ];
    });
  };

  // =========================================================
  // REMOVE FROM CART
  // =========================================================

  const removeFromCart = (productId: number) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  };

  // =========================================================
  // UPDATE QUANTITY
  // =========================================================

  const updateQuantity = (productId: number, quantity: number) => {
    const newQuantity = Number(quantity);

    if (newQuantity < 0.5) {
      removeFromCart(productId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        return {
          ...item,

          cartQuantity: Number(newQuantity.toFixed(2)),
        };
      }),
    );
  };

  // =========================================================
  // CLEAR CART
  // =========================================================

  const clearCart = () => {
    setCart([]);
  };

  // =========================================================
  // CART COUNT
  //
  // Example:
  // 0.5 kg + 1.5 kg = 2 kg
  // =========================================================

  const cartCount = cart.reduce(
    (total, item) => total + Number(item.cartQuantity),
    0,
  );

  // =========================================================
  // CART TOTAL
  // =========================================================

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price) * Number(item.cartQuantity),
    0,
  );

  // =========================================================
  // PROVIDER
  // =========================================================

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ============================================================
// USE CART
// ============================================================

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
};
