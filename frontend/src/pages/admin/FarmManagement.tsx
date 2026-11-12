import { useEffect, useState } from "react";
import api from "../../lib/api";

interface CrayfishType {
  id: number;
  name: string;
  description: string | null;
}

interface AreaType {
  id: number;
  name: string;
  description: string | null;
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
  crayfishType?: CrayfishType | null;
}

interface AreaForm {
  name: string;
  area_type_id: string;
  capacity: string;
}

interface TypeForm {
  name: string;
  description: string;
}

function FarmManagement() {
  // =========================================================
  // DATA
  // =========================================================

  const [areas, setAreas] = useState<Area[]>([]);
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);
  const [crayfishTypes, setCrayfishTypes] = useState<CrayfishType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // MODALS
  // =========================================================

  const [addAreaModal, setAddAreaModal] = useState(false);
  const [editAreaModal, setEditAreaModal] = useState(false);

  const [crayfishModal, setCrayfishModal] = useState(false);
  const [editCrayfishModal, setEditCrayfishModal] = useState(false);

  const [areaTypeModal, setAreaTypeModal] = useState(false);
  const [editAreaTypeModal, setEditAreaTypeModal] = useState(false);

  const [showAddMenu, setShowAddMenu] = useState(false);

  // =========================================================
  // EDIT IDS
  // =========================================================

  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [editingCrayfishId, setEditingCrayfishId] = useState<number | null>(
    null,
  );
  const [editingAreaTypeId, setEditingAreaTypeId] = useState<number | null>(
    null,
  );

  // =========================================================
  // FORMS
  // =========================================================

  const emptyAreaForm: AreaForm = {
    name: "",
    area_type_id: "",
    capacity: "",
  };

  const emptyTypeForm: TypeForm = {
    name: "",
    description: "",
  };

  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm);

  const [crayfishForm, setCrayfishForm] = useState<TypeForm>(emptyTypeForm);

  const [areaTypeForm, setAreaTypeForm] = useState<TypeForm>(emptyTypeForm);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/farm-management");

      console.log("Farm Management API:", response.data);

      const data = response.data?.data ?? response.data;

      setAreas(data.areas ?? []);
      setAreaTypes(data.areaTypes ?? []);
      setCrayfishTypes(data.crayfishTypes ?? []);
    } catch (err) {
      console.error("Farm Management API error:", err);
      setError("Unable to load farm management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalAreas = areas.length;

  const occupiedAreas = areas.filter(
    (area) => Number(area.occupied) === 1,
  ).length;

  const availableAreas = areas.filter(
    (area) => Number(area.occupied) === 0,
  ).length;

  const totalCrayfish = areas.reduce(
    (total, area) => total + Number(area.total_crayfish || 0),
    0,
  );

  // =========================================================
  // ADD AREA
  // =========================================================

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/areas", {
        name: areaForm.name,
        area_type_id: Number(areaForm.area_type_id),
        capacity: Number(areaForm.capacity),
      });

      setAddAreaModal(false);
      setAreaForm(emptyAreaForm);

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to add farm area.");
    }
  };

  // =========================================================
  // OPEN EDIT AREA
  // =========================================================

  const openEditArea = (area: Area) => {
    setEditingAreaId(area.id);

    setAreaForm({
      name: area.name,
      area_type_id: String(area.area_type_id),
      capacity: String(area.capacity),
    });

    setEditAreaModal(true);
  };

  // =========================================================
  // UPDATE AREA
  // =========================================================

  const handleUpdateArea = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAreaId) return;

    try {
      await api.put(`/areas/${editingAreaId}`, {
        name: areaForm.name,
        area_type_id: Number(areaForm.area_type_id),
        capacity: Number(areaForm.capacity),
      });

      setEditAreaModal(false);
      setEditingAreaId(null);
      setAreaForm(emptyAreaForm);

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update farm area.");
    }
  };

  // =========================================================
  // DELETE AREA
  // =========================================================

  const deleteArea = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this area?",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/areas/${id}`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete area.");
    }
  };

  // =========================================================
  // ADD CRAYFISH TYPE
  // =========================================================

  const handleAddCrayfish = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/crayfish-types", crayfishForm);

      setCrayfishForm(emptyTypeForm);

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to add crayfish type.");
    }
  };

  // =========================================================
  // OPEN EDIT CRAYFISH
  // =========================================================

  const openEditCrayfish = (type: CrayfishType) => {
    setEditingCrayfishId(type.id);

    setCrayfishForm({
      name: type.name,
      description: type.description ?? "",
    });

    setEditCrayfishModal(true);
  };

  // =========================================================
  // UPDATE CRAYFISH
  // =========================================================

  const handleUpdateCrayfish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCrayfishId) return;

    try {
      await api.put(`/crayfish-types/${editingCrayfishId}`, crayfishForm);

      setEditCrayfishModal(false);
      setEditingCrayfishId(null);
      setCrayfishForm(emptyTypeForm);

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update crayfish type.");
    }
  };

  // =========================================================
  // DELETE CRAYFISH
  // =========================================================

  const deleteCrayfish = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this crayfish type?",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/crayfish-types/${id}`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete crayfish type.");
    }
  };

  // =========================================================
  // ADD AREA TYPE
  // =========================================================

  const handleAddAreaType = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/area-types", areaTypeForm);

      setAreaTypeForm(emptyTypeForm);

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to add area type.");
    }
  };

  // =========================================================
  // OPEN EDIT AREA TYPE
  // =========================================================

  const openEditAreaType = (type: AreaType) => {
    setEditingAreaTypeId(type.id);

    setAreaTypeForm({
      name: type.name,
      description: type.description ?? "",
    });

    setEditAreaTypeModal(true);
  };

  // =========================================================
  // UPDATE AREA TYPE
  // =========================================================

  const handleUpdateAreaType = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAreaTypeId) return;

    try {
      await api.put(`/area-types/${editingAreaTypeId}`, areaTypeForm);

      setEditAreaTypeModal(false);
      setEditingAreaTypeId(null);
      setAreaTypeForm(emptyTypeForm);

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update area type.");
    }
  };

  // =========================================================
  // DELETE AREA TYPE
  // =========================================================

  const deleteAreaType = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this area type?",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/area-types/${id}`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete area type.");
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-500">Loading farm management...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F7F9FC]">
      <div className="mx-auto w-full max-w-[1450px] px-3 pb-8 pt-3 sm:px-5 sm:pb-10 sm:pt-4 lg:px-8 xl:px-10">
        {/* =====================================================
          HEADER
      ===================================================== */}

        <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1749D1] via-[#1557C0] to-[#102D79] px-4 py-4 shadow-sm sm:mb-5 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 sm:h-52 sm:w-52" />
          <div className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-[#F59E0B]/10 sm:h-52 sm:w-52" />

          <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-sm sm:text-[10px]">
                CRAYTECH ADMINISTRATION
              </div>

              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
                Farm Management<span className="text-[#F59E0B]">.</span>
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm sm:leading-6">
                Manage crayfish types, area types and farm areas from one place.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 shadow-sm sm:p-4">
            {error}
          </div>
        )}

        {/* =====================================================
          STATISTICS
      ===================================================== */}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm sm:px-4">
            <span className="text-xs font-semibold text-gray-500">
              Farm Areas
            </span>
            <span className="text-lg font-extrabold text-[#1749D1]">
              {totalAreas}
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm sm:px-4">
            <span className="text-xs font-semibold text-gray-500">
              Crayfish
            </span>
            <span className="text-lg font-extrabold text-[#1749D1]">
              {totalCrayfish.toLocaleString()}
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm sm:px-4">
            <span className="text-xs font-semibold text-gray-500">
              Occupied
            </span>
            <span className="text-lg font-extrabold text-red-600">
              {occupiedAreas}
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm sm:px-4">
            <span className="text-xs font-semibold text-gray-500">
              Available
            </span>
            <span className="text-lg font-extrabold text-green-600">
              {availableAreas}
            </span>
          </div>
        </div>

        {/* =====================================================
          FARM AREAS
      ===================================================== */}

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <h2 className="text-base font-extrabold text-[#122B5C] sm:text-lg">
                Farm Areas
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Manage all tanks, ponds, breeding and hatching areas.
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {areas.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
                <div className="text-5xl">🦞</div>

                <h2 className="mt-4 text-xl font-bold text-gray-400">
                  No Farm Areas
                </h2>

                <p className="mt-2 text-gray-500">
                  Click "Add Area" to create your first area.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {areas.map((area) => (
                  <div
                    key={area.id}
                    className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4"
                  >
                    {/* Card Header */}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold text-[#122B5C] sm:text-lg">
                          {area.name}
                        </h3>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {area.areaType?.name ?? "No area type"}
                        </p>
                      </div>

                      {Number(area.occupied) === 1 ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Occupied
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Available
                        </span>
                      )}
                    </div>

                    {/* Card Details */}

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Capacity</span>

                        <strong className="text-gray-800">
                          {area.capacity}
                        </strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Crayfish</span>

                        <strong className="text-gray-800">
                          {Number(area.total_crayfish).toLocaleString()}
                        </strong>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Crayfish Type</span>

                        <strong className="text-right text-gray-800">
                          {area.crayfishType?.name ?? "None"}
                        </strong>
                      </div>
                    </div>

                    {/* Actions */}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openEditArea(area)}
                        className="rounded-lg bg-[#F59E0B] py-2 text-xs font-bold text-white transition hover:bg-[#D97706]"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteArea(area.id)}
                        className="rounded-lg bg-red-600 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FLOATING ADD MENU */}
        <div className="fixed bottom-6 right-5 z-[70] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
          <div
            className={`flex origin-bottom-right flex-col items-end gap-2 transition-all duration-200 ease-out ${
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
                setAddAreaModal(true);
                setAreaForm(emptyAreaForm);
              }}
              className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-[#17365D] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              + Add Farm Area
            </button>

            <button
              type="button"
              tabIndex={showAddMenu ? 0 : -1}
              onClick={() => {
                setShowAddMenu(false);
                setCrayfishModal(true);
              }}
              className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-[#17365D] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              + Add Crayfish Type
            </button>

            <button
              type="button"
              tabIndex={showAddMenu ? 0 : -1}
              onClick={() => {
                setShowAddMenu(false);
                setAreaTypeModal(true);
              }}
              className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-[#17365D] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              + Add Area Type
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
          ADD AREA MODAL
      ===================================================== */}

        {addAreaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b p-4 sm:p-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#122B5C]">
                    Add Farm Area
                  </h2>

                  <p className="text-sm text-gray-500">
                    Create a new tank, pond or farm area.
                  </p>
                </div>

                <button
                  onClick={() => setAddAreaModal(false)}
                  className="text-2xl text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddArea} className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Area Name
                    </label>

                    <input
                      value={areaForm.name}
                      onChange={(e) =>
                        setAreaForm({
                          ...areaForm,
                          name: e.target.value,
                        })
                      }
                      required
                      placeholder="Tank 01"
                      className="w-full min-h-[44px] min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Area Type
                    </label>

                    <select
                      value={areaForm.area_type_id}
                      onChange={(e) =>
                        setAreaForm({
                          ...areaForm,
                          area_type_id: e.target.value,
                        })
                      }
                      required
                      className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select Area Type</option>

                      {areaTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Capacity
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={areaForm.capacity}
                      onChange={(e) =>
                        setAreaForm({
                          ...areaForm,
                          capacity: e.target.value,
                        })
                      }
                      required
                      className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setAddAreaModal(false)}
                    className="w-full rounded-xl border px-5 py-2.5 text-sm font-semibold sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#1749D1] px-6 py-2.5 text-sm font-bold text-white sm:w-auto hover:bg-[#0D47A1]"
                  >
                    Save Area
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================
          EDIT AREA MODAL
      ===================================================== */}

        {editAreaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="flex justify-between border-b p-4 sm:p-6">
                <h2 className="text-lg font-extrabold text-[#122B5C]">
                  Edit Area
                </h2>

                <button
                  onClick={() => setEditAreaModal(false)}
                  className="text-2xl text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateArea} className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Area Name
                    </label>

                    <input
                      value={areaForm.name}
                      onChange={(e) =>
                        setAreaForm({
                          ...areaForm,
                          name: e.target.value,
                        })
                      }
                      required
                      className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Area Type
                    </label>

                    <select
                      value={areaForm.area_type_id}
                      onChange={(e) =>
                        setAreaForm({
                          ...areaForm,
                          area_type_id: e.target.value,
                        })
                      }
                      className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                    >
                      {areaTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Capacity
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={areaForm.capacity}
                      onChange={(e) =>
                        setAreaForm({
                          ...areaForm,
                          capacity: e.target.value,
                        })
                      }
                      className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setEditAreaModal(false)}
                    className="w-full rounded-xl border px-5 py-2.5 text-sm font-semibold sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#1749D1] px-6 py-2.5 text-sm font-bold text-white sm:w-auto"
                  >
                    Update Area
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================
          CRAYFISH TYPES MODAL
      ===================================================== */}

        {crayfishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="flex justify-between border-b p-4 sm:p-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#122B5C]">
                    Crayfish Types
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manage the crayfish varieties used on your farm.
                  </p>
                </div>

                <button
                  onClick={() => setCrayfishModal(false)}
                  className="text-2xl text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              {/* ADD FORM */}

              <form
                onSubmit={handleAddCrayfish}
                className="grid grid-cols-1 gap-3 border-b bg-gray-50 p-6 md:grid-cols-3"
              >
                <input
                  value={crayfishForm.name}
                  onChange={(e) =>
                    setCrayfishForm({
                      ...crayfishForm,
                      name: e.target.value,
                    })
                  }
                  required
                  placeholder="Crayfish Type"
                  className="min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                />

                <input
                  value={crayfishForm.description}
                  onChange={(e) =>
                    setCrayfishForm({
                      ...crayfishForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  className="min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-[#1749D1] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102D79]"
                >
                  + Add
                </button>
              </form>

              {/* TABLE */}

              <div className="overflow-x-auto p-4 sm:p-6">
                <table className="min-w-[640px] w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="p-3">Name</th>

                      <th className="p-3">Description</th>

                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {crayfishTypes.map((type) => (
                      <tr key={type.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{type.name}</td>

                        <td className="p-3 text-gray-500">
                          {type.description || "—"}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditCrayfish(type)}
                              className="rounded-xl bg-[#F59E0B] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#D97706]"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteCrayfish(type.id)}
                              className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
          EDIT CRAYFISH MODAL
      ===================================================== */}

        {editCrayfishModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
              <div className="flex justify-between border-b p-4 sm:p-6">
                <h2 className="text-lg font-extrabold text-[#122B5C]">
                  Edit Crayfish Type
                </h2>

                <button
                  onClick={() => setEditCrayfishModal(false)}
                  className="text-2xl text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateCrayfish} className="p-4 sm:p-6">
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Name</label>

                  <input
                    value={crayfishForm.name}
                    onChange={(e) =>
                      setCrayfishForm({
                        ...crayfishForm,
                        name: e.target.value,
                      })
                    }
                    required
                    className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    value={crayfishForm.description}
                    onChange={(e) =>
                      setCrayfishForm({
                        ...crayfishForm,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCrayfishModal(false)}
                    className="w-full rounded-xl border px-5 py-2.5 text-sm font-semibold sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#1749D1] px-6 py-2.5 text-sm font-bold text-white sm:w-auto"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================
          AREA TYPES MODAL
      ===================================================== */}

        {areaTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="flex justify-between border-b p-4 sm:p-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#122B5C]">
                    Area Types
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manage your different farm area types.
                  </p>
                </div>

                <button
                  onClick={() => setAreaTypeModal(false)}
                  className="text-2xl text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              {/* ADD AREA TYPE */}

              <form
                onSubmit={handleAddAreaType}
                className="grid grid-cols-1 gap-3 border-b bg-gray-50 p-6 md:grid-cols-3"
              >
                <input
                  value={areaTypeForm.name}
                  onChange={(e) =>
                    setAreaTypeForm({
                      ...areaTypeForm,
                      name: e.target.value,
                    })
                  }
                  required
                  placeholder="Area Type"
                  className="min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                />

                <input
                  value={areaTypeForm.description}
                  onChange={(e) =>
                    setAreaTypeForm({
                      ...areaTypeForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  className="min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700"
                >
                  + Add
                </button>
              </form>

              {/* TABLE */}

              <div className="overflow-x-auto p-4 sm:p-6">
                <table className="min-w-[640px] w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="p-3">Name</th>

                      <th className="p-3">Description</th>

                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {areaTypes.map((type) => (
                      <tr key={type.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{type.name}</td>

                        <td className="p-3 text-gray-500">
                          {type.description || "—"}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditAreaType(type)}
                              className="rounded-xl bg-[#F59E0B] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#D97706]"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteAreaType(type.id)}
                              className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
          EDIT AREA TYPE MODAL
      ===================================================== */}

        {editAreaTypeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
              <div className="flex justify-between border-b p-4 sm:p-6">
                <h2 className="text-lg font-extrabold text-[#122B5C]">
                  Edit Area Type
                </h2>

                <button
                  onClick={() => setEditAreaTypeModal(false)}
                  className="text-2xl text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateAreaType} className="p-4 sm:p-6">
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Name</label>

                  <input
                    value={areaTypeForm.name}
                    onChange={(e) =>
                      setAreaTypeForm({
                        ...areaTypeForm,
                        name: e.target.value,
                      })
                    }
                    required
                    className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    value={areaTypeForm.description}
                    onChange={(e) =>
                      setAreaTypeForm({
                        ...areaTypeForm,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full min-h-[40px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#1749D1] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditAreaTypeModal(false)}
                    className="w-full rounded-xl border px-5 py-2.5 text-sm font-semibold sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#F59E0B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#D97706] sm:w-auto"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FarmManagement;
