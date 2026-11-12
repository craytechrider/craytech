import React, { useEffect, useState } from "react";

import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  MapPin,
  Phone,
  User,
  RefreshCw,
  Eye,
  Loader2,
  ShoppingBag,
  CreditCard,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import api from "../../lib/api";

/*
|--------------------------------------------------------------------------
| FIX LEAFLET DEFAULT MARKER
|--------------------------------------------------------------------------
*/

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface Product {
  id: number;
  name: string;
  price_per_piece?: number | string;
  price_per_kg?: number | string;
}

interface OrderItem {
  id: number;
  product_id: number;

  selling_type: "piece" | "kilogram";

  quantity: number | string;

  unit_price: number | string;

  subtotal: number | string;

  // Actual crayfish pieces packed from the batch for this order item.
  packed_pieces?: number | null;

  product?: Product;
}

interface DeliveryAddress {
  id: number;

  user_id: number;

  label?: string | null;

  country: string;

  region: string;

  province: string;

  municipality: string;

  barangay: string;

  detailed_address?: string | null;

  latitude?: number | string | null;

  longitude?: number | string | null;

  is_default?: boolean;
}

interface DeliveryPersonnel {
  id: number;
  name: string;
  email: string;
  mobile_number?: string | null;
  role?: string;
  is_active: boolean;
}

interface Order {
  id: number;

  order_number?: string;

  customer_name: string;

  customer_contact?: string | null;

  order_type: "online" | "walk_in" | "customer";

  delivery_method?: "delivery" | "pickup" | null;

  delivery_address_id?: number | null;

  deliveryAddress?: DeliveryAddress | null;

  delivery_personnel_id?: number | null;

  delivery_status?: string | null;

  assigned_at?: string | null;

  delivered_at?: string | null;

  delivery_proof_image?: string | null;

  deliveryPersonnel?: DeliveryPersonnel | null;

  status: "pending" | "confirmed" | "completed" | "cancelled";

  cancellation_status?: "pending" | "approved" | "rejected" | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_reviewed_at?: string | null;
  cancellation_admin_note?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
  refund_amount?: number | string | null;
  refunded_at?: string | null;

  payment_method?: string | null;

  payment_status?: "pending" | "paid" | "failed" | "refunded" | string | null;

  total_amount: number | string;

  customer_note?: string | null;

  notes?: string | null;

  created_at: string;

  updated_at?: string;

  items: OrderItem[];
}

const normalizeOrder = (order: any): Order => ({
  ...order,
  deliveryAddress: order.deliveryAddress ?? order.delivery_address ?? null,
  deliveryPersonnel:
    order.deliveryPersonnel ?? order.delivery_personnel ?? null,
});

const getOrderRouteKey = (order: Order) =>
  encodeURIComponent(order.order_number || String(order.id));

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

/*
|--------------------------------------------------------------------------
| FORMATTERS
|--------------------------------------------------------------------------
*/

const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(price) || 0);
};

