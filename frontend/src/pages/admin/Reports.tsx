import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Battery,
  CalendarDays,
  CheckCircle2,
  Download,
  Droplets,
  FileText,
  Loader2,
  RefreshCw,
  Sprout,
  Thermometer,
  ShoppingCart,
  Waves,
  Package,
  Skull,
  Scale,
  Boxes,
  TrendingUp,
  ClipboardList,
  MapPin,
} from "lucide-react";

import { get, ref } from "firebase/database";
import { db } from "../../firebase";
import api from "../../lib/api";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportType = "Water Quality" | "Farm Management" | "Sales" | "Inventory";

interface ReportTypeItem {
  type: ReportType;
  icon: React.ReactNode;
}

interface HistoryRow {
  date: string;
  time: string;
  waterTemp: number | null;
  ph: number | null;
  phVoltage: number | null;
  ammonia: number | null;
  batteryVoltage: number | null;
  current: number | null;
  distance: number | null;
  waterLevel: number | null;
  waterPercent: number | null;
}

interface MetricStats {
  count: number;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
}

interface FarmSummary {
  initialPopulation: number;
  activeBatches: number;
  totalBatches: number;
  totalAreas: number;
  activeAreas: number;
  totalCrayfish: number;
  totalMortalities: number;
  totalHarvested: number;
  survivingCrayfish: number;
}

interface InventoryItem {
  id: number | string;
  name: string;
  totalWeightKg: number;
  availableWeightKg: number;
  pricePerKg: number;
  isAvailable: boolean;
}

const reportTypes: ReportTypeItem[] = [
  {
    type: "Water Quality",
    icon: <Droplets size={20} />,
  },
  {
    type: "Farm Management",
    icon: <Sprout size={20} />,
  },
  {
    type: "Sales",
    icon: <ShoppingCart size={20} />,
  },
  {
    type: "Inventory",
    icon: <Boxes size={20} />,
  },
];

const today = new Date();

const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(today.getDate() - 6);

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const DEFAULT_FROM = toInputDate(sevenDaysAgo);
const DEFAULT_TO = toInputDate(today);

const numberOrNull = (value: unknown): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const numberOrZero = (value: unknown): number => {
  return numberOrNull(value) ?? 0;
};

const formatNumber = (value: number | null, decimals = 2): string => {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(decimals);
};

