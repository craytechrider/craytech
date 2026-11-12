import React, { useEffect, useState } from "react";
import { Activity, Package, Scale, ShoppingCart } from "lucide-react";
import api from "../../lib/api";

const STORAGE_URL = (
  import.meta.env.VITE_STORAGE_URL || "https://craytech.site/storage"
).replace(/\/$/, "");

// =========================================================
// TYPES
// =========================================================

interface Area {
  id: number;
  name: string;
}

interface CrayfishType {
  id: number;
  name: string;
}

interface Batch {
  id: number;
  batch_name: string;
  area_id: number;
  crayfish_type_id: number;
  initial_population: number;
  current_population: number;
  date_added: string;

  area?: Area;
  crayfish_type?: CrayfishType;
  crayfishType?: CrayfishType;
}

interface Product {
  id: number;
  batch_id: number;

  name: string;
  description: string | null;

  total_weight_kg: number;
  available_weight_kg: number;

  price_per_kg: number;

  image: string | null;
  image_url?: string | null;

  is_available: boolean;

  batch?: Batch;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// =========================================================
// COMPONENT
// =========================================================

const Selling: React.FC = () => {
  // =========================================================
  // DATA
  // =========================================================

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // MODALS
  // =========================================================

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // =========================================================
  // PRODUCT FORM
  // =========================================================

  const [productId, setProductId] = useState<number | null>(null);

  const [batchId, setBatchId] = useState("");

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [totalWeightKg, setTotalWeightKg] = useState("");

  const [pricePerKg, setPricePerKg] = useState("");

  // =========================================================
  // IMAGE
  // =========================================================

  const [image, setImage] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // =========================================================
  // SEARCH / FILTER
  // =========================================================

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  // =========================================================
  // IMAGE URL
  // =========================================================

  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) {
      return null;
    }

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    let cleanPath = imagePath.replace(/^\/+/, "");

    if (!cleanPath.startsWith("products/")) {
      cleanPath = `products/${cleanPath}`;
    }

