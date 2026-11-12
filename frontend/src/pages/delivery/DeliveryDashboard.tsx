import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import L from "leaflet";

import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Send,
  Truck,
  User,
  X,
} from "lucide-react";

import api from "../../lib/api";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface DeliveryAddress {
  id: number;
  user_id?: number;

  label?: string | null;

  country?: string | null;
  region?: string | null;
  province?: string | null;
  municipality?: string | null;
  barangay?: string | null;

  detailed_address?: string | null;

  latitude?: string | number | null;
  longitude?: string | number | null;

  is_default?: boolean | number;
}

interface Product {
  id: number;
  name?: string;
}

interface OrderItem {
  id: number;
  product_id: number;

  quantity: number | string;

  unit_price: number | string;
  subtotal: number | string;

  selling_type?: "piece" | "kilogram";

  product?: Product | null;
}

type DeliveryStatus =
  | "pending"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface Order {
  id: number;

  order_number: string;

  user_id?: number;

  customer_name: string;
  customer_contact?: string | null;

  order_type?: string;
  status?: string;

  delivery_method?: "pickup" | "delivery" | string;

  delivery_address_id?: number | null;

  deliveryAddress?: DeliveryAddress | null;

  delivery_address?: DeliveryAddress | null;

  delivery_personnel_id?: number | null;

  delivery_status: DeliveryStatus;

  assigned_at?: string | null;

  delivered_at?: string | null;

  delivery_proof_image?: string | null;

  customer_note?: string | null;

  payment_method?: string | null;
  payment_status?: string | null;

  total_amount: number | string;

  created_at?: string;
  updated_at?: string;

  items?: OrderItem[];
}

interface OrdersResponse {
  success: boolean;
  data: Order[];
  message?: string;
}

/*
|--------------------------------------------------------------------------
| LEAFLET DELIVERY MARKER
|--------------------------------------------------------------------------
*/

const deliveryMarkerIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #1749D1;
        border: 4px solid #ffffff;
        box-shadow: 0 3px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 20px;
      "
    >
      🚚
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -22],
});

/*
|--------------------------------------------------------------------------
| ADDRESS HELPERS
|--------------------------------------------------------------------------
*/

const getAddressTextFromAddress = (address: DeliveryAddress): string => {
  const parts = [
    address.detailed_address,
    address.barangay,
    address.municipality,
    address.province,
    address.region,
    address.country,
  ]
    .map((value) => (value ? String(value).trim() : ""))
    .filter(Boolean);

  const uniqueParts = parts.filter(
    (value, index) => parts.indexOf(value) === index,
  );

  return uniqueParts.length > 0
    ? uniqueParts.join(", ")
    : "Delivery address not available";
};

const getOrderAddress = (order: Order): DeliveryAddress | null => {
  return order.deliveryAddress ?? order.delivery_address ?? null;
};

const getAddressText = (order: Order): string => {
  const address = getOrderAddress(order);

  if (!address) {
    if (order.delivery_address_id) {
      return `Delivery address #${order.delivery_address_id}`;
    }

    return "Delivery address not available";
  }

  return getAddressTextFromAddress(address);
};

/*
|--------------------------------------------------------------------------
| DELIVERY MAP
|--------------------------------------------------------------------------
*/

