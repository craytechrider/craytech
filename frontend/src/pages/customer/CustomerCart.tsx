import React, { useMemo, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import CustomerPageHero from "../../components/CustomerPageHero";
import { useCart, CartItem } from "../../context/CartContext";

const BLUE = "#17365D";
const ORANGE = "#F59E0B";

const CustomerCart: React.FC = () => {
  const navigate = useNavigate();

  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();

  const cartItems: CartItem[] = cart || [];

  // =========================================================
  // SELECTED PRODUCTS
  // =========================================================

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectedItems = useMemo(() => {
    return cartItems.filter((item) => selectedIds.includes(item.id));
  }, [cartItems, selectedIds]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(price) || 0);
  };

  const getItemTotal = (item: CartItem) => {
    return Number(item.price) * Number(item.cartQuantity);
  };

  const getProductImage = (item: CartItem) => {
    return item.image || "/images/default-crayfish.jpg";
  };

  // =========================================================
  // CART TOTALS
  // =========================================================

  const selectedSubtotal = selectedItems.reduce(
    (total, item) => total + getItemTotal(item),
    0,
  );

  const selectedKg = selectedItems.reduce(
    (total, item) => total + Number(item.cartQuantity),
    0,
  );

  const allSelected =
    cartItems.length > 0 && selectedIds.length === cartItems.length;

  // =========================================================
  // CHECKBOX
  // =========================================================

  const toggleItem = (itemId: number) => {
    setSelectedIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }

      return [...current, itemId];
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(cartItems.map((item) => item.id));
  };

  // =========================================================
  // QUANTITY
  // =========================================================

  const increaseQuantity = (item: CartItem) => {
    const currentQuantity = Number(item.cartQuantity);

    const availableKg = Number(
      (
        item as CartItem & {
          available_weight_kg?: number;
        }
      ).available_weight_kg ?? 0,
    );

    const nextQuantity = Number((currentQuantity + 0.5).toFixed(2));

    if (availableKg > 0 && nextQuantity > availableKg) {
      return;
    }

    updateQuantity(item.id, nextQuantity);
  };

  const decreaseQuantity = (item: CartItem) => {
    const currentQuantity = Number(item.cartQuantity);

    if (currentQuantity <= 0.5) {
      return;
    }

    const nextQuantity = Number((currentQuantity - 0.5).toFixed(2));

    updateQuantity(item.id, nextQuantity);
  };

  // =========================================================
  // REMOVE
  // =========================================================

  const handleRemove = (item: CartItem) => {
    removeFromCart(item.id);

    setSelectedIds((current) => current.filter((id) => id !== item.id));
  };

  // =========================================================
  // CLEAR CART
  // =========================================================

  const handleClearCart = () => {
    clearCart();
    setSelectedIds([]);
  };

  // =========================================================
  // CHECKOUT SELECTED PRODUCTS
  // =========================================================

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one product to checkout.");
      return;
    }

    /*
     * IMPORTANT:
     *
     * The quantity comes directly from cartQuantity.
     *
     * Example:
     *
     * 5.0 kg in cart -> 5.0 kg in checkout
     * 2.5 kg in cart -> 2.5 kg in checkout
     * 0.5 kg in cart -> 0.5 kg in checkout
     *
     * It does NOT add the quantity to the cart.
     */

    const checkoutItems = selectedItems.map((item) => ({
      id: item.id,

      name: item.name,

      price: Number(item.price),

      quantity: Number(Number(item.cartQuantity).toFixed(2)),

      image: item.image || null,

      selling_type: item.selling_type || "kilogram",

      available_weight_kg: (
        item as CartItem & {
          available_weight_kg?: number;
        }
      ).available_weight_kg,

      available_pieces: (
        item as CartItem & {
          available_pieces?: number;
        }
      ).available_pieces,
    }));

    navigate("/customer/checkout", {
      state: {
        checkoutItems,
      },
    });
  };

  // =========================================================
  // CHECKBOX COMPONENT
  // IMPORTANT:
  // This is a DIV, NOT a BUTTON.
  // This prevents nested button errors.
  // =========================================================

  const SelectionCheckbox = ({
    checked,
    onClick,
    label,
  }: {
    checked: boolean;
    onClick: () => void;
    label: string;
  }) => {
    return (
      <div
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="
          flex
          h-6
          w-6
          shrink-0
          cursor-pointer
          items-center
          justify-center
          rounded-md
          border-2
          transition-all
          duration-150
        "
        style={{
          borderColor: checked ? BLUE : "#CBD5E1",

          backgroundColor: checked ? BLUE : "#FFFFFF",
        }}
      >
        {checked && <Check size={16} strokeWidth={3} className="text-white" />}
      </div>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="w-full min-w-0 pb-28">
      <div className="mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        {/* HERO */}
        <div className="mb-4">
          <CustomerPageHero
            section="SHOPPING CART"
            title="Your Cart"
            description="Review your selected crayfish products before proceeding to checkout."
            type="cart"
          />
        </div>

        {/* CART ACTIONS - keep the hero as the only page heading */}
        {cartItems.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500 sm:text-sm">
              {cartItems.length}{" "}
              {cartItems.length === 1 ? "product" : "products"} in your cart
            </p>
            <button
              type="button"
              onClick={handleClearCart}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50 sm:text-sm"
            >
              <span className="inline-flex items-center gap-1.5">
                <Trash2 size={13} /> Clear Cart
              </span>
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ShoppingCart size={30} style={{ color: BLUE }} />
            </div>
            <h2 className="mt-4 text-xl font-extrabold" style={{ color: BLUE }}>
              Your cart is empty
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              You haven't added any crayfish products to your cart yet.
            </p>
            <button
              type="button"
              onClick={() => navigate("/customer/dashboard")}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white"
              style={{ backgroundColor: BLUE }}
            >
              <ArrowLeft size={16} /> Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* SELECT ALL */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
              <button
                type="button"
                onClick={toggleAll}
                className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-700"
              >
                <SelectionCheckbox
                  checked={allSelected}
                  onClick={() => {}}
                  label="Select all products"
                />
                All
              </button>
              <span className="text-[11px] font-medium text-slate-400 sm:text-xs">
                {selectedItems.length} of {cartItems.length} selected
              </span>
            </div>

            {/* SHOPEE-STYLE PRODUCT ROWS */}
            {cartItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex gap-2.5 p-3 sm:gap-4 sm:p-4">
                    <div className="flex shrink-0 items-start gap-2">
                      <div className="pt-1">
                        <SelectionCheckbox
                          checked={isSelected}
                          onClick={() => toggleItem(item.id)}
                          label={`Select ${item.name}`}
                        />
                      </div>
                      <div className="h-[88px] w-[88px] overflow-hidden rounded-lg bg-slate-100 sm:h-28 sm:w-28">
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "/images/default-crayfish.jpg";
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 sm:text-[10px]">
                            Farm Fresh
                          </p>
                          <h3 className="mt-0.5 line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                            {item.name}
                          </h3>
                          <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">
                            Sold per kilogram
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Remove from cart"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-2">
                        <div>
                          <p className="text-[9px] text-slate-400 sm:text-[10px]">
                            Price / kg
                          </p>
                          <p className="text-sm font-bold text-[#D94B32] sm:text-base">
                            {formatPrice(Number(item.price))}
                          </p>
                        </div>

                        <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item)}
                            disabled={Number(item.cartQuantity) <= 0.5}
                            className="flex h-7 w-7 items-center justify-center text-slate-600 disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="min-w-[54px] px-1 text-center text-[10px] font-semibold text-slate-700 sm:text-xs">
                            {Number(item.cartQuantity).toFixed(1)} kg
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(item)}
                            className="flex h-7 w-7 items-center justify-center text-slate-600"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-[10px] text-slate-400 sm:text-xs">
                          Item Total
                        </span>
                        <span
                          className="text-sm font-extrabold sm:text-base"
                          style={{ color: BLUE }}
                        >
                          {formatPrice(getItemTotal(item))}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            <button
              type="button"
              onClick={() => navigate("/customer/dashboard")}
              className="inline-flex items-center gap-2 px-1 py-2 text-xs font-bold sm:text-sm"
              style={{ color: BLUE }}
            >
              <ArrowLeft size={15} /> Continue Shopping
            </button>
          </div>
        )}
      </div>

      {/* SHOPEE-STYLE STICKY CHECKOUT BAR */}
      {cartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white px-3 py-2.5 shadow-[0_-5px_18px_rgba(15,23,42,0.10)] sm:px-5 sm:py-3 lg:left-64">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-700 sm:text-sm"
            >
              <SelectionCheckbox
                checked={allSelected}
                onClick={() => {}}
                label="Select all products"
              />
              All
            </button>

            <div className="ml-auto min-w-0 text-right">
              <p className="text-[9px] text-slate-400 sm:text-[10px]">
                {selectedItems.length} selected
              </p>
              <p className="truncate text-sm font-extrabold text-[#D94B32] sm:text-lg">
                {formatPrice(selectedSubtotal)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
              className="flex h-10 shrink-0 items-center justify-center rounded-lg px-3.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:px-6 sm:text-sm"
              style={{ backgroundColor: "#D94B32" }}
            >
              Checkout ({selectedItems.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCart;
