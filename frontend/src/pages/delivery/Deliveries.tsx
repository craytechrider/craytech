import React, { useEffect, useMemo, useState } from "react";
import {
  Truck,
  Package,
  Search,
  RefreshCw,
  Loader2,
  MapPin,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Navigation,
  XCircle,
  Eye,
} from "lucide-react";

import api from "../../lib/api";

// ============================================================
// TYPES
// ============================================================

interface DeliveryAddress {
  id: number;
  label?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  municipality?: string | null;
  barangay?: string | null;
  detailed_address?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface Product {
  id: number;
  name?: string;
  image?: string | null;
}

interface OrderItem {
  id: number;
  quantity: string | number;
  unit_price: string | number;
  subtotal: string | number;
  product?: Product | null;
}

interface DeliveryOrder {
  id: number;
  order_number: string;

  customer_name: string;
  customer_contact?: string | null;

  status?: string | null;
  delivery_status?: string | null;

  delivery_method?: string | null;

  total_amount: string | number;

  customer_note?: string | null;

  created_at: string;
  assigned_at?: string | null;
  delivered_at?: string | null;

  delivery_proof_image?: string | null;

  deliveryAddress?: DeliveryAddress | null;
  delivery_address?: DeliveryAddress | null;

  items?: OrderItem[];
}

interface OrdersResponse {
  success: boolean;
  data: DeliveryOrder[];
  message?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const BLUE = "#17365D";
const ORANGE = "#F59E0B";
const DARK_BLUE = "#102d79";

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value: string | number) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const getAddress = (order: DeliveryOrder): DeliveryAddress | null => {
  return order.deliveryAddress ?? order.delivery_address ?? null;
};

const getAddressText = (order: DeliveryOrder) => {
  const address = getAddress(order);

  if (!address) {
    return "Delivery address unavailable";
  }

  const parts = [
    address.detailed_address,
    address.barangay,
    address.municipality,
    address.province,
    address.region,
  ].filter(Boolean);

  return parts.join(", ") || "Delivery address unavailable";
};

/*
|--------------------------------------------------------------------------
| DELIVERY PROOF PHOTO
|--------------------------------------------------------------------------
*/

const getProofPhotoUrl = (path?: string | null) => {
  if (!path) return null;

  const rawPath = String(path).trim();
  if (!rawPath) return null;
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  const configuredBase = String(api.defaults.baseURL || window.location.origin);
  const baseWithoutApi = configuredBase.replace(/\/api\/?$/i, "");
  let siteOrigin = window.location.origin;

  try {
    siteOrigin = new URL(baseWithoutApi, window.location.origin).origin;
  } catch {
    // Keep the current site origin as a safe fallback.
  }

  let cleanPath = rawPath.replace(/^\/+/, "").replace(/^public\//i, "");
  cleanPath = cleanPath.replace(/^storage\/app\/public\//i, "");
  if (/^storage\//i.test(cleanPath)) {
    return `${siteOrigin}/${cleanPath}`;
  }

  return `${siteOrigin}/storage/${cleanPath}`;
};

// ============================================================
// STATUS
// ============================================================

const getStatusLabel = (status?: string | null) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "delivered":
      return "Delivered";

    case "out_for_delivery":
      return "Out for Delivery";

    case "assigned":
      return "Assigned";

    case "cancelled":
      return "Cancelled";

    case "failed":
      return "Failed";

    default:
      return status
        ? status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
        : "Unknown";
  }
};

const getStatusClasses = (status?: string | null) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "out_for_delivery":
      return "bg-[#17365D]/10 text-[#17365D] border-[#17365D]/20";

    case "assigned":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "cancelled":
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

// ============================================================
// COMPONENT
// ============================================================

const Deliveries: React.FC = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(
    null,
  );

  const [page, setPage] = useState(1);

  const itemsPerPage = 8;

  // ==========================================================
  // LOAD DELIVERY HISTORY
  // ==========================================================

  const loadDeliveries = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      /*
       * This uses the same delivery endpoint already
       * used by the Delivery Dashboard.
       *
       * Laravel filters this endpoint by the
       * authenticated delivery personnel.
       */

      const response = await api.get<OrdersResponse>(
        "/delivery/orders?history=1",
      );

      const data = response?.data?.data;