const DeliveryMap: React.FC<{
  address: DeliveryAddress | null;
  customerName?: string;
}> = ({ address, customerName }) => {
  const latitude = Number(address?.latitude);
  const longitude = Number(address?.longitude);

  if (
    !address ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude === 0 ||
    longitude === 0
  ) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 px-4 text-center sm:min-h-[240px]">
        <div>
          <MapPin size={38} className="mx-auto text-slate-300" />

          <p className="mt-3 font-extrabold text-slate-700">
            Map location not available
          </p>

          <p className="mt-1 text-xs text-slate-500">
            This delivery address does not have valid GPS coordinates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={true}
        className="relative z-0 h-[150px] w-full sm:h-[190px] lg:h-[220px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[latitude, longitude]} icon={deliveryMarkerIcon}>
          <Popup>
            <div className="min-w-[220px]">
              <p className="font-bold text-slate-900">
                {customerName || "Delivery Location"}
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                {getAddressTextFromAddress(address)}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

const StatusBadge: React.FC<{
  status: DeliveryStatus;
}> = ({ status }) => {
  const config: Record<
    DeliveryStatus,
    {
      label: string;
      className: string;
    }
  > = {
    pending: {
      label: "Pending",
      className: "bg-slate-100 text-slate-700",
    },

    assigned: {
      label: "Assigned",
      className: "bg-blue-100 text-blue-700",
    },

    out_for_delivery: {
      label: "Out for Delivery",
      className: "bg-orange-100 text-orange-700",
    },

    delivered: {
      label: "Delivered",
      className: "bg-green-100 text-green-700",
    },

    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-700",
    },
  };

  const current = config[status] ?? config.pending;

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-3
        py-1
        text-xs
        font-bold
        ${current.className}
      `}
    >
      {current.label}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| CURRENCY
|--------------------------------------------------------------------------
*/

const formatCurrency = (amount: number | string): string => {
  const value = Number(amount) || 0;

  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/*
|--------------------------------------------------------------------------
| DELIVERY DASHBOARD
|--------------------------------------------------------------------------
*/

const DeliveryDashboard: React.FC = () => {
  /*
  |--------------------------------------------------------------------------
  | ORDERS
  |--------------------------------------------------------------------------
  */

  const [orders, setOrders] = useState<Order[]>([]);

  /*
   * Separate dataset for the dashboard statistics.
   *
   * The normal /delivery/orders endpoint is the active delivery list
   * and excludes delivered orders. The cards therefore use
   * /delivery/orders?history=1 so delivered records are also counted.
   */
  const [statisticsOrders, setStatisticsOrders] = useState<Order[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  /*
  |--------------------------------------------------------------------------
  | MESSAGES
  |--------------------------------------------------------------------------
  */

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | PROOF OF DELIVERY
  |--------------------------------------------------------------------------
  */

  const [proofModalOpen, setProofModalOpen] = useState(false);

  const [proofOrder, setProofOrder] = useState<Order | null>(null);

  const [proofPhoto, setProofPhoto] = useState<File | null>(null);

  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const [uploadingProof, setUploadingProof] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD ORDERS
  |--------------------------------------------------------------------------
  */

  const loadOrders = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const response = await api.get<OrdersResponse>("/delivery/orders");

      console.log("Delivery orders response:", response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to load deliveries.");
      }

      const loadedOrders = Array.isArray(response.data.data)
        ? response.data.data
        : [];

      const normalizedOrders = loadedOrders.map((order) => ({
        ...order,

        deliveryAddress:
          order.deliveryAddress ?? order.delivery_address ?? null,
      }));

      setOrders(normalizedOrders);

      setSelectedOrder((current) => {
        if (!current) {
          return normalizedOrders[0] ?? null;
        }

        return (
          normalizedOrders.find((order) => order.id === current.id) ?? null
        );
      });

      /*
       * ================================================================
       * LOAD DATABASE STATISTICS
       * ================================================================
       *
       * history=1 includes delivered orders.
       *
       * Laravel still filters this endpoint by the authenticated
       * delivery personnel, so the cards only count this account's
       * delivery records.
       */
      const statisticsResponse = await api.get<OrdersResponse>(
        "/delivery/orders?history=1",
      );

      console.log(
        "Delivery dashboard statistics response:",
        statisticsResponse.data,
      );

      if (!statisticsResponse.data?.success) {
        throw new Error(
          statisticsResponse.data?.message ||
            "Failed to load delivery statistics.",
        );
      }

      const loadedStatisticsOrders = Array.isArray(statisticsResponse.data.data)
        ? statisticsResponse.data.data
        : [];

      const normalizedStatisticsOrders = loadedStatisticsOrders.map(
        (order) => ({
          ...order,
          deliveryAddress:
            order.deliveryAddress ?? order.delivery_address ?? null,
        }),
      );

      setStatisticsOrders(normalizedStatisticsOrders);
    } catch (err: any) {
      console.error("Failed to load delivery orders:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load deliveries.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /*
  |--------------------------------------------------------------------------
  | SELECTABLE ORDERS
  |--------------------------------------------------------------------------
  */

  const selectableOrders = useMemo(
    () => orders.filter((order) => order.delivery_status === "assigned"),
    [orders],
  );

  // Show only deliveries assigned to this delivery account that are not yet
  // completed. Pending/unassigned orders are intentionally hidden.
  const visibleDeliveries = useMemo(
    () =>
      orders.filter((order) =>
        ["assigned", "out_for_delivery"].includes(
          String(order.delivery_status || "")
            .trim()
            .toLowerCase()
            .replace(/-/g, "_")
            .replace(/\\s+/g, "_"),
        ),
      ),
    [orders],
  );

  const allSelectableSelected =
    selectableOrders.length > 0 &&
    selectableOrders.every((order) => selectedOrderIds.includes(order.id));

  /*
  |--------------------------------------------------------------------------
  | CHECKBOX
  |--------------------------------------------------------------------------
  */

  const toggleOrderSelection = (order: Order) => {
    if (order.delivery_status !== "assigned") {
      return;
    }

    setSelectedOrderIds((current) => {
      if (current.includes(order.id)) {
        return current.filter((id) => id !== order.id);
      }

      return [...current, order.id];
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedOrderIds([]);
      return;
    }

    setSelectedOrderIds(selectableOrders.map((order) => order.id));
  };

  /*
  |--------------------------------------------------------------------------
  | SELECT ORDER
  |--------------------------------------------------------------------------
  */

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderModalOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | START / UPDATE DELIVERY
  |--------------------------------------------------------------------------
  */

  const updateDeliveryStatus = async (
    order: Order,
    newStatus: "out_for_delivery" | "delivered",
  ) => {
    if (updatingOrderId !== null) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | DELIVERED REQUIRES PHOTO
    |--------------------------------------------------------------------------
    */

    if (newStatus === "delivered") {
      setProofOrder(order);
      setProofPhoto(null);
      setProofPreview(null);
      setProofModalOpen(true);

      return;
    }

    try {
      setUpdatingOrderId(order.id);

      setError(null);
      setSuccess(null);

      /*
      |--------------------------------------------------------------------------
      | NORMAL PUT REQUEST
      |--------------------------------------------------------------------------
      */

      const response = await api.put(
        `/delivery/orders/${encodeURIComponent(order.order_number)}/status`,
        {
          delivery_status: newStatus,
        },
      );

      console.log("Delivery status response:", response.data);

      await loadOrders(true);

      setSelectedOrder((current) =>
        current
          ? {
              ...current,
              delivery_status: newStatus,
            }
          : null,
      );

      setSuccess("Delivery started successfully.");
    } catch (err: any) {
      console.error("Failed to update delivery status:", err);

      setError(
        err?.response?.data?.message || "Failed to update delivery status.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PHOTO SELECT
  |--------------------------------------------------------------------------
  */

  const handleProofPhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | IMAGE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");

      event.target.value = "";

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | 10MB LIMIT
    |--------------------------------------------------------------------------
    */

    if (file.size > 10 * 1024 * 1024) {
      setError("The proof photo must be 10MB or smaller.");

      event.target.value = "";

      return;
    }

    setError(null);

    setProofPhoto(file);

    /*
    |--------------------------------------------------------------------------
    | PREVIEW
    |--------------------------------------------------------------------------
    */

    const previewUrl = URL.createObjectURL(file);

    setProofPreview(previewUrl);
  };

  /*
  |--------------------------------------------------------------------------
  | REMOVE PHOTO
  |--------------------------------------------------------------------------
  */

  const removeProofPhoto = () => {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }

    setProofPreview(null);
    setProofPhoto(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE PROOF MODAL
  |--------------------------------------------------------------------------
  */

  const closeProofModal = () => {
    if (uploadingProof) {
      return;
    }

    removeProofPhoto();

    setProofOrder(null);

    setProofModalOpen(false);
  };

  /*
  |--------------------------------------------------------------------------
  | CONFIRM DELIVERY WITH PHOTO
  |--------------------------------------------------------------------------
  */

  const confirmDelivery = async () => {
    if (!proofOrder || !proofPhoto || uploadingProof) {
      return;
    }

    try {
      setUploadingProof(true);

      setError(null);
      setSuccess(null);

      /*
      |--------------------------------------------------------------------------
      | FORM DATA
      |--------------------------------------------------------------------------
      */

      const formData = new FormData();

      formData.append("delivery_status", "delivered");

      formData.append("delivery_proof_image", proofPhoto);

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Laravel route is PUT.
      |
      | Because this request contains a file,
      | we send POST + _method=PUT.
      |
      | Laravel will treat it as PUT.
      |
      */

      formData.append("_method", "PUT");

      const response = await api.post(
        `/delivery/orders/${encodeURIComponent(
          proofOrder.order_number,
        )}/status`,
        formData,
      );

      console.log("Delivery completed response:", response.data);

      /*
      |--------------------------------------------------------------------------
      | CLOSE MODAL
      |--------------------------------------------------------------------------
      */

      removeProofPhoto();

      setProofOrder(null);

      setProofModalOpen(false);
      setOrderModalOpen(false);

      /*
      |--------------------------------------------------------------------------
      | RELOAD DATABASE
      |--------------------------------------------------------------------------
      */

      await loadOrders(true);

      /*
      |--------------------------------------------------------------------------
      | UPDATE SELECTED ORDER
      |--------------------------------------------------------------------------
      */

      setSelectedOrder((current) =>
        current
          ? {
              ...current,
              delivery_status: "delivered",
              delivered_at: new Date().toISOString(),
              delivery_proof_image:
                response.data?.data?.delivery_proof_image ??
                current.delivery_proof_image ??
                null,
            }
          : null,
      );

      setSuccess("Order marked as delivered successfully.");
    } catch (err: any) {
      console.error("Failed to confirm delivery:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to confirm delivery.";

      setError(message);
    } finally {
      setUploadingProof(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NAVIGATE TO CUSTOMER
  |--------------------------------------------------------------------------
  */

  const navigateToCustomer = (order: Order) => {
    const address = getOrderAddress(order);
    const latitude = Number(address?.latitude);
    const longitude = Number(address?.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude === 0 ||
      longitude === 0
    ) {
      setError("Customer GPS location is not available for this delivery.");
      return;
    }

    // Navigate synchronously from the tap. This avoids iOS Safari blocking
    // window.open() when it is called later from a geolocation callback.
    // Google Maps universal links open the Maps app on iPhone when available.
    const googleMapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${latitude},${longitude}` +
      `&travelmode=driving`;

    window.location.assign(googleMapsUrl);
  };

  /*
  |--------------------------------------------------------------------------
  | START SELECTED DELIVERIES
  |--------------------------------------------------------------------------
  */

  const startSelectedDeliveries = async () => {
    if (selectedOrderIds.length === 0 || bulkUpdating) {
      return;
    }

    try {
      setBulkUpdating(true);

      setError(null);
      setSuccess(null);

      const selectedOrders = orders.filter(
        (order) =>
          selectedOrderIds.includes(order.id) &&
          order.delivery_status === "assigned",
      );

      if (selectedOrders.length === 0) {
        setSelectedOrderIds([]);

        return;
      }

      /*
        |--------------------------------------------------------------------------
        | START EVERY SELECTED DELIVERY
        |--------------------------------------------------------------------------
        */

      const results = await Promise.allSettled(
        selectedOrders.map((order) =>
          api.put(
            `/delivery/orders/${encodeURIComponent(order.order_number)}/status`,
            {
              delivery_status: "out_for_delivery",
            },
          ),
        ),
      );

      const failed = results.filter((result) => result.status === "rejected");

      /*
        |--------------------------------------------------------------------------
        | RELOAD
        |--------------------------------------------------------------------------
        */

      await loadOrders(true);

      /*
        |--------------------------------------------------------------------------
        | CLEAR CHECKBOXES
        |--------------------------------------------------------------------------
        */

      setSelectedOrderIds([]);

      if (failed.length > 0) {
        setError(
          `${failed.length} ${
            failed.length === 1 ? "delivery" : "deliveries"
          } could not be started.`,
        );
      } else {
        setSuccess(
          `${selectedOrders.length} ${
            selectedOrders.length === 1 ? "delivery has" : "deliveries have"
          } been started.`,
        );
      }
    } catch (err: any) {
      console.error("Failed to start selected deliveries:", err);

      setError(
        err?.response?.data?.message || "Failed to start selected deliveries.",
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  /*
   * ================================================================
   * DATABASE STATISTICS
   * ================================================================
   *
   * These values now come from /delivery/orders?history=1.
   *
   * The normal `orders` array must NOT be used here because the
   * active delivery endpoint excludes delivered records.
   */
  const normalizeDeliveryStatus = (status?: string | null) =>
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_");

  const totalCount = statisticsOrders.filter((order) =>
    ["assigned", "out_for_delivery", "delivered"].includes(
      normalizeDeliveryStatus(order.delivery_status),
    ),
  ).length;

  const assignedCount = statisticsOrders.filter(
    (order) => normalizeDeliveryStatus(order.delivery_status) === "assigned",
  ).length;

  const outForDeliveryCount = statisticsOrders.filter(
    (order) =>
      normalizeDeliveryStatus(order.delivery_status) === "out_for_delivery",
  ).length;

  const deliveredCount = statisticsOrders.filter(
    (order) => normalizeDeliveryStatus(order.delivery_status) === "delivered",
  ).length;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <div className="w-full min-w-0 overflow-x-hidden px-3 pb-8 pt-3 sm:px-5 sm:pb-10 sm:pt-5 lg:px-7 lg:pt-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* =========================================================
              HERO
          ========================================================= */}

          <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#17365D] via-[#17365D] to-[#0F2948] px-4 py-5 text-white shadow-lg sm:mb-6 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl sm:h-64 sm:w-64" />
            <div className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-100 ring-1 ring-white/10 sm:text-xs">
                  <Truck size={14} className="text-[#F59E0B]" />
                  CRAYTECH Delivery Portal
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 sm:h-12 sm:w-12">
                    <Package size={22} className="text-[#F59E0B]" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                      Delivery Dashboard
                    </h1>

                    <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
                      Manage assigned deliveries, navigate to customers, and
                      complete orders with proof of delivery.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
            ERROR
        ========================================================= */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle size={22} className="mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="font-extrabold">Something went wrong</p>

                <p className="mt-1 text-sm">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-lg p-1 hover:bg-red-100"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* =========================================================
            SUCCESS
        ========================================================= */}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircle2 size={22} className="mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="font-extrabold">Success</p>

                <p className="mt-1 text-sm">{success}</p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="rounded-lg p-1 hover:bg-green-100"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* =========================================================
            STATISTICS
        ========================================================= */}

          <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
            {/* TOTAL */}

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17365D]/10 text-[#17365D]">
                  <Package size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">Total</p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {totalCount}
                  </p>
                </div>
              </div>
            </div>

            {/* ASSIGNED */}

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17365D]/10 text-[#17365D]">
                  <Truck size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">Assigned</p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {assignedCount}
                  </p>
                </div>
              </div>
            </div>

            {/* OUT FOR DELIVERY */}

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F59E0B]">
                  <Send size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">Out for Delivery</p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {outForDeliveryCount}
                  </p>
                </div>
              </div>
            </div>

            {/* DELIVERED */}

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <CheckCircle2 size={24} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">Delivered</p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {deliveredCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              ASSIGNED DELIVERY CARDS
          ========================================================= */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  My Assigned Deliveries
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a delivery card to view its complete order details.
                </p>
              </div>
              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#17365D]">
                {visibleDeliveries.length} Active Deliveries
              </span>
            </div>

            {selectableOrders.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[#17365D] focus:ring-[#17365D]"
                  />
                  Select All Assigned
                </label>
                {selectedOrderIds.length > 0 && (
                  <button
                    type="button"
                    onClick={startSelectedDeliveries}
                    disabled={bulkUpdating}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#17365D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F2948] disabled:opacity-60"
                  >
                    {bulkUpdating ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Send size={17} />
                    )}
                    Start Selected ({selectedOrderIds.length})
                  </button>
                )}
              </div>
            )}

            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <Loader2 size={30} className="animate-spin text-[#17365D]" />
                </div>
              ) : visibleDeliveries.length === 0 ? (
                <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                  <Truck size={38} className="text-slate-300" />
                  <h3 className="mt-4 font-extrabold text-slate-800">
                    No Active Deliveries
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    New orders assigned to you will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleDeliveries.map((order) => {
                    const isChecked = selectedOrderIds.includes(order.id);
                    const canSelect = order.delivery_status === "assigned";
                    return (
                      <div
                        key={order.id}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-[#17365D]/40 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOrderSelection(order)}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Select ${order.order_number}`}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#17365D]"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectOrder(order)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17365D]/10 text-[#17365D]">
                                  <Package size={20} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-slate-900">
                                    {order.order_number}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {order.customer_name}
                                  </p>
                                </div>
                              </div>
                              <Navigation
                                size={17}
                                className="shrink-0 text-slate-400 transition group-hover:text-[#17365D]"
                              />
                            </div>
                            <div className="mt-4 flex items-start gap-2">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                                {getAddressText(order)}
                              </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="text-xs text-slate-500">
                                {order.items?.length ?? 0} items
                              </span>
                              <span className="text-sm font-extrabold text-[#17365D]">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <StatusBadge status={order.delivery_status} />
                              <span className="text-[11px] font-bold text-[#17365D]">
                                View Details →
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* FIXED REFRESH BUTTON */}
          <button
            type="button"
            onClick={() => loadOrders(true)}
            disabled={refreshing || loading}
            aria-label={
              refreshing ? "Refreshing deliveries" : "Refresh deliveries"
            }
            title={refreshing ? "Refreshing..." : "Refresh deliveries"}
            className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-xl ring-4 ring-white/90 transition hover:bg-[#D97706] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={23} className={refreshing ? "animate-spin" : ""} />
          </button>

          {/* =========================================================
              DELIVERY ORDER DETAILS MODAL
          ========================================================= */}
          {orderModalOpen && selectedOrder && (
            <div
              className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delivery-order-modal-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget)
                  setOrderModalOpen(false);
              }}
            >
              <div className="flex max-h-[82vh] max-h-[82dvh] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:rounded-2xl">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                      Delivery Order Details
                    </p>
                    <h2
                      id="delivery-order-modal-title"
                      className="mt-1 break-all text-base font-extrabold leading-tight text-slate-900 sm:text-xl"
                    >
                      {selectedOrder.order_number}
                    </h2>
                    <div className="mt-1.5">
                      <StatusBadge status={selectedOrder.delivery_status} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderModalOpen(false)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Close order details"
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 sm:gap-3 lg:grid-cols-2">
                    <div className="space-y-3 sm:space-y-4">
                      <section className="rounded-xl border border-slate-200 p-3 sm:p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <User size={18} className="text-[#17365D]" />
                          <h3 className="font-extrabold text-slate-900">
                            Customer
                          </h3>
                        </div>
                        <p className="font-bold text-slate-800">
                          {selectedOrder.customer_name}
                        </p>
                        {selectedOrder.customer_contact && (
                          <a
                            href={`tel:${selectedOrder.customer_contact}`}
                            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#17365D] hover:underline"
                          >
                            <Phone size={16} />
                            {selectedOrder.customer_contact}
                          </a>
                        )}
                      </section>
                      <section className="rounded-xl border border-slate-200 p-3 sm:p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <MapPin size={18} className="text-[#17365D]" />
                          <h3 className="font-extrabold text-slate-900">
                            Delivery Location
                          </h3>
                        </div>
                        <p className="mb-3 text-sm leading-6 text-slate-600">
                          {getAddressText(selectedOrder)}
                        </p>
                        <DeliveryMap
                          address={getOrderAddress(selectedOrder)}
                          customerName={selectedOrder.customer_name}
                        />
                        {getOrderAddress(selectedOrder) && (
                          <button
                            type="button"
                            onClick={() => navigateToCustomer(selectedOrder)}
                            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#17365D] px-3 py-2.5 text-xs font-extrabold text-white hover:bg-[#0F2948]"
                          >
                            <Navigation size={15} />
                            Open Route in Google Maps
                          </button>
                        )}
                      </section>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <section className="rounded-xl border border-slate-200 p-3 sm:p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Package size={18} className="text-[#17365D]" />
                          <h3 className="font-extrabold text-slate-900">
                            Order Items
                          </h3>
                        </div>
                        {selectedOrder.items?.length ? (
                          <div className="divide-y divide-slate-100">
                            {selectedOrder.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 py-3"
                              >
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {item.product?.name ||
                                      `Product #${item.product_id}`}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Quantity: {item.quantity}
                                    {item.selling_type
                                      ? ` • ${item.selling_type}`
                                      : ""}
                                  </p>
                                </div>
                                <span className="text-sm font-bold text-[#17365D]">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            No order items available.
                          </p>
                        )}
                      </section>
                      {selectedOrder.customer_note && (
                        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <h3 className="font-extrabold text-amber-900">
                            Customer Note
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-amber-800">
                            {selectedOrder.customer_note}
                          </p>
                        </section>
                      )}
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <span className="text-sm font-semibold text-slate-500">
                          Order Total
                        </span>
                        <span className="text-xl font-extrabold text-[#17365D]">
                          {formatCurrency(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 mt-4 border-t border-slate-200 bg-white pt-3 pb-1 sm:mt-5 sm:pt-5">
                    {selectedOrder.delivery_status === "assigned" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDeliveryStatus(
                            selectedOrder,
                            "out_for_delivery",
                          )
                        }
                        disabled={updatingOrderId === selectedOrder.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17365D] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#0F2948] disabled:opacity-60"
                      >
                        {updatingOrderId === selectedOrder.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                        Start Delivery
                      </button>
                    )}
                    {selectedOrder.delivery_status === "out_for_delivery" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDeliveryStatus(selectedOrder, "delivered")
                        }
                        disabled={updatingOrderId === selectedOrder.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        <Check size={18} />
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
          PROOF OF DELIVERY MODAL
      ========================================================= */}

        {proofModalOpen && proofOrder && (
          <div
            className="
              fixed
              inset-0
              z-[1000]
              flex
              items-center
              justify-center
              bg-slate-950/60
              p-4
              backdrop-blur-[2px]
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="proof-of-delivery-title"
          >
            <div
              className="
                relative
                z-[1001]
                flex
                max-h-[92vh]
                w-full
                max-w-[620px]
                flex-col
                overflow-hidden
                rounded-2xl
                bg-white
                shadow-2xl
              "
            >
              {/* MODAL HEADER */}

              <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <h2
                    id="proof-of-delivery-title"
                    className="text-xl font-extrabold text-slate-900"
                  >
                    Proof of Delivery
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Take a photo showing the customer receiving the order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeProofModal}
                  disabled={uploadingProof}
                  className="
                    rounded-lg
                    p-2
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>

              {/* MODAL CONTENT */}

              <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                {/* ORDER INFO */}

                <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-extrabold text-[#17365D]">
                    Order {proofOrder.order_number}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#17365D]">
                    The photo is required before this order can be marked as
                    delivered.
                  </p>
                </div>

                {/* PHOTO AREA */}

                <div
                  className="
                    overflow-hidden
                    rounded-xl
                    border-2
                    border-dashed
                    border-slate-300
                    bg-slate-50
                  "
                >
                  {proofPreview ? (
                    <div className="relative">
                      <img
                        src={proofPreview}
                        alt="Proof of delivery preview"
                        className="
                          max-h-[420px]
                          w-full
                          object-contain
                          bg-slate-100
                        "
                      />

                      {/* REMOVE */}

                      <button
                        type="button"
                        onClick={removeProofPhoto}
                        disabled={uploadingProof}
                        className="
                          absolute
                          right-3
                          top-3
                          inline-flex
                          items-center
                          gap-2
                          rounded-lg
                          bg-red-600
                          px-3
                          py-2
                          text-xs
                          font-bold
                          text-white
                          shadow-lg
                          transition
                          hover:bg-red-700
                          disabled:opacity-50
                        "
                      >
                        <X size={15} />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingProof}
                      className="
                        flex
                        min-h-[240px]
                        w-full
                        flex-col
                        items-center
                        justify-center
                        px-6
                        text-center
                        transition
                        hover:bg-blue-50
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#17365D]/10 text-[#17365D]">
                        <Camera size={30} />
                      </div>

                      <p className="mt-4 text-base font-extrabold text-slate-800">
                        Take or upload photo
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        On mobile, your camera can be used directly.
                      </p>
                    </button>
                  )}
                </div>

                {/* FILE INPUT */}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleProofPhotoChange}
                  className="hidden"
                />

                {/* SELECTED FILE */}

                {proofPhoto && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#17365D]/10 text-[#17365D]">
                      <ImageIcon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {proofPhoto.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {(proofPhoto.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={removeProofPhoto}
                      disabled={uploadingProof}
                      className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeProofModal}
                  disabled={uploadingProof}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-3
                    text-sm
                    font-extrabold
                    text-slate-700
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelivery}
                  disabled={!proofPhoto || uploadingProof}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-green-600
                    px-5
                    py-3
                    text-sm
                    font-extrabold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-green-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {uploadingProof ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm Delivery
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DeliveryDashboard;