    return `${STORAGE_URL}/${cleanPath}`;
  };

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    try {
      setError("");

      const token =
        localStorage.getItem("craytech_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("access_token");

      if (!token) {
        setError("You are not authenticated. Please log in again.");
        return;
      }

      const response = await api.get<ApiResponse<Product[]>>("/products");

      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to load products.");
      }
    } catch (err: any) {
      console.error("Product API error:", err);

      if (err.response?.status === 401) {
        setError("You are not authenticated. Please log in again.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load products.",
        );
      }
    }
  };

  // =========================================================
  // LOAD BATCHES
  // =========================================================

  const loadBatches = async () => {
    setBatchLoading(true);

    try {
      const response = await api.get<ApiResponse<Batch[]>>("/batches");

      if (response.data.success) {
        setBatches(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to load batches.");
      }
    } catch (err: any) {
      console.error("Batch API error:", err);

      if (err.response?.status === 401) {
        setError("You are not authenticated. Please log in again.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load batches.",
        );
      }
    } finally {
      setBatchLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([loadProducts(), loadBatches()]);

      setLoading(false);
    };

    loadData();
  }, []);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setProductId(null);
    setBatchId("");
    setName("");
    setDescription("");
    setTotalWeightKg("");
    setPricePerKg("");
    setImage(null);
    setImagePreview(null);
  };

  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  const openAddModal = async () => {
    setError("");
    resetForm();
    await loadBatches();
    setAddModal(true);
  };

  // =========================================================
  // CLOSE ADD MODAL
  // =========================================================

  const closeAddModal = () => {
    setAddModal(false);
    resetForm();
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = (product: Product) => {
    setError("");

    setProductId(product.id);
    setBatchId(String(product.batch_id));
    setName(product.name);
    setDescription(product.description || "");
    setTotalWeightKg(String(product.total_weight_kg));
    setPricePerKg(String(product.price_per_kg));
    setImage(null);

    const existingImageUrl = getImageUrl(product.image);

    setImagePreview(existingImageUrl);
    setEditModal(true);
  };

  // =========================================================
  // CLOSE EDIT MODAL
  // =========================================================

  const closeEditModal = () => {
    setEditModal(false);
    resetForm();
  };

  // =========================================================
  // IMAGE CHANGE
  // =========================================================

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    setImage(file);

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImagePreview(null);
    }
  };

  // =========================================================
  // ADD PRODUCT
  // =========================================================

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!batchId) {
      setError("Please select a batch.");
      return;
    }

    if (!totalWeightKg || Number(totalWeightKg) <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    if (!pricePerKg || Number(pricePerKg) <= 0) {
      setError("Please enter a valid price per kilogram.");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("batch_id", batchId);
      formData.append("name", name);
      formData.append("description", description);
      formData.append("total_weight_kg", totalWeightKg);
      formData.append("price_per_kg", pricePerKg);

      if (image) {
        formData.append("image", image);
      }

      const response = await api.post<ApiResponse<Product>>(
        "/products",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        closeAddModal();
        await loadProducts();
      } else {
        setError(response.data.message || "Failed to add product.");
      }
    } catch (err: any) {
      console.error("Add product error:", err.response?.data || err);

      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to add product.");
      }
    }
  };

  // =========================================================
  // UPDATE PRODUCT
  // =========================================================

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!productId) {
      return;
    }

    if (!batchId) {
      setError("Please select a batch.");
      return;
    }

    if (!totalWeightKg || Number(totalWeightKg) <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    if (!pricePerKg || Number(pricePerKg) <= 0) {
      setError("Please enter a valid price per kilogram.");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("batch_id", batchId);
      formData.append("name", name);
      formData.append("description", description);
      formData.append("total_weight_kg", totalWeightKg);
      formData.append("price_per_kg", pricePerKg);
      formData.append("_method", "PUT");

      if (image) {
        formData.append("image", image);
      }

      const response = await api.post<ApiResponse<Product>>(
        `/products/${productId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        closeEditModal();
        await loadProducts();
      } else {
        setError(response.data.message || "Failed to update product.");
      }
    } catch (err: any) {
      console.error("Update product error:", err.response?.data || err);

      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to update product.");
      }
    }
  };

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const deleteProduct = async (id: number) => {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    setError("");

    try {
      const response = await api.delete<ApiResponse<null>>(`/products/${id}`);

      if (response.data.success) {
        await loadProducts();
      } else {
        setError(response.data.message || "Failed to delete product.");
      }
    } catch (err: any) {
      console.error("Delete product error:", err.response?.data || err);

      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to delete product.");
      }
    }
  };

  // =========================================================
  // FILTER PRODUCTS
  // =========================================================

  const filteredProducts = products.filter((product) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(searchValue) ||
      product.batch?.batch_name?.toLowerCase().includes(searchValue);

    if (!matchesSearch) {
      return false;
    }

    if (filter === "available") {
      return product.is_available;
    }

    if (filter === "hidden") {
      return !product.is_available;
    }

    return true;
  });

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalProducts = products.length;

  const totalWeight = products.reduce(
    (sum, product) => sum + Number(product.total_weight_kg || 0),
    0,
  );

  const availableWeight = products.reduce(
    (sum, product) => sum + Number(product.available_weight_kg || 0),
    0,
  );

  const availableProducts = products.filter(
    (product) => product.is_available,
  ).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-full bg-[#F5F8FC]">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1749D1] via-[#1644C2] to-[#102D79] px-5 py-6 text-white shadow-lg sm:px-7 sm:py-7 lg:px-9 lg:py-8">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 right-16 h-48 w-48 rounded-full bg-[#F59E0B]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/10">
                <ShoppingCart size={14} />
                Farm Commerce
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                Selling Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Manage your crayfish products, inventory, pricing, and product
                listings from one place.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">Error</p>
                <p className="mt-1 break-words text-sm">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none hover:bg-red-100"
                aria-label="Close error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <section className="grid grid-cols-4 gap-2 sm:gap-3">
          <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:text-[11px]">
                  Total Products
                </p>

                <h2 className="mt-1.5 break-words text-lg font-extrabold sm:mt-2 sm:text-3xl text-slate-800 sm:text-3xl">
                  {totalProducts}
                </h2>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1749D1] sm:flex">
                <Package size={21} />
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:text-[11px]">
                  Total Weight
                </p>

                <h2 className="mt-1.5 break-words text-lg font-extrabold sm:mt-2 sm:text-3xl text-[#1749D1] sm:text-3xl">
                  {totalWeight.toFixed(2)}
                </h2>

                <p className="mt-1 text-[9px] leading-tight text-slate-400 sm:text-xs">
                  kilograms
                </p>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1749D1] sm:flex">
                <Scale size={21} />
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:text-[11px]">
                  Available Weight
                </p>

                <h2 className="mt-1.5 break-words text-lg font-extrabold sm:mt-2 sm:text-3xl text-emerald-600 sm:text-3xl">
                  {availableWeight.toFixed(2)}
                </h2>

                <p className="mt-1 text-[9px] leading-tight text-slate-400 sm:text-xs">
                  kilograms
                </p>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:flex">
                <Activity size={21} />
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:text-[11px]">
                  Available Products
                </p>

                <h2 className="mt-1.5 break-words text-lg font-extrabold sm:mt-2 sm:text-3xl text-[#F59E0B] sm:text-3xl">
                  {availableProducts}
                </h2>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#F59E0B] sm:flex">
                <ShoppingCart size={21} />
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SEARCH / FILTER
        ====================================================== */}

        <section className="sticky top-16 z-40 -mx-3 bg-[#F5F8FC]/95 px-3 py-2 backdrop-blur-md sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-md sm:p-4">
            <div className="flex w-full flex-row items-center gap-2 sm:gap-3">
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1749D1] focus:bg-white focus:ring-2 focus:ring-[#1749D1]/10 sm:px-4 sm:text-sm"
              />

              <div className="w-[42%] shrink-0 sm:w-48">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-3 text-xs font-medium text-slate-700 outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10 sm:px-3 sm:text-sm"
                >
                  <option value="all">All Products</option>
                  <option value="available">Available</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PRODUCTS
        ====================================================== */}

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-extrabold text-slate-800 sm:text-xl">
              Products
            </h2>

            <p className="text-xs text-slate-500 sm:text-sm">
              {filteredProducts.length} product
              {filteredProducts.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {loading ? (
              <div className="col-span-full rounded-2xl bg-white py-14 text-center shadow-sm">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1749D1]" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading products...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1749D1]">
                  <Package size={26} />
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-600">
                  No products found
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Click <b>Add Product</b> to create your first product.
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const productImageUrl = getImageUrl(product.image);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* IMAGE */}

                    <div className="relative h-36 bg-slate-100 sm:h-40">
                      {productImageUrl ? (
                        <img
                          src={productImageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.error(
                              "Failed to load product image:",
                              productImageUrl,
                            );

                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-slate-400">
                          <div className="text-4xl">🦞</div>

                          <div className="mt-1 text-xs">No Image</div>
                        </div>
                      )}

                      <div className="absolute left-2.5 top-2.5">
                        {product.is_available ? (
                          <span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white shadow">
                            Available
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-500 px-2 py-1 text-[9px] font-bold text-white shadow">
                            Hidden
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CONTENT */}

                    <div className="p-3">
                      <h2 className="truncate text-base font-extrabold text-slate-800">
                        {product.name}
                      </h2>

                      <p className="mt-1.5 min-h-[34px] line-clamp-2 text-xs leading-4 text-slate-500">
                        {product.description || "No description"}
                      </p>

                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Batch</span>

                          <span className="max-w-[58%] break-words text-right font-semibold text-slate-700">
                            {product.batch?.batch_name || "—"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Area</span>

                          <span className="max-w-[58%] break-words text-right font-semibold text-slate-700">
                            {product.batch?.area?.name || "—"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Crayfish</span>

                          <span className="max-w-[58%] break-words text-right font-semibold text-slate-700">
                            {product.batch?.crayfishType?.name ||
                              product.batch?.crayfish_type?.name ||
                              "—"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Total</span>

                          <span className="font-bold text-[#1749D1]">
                            {Number(product.total_weight_kg).toFixed(2)} kg
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Available</span>

                          <span className="font-bold text-emerald-600">
                            {Number(product.available_weight_kg).toFixed(2)} kg
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg bg-orange-50 px-2.5 py-1.5">
                          <span className="font-medium text-slate-600">
                            Price / kg
                          </span>

                          <span className="font-extrabold text-[#D97706]">
                            ₱{Number(product.price_per_kg).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="rounded-lg bg-[#F59E0B] px-2.5 py-2 text-xs font-bold text-white transition hover:bg-[#D97706]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-lg bg-red-600 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* FLOATING ADD PRODUCT ACTION */}
        <div className="fixed bottom-6 right-5 z-[80] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
          <div
            className={`origin-bottom-right transition-all duration-200 ease-out ${
              showAddMenu
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-3 scale-90 opacity-0"
            }`}
            aria-hidden={!showAddMenu}
          >
            <button
              type="button"
              tabIndex={showAddMenu ? 0 : -1}
              onClick={() => {
                setShowAddMenu(false);
                void openAddModal();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-[#17365D] shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Package size={16} className="text-[#1749D1]" />
              Add Product
            </button>
          </div>

          <button
            type="button"
            aria-label={showAddMenu ? "Close add menu" : "Open add menu"}
            aria-expanded={showAddMenu}
            onClick={() => setShowAddMenu((current) => !current)}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-3xl font-light text-white shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 ${
              showAddMenu ? "rotate-45 bg-[#17365D]" : "rotate-0 bg-[#1749D1]"
            }`}
          >
            +
          </button>
        </div>

        {/* =====================================================
            ADD PRODUCT MODAL
        ====================================================== */}

        {addModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[2px] sm:p-4">
            <div className="flex max-h-[88vh] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-2xl">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1749D1] to-[#102D79] px-3 py-3 text-white sm:px-6 sm:py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">
                    Product Management
                  </p>

                  <h2 className="text-base font-extrabold sm:text-xl">
                    Add Product
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-xl px-3 py-2 text-xl text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleAddProduct}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-5 sm:p-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Batch
                    </label>

                    {batchLoading ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                        Loading batches...
                      </div>
                    ) : (
                      <select
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                      >
                        <option value="">Select Batch</option>

                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batch_name}
                            {" - "}
                            {batch.area?.name || "No Area"}
                            {" - "}
                            {batch.crayfishType?.name ||
                              batch.crayfish_type?.name ||
                              "No Type"}{" "}
                            (Alive: {batch.current_population})
                          </option>
                        ))}
                      </select>
                    )}

                    {!batchLoading && batches.length === 0 && (
                      <p className="mt-2 text-xs text-red-500">
                        No batches found. Create a batch first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Product Name
                    </label>

                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                      placeholder="e.g. Fresh Redclaw Crayfish"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Total Weight (kg)
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={totalWeightKg}
                        onChange={(e) => setTotalWeightKg(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                        placeholder="e.g. 20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Price per Kilogram
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={pricePerKg}
                        onChange={(e) => setPricePerKg(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                        placeholder="e.g. 500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Product Image
                    </label>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-[#1749D1]"
                    />

                    {imagePreview && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-36 w-full object-cover sm:h-56"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Description
                    </label>

                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                      placeholder="Product description..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5 sm:flex sm:justify-end sm:gap-3 sm:px-6 sm:py-3">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={batches.length === 0}
                    className="rounded-xl bg-[#1749D1] px-5 py-3 text-sm font-bold text-white hover:bg-[#123BAA] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================
            EDIT PRODUCT MODAL
        ====================================================== */}

        {editModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[2px] sm:p-4">
            <div className="flex max-h-[88vh] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-2xl">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1749D1] to-[#102D79] px-3 py-3 text-white sm:px-6 sm:py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">
                    Product Management
                  </p>

                  <h2 className="text-base font-extrabold sm:text-xl">
                    Edit Product
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl px-3 py-2 text-xl text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleUpdateProduct}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-5 sm:p-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Batch
                    </label>

                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                    >
                      <option value="">Select Batch</option>

                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_name}
                          {" - "}
                          {batch.area?.name || "No Area"}
                          {" - "}
                          {batch.crayfishType?.name ||
                            batch.crayfish_type?.name ||
                            "No Type"}{" "}
                          (Alive: {batch.current_population})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Product Name
                    </label>

                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Total Weight (kg)
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={totalWeightKg}
                        onChange={(e) => setTotalWeightKg(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Price per Kilogram
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={pricePerKg}
                        onChange={(e) => setPricePerKg(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Product Image
                    </label>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-[#1749D1]"
                    />

                    {imagePreview && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                        <img
                          src={imagePreview}
                          alt="Product"
                          className="h-36 w-full object-cover sm:h-56"
                        />
                      </div>
                    )}

                    <p className="mt-2 text-xs text-slate-400">
                      Select a new image only if you want to replace the current
                      image.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Description
                    </label>

                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-[#1749D1]/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5 sm:flex sm:justify-end sm:gap-3 sm:px-6 sm:py-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#F59E0B] px-5 py-3 text-sm font-bold text-white hover:bg-[#D97706]"
                  >
                    Update Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Selling;