      // Keep actual delivery records only; hide pending/unassigned orders.
      const deliveryRecords = Array.isArray(data)
        ? data.filter((order) => {
            const status = String(order.delivery_status || "")
              .trim()
              .toLowerCase();
            return status !== "pending" && status !== "";
          })
        : [];

      setOrders(deliveryRecords);
    } catch (requestError: any) {
      console.error("Failed to load delivery history:", requestError);

      setError(
        requestError?.response?.data?.message ||
          "Unable to load delivery history.",
      );

      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadDeliveries();
  }, []);

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return orders.filter((order) => {
      const deliveryStatus = String(order.delivery_status || "")
        .trim()
        .toLowerCase();

      const matchesStatus =
        statusFilter === "all" || deliveryStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const address = getAddressText(order).toLowerCase();

      return (
        order.order_number.toLowerCase().includes(searchValue) ||
        order.customer_name.toLowerCase().includes(searchValue) ||
        address.includes(searchValue)
      );
    });
  }, [orders, search, statusFilter]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / itemsPerPage),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    const delivered = orders.filter(
      (order) => String(order.delivery_status).toLowerCase() === "delivered",
    ).length;

    const outForDelivery = orders.filter(
      (order) =>
        String(order.delivery_status).toLowerCase() === "out_for_delivery",
    ).length;

    const assigned = orders.filter(
      (order) => String(order.delivery_status).toLowerCase() === "assigned",
    ).length;

    return {
      total: orders.length,
      delivered,
      outForDelivery,
      assigned,
    };
  }, [orders]);

  // ==========================================================
  // GOOGLE MAPS NAVIGATION
  // ==========================================================

  const navigateToCustomer = (order: DeliveryOrder) => {
    const address = getAddress(order);
    const latitude = Number(address?.latitude);
    const longitude = Number(address?.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude === 0 ||
      longitude === 0
    ) {
      setError("Customer GPS location is not available.");
      return;
    }

    // Navigate directly from the tap so iPhone Safari does not block the link.
    // Google Maps opens the app when installed, otherwise it opens in the browser.
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${latitude},${longitude}` +
      `&travelmode=driving`;

    window.location.assign(url);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2
            size={36}
            className="animate-spin"
            style={{
              color: BLUE,
            }}
          />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading delivery history...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="w-full">
      {/* ======================================================
          CRAYTECH HERO
      ====================================================== */}

      <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#17365D] via-[#17365D] to-[#0F2948] px-4 py-5 text-white shadow-lg sm:mb-6 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#F59E0B]/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-sm sm:text-xs">
              <Truck size={14} className="text-[#F59E0B]" />
              CRAYTECH Delivery Portal
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 sm:h-12 sm:w-12">
                <Package size={22} className="text-[#F59E0B]" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                  Deliveries
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
                  View your assigned delivery history, customer locations, order
                  details, and proof of delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-2">
        {/* Total */}

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Deliveries
              </p>

              <p className="mt-2 text-3xl font-extrabold text-slate-950">
                {statistics.total}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17365D]/10">
              <Package
                size={21}
                style={{
                  color: BLUE,
                }}
              />
            </div>
          </div>
        </div>

        {/* Delivered */}

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Delivered
              </p>

              <p className="mt-2 text-3xl font-extrabold text-emerald-600">
                {statistics.delivered}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 size={21} className="text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Out for delivery */}

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Out for Delivery
              </p>

              <p className="mt-2 text-3xl font-extrabold text-[#17365D]">
                {statistics.outForDelivery}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17365D]/10">
              <Navigation size={21} className="text-[#17365D]" />
            </div>
          </div>
        </div>

        {/* Assigned */}

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Assigned
              </p>

              <p className="mt-2 text-3xl font-extrabold text-amber-600">
                {statistics.assigned}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Clock3 size={21} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          FILTER BAR
      ====================================================== */}

      <div className="sticky top-16 z-40 mb-5 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-md backdrop-blur sm:p-3">
        <div className="flex w-full flex-row items-center gap-2 sm:gap-3">
          {/* SEARCH */}

          <div className="relative flex-1">
            <Search
              size={18}
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, customer, address..."
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                py-3
                pl-11
                pr-4
                text-sm
                font-medium
                text-slate-800
                outline-none
                transition
                focus:border-[#17365D]
                focus:bg-white
                focus:ring-4
                focus:ring-[#17365D]/10
              "
            />
          </div>

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="
              w-[126px] shrink-0
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-2.5
              py-3
              text-xs
              sm:w-[160px]
              sm:px-4
              sm:text-sm
              font-bold
              text-slate-700
              outline-none
              focus:border-[#17365D]
              focus:bg-white
            "
          >
            <option value="all">All Status</option>

            <option value="assigned">Assigned</option>

            <option value="out_for_delivery">Out for Delivery</option>

            <option value="delivered">Delivered</option>

            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ======================================================
          DELIVERY TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* TABLE HEADER */}

        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-950">
                Delivery History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "delivery" : "deliveries"} found
              </p>
            </div>
          </div>
        </div>

        {paginatedOrders.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Package size={28} className="text-slate-400" />
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-slate-800">
              No deliveries found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              There are no deliveries matching your current search or status
              filter.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Order
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Address
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedOrders.map((order) => {
                    const address = getAddress(order);

                    return (
                      <tr
                        key={order.id}
                        className="
                            border-b
                            border-slate-100
                            transition
                            last:border-0
                            hover:bg-slate-50
                          "
                      >
                        {/* ORDER */}

                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-extrabold text-slate-900">
                            {order.order_number}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            #{order.id}
                          </p>
                        </td>

                        {/* CUSTOMER */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17365D]/10">
                              <User
                                size={16}
                                style={{
                                  color: BLUE,
                                }}
                              />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {order.customer_name}
                              </p>

                              {order.customer_contact && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {order.customer_contact}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ADDRESS */}

                        <td className="max-w-[260px] px-5 py-4">
                          <div className="flex items-start gap-2">
                            <MapPin
                              size={16}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                              {getAddressText(order)}
                            </p>
                          </div>
                        </td>

                        {/* DATE */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar size={15} className="text-slate-400" />

                            {formatDate(
                              order.delivered_at ||
                                order.assigned_at ||
                                order.created_at,
                            )}
                          </div>
                        </td>

                        {/* AMOUNT */}

                        <td className="px-5 py-4">
                          <p className="text-sm font-extrabold text-slate-800">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <span
                            className={`
                                inline-flex
                                items-center
                                rounded-full
                                border
                                px-2.5
                                py-1
                                text-[11px]
                                font-extrabold
                                ${getStatusClasses(order.delivery_status)}
                              `}
                          >
                            {getStatusLabel(order.delivery_status)}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="
                                rounded-lg
                                bg-[#17365D]/10
                                px-3
                                py-2
                                text-xs
                                font-extrabold
                                text-[#17365D]
                                transition
                                hover:bg-blue-100
                              "
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="space-y-3 p-4 lg:hidden">
              {paginatedOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      p-4
                      text-left
                      transition
                      hover:border-[#17365D]/30
                      hover:bg-[#17365D]/5
                    "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-extrabold text-slate-900">
                        {order.order_number}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {order.customer_name}
                      </p>
                    </div>

                    <span
                      className={`
                          shrink-0
                          rounded-full
                          border
                          px-2.5
                          py-1
                          text-[10px]
                          font-extrabold
                          ${getStatusClasses(order.delivery_status)}
                        `}
                    >
                      {getStatusLabel(order.delivery_status)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-2">
                    <MapPin
                      size={15}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <p className="text-xs leading-5 text-slate-500">
                      {getAddressText(order)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">
                      {formatDate(
                        order.delivered_at ||
                          order.assigned_at ||
                          order.created_at,
                      )}
                    </span>

                    <span className="text-sm font-extrabold text-slate-800">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        {filteredOrders.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <p className="text-xs font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                disabled={currentPage === 1}
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  text-slate-600
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
                disabled={currentPage === totalPages}
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  text-slate-600
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          DETAIL MODAL
      ====================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[85dvh] sm:rounded-2xl">
            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <p className="font-mono text-xs font-bold text-slate-400">
                  {selectedOrder.order_number}
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  Delivery Details
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="
                  rounded-lg
                  p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                "
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
              {/* STATUS */}

              <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery Status
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {getStatusLabel(selectedOrder.delivery_status)}
                  </p>
                </div>

                <span
                  className={`
                    rounded-full
                    border
                    px-3
                    py-1.5
                    text-xs
                    font-extrabold
                    ${getStatusClasses(selectedOrder.delivery_status)}
                  `}
                >
                  {getStatusLabel(selectedOrder.delivery_status)}
                </span>
              </div>

              {/* CUSTOMER */}

              <div className="mb-3">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Customer
                </p>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold text-slate-900">
                    {selectedOrder.customer_name}
                  </p>

                  {selectedOrder.customer_contact && (
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedOrder.customer_contact}
                    </p>
                  )}
                </div>
              </div>

              {/* ADDRESS */}

              <div className="mb-3">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Delivery Address
                </p>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={20}
                      className="mt-0.5 shrink-0 text-[#17365D]"
                    />

                    <p className="text-sm leading-6 text-slate-600">
                      {getAddressText(selectedOrder)}
                    </p>
                  </div>

                  {getAddress(selectedOrder)?.latitude &&
                    getAddress(selectedOrder)?.longitude && (
                      <button
                        type="button"
                        onClick={() => navigateToCustomer(selectedOrder)}
                        className="
                          mt-4
                          inline-flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-[#17365D]
                          px-4
                          py-3
                          text-sm
                          font-extrabold
                          text-white
                          transition
                          hover:bg-[#0F2948]
                        "
                      >
                        <Navigation size={18} />
                        Navigate to Customer
                      </button>
                    )}
                </div>
              </div>

              {/* ORDER ITEMS */}

              <div className="mb-3">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Order Items
                </p>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {item.product?.name || "Product"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Qty: {item.quantity}
                          </p>
                        </div>

                        <p className="text-sm font-extrabold text-slate-800">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-slate-500">
                      No item details available.
                    </div>
                  )}
                </div>
              </div>

              {/* ==================================================
                  PROOF OF DELIVERY
              ================================================== */}

              {String(selectedOrder.delivery_status || "").toLowerCase() ===
                "delivered" && (
                <div className="mb-5">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Proof of Delivery
                  </p>

                  <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50">
                    {selectedOrder.delivery_proof_image ? (
                      <>
                        <div className="bg-white p-3">
                          <img
                            src={
                              getProofPhotoUrl(
                                selectedOrder.delivery_proof_image,
                              ) || ""
                            }
                            alt={`Proof of delivery for ${selectedOrder.order_number}`}
                            className="
                              max-h-[180px] sm:max-h-[280px]
                              w-full
                              cursor-pointer
                              rounded-lg
                              object-contain
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
                        </div>

                        <div className="border-t border-emerald-100 bg-emerald-50 p-3">
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
                              inline-flex
                              w-full
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              bg-emerald-600
                              px-4
                              py-3
                              text-sm
                              font-extrabold
                              text-white
                              transition
                              hover:bg-emerald-700
                            "
                          >
                            <Eye size={17} />
                            View Full Proof Photo
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-6 py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                          <Eye size={24} className="text-slate-300" />
                        </div>

                        <p className="mt-3 text-sm font-bold text-slate-500">
                          No proof photo available
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          No delivery proof photo was found for this order.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TOTAL */}

              <div className="flex items-center justify-between rounded-xl bg-[#17365D]/10 p-4">
                <span className="text-sm font-bold text-slate-700">
                  Order Total
                </span>

                <span className="text-xl font-extrabold text-[#17365D]">
                  {formatCurrency(selectedOrder.total_amount)}
                </span>
              </div>

              {/* DATES */}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assigned
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {formatDateTime(selectedOrder.assigned_at)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivered
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {formatDateTime(selectedOrder.delivered_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-2.5 sm:px-6 sm:py-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED FLOATING REFRESH BUTTON */}
      <button
        type="button"
        onClick={() => loadDeliveries(true)}
        disabled={refreshing}
        aria-label={refreshing ? "Refreshing deliveries" : "Refresh deliveries"}
        title="Refresh deliveries"
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-xl ring-4 ring-white/90 transition hover:scale-105 hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:bottom-7 sm:right-7"
      >
        {refreshing ? (
          <Loader2 size={23} className="animate-spin" />
        ) : (
          <RefreshCw size={23} />
        )}
      </button>
    </div>
  );
};

export default Deliveries;