const formatDate = (date: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/*
|--------------------------------------------------------------------------
| ORDER STATUS
|--------------------------------------------------------------------------
*/

const getStatusStyle = (status: Order["status"]) => {
  switch (status) {
    case "pending":
      return {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: Clock,
        label: "Pending",
      };

    case "confirmed":
      return {
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: CheckCircle,
        label: "Confirmed",
      };

    case "completed":
      return {
        color: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
        label: "Completed",
      };

    case "cancelled":
      return {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        label: "Cancelled",
      };

    default:
      return {
        color: "bg-gray-50 text-gray-700 border-gray-200",
        icon: Clock,
        label: status,
      };
  }
};

/*
|--------------------------------------------------------------------------
| PAYMENT STATUS
|--------------------------------------------------------------------------
*/

const getPaymentStyle = (paymentStatus?: Order["payment_status"]) => {
  switch (paymentStatus) {
    case "paid":
      return {
        color: "bg-green-50 text-green-700 border-green-200",
        label: "Paid",
      };

    case "failed":
      return {
        color: "bg-red-50 text-red-700 border-red-200",
        label: "Payment Failed",
      };

    case "refunded":
      return {
        color: "bg-purple-50 text-purple-700 border-purple-200",
        label: "Refunded",
      };

    case "pending":
    default:
      return {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        label: "Payment Pending",
      };
  }
};

/*
|--------------------------------------------------------------------------
| ADDRESS FORMATTER
|--------------------------------------------------------------------------
*/

const getFullAddress = (address?: DeliveryAddress | null) => {
  if (!address) {
    return "No delivery address";
  }

  const parts = [
    address.detailed_address,
    address.barangay,
    address.municipality,
    address.province,
    address.region,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
};

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
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [deliveryPersonnel, setDeliveryPersonnel] = useState<
    DeliveryPersonnel[]
  >([]);

  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);

  // Delivery assignment is confirmed only after the admin records the
  // actual number of crayfish pieces packed from the batch.
  const [assignmentOrder, setAssignmentOrder] = useState<Order | null>(null);

  const [assignmentPersonnelId, setAssignmentPersonnelId] =
    useState<string>("");

  const [packedPieces, setPackedPieces] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Keep order cards compact until the administrator expands one.
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  /*
  |--------------------------------------------------------------------------
  | FETCH ORDERS
  |--------------------------------------------------------------------------
  */

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const response = await api.get("/orders");

      console.log("Orders response:", response.data);

      if (response.data?.success) {
        setOrders((response.data.data || []).map(normalizeOrder));
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch orders:", error);

      console.error("Server response:", error.response?.data);

      alert(error.response?.data?.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH DELIVERY PERSONNEL
  |--------------------------------------------------------------------------
  */

  const fetchDeliveryPersonnel = async () => {
    try {
      const response = await api.get("/delivery-personnel");

      if (response.data?.success) {
        setDeliveryPersonnel(response.data.data || []);
      } else {
        setDeliveryPersonnel([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch delivery personnel:", error);
      setDeliveryPersonnel([]);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchOrders();
    fetchDeliveryPersonnel();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const response = await api.get("/orders");

      if (response.data?.success) {
        setOrders((response.data.data || []).map(normalizeOrder));
      }
    } catch (error: any) {
      console.error("Refresh failed:", error);

      alert(error.response?.data?.message || "Unable to refresh orders.");
    } finally {
      setRefreshing(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ASSIGN DELIVERY PERSONNEL
  |--------------------------------------------------------------------------
  */

  const openDeliveryAssignment = (order: Order, personnelId: string) => {
    if (!personnelId) return;

    const initialPieces: Record<number, string> = {};

    order.items?.forEach((item) => {
      if (
        item.id &&
        item.packed_pieces !== null &&
        item.packed_pieces !== undefined
      ) {
        initialPieces[item.id] = String(item.packed_pieces);
      }
    });

    setAssignmentOrder(order);
    setAssignmentPersonnelId(personnelId);
    setPackedPieces(initialPieces);
  };

  const closeDeliveryAssignment = () => {
    if (assigningOrderId !== null) return;

    setAssignmentOrder(null);
    setAssignmentPersonnelId("");
    setPackedPieces({});
  };

  const confirmDeliveryAssignment = async () => {
    if (!assignmentOrder || !assignmentPersonnelId) return;

    const items = (assignmentOrder.items || []).map((item) => ({
      order_item_id: item.id,
      packed_pieces:
        packedPieces[item.id] !== undefined && packedPieces[item.id] !== ""
          ? Number(packedPieces[item.id])
          : null,
    }));

    const inventoryAlreadyRecorded = items.every(
      (item) => item.packed_pieces !== null && item.packed_pieces > 0,
    );

    if (!inventoryAlreadyRecorded) {
      const missing = items.find(
        (item) =>
          item.packed_pieces === null ||
          !Number.isInteger(item.packed_pieces) ||
          item.packed_pieces <= 0,
      );

      if (missing) {
        alert(
          "Please enter the actual number of crayfish pieces packed for every order item.",
        );
        return;
      }
    }

    const confirmed = window.confirm(
      `Assign this order to the selected delivery personnel?\n\n` +
        `The entered crayfish pieces will be deducted from the corresponding batch, ` +
        `and the ordered kilograms will be deducted from product stock.\n\n` +
        `This inventory deduction will happen only once.`,
    );

    if (!confirmed) return;

    try {
      setAssigningOrderId(assignmentOrder.id);

      await api.put(
        `/orders/${getOrderRouteKey(assignmentOrder)}/assign-delivery`,
        {
          delivery_personnel_id: Number(assignmentPersonnelId),
          items,
        },
      );

      alert(
        `Order #${
          assignmentOrder.order_number || assignmentOrder.id
        } assigned successfully. Inventory has been updated.`,
      );

      const assignedId = assignmentOrder.id;

      setAssignmentOrder(null);
      setAssignmentPersonnelId("");
      setPackedPieces({});

      await fetchOrders();

      if (selectedOrder?.id === assignedId) {
        const updated = await api.get(
          `/orders/${getOrderRouteKey(assignmentOrder)}`,
        );

        if (updated.data?.success) {
          setSelectedOrder(normalizeOrder(updated.data.data));
        }
      }
    } catch (error: any) {
      console.error("Failed to assign delivery personnel:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to assign delivery personnel and update inventory.",
      );
    } finally {
      setAssigningOrderId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE STATUS
  |--------------------------------------------------------------------------
  */

  const updateOrderStatus = async (order: Order, status: Order["status"]) => {
    if (order.status === status) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change order #${
        order.order_number || order.id
      } to ${status}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.put(`/orders/${getOrderRouteKey(order)}`, {
        status,
      });

      alert("Order status updated successfully.");

      await fetchOrders();

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
    } catch (error: any) {
      console.error("Failed to update order:", error);

      console.error("Server response:", error.response?.data);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to update order.",
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CANCEL ORDER
  |--------------------------------------------------------------------------
  */

  const reviewCancellation = async (
    order: Order,
    decision: "approved" | "rejected",
  ) => {
    const adminNote = window.prompt(
      decision === "approved"
        ? "Optional note for approving this cancellation:"
        : "Please enter a reason for rejecting this cancellation:",
      "",
    );

    if (adminNote === null) return;

    if (decision === "rejected" && !adminNote.trim()) {
      alert("Please provide a reason when rejecting a cancellation request.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${decision} the cancellation request for order #${
        order.order_number || order.id
      }?`,
    );

    if (!confirmed) return;

    try {
      await api.put(`/orders/${getOrderRouteKey(order)}/cancellation-review`, {
        decision,
        admin_note: adminNote.trim() || null,
      });

      alert(
        decision === "approved"
          ? order.payment_status === "paid"
            ? "Cancellation approved. PayMongo refund processing has started."
            : "Cancellation approved. The order has been cancelled."
          : "Cancellation request rejected.",
      );

      await fetchOrders();

      if (selectedOrder?.id === order.id) {
        const refreshed = await api.get(`/orders/${getOrderRouteKey(order)}`);
        if (refreshed.data?.success) {
          setSelectedOrder(normalizeOrder(refreshed.data.data));
        } else {
          setSelectedOrder(null);
        }
      }
    } catch (error: any) {
      console.error("Failed to review cancellation:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to review cancellation request.",
      );
      await fetchOrders();
      if (selectedOrder?.id === order.id) {
        const refreshed = await api.get(`/orders/${getOrderRouteKey(order)}`);
        if (refreshed.data?.success) {
          setSelectedOrder(normalizeOrder(refreshed.data.data));
        }
      }
    }
  };

  const retryRefund = async (order: Order) => {
    const confirmed = window.confirm(
      `Retry the PayMongo refund for order #${order.order_number || order.id}?`,
    );
    if (!confirmed) return;

    try {
      await api.post(`/orders/${getOrderRouteKey(order)}/refund-retry`);
      alert(
        "Refund retry submitted. Check the refund status before taking further action.",
      );
      await fetchOrders();
      if (selectedOrder?.id === order.id) {
        const refreshed = await api.get(`/orders/${getOrderRouteKey(order)}`);
        if (refreshed.data?.success) {
          setSelectedOrder(normalizeOrder(refreshed.data.data));
        }
      }
    } catch (error: any) {
      console.error("Failed to retry refund:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to retry the refund.",
      );
      await fetchOrders();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") {
      return true;
    }

    return order.status === statusFilter;
  });

  /*
  |--------------------------------------------------------------------------
  | COUNTS
  |--------------------------------------------------------------------------
  */

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.status === "pending",
  ).length;

  const confirmedOrders = orders.filter(
    (order) => order.status === "confirmed",
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "completed",
  ).length;

  const cancelledOrders = orders.filter(
    (order) => order.status === "cancelled",
  ).length;

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto animate-spin text-[#1749D1]" />

          <p className="mt-4 text-sm font-medium text-gray-500">
            Loading orders...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F5F8FC]">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        {/* =========================================================
            HERO / PAGE HEADER
            Mobile-first and spaced for the admin topbar/sidebar.
        ========================================================== */}

        <section
          className="
            relative mb-5 overflow-hidden rounded-2xl
            bg-gradient-to-br from-[#1749D1] via-[#123FAE] to-[#102D79]
            px-4 py-5 text-white shadow-lg
            sm:mb-6 sm:px-6 sm:py-7
            lg:mb-8 lg:px-8 lg:py-8
          "
        >
          {/* Decorative shapes */}
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-orange-500/20" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-7 shrink-0 rounded-full bg-[#F59E0B] sm:h-2 sm:w-9" />
                <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-100 sm:text-xs">
                  Order Management
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                Customer Orders
              </h1>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm sm:leading-6">
                Manage customer orders, delivery, pickup, payment, and order
                status from one place.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold sm:text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  {totalOrders} Total Orders
                </span>
                <span className="rounded-full bg-orange-500/90 px-3 py-1.5 text-white">
                  {pendingOrders} Pending
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SUMMARY */}

        <div className="mb-5 grid grid-cols-5 gap-2 sm:mb-6 sm:gap-3">
          <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-medium leading-tight text-gray-500 sm:text-sm">
                  Total Orders
                </p>

                <p className="mt-1 text-base font-extrabold text-gray-800 sm:mt-2 sm:text-2xl">
                  {totalOrders}
                </p>
              </div>

              <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-blue-50 sm:flex">
                <ShoppingBag size={16} className="text-[#1749D1]" />
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-medium leading-tight text-gray-500 sm:text-sm">
              Pending
            </p>

            <p className="mt-1 text-base font-extrabold text-yellow-600 sm:mt-2 sm:text-2xl">
              {pendingOrders}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-medium leading-tight text-gray-500 sm:text-sm">
              Confirmed
            </p>

            <p className="mt-1 text-base font-extrabold text-blue-600 sm:mt-2 sm:text-2xl">
              {confirmedOrders}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-medium leading-tight text-gray-500 sm:text-sm">
              Completed
            </p>

            <p className="mt-1 text-base font-extrabold text-green-600 sm:mt-2 sm:text-2xl">
              {completedOrders}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-medium leading-tight text-gray-500 sm:text-sm">
              Cancelled
            </p>

            <p className="mt-1 text-base font-extrabold text-red-600 sm:mt-2 sm:text-2xl">
              {cancelledOrders}
            </p>
          </div>
        </div>

        {/* FILTER */}

        <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:mb-6 sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {(
              [
                ["all", "All Orders"],
                ["pending", "Pending"],
                ["confirmed", "Confirmed"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
              ] as [StatusFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`
                  shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm
                  ${
                    statusFilter === value
                      ? "bg-[#1749D1] text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-[#1749D1]"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* EMPTY */}

        {filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
            <Package size={36} className="mx-auto text-[#1749D1]" />

            <h2 className="mt-5 text-xl font-extrabold text-[#1749D1]">
              No orders found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no orders matching this filter.
            </p>
          </div>
        )}

        {/* ORDERS - COMPACT SUMMARY WITH CLICK-TO-EXPAND */}
        <div className="w-full min-w-0 space-y-3">
          {filteredOrders.map((order) => {
            const status = getStatusStyle(order.status);
            const StatusIcon = status.icon;
            const payment = getPaymentStyle(order.payment_status);
            const address = order.deliveryAddress;
            const isExpanded = expandedOrderId === order.id;
            const firstItem = order.items?.[0];
            const itemCount = order.items?.length || 0;

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrderId(isExpanded ? null : order.id)
                  }
                  aria-expanded={isExpanded}
                  className="block w-full p-4 text-left transition hover:bg-gray-50 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-gray-800">
                          Order #{order.order_number || order.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.color}`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${payment.color}`}
                        >
                          <CreditCard size={12} />
                          {payment.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-400">
                        {formatDate(order.created_at)} · {order.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">Order total</p>
                      <p className="text-lg font-extrabold text-[#1749D1]">
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1749D1]">
                      <Package size={25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-800">
                        {firstItem?.product?.name ||
                          (firstItem
                            ? `Product #${firstItem.product_id}`
                            : "No order items")}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {firstItem
                          ? `${Number(firstItem.quantity)} ${firstItem.selling_type === "piece" ? "pcs" : "kg"}`
                          : "No items"}
                        {itemCount > 1
                          ? ` · +${itemCount - 1} more item${itemCount - 1 > 1 ? "s" : ""}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {order.delivery_method === "delivery"
                          ? "Delivery"
                          : "Pickup"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#1749D1]">
                      {isExpanded ? "Hide" : "Details"}
                      {isExpanded ? (
                        <ChevronUp size={17} />
                      ) : (
                        <ChevronDown size={17} />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/70 p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] text-gray-400">Customer</p>
                        <p className="mt-1 text-sm font-bold text-gray-800">
                          {order.customer_name}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] text-gray-400">Contact</p>
                        <p className="mt-1 text-sm font-bold text-gray-800">
                          {order.customer_contact || "Not provided"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[11px] text-gray-400">
                          {order.delivery_method === "delivery"
                            ? "Delivery address"
                            : "Fulfillment"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-bold text-gray-800">
                          {order.delivery_method === "delivery"
                            ? address
                              ? getFullAddress(address)
                              : "No address"
                            : "Customer Pickup"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
                      <div className="border-b border-gray-100 px-3 py-2.5">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
                          Order items ({itemCount})
                        </p>
                      </div>
                      {order.items?.map((item, index) => (
                        <div
                          key={item.id ?? `${order.id}-${index}`}
                          className="flex items-center justify-between gap-3 border-b border-gray-50 px-3 py-3 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-800">
                              {item.product?.name ||
                                `Product #${item.product_id}`}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {Number(item.quantity)}{" "}
                              {item.selling_type === "piece" ? "pcs" : "kg"} ×{" "}
                              {formatPrice(item.unit_price)}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-extrabold text-gray-800">
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {order.cancellation_status && (
                      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs">
                        <p className="font-extrabold uppercase tracking-wide text-orange-800">
                          Cancellation request: {order.cancellation_status}
                        </p>
                        {order.cancellation_reason && (
                          <p className="mt-1 text-orange-900">
                            Reason: {order.cancellation_reason}
                          </p>
                        )}
                        {order.cancellation_requested_at && (
                          <p className="mt-1 text-orange-700">
                            Requested:{" "}
                            {formatDate(order.cancellation_requested_at)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1749D1]"
                      >
                        <Eye size={16} />
                        View Full Details
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* FLOATING REFRESH BUTTON - styled like Farm Management's add button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={refreshing ? "Refreshing orders" : "Refresh orders"}
          title={refreshing ? "Refreshing orders..." : "Refresh orders"}
          className="
            fixed bottom-6 right-5 z-[70]
            flex h-14 w-14 items-center justify-center
            rounded-full border-2 border-white
            bg-[#1749D1] text-white shadow-xl
            transition-all duration-200
            hover:scale-105 hover:bg-[#102d79]
            focus:outline-none focus:ring-4 focus:ring-blue-200
            disabled:cursor-not-allowed disabled:opacity-60
            sm:bottom-8 sm:right-8
          "
        >
          <RefreshCw
            size={23}
            strokeWidth={2.4}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* ==========================================================
          INVENTORY + DELIVERY ASSIGNMENT MODAL
      ========================================================== */}

      {assignmentOrder && (
        <div
          className="
            fixed inset-0 z-[60]
            flex items-center justify-center
            bg-black/50 p-4
          "
          onClick={closeDeliveryAssignment}
        >
          <div
            className="
              max-h-[90vh] w-full max-w-2xl
              overflow-y-auto rounded-2xl
              bg-white shadow-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1749D1]">
                    Prepare Delivery
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold text-gray-800">
                    Order #{assignmentOrder.order_number || assignmentOrder.id}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Enter the actual number of crayfish pieces packed before
                    assigning the delivery personnel.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDeliveryAssignment}
                  disabled={assigningOrderId === assignmentOrder.id}
                  className="
                    flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-xl bg-gray-50 text-gray-500
                    hover:bg-gray-100 disabled:opacity-50
                  "
                  aria-label="Close"
                >
                  <XCircle size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Package size={20} className="mt-0.5 text-[#1749D1]" />

                  <div>
                    <p className="text-sm font-extrabold text-[#1749D1]">
                      Inventory deduction
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      The kilograms ordered will be deducted from the product
                      stock, while the actual pieces packed will be deducted
                      from the linked batch population.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {assignmentOrder.items?.map((item, index) => {
                  const alreadyRecorded =
                    item.packed_pieces !== null &&
                    item.packed_pieces !== undefined;

                  return (
                    <div
                      key={item.id ?? `${assignmentOrder.id}-${index}`}
                      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-extrabold text-gray-800">
                            {item.product?.name ||
                              `Product #${item.product_id}`}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Order quantity:{" "}
                            <span className="font-bold text-gray-700">
                              {Number(item.quantity).toFixed(2)} kg
                            </span>
                          </p>

                          {alreadyRecorded && (
                            <p className="mt-1 text-xs font-bold text-green-600">
                              Inventory already recorded:{" "}
                              {Number(item.packed_pieces)} pcs
                            </p>
                          )}
                        </div>

                        <div className="w-full sm:w-44">
                          <label className="mb-1.5 block text-xs font-bold text-gray-500">
                            Packed pieces
                          </label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={packedPieces[item.id] ?? ""}
                            disabled={
                              alreadyRecorded ||
                              assigningOrderId === assignmentOrder.id
                            }
                            onChange={(e) =>
                              setPackedPieces((current) => ({
                                ...current,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="e.g. 12"
                            className="
                              w-full rounded-xl border border-gray-200
                              bg-white px-4 py-3 text-sm font-bold text-gray-800
                              outline-none focus:border-[#1749D1]
                              focus:ring-4 focus:ring-blue-100
                              disabled:cursor-not-allowed disabled:bg-gray-100
                            "
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                  Delivery Personnel
                </p>

                <p className="mt-1 text-sm font-extrabold text-gray-800">
                  {deliveryPersonnel.find(
                    (person) => person.id === Number(assignmentPersonnelId),
                  )?.name || "Selected delivery personnel"}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeliveryAssignment}
                disabled={assigningOrderId === assignmentOrder.id}
                className="
                  rounded-xl border border-gray-200 bg-white
                  px-5 py-3 text-sm font-bold text-gray-600
                  hover:bg-gray-100 disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeliveryAssignment}
                disabled={assigningOrderId === assignmentOrder.id}
                className="
                  flex items-center justify-center gap-2
                  rounded-xl bg-[#1749D1] px-5 py-3
                  text-sm font-bold text-white
                  hover:bg-[#102d79]
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {assigningOrderId === assignmentOrder.id ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Updating Inventory...
                  </>
                ) : (
                  <>
                    <Truck size={17} />
                    Confirm & Assign Rider
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          FULL ORDER MODAL
      ========================================================== */}

      {selectedOrder && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/40 p-4
          "
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="
              max-h-[92vh] w-full
              max-w-4xl overflow-y-auto
              rounded-2xl bg-white
              shadow-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}

            <div
              className="
                flex items-center
                justify-between
                border-b border-gray-100
                p-6
              "
            >
              <div>
                <p
                  className="
                    text-xs font-bold
                    uppercase tracking-wide
                    text-[#1749D1]
                  "
                >
                  Order Details
                </p>

                <h2
                  className="
                    mt-1 text-2xl
                    font-extrabold
                    text-gray-800
                  "
                >
                  Order #{selectedOrder.order_number || selectedOrder.id}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl bg-gray-50
                  text-gray-500
                  transition
                  hover:bg-red-50
                  hover:text-red-500
                "
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              {/* CUSTOMER */}

              <div className="rounded-xl bg-gray-50 p-5">
                <h3 className="mb-4 text-sm font-extrabold text-[#1749D1]">
                  Customer Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>

                    <p className="mt-1 font-bold text-gray-800">
                      {selectedOrder.customer_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Contact</p>

                    <p className="mt-1 font-bold text-gray-800">
                      {selectedOrder.customer_contact || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Order Type</p>

                    <p className="mt-1 font-bold text-gray-800">
                      {selectedOrder.order_type === "online" ||
                      selectedOrder.order_type === "customer"
                        ? "Online Customer"
                        : "Walk-in"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Fulfillment</p>

                    <p className="mt-1 font-bold text-gray-800">
                      {selectedOrder.delivery_method === "delivery"
                        ? "Delivery"
                        : "Pickup"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Payment Method</p>

                    <p className="mt-1 font-bold text-gray-800">
                      {selectedOrder.payment_method === "paymongo"
                        ? "PayMongo"
                        : selectedOrder.payment_method || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Payment Status</p>

                    <span
                      className={`
                        mt-1 inline-flex
                        items-center gap-1.5
                        rounded-full border
                        px-3 py-1 text-xs
                        font-bold
                        ${getPaymentStyle(selectedOrder.payment_status).color}
                      `}
                    >
                      <CreditCard size={13} />

                      {getPaymentStyle(selectedOrder.payment_status).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* DELIVERY ADDRESS + MAP */}

              {selectedOrder.delivery_method === "delivery" && (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-[#1749D1]" />

                    <h3 className="text-sm font-extrabold text-[#1749D1]">
                      Delivery Location
                    </h3>
                  </div>

                  {selectedOrder.deliveryAddress ? (
                    <div className="space-y-4">
                      {/* ADDRESS CARD */}

                      <div
                        className="
                          rounded-xl
                          border border-gray-200
                          bg-white p-5
                        "
                      >
                        <div
                          className="
                            flex flex-col
                            gap-4
                            sm:flex-row
                            sm:items-start
                            sm:justify-between
                          "
                        >
                          <div>
                            {selectedOrder.deliveryAddress.label && (
                              <span
                                className="
                                  inline-flex
                                  rounded-full
                                  bg-blue-50
                                  px-3 py-1
                                  text-xs font-bold
                                  text-[#1749D1]
                                "
                              >
                                {selectedOrder.deliveryAddress.label}
                              </span>
                            )}

                            <p
                              className="
                                mt-3 text-base
                                font-extrabold
                                text-gray-800
                              "
                            >
                              {getFullAddress(selectedOrder.deliveryAddress)}
                            </p>
                          </div>

                          <div
                            className="
                              shrink-0
                              rounded-lg
                              bg-gray-50
                              px-3 py-2
                            "
                          >
                            <p
                              className="
                                text-[10px]
                                font-bold uppercase
                                tracking-wide
                                text-gray-400
                              "
                            >
                              Address ID
                            </p>

                            <p
                              className="
                                text-sm font-extrabold
                                text-gray-800
                              "
                            >
                              #{selectedOrder.deliveryAddress.id}
                            </p>
                          </div>
                        </div>

                        {selectedOrder.deliveryAddress.detailed_address && (
                          <div
                            className="
                              mt-4 border-t
                              border-gray-100
                              pt-4
                            "
                          >
                            <p className="text-xs text-gray-400">
                              Detailed Address
                            </p>

                            <p
                              className="
                                mt-1 text-sm
                                font-semibold
                                leading-6
                                text-gray-800
                              "
                            >
                              {selectedOrder.deliveryAddress.detailed_address}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* MAP */}

                      {selectedOrder.deliveryAddress.latitude != null &&
                      selectedOrder.deliveryAddress.longitude != null ? (
                        <div
                          className="
                            overflow-hidden
                            rounded-xl
                            border border-gray-200
                            shadow-sm
                          "
                        >
                          <div
                            className="
                              flex items-center
                              justify-between
                              bg-gray-50
                              px-4 py-3
                            "
                          >
                            <div
                              className="
                                flex items-center
                                gap-2
                              "
                            >
                              <Navigation
                                size={17}
                                className="text-[#1749D1]"
                              />

                              <span
                                className="
                                  text-sm
                                  font-extrabold
                                  text-gray-700
                                "
                              >
                                Pinned Location
                              </span>
                            </div>

                            <span
                              className="
                                text-xs
                                font-medium
                                text-gray-400
                              "
                            >
                              {Number(
                                selectedOrder.deliveryAddress.latitude,
                              ).toFixed(6)}
                              {" , "}
                              {Number(
                                selectedOrder.deliveryAddress.longitude,
                              ).toFixed(6)}
                            </span>
                          </div>

                          <MapContainer
                            center={[
                              Number(selectedOrder.deliveryAddress.latitude),
                              Number(selectedOrder.deliveryAddress.longitude),
                            ]}
                            zoom={17}
                            scrollWheelZoom={false}
                            style={{
                              height: "300px",
                              width: "100%",
                            }}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <Marker
                              position={[
                                Number(selectedOrder.deliveryAddress.latitude),
                                Number(selectedOrder.deliveryAddress.longitude),
                              ]}
                            >
                              <Popup>
                                <div className="text-sm">
                                  <strong>Delivery Location</strong>

                                  <br />

                                  {selectedOrder.deliveryAddress.municipality}

                                  <br />

                                  {selectedOrder.deliveryAddress.province}
                                </div>
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      ) : (
                        <div
                          className="
                            flex flex-col
                            items-center
                            justify-center
                            rounded-xl
                            border border-dashed
                            border-gray-300
                            bg-gray-50
                            px-6 py-12
                            text-center
                          "
                        >
                          <MapPin size={35} className="text-gray-400" />

                          <p
                            className="
                              mt-3 text-sm
                              font-bold
                              text-gray-600
                            "
                          >
                            No pinned location
                          </p>

                          <p
                            className="
                              mt-1 text-xs
                              text-gray-400
                            "
                          >
                            This delivery address does not have saved
                            coordinates.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="
                        rounded-xl
                        border border-dashed
                        border-gray-300
                        bg-gray-50
                        px-6 py-10
                        text-center
                      "
                    >
                      <MapPin size={35} className="mx-auto text-gray-400" />

                      <p
                        className="
                          mt-3 text-sm
                          font-bold text-gray-600
                        "
                      >
                        Delivery address not found
                      </p>

                      <p
                        className="
                          mt-1 text-xs
                          text-gray-400
                        "
                      >
                        Address ID:{" "}
                        {selectedOrder.delivery_address_id ?? "Not provided"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* DELIVERY PERSONNEL */}

              {selectedOrder.delivery_method === "delivery" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1749D1] shadow-sm">
                      <Truck size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#1749D1]">
                        Delivery Personnel
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Record packed crayfish pieces before assigning the
                        delivery personnel.
                      </p>
                    </div>
                  </div>

                  <select
                    value={selectedOrder.delivery_personnel_id ?? ""}
                    onChange={(e) =>
                      openDeliveryAssignment(selectedOrder, e.target.value)
                    }
                    disabled={
                      assigningOrderId === selectedOrder.id ||
                      deliveryPersonnel.filter((p) => p.is_active).length === 0
                    }
                    className="
                      w-full rounded-xl border border-gray-200
                      bg-white px-4 py-3 text-sm
                      font-semibold text-gray-800
                      outline-none focus:border-[#1749D1]
                      focus:ring-4 focus:ring-blue-100
                      disabled:cursor-not-allowed
                      disabled:bg-gray-100
                    "
                  >
                    <option value="">
                      {assigningOrderId === selectedOrder.id
                        ? "Assigning..."
                        : deliveryPersonnel.filter((p) => p.is_active)
                              .length === 0
                          ? "No active delivery personnel"
                          : "Select delivery personnel"}
                    </option>

                    {deliveryPersonnel
                      .filter((p) => p.is_active)
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                          {person.mobile_number
                            ? ` — ${person.mobile_number}`
                            : ""}
                        </option>
                      ))}
                  </select>

                  {selectedOrder.deliveryPersonnel && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Currently Assigned
                      </p>

                      <p className="mt-1 text-sm font-extrabold text-gray-800">
                        {selectedOrder.deliveryPersonnel.name}
                      </p>

                      {selectedOrder.deliveryPersonnel.mobile_number && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Phone size={12} />
                          {selectedOrder.deliveryPersonnel.mobile_number}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ITEMS */}

              <div>
                <h3 className="mb-4 text-sm font-extrabold text-[#1749D1]">
                  Items
                </h3>

                <div
                  className="
                    divide-y divide-gray-100
                    rounded-xl border
                    border-gray-100
                  "
                >
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      key={item.id ?? index}
                      className="
                        flex items-center
                        justify-between p-4
                      "
                    >
                      <div>
                        <p className="font-bold text-gray-800">
                          {item.product?.name || `Product #${item.product_id}`}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {Number(item.quantity)}{" "}
                          {item.selling_type === "piece" ? "pcs" : "kg"}
                          {" × "}
                          {formatPrice(item.unit_price)}
                        </p>

                        {item.packed_pieces !== null &&
                          item.packed_pieces !== undefined && (
                            <p className="mt-1 text-xs font-bold text-green-600">
                              Packed: {Number(item.packed_pieces)} pcs
                            </p>
                          )}
                      </div>

                      <p className="font-extrabold text-gray-800">
                        {formatPrice(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* NOTES */}

              {(selectedOrder.customer_note || selectedOrder.notes) && (
                <div
                  className="
                    rounded-xl
                    border border-orange-100
                    bg-orange-50 p-4
                  "
                >
                  <p
                    className="
                      text-xs font-bold
                      uppercase tracking-wide
                      text-orange-600
                    "
                  >
                    Notes
                  </p>

                  <p className="mt-2 text-sm text-gray-700">
                    {selectedOrder.customer_note || selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* ==================================================
                  DELIVERY PROOF
              ================================================== */}

              {selectedOrder.delivery_method === "delivery" && (
                <div className="rounded-xl border border-green-100 bg-green-50/50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
                      <Eye size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-green-700">
                        Proof of Delivery
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Photo received from the customer upon delivery.
                      </p>
                    </div>
                  </div>

                  {selectedOrder.delivery_proof_image ? (
                    <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
                      <img
                        src={
                          getProofPhotoUrl(
                            selectedOrder.delivery_proof_image,
                          ) || ""
                        }
                        alt="Proof of delivery"
                        className="
                          max-h-[500px] w-full
                          cursor-pointer object-contain
                        "
                        onClick={() => {
                          const url = getProofPhotoUrl(
                            selectedOrder.delivery_proof_image,
                          );

                          if (url) {
                            window.open(url, "_blank");
                          }
                        }}
                      />

                      <div className="border-t border-gray-100 p-3">
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
                          className="
                            flex w-full items-center
                            justify-center gap-2
                            rounded-xl
                            bg-green-600
                            px-4 py-3
                            text-sm font-bold
                            text-white
                            transition
                            hover:bg-green-700
                          "
                        >
                          <Eye size={17} />
                          View Full Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                      <Eye size={32} className="mx-auto text-gray-300" />

                      <p className="mt-3 text-sm font-bold text-gray-500">
                        No proof photo available
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        The delivery personnel has not uploaded a proof photo
                        for this order.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TOTAL */}

              <div
                className="
                  flex flex-col gap-4
                  border-t border-gray-100
                  pt-5 sm:flex-row
                  sm:items-end
                  sm:justify-between
                "
              >
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Amount
                  </p>

                  <p className="mt-1 text-3xl font-extrabold text-[#1749D1]">
                    {formatPrice(selectedOrder.total_amount)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`
                      inline-flex items-center
                      gap-1.5 rounded-full
                      border px-4 py-2
                      text-xs font-bold
                      ${getStatusStyle(selectedOrder.status).color}
                    `}
                  >
                    {React.createElement(
                      getStatusStyle(selectedOrder.status).icon,
                      {
                        size: 13,
                      },
                    )}

                    {getStatusStyle(selectedOrder.status).label}
                  </span>

                  <span
                    className={`
                      inline-flex items-center
                      gap-1.5 rounded-full
                      border px-4 py-2
                      text-xs font-bold
                      ${getPaymentStyle(selectedOrder.payment_status).color}
                    `}
                  >
                    <CreditCard size={13} />

                    {getPaymentStyle(selectedOrder.payment_status).label}
                  </span>
                </div>
              </div>
            </div>

            {selectedOrder.cancellation_status && (
              <div className="mx-5 mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-orange-800">
                  Cancellation Request: {selectedOrder.cancellation_status}
                </p>
                <p className="mt-2 text-sm text-orange-900">
                  <strong>Customer reason:</strong>{" "}
                  {selectedOrder.cancellation_reason || "No reason provided"}
                </p>
                {selectedOrder.cancellation_requested_at && (
                  <p className="mt-1 text-xs text-orange-700">
                    Requested:{" "}
                    {formatDate(selectedOrder.cancellation_requested_at)}
                  </p>
                )}
                {selectedOrder.cancellation_admin_note && (
                  <p className="mt-2 text-sm text-orange-900">
                    <strong>Admin note:</strong>{" "}
                    {selectedOrder.cancellation_admin_note}
                  </p>
                )}
              </div>
            )}

            {/* FOOTER */}

            <div
              className="
                border-t border-gray-100
                bg-gray-50 p-5
              "
            >
              <div className="flex flex-wrap gap-3">
                {selectedOrder.status === "pending" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateOrderStatus(selectedOrder, "confirmed")
                    }
                    className="
                      flex items-center gap-2
                      rounded-xl bg-[#1749D1]
                      px-5 py-3 text-sm
                      font-bold text-white
                      hover:bg-[#102d79]
                    "
                  >
                    <CheckCircle size={17} />
                    Confirm Order
                  </button>
                )}

                {selectedOrder.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateOrderStatus(selectedOrder, "completed")
                    }
                    className="
                      flex items-center gap-2
                      rounded-xl bg-green-600
                      px-5 py-3 text-sm
                      font-bold text-white
                      hover:bg-green-700
                    "
                  >
                    <CheckCircle size={17} />
                    Mark Completed
                  </button>
                )}

                {selectedOrder.cancellation_status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        reviewCancellation(selectedOrder, "approved")
                      }
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700"
                    >
                      <CheckCircle size={17} />
                      {selectedOrder.payment_status === "paid"
                        ? "Accept & Refund"
                        : "Approve Cancellation"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reviewCancellation(selectedOrder, "rejected")
                      }
                      className="flex items-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
                    >
                      <XCircle size={17} />
                      Reject Request
                    </button>
                  </>
                )}

                {selectedOrder.cancellation_status === "approved" &&
                  selectedOrder.payment_status === "paid" && (
                    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      Refund status:{" "}
                      <strong>
                        {selectedOrder.refund_status || "not started"}
                      </strong>
                      .
                      {selectedOrder.refund_status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => retryRefund(selectedOrder)}
                          className="mt-3 flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700"
                        >
                          <RefreshCw size={17} />
                          Retry Refund
                        </button>
                      ) : selectedOrder.refund_status === "pending" ||
                        selectedOrder.refund_status === "processing" ? (
                        <span>
                          {" "}
                          PayMongo is processing the refund. Do not submit
                          another refund request.
                        </span>
                      ) : null}
                    </div>
                  )}

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="
                    ml-auto rounded-xl
                    border border-gray-200
                    bg-white px-5 py-3
                    text-sm font-bold
                    text-gray-600
                    hover:bg-gray-100
                  "
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