const formatMoney = (value: number): string => {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const calculateStats = (
  rows: HistoryRow[],
  key: keyof HistoryRow,
): MetricStats => {
  const values = rows
    .map((row) => numberOrNull(row[key]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return {
      count: 0,
      average: null,
      minimum: null,
      maximum: null,
    };
  }

  return {
    count: values.length,
    average: values.reduce((total, value) => total + value, 0) / values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  };
};

const extractArray = (value: unknown): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    for (const key of [
      "data",
      "batches",
      "areas",
      "records",
      "items",
      "products",
      "orders",
    ]) {
      if (Array.isArray(object[key])) {
        return object[key];
      }
    }

    for (const nested of Object.values(object)) {
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }

  return [];
};

const getNumericField = (
  item: Record<string, unknown>,
  keys: string[],
): number => {
  for (const key of keys) {
    const value = numberOrNull(item[key]);

    if (value !== null) {
      return value;
    }
  }

  return 0;
};

const getOrderDate = (order: any): Date | null => {
  const raw = order?.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isOrderInDateRange = (order: any, from: string, to: string): boolean => {
  const date = getOrderDate(order);
  if (!date) return false;
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return dateKey >= from && dateKey <= to;
};

const isSuccessfulRefund = (order: any): boolean =>
  String(order?.refund_status ?? "").toLowerCase() === "succeeded" ||
  String(order?.payment_status ?? "").toLowerCase() === "refunded";

const getNetOrderRevenue = (order: any): number => {
  const gross = numberOrZero(order?.total_amount);
  const refundValue = order?.refund_amount;
  const refund = isSuccessfulRefund(order)
    ? refundValue !== null && refundValue !== undefined && refundValue !== ""
      ? numberOrZero(refundValue)
      : gross
    : 0;
  return Math.max(0, gross - refund);
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const escapeCsv = (value: string | number) => {
    const text = String(value ?? "");

    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

export default function Reports() {
  const [selectedReport, setSelectedReport] =
    useState<ReportType>("Water Quality");

  const [fromDate, setFromDate] = useState(DEFAULT_FROM);

  const [toDate, setToDate] = useState(DEFAULT_TO);

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);

  const [farmSummary, setFarmSummary] = useState<FarmSummary>({
    initialPopulation: 0,
    activeBatches: 0,
    totalBatches: 0,
    totalAreas: 0,
    activeAreas: 0,
    totalCrayfish: 0,
    totalMortalities: 0,
    totalHarvested: 0,
    survivingCrayfish: 0,
  });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingFarm, setLoadingFarm] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  const [error, setError] = useState("");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  /*
   * ============================================================
   * WATER QUALITY
   * ============================================================
   */

  const loadWaterQuality = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Please select both a start date and an end date.");
      return;
    }

    if (fromDate > toDate) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const snapshot = await get(ref(db, "sensors"));
      const root = snapshot.val();

      if (!root || typeof root !== "object") {
        setHistoryRows([]);
        return;
      }

      const sensorRoot = root as Record<string, unknown>;

      const combined = new Map<string, HistoryRow>();

      const metricNames = [
        "waterTemp",
        "ph",
        "phVoltage",
        "ammonia",
        "batteryVoltage",
        "currentDraw",
        "current",
        "distance",
        "waterLevel",
        "waterPercent",
      ] as const;

      const setMetric = (
        date: string,
        time: string,
        metric: string,
        value: unknown,
      ) => {
        if (date < fromDate || date > toDate) {
          return;
        }

        const parsed = numberOrNull(value);

        if (parsed === null) {
          return;
        }

        const key = `${date}|${time}`;

        const existing = combined.get(key) ?? {
          date,
          time,
          waterTemp: null,
          ph: null,
          phVoltage: null,
          ammonia: null,
          batteryVoltage: null,
          current: null,
          distance: null,
          waterLevel: null,
          waterPercent: null,
        };

        if (metric === "currentDraw" || metric === "current") {
          existing.current = parsed;
        } else if (metric in existing) {
          (existing as any)[metric] = parsed;
        }

        combined.set(key, existing);
      };

      for (const metric of metricNames) {
        const metricRoot = sensorRoot[metric];

        if (!metricRoot || typeof metricRoot !== "object") {
          continue;
        }

        const dates = metricRoot as Record<string, unknown>;

        for (const [date, dateValue] of Object.entries(dates)) {
          if (
            date < fromDate ||
            date > toDate ||
            !dateValue ||
            typeof dateValue !== "object"
          ) {
            continue;
          }

          const times = dateValue as Record<string, unknown>;

          for (const [time, value] of Object.entries(times)) {
            setMetric(date, time, metric, value);
          }
        }
      }

      const rows = Array.from(combined.values()).sort((a, b) => {
        const first = `${a.date} ${a.time}`;
        const second = `${b.date} ${b.time}`;

        return first.localeCompare(second);
      });

      setHistoryRows(rows);
    } catch (err: any) {
      console.error("Failed to load water quality report:", err);

      setError(
        err?.message || "Unable to load water quality history from Firebase.",
      );

      setHistoryRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  /*
   * ============================================================
   * FARM MANAGEMENT
   * ============================================================
   */

  const loadFarmManagement = useCallback(async () => {
    setLoadingFarm(true);
    setError("");

    try {
      const [farmResponse, batchResponse, ordersResponse] =
        await Promise.allSettled([
          api.get("/farm-management"),
          api.get("/batches"),
          api.get("/orders"),
        ]);

      let farmData: any = null;
      let batchData: any[] = [];
      let ordersData: any[] = [];

      if (farmResponse.status === "fulfilled") {
        farmData = farmResponse.value?.data;
      }

      if (batchResponse.status === "fulfilled") {
        batchData = extractArray(batchResponse.value?.data);
      }

      if (ordersResponse.status === "fulfilled") {
        ordersData = extractArray(ordersResponse.value?.data);
      }

      const farmRoot = farmData?.data ?? farmData ?? {};

      const areas = extractArray(farmRoot?.areas ?? farmRoot);

      const batches =
        batchData.length > 0
          ? batchData
          : extractArray(farmRoot?.batches ?? farmRoot);

      const activeBatches = batches.filter((batch) => {
        const status = String(
          batch?.status ?? batch?.batch_status ?? "",
        ).toLowerCase();

        if (status) {
          return !["completed", "inactive", "harvested", "closed"].includes(
            status,
          );
        }

        if (batch?.is_active !== undefined) {
          return Boolean(batch.is_active);
        }

        return true;
      }).length;

      const activeAreas = areas.filter(
        (area) => area?.is_active === undefined || Boolean(area.is_active),
      ).length;

      /*
       * ========================================================
       * CRAYFISH POPULATION
       * ========================================================
       *
       * Your batches table contains:
       *   initial_population
       *   current_population
       *
       * Therefore the report must use the batch records as the
       * source of truth instead of inventing a separate crayfish
       * total.
       *
       * Current crayfish = SUM(current_population)
       * Initial crayfish = SUM(initial_population)
       *
       * If your batch API later provides a dedicated mortality or
       * harvest field, those values are used. Otherwise, the
       * difference between initial and current population is shown
       * as mortality/loss because the database currently has no
       * dedicated mortality column.
       * ========================================================
       */

      let initialPopulation = 0;
      let currentPopulation = 0;
      let totalMortalities = 0;
      let batchHarvested = 0;

      let hasExplicitMortality = false;
      let hasExplicitHarvest = false;

      for (const batch of batches) {
        const initial = getNumericField(batch, [
          "initial_population",
          "initial_quantity",
          "initial_crayfish",
          "initial_count",
        ]);

        const current = getNumericField(batch, [
          "current_population",
          "current_quantity",
          "current_crayfish",
          "remaining_quantity",
          "remaining_population",
          "crayfish_count",
        ]);

        initialPopulation += initial;
        currentPopulation += current;

        const mortalityKeys = [
          "mortalities",
          "mortality",
          "mortality_count",
          "total_mortalities",
          "dead_count",
          "deaths",
          "dead_crayfish",
        ];

        const harvestKeys = [
          "harvested",
          "harvested_count",
          "total_harvested",
          "harvest_quantity",
          "harvested_crayfish",
        ];

        const mortalityValue = getNumericField(batch, mortalityKeys);

        const harvestValue = getNumericField(batch, harvestKeys);

        if (mortalityKeys.some((key) => numberOrNull(batch?.[key]) !== null)) {
          hasExplicitMortality = true;
          totalMortalities += mortalityValue;
        }

        if (harvestKeys.some((key) => numberOrNull(batch?.[key]) !== null)) {
          hasExplicitHarvest = true;
          batchHarvested += harvestValue;
        }
      }

      /*
       * ========================================================
       * SOLD CRAYFISH MUST NOT BE COUNTED AS MORTALITY
       * ========================================================
       *
       * current_population is already the remaining population.
       * Therefore:
       *
       *   Initial = Current + Mortalities + Sold/Harvested
       *
       * Previously the report used:
       *
       *   Initial - Current = Mortality
       *
       * That incorrectly classified sold crayfish as dead.
       *
       * We now read finalized sales from /orders and count
       * piece-based crayfish sales as harvested/sold.
       *
       * Only finalized orders are counted:
       * completed, delivered, confirmed, or paid.
       *
       * Kilogram sales are NOT converted to pieces because the
       * order does not contain an exact crayfish-piece count.
       * ========================================================
       */

      /*
       * ========================================================
       * SALES / DELIVERY / POPULATION RECONCILIATION
       * ========================================================
       *
       * IMPORTANT:
       *
       * The batches.current_population is reduced when crayfish
       * are prepared/packed for an order. That does NOT mean the
       * crayfish died.
       *
       * order_items.packed_pieces is the actual number of crayfish
       * taken from the linked batch. A NULL packed_pieces means
       * that the order item has not been prepared/deducted yet.
       *
       * Therefore:
       *
       *   Initial Population
       *       =
       *   Current Population
       *       + Mortality
       *       + Completed Sold/Harvested
       *       + Packed Pending/Delivery
       *
       * A delivery with delivery_status = "assigned" or
       * "out_for_delivery" is NOT a completed sale and must NOT
       * be shown as mortality.
       *
       * The database also has packed_pieces specifically for this
       * purpose. It records the actual crayfish count taken from
       * the batch, including kilogram orders.
       * ========================================================
       */

      let soldCrayfish = 0;
      let pendingPackedCrayfish = 0;

      for (const order of ordersData) {
        const status = String(order?.status ?? "").toLowerCase();

        const deliveryStatus = String(
          order?.delivery_status ?? "",
        ).toLowerCase();

        const isCancelled = ["cancelled", "canceled", "rejected"].includes(
          status,
        );

        if (isCancelled) {
          continue;
        }

        /*
         * Only these order states are finalized sales.
         *
         * Delivery assignment alone does NOT qualify.
         */
        const isFinalizedSale =
          ["completed", "delivered"].includes(status) ||
          deliveryStatus === "delivered";

        const items = extractArray(
          order?.items ?? order?.order_items ?? order?.orderItems,
        );

        for (const item of items) {
          /*
           * packed_pieces is the actual number of crayfish
           * removed from the batch.
           *
           * This works for BOTH:
           *   - piece orders
           *   - kilogram orders
           *
           * because packed_pieces stores the actual piece count.
           */
          const packedPieces = getNumericField(item, ["packed_pieces"]);

          if (packedPieces <= 0) {
            continue;
          }

          if (isFinalizedSale) {
            /*
             * Actually sold/harvested.
             */
            soldCrayfish += packedPieces;
          } else {
            /*
             * Already packed/deducted from the batch,
             * but NOT completed yet.
             *
             * Example:
             * delivery_status = assigned
             *
             * These must NOT become mortality.
             */
            pendingPackedCrayfish += packedPieces;
          }
        }
      }

      /*
       * Batch-level harvested values are also valid if the batch
       * API provides them.
       */
      const totalHarvested = batchHarvested + soldCrayfish;

      /*
       * These crayfish have already been removed from the batch
       * for a real order, but the order is not completed yet.
       *
       * They are therefore NOT mortality.
       */
      const totalAllocatedToOrders = pendingPackedCrayfish;

      /*
       * If the database has no dedicated mortality column, derive
       * mortality only from the population that cannot be explained
       * by:
       *
       *   - completed sold/harvested crayfish
       *   - packed but not-yet-completed delivery orders
       *
       * This fixes the exact case where a delivery is merely
       * ASSIGNED and its packed crayfish had already reduced
       * current_population.
       */
      if (!hasExplicitMortality) {
        totalMortalities = Math.max(
          0,
          initialPopulation -
            currentPopulation -
            totalHarvested -
            totalAllocatedToOrders,
        );
      }

      /*
       * Current population is the actual remaining/surviving
       * crayfish count.
       */
      const totalCrayfish = currentPopulation;

      const survivingCrayfish = currentPopulation;

      setFarmSummary({
        initialPopulation,
        activeBatches,
        totalBatches: batches.length,
        totalAreas: areas.length,
        activeAreas,
        totalCrayfish,
        totalMortalities,
        totalHarvested,
        survivingCrayfish,
      });
    } catch (err: any) {
      console.error("Failed to load farm management report:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load farm management data.",
      );
    } finally {
      setLoadingFarm(false);
    }
  }, []);

  /*
   * ============================================================
   * SALES + INVENTORY
   * ============================================================
   */

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    setError("");

    try {
      const [ordersResponse, productsResponse] = await Promise.all([
        api.get("/orders"),
        api.get("/products"),
      ]);

      const orders = extractArray(ordersResponse?.data);
      const products = extractArray(productsResponse?.data);

      const inventoryItems: InventoryItem[] = products.map((product) => ({
        id: product?.id ?? "",
        name: product?.name ?? "Unnamed Product",
        totalWeightKg: getNumericField(product, ["total_weight_kg"]),
        availableWeightKg: getNumericField(product, ["available_weight_kg"]),
        pricePerKg: getNumericField(product, ["price_per_kg"]),
        isAvailable: Boolean(product?.is_available),
      }));

      setSalesOrders(orders);
      setInventory(inventoryItems);
    } catch (err: any) {
      console.error("Failed to load sales report:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load sales and inventory data.",
      );
    } finally {
      setLoadingSales(false);
    }
  }, []);

  /*
   * ============================================================
   * LOAD WHEN REPORT CHANGES
   * ============================================================
   */

  useEffect(() => {
    if (selectedReport === "Water Quality") {
      loadWaterQuality();
    }

    if (selectedReport === "Farm Management") {
      loadFarmManagement();
    }

    if (selectedReport === "Sales" || selectedReport === "Inventory") {
      loadSales();
    }
  }, [selectedReport, loadWaterQuality, loadFarmManagement, loadSales]);

  /*
   * ============================================================
   * WATER QUALITY STATISTICS
   * ============================================================
   */

  const waterStats = useMemo(
    () => ({
      temperature: calculateStats(historyRows, "waterTemp"),
      ph: calculateStats(historyRows, "ph"),
      ammonia: calculateStats(historyRows, "ammonia"),
      battery: calculateStats(historyRows, "batteryVoltage"),
      current: calculateStats(historyRows, "current"),
      waterLevel: calculateStats(historyRows, "waterLevel"),
      waterPercent: calculateStats(historyRows, "waterPercent"),
    }),
    [historyRows],
  );

  /*
   * ============================================================
   * SALES BREAKDOWNS
   * ============================================================
   */

  const filteredSalesOrders = useMemo(
    () =>
      salesOrders.filter((order) =>
        isOrderInDateRange(order, fromDate, toDate),
      ),
    [salesOrders, fromDate, toDate],
  );

  const finalizedOrders = useMemo(
    () =>
      filteredSalesOrders.filter(
        (order) => String(order?.status ?? "").toLowerCase() === "completed",
      ),
    [filteredSalesOrders],
  );

  const salesMetrics = useMemo(() => {
    const completed = finalizedOrders;
    const grossRevenue = completed.reduce(
      (sum, order) => sum + numberOrZero(order?.total_amount),
      0,
    );
    const refunds = completed.reduce((sum, order) => {
      if (!isSuccessfulRefund(order)) return sum;
      const refundValue = order?.refund_amount;
      return (
        sum +
        (refundValue !== null && refundValue !== undefined && refundValue !== ""
          ? numberOrZero(refundValue)
          : numberOrZero(order?.total_amount))
      );
    }, 0);
    const totalSales = Math.max(0, grossRevenue - refunds);
    const statusCount = (status: string) =>
      filteredSalesOrders.filter(
        (order) => String(order?.status ?? "").toLowerCase() === status,
      ).length;
    const kilogramsSold = completed.reduce((sum, order) => {
      const items = extractArray(order?.items);
      return (
        sum +
        items.reduce(
          (itemSum, item) => itemSum + numberOrZero(item?.quantity),
          0,
        )
      );
    }, 0);
    const packedPieces = completed.reduce((sum, order) => {
      const items = extractArray(order?.items);
      return (
        sum +
        items.reduce(
          (itemSum, item) => itemSum + numberOrZero(item?.packed_pieces),
          0,
        )
      );
    }, 0);
    return {
      totalOrders: filteredSalesOrders.length,
      completedOrders: completed.length,
      pendingOrders:
        statusCount("pending") +
        statusCount("confirmed") +
        statusCount("processing") +
        statusCount("ready"),
      cancelledOrders: statusCount("cancelled"),
      grossRevenue,
      refunds,
      totalSales,
      averageOrderValue: completed.length ? totalSales / completed.length : 0,
      kilogramsSold,
      packedPieces,
    };
  }, [filteredSalesOrders, finalizedOrders]);

  const topProducts = useMemo(() => {
    const totals = new Map<
      string,
      {
        id: string;
        name: string;
        orders: Set<string>;
        kilograms: number;
        packedPieces: number;
        revenue: number;
      }
    >();
    finalizedOrders.forEach((order) => {
      extractArray(order?.items).forEach((item) => {
        const productId = String(
          item?.product_id ??
            item?.product?.id ??
            item?.id ??
            item?.product?.name ??
            "unknown",
        );
        const name = String(
          item?.product?.name ?? "Product no longer available",
        );
        const current = totals.get(productId) ?? {
          id: productId,
          name,
          orders: new Set<string>(),
          kilograms: 0,
          packedPieces: 0,
          revenue: 0,
        };
        current.orders.add(String(order?.id ?? order?.order_number ?? "order"));
        current.kilograms += numberOrZero(item?.quantity);
        current.packedPieces += numberOrZero(item?.packed_pieces);
        current.revenue += numberOrZero(item?.subtotal);
        totals.set(productId, current);
      });
    });
    return Array.from(totals.values())
      .map((item) => ({ ...item, orderCount: item.orders.size }))
      .sort((a, b) => b.kilograms - a.kilograms)
      .slice(0, 10);
  }, [finalizedOrders]);

  const salesByLocation = useMemo(() => {
    const totals = new Map<
      string,
      { location: string; orders: number; revenue: number }
    >();
    finalizedOrders.forEach((order) => {
      const address = order?.delivery_address ?? order?.deliveryAddress ?? null;
      const deliveryMethod = String(order?.delivery_method ?? "").toLowerCase();
      const orderType = String(order?.order_type ?? "").toLowerCase();
      const addressLabel = address
        ? [address?.barangay, address?.municipality, address?.province]
            .filter(Boolean)
            .map(String)
            .join(", ")
        : "";
      const location =
        addressLabel ||
        (orderType === "walk_in"
          ? "Walk-in purchases"
          : deliveryMethod === "pickup"
            ? "Customer pickup"
            : "Address not recorded");
      const current = totals.get(location) ?? {
        location,
        orders: 0,
        revenue: 0,
      };
      current.orders += 1;
      current.revenue += getNetOrderRevenue(order);
      totals.set(location, current);
    });
    return Array.from(totals.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);
  }, [finalizedOrders]);

  const salesByMonth = useMemo(() => {
    const totals = new Map<
      string,
      { period: string; revenue: number; orders: number }
    >();
    finalizedOrders.forEach((order) => {
      const date = getOrderDate(order);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const period = date.toLocaleDateString("en-PH", {
        month: "short",
        year: "numeric",
      });
      const current = totals.get(key) ?? { period, revenue: 0, orders: 0 };
      current.revenue += getNetOrderRevenue(order);
      current.orders += 1;
      totals.set(key, current);
    });
    return Array.from(totals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [finalizedOrders]);

  const paymentBreakdown = useMemo(() => {
    const totals = new Map<
      string,
      {
        method: string;
        orders: number;
        paid: number;
        pending: number;
        failed: number;
        refunded: number;
        revenue: number;
      }
    >();
    filteredSalesOrders.forEach((order) => {
      const method = String(order?.payment_method ?? "Not specified")
        .replace(/_/g, " ")
        .toUpperCase();
      const status = String(order?.payment_status ?? "pending").toLowerCase();
      const current = totals.get(method) ?? {
        method,
        orders: 0,
        paid: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
        revenue: 0,
      };
      current.orders += 1;
      if (status === "paid") current.paid += 1;
      else if (status === "refunded") current.refunded += 1;
      else if (status === "failed" || status === "cancelled")
        current.failed += 1;
      else current.pending += 1;
      if (String(order?.status ?? "").toLowerCase() === "completed")
        current.revenue += getNetOrderRevenue(order);
      totals.set(method, current);
    });
    return Array.from(totals.values()).sort((a, b) => b.orders - a.orders);
  }, [filteredSalesOrders]);

  const orderStatusBreakdown = useMemo(() => {
    const statuses = [
      "pending",
      "confirmed",
      "processing",
      "ready",
      "completed",
      "cancelled",
    ];
    return statuses.map((status) => ({
      status,
      count: filteredSalesOrders.filter(
        (order) => String(order?.status ?? "").toLowerCase() === status,
      ).length,
    }));
  }, [filteredSalesOrders]);

  const refundBreakdown = useMemo(() => {
    const refundOrders = filteredSalesOrders.filter(
      (order) =>
        order?.refund_status ||
        String(order?.payment_status ?? "").toLowerCase() === "refunded",
    );
    return {
      count: refundOrders.length,
      succeeded: refundOrders.filter(isSuccessfulRefund).length,
      processing: refundOrders.filter((order) =>
        ["pending", "processing"].includes(
          String(order?.refund_status ?? "").toLowerCase(),
        ),
      ).length,
      failed: refundOrders.filter(
        (order) =>
          String(order?.refund_status ?? "").toLowerCase() === "failed",
      ).length,
      amount: refundOrders
        .filter(isSuccessfulRefund)
        .reduce(
          (sum, order) =>
            sum +
            (numberOrZero(order?.refund_amount) ||
              numberOrZero(order?.total_amount)),
          0,
        ),
    };
  }, [filteredSalesOrders]);

  const topCustomers = useMemo(() => {
    const totals = new Map<
      string,
      { customer: string; orders: number; revenue: number }
    >();
    finalizedOrders.forEach((order) => {
      const customer = String(
        order?.customer_name ?? order?.user?.name ?? "Walk-in customer",
      );
      const current = totals.get(customer) ?? {
        customer,
        orders: 0,
        revenue: 0,
      };
      current.orders += 1;
      current.revenue += getNetOrderRevenue(order);
      totals.set(customer, current);
    });
    return Array.from(totals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [finalizedOrders]);

  /*
   * ============================================================
   * REPORT SELECTION
   * ============================================================
   */

  const handleReportSelect = (report: ReportTypeItem) => {
    setError("");
    setSelectedReport(report.type);
  };

  /*
   * ============================================================
   * CSV DOWNLOADS
   * ============================================================
   */

  const downloadWaterQualityReport = () => {
    if (historyRows.length === 0) {
      setError("There is no water quality data in the selected date range.");
      return;
    }

    const rows: Array<Array<string | number>> = [
      [
        "Date",
        "Time",
        "Water Temperature (°C)",
        "pH",
        "pH Voltage (V)",
        "Ammonia (mg/L)",
        "Battery Voltage (V)",
        "Current (A)",
        "Distance (cm)",
        "Water Level (cm)",
        "Water Fill (%)",
      ],
    ];

    historyRows.forEach((row) => {
      rows.push([
        row.date,
        row.time,
        row.waterTemp ?? "",
        row.ph ?? "",
        row.phVoltage ?? "",
        row.ammonia ?? "",
        row.batteryVoltage ?? "",
        row.current ?? "",
        row.distance ?? "",
        row.waterLevel ?? "",
        row.waterPercent ?? "",
      ]);
    });

    downloadCsv(`CRAYTECH-Water-Quality-${fromDate}-to-${toDate}.csv`, rows);
  };

  const downloadFarmReport = () => {
    downloadCsv(`CRAYTECH-Farm-Management-${toInputDate(new Date())}.csv`, [
      ["Metric", "Value"],
      ["Active Batches", farmSummary.activeBatches],
      ["Total Batches", farmSummary.totalBatches],
      ["Total Areas", farmSummary.totalAreas],
      ["Active Areas", farmSummary.activeAreas],
      ["Recorded Crayfish", farmSummary.totalCrayfish],
      ["Total Mortalities", farmSummary.totalMortalities],
      ["Total Harvested", farmSummary.totalHarvested],
      ["Surviving Crayfish", farmSummary.survivingCrayfish],
    ]);
  };

  const downloadSalesReport = () => {
    const rows: Array<Array<string | number>> = [
      ["CRAYTECH Sales Report", `${fromDate} to ${toDate}`],
      ["Metric", "Value"],
      ["Orders in period", salesMetrics.totalOrders],
      ["Completed orders", salesMetrics.completedOrders],
      ["Pending / in progress", salesMetrics.pendingOrders],
      ["Cancelled orders", salesMetrics.cancelledOrders],
      ["Gross completed sales", salesMetrics.grossRevenue],
      ["Successful refunds", salesMetrics.refunds],
      ["Net sales", salesMetrics.totalSales],
      ["Average completed order value", salesMetrics.averageOrderValue],
      ["Kilograms sold", salesMetrics.kilogramsSold],
      ["Packed pieces recorded", salesMetrics.packedPieces],
      [],
      [
        "Best-selling products",
        "Kilograms",
        "Packed pieces",
        "Orders",
        "Revenue",
      ],
      ...topProducts.map((item) => [
        item.name,
        item.kilograms,
        item.packedPieces,
        item.orderCount,
        item.revenue,
      ]),
      [],
      ["Purchase locations", "Orders", "Net revenue"],
      ...salesByLocation.map((item) => [
        item.location,
        item.orders,
        item.revenue,
      ]),
      [],
      ["Monthly sales", "Completed orders", "Net revenue"],
      ...salesByMonth.map((item) => [item.period, item.orders, item.revenue]),
      [],
      [
        "Payment method",
        "Orders",
        "Paid",
        "Pending",
        "Failed/cancelled",
        "Refunded",
        "Net revenue",
      ],
      ...paymentBreakdown.map((item) => [
        item.method,
        item.orders,
        item.paid,
        item.pending,
        item.failed,
        item.refunded,
        item.revenue,
      ]),
      [],
      ["Refunds", "Count", "Amount"],
      ["Successful refunds", refundBreakdown.succeeded, refundBreakdown.amount],
      [],
      ["Top customers", "Completed orders", "Net revenue"],
      ...topCustomers.map((item) => [item.customer, item.orders, item.revenue]),
      [],
      ["Order status", "Count"],
      ...orderStatusBreakdown.map((item) => [item.status, item.count]),
    ];
    downloadCsv(`CRAYTECH-Sales-Report-${fromDate}-to-${toDate}.csv`, rows);
  };

  const downloadInventoryReport = () => {
    const rows: Array<Array<string | number>> = [
      [
        "Product",
        "Total Stock (kg)",
        "Available Stock (kg)",
        "Estimated Sold (kg)",
        "Price per kg",
        "Availability",
      ],
      ...inventory.map((item) => [
        item.name,
        item.totalWeightKg,
        item.availableWeightKg,
        Math.max(0, item.totalWeightKg - item.availableWeightKg),
        item.pricePerKg,
        item.isAvailable ? "Available" : "Unavailable",
      ]),
    ];
    downloadCsv(`CRAYTECH-Inventory-${toInputDate(new Date())}.csv`, rows);
  };

  const downloadInventoryPdf = () => {
    const doc = new jsPDF();
    addPdfHeader(doc, "Current Inventory Report");
    doc.setFontSize(10);
    doc.text(`Generated: ${toInputDate(new Date())}`, 14, 38);
    autoTable(doc, {
      startY: 44,
      head: [
        [
          "Product",
          "Total kg",
          "Available kg",
          "Estimated sold kg",
          "Price/kg",
          "Status",
        ],
      ],
      body: inventory.length
        ? inventory.map((item) => [
            item.name,
            formatNumber(item.totalWeightKg, 2),
            formatNumber(item.availableWeightKg, 2),
            formatNumber(
              Math.max(0, item.totalWeightKg - item.availableWeightKg),
              2,
            ),
            formatMoney(item.pricePerKg),
            item.isAvailable ? "Available" : "Unavailable",
          ])
        : [["No inventory records", "", "", "", "", ""]],
      headStyles: { fillColor: [23, 54, 93] },
      alternateRowStyles: { fillColor: [245, 248, 252] },
    });
    doc.save(`CRAYTECH-Inventory-${toInputDate(new Date())}.pdf`);
  };

  const downloadCurrentCsv = () => {
    setDownloadMenuOpen(false);
    switch (selectedReport) {
      case "Water Quality":
        downloadWaterQualityReport();
        break;
      case "Farm Management":
        downloadFarmReport();
        break;
      case "Sales":
        downloadSalesReport();
        break;
      case "Inventory":
        downloadInventoryReport();
        break;
    }
  };

  const downloadCurrentPdf = () => {
    setDownloadMenuOpen(false);
    switch (selectedReport) {
      case "Water Quality":
        downloadWaterQualityPdf();
        break;
      case "Farm Management":
        downloadFarmPdf();
        break;
      case "Sales":
        downloadSalesPdf();
        break;
      case "Inventory":
        downloadInventoryPdf();
        break;
    }
  };

  /*
   * ============================================================
   * PDF HELPERS
   * ============================================================
   */

  const addPdfHeader = (doc: jsPDF, title: string) => {
    doc.setFillColor(23, 54, 93);

    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");

    doc.text("CRAYTECH", 14, 12);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(title, 14, 21);

    doc.setTextColor(60, 60, 60);

    doc.setFontSize(9);

    doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 196, 21, {
      align: "right",
    });
  };

  const downloadWaterQualityPdf = () => {
    if (historyRows.length === 0) {
      setError("There is no water quality data to export.");
      return;
    }

    const doc = new jsPDF();

    addPdfHeader(doc, "Water Quality Report");

    doc.setTextColor(23, 54, 93);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    doc.text(`Report Period: ${fromDate} to ${toDate}`, 14, 42);

    autoTable(doc, {
      startY: 48,
      head: [["Sensor", "Records", "Average", "Minimum", "Maximum"]],
      body: [
        [
          "Temperature",
          waterStats.temperature.count,
          `${formatNumber(waterStats.temperature.average)} °C`,
          `${formatNumber(waterStats.temperature.minimum)} °C`,
          `${formatNumber(waterStats.temperature.maximum)} °C`,
        ],
        [
          "pH",
          waterStats.ph.count,
          formatNumber(waterStats.ph.average),
          formatNumber(waterStats.ph.minimum),
          formatNumber(waterStats.ph.maximum),
        ],
        [
          "Ammonia",
          waterStats.ammonia.count,
          `${formatNumber(waterStats.ammonia.average)} mg/L`,
          `${formatNumber(waterStats.ammonia.minimum)} mg/L`,
          `${formatNumber(waterStats.ammonia.maximum)} mg/L`,
        ],
        [
          "Battery",
          waterStats.battery.count,
          `${formatNumber(waterStats.battery.average)} V`,
          `${formatNumber(waterStats.battery.minimum)} V`,
          `${formatNumber(waterStats.battery.maximum)} V`,
        ],
        [
          "Current",
          waterStats.current.count,
          `${formatNumber(waterStats.current.average)} A`,
          `${formatNumber(waterStats.current.minimum)} A`,
          `${formatNumber(waterStats.current.maximum)} A`,
        ],
        [
          "Water Level",
          waterStats.waterLevel.count,
          `${formatNumber(waterStats.waterLevel.average)} cm`,
          `${formatNumber(waterStats.waterLevel.minimum)} cm`,
          `${formatNumber(waterStats.waterLevel.maximum)} cm`,
        ],
        [
          "Water Fill",
          waterStats.waterPercent.count,
          `${formatNumber(waterStats.waterPercent.average)} %`,
          `${formatNumber(waterStats.waterPercent.minimum)} %`,
          `${formatNumber(waterStats.waterPercent.maximum)} %`,
        ],
      ],
      headStyles: {
        fillColor: [23, 54, 93],
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
    });

    doc.save(`CRAYTECH-Water-Quality-${fromDate}-to-${toDate}.pdf`);
  };

  const downloadFarmPdf = () => {
    const doc = new jsPDF();

    addPdfHeader(doc, "Farm Management Report");

    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Value"]],
      body: [
        ["Active Batches", farmSummary.activeBatches],
        ["Total Batches", farmSummary.totalBatches],
        ["Total Areas", farmSummary.totalAreas],
        ["Active Areas", farmSummary.activeAreas],
        ["Recorded Crayfish", farmSummary.totalCrayfish],
        ["Total Mortalities", farmSummary.totalMortalities],
        ["Total Harvested", farmSummary.totalHarvested],
        ["Surviving Crayfish", farmSummary.survivingCrayfish],
      ],
      headStyles: {
        fillColor: [23, 54, 93],
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
    });

    doc.save(`CRAYTECH-Farm-Management-${toInputDate(new Date())}.pdf`);
  };

  const downloadSalesPdf = () => {
    const doc = new jsPDF();
    addPdfHeader(doc, "Sales Performance Report");
    doc.setFontSize(10);
    doc.text(`Report Period: ${fromDate} to ${toDate}`, 14, 38);
    autoTable(doc, {
      startY: 44,
      head: [["Sales Metric", "Value"]],
      body: [
        ["Orders in period", salesMetrics.totalOrders],
        ["Completed orders", salesMetrics.completedOrders],
        ["Pending / in progress", salesMetrics.pendingOrders],
        ["Cancelled orders", salesMetrics.cancelledOrders],
        ["Gross completed sales", formatMoney(salesMetrics.grossRevenue)],
        ["Successful refunds", formatMoney(salesMetrics.refunds)],
        ["Net sales", formatMoney(salesMetrics.totalSales)],
        [
          "Average completed order value",
          formatMoney(salesMetrics.averageOrderValue),
        ],
        ["Kilograms sold", `${formatNumber(salesMetrics.kilogramsSold, 2)} kg`],
        ["Packed pieces recorded", salesMetrics.packedPieces],
      ],
      headStyles: { fillColor: [23, 54, 93] },
      alternateRowStyles: { fillColor: [245, 248, 252] },
    });
    let finalY = (doc as any).lastAutoTable?.finalY ?? 44;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Best-Selling Products", 14, finalY + 12);
    autoTable(doc, {
      startY: finalY + 16,
      head: [["Product", "KG Sold", "Packed Pieces", "Orders", "Revenue"]],
      body: topProducts.length
        ? topProducts.map((item) => [
            item.name,
            formatNumber(item.kilograms, 2),
            item.packedPieces,
            item.orderCount,
            formatMoney(item.revenue),
          ])
        : [["No completed product sales", "", "", "", ""]],
      headStyles: { fillColor: [23, 54, 93] },
    });
    finalY = (doc as any).lastAutoTable?.finalY ?? finalY + 16;
    doc.text("Top Purchase Locations", 14, finalY + 12);
    autoTable(doc, {
      startY: finalY + 16,
      head: [["Location", "Orders", "Net Revenue"]],
      body: salesByLocation.length
        ? salesByLocation.map((item) => [
            item.location,
            item.orders,
            formatMoney(item.revenue),
          ])
        : [["No location data", "", ""]],
      headStyles: { fillColor: [245, 158, 11] },
    });
    finalY = (doc as any).lastAutoTable?.finalY ?? finalY + 16;
    doc.text("Payment Method Breakdown", 14, finalY + 12);
    autoTable(doc, {
      startY: finalY + 16,
      head: [
        [
          "Method",
          "Orders",
          "Paid",
          "Pending",
          "Failed",
          "Refunded",
          "Net Revenue",
        ],
      ],
      body: paymentBreakdown.length
        ? paymentBreakdown.map((item) => [
            item.method,
            item.orders,
            item.paid,
            item.pending,
            item.failed,
            item.refunded,
            formatMoney(item.revenue),
          ])
        : [["No payment records", "", "", "", "", "", ""]],
      headStyles: { fillColor: [23, 54, 93] },
    });
    finalY = (doc as any).lastAutoTable?.finalY ?? finalY + 16;
    doc.text("Top Customers", 14, finalY + 12);
    autoTable(doc, {
      startY: finalY + 16,
      head: [["Customer", "Completed Orders", "Net Revenue"]],
      body: topCustomers.length
        ? topCustomers.map((item) => [
            item.customer,
            item.orders,
            formatMoney(item.revenue),
          ])
        : [["No customer sales", "", ""]],
      headStyles: { fillColor: [245, 158, 11] },
    });
    doc.save(`CRAYTECH-Sales-Report-${fromDate}-to-${toDate}.pdf`);
  };

  /*
   * ============================================================
   * STAT CARD
   * ============================================================
   */

  const StatCard = ({
    label,
    value,
    unit,
    icon,
    accent = "blue",
  }: {
    label: string;
    value: string;
    unit?: string;
    icon: React.ReactNode;
    accent?: "blue" | "orange";
  }) => {
    const classes =
      accent === "orange"
        ? "bg-orange-50 text-[#F59E0B]"
        : "bg-blue-50 text-[#17365D]";

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs sm:text-sm font-medium text-gray-500">
            {label}
          </p>

          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes}`}
          >
            {icon}
          </div>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <p className="text-xl sm:text-2xl font-extrabold text-[#17365D] break-words">
            {value}
          </p>

          {unit && (
            <span className="pb-1 text-sm font-semibold text-gray-400">
              {unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  /*
   * ============================================================
   * STATS TABLE
   * ============================================================
   */

  const StatsTable = ({
    rows,
  }: {
    rows: Array<{
      label: string;
      stats: MetricStats;
      unit: string;
      decimals?: number;
    }>;
  }) => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#17365D] text-white">
            <tr>
              <th className="px-5 py-4 font-bold">Sensor</th>
              <th className="px-5 py-4 font-bold">Records</th>
              <th className="px-5 py-4 font-bold">Average</th>
              <th className="px-5 py-4 font-bold">Minimum</th>
              <th className="px-5 py-4 font-bold">Maximum</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-gray-100">
                <td className="px-5 py-4 font-semibold text-gray-700">
                  {row.label}
                </td>

                <td className="px-5 py-4 text-gray-500">{row.stats.count}</td>

                <td className="px-5 py-4 font-semibold text-[#17365D]">
                  {formatNumber(row.stats.average, row.decimals ?? 2)}{" "}
                  {row.unit}
                </td>

                <td className="px-5 py-4 text-gray-600">
                  {formatNumber(row.stats.minimum, row.decimals ?? 2)}{" "}
                  {row.unit}
                </td>

                <td className="px-5 py-4 text-gray-600">
                  {formatNumber(row.stats.maximum, row.decimals ?? 2)}{" "}
                  {row.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  /*
   * ============================================================
   * REPORT CONTENT
   * ============================================================
   */

  const renderReportContent = () => {
    switch (selectedReport) {
      /*
       * ========================================================
       * WATER QUALITY
       * ========================================================
       */

      case "Water Quality":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17365D]">
                  Water Quality Report
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Review historical sensor readings stored by the CRAYTECH
                  ESP32.
                </p>
              </div>
            </div>

            <div className="sticky top-[136px] z-30 -mx-1 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-md shadow-slate-900/5 backdrop-blur-xl sm:mx-0 sm:px-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:gap-4">
                  <label className="min-w-0 text-xs font-bold capitalize tracking-wide text-[#17365D]">
                    From
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="mt-1.5 h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-2 focus:ring-[#17365D]/10 sm:h-10 sm:px-3 sm:text-sm"
                    />
                  </label>
                  <label className="min-w-0 text-xs font-bold capitalize tracking-wide text-[#17365D]">
                    To
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="mt-1.5 h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-2 focus:ring-[#17365D]/10 sm:h-10 sm:px-3 sm:text-sm"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:pb-0.5">
                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    {historyRows.length} records
                  </p>
                  <button
                    type="button"
                    onClick={loadWaterQuality}
                    disabled={loading}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#17365D] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#0F2948] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
                  >
                    <RefreshCw
                      size={14}
                      className={loading ? "animate-spin" : ""}
                    />
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <Loader2 size={30} className="animate-spin text-[#17365D]" />

                  <p className="text-sm font-semibold">
                    Loading water quality data...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    label="Average Temperature"
                    value={formatNumber(waterStats.temperature.average, 2)}
                    unit="°C"
                    icon={<Thermometer size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Average pH"
                    value={formatNumber(waterStats.ph.average, 2)}
                    unit="pH"
                    icon={<Waves size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Average Ammonia"
                    value={formatNumber(waterStats.ammonia.average, 2)}
                    unit="mg/L"
                    icon={<Activity size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Average Water Level"
                    value={formatNumber(waterStats.waterLevel.average, 2)}
                    unit="cm"
                    icon={<Droplets size={20} />}
                    accent="orange"
                  />
                </div>

                <StatsTable
                  rows={[
                    {
                      label: "Water Temperature",
                      stats: waterStats.temperature,
                      unit: "°C",
                    },
                    {
                      label: "pH Level",
                      stats: waterStats.ph,
                      unit: "pH",
                    },
                    {
                      label: "Ammonia",
                      stats: waterStats.ammonia,
                      unit: "mg/L",
                    },
                    {
                      label: "Battery Voltage",
                      stats: waterStats.battery,
                      unit: "V",
                    },
                    {
                      label: "Current Draw",
                      stats: waterStats.current,
                      unit: "A",
                    },
                    {
                      label: "Water Level",
                      stats: waterStats.waterLevel,
                      unit: "cm",
                    },
                    {
                      label: "Water Fill",
                      stats: waterStats.waterPercent,
                      unit: "%",
                      decimals: 1,
                    },
                  ]}
                />

                {historyRows.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                      <div>
                        <h3 className="font-bold text-[#17365D]">
                          Sensor Records
                        </h3>

                        <p className="mt-1 text-xs text-gray-400">
                          Historical readings from Firebase.
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#17365D]">
                        {historyRows.length} records
                      </span>
                    </div>

                    <div className="max-h-[420px] overflow-auto">
                      <table className="min-w-[1050px] w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[#17365D] text-white">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Temp</th>
                            <th className="px-4 py-3">pH</th>
                            <th className="px-4 py-3">Ammonia</th>
                            <th className="px-4 py-3">Battery</th>
                            <th className="px-4 py-3">Current</th>
                            <th className="px-4 py-3">Water Level</th>
                            <th className="px-4 py-3">Fill</th>
                          </tr>
                        </thead>

                        <tbody>
                          {historyRows.map((row, index) => (
                            <tr
                              key={`${row.date}-${row.time}-${index}`}
                              className="border-t border-gray-100"
                            >
                              <td className="px-4 py-3 text-gray-600">
                                {row.date}
                              </td>

                              <td className="px-4 py-3 font-semibold text-gray-700">
                                {row.time}
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.waterTemp, 2)} °C
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.ph, 2)}
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.ammonia, 2)}
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.batteryVoltage, 2)} V
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.current, 2)} A
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.waterLevel, 2)} cm
                              </td>

                              <td className="px-4 py-3">
                                {formatNumber(row.waterPercent, 1)} %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      /*
       * ========================================================
       * FARM MANAGEMENT
       * ========================================================
       */

      case "Farm Management":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17365D]">
                  Farm Management Report
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Summary of batches, areas, crayfish population, mortality, and
                  completed harvest.
                </p>
              </div>
            </div>

            {loadingFarm ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <Loader2 size={30} className="animate-spin text-[#17365D]" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    label="Active Batches"
                    value={String(farmSummary.activeBatches)}
                    icon={<Sprout size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Total Batches"
                    value={String(farmSummary.totalBatches)}
                    icon={<ClipboardList size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Total Areas"
                    value={String(farmSummary.totalAreas)}
                    icon={<Boxes size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Active Areas"
                    value={String(farmSummary.activeAreas)}
                    icon={<CheckCircle2 size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Initial Crayfish"
                    value={String(farmSummary.initialPopulation)}
                    icon={<Activity size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Current Crayfish"
                    value={String(farmSummary.totalCrayfish)}
                    icon={<Activity size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Total Mortalities"
                    value={String(farmSummary.totalMortalities)}
                    icon={<Skull size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Total Sold / Harvested"
                    value={String(farmSummary.totalHarvested)}
                    icon={<TrendingUp size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Surviving Crayfish"
                    value={String(farmSummary.survivingCrayfish)}
                    icon={<Activity size={20} />}
                    accent="blue"
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-start gap-3">
                    <Sprout
                      size={20}
                      className="mt-0.5 shrink-0 text-[#17365D]"
                    />

                    <div>
                      <p className="font-bold text-[#17365D]">
                        Farm Management Summary
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Crayfish population is calculated directly from
                        <span className="font-bold"> /batches </span>
                        using
                        <span className="font-bold"> initial_population </span>
                        and
                        <span className="font-bold"> current_population </span>.
                        Orders that have already been packed are reconciled
                        separately from mortality. A delivery that is only
                        assigned or out for delivery is not counted as
                        sold/harvested until it is completed. Mortality is
                        calculated only from the remaining unexplained
                        population difference.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      /*
       * ========================================================
       * SALES
       * ========================================================
       */

      case "Sales":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17365D]">
                  Sales Performance Report
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Review revenue, orders, product performance, customer
                  purchases, and payment activity.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadSales}
                  disabled={loadingSales}
                  className="flex items-center gap-2 rounded-xl border border-[#17365D]/30 px-4 py-3 text-sm font-bold text-[#17365D] hover:bg-blue-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={loadingSales ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {loadingSales ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <Loader2 size={30} className="animate-spin text-[#17365D]" />

                  <p className="text-sm font-semibold">
                    Loading sales and inventory...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <section className="sticky top-[136px] z-30 -mx-1 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-md shadow-slate-900/5 backdrop-blur-xl sm:mx-0 sm:px-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:gap-4">
                      <label className="min-w-0 text-xs font-bold capitalize tracking-wide text-[#17365D]">
                        From
                        <input
                          type="date"
                          value={fromDate}
                          max={toDate}
                          onChange={(event) => setFromDate(event.target.value)}
                          className="mt-1.5 h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-2 focus:ring-[#17365D]/10 sm:h-10 sm:px-3 sm:text-sm"
                        />
                      </label>
                      <label className="min-w-0 text-xs font-bold capitalize tracking-wide text-[#17365D]">
                        To
                        <input
                          type="date"
                          value={toDate}
                          min={fromDate}
                          onChange={(event) => setToDate(event.target.value)}
                          className="mt-1.5 h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-2 focus:ring-[#17365D]/10 sm:h-10 sm:px-3 sm:text-sm"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] leading-4 text-slate-400 sm:max-w-[190px] sm:pb-1 sm:text-xs">
                      Sales include orders created within this period.
                    </p>
                  </div>
                </section>

                {/* SALES SUMMARY */}

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    label="Net Sales"
                    value={formatMoney(salesMetrics.totalSales)}
                    icon={<TrendingUp size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Total Orders"
                    value={String(salesMetrics.totalOrders)}
                    icon={<ShoppingCart size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Completed Orders"
                    value={String(salesMetrics.completedOrders)}
                    icon={<CheckCircle2 size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Pending Orders"
                    value={String(salesMetrics.pendingOrders)}
                    icon={<ClipboardList size={20} />}
                    accent="orange"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    label="Cancelled Orders"
                    value={String(salesMetrics.cancelledOrders)}
                    icon={<Activity size={20} />}
                    accent="orange"
                  />

                  <StatCard
                    label="Packed Pieces Recorded"
                    value={String(salesMetrics.packedPieces)}
                    unit="pcs"
                    icon={<Package size={20} />}
                    accent="blue"
                  />

                  <StatCard
                    label="Kilograms Sold"
                    value={formatNumber(salesMetrics.kilogramsSold, 2)}
                    unit="kg"
                    icon={<Scale size={20} />}
                    accent="orange"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    label="Average Order Value"
                    value={formatMoney(salesMetrics.averageOrderValue)}
                    icon={<TrendingUp size={20} />}
                    accent="blue"
                  />
                  <StatCard
                    label="Successful Refunds"
                    value={String(refundBreakdown.succeeded)}
                    icon={<RefreshCw size={20} />}
                    accent="orange"
                  />
                  <StatCard
                    label="Refunded Amount"
                    value={formatMoney(refundBreakdown.amount)}
                    icon={<Activity size={20} />}
                    accent="orange"
                  />
                </div>

                {/* SALES ANALYTICS */}

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-[#F59E0B]" />
                        <h3 className="font-bold text-[#17365D]">
                          Best-Selling Products
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Ranked by kilograms in completed orders.
                      </p>
                    </div>
                    {topProducts.length ? (
                      <div className="divide-y divide-gray-100">
                        {topProducts.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-5 py-3"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-extrabold text-[#17365D]">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-700">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.orderCount} orders · {item.packedPieces}{" "}
                                packed pcs
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-[#17365D]">
                              {formatNumber(item.kilograms, 2)} kg sold
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-6 text-sm text-gray-500">
                        No product-level sales details found in completed
                        orders.
                      </p>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-[#F59E0B]" />
                        <h3 className="font-bold text-[#17365D]">
                          Top Purchase Locations
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Ranked by completed orders using each order’s saved
                        delivery address.
                      </p>
                    </div>
                    {salesByLocation.length ? (
                      <div className="divide-y divide-gray-100">
                        {salesByLocation.map((item, index) => (
                          <div
                            key={item.location}
                            className="flex items-center gap-3 px-5 py-3"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-extrabold text-orange-600">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-700">
                                {item.location}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatMoney(item.revenue)} revenue
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-[#17365D]">
                              {item.orders} orders
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-6 text-sm text-gray-500">
                        No delivery location details found in completed orders.
                      </p>
                    )}
                  </section>
                </div>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="font-bold text-[#17365D]">
                      Sales Performance by Month
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Net revenue from completed orders grouped by order
                      creation month.
                    </p>
                  </div>
                  {salesByMonth.length ? (
                    <div className="space-y-4 p-5">
                      {salesByMonth.map((item) => {
                        const max = Math.max(
                          ...salesByMonth.map((row) => row.revenue),
                          1,
                        );
                        return (
                          <div key={item.period} className="space-y-1.5">
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="font-medium text-gray-600">
                                {item.period}
                              </span>
                              <span className="font-bold text-[#17365D]">
                                {formatMoney(item.revenue)}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-[#F59E0B]"
                                style={{
                                  width: `${(item.revenue / max) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="p-6 text-sm text-gray-500">
                      Order dates are not available for monthly analysis.
                    </p>
                  )}
                </section>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <h3 className="font-bold text-[#17365D]">
                        Payment Method Breakdown
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Payment status and completed-order revenue by method.
                      </p>
                    </div>
                    {paymentBreakdown.length ? (
                      <div className="divide-y divide-gray-100">
                        {paymentBreakdown.map((item) => (
                          <div
                            key={item.method}
                            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-700">
                                {item.method}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.paid} paid · {item.pending} pending ·{" "}
                                {item.failed} failed · {item.refunded} refunded
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-[#17365D]">
                                {item.orders} orders
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatMoney(item.revenue)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-6 text-sm text-gray-500">
                        No payment records for this period.
                      </p>
                    )}
                  </section>
                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <h3 className="font-bold text-[#17365D]">
                        Top Customers
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Ranked by net revenue from completed orders.
                      </p>
                    </div>
                    {topCustomers.length ? (
                      <div className="divide-y divide-gray-100">
                        {topCustomers.map((item, index) => (
                          <div
                            key={item.customer}
                            className="flex items-center gap-3 px-5 py-3"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-extrabold text-[#17365D]">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-700">
                                {item.customer}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.orders} completed orders
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-[#17365D]">
                              {formatMoney(item.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-6 text-sm text-gray-500">
                        No customer sales for this period.
                      </p>
                    )}
                  </section>
                </div>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="font-bold text-[#17365D]">
                      Order Status Breakdown
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Distribution of all orders created within the selected
                      period.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
                    {orderStatusBreakdown.map((item) => (
                      <div
                        key={item.status}
                        className="rounded-xl bg-gray-50 p-3"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          {item.status.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-[#17365D]">
                          {item.count}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <ShoppingCart
                      size={20}
                      className="mt-0.5 shrink-0 text-[#F59E0B]"
                    />

                    <div>
                      <p className="font-bold text-[#17365D]">
                        Sales & Inventory Source
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Orders are loaded from the authenticated
                        <span className="font-bold"> /orders </span>
                        endpoint and current stock from
                        <span className="font-bold"> /products</span>. Only
                        completed orders contribute to sales. Successful refunds
                        are deducted from gross sales. Product quantities are
                        measured in kilograms; packed pieces are shown
                        separately.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "Inventory":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17365D]">
                  Inventory Report
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review current product stock, available kilograms, estimated
                  sold stock, and selling prices.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSales}
                disabled={loadingSales}
                className="flex items-center gap-2 rounded-xl border border-[#17365D]/30 px-4 py-3 text-sm font-bold text-[#17365D] hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loadingSales ? "animate-spin" : ""}
                />{" "}
                Refresh inventory
              </button>
            </div>
            {loadingSales ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <Loader2 size={30} className="animate-spin text-[#17365D]" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <StatCard
                    label="Products"
                    value={String(inventory.length)}
                    icon={<Package size={20} />}
                  />
                  <StatCard
                    label="Total Stock"
                    value={formatNumber(
                      inventory.reduce(
                        (sum, item) => sum + item.totalWeightKg,
                        0,
                      ),
                      2,
                    )}
                    unit="kg"
                    icon={<Boxes size={20} />}
                  />
                  <StatCard
                    label="Available Stock"
                    value={formatNumber(
                      inventory.reduce(
                        (sum, item) => sum + item.availableWeightKg,
                        0,
                      ),
                      2,
                    )}
                    unit="kg"
                    icon={<CheckCircle2 size={20} />}
                  />
                  <StatCard
                    label="Unavailable Products"
                    value={String(
                      inventory.filter((item) => !item.isAvailable).length,
                    )}
                    icon={<Activity size={20} />}
                    accent="orange"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-[#17365D]">
                        Current Product Inventory
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Stock values are displayed in kilograms.
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                      {inventory.length} products
                    </span>
                  </div>
                  {inventory.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      No inventory records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[760px] w-full text-left text-sm">
                        <thead className="bg-[#17365D] text-white">
                          <tr>
                            <th className="px-5 py-4">Product</th>
                            <th className="px-5 py-4">Total Stock</th>
                            <th className="px-5 py-4">Available Stock</th>
                            <th className="px-5 py-4">Estimated Sold</th>
                            <th className="px-5 py-4">Price / KG</th>
                            <th className="px-5 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.map((item) => (
                            <tr
                              key={String(item.id)}
                              className="border-t border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-5 py-4 font-semibold text-gray-700">
                                {item.name}
                              </td>
                              <td className="px-5 py-4">
                                {formatNumber(item.totalWeightKg, 2)} kg
                              </td>
                              <td className="px-5 py-4 font-bold text-[#17365D]">
                                {formatNumber(item.availableWeightKg, 2)} kg
                              </td>
                              <td className="px-5 py-4 font-semibold text-orange-600">
                                {formatNumber(
                                  Math.max(
                                    0,
                                    item.totalWeightKg - item.availableWeightKg,
                                  ),
                                  2,
                                )}{" "}
                                kg
                              </td>
                              <td className="px-5 py-4">
                                {formatMoney(item.pricePerKg)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${item.isAvailable ? "bg-blue-50 text-[#17365D]" : "bg-gray-100 text-gray-500"}`}
                                >
                                  {item.isAvailable
                                    ? "Available"
                                    : "Unavailable"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:p-5">
                  <p className="font-bold text-[#17365D]">
                    Inventory data source
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Current stock is loaded from the authenticated product data
                    endpoint. Estimated sold stock is calculated as total stock
                    minus available stock and should be treated as an estimate,
                    not a transaction ledger.
                  </p>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const hasLoading = loading || loadingFarm || loadingSales;

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#F5F8FC]">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        {/* HERO */}

        <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#17365D] via-[#123F72] to-[#0F2948] px-4 py-5 text-white shadow-lg sm:mb-6 sm:px-6 sm:py-7 lg:mb-8 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-[#F59E0B]/20 sm:right-32" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-8 shrink-0 rounded-full bg-[#F59E0B] sm:h-2 sm:w-10" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-100 sm:text-xs">
                  CRAYTECH Reports
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm sm:h-12 sm:w-12">
                  <FileText size={22} className="text-[#F59E0B]" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                    Reports
                  </h1>

                  <p className="mt-1 text-xs leading-5 text-blue-100 sm:text-sm">
                    View and generate farm, water quality, and sales reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STICKY REPORT TABS */}

        <div className="sticky top-16 z-40 -mx-3 mb-5 border-b border-gray-200 bg-[#F5F8FC]/95 px-3 py-2 backdrop-blur-md sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
              {reportTypes.map((report) => {
                const isSelected = selectedReport === report.type;

                return (
                  <button
                    key={report.type}
                    type="button"
                    onClick={() => handleReportSelect(report)}
                    aria-current={isSelected ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                      isSelected
                        ? "bg-[#17365D] text-white shadow-sm"
                        : "text-gray-600 hover:bg-orange-50 hover:text-[#17365D]"
                    }`}
                  >
                    <span
                      className={
                        isSelected ? "text-[#F59E0B]" : "text-gray-400"
                      }
                    >
                      {report.icon}
                    </span>
                    {report.type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700 sm:mb-6 sm:p-4">
            <Activity size={18} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-bold">Report Error</p>

              <p className="mt-1">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* GLOBAL STATUS */}

        {hasLoading && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm font-semibold text-[#17365D] sm:mb-6 sm:px-4">
            <Loader2 size={17} className="animate-spin" />
            Loading report data...
          </div>
        )}

        {/* REPORT CONTENT */}

        <div className="min-w-0">{renderReportContent()}</div>

        {/* CENTRALIZED CONTEXTUAL DOWNLOAD BUTTON */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {downloadMenuOpen && (
            <div className="mb-1 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
              <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Download {selectedReport}
              </p>
              <button
                type="button"
                onClick={downloadCurrentCsv}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-[#17365D] hover:bg-blue-50"
              >
                <Download size={17} /> Download CSV
              </button>
              <button
                type="button"
                onClick={downloadCurrentPdf}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-[#17365D] hover:bg-orange-50"
              >
                <FileText size={17} /> Download PDF
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setDownloadMenuOpen((open) => !open)}
            aria-label="Open download options"
            aria-expanded={downloadMenuOpen}
            title={`Download ${selectedReport} report`}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#17365D] text-white shadow-xl ring-4 ring-white transition hover:scale-105 hover:bg-[#0F2948] active:scale-95"
          >
            <Download size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}
