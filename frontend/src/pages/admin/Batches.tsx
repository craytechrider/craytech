import { useEffect, useState } from "react";
import {
  Plus,
  X,
  Pencil,
  Layers3,
  Fish,
  Skull,
  Activity,
  CalendarDays,
  MapPin,
  Tag,
  Users,
  CheckCircle,
  Archive,
  Search,
} from "lucide-react";

import api from "../../lib/api";

interface AreaType {
  id: number;
  name: string;
}

interface CrayfishType {
  id: number;
  name: string;
}

interface Area {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  total_crayfish: number;
  area_type_id: number;
  crayfish_type_id: number | null;
  areaType?: AreaType;
}

interface BatchUpdate {
  id: number;
  population: number;
  mortality_rate: number;
  created_at: string;
}

interface Batch {
  id: number;
  batch_name: string;
  area_id: number;
  crayfish_type_id: number;
  initial_population: number;
  current_population: number;
  date_added: string;
  status?: "active" | "released";
  date_released?: string | null;
  release_remarks?: string | null;
  area?: Area;
  crayfishType?: CrayfishType;
  updates?: BatchUpdate[];
}

interface OrderItem {
  id: number;
  product_id: number;
  packed_pieces: number | null;
  product?: {
    id: number;
    batch_id?: number | null;
  };
}

interface Order {
  id: number;
  status?: string;
  delivery_status?: string | null;
  items?: OrderItem[];
  order_items?: OrderItem[];
}

interface BatchForm {
  batch_name: string;
  area_id: string;
  crayfish_type_id: string;
  initial_population: string;
  date_added: string;
}

