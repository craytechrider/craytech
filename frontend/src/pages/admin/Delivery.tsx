import React, { useEffect, useState } from "react";
import {
  Truck,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  Users,
  User,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  Pencil,
  Power,
  ShieldCheck,
  Settings as SettingsIcon,
} from "lucide-react";

import api from "../../lib/api";

// ============================================================
// COLORS
// ============================================================

const BLUE = "#1749D1";
const BLUE_DARK = "#102D79";
const NAVY = "#122B5C";
const ORANGE = "#F59E0B";

const ALL = "ALL";

// ============================================================
// TYPES
// ============================================================

interface DeliveryArea {
  id: number;
  country: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface LocationOption {
  code: string;
  name: string;
  type?: string;
  region?: string;
  province?: string;
}

interface DeliveryPersonnel {
  id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  business_name?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string;
}

type DeliveryTab = "settings" | "areas" | "personnel";

// ============================================================
// COMPONENT
// ============================================================

const Delivery: React.FC = () => {
  // ============================================================
  // ACTIVE TAB
  // ============================================================

  const [activeTab, setActiveTab] = useState<DeliveryTab>("settings");
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ============================================================
  // DELIVERY SETTINGS
  // ============================================================

  const [deliveryEnabled, setDeliveryEnabled] = useState(true);

  const [loadingDelivery, setLoadingDelivery] = useState(true);

  const [savingDelivery, setSavingDelivery] = useState(false);

  // ============================================================
  // DELIVERY AREAS
  // ============================================================

  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);

  const [loadingDeliveryAreas, setLoadingDeliveryAreas] = useState(true);

  const [savingDeliveryArea, setSavingDeliveryArea] = useState(false);

  const [deletingDeliveryArea, setDeletingDeliveryArea] = useState<
    number | null
  >(null);

  // ============================================================
  // SELECTED LOCATION
  // ============================================================

  const [selectedCountry] = useState("Philippines");

  const [selectedRegion, setSelectedRegion] = useState("");

  const [selectedProvince, setSelectedProvince] = useState("");

  const [selectedMunicipality, setSelectedMunicipality] = useState("");

  const [selectedBarangay, setSelectedBarangay] = useState("");

  // ============================================================
  // LOCATION DATA
  // ============================================================

