import React, { useEffect, useState } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  Loader2,
  CreditCard,
  Eye,
  ShoppingBag,
  Wallet,
  RotateCcw,
} from "lucide-react";

import CustomerPageHero from "../../components/CustomerPageHero";
import api from "../../lib/api";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface Product {
  id: number;
  name: string;
  image?: string | null;
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

interface DeliveryAddress {
  id: number;
  user_id: number;
  label: string;
  country: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  detailed_address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Order {
  id: number;
  order_number: string;

  customer_name: string;
  customer_contact: string;

  order_type: "online" | "walk_in" | string;

  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | string;

  delivery_method: "delivery" | "pickup" | string;

  delivery_address_id?: number | null;

  delivery_address?: DeliveryAddress | null;

  customer_note?: string | null;

  payment_method: "paymongo" | "cash" | string;

  payment_status: "pending" | "paid" | "failed" | "refunded" | string;

  cancellation_status?: "pending" | "approved" | "rejected" | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_reviewed_at?: string | null;
  cancellation_admin_note?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
  refund_amount?: number | string | null;
  refunded_at?: string | null;

  total_amount: number;

  created_at: string;
  updated_at: string;

  delivered_at?: string | null;

  delivery_proof_image?: string | null;

  items: OrderItem[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/*
|--------------------------------------------------------------------------
| STATUS CONFIG
|--------------------------------------------------------------------------
*/

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-50 text-yellow-700",
    icon: Clock,
  },

  confirmed: {
    label: "Confirmed",
    color: "bg-blue-50 text-blue-700",
    icon: CheckCircle,
  },

  preparing: {
    label: "Preparing",
    color: "bg-orange-50 text-orange-700",
    icon: ChefHat,
  },

  ready: {
    label: "Ready",
    color: "bg-purple-50 text-purple-700",
    icon: Package,
  },

  completed: {
    label: "Completed",
    color: "bg-green-50 text-green-700",
    icon: CheckCircle,
  },

  cancelled: {
    label: "Cancelled",
    color: "bg-red-50 text-red-700",
    icon: XCircle,
  },
};

/*
|--------------------------------------------------------------------------
| PAYMENT STATUS CONFIG
|--------------------------------------------------------------------------
*/

const paymentStatusConfig: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  pending: {
    label: "Payment Pending",
    color: "bg-yellow-50 text-yellow-700",
  },

  paid: {
    label: "Paid",
    color: "bg-green-50 text-green-700",
  },

  failed: {
    label: "Payment Failed",
    color: "bg-red-50 text-red-700",
  },

  refunded: {
    label: "Refunded",
    color: "bg-purple-50 text-purple-700",
  },
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const formatCurrency = (value: number) => {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date: string) => {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (date: string) => {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

/*
|--------------------------------------------------------------------------
| DELIVERY PROOF PHOTO
|--------------------------------------------------------------------------
*/

const getProofPhotoUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");

  return `${baseUrl}/storage/${path.replace(/^\/+/, "")}`;
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

const CustomerOrders: React.FC = () => {
  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  /*
  |--------------------------------------------------------------------------
  | LOAD ORDERS
  |--------------------------------------------------------------------------
  */

  const loadOrders = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log("Loading customer orders...");

      const response = await api.get<ApiResponse<Order[]>>("/orders");

      console.log("Customer orders response:", response.data);

      if (response.data.success) {
        setOrders(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to load your orders.");
      }
    } catch (err: any) {
      console.error("Customer orders error:", err);

      console.error("Server response:", err?.response?.data);

      if (err?.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else {
        setError(err?.response?.data?.message || "Failed to load your orders.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadOrders();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CANCEL ORDER
  |--------------------------------------------------------------------------
  */

  const cancelOrder = async (order: Order) => {
    const reason = window.prompt(
      `Please provide a reason for requesting cancellation of order ${order.order_number}:`,
      "",
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Please provide a reason for your cancellation request.");
      return;
    }

    const confirmed = window.confirm(
      `Submit a cancellation request for order ${order.order_number}? The order will remain active until the admin reviews your request.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.post(
        `/orders/${encodeURIComponent(order.order_number)}/cancel`,
        {
          reason: reason.trim(),
        },
      );

      await loadOrders();
    } catch (err: any) {
      console.error("Cancellation request error:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to submit the cancellation request.",
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | STATUS SUMMARY
  |--------------------------------------------------------------------------
  */

  const completedOrders = orders.filter(
    (order) => order.status === "completed",
  ).length;

  const filteredOrders = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();
    const payment = String(order.payment_status || "").toLowerCase();
    const refund = String(order.refund_status || "").toLowerCase();

    switch (activeTab) {
      case "to-pay":
        return payment === "pending" && status !== "cancelled";
      case "to-ship":
        return ["confirmed", "preparing"].includes(status);
      case "to-receive":
        return status === "ready";
      case "completed":
        return status === "completed";
      case "return-refund":
        return Boolean(refund) || payment === "refunded";
      case "cancelled":
        return status === "cancelled";
      default:
        return true;
    }
  });

  const orderTabs = [
    { id: "all", label: "All", icon: ShoppingBag, count: orders.length },
    {
      id: "to-pay",
      label: "To Pay",
      icon: Wallet,
      count: orders.filter(
        (order) =>
          String(order.payment_status).toLowerCase() === "pending" &&
          String(order.status).toLowerCase() !== "cancelled",
      ).length,
    },
    {
      id: "to-ship",
      label: "To Ship",
      icon: Package,
      count: orders.filter((order) =>
        ["confirmed", "preparing"].includes(String(order.status).toLowerCase()),
      ).length,
    },
    {
      id: "to-receive",
      label: "To Receive",
      icon: Truck,
      count: orders.filter(
        (order) => String(order.status).toLowerCase() === "ready",
      ).length,
    },
    {
      id: "completed",
      label: "Completed",
      icon: CheckCircle,
      count: completedOrders,
    },
    {
      id: "return-refund",
      label: "Return/Refund",
      icon: RotateCcw,
      count: orders.filter(
        (order) =>
          Boolean(order.refund_status) ||
          String(order.payment_status).toLowerCase() === "refunded",
      ).length,
    },
    {
      id: "cancelled",
      label: "Cancelled",
      icon: XCircle,
      count: orders.filter(
        (order) => String(order.status).toLowerCase() === "cancelled",
      ).length,
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <div className="min-w-0 w-full">
        <CustomerPageHero
          section="ORDER MANAGEMENT"
          title="My Orders"
          description="View your orders, track their status, and review your purchase history."
          type="orders"
        />

        {/* SHOPEE-STYLE ORDER STATUS NAVIGATION */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex w-full gap-7 overflow-x-auto px-5 scrollbar-thin">
            {orderTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap py-4 text-sm font-semibold transition ${
                    active
                      ? "text-[#E65B36]"
                      : "text-gray-600 hover:text-[#17365D]"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs ${
                      active ? "text-[#E65B36]" : "text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[#E65B36]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ====================================================
              ERROR
          ==================================================== */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div>
              <p className="font-bold text-red-700">Unable to load orders</p>

              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-xl text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* ====================================================
              LOADING
          ==================================================== */}

        {loading && (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <Loader2
              size={34}
              className="mx-auto animate-spin text-[#1749D1]"
            />

            <p className="mt-4 text-sm font-semibold text-gray-500">
              Loading your orders...
            </p>
          </div>
        )}

        {/* ====================================================
              EMPTY
          ==================================================== */}

        {!loading && orders.length === 0 && !error && (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Package size={30} className="text-[#1749D1]" />
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-[#17365D]">
              No Orders Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              You haven't placed any orders yet. Browse our available crayfish
              and place your first order.
            </p>
          </div>
        )}

        {!loading && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
              <Package size={26} className="text-[#E65B36]" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#17365D]">
              No {orderTabs.find((tab) => tab.id === activeTab)?.label} Orders
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Orders matching this status will appear here.
            </p>
          </div>
        )}

        {/* ====================================================
              ORDERS
          ==================================================== */}

        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const normalizedStatus = String(order.status || "").toLowerCase();
              const status = statusConfig[normalizedStatus] || statusConfig.pending;
              const StatusIcon = status.icon;
              const normalizedPaymentStatus = String(
                order.payment_status || "pending",
              ).toLowerCase();
              const payment =
                paymentStatusConfig[normalizedPaymentStatus] ||
                paymentStatusConfig.pending;
              const firstItem = order.items?.[0];
              const itemCount = order.items?.length || 0;
              const itemName = firstItem?.product?.name ||
                (firstItem ? `Product #${firstItem.product_id}` : "Order items");
              const remainingItems = Math.max(0, itemCount - 1);

              return (
                <article
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrder(order)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedOrder(order);
                    }
                  }}
                  className="cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:border-[#E65B36]/40 hover:shadow-md"
                >
                  {/* Compact Shopee-style shop/order header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <ShoppingBag size={16} className="shrink-0 text-[#E65B36]" />
                      <span className="truncate text-sm font-bold text-[#17365D]">
                        CRAYTECH
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="truncate text-xs text-gray-500">
                        {order.order_number}
                      </span>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
                    >
                      <StatusIcon size={13} />
                      {status.label}
                    </span>
                  </div>

                  {/* Product summary */}
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                      {firstItem?.product?.image ? (
                        <img
                          src={firstItem.product.image}
                          alt={itemName}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Package size={25} className="text-gray-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-800">
                        {itemName}
                      </p>
                      {firstItem && (
                        <p className="mt-1 text-xs text-gray-500">
                          {Number(firstItem.quantity).toLocaleString("en-PH", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}{" "}
                          kg × ₱{formatCurrency(Number(firstItem.unit_price))}
                        </p>
                      )}
                      {remainingItems > 0 && (
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          +{remainingItems} more {remainingItems === 1 ? "item" : "items"}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {firstItem && (
                        <p className="text-sm font-semibold text-gray-800">
                          ₱{formatCurrency(Number(firstItem.subtotal))}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        x{Number(firstItem?.quantity || 0).toLocaleString("en-PH", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Compact delivery/payment and total */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3">
                    <div className="min-w-0 text-xs text-gray-500">
                      <span className="capitalize">
                        {order.delivery_method || "—"}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className="capitalize">
                        {order.payment_method || "—"}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className={payment.color.replace(/bg-[^\s]+/, "").trim()}>
                        {payment.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="mr-2 text-xs text-gray-500">
                        Total {itemCount} {itemCount === 1 ? "item" : "items"}:
                      </span>
                      <span className="text-base font-extrabold text-[#E65B36]">
                        ₱{formatCurrency(Number(order.total_amount))}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-xs font-medium text-[#E65B36]">
                      Tap to view order details
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {normalizedStatus === "pending" &&
                        !order.cancellation_status && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              cancelOrder(order);
                            }}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="rounded-lg border border-[#E65B36] px-3 py-2 text-xs font-semibold text-[#E65B36] transition hover:bg-orange-50"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {order.cancellation_status && (
                    <div className="border-t border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-800">
                      Cancellation request:{" "}
                      <span className="font-bold capitalize">
                        {order.cancellation_status}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================
          VIEW ORDER MODAL
      ============================================================ */}

      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Order Details
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-[#17365D]">
                  {selectedOrder.order_number}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* BODY */}

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* STATUS */}

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-400">Order Status</p>

                  <p className="mt-1 font-bold capitalize text-gray-700">
                    {selectedOrder.status}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-400">Payment Status</p>

                  <p className="mt-1 font-bold capitalize text-gray-700">
                    {selectedOrder.payment_status}
                  </p>
                </div>
              </div>

              {/* ITEMS */}

              <h3 className="mb-4 font-extrabold text-[#17365D]">Items</h3>

              <div className="space-y-4">
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 rounded-xl border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-bold text-gray-700">
                        {item.product?.name || `Product #${item.product_id}`}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {Number(item.quantity).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        kg × ₱{formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>

                    <p className="font-bold text-gray-700">
                      ₱{formatCurrency(Number(item.subtotal))}
                    </p>
                  </div>
                ))}
              </div>

              {/* DELIVERY ADDRESS */}

              {selectedOrder.delivery_method === "delivery" &&
                selectedOrder.delivery_address && (
                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#1749D1]">
                      Delivery Address
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-blue-900">
                      {selectedOrder.delivery_address.label}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-900">
                      {selectedOrder.delivery_address.detailed_address}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      {selectedOrder.delivery_address.barangay},{" "}
                      {selectedOrder.delivery_address.municipality},{" "}
                      {selectedOrder.delivery_address.province},{" "}
                      {selectedOrder.delivery_address.region},{" "}
                      {selectedOrder.delivery_address.country}
                    </p>

                    {selectedOrder.delivery_address.latitude !== null &&
                      selectedOrder.delivery_address.longitude !== null && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-green-700">
                            Map location saved
                          </p>

                          <p className="mt-1 text-[11px] text-green-700">
                            Latitude:{" "}
                            {Number(
                              selectedOrder.delivery_address.latitude,
                            ).toFixed(6)}
                            <br />
                            Longitude:{" "}
                            {Number(
                              selectedOrder.delivery_address.longitude,
                            ).toFixed(6)}
                          </p>

                          <a
                            href={`https://www.google.com/maps?q=${selectedOrder.delivery_address.latitude},${selectedOrder.delivery_address.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center rounded-lg bg-[#1749D1] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0F2948]"
                          >
                            View Pinned Location
                          </a>
                        </div>
                      )}
                  </div>
                )}

              {/* ==================================================
                  PROOF OF DELIVERY
              ================================================== */}

              {selectedOrder.delivery_method === "delivery" && (
                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Proof of Delivery
                  </p>

                  {selectedOrder.delivery_proof_image ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-100 bg-white">
                      <img
                        src={
                          getProofPhotoUrl(
                            selectedOrder.delivery_proof_image,
                          ) || ""
                        }
                        alt="Proof of delivery"
                        className="max-h-[500px] w-full cursor-pointer object-contain"
                        onClick={() => {
                          const url = getProofPhotoUrl(
                            selectedOrder.delivery_proof_image,
                          );

                          if (url) {
                            window.open(url, "_blank");
                          }
                        }}
                      />

                      <div className="border-t border-emerald-100 p-3">
                        <button
                          type="button"
                          onClick={() => {
                            const url = getProofPhotoUrl(
                              selectedOrder.delivery_proof_image,
                            );

                            if (url) {
                              window.open(url, "_blank");
                            }
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          <Eye size={17} />
                          View Full Proof Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center">
                      <Eye size={30} className="mx-auto text-gray-300" />

                      <p className="mt-3 text-sm font-bold text-gray-500">
                        No proof photo available
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        No delivery proof photo was uploaded for this order.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TOTAL */}

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
                <span className="font-bold text-gray-500">Total Amount</span>

                <span className="text-2xl font-extrabold text-[#17365D]">
                  ₱{formatCurrency(Number(selectedOrder.total_amount))}
                </span>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-[#17365D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F2948]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerOrders;