function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [crayfishTypes, setCrayfishTypes] = useState<CrayfishType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");

  const [addModal, setAddModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const [newPopulation, setNewPopulation] = useState("");

  const emptyForm: BatchForm = {
    batch_name: "",
    area_id: "",
    crayfish_type_id: "",
    initial_population: "",
    date_added: new Date().toISOString().split("T")[0],
  };

  const [form, setForm] = useState<BatchForm>(emptyForm);

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [batchesResponse, farmResponse, ordersResponse] = await Promise.all(
        [api.get("/batches"), api.get("/farm-management"), api.get("/orders")],
      );

      setBatches(batchesResponse.data?.data ?? batchesResponse.data ?? []);

      setOrders(ordersResponse.data?.data ?? ordersResponse.data ?? []);

      const farmData = farmResponse.data?.data ?? farmResponse.data ?? {};

      setAreas(farmData.areas ?? []);
      setCrayfishTypes(farmData.crayfishTypes ?? []);
    } catch (err) {
      console.error("Batch Management API error:", err);

      setError("Unable to load batch management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // STATISTICS
  // ============================================================

  const activeBatches = batches.filter((batch) => batch.status !== "released");
  const releasedBatches = batches.filter(
    (batch) => batch.status === "released",
  );

  const normalizedSearch = search.trim().toLowerCase();

  const matchesBatchSearch = (batch: Batch) =>
    batch.batch_name.toLowerCase().includes(normalizedSearch) ||
    (batch.area?.name ?? "").toLowerCase().includes(normalizedSearch) ||
    (batch.crayfishType?.name ?? "").toLowerCase().includes(normalizedSearch);

  const filteredActiveBatches = activeBatches.filter(matchesBatchSearch);
  const filteredReleasedBatches = releasedBatches.filter(matchesBatchSearch);

  const showActiveBatches = batchFilter !== "released";
  const showReleasedBatches = batchFilter !== "active";

  const totalBatches = activeBatches.length;

  const totalCrayfish = activeBatches.reduce(
    (total, batch) => total + Number(batch.current_population || 0),
    0,
  );

  const getOrderItems = (order: Order): OrderItem[] =>
    Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.order_items)
        ? order.order_items
        : [];

  const isCancelledOrder = (order: Order) => {
    const status = String(order.status ?? "").toLowerCase();

    return ["cancelled", "canceled", "rejected"].includes(status);
  };

  const getPackedPiecesForBatch = (batchId: number) => {
    return orders.reduce((total, order) => {
      if (isCancelledOrder(order)) {
        return total;
      }

      return (
        total +
        getOrderItems(order).reduce((itemTotal, item) => {
          const productBatchId = Number(item.product?.batch_id ?? 0);

          if (productBatchId !== Number(batchId)) {
            return itemTotal;
          }

          const packed = Number(item.packed_pieces ?? 0);

          return (
            itemTotal + (Number.isFinite(packed) ? Math.max(0, packed) : 0)
          );
        }, 0)
      );
    }, 0);
  };

  const getBatchMortalityCount = (batch: Batch) => {
    const initial = Math.max(0, Number(batch.initial_population || 0));

    const current = Math.max(0, Number(batch.current_population || 0));

    const packedForOrders = getPackedPiecesForBatch(batch.id);

    return Math.max(0, initial - current - packedForOrders);
  };

  const averageMortality =
    activeBatches.length > 0
      ? activeBatches.reduce((total, batch) => {
          const initial = Number(batch.initial_population || 0);

          if (initial <= 0) {
            return total;
          }

          const mortalityCount = getBatchMortalityCount(batch);

          return total + (mortalityCount / initial) * 100;
        }, 0) / activeBatches.length
      : 0;

  const latestUpdates = batches.reduce(
    (total, batch) => total + (batch.updates?.length ?? 0),
    0,
  );

  // ============================================================
  // ADD BATCH
  // ============================================================

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/batches", {
        batch_name: form.batch_name,
        area_id: Number(form.area_id),
        crayfish_type_id: Number(form.crayfish_type_id),
        initial_population: Number(form.initial_population),
        date_added: form.date_added,
      });

      setAddModal(false);
      setForm(emptyForm);

      await loadData();
    } catch (err: any) {
      console.error(err);

      alert(err.response?.data?.message ?? "Failed to add batch.");
    }
  };

  // ============================================================
  // UPDATE
  // ============================================================

  const openUpdate = (batch: Batch) => {
    setSelectedBatch(batch);
    setNewPopulation(String(batch.current_population));
    setUpdateModal(true);
  };

  const handleUpdatePopulation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBatch) {
      return;
    }

    try {
      await api.put(`/batches/${selectedBatch.id}`, {
        current_population: Number(newPopulation),
      });

      setUpdateModal(false);
      setSelectedBatch(null);
      setNewPopulation("");

      await loadData();
    } catch (err: any) {
      console.error(err);

      alert(err.response?.data?.message ?? "Failed to update population.");
    }
  };

  // ============================================================
  // RELEASE BATCH
  // ============================================================

  const handleReleaseBatch = async (batch: Batch) => {
    if (batch.status === "released") return;

    const confirmed = window.confirm(
      `Release ${batch.batch_name}? This will remove the batch from its assigned area's active population and preserve its history.`,
    );
    if (!confirmed) return;

    const dateReleased = window.prompt(
      "Date released (YYYY-MM-DD):",
      new Date().toLocaleDateString("en-CA"),
    );
    if (!dateReleased) return;

    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateReleased)) {
      alert("Please enter the date in YYYY-MM-DD format.");
      return;
    }

    const remarks = window.prompt("Release remarks (optional):", "");

    try {
      await api.post(`/batches/${batch.id}/release`, {
        date_released: dateReleased,
        release_remarks: remarks || null,
      });
      await loadData();
      alert(`${batch.batch_name} has been released successfully.`);
    } catch (err: any) {
      console.error("Release batch error:", err);
      alert(err.response?.data?.message ?? "Failed to release batch.");
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-[420px]
          items-center
          justify-center
          px-4
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-4
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-blue-100
              border-t-[#1749D1]
            "
          />

          <p className="text-sm font-medium text-gray-500">
            Loading batch management...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div
      className="
        w-full
        min-w-0
        px-3
        pb-10
        pt-4
        sm:px-5
        sm:pt-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1450px]
        "
      >
        {/* ======================================================
            HERO
        ====================================================== */}

        <section
          className="
            relative
            mb-5
            overflow-hidden
            rounded-2xl
            bg-gradient-to-br
            from-[#1749D1]
            via-[#1557C0]
            to-[#102D79]
            px-5
            py-6
            text-white
            shadow-lg
            sm:mb-6
            sm:px-7
            sm:py-7
            lg:px-9
            lg:py-8
          "
        >
          {/* Decorative shapes */}

          <div
            className="
              pointer-events-none
              absolute
              -right-16
              -top-20
              h-52
              w-52
              rounded-full
              bg-white/10
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-24
              right-20
              h-48
              w-48
              rounded-full
              bg-orange-400/10
            "
          />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/20
                  bg-white/10
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-blue-100
                  sm:text-xs
                "
              >
                <Layers3 size={13} />
                Farm Management
              </div>

              <h1
                className="
                  text-2xl
                  font-extrabold
                  tracking-tight
                  sm:text-3xl
                  lg:text-4xl
                "
              >
                Batch Management
              </h1>

              <p
                className="
                  mt-2
                  max-w-3xl
                  text-sm
                  leading-6
                  text-blue-100
                  sm:text-base
                "
              >
                Manage crayfish breeding batches, monitor population, and track
                actual mortality separately from prepared orders.
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            className="
              mb-5
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              p-4
              text-sm
              font-medium
              text-red-700
            "
          >
            <Activity size={18} className="mt-0.5 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div
          className="
            grid
            grid-cols-4
            gap-1.5
            sm:gap-3
            lg:gap-4
          "
        >
          <StatCard
            label="Total Batches"
            value={totalBatches.toLocaleString()}
            icon={<Layers3 size={20} />}
            iconClass="bg-blue-100 text-[#1749D1]"
            valueClass="text-[#122B5C]"
          />

          <StatCard
            label="Total Crayfish"
            value={totalCrayfish.toLocaleString()}
            icon={<Fish size={20} />}
            iconClass="bg-blue-100 text-[#1557C0]"
            valueClass="text-[#1557C0]"
          />

          <StatCard
            label="Average Mortality"
            value={`${averageMortality.toFixed(2)}%`}
            icon={<Skull size={20} />}
            iconClass="bg-orange-100 text-orange-600"
            valueClass="text-orange-600"
          />

          <StatCard
            label="Latest Updates"
            value={latestUpdates.toLocaleString()}
            icon={<Activity size={20} />}
            iconClass="bg-green-100 text-green-600"
            valueClass="text-green-600"
          />
        </div>

        {/* SEARCH AND FILTER */}
        <section className="sticky top-[64px] z-40 mt-5 rounded-xl border border-gray-100 bg-white/95 p-3 shadow-md backdrop-blur-md sm:top-[72px] sm:p-4">
          <div className="flex w-full items-center gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch, area, or crayfish..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#1749D1] focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm"
              />
            </div>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-[38%] shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-medium text-gray-700 outline-none focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100 sm:w-48 sm:px-3 sm:text-sm"
              aria-label="Filter batches"
            >
              <option value="all">All Batches</option>
              <option value="active">Active Batches</option>
              <option value="released">Released Batches</option>
            </select>
          </div>
        </section>

        {/* ======================================================
            BATCH SECTION HEADER
        ====================================================== */}

        {showActiveBatches && (
          <>
            <div
              className="
            mt-7
            mb-4
            flex
            flex-col
            gap-2
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
            >
              <div>
                <h2
                  className="
                text-xl
                font-bold
                text-[#122B5C]
                sm:text-2xl
              "
                >
                  Active Batches
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  View population and mortality details for each batch.
                </p>
              </div>

              <div
                className="
              inline-flex
              w-fit
              items-center
              gap-2
              rounded-full
              bg-blue-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-[#1749D1]
            "
              >
                <Layers3 size={14} />
                {totalBatches} {totalBatches === 1 ? "Batch" : "Batches"}
              </div>
            </div>

            {/* ======================================================
            BATCH CARDS
        ====================================================== */}

            <div
              className="
            grid
            grid-cols-1
            gap-4
            sm:gap-5
            md:grid-cols-2
            xl:grid-cols-3
          "
            >
              {filteredActiveBatches.length === 0 ? (
                <div
                  className="
                col-span-full
                rounded-2xl
                border-2
                border-dashed
                border-blue-100
                bg-white
                px-5
                py-14
                text-center
                shadow-sm
              "
                >
                  <div
                    className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-blue-50
                  text-3xl
                "
                  >
                    🦞
                  </div>

                  <h2
                    className="
                  mt-4
                  text-xl
                  font-bold
                  text-gray-400
                  sm:text-2xl
                "
                  >
                    No batches found
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Click "Add Batch" to create your first batch.
                  </p>
                </div>
              ) : (
                filteredActiveBatches.map((batch) => {
                  const mortalityCount = getBatchMortalityCount(batch);

                  const mortality =
                    batch.initial_population > 0
                      ? (mortalityCount / batch.initial_population) * 100
                      : 0;

                  const latestUpdate = batch.updates?.length
                    ? [...batch.updates].sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime(),
                      )[0]
                    : null;

                  const populationPercentage =
                    batch.initial_population > 0
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            (batch.current_population /
                              batch.initial_population) *
                              100,
                          ),
                        )
                      : 0;

                  return (
                    <div
                      key={batch.id}
                      className="
                    group
                    overflow-hidden
                    rounded-xl
                    border
                    border-gray-100
                    bg-white
                    shadow-sm
                    transition
                    duration-200
                    hover:-translate-y-0.5
                    hover:shadow-lg
                  "
                    >
                      {/* CARD HEADER */}

                      <div
                        className="
                      relative
                      overflow-hidden
                      bg-gradient-to-br
                      from-[#1749D1]
                      to-[#102D79]
                      px-4
                      py-3
                      text-white
                    "
                      >
                        <div
                          className="
                        absolute
                        -right-8
                        -top-10
                        h-24
                        w-24
                        rounded-full
                        bg-white/10
                      "
                        />

                        <div className="relative">
                          <div
                            className="
                          mb-1
                          flex
                          items-center
                          gap-2
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-wider
                          text-blue-200
                        "
                          >
                            <Layers3 size={13} />
                            Batch
                          </div>

                          <h2
                            className="
                          truncate
                          text-base
                          font-extrabold
                          sm:text-lg
                        "
                          >
                            {batch.batch_name}
                          </h2>

                          <div
                            className="
                          mt-1.5
                          flex
                          flex-wrap
                          gap-2
                        "
                          >
                            <span
                              className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            bg-white/10
                            px-2
                            py-0.5
                            text-[10px]
                            font-medium
                            text-blue-100
                          "
                            >
                              <MapPin size={11} />

                              {batch.area?.name ?? "Unknown"}
                            </span>

                            <span
                              className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            bg-orange-400/20
                            px-2
                            py-0.5
                            text-[10px]
                            font-semibold
                            text-orange-100
                          "
                            >
                              <Tag size={11} />

                              {batch.crayfishType?.name ?? "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CARD BODY */}

                      <div className="p-3 sm:p-4">
                        {/* POPULATION */}

                        <div
                          className="
                        mb-3
                        rounded-lg
                        border
                        border-blue-100
                        bg-blue-50/50
                        p-3
                      "
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p
                                className="
                              text-[11px]
                              font-semibold
                              uppercase
                              tracking-wider
                              text-gray-500
                            "
                              >
                                Current Population
                              </p>

                              <p
                                className="
                              mt-0.5
                              text-xl
                              font-extrabold
                              text-[#122B5C]
                            "
                              >
                                {batch.current_population.toLocaleString()}
                              </p>
                            </div>

                            <div
                              className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-blue-100
                            text-[#1749D1]
                          "
                            >
                              <Fish size={18} />
                            </div>
                          </div>

                          <div className="mt-2">
                            <div
                              className="
                            mb-1
                            flex
                            items-center
                            justify-between
                            text-[10px]
                            font-semibold
                            text-gray-500
                          "
                            >
                              <span>Population remaining</span>

                              <span>{populationPercentage.toFixed(0)}%</span>
                            </div>

                            <div
                              className="
                            h-1.5
                            overflow-hidden
                            rounded-full
                            bg-blue-100
                          "
                            >
                              <div
                                className="
                              h-full
                              rounded-full
                              bg-[#1749D1]
                              transition-all
                            "
                                style={{
                                  width: `${populationPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* DETAILS */}

                        <div className="space-y-1.5">
                          <DetailRow
                            label="Initial Population"
                            value={batch.initial_population.toLocaleString()}
                            icon={<Users size={15} />}
                          />

                          <DetailRow
                            label="Mortality"
                            value={`${mortality.toFixed(2)}%`}
                            valueClass="text-red-600"
                            icon={<Skull size={15} />}
                          />

                          <DetailRow
                            label="Mortality Count"
                            value={mortalityCount.toLocaleString()}
                            valueClass="text-red-600"
                            icon={<Activity size={15} />}
                          />

                          <DetailRow
                            label="Date Added"
                            value={new Date(
                              batch.date_added,
                            ).toLocaleDateString()}
                            icon={<CalendarDays size={15} />}
                          />

                          <DetailRow
                            label="Latest Update"
                            value={
                              latestUpdate
                                ? new Date(
                                    latestUpdate.created_at,
                                  ).toLocaleDateString()
                                : "No updates yet"
                            }
                            icon={<Activity size={15} />}
                          />
                        </div>

                        {/* ACTIONS */}

                        <div className="mt-3 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => openUpdate(batch)}
                            className="inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600"
                          >
                            <Pencil size={14} />
                            Update Population
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReleaseBatch(batch)}
                            className="inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700"
                          >
                            <CheckCircle size={14} />
                            Release Batch
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================================
          RELEASED BATCH HISTORY
      ======================================================== */}

      {showReleasedBatches && filteredReleasedBatches.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-[1450px] px-3 pb-6 sm:px-5 lg:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Archive size={20} className="text-green-700" />
            <div>
              <h2 className="text-xl font-bold text-[#122B5C]">
                Released Batch History
              </h2>
              <p className="text-sm text-gray-500">
                Previously released batches are retained for farm records.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredReleasedBatches.map((batch) => (
              <div
                key={batch.id}
                className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#122B5C]">
                      {batch.batch_name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {batch.area?.name ?? "Former area"} ·{" "}
                      {batch.crayfishType?.name ?? "Unknown type"}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    Released
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Initial Population</span>
                    <strong>
                      {Number(batch.initial_population).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Population at Release</span>
                    <strong>
                      {Number(batch.current_population).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date Released</span>
                    <strong>
                      {batch.date_released
                        ? new Date(batch.date_released).toLocaleDateString()
                        : "—"}
                    </strong>
                  </div>
                </div>
                {batch.release_remarks && (
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    {batch.release_remarks}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredActiveBatches.length === 0 &&
        filteredReleasedBatches.length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
            <Layers3 size={24} className="mx-auto text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-600">
              No matching batches
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Try another search term or filter.
            </p>
          </div>
        )}

      {/* FLOATING ADD BATCH BUTTON */}
      <button
        type="button"
        aria-label="Add new batch"
        title="Add Batch"
        onClick={() => {
          setForm(emptyForm);
          setAddModal(true);
        }}
        className="fixed bottom-6 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#1749D1] text-white shadow-xl transition duration-200 hover:scale-105 hover:bg-[#102D79] active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:bottom-8 sm:right-8"
      >
        <Plus size={29} strokeWidth={2.5} />
      </button>

      {/* ========================================================
          ADD BATCH MODAL
      ======================================================== */}

      {addModal && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-end
            justify-center
            bg-slate-950/60
            p-2
            backdrop-blur-[2px]
            sm:items-center
            sm:p-4
          "
        >
          <div
            className="
              flex
              max-h-[88vh]
              w-full
              max-w-[calc(100vw-1rem)]
              flex-col
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
              sm:max-h-[90vh]
              sm:max-w-2xl
              sm:rounded-2xl
            "
          >
            {/* MODAL HEADER */}

            <div
              className="
                flex
                shrink-0
                items-center
                justify-between
                border-b
                border-gray-100
                bg-white
                px-4
                py-3
                sm:px-6
                sm:py-5
              "
            >
              <div className="min-w-0">
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#1749D1]
                  "
                >
                  <Layers3 size={15} />
                  Batch Management
                </div>

                <h2
                  className="
                    mt-1
                    truncate
                    text-lg
                    font-extrabold
                    text-[#122B5C]
                    sm:text-2xl
                  "
                >
                  Add New Batch
                </h2>

                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Create a new crayfish breeding batch.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setAddModal(false)}
                className="
                  ml-3
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-gray-100
                  text-gray-500
                  transition
                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleAddBatch}
              className="
                min-h-0
                flex-1
                overflow-y-auto
                px-4
                py-4
                sm:px-6
                sm:py-6
              "
            >
              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                  sm:gap-5
                "
              >
                <FormField label="Batch Name" required>
                  <input
                    value={form.batch_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        batch_name: e.target.value,
                      })
                    }
                    required
                    placeholder="Batch 001"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Area" required>
                  <select
                    value={form.area_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        area_id: e.target.value,
                      })
                    }
                    required
                    className={inputClass}
                  >
                    <option value="">Select Area</option>

                    {areas
                      .filter(
                        (area) =>
                          Number(area.occupied) === 0 ||
                          (Number(area.crayfish_type_id) ===
                            Number(form.crayfish_type_id) &&
                            Number(area.total_crayfish) <
                              Number(area.capacity)),
                      )
                      .map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name} ({area.areaType?.name ?? "Area"})
                        </option>
                      ))}
                  </select>
                </FormField>

                <FormField label="Crayfish Type" required>
                  <select
                    value={form.crayfish_type_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        crayfish_type_id: e.target.value,
                      })
                    }
                    required
                    className={inputClass}
                  >
                    <option value="">Select Crayfish Type</option>

                    {crayfishTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Initial Population" required>
                  <input
                    type="number"
                    min="1"
                    value={form.initial_population}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        initial_population: e.target.value,
                      })
                    }
                    required
                    placeholder="Enter population"
                    className={inputClass}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Date Added" required>
                    <input
                      type="date"
                      value={form.date_added}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          date_added: e.target.value,
                        })
                      }
                      required
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </div>

              {/* FORM ACTIONS */}

              <div
                className="
                  mt-4
                  flex
                  flex-col-reverse
                  gap-2
                  border-t
                  border-gray-100
                  pt-4
                  sm:flex-row
                  sm:justify-end
                "
              >
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="
                    min-h-[44px]
                    rounded-xl
                    border
                    border-gray-200
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-gray-600
                    transition
                    hover:bg-gray-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="
                    inline-flex
                    min-h-[44px]
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#1749D1]
                    px-6
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-[#102D79]
                  "
                >
                  <Plus size={17} />
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          UPDATE POPULATION MODAL
      ======================================================== */}

      {updateModal && selectedBatch && (
        <div
          className="
              fixed
              inset-0
              z-[100]
              flex
              items-end
              justify-center
              bg-slate-950/60
              p-0
              backdrop-blur-[2px]
              sm:items-center
              sm:p-4
            "
        >
          <div
            className="
                w-full
                overflow-hidden
                rounded-t-3xl
                bg-white
                shadow-2xl
                sm:max-w-lg
                sm:rounded-2xl
              "
          >
            {/* HEADER */}

            <div
              className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-gray-100
                  px-4
                  py-3
                  sm:px-6
                  sm:py-5
                "
            >
              <div>
                <div
                  className="
                      flex
                      items-center
                      gap-2
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-orange-600
                    "
                >
                  <Pencil size={14} />
                  Population
                </div>

                <h2
                  className="
                      mt-1
                      text-lg
                      font-extrabold
                      text-[#122B5C]
                      sm:text-xl
                    "
                >
                  Update Population
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setUpdateModal(false)}
                className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-gray-100
                    text-gray-500
                    transition
                    hover:bg-red-50
                    hover:text-red-600
                  "
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}

            <form onSubmit={handleUpdatePopulation} className="p-4 sm:p-6">
              <div className="space-y-4">
                <FormField label="Batch Name">
                  <input
                    value={selectedBatch.batch_name}
                    readOnly
                    className={`${inputClass} bg-gray-50 text-gray-500`}
                  />
                </FormField>

                <FormField label="Current Population">
                  <input
                    value={selectedBatch.current_population}
                    readOnly
                    className={`${inputClass} bg-gray-50 text-gray-500`}
                  />
                </FormField>

                <FormField label="New Population" required>
                  <input
                    type="number"
                    min="0"
                    max={selectedBatch.initial_population}
                    value={newPopulation}
                    onChange={(e) => setNewPopulation(e.target.value)}
                    required
                    className={inputClass}
                  />

                  <p className="mt-1.5 text-xs text-gray-500">
                    Maximum: {selectedBatch.initial_population.toLocaleString()}
                  </p>
                </FormField>
              </div>

              <div
                className="
                    mt-4
                    flex
                    flex-col-reverse
                    gap-2
                    border-t
                    border-gray-100
                    pt-4
                    sm:flex-row
                    sm:justify-end
                  "
              >
                <button
                  type="button"
                  onClick={() => setUpdateModal(false)}
                  className="
                      min-h-[44px]
                      rounded-xl
                      border
                      border-gray-200
                      px-5
                      py-2.5
                      text-sm
                      font-semibold
                      text-gray-600
                      transition
                      hover:bg-gray-50
                    "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="
                      inline-flex
                      min-h-[44px]
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-orange-500
                      px-6
                      py-2.5
                      text-sm
                      font-bold
                      text-white
                      transition
                      hover:bg-orange-600
                    "
                >
                  <Pencil size={16} />
                  Update Population
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass: string;
}

function StatCard({
  label,
  value,
  icon,
  iconClass,
  valueClass,
}: StatCardProps) {
  return (
    <div
      className="
        min-w-0
        overflow-hidden
        rounded-xl
        border
        border-gray-100
        bg-white
        p-1.5
        shadow-sm
        transition
        hover:shadow-md
        sm:rounded-2xl
        sm:p-3
        lg:p-4
      "
    >
      <div className="flex min-w-0 items-center justify-between gap-1">
        <p className="min-w-0 truncate text-[7px] font-semibold uppercase leading-tight tracking-tight text-gray-500 sm:text-[10px] lg:text-xs">
          {label}
        </p>
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md [&>svg]:h-3 [&>svg]:w-3 sm:h-7 sm:w-7 sm:rounded-lg sm:[&>svg]:h-4 sm:[&>svg]:w-4 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <p
        className={`mt-1 truncate text-sm font-extrabold leading-tight tracking-tight sm:mt-2 sm:text-xl lg:text-2xl ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// DETAIL ROW
// ============================================================

interface DetailRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}

function DetailRow({
  label,
  value,
  icon,
  valueClass = "text-[#243957]",
}: DetailRowProps) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        justify-between
        gap-3
        rounded-md
        bg-gray-50
        px-2.5
        py-1.5
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-1.5
          text-[11px]
          text-gray-500
          sm:text-xs
        "
      >
        <span className="shrink-0 text-[#1749D1] [&>svg]:h-3 [&>svg]:w-3">
          {icon}
        </span>

        <span className="truncate">{label}</span>
      </div>

      <strong
        className={`
          max-w-[52%]
          truncate
          text-right
          text-[11px]
          font-bold
          sm:text-xs
          ${valueClass}
        `}
      >
        {value}
      </strong>
    </div>
  );
}

// ============================================================
// FORM FIELD
// ============================================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, required = false, children }: FormFieldProps) {
  return (
    <div>
      <label
        className="
          mb-1.5
          block
          text-xs
          font-bold
          text-[#243957]
          sm:text-sm
        "
      >
        {label}

        {required && <span className="ml-1 text-orange-500">*</span>}
      </label>

      {children}
    </div>
  );
}

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass = `
  min-h-[44px]
  w-full
  rounded-xl
  border
  border-gray-200
  bg-white
  px-3.5
  py-2.5
  text-sm
  text-[#243957]
  outline-none
  transition
  placeholder:text-gray-400
  focus:border-[#1749D1]
  focus:ring-4
  focus:ring-blue-100
`;

export default BatchManagement;