  const [regions, setRegions] = useState<LocationOption[]>([]);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);

  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);

  const [barangays, setBarangays] = useState<LocationOption[]>([]);

  // ============================================================
  // LOCATION LOADING
  // ============================================================

  const [loadingRegions, setLoadingRegions] = useState(false);

  const [loadingProvinces, setLoadingProvinces] = useState(false);

  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // ============================================================
  // DELIVERY PERSONNEL
  // ============================================================

  const [deliveryPersonnel, setDeliveryPersonnel] = useState<
    DeliveryPersonnel[]
  >([]);

  const [loadingPersonnel, setLoadingPersonnel] = useState(false);

  const [savingPersonnel, setSavingPersonnel] = useState(false);

  const [deletingPersonnel, setDeletingPersonnel] = useState<number | null>(
    null,
  );

  const [togglingPersonnel, setTogglingPersonnel] = useState<number | null>(
    null,
  );

  // ============================================================
  // PERSONNEL FORM
  // ============================================================

  const [showPersonnelForm, setShowPersonnelForm] = useState(false);

  const [editingPersonnelId, setEditingPersonnelId] = useState<number | null>(
    null,
  );

  const [personnelName, setPersonnelName] = useState("");

  const [personnelEmail, setPersonnelEmail] = useState("");

  const [personnelMobile, setPersonnelMobile] = useState("");

  const [personnelPassword, setPersonnelPassword] = useState("");

  const [personnelPasswordConfirmation, setPersonnelPasswordConfirmation] =
    useState("");

  const [personnelActive, setPersonnelActive] = useState(true);

  const [showPersonnelPassword, setShowPersonnelPassword] = useState(false);

  const [
    showPersonnelPasswordConfirmation,
    setShowPersonnelPasswordConfirmation,
  ] = useState(false);

  // ============================================================
  // MESSAGES
  // ============================================================

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDeliverySettings();
    loadDeliveryAreas();
    loadRegions();
    loadDeliveryPersonnel();
  }, []);

  // ============================================================
  // LOAD DELIVERY SETTINGS
  // ============================================================

  const loadDeliverySettings = async () => {
    try {
      setLoadingDelivery(true);

      const response = await api.get("/system-settings");

      const enabled = response.data?.data?.delivery_enabled;

      setDeliveryEnabled(enabled === undefined ? true : Boolean(enabled));
    } catch (err: any) {
      console.error("Failed to load delivery settings:", err);

      setError(
        err?.response?.data?.message || "Unable to load delivery settings.",
      );
    } finally {
      setLoadingDelivery(false);
    }
  };

  // ============================================================
  // LOAD DELIVERY AREAS
  // ============================================================

  const loadDeliveryAreas = async () => {
    try {
      setLoadingDeliveryAreas(true);

      const response = await api.get("/delivery-areas");

      if (response.data?.success) {
        setDeliveryAreas(response.data.data || []);
      } else {
        setDeliveryAreas([]);
      }
    } catch (err: any) {
      console.error("Failed to load delivery areas:", err);

      setError(
        err?.response?.data?.message || "Unable to load delivery areas.",
      );
    } finally {
      setLoadingDeliveryAreas(false);
    }
  };

  // ============================================================
  // LOAD DELIVERY PERSONNEL
  // ============================================================

  const loadDeliveryPersonnel = async () => {
    try {
      setLoadingPersonnel(true);

      const response = await api.get("/delivery-personnel");

      if (response.data?.success) {
        setDeliveryPersonnel(response.data.data || []);
      } else {
        setDeliveryPersonnel([]);
      }
    } catch (err: any) {
      console.error("Failed to load delivery personnel:", err);

      setError(
        err?.response?.data?.message || "Unable to load delivery personnel.",
      );
    } finally {
      setLoadingPersonnel(false);
    }
  };

  // ============================================================
  // NORMALIZE LOCATION RESPONSE
  // ============================================================

  const normalizeLocationResponse = (response: any): LocationOption[] => {
    const data = response?.data?.data ?? response?.data ?? [];

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item: any) => ({
        code: String(item?.code ?? item?.id ?? item?.name ?? ""),
        name: String(item?.name ?? item?.label ?? ""),
        type: item?.type ? String(item.type) : undefined,
        region: item?.region ? String(item.region) : undefined,
        province: item?.province ? String(item.province) : undefined,
      }))
      .filter((item: LocationOption) => item.code && item.name);
  };

  // ============================================================
  // LOAD REGIONS
  // ============================================================

  const loadRegions = async () => {
    try {
      setLoadingRegions(true);

      const response = await api.get("/locations/regions");

      setRegions(normalizeLocationResponse(response));
    } catch (err: any) {
      console.error("Failed to load regions:", err);

      setError(
        err?.response?.data?.message || "Unable to load Philippine regions.",
      );

      setRegions([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  // ============================================================
  // LOAD PROVINCES
  // ============================================================

  const loadProvinces = async (region: string) => {
    if (!region || region === ALL) {
      setProvinces([]);
      return;
    }

    try {
      setLoadingProvinces(true);

      const response = await api.get(
        `/locations/${encodeURIComponent(region)}/provinces`,
      );

      setProvinces(normalizeLocationResponse(response));
    } catch (err: any) {
      console.error("Failed to load provinces:", err);

      setError(err?.response?.data?.message || "Unable to load provinces.");

      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  };

  // ============================================================
  // LOAD MUNICIPALITIES
  // ============================================================

  const loadMunicipalities = async (region: string, province: string) => {
    if (!region || !province || region === ALL || province === ALL) {
      setMunicipalities([]);
      return;
    }

    try {
      setLoadingMunicipalities(true);

      const response = await api.get(
        `/locations/${encodeURIComponent(
          region,
        )}/provinces/${encodeURIComponent(province)}/municipalities`,
      );

      setMunicipalities(normalizeLocationResponse(response));
    } catch (err: any) {
      console.error("Failed to load municipalities:", err);

      setError(
        err?.response?.data?.message || "Unable to load municipalities.",
      );

      setMunicipalities([]);
    } finally {
      setLoadingMunicipalities(false);
    }
  };

  // ============================================================
  // LOAD BARANGAYS
  // ============================================================

  const loadBarangays = async (
    region: string,
    province: string,
    municipality: string,
  ) => {
    if (
      !region ||
      !province ||
      !municipality ||
      region === ALL ||
      province === ALL ||
      municipality === ALL
    ) {
      setBarangays([]);
      return;
    }

    try {
      setLoadingBarangays(true);

      const response = await api.get(
        `/locations/${encodeURIComponent(
          region,
        )}/provinces/${encodeURIComponent(
          province,
        )}/municipalities/${encodeURIComponent(municipality)}/barangays`,
      );

      setBarangays(normalizeLocationResponse(response));
    } catch (err: any) {
      console.error("Failed to load barangays:", err);

      setError(err?.response?.data?.message || "Unable to load barangays.");

      setBarangays([]);
    } finally {
      setLoadingBarangays(false);
    }
  };

  // ============================================================
  // DELIVERY TOGGLE
  // ============================================================

  const handleDeliveryToggle = async () => {
    if (savingDelivery || loadingDelivery) {
      return;
    }

    const newValue = !deliveryEnabled;

    setSavingDelivery(true);
    setMessage("");
    setError("");

    try {
      await api.put("/system-settings/delivery", {
        delivery_enabled: newValue,
      });

      setDeliveryEnabled(newValue);

      setMessage(
        newValue
          ? "Delivery has been enabled successfully."
          : "Delivery has been disabled successfully.",
      );
    } catch (err: any) {
      console.error("Delivery setting error:", err);

      setError(
        err?.response?.data?.message || "Failed to update delivery setting.",
      );
    } finally {
      setSavingDelivery(false);
    }
  };

  // ============================================================
  // REGION CHANGE
  // ============================================================

  const handleRegionChange = async (value: string) => {
    setSelectedRegion(value);

    setSelectedProvince("");
    setSelectedMunicipality("");
    setSelectedBarangay("");

    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);

    clearMessages();

    if (!value) {
      return;
    }

    if (value === ALL) {
      setSelectedProvince(ALL);
      setSelectedMunicipality(ALL);
      setSelectedBarangay(ALL);
      return;
    }

    await loadProvinces(value);
  };

  // ============================================================
  // PROVINCE CHANGE
  // ============================================================

  const handleProvinceChange = async (value: string) => {
    setSelectedProvince(value);

    setSelectedMunicipality("");
    setSelectedBarangay("");

    setMunicipalities([]);
    setBarangays([]);

    clearMessages();

    if (!value) {
      return;
    }

    if (value === ALL) {
      setSelectedMunicipality(ALL);
      setSelectedBarangay(ALL);
      return;
    }

    await loadMunicipalities(selectedRegion, value);
  };

  // ============================================================
  // MUNICIPALITY CHANGE
  // ============================================================

  const handleMunicipalityChange = async (value: string) => {
    setSelectedMunicipality(value);

    setSelectedBarangay("");

    setBarangays([]);

    clearMessages();

    if (!value) {
      return;
    }

    if (value === ALL) {
      setSelectedBarangay(ALL);
      return;
    }

    await loadBarangays(selectedRegion, selectedProvince, value);
  };

  // ============================================================
  // BARANGAY CHANGE
  // ============================================================

  const handleBarangayChange = (value: string) => {
    setSelectedBarangay(value);
    clearMessages();
  };

  // ============================================================
  // ADD DELIVERY AREA
  // ============================================================

  const handleAddDeliveryArea = async () => {
    if (savingDeliveryArea) {
      return;
    }

    clearMessages();

    if (!selectedCountry) {
      setError("Please select a country.");
      return;
    }

    if (!selectedRegion) {
      setError("Please select a region.");
      return;
    }

    if (!selectedProvince) {
      setError("Please select a province.");
      return;
    }

    if (!selectedMunicipality) {
      setError("Please select a municipality or city.");
      return;
    }

    if (!selectedBarangay) {
      setError("Please select a barangay.");
      return;
    }

    setSavingDeliveryArea(true);

    try {
      const response = await api.post("/delivery-areas", {
        country: selectedCountry,
        region: selectedRegion,
        province: selectedProvince,
        municipality: selectedMunicipality,
        barangay: selectedBarangay,
        is_active: true,
      });

      if (response.data?.success) {
        setMessage("Delivery area added successfully.");
        setShowAreaForm(false);

        setSelectedRegion("");
        setSelectedProvince("");
        setSelectedMunicipality("");
        setSelectedBarangay("");

        setProvinces([]);
        setMunicipalities([]);
        setBarangays([]);

        await loadDeliveryAreas();
      }
    } catch (err: any) {
      console.error("Add delivery area error:", err);

      setError(err?.response?.data?.message || "Failed to add delivery area.");
    } finally {
      setSavingDeliveryArea(false);
    }
  };

  // ============================================================
  // DELETE DELIVERY AREA
  // ============================================================

  const handleDeleteDeliveryArea = async (id: number) => {
    if (deletingDeliveryArea !== null) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this delivery area?",
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setDeletingDeliveryArea(id);

    try {
      const response = await api.delete(`/delivery-areas/${id}`);

      if (response.data?.success) {
        setMessage("Delivery area removed successfully.");

        await loadDeliveryAreas();
      }
    } catch (err: any) {
      console.error("Delete delivery area error:", err);

      setError(
        err?.response?.data?.message || "Failed to remove delivery area.",
      );
    } finally {
      setDeletingDeliveryArea(null);
    }
  };

  // ============================================================
  // RESET PERSONNEL FORM
  // ============================================================

  const resetPersonnelForm = () => {
    setEditingPersonnelId(null);

    setPersonnelName("");
    setPersonnelEmail("");
    setPersonnelMobile("");

    setPersonnelPassword("");
    setPersonnelPasswordConfirmation("");

    setPersonnelActive(true);

    setShowPersonnelPassword(false);
    setShowPersonnelPasswordConfirmation(false);
  };

  // ============================================================
  // OPEN ADD PERSONNEL FORM
  // ============================================================

  const openAddPersonnelForm = () => {
    resetPersonnelForm();

    setShowPersonnelForm(true);

    clearMessages();
  };

  // ============================================================
  // OPEN EDIT PERSONNEL FORM
  // ============================================================

  const openEditPersonnelForm = (person: DeliveryPersonnel) => {
    setEditingPersonnelId(person.id);

    setPersonnelName(person.name || "");

    setPersonnelEmail(person.email || "");

    setPersonnelMobile(person.mobile_number || "");

    setPersonnelPassword("");
    setPersonnelPasswordConfirmation("");

    setPersonnelActive(Boolean(person.is_active));

    setShowPersonnelPassword(false);
    setShowPersonnelPasswordConfirmation(false);

    setShowPersonnelForm(true);

    clearMessages();
  };

  // ============================================================
  // CLOSE PERSONNEL FORM
  // ============================================================

  const closePersonnelForm = () => {
    if (savingPersonnel) {
      return;
    }

    setShowPersonnelForm(false);

    resetPersonnelForm();
  };

  // ============================================================
  // SAVE PERSONNEL
  // ============================================================

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (savingPersonnel) {
      return;
    }

    clearMessages();

    if (!personnelName.trim()) {
      setError("Please enter the delivery personnel's name.");
      return;
    }

    if (!personnelEmail.trim()) {
      setError("Please enter an email address.");
      return;
    }

    if (editingPersonnelId === null && !personnelPassword) {
      setError("Please enter a password.");
      return;
    }

    if (personnelPassword && personnelPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (personnelPassword !== personnelPasswordConfirmation) {
      setError("Password and confirmation password do not match.");
      return;
    }

    setSavingPersonnel(true);

    try {
      if (editingPersonnelId === null) {
        const response = await api.post("/delivery-personnel", {
          name: personnelName.trim(),
          email: personnelEmail.trim(),
          mobile_number: personnelMobile.trim() || null,
          password: personnelPassword,
          password_confirmation: personnelPasswordConfirmation,
        });

        if (response.data?.success) {
          setMessage("Delivery personnel account created successfully.");

          setShowPersonnelForm(false);

          resetPersonnelForm();

          await loadDeliveryPersonnel();
        }
      } else {
        const payload: Record<string, any> = {
          name: personnelName.trim(),
          email: personnelEmail.trim(),
          mobile_number: personnelMobile.trim() || null,
          is_active: personnelActive,
        };

        if (personnelPassword) {
          payload.password = personnelPassword;

          payload.password_confirmation = personnelPasswordConfirmation;
        }

        const response = await api.put(
          `/delivery-personnel/${editingPersonnelId}`,
          payload,
        );

        if (response.data?.success) {
          setMessage("Delivery personnel updated successfully.");

          setShowPersonnelForm(false);

          resetPersonnelForm();

          await loadDeliveryPersonnel();
        }
      }
    } catch (err: any) {
      console.error("Save delivery personnel error:", err);

      const validationErrors = err?.response?.data?.errors;

      if (validationErrors) {
        const firstError = Object.values(validationErrors)?.[0];

        if (Array.isArray(firstError) && firstError.length > 0) {
          setError(String(firstError[0]));
        } else {
          setError("Please check the information you entered.");
        }
      } else {
        setError(
          err?.response?.data?.message || "Failed to save delivery personnel.",
        );
      }
    } finally {
      setSavingPersonnel(false);
    }
  };

  // ============================================================
  // TOGGLE PERSONNEL STATUS
  // ============================================================

  const handleTogglePersonnel = async (person: DeliveryPersonnel) => {
    if (togglingPersonnel !== null) {
      return;
    }

    clearMessages();

    setTogglingPersonnel(person.id);

    try {
      const response = await api.put(
        `/delivery-personnel/${person.id}/toggle-status`,
      );

      if (response.data?.success) {
        setMessage(
          person.is_active
            ? "Delivery account disabled successfully."
            : "Delivery account activated successfully.",
        );

        await loadDeliveryPersonnel();
      }
    } catch (err: any) {
      console.error("Toggle delivery personnel error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update delivery account status.",
      );
    } finally {
      setTogglingPersonnel(null);
    }
  };

  // ============================================================
  // DELETE PERSONNEL
  // ============================================================

  const handleDeletePersonnel = async (person: DeliveryPersonnel) => {
    if (deletingPersonnel !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the delivery account for ${person.name}?`,
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setDeletingPersonnel(person.id);

    try {
      const response = await api.delete(`/delivery-personnel/${person.id}`);

      if (response.data?.success) {
        setMessage("Delivery personnel account deleted successfully.");

        await loadDeliveryPersonnel();
      }
    } catch (err: any) {
      console.error("Delete delivery personnel error:", err);

      setError(
        err?.response?.data?.message || "Failed to delete delivery personnel.",
      );
    } finally {
      setDeletingPersonnel(null);
    }
  };

  // ============================================================
  // CLEAR MESSAGES
  // ============================================================

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // ============================================================
  // LOCATION STATUS
  // ============================================================

  const isAllRegion = selectedRegion === ALL;

  const isAllProvince = selectedProvince === ALL;

  const isAllMunicipality = selectedMunicipality === ALL;

  const isAllBarangay = selectedBarangay === ALL;

  // ============================================================
  // INPUT CLASSES
  // ============================================================

  const inputClass = `
    w-full
    min-h-[40px]
    rounded-lg
    border
    border-gray-200
    bg-white
    px-3
    py-2.5
    text-sm
    font-medium
    text-gray-800
    outline-none
    transition
    placeholder:text-gray-400
    focus:border-[#1749D1]
    focus:bg-white
    focus:ring-4
    focus:ring-blue-100
  `;

  const selectClass = `
    w-full
    min-h-[40px]
    rounded-lg
    border
    border-gray-200
    bg-white
    px-3
    py-2.5
    text-sm
    font-medium
    text-gray-800
    outline-none
    transition
    focus:border-[#1749D1]
    focus:ring-4
    focus:ring-blue-100
    disabled:cursor-not-allowed
    disabled:bg-gray-100
    disabled:text-gray-400
  `;

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F7F9FC]">
      <div
        className="
          mx-auto
          w-full
          max-w-[1600px]
          px-3
          pb-6
          pt-3
          sm:px-5
          sm:pb-10
          sm:pt-5
          md:px-6
          lg:px-8
          xl:px-10
          2xl:px-12
        "
      >
        {/* ======================================================
            HERO
        ====================================================== */}

        <section
          className="
            relative
            mb-4
            overflow-hidden
            rounded-2xl
            bg-gradient-to-br
            from-[#1749D1]
            via-[#1557C0]
            to-[#102D79]
            px-4
            py-4
            shadow-lg
            sm:mb-6
            sm:px-6
            sm:py-7
            lg:px-8
            lg:py-8
          "
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 sm:h-64 sm:w-64" />

          <div className="pointer-events-none absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-orange-400/10 sm:h-64 sm:w-64" />

          <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-32 rounded-full bg-white/[0.03]" />

          <div className="relative z-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-sm sm:text-[10px]">
                  <Truck size={12} />
                  Administrator
                </div>

                <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
                  Delivery
                  <span className="text-orange-400">.</span>
                </h1>

                <p className="mt-2 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm sm:leading-6 lg:text-base">
                  Manage delivery availability, delivery areas, and delivery
                  personnel for your CRAYTECH farm.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* COMPACT SUMMARY CARDS - OUTSIDE THE HERO */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-5 sm:gap-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm sm:px-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px]">
                Delivery Areas
              </p>
              <p className="mt-1 text-xl font-extrabold text-[#17365D]">
                {deliveryAreas.length}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1749D1]">
              <MapPin size={17} />
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm sm:px-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px]">
                Delivery Personnel
              </p>
              <p className="mt-1 text-xl font-extrabold text-[#17365D]">
                {deliveryPersonnel.length}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
              <Users size={17} />
            </span>
          </div>
        </div>

        {/* ======================================================
            ALERTS
        ====================================================== */}

        {message && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-3.5 shadow-sm sm:mb-5 sm:p-4">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <div className="min-w-0">
              <p className="text-sm font-bold text-green-700">Success</p>

              <p className="mt-1 break-words text-xs leading-5 text-green-600">
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={clearMessages}
              className="ml-auto shrink-0 text-xs font-bold text-green-600 transition hover:text-green-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 shadow-sm sm:mb-5 sm:p-4">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />

            <div className="min-w-0">
              <p className="text-sm font-bold text-red-700">
                Something went wrong
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-red-600">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={clearMessages}
              className="ml-auto shrink-0 text-xs font-bold text-red-600 transition hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ======================================================
            MAIN CARD
        ====================================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {/* ====================================================
              TABS
          ==================================================== */}

          <div className="border-b border-gray-100">
            <div className="grid grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("settings");
                  setShowAddMenu(false);
                  clearMessages();
                }}
                className={`
                  flex
                  min-w-0
                  items-center
                  justify-center
                  gap-2
                  border-b-2
                  px-3
                  py-4
                  text-xs
                  font-bold
                  transition
                  sm:px-5
                  sm:py-5
                  sm:text-sm
                  ${
                    activeTab === "settings"
                      ? "border-[#1749D1] bg-blue-50/60 text-[#1749D1]"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#1749D1]"
                  }
                `}
              >
                <SettingsIcon size={17} className="shrink-0" />

                <span className="truncate">Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("areas");
                  setShowAddMenu(false);
                  clearMessages();
                }}
                className={`
                  flex min-w-0 items-center justify-center gap-2 border-b-2 px-2 py-3 text-[11px] font-bold transition sm:px-4 sm:py-4 sm:text-sm
                  ${
                    activeTab === "areas"
                      ? "border-[#1749D1] bg-blue-50/60 text-[#1749D1]"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#1749D1]"
                  }
                `}
              >
                <MapPin size={16} className="shrink-0" />
                <span>Areas</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
                  {deliveryAreas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("personnel");
                  setShowAddMenu(false);
                  clearMessages();
                }}
                className={`
                  flex
                  min-w-0
                  items-center
                  justify-center
                  gap-2
                  border-b-2
                  px-3
                  py-4
                  text-xs
                  font-bold
                  transition
                  sm:px-5
                  sm:py-5
                  sm:text-sm
                  ${
                    activeTab === "personnel"
                      ? "border-[#1749D1] bg-blue-50/60 text-[#1749D1]"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#1749D1]"
                  }
                `}
              >
                <Users size={17} className="shrink-0" />

                <span className="truncate">Personnel</span>

                <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 sm:inline-flex">
                  {deliveryPersonnel.length}
                </span>
              </button>
            </div>
          </div>

          {/* ====================================================
              DELIVERY SETTINGS
          ==================================================== */}

          {activeTab === "settings" && (
            <div className="p-3.5 sm:p-6 lg:p-8 xl:p-10">
              {/* HEADER */}

              <div className="mb-5 flex items-center gap-3 sm:mb-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 sm:h-11 sm:w-11">
                  <Truck size={20} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#122B5C] sm:text-lg">
                    Delivery Settings
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                    Control delivery availability and choose where your farm
                    delivers orders.
                  </p>
                </div>
              </div>

              {/* DELIVERY TOGGLE */}

              <div className="rounded-2xl border border-gray-100 bg-[#FAFBFD] p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div
                      className={`
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        sm:h-14
                        sm:w-14
                        ${
                          deliveryEnabled
                            ? "bg-blue-50 text-[#1749D1]"
                            : "bg-gray-200 text-gray-500"
                        }
                      `}
                    >
                      {deliveryEnabled ? (
                        <Truck size={22} />
                      ) : (
                        <MapPin size={22} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-gray-800 sm:text-base">
                          Customer Delivery
                        </h3>

                        <span
                          className={`
                            rounded-full
                            px-2.5
                            py-1
                            text-[9px]
                            font-bold
                            uppercase
                            tracking-wide
                            ${
                              deliveryEnabled
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }
                          `}
                        >
                          {deliveryEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>

                      <p className="mt-1.5 max-w-xl text-xs leading-5 text-gray-500 sm:mt-2 sm:text-sm sm:leading-6">
                        {deliveryEnabled
                          ? "Customers can choose between Delivery and Pickup during checkout."
                          : "Delivery is currently unavailable. Customers can only choose Pickup."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDeliveryToggle}
                    disabled={savingDelivery || loadingDelivery}
                    className="flex w-full shrink-0 items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none"
                  >
                    <span
                      className={`text-sm font-extrabold ${
                        deliveryEnabled ? "text-[#1749D1]" : "text-gray-500"
                      }`}
                    >
                      {savingDelivery
                        ? "Saving..."
                        : deliveryEnabled
                          ? "ON"
                          : "OFF"}
                    </span>

                    <div
                      className={`
                        relative
                        h-8
                        w-16
                        shrink-0
                        rounded-full
                        p-1
                        transition-colors
                        duration-200
                        ${deliveryEnabled ? "bg-[#1749D1]" : "bg-gray-300"}
                      `}
                    >
                      <div
                        className={`
                          h-6
                          w-6
                          rounded-full
                          bg-white
                          shadow-md
                          transition-transform
                          duration-200
                          ${deliveryEnabled ? "translate-x-8" : "translate-x-0"}
                        `}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* INFORMATION */}

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:mt-5">
                <Truck size={18} className="mt-0.5 shrink-0 text-orange-500" />

                <div className="min-w-0">
                  <p className="text-sm font-bold text-orange-700">
                    Delivery Information
                  </p>

                  <p className="mt-1 text-xs leading-5 text-orange-600">
                    {deliveryEnabled
                      ? "Customers will only be allowed to select delivery locations covered by the areas configured above. Using ALL lets you cover an entire region, province, municipality/city, or all barangays without adding each location individually."
                      : "Delivery is disabled. Customers can only choose Pickup during checkout."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              DELIVERY AREAS
          ==================================================== */}

          {activeTab === "areas" && (
            <div className="p-3 sm:p-5 lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#122B5C] sm:text-lg">
                    Delivery Areas
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Manage the locations where customers can receive deliveries.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1749D1]">
                  {deliveryAreas.length}{" "}
                  {deliveryAreas.length === 1 ? "Area" : "Areas"}
                </span>
              </div>
              {deliveryEnabled ? (
                <>
                  {/* ==================================================
                      DELIVERY AREAS
                  ================================================== */}
                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:mt-6">
                    {/* HEADER */}

                    <div className="border-b border-gray-100 p-4 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1749D1] sm:h-10 sm:w-10">
                              <MapPin size={18} />
                            </div>

                            <h3 className="text-sm font-extrabold text-[#122B5C] sm:text-base">
                              Delivery Areas
                            </h3>
                          </div>

                          <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                            Configure the Philippine locations where your farm
                            accepts customer deliveries.
                          </p>
                        </div>

                        <div className="self-start rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1749D1]">
                          {deliveryAreas.length}{" "}
                          {deliveryAreas.length === 1 ? "Area" : "Areas"}
                        </div>
                      </div>
                    </div>

                    {/* ADD AREA */}

                    {showAreaForm && (
                      <div className="border-b border-gray-100 bg-[#FAFBFD] p-3 sm:p-4">
                        <div className="mb-5">
                          <h4 className="text-sm font-extrabold text-gray-800">
                            Add Delivery Area
                          </h4>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Choose a specific location or use ALL to cover an
                            entire level.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* COUNTRY */}

                          <div>
                            <label className="mb-2 block text-xs font-bold text-gray-600">
                              Country
                            </label>

                            <select
                              value={selectedCountry}
                              disabled
                              className={selectClass}
                            >
                              <option value="Philippines">Philippines</option>
                            </select>

                            <p className="mt-1 text-[11px] text-gray-400">
                              Country is fixed to Philippines.
                            </p>
                          </div>

                          {/* REGION */}

                          <div>
                            <label className="mb-2 block text-xs font-bold text-gray-600">
                              Region
                            </label>

                            <select
                              value={selectedRegion}
                              onChange={(e) =>
                                handleRegionChange(e.target.value)
                              }
                              disabled={loadingRegions}
                              className={selectClass}
                            >
                              <option value="">
                                {loadingRegions
                                  ? "Loading regions..."
                                  : "Select Region"}
                              </option>

                              {regions.map((region) => (
                                <option key={region.code} value={region.name}>
                                  {region.name}
                                </option>
                              ))}

                              <option value={ALL}>ALL REGIONS</option>
                            </select>
                          </div>

                          {/* PROVINCE */}

                          <div>
                            <label className="mb-2 block text-xs font-bold text-gray-600">
                              Province
                            </label>

                            <select
                              value={selectedProvince}
                              onChange={(e) =>
                                handleProvinceChange(e.target.value)
                              }
                              disabled={
                                !selectedRegion ||
                                isAllRegion ||
                                loadingProvinces
                              }
                              className={selectClass}
                            >
                              {isAllRegion ? (
                                <option value={ALL}>N/A</option>
                              ) : (
                                <>
                                  <option value="">
                                    {loadingProvinces
                                      ? "Loading provinces..."
                                      : "Select Province"}
                                  </option>

                                  {provinces.map((province) => (
                                    <option
                                      key={province.code}
                                      value={province.name}
                                    >
                                      {province.name}
                                    </option>
                                  ))}

                                  {selectedRegion && (
                                    <option value={ALL}>ALL PROVINCES</option>
                                  )}
                                </>
                              )}
                            </select>
                          </div>

                          {/* MUNICIPALITY */}

                          <div>
                            <label className="mb-2 block text-xs font-bold text-gray-600">
                              Municipality / City
                            </label>

                            <select
                              value={selectedMunicipality}
                              onChange={(e) =>
                                handleMunicipalityChange(e.target.value)
                              }
                              disabled={
                                !selectedProvince ||
                                isAllRegion ||
                                isAllProvince ||
                                loadingMunicipalities
                              }
                              className={selectClass}
                            >
                              {isAllRegion || isAllProvince ? (
                                <option value={ALL}>N/A</option>
                              ) : (
                                <>
                                  <option value="">
                                    {loadingMunicipalities
                                      ? "Loading municipalities..."
                                      : "Select Municipality / City"}
                                  </option>

                                  {municipalities.map((municipality) => (
                                    <option
                                      key={municipality.code}
                                      value={municipality.name}
                                    >
                                      {municipality.name}
                                      {municipality.type
                                        ? ` (${municipality.type})`
                                        : ""}
                                    </option>
                                  ))}

                                  {selectedProvince && (
                                    <option value={ALL}>
                                      ALL MUNICIPALITIES / CITIES
                                    </option>
                                  )}
                                </>
                              )}
                            </select>
                          </div>

                          {/* BARANGAY */}

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-bold text-gray-600">
                              Barangay
                            </label>

                            <select
                              value={selectedBarangay}
                              onChange={(e) =>
                                handleBarangayChange(e.target.value)
                              }
                              disabled={
                                !selectedMunicipality ||
                                isAllRegion ||
                                isAllProvince ||
                                isAllMunicipality ||
                                loadingBarangays
                              }
                              className={selectClass}
                            >
                              {isAllRegion ||
                              isAllProvince ||
                              isAllMunicipality ? (
                                <option value={ALL}>N/A</option>
                              ) : (
                                <>
                                  <option value="">
                                    {loadingBarangays
                                      ? "Loading barangays..."
                                      : "Select Barangay"}
                                  </option>

                                  {barangays.map((barangay) => (
                                    <option
                                      key={barangay.code}
                                      value={barangay.name}
                                    >
                                      {barangay.name}
                                    </option>
                                  ))}

                                  {selectedMunicipality && (
                                    <option value={ALL}>ALL BARANGAYS</option>
                                  )}
                                </>
                              )}
                            </select>
                          </div>
                        </div>

                        {/* BROAD AREA INFORMATION */}

                        {(isAllRegion ||
                          isAllProvince ||
                          isAllMunicipality ||
                          isAllBarangay) && (
                          <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
                            <div className="flex items-start gap-3">
                              <MapPin
                                size={19}
                                className="mt-0.5 shrink-0 text-orange-500"
                              />

                              <div className="min-w-0">
                                <p className="text-sm font-bold text-orange-700">
                                  Broad Delivery Area
                                </p>

                                <p className="mt-1 text-xs leading-5 text-orange-600">
                                  {isAllRegion
                                    ? "You are allowing delivery throughout the entire Philippines."
                                    : isAllProvince
                                      ? `You are allowing delivery throughout ${selectedRegion}.`
                                      : isAllMunicipality
                                        ? `You are allowing delivery throughout ${selectedProvince}.`
                                        : "You are allowing delivery to all barangays in the selected municipality/city."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PREVIEW */}

                        {selectedRegion && (
                          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex items-start gap-3">
                              <MapPin
                                size={19}
                                className="mt-0.5 shrink-0 text-[#1749D1]"
                              />

                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-[#1749D1]">
                                  Delivery Location
                                </p>

                                <p className="mt-1 break-words text-sm font-extrabold leading-5 text-[#122B5C]">
                                  {selectedBarangay === ALL
                                    ? "All Barangays"
                                    : selectedBarangay || "All Barangays"}
                                  ,{" "}
                                  {selectedMunicipality === ALL
                                    ? "All Municipalities / Cities"
                                    : selectedMunicipality ||
                                      "All Municipalities / Cities"}
                                  ,{" "}
                                  {selectedProvince === ALL
                                    ? "All Provinces"
                                    : selectedProvince || "All Provinces"}
                                  ,{" "}
                                  {selectedRegion === ALL
                                    ? "All Regions"
                                    : selectedRegion}
                                  , {selectedCountry}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ADD BUTTON */}

                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAreaForm(false)}
                            className="flex min-h-[42px] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddDeliveryArea}
                            disabled={
                              savingDeliveryArea ||
                              !selectedRegion ||
                              !selectedProvince ||
                              !selectedMunicipality ||
                              !selectedBarangay
                            }
                            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#1749D1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#102D79] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[190px] sm:justify-center"
                          >
                            {savingDeliveryArea ? (
                              <>
                                <Loader2 size={17} className="animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus size={17} />
                                Add Delivery Area
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* EXISTING AREAS */}

                    <div className="p-3 sm:p-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-extrabold text-gray-800">
                          Allowed Delivery Areas
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Customers will only be able to select locations
                          covered by these delivery rules.
                        </p>
                      </div>

                      {loadingDeliveryAreas ? (
                        <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-gray-100 bg-[#FAFBFD] p-5 text-sm text-gray-500">
                          <Loader2
                            size={19}
                            className="mr-3 animate-spin text-[#1749D1]"
                          />
                          Loading delivery areas...
                        </div>
                      ) : deliveryAreas.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-[#FAFBFD] p-8 text-center">
                          <Truck size={30} className="mx-auto text-gray-300" />

                          <p className="mt-3 text-sm font-bold text-gray-600">
                            No delivery areas configured
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-400">
                            Add a Philippine location above to allow customer
                            delivery there.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deliveryAreas.map((area) => {
                            const areaIsAllRegion = area.region === ALL;

                            const areaIsAllProvince = area.province === ALL;

                            const areaIsAllMunicipality =
                              area.municipality === ALL;

                            const areaIsAllBarangay = area.barangay === ALL;

                            return (
                              <div
                                key={area.id}
                                className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-[#FAFBFD] p-4 transition hover:border-blue-100 hover:bg-white hover:shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div className="flex min-w-0 items-start gap-3">
                                  <div
                                    className={`
                                      flex
                                      h-10
                                      w-10
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-xl
                                      ${
                                        area.is_active
                                          ? "bg-green-50 text-green-600"
                                          : "bg-gray-100 text-gray-400"
                                      }
                                    `}
                                  >
                                    {areaIsAllRegion ||
                                    areaIsAllProvince ||
                                    areaIsAllMunicipality ||
                                    areaIsAllBarangay ? (
                                      <MapPin size={19} />
                                    ) : (
                                      <CheckCircle2 size={19} />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="break-words text-sm font-extrabold text-gray-800">
                                        {area.barangay === ALL
                                          ? "All Barangays"
                                          : area.barangay}
                                      </p>

                                      <span
                                        className={`
                                          rounded-full
                                          px-2
                                          py-1
                                          text-[10px]
                                          font-bold
                                          uppercase
                                          tracking-wide
                                          ${
                                            area.is_active
                                              ? "bg-green-100 text-green-700"
                                              : "bg-gray-200 text-gray-500"
                                          }
                                        `}
                                      >
                                        {area.is_active ? "Active" : "Inactive"}
                                      </span>
                                    </div>

                                    <p className="mt-1 break-words text-xs leading-5 text-gray-500">
                                      {area.municipality === ALL
                                        ? "All Municipalities / Cities"
                                        : area.municipality}
                                      ,{" "}
                                      {area.province === ALL
                                        ? "All Provinces"
                                        : area.province}
                                      ,{" "}
                                      {area.region === ALL
                                        ? "All Regions"
                                        : area.region}
                                      , {area.country}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteDeliveryArea(area.id)
                                  }
                                  disabled={deletingDeliveryArea === area.id}
                                  className="flex min-h-[42px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                  {deletingDeliveryArea === area.id ? (
                                    <>
                                      <Loader2
                                        size={15}
                                        className="animate-spin"
                                      />
                                      Removing...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 size={15} />
                                      Remove
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-xs text-orange-700">
                  Delivery is currently disabled. Enable it in the Delivery
                  Settings tab before adding delivery areas.
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              DELIVERY PERSONNEL
          ==================================================== */}

          {activeTab === "personnel" && (
            <div className="p-3.5 sm:p-6 lg:p-8 xl:p-10">
              {/* HEADER */}

              <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1749D1] sm:h-11 sm:w-11">
                    <Users size={20} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-[#122B5C] sm:text-lg">
                      Delivery Personnel
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
                      Create and manage accounts for people who deliver customer
                      orders.
                    </p>
                  </div>
                </div>
              </div>

              {/* ACCOUNT FORM */}

              {showPersonnelForm && (
                <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:mb-6 sm:p-6">
                  <div className="mb-5 flex items-center gap-3 sm:mb-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1749D1] shadow-sm">
                      {editingPersonnelId === null ? (
                        <UserPlus size={19} />
                      ) : (
                        <Pencil size={19} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-[#122B5C] sm:text-base">
                        {editingPersonnelId === null
                          ? "Create Delivery Account"
                          : "Edit Delivery Account"}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {editingPersonnelId === null
                          ? "Create a login account for a member of the owner's delivery team."
                          : "Update the delivery personnel's account information."}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSavePersonnel}>
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                      {/* NAME */}

                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700 sm:text-sm">
                          Full Name
                        </label>

                        <div className="relative">
                          <User
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="text"
                            value={personnelName}
                            onChange={(e) => setPersonnelName(e.target.value)}
                            required
                            placeholder="Enter full name"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      {/* EMAIL */}

                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700 sm:text-sm">
                          Email Address
                        </label>

                        <div className="relative">
                          <Mail
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="email"
                            value={personnelEmail}
                            onChange={(e) => setPersonnelEmail(e.target.value)}
                            required
                            placeholder="delivery@example.com"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      {/* MOBILE */}

                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700 sm:text-sm">
                          Mobile Number
                        </label>

                        <div className="relative">
                          <Phone
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="text"
                            value={personnelMobile}
                            onChange={(e) => setPersonnelMobile(e.target.value)}
                            placeholder="09XXXXXXXXX"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      {/* STATUS EDIT ONLY */}

                      {editingPersonnelId !== null && (
                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700 sm:text-sm">
                            Account Status
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setPersonnelActive((value) => !value)
                            }
                            className="flex min-h-[40px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                          >
                            <span className="text-sm font-bold text-gray-700">
                              {personnelActive ? "Active" : "Disabled"}
                            </span>

                            <div
                              className={`
                                relative
                                h-7
                                w-14
                                rounded-full
                                p-1
                                ${
                                  personnelActive
                                    ? "bg-[#1749D1]"
                                    : "bg-gray-300"
                                }
                              `}
                            >
                              <div
                                className={`
                                  h-5
                                  w-5
                                  rounded-full
                                  bg-white
                                  shadow
                                  transition-transform
                                  ${
                                    personnelActive
                                      ? "translate-x-7"
                                      : "translate-x-0"
                                  }
                                `}
                              />
                            </div>
                          </button>
                        </div>
                      )}

                      {/* PASSWORD */}

                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700 sm:text-sm">
                          {editingPersonnelId === null
                            ? "Password"
                            : "New Password"}
                        </label>

                        <div className="relative">
                          <LockKeyhole
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type={showPersonnelPassword ? "text" : "password"}
                            value={personnelPassword}
                            onChange={(e) =>
                              setPersonnelPassword(e.target.value)
                            }
                            required={editingPersonnelId === null}
                            minLength={8}
                            placeholder={
                              editingPersonnelId === null
                                ? "Minimum 8 characters"
                                : "Leave blank to keep current password"
                            }
                            className={`${inputClass} pl-11 pr-12`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPersonnelPassword((value) => !value)
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1749D1]"
                          >
                            {showPersonnelPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* CONFIRM PASSWORD */}

                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700 sm:text-sm">
                          Confirm Password
                        </label>

                        <div className="relative">
                          <LockKeyhole
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type={
                              showPersonnelPasswordConfirmation
                                ? "text"
                                : "password"
                            }
                            value={personnelPasswordConfirmation}
                            onChange={(e) =>
                              setPersonnelPasswordConfirmation(e.target.value)
                            }
                            required={
                              editingPersonnelId === null ||
                              Boolean(personnelPassword)
                            }
                            minLength={8}
                            placeholder={
                              editingPersonnelId === null
                                ? "Re-enter password"
                                : "Required when changing password"
                            }
                            className={`${inputClass} pl-11 pr-12`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPersonnelPasswordConfirmation(
                                (value) => !value,
                              )
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1749D1]"
                          >
                            {showPersonnelPasswordConfirmation ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* NOTICE */}

                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                      <ShieldCheck
                        size={18}
                        className="mt-0.5 shrink-0 text-orange-500"
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-orange-700">
                          Delivery Account
                        </p>

                        <p className="mt-1 text-xs leading-5 text-orange-600">
                          This account will automatically be assigned the
                          Delivery role. The delivery personnel can use this
                          email and password to access the delivery side of
                          CRAYTECH.
                        </p>
                      </div>
                    </div>

                    {/* BUTTONS */}

                    <div className="mt-5 flex flex-col-reverse gap-2 border-t border-blue-100 pt-5 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3 sm:pt-6">
                      <button
                        type="button"
                        onClick={closePersonnelForm}
                        disabled={savingPersonnel}
                        className="min-h-[40px] rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={savingPersonnel}
                        className="flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#1749D1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#102D79] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingPersonnel ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            {editingPersonnelId === null ? (
                              <UserPlus size={17} />
                            ) : (
                              <Pencil size={17} />
                            )}

                            {editingPersonnelId === null
                              ? "Create Account"
                              : "Save Changes"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* PERSONNEL LIST */}

              {loadingPersonnel ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-gray-100 bg-[#FAFBFD] px-4 text-center text-sm text-gray-500">
                  <Loader2
                    size={21}
                    className="mr-3 animate-spin text-[#1749D1]"
                  />
                  Loading delivery personnel...
                </div>
              ) : deliveryPersonnel.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FAFBFD] p-7 text-center sm:p-12">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1749D1] sm:h-16 sm:w-16">
                    <Users size={28} />
                  </div>

                  <h3 className="mt-4 text-base font-extrabold text-gray-700 sm:mt-5">
                    No Delivery Personnel
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
                    No delivery accounts have been created yet. Add a member of
                    the owner's delivery team to give them access.
                  </p>

                  <button
                    type="button"
                    onClick={openAddPersonnelForm}
                    className="mx-auto mt-5 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#1749D1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#102D79] sm:mt-6 sm:w-auto"
                  >
                    <UserPlus size={17} />
                    Add Delivery Personnel
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {deliveryPersonnel.map((person) => (
                    <div
                      key={person.id}
                      className="rounded-2xl border border-gray-100 bg-[#FAFBFD] p-4 transition hover:border-blue-100 hover:bg-white hover:shadow-sm sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* PERSON */}

                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <div
                            className={`
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                sm:h-12
                                sm:w-12
                                ${
                                  person.is_active
                                    ? "bg-blue-50 text-[#1749D1]"
                                    : "bg-gray-200 text-gray-400"
                                }
                              `}
                          >
                            <User size={21} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-extrabold text-gray-800 sm:text-base">
                                {person.name}
                              </h3>

                              <span
                                className={`
                                    rounded-full
                                    px-2.5
                                    py-1
                                    text-[9px]
                                    font-bold
                                    uppercase
                                    tracking-wide
                                    ${
                                      person.is_active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-200 text-gray-600"
                                    }
                                  `}
                              >
                                {person.is_active ? "Active" : "Disabled"}
                              </span>

                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#1749D1]">
                                Delivery
                              </span>
                            </div>

                            <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-5">
                              <span className="flex min-w-0 items-center gap-1.5 break-all">
                                <Mail size={14} className="shrink-0" />
                                {person.email}
                              </span>

                              {person.mobile_number && (
                                <span className="flex items-center gap-1.5">
                                  <Phone size={14} className="shrink-0" />
                                  {person.mobile_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS */}

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0 lg:justify-end">
                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() => openEditPersonnelForm(person)}
                            className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1749D1]"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>

                          {/* ENABLE/DISABLE */}

                          <button
                            type="button"
                            onClick={() => handleTogglePersonnel(person)}
                            disabled={togglingPersonnel === person.id}
                            className={`
                                flex
                                min-h-[42px]
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                px-4
                                py-2.5
                                text-xs
                                font-bold
                                transition
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                                ${
                                  person.is_active
                                    ? "border border-orange-200 bg-white text-orange-600 hover:bg-orange-50"
                                    : "bg-green-600 text-white hover:bg-green-700"
                                }
                              `}
                          >
                            {togglingPersonnel === person.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Power size={15} />
                            )}

                            {person.is_active ? "Disable" : "Activate"}
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() => handleDeletePersonnel(person)}
                            disabled={deletingPersonnel === person.id}
                            className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingPersonnel === person.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* INFORMATION */}

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:mt-6">
                <Truck size={18} className="mt-0.5 shrink-0 text-[#1749D1]" />

                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1749D1]">
                    About Delivery Personnel
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Delivery accounts are created and controlled by the
                    administrator. A delivery account can be disabled at any
                    time, which prevents the personnel from logging in.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {(activeTab === "areas" || activeTab === "personnel") &&
          (activeTab === "personnel" || deliveryEnabled) && (
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
                    clearMessages();
                    if (activeTab === "areas") {
                      setShowAreaForm(true);
                    } else {
                      openAddPersonnelForm();
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-[#17365D] shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  {activeTab === "areas" ? (
                    <MapPin size={16} className="text-[#1749D1]" />
                  ) : (
                    <UserPlus size={16} className="text-[#1749D1]" />
                  )}
                  {activeTab === "areas"
                    ? "Add Delivery Area"
                    : "Add Delivery Personnel"}
                </button>
              </div>

              <button
                type="button"
                aria-label={showAddMenu ? "Close add menu" : "Open add menu"}
                aria-expanded={showAddMenu}
                onClick={() => setShowAddMenu((value) => !value)}
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-3xl font-light text-white shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 ${
                  showAddMenu
                    ? "rotate-45 bg-[#17365D]"
                    : "rotate-0 bg-[#1749D1]"
                }`}
              >
                +
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default Delivery;
