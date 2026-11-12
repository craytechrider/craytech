import React, { useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Package,
  Search,
  AlertCircle,
  Weight,
  Fish,
  X,
  CreditCard,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import CustomerPageHero from "../../components/CustomerPageHero";
import api from "../../lib/api";
import { useCart } from "../../context/CartContext";

// =========================================================
// TYPES
// =========================================================

interface CrayfishType {
  id?: number;
  name: string;
}

interface AreaType {
  id?: number;
  name: string;
}

interface Area {
  id?: number;
  name?: string;
  area_type?: AreaType;
}

interface Batch {
  id: number;
  area?: Area;
  crayfish_type?: CrayfishType;
}

interface Product {
  id: number;
  batch_id: number;

  name: string;
  description: string | null;

  total_weight_kg: number;
  available_weight_kg: number;

  price_per_kg: number;

  is_available: number | boolean;
  status: number | boolean;

  image: string | null;
  image_url: string | null;

  batch?: Batch;
}

interface CartProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  selling_type: "kilogram";
  available_weight_kg: number;
}

// =========================================================
// COLORS
// =========================================================

const BLUE = "#17365D";
const ORANGE = "#F59E0B";

// =========================================================
// COMPONENT
// =========================================================

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // =========================================================
  // DATA
  // =========================================================

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  // =========================================================
  // QUANTITIES
  // =========================================================

  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // =========================================================
  // MODAL
  // =========================================================

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [showModal, setShowModal] = useState(false);

  // =========================================================
  // CART
  // =========================================================

  const { addToCart } = useCart();

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products");

      console.log("Products API response:", response.data);

      if (response.data?.success) {
        const productData: Product[] = response.data.data || [];

        setProducts(productData);

        // -----------------------------------------------------
        // Default quantity = 0.5 KG
        // -----------------------------------------------------

        const defaultQuantities: Record<number, number> = {};

        productData.forEach((product) => {
          const availableKg = Number(product.available_weight_kg) || 0;

          if (availableKg >= 0.5) {
            defaultQuantities[product.id] = 0.5;
          } else {
            defaultQuantities[product.id] = 0;
          }
        });

        setQuantities(defaultQuantities);
      } else {
        setProducts([]);

        setError(response.data?.message || "Unable to load products.");
      }
    } catch (err: any) {
      console.error("Product API error:", err);

      if (err?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err?.response?.status === 403) {
        setError("You are not authorized to view products.");
      } else {
        setError(
          err?.response?.data?.message ||
            "Unable to load products. Please try again.",
        );
      }

      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadProducts();
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  const getQuantity = (product: Product): number => {
    return quantities[product.id] || 0;
  };

  const getAvailableKg = (product: Product): number => {
    return Number(product.available_weight_kg) || 0;
  };

  const isKgAvailable = (product: Product): boolean => {
    return getAvailableKg(product) >= 0.5 && Number(product.price_per_kg) > 0;
  };

  const isProductAvailable = (product: Product): boolean => {
    return Boolean(product.is_available) && isKgAvailable(product);
  };

  const getPrice = (product: Product): number => {
    return Number(product.price_per_kg) || 0;
  };

  const getTotal = (product: Product): number => {
    return getPrice(product) * getQuantity(product);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(price) || 0);
  };

  const getProductImage = (product: Product) => {
    return product.image_url || "/images/default-crayfish.jpg";
  };

  // =========================================================
  // QUANTITY
  // =========================================================

  const increaseQuantity = (product: Product) => {
    const current = getQuantity(product);

    const available = getAvailableKg(product);

    const next = Number((current + 0.5).toFixed(2));

    if (next <= available) {
      setQuantities((prev) => ({
        ...prev,
        [product.id]: next,
      }));
    }
  };

  const decreaseQuantity = (product: Product) => {
    const current = getQuantity(product);

    const next = Number((current - 0.5).toFixed(2));

    if (next >= 0.5) {
      setQuantities((prev) => ({
        ...prev,
        [product.id]: next,
      }));
    }
  };

  // =========================================================
  // CREATE CART ITEM
  // =========================================================

  const createCartItem = (product: Product): CartProduct | null => {
    const quantity = getQuantity(product);

    const availableKg = getAvailableKg(product);

    const pricePerKg = getPrice(product);

    // -------------------------------------------------------
    // Product availability
    // -------------------------------------------------------

    if (!Boolean(product.is_available)) {
      alert("This product is currently unavailable.");

      return null;
    }

    // -------------------------------------------------------
    // Minimum purchase
    // -------------------------------------------------------

    if (quantity < 0.5) {
      alert("The minimum purchase is 0.5 kg.");

      return null;
    }

    // -------------------------------------------------------
    // Price validation
    // -------------------------------------------------------

    if (pricePerKg <= 0) {
      alert("This product does not have a valid kilogram price.");

      return null;
    }

    // -------------------------------------------------------
    // Stock validation
    // -------------------------------------------------------

    if (quantity > availableKg) {
      alert("Requested quantity exceeds the available weight.");

      return null;
    }

    // -------------------------------------------------------
    // Normalize quantity
    // -------------------------------------------------------

    const normalizedQuantity = Number(Number(quantity).toFixed(2));

    return {
      id: product.id,

      name: product.name,

      price: pricePerKg,

      quantity: normalizedQuantity,

      image: product.image_url,

      selling_type: "kilogram",

      available_weight_kg: availableKg,
    };
  };

  // =========================================================
  // ADD TO CART
  // =========================================================

  const handleAddToCart = (product: Product) => {
    try {
      const cartItem = createCartItem(product);

      if (!cartItem) {
        return;
      }

      /*
       * ADD TO CART ONLY.
       *
       * This modifies the actual cart.
       */
      addToCart(cartItem as any);

      alert(
        `${product.name} - ${cartItem.quantity.toFixed(1)} kg added to cart.`,
      );
    } catch (err) {
      console.error("Add to cart error:", err);

      alert("Unable to add product to cart.");
    }
  };

  // =========================================================
  // DIRECT CHECKOUT
  // =========================================================

  const handleCheckout = (product: Product) => {
    try {
      const checkoutItem = createCartItem(product);

      if (!checkoutItem) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * DO NOT call addToCart() here.
       *
       * Direct checkout should NOT modify
       * the customer's cart.
       *
       * We pass the selected product and
       * selected KG directly to Checkout.
       */

      navigate("/customer/checkout", {
        state: {
          checkoutItem,
        },
      });
    } catch (err) {
      console.error("Checkout error:", err);

      alert("Unable to proceed to checkout.");
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase();

    return (
      product.name?.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search) ||
      product.batch?.crayfish_type?.name?.toLowerCase().includes(search) ||
      product.batch?.area?.name?.toLowerCase().includes(search)
    );
  });

  // =========================================================
  // QUANTITY COMPONENT
  // =========================================================

  const QuantityControl = ({ product }: { product: Product }) => {
    const quantity = getQuantity(product);

    const max = getAvailableKg(product);

    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Quantity</span>

          <span
            className="text-xs font-medium"
            style={{
              color: BLUE,
            }}
          >
            Kilograms
          </span>
        </div>

        <div className="flex h-11 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => decreaseQuantity(product)}
            disabled={quantity <= 0.5}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={16} />
          </button>

          <span className="text-sm font-bold text-gray-800">
            {quantity.toFixed(1)} kg
          </span>

          <button
            type="button"
            onClick={() => increaseQuantity(product)}
            disabled={quantity >= max}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  };

  // =========================================================
  // OPEN / CLOSE MODAL
  // =========================================================

  const openProduct = (product: Product) => {
    setSelectedProduct(product);

    // Make sure modal has a valid 0.5 kg quantity

    const current = getQuantity(product);

    if (current < 0.5 && getAvailableKg(product) >= 0.5) {
      setQuantities((prev) => ({
        ...prev,
        [product.id]: 0.5,
      }));
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);

    setShowModal(false);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div
        className="
      mx-auto
      w-full
      max-w-[1600px]
      px-4
      py-5
      sm:px-6
      sm:py-7
      lg:px-8
      lg:py-8
      xl:px-10
    "
      >
        {/* =================================================
              HEADER
          ================================================= */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <CustomerPageHero
            section="CUSTOMER DASHBOARD"
            title="Welcome to CRAYTECH"
            description="Browse available crayfish, manage your orders, and monitor your purchases in one place."
            type="dashboard"
          />

          {/* SEARCH */}

          <div className="relative w-full lg:w-96">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search crayfish..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#17365D] focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        {/* =================================================
              ERROR
          ================================================= */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={21} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load products</p>

              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* =================================================
              LOADING
          ================================================= */}

        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
              >
                <div className="h-52 animate-pulse bg-gray-200" />

                <div className="space-y-4 p-5">
                  <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />

                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />

                  <div className="h-10 animate-pulse rounded bg-gray-200" />

                  <div className="h-10 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =================================================
              EMPTY
          ================================================= */}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center">
            <Package size={48} className="mx-auto text-gray-300" />

            <h2
              className="mt-4 text-xl font-bold"
              style={{
                color: BLUE,
              }}
            >
              No products found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {searchTerm
                ? "Try searching for another crayfish."
                : "There are currently no products available."}
            </p>
          </div>
        )}

        {/* =================================================
              PRODUCTS
          ================================================= */}

        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const available = isProductAvailable(product);

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${product.name} details`}
                  onClick={() => openProduct(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProduct(product);
                    }
                  }}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#17365D] sm:rounded-2xl"
                >
                  {/* IMAGE */}

                  <div className="relative h-36 overflow-hidden bg-gray-100 sm:h-52">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/images/default-crayfish.jpg";
                      }}
                    />

                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* STOCK */}

                    <div className="absolute left-3 top-3">
                      {available ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold shadow">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          In Stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* CRAYFISH TYPE */}

                    {product.batch?.crayfish_type?.name && (
                      <div className="absolute bottom-3 left-4 text-white">
                        <p className="text-xs font-medium opacity-80">
                          Crayfish Type
                        </p>

                        <p className="font-bold">
                          {product.batch.crayfish_type.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}

                  <div className="p-3 sm:p-5">
                    {/* NAME */}

                    <h2
                      className="truncate text-sm font-extrabold sm:text-lg"
                      style={{
                        color: BLUE,
                      }}
                    >
                      {product.name}
                    </h2>

                    {/* DESCRIPTION */}

                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500 sm:text-xs sm:leading-5">
                        {product.description}
                      </p>
                    )}

                    {/* STOCK INFO */}

                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
                      <div className="rounded-lg bg-gray-50 p-2 sm:rounded-xl sm:p-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Weight size={14} />

                          <span className="text-[9px] font-medium sm:text-[11px]">
                            Available
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-bold text-gray-800 sm:text-sm">
                          {Number(product.available_weight_kg).toFixed(2)} kg
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-2 sm:rounded-xl sm:p-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Fish size={14} />

                          <span className="text-[9px] font-medium sm:text-[11px]">
                            Selling
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-bold text-gray-800 sm:text-sm">
                          Per kg
                        </p>
                      </div>
                    </div>

                    {/* PRICE */}

                    <div className="mt-3 flex items-end justify-between sm:mt-5">
                      <div>
                        <p className="text-xs text-gray-400">Price</p>

                        <p
                          className="text-lg font-extrabold sm:text-2xl"
                          style={{
                            color: BLUE,
                          }}
                        >
                          {formatPrice(product.price_per_kg)}
                        </p>

                        <p className="text-xs text-gray-400">per kilogram</p>
                      </div>

                      <div
                        className="mb-1 h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: ORANGE,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-semibold text-[#17365D] sm:mt-4 sm:pt-4 sm:text-sm">
                      <span>View product details</span>
                      <span aria-hidden="true" className="text-base">›</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
          PRODUCT MODAL
      ===================================================== */}

      {showModal && selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2">
              {/* IMAGE */}

              <div className="relative h-56 sm:h-72 md:h-full md:min-h-[520px]">
                <img
                  src={getProductImage(selectedProduct)}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                    Farm Fresh
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold">
                    {selectedProduct.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
                >
                  <X size={20} />
                </button>
              </div>

              {/* DETAILS */}

              <div className="overflow-y-auto p-4 sm:p-7">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: ORANGE,
                    }}
                  />

                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: BLUE,
                    }}
                  >
                    Product Details
                  </span>
                </div>

                <h2
                  className="mt-2 text-2xl font-extrabold"
                  style={{
                    color: BLUE,
                  }}
                >
                  {selectedProduct.name}
                </h2>

                {selectedProduct.description && (
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {selectedProduct.description}
                  </p>
                )}

                {/* PURCHASE TYPE */}

                <div className="mt-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    Purchase by
                  </p>

                  <div className="rounded-xl border border-[#17365D] bg-[#17365D] px-4 py-3 text-center text-sm font-bold text-white">
                    Per Kilogram
                  </div>
                </div>

                {/* PRICE */}

                <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                  <p className="text-xs font-medium text-gray-400">
                    Current Price
                  </p>

                  <div className="mt-1 flex items-end gap-2">
                    <span
                      className="text-3xl font-extrabold"
                      style={{
                        color: BLUE,
                      }}
                    >
                      {formatPrice(selectedProduct.price_per_kg)}
                    </span>

                    <span className="mb-1 text-xs text-gray-400">per kg</span>
                  </div>
                </div>

                {/* STOCK */}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">Available Weight</p>

                    <p
                      className="mt-1 text-lg font-bold"
                      style={{
                        color: BLUE,
                      }}
                    >
                      {Number(selectedProduct.available_weight_kg).toFixed(2)}{" "}
                      kg
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">Unit Price</p>

                    <p
                      className="mt-1 text-lg font-bold"
                      style={{
                        color: BLUE,
                      }}
                    >
                      {formatPrice(selectedProduct.price_per_kg)}
                    </p>

                    <p className="text-xs text-gray-400">/ kg</p>
                  </div>
                </div>

                {/* QUANTITY */}

                {isProductAvailable(selectedProduct) && (
                  <>
                    <div className="mt-6">
                      <QuantityControl product={selectedProduct} />
                    </div>

                    {/* TOTAL */}

                    <div
                      className="mt-5 flex items-center justify-between rounded-2xl p-5"
                      style={{
                        backgroundColor: "#FFF7E6",
                      }}
                    >
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Order Total
                        </p>

                        <p
                          className="mt-1 text-2xl font-extrabold"
                          style={{
                            color: BLUE,
                          }}
                        >
                          {formatPrice(getTotal(selectedProduct))}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {getQuantity(selectedProduct).toFixed(1)} kg
                        </p>
                      </div>

                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: ORANGE,
                        }}
                      >
                        <ShoppingCart size={19} className="text-white" />
                      </div>
                    </div>

                    {/* ADD TO CART + CHECKOUT */}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {/* ADD TO CART */}

                      <button
                        type="button"
                        onClick={() => {
                          handleAddToCart(selectedProduct);

                          closeModal();
                        }}
                        disabled={getQuantity(selectedProduct) < 0.5}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#17365D] bg-white text-sm font-bold text-[#17365D] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <ShoppingCart size={18} />
                        Add to Cart
                      </button>

                      {/* CHECKOUT */}

                      <button
                        type="button"
                        onClick={() => {
                          /*
                           * IMPORTANT:
                           *
                           * This does NOT add to cart.
                           */
                          handleCheckout(selectedProduct);

                          closeModal();
                        }}
                        disabled={getQuantity(selectedProduct) < 0.5}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#17365D] text-sm font-bold text-white transition hover:bg-[#0F2948] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        <CreditCard size={18} />
                        Checkout
                      </button>
                    </div>
                  </>
                )}

                {/* UNAVAILABLE */}

                {!isProductAvailable(selectedProduct) && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-sm font-bold text-red-600">
                      This product is currently unavailable.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
