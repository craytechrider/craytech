import React, { useEffect, useMemo, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  LogOut,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Loader2,
  CheckCircle2,
  Navigation,
} from "lucide-react";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import CustomerPageHero from "../../components/CustomerPageHero";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import api from "../../lib/api";

const BLUE = "#17365D";
const BLUE_DARK = "#0F2948";
const ORANGE = "#F59E0B";
const ALL = "ALL";

interface DeliveryArea {
  id: number;
  country: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  is_active: boolean | number | string;
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

interface AddressForm {
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
}

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

interface PasswordForm {
  current: string;
  newPassword: string;
  confirm: string;
}

interface LocationOption {
  code: string;
  name: string;
}

const emptyAddress: AddressForm = {
  label: "",
  country: "Philippines",
  region: "",
  province: "",
  municipality: "",
  barangay: "",
  detailed_address: "",
  latitude: null,
  longitude: null,
  is_default: false,
};

const defaultMapPosition: [number, number] = [12.794, 121.403];

const pinIcon = L.divIcon({
  className: "craytech-map-pin",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50% 50% 50% 0;
      background:#1749D1;
      border:3px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,.30);
      transform:rotate(-45deg);
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="
        width:10px;
        height:10px;
        border-radius:50%;
        background:white;
      "></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function MapClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

const CustomerSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "address" | "security"
  >("profile");

  const [profile, setProfile] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState<PasswordForm>({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [loadingDeliveryAreas, setLoadingDeliveryAreas] = useState(true);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);

  const [savingAddress, setSavingAddress] = useState(false);

  const [psgcProvinces, setPsgcProvinces] = useState<LocationOption[]>([]);
  const [psgcMunicipalities, setPsgcMunicipalities] = useState<
    LocationOption[]
  >([]);
  const [psgcBarangays, setPsgcBarangays] = useState<LocationOption[]>([]);
  const [psgcRegions, setPsgcRegions] = useState<LocationOption[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
    loadAddresses();
    loadDeliveryAreas();
  }, []);

  const isActiveArea = (area: DeliveryArea) =>
    area.is_active === true || area.is_active === 1 || area.is_active === "1";

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);

      const response = await api.get("/settings");

      const data = response.data?.data ?? response.data?.user ?? response.data;

      setProfile({
        name: data?.name ?? "",
        email: data?.email ?? "",
        phone: data?.mobile_number ?? data?.phone ?? data?.contact_number ?? "",
      });
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load your profile information.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);

      const response = await api.get("/delivery-addresses");

      const data = response.data?.data ?? [];

      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load delivery addresses:", err);
      setError("Failed to load your delivery addresses.");
    } finally {
      setLoadingAddresses(false);
    }
  };

  const loadDeliveryAreas = async () => {
    try {
      setLoadingDeliveryAreas(true);

      const response = await api.get("/delivery-areas");

      const data = response.data?.data ?? [];

      const activeAreas = Array.isArray(data)
        ? data.filter((area: DeliveryArea) => isActiveArea(area))
        : [];

      setDeliveryAreas(activeAreas);
    } catch (err) {
      console.error("Failed to load delivery areas:", err);
      setDeliveryAreas([]);
    } finally {
      setLoadingDeliveryAreas(false);
    }
  };

  const updateProfile = (field: keyof ProfileForm, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePassword = (field: keyof PasswordForm, value: string) => {
    setPasswords((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateAddress = (
    field: keyof AddressForm,
    value: string | number | boolean | null,
  ) => {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const regions = useMemo(() => {
    const activeAreas = deliveryAreas.filter(isActiveArea);

    const allowAllRegions = activeAreas.some((area) => area.region === ALL);

    if (allowAllRegions) {
      return [];
    }

    return Array.from(
      new Set(
        activeAreas
          .filter(
            (area) =>
              area.country === "Philippines" &&
              area.region &&
              area.region !== ALL,
          )
          .map((area) => area.region),
      ),
    ).sort();
  }, [deliveryAreas]);

  const shouldLoadAllRegions = useMemo(
    () =>
      deliveryAreas.some(
        (area) =>
          isActiveArea(area) &&
          area.country === "Philippines" &&
          area.region === ALL,
      ),
    [deliveryAreas],
  );

  useEffect(() => {
    if (!shouldLoadAllRegions) {
      setPsgcRegions([]);
      return;
    }

    const loadAllRegions = async () => {
      try {
        setLoadingRegions(true);

        const response = await api.get("/locations/regions");

        const data = response.data?.data ?? [];

        if (!Array.isArray(data)) {
          setPsgcRegions([]);
          return;
        }

        setPsgcRegions(
          data
            .map((item: any) => ({
              code: String(item?.code ?? item?.id ?? item?.name ?? ""),
              name: String(item?.name ?? item?.label ?? ""),
            }))
            .filter((item: LocationOption) => item.code && item.name),
        );
      } catch (err) {
        console.error("Failed to load PSGC regions:", err);
        setPsgcRegions([]);
      } finally {
        setLoadingRegions(false);
      }
    };

    loadAllRegions();
  }, [shouldLoadAllRegions]);

  const availableRegions = useMemo(() => {
    if (shouldLoadAllRegions) {
      return psgcRegions.map((item) => item.name).sort();
    }

    return regions;
  }, [shouldLoadAllRegions, psgcRegions, regions]);

  const getMatchingAreas = (
    region: string,
    province?: string,
    municipality?: string,
    barangay?: string,
  ) => {
    return deliveryAreas.filter((area) => {
      if (!isActiveArea(area)) return false;
      if (area.country !== "Philippines") return false;

      const regionMatches = area.region === region || area.region === ALL;

      if (!regionMatches) return false;

      if (province !== undefined) {
        const provinceMatches =
          area.province === province || area.province === ALL;

        if (!provinceMatches) return false;
      }

      if (municipality !== undefined) {
        const municipalityMatches =
          area.municipality === municipality || area.municipality === ALL;

        if (!municipalityMatches) return false;
      }

      if (barangay !== undefined) {
        const barangayMatches =
          area.barangay === barangay || area.barangay === ALL;

        if (!barangayMatches) return false;
      }

      return true;
    });
  };

  const isLocationAllowed = (
    country: string,
    region: string,
    province: string,
    municipality: string,
    barangay: string,
  ) => {
    return deliveryAreas.some((area) => {
      if (!isActiveArea(area)) return false;
      if (area.country !== country) return false;

      return (
        (area.region === region || area.region === ALL) &&
        (area.province === province || area.province === ALL) &&
        (area.municipality === municipality || area.municipality === ALL) &&
        (area.barangay === barangay || area.barangay === ALL)
      );
    });
  };

  const provinces = useMemo(() => {
    if (!addressForm.region) return [];

    const matchingAreas = getMatchingAreas(addressForm.region);

    const allowAllProvinces = matchingAreas.some(
      (area) => area.province === ALL,
    );

    if (allowAllProvinces) {
      return psgcProvinces.map((item) => item.name).sort();
    }

    return Array.from(
      new Set(
        matchingAreas
          .map((area) => area.province)
          .filter((province) => province && province !== ALL),
      ),
    ).sort();
  }, [deliveryAreas, addressForm.region, psgcProvinces]);

  const municipalities = useMemo(() => {
    if (!addressForm.region || !addressForm.province) {
      return [];
    }

    const matchingAreas = getMatchingAreas(
      addressForm.region,
      addressForm.province,
    );

    const allowAllMunicipalities = matchingAreas.some(
      (area) => area.municipality === ALL,
    );

    if (allowAllMunicipalities) {
      return psgcMunicipalities.map((item) => item.name).sort();
    }

    return Array.from(
      new Set(
        matchingAreas
          .map((area) => area.municipality)
          .filter((municipality) => municipality && municipality !== ALL),
      ),
    ).sort();
  }, [
    deliveryAreas,
    addressForm.region,
    addressForm.province,
    psgcMunicipalities,
  ]);

  const barangays = useMemo(() => {
    if (
      !addressForm.region ||
      !addressForm.province ||
      !addressForm.municipality
    ) {
      return [];
    }

    const matchingAreas = getMatchingAreas(
      addressForm.region,
      addressForm.province,
      addressForm.municipality,
    );

    const allowAllBarangays = matchingAreas.some(
      (area) => area.barangay === ALL,
    );

    if (allowAllBarangays) {
      return psgcBarangays.map((item) => item.name).sort();
    }

    return Array.from(
      new Set(
        matchingAreas
          .map((area) => area.barangay)
          .filter((barangay) => barangay && barangay !== ALL),
      ),
    ).sort();
  }, [
    deliveryAreas,
    addressForm.region,
    addressForm.province,
    addressForm.municipality,
    psgcBarangays,
  ]);

  useEffect(() => {
    if (!addressForm.region) {
      setPsgcProvinces([]);
      return;
    }

    const matchingAreas = getMatchingAreas(addressForm.region);

    const allowAllProvinces = matchingAreas.some(
      (area) => area.province === ALL,
    );

    if (!allowAllProvinces) {
      setPsgcProvinces([]);
      return;
    }

    const loadProvinces = async () => {
      try {
        setLoadingProvinces(true);

        const response = await api.get(
          `/locations/${encodeURIComponent(addressForm.region)}/provinces`,
        );

        const data = response.data?.data ?? [];

        if (!Array.isArray(data)) {
          setPsgcProvinces([]);
          return;
        }

        setPsgcProvinces(
          data
            .map((item: any) => ({
              code: String(item?.code ?? item?.id ?? item?.name ?? ""),
              name: String(item?.name ?? item?.label ?? ""),
            }))
            .filter((item: LocationOption) => item.code && item.name),
        );
      } catch (err) {
        console.error("Failed to load PSGC provinces:", err);
        setPsgcProvinces([]);
      } finally {
        setLoadingProvinces(false);
      }
    };

    loadProvinces();
  }, [addressForm.region, deliveryAreas]);

  useEffect(() => {
    if (!addressForm.region || !addressForm.province) {
      setPsgcMunicipalities([]);
      return;
    }

    const matchingAreas = getMatchingAreas(
      addressForm.region,
      addressForm.province,
    );

    const allowAllMunicipalities = matchingAreas.some(
      (area) => area.municipality === ALL,
    );

    if (!allowAllMunicipalities) {
      setPsgcMunicipalities([]);
      return;
    }

    const loadMunicipalities = async () => {
      try {
        setLoadingMunicipalities(true);

        const response = await api.get(
          `/locations/${encodeURIComponent(
            addressForm.region,
          )}/provinces/${encodeURIComponent(
            addressForm.province,
          )}/municipalities`,
        );

        const data = response.data?.data ?? [];

        if (!Array.isArray(data)) {
          setPsgcMunicipalities([]);
          return;
        }

        setPsgcMunicipalities(
          data
            .map((item: any) => ({
              code: String(item?.code ?? item?.id ?? item?.name ?? ""),
              name: String(item?.name ?? item?.label ?? ""),
            }))
            .filter((item: LocationOption) => item.code && item.name),
        );
      } catch (err) {
        console.error("Failed to load PSGC municipalities:", err);
        setPsgcMunicipalities([]);
      } finally {
        setLoadingMunicipalities(false);
      }
    };

    loadMunicipalities();
  }, [addressForm.region, addressForm.province, deliveryAreas]);

  useEffect(() => {
    if (
      !addressForm.region ||
      !addressForm.province ||
      !addressForm.municipality
    ) {
      setPsgcBarangays([]);
      return;
    }

    const matchingAreas = getMatchingAreas(
      addressForm.region,
      addressForm.province,
      addressForm.municipality,
    );

    const allowAllBarangays = matchingAreas.some(
      (area) => area.barangay === ALL,
    );

    if (!allowAllBarangays) {
      setPsgcBarangays([]);
      return;
    }

    const loadBarangays = async () => {
      try {
        setLoadingBarangays(true);

        const response = await api.get(
          `/locations/${encodeURIComponent(
            addressForm.region,
          )}/provinces/${encodeURIComponent(
            addressForm.province,
          )}/municipalities/${encodeURIComponent(
            addressForm.municipality,
          )}/barangays`,
        );

        const data = response.data?.data ?? [];

        if (!Array.isArray(data)) {
          setPsgcBarangays([]);
          return;
        }

        setPsgcBarangays(
          data
            .map((item: any) => ({
              code: String(item?.code ?? item?.id ?? item?.name ?? ""),
              name: String(item?.name ?? item?.label ?? ""),
            }))
            .filter((item: LocationOption) => item.code && item.name),
        );
      } catch (err) {
        console.error("Failed to load PSGC barangays:", err);
        setPsgcBarangays([]);
      } finally {
        setLoadingBarangays(false);
      }
    };

    loadBarangays();
  }, [
    addressForm.region,
    addressForm.province,
    addressForm.municipality,
    deliveryAreas,
  ]);

  const handleRegionChange = (value: string) => {
    setMessage("");
    setError("");

    setAddressForm((current) => ({
      ...current,
      region: value,
      province: "",
      municipality: "",
      barangay: "",
    }));

    setPsgcProvinces([]);
    setPsgcMunicipalities([]);
    setPsgcBarangays([]);
  };

  const handleProvinceChange = (value: string) => {
    setMessage("");
    setError("");

    setAddressForm((current) => ({
      ...current,
      province: value,
      municipality: "",
      barangay: "",
    }));

    setPsgcMunicipalities([]);
    setPsgcBarangays([]);
  };

  const handleMunicipalityChange = (value: string) => {
    setMessage("");
    setError("");

    setAddressForm((current) => ({
      ...current,
      municipality: value,
      barangay: "",
    }));

    setPsgcBarangays([]);
  };

  const handleSaveProfile = async () => {
    setMessage("");
    setError("");

    const name = profile.name.trim();
    const email = profile.email.trim();
    const phone = profile.phone.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setSavingProfile(true);

      const response = await api.put("/settings/profile", {
        name,
        email,
        mobile_number: phone,
        phone,
        contact_number: phone,
      });

      const responseData =
        response?.data?.data ?? response?.data?.user ?? response?.data;

      const returnedPhone =
        responseData?.mobile_number ??
        responseData?.phone ??
        responseData?.contact_number;

      setProfile({
        name: responseData?.name ?? name,
        email: responseData?.email ?? email,
        phone: returnedPhone ?? phone,
      });

      setMessage("Profile information updated successfully.");

      await loadProfile();
    } catch (err: any) {
      console.error("Failed to update profile:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update your profile information.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage("");
    setError("");

    if (!passwords.current) {
      setError("Please enter your current password.");
      return;
    }

    if (!passwords.newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setChangingPassword(true);

      await api.put("/settings/password", {
        current_password: passwords.current,
        password: passwords.newPassword,
        password_confirmation: passwords.confirm,
      });

      setPasswords({
        current: "",
        newPassword: "",
        confirm: "",
      });

      setMessage("Password updated successfully.");
    } catch (err: any) {
      console.error("Failed to change password:", err);

      setError(
        err?.response?.data?.message || "Failed to update your password.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const openAddAddress = () => {
    setMessage("");
    setError("");

    setEditingAddressId(null);

    setAddressForm({
      ...emptyAddress,
      country: "Philippines",
      is_default: addresses.length === 0,
    });

    setPsgcProvinces([]);
    setPsgcMunicipalities([]);
    setPsgcBarangays([]);

    setShowAddressModal(true);
  };

  const openEditAddress = (address: DeliveryAddress) => {
    setMessage("");
    setError("");

    setEditingAddressId(address.id);

    setAddressForm({
      label: address.label ?? "",
      country: "Philippines",
      region: address.region ?? "",
      province: address.province ?? "",
      municipality: address.municipality ?? "",
      barangay: address.barangay ?? "",
      detailed_address: address.detailed_address ?? "",
      latitude: address.latitude === null ? null : Number(address.latitude),
      longitude: address.longitude === null ? null : Number(address.longitude),
      is_default: Boolean(address.is_default),
    });

    setPsgcProvinces([]);
    setPsgcMunicipalities([]);
    setPsgcBarangays([]);

    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    if (savingAddress) return;

    setShowAddressModal(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddress);

    setPsgcProvinces([]);
    setPsgcMunicipalities([]);
    setPsgcBarangays([]);
  };

  const handleMapLocation = (latitude: number, longitude: number) => {
    setAddressForm((current) => ({
      ...current,
      latitude,
      longitude,
    }));

    setMessage("Location pinned successfully.");
  };

  const handleUseCurrentLocation = () => {
    setMessage("");
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddressForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));

        setMessage("Current location selected on the map.");
      },
      (locationError) => {
        console.error("Geolocation error:", locationError);

        setError(
          "Unable to get your current location. Please allow location access or select the location directly on the map.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleSaveAddress = async () => {
    setMessage("");
    setError("");

    if (!addressForm.label.trim()) {
      setError("Please enter an address label.");
      return;
    }

    if (!addressForm.region) {
      setError("Please select a region.");
      return;
    }

    if (!addressForm.province) {
      setError("Please select a province.");
      return;
    }

    if (!addressForm.municipality) {
      setError("Please select a municipality or city.");
      return;
    }

    if (!addressForm.barangay) {
      setError("Please select a barangay.");
      return;
    }

    if (!addressForm.detailed_address.trim()) {
      setError("Please enter your detailed delivery address.");
      return;
    }

    if (addressForm.latitude === null || addressForm.longitude === null) {
      setError("Please pin your exact location on the map.");
      return;
    }

    const allowed = isLocationAllowed(
      "Philippines",
      addressForm.region,
      addressForm.province,
      addressForm.municipality,
      addressForm.barangay,
    );

    if (!allowed) {
      setError("This location is not currently available for delivery.");
      return;
    }

    const payload = {
      label: addressForm.label.trim(),
      country: "Philippines",
      region: addressForm.region,
      province: addressForm.province,
      municipality: addressForm.municipality,
      barangay: addressForm.barangay,
      detailed_address: addressForm.detailed_address.trim(),
      latitude: Number(addressForm.latitude),
      longitude: Number(addressForm.longitude),
      is_default: Boolean(addressForm.is_default),
    };

    try {
      setSavingAddress(true);

      if (editingAddressId !== null) {
        await api.put(`/delivery-addresses/${editingAddressId}`, payload);
      } else {
        await api.post("/delivery-addresses", payload);
      }

      await loadAddresses();

      setShowAddressModal(false);
      setEditingAddressId(null);
      setAddressForm(emptyAddress);

      setMessage(
        editingAddressId !== null
          ? "Delivery address updated successfully."
          : "Delivery address added successfully.",
      );
    } catch (err: any) {
      console.error("Failed to save delivery address:", err);

      setError(
        err?.response?.data?.message || "Failed to save the delivery address.",
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setMessage("");
    setError("");

    try {
      await api.put(`/delivery-addresses/${id}/default`);

      await loadAddresses();

      setMessage("Default delivery address updated.");
    } catch (err: any) {
      console.error("Failed to set default address:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to set the default delivery address.",
      );
    }
  };

  const handleDeleteAddress = async (address: DeliveryAddress) => {
    if (!window.confirm(`Delete the "${address.label}" delivery address?`)) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await api.delete(`/delivery-addresses/${address.id}`);

      await loadAddresses();

      setMessage("Delivery address deleted successfully.");
    } catch (err: any) {
      console.error("Failed to delete address:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete the delivery address.",
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const selectedMapPosition: [number, number] =
    addressForm.latitude !== null && addressForm.longitude !== null
      ? [addressForm.latitude, addressForm.longitude]
      : defaultMapPosition;

  const mapZoom =
    addressForm.latitude !== null && addressForm.longitude !== null ? 17 : 11;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] via-white to-[#EEF4FA]">
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
        {/* ============================================================
    PAGE HERO
============================================================ */}

        <CustomerPageHero
          section="ACCOUNT SETTINGS"
          title="Settings"
          description="Manage your personal information, saved delivery addresses, and account security."
          type="default"
        />

        {/* SETTINGS TABS */}
        <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
              setMessage("");
              setError("");
            }}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-extrabold transition sm:text-sm ${
              activeTab === "profile"
                ? "bg-[#17365D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#17365D]"
            }`}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("address");
              setMessage("");
              setError("");
            }}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-extrabold transition sm:text-sm ${
              activeTab === "address"
                ? "bg-[#17365D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#17365D]"
            }`}
          >
            <MapPin size={16} />
            <span>Address</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("security");
              setMessage("");
              setError("");
            }}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-extrabold transition sm:text-sm ${
              activeTab === "security"
                ? "bg-[#17365D] text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#17365D]"
            }`}
          >
            <Lock size={16} />
            <span>Security</span>
          </button>
        </div>

        {/* ============================================================
              MESSAGES
          ============================================================ */}

        {(message || error) && (
          <div
            className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm sm:mb-6 ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

            <span className="flex-1">{error || message}</span>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setError("");
              }}
              className="shrink-0 rounded-lg p-1 transition hover:bg-black/5"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {activeTab === "profile" && (
          <>
            {/* ============================================================
              PROFILE
          ============================================================ */}

            <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(23,54,93,0.06)] sm:mb-6">
              <div className="border-b border-slate-100 bg-gradient-to-r from-white to-[#F7FAFD] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm"
                    style={{
                      backgroundColor: "#EEF3F8",
                      color: BLUE,
                    }}
                  >
                    <User size={20} />
                  </div>

                  <div>
                    <h2
                      className="font-extrabold"
                      style={{
                        color: BLUE,
                      }}
                    >
                      Profile Information
                    </h2>

                    <p className="text-xs text-gray-500">
                      Update your personal information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
                {loadingProfile ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
                    <Loader2 size={22} className="mr-2 animate-spin" />
                    Loading profile...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                      {/* NAME */}

                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                          Full Name
                        </label>

                        <div className="relative">
                          <User
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="text"
                            value={profile.name}
                            onChange={(e) =>
                              updateProfile("name", e.target.value)
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                          />
                        </div>
                      </div>

                      {/* EMAIL */}

                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                          Email Address
                        </label>

                        <div className="relative">
                          <Mail
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="email"
                            value={profile.email}
                            onChange={(e) =>
                              updateProfile("email", e.target.value)
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                          />
                        </div>
                      </div>

                      {/* PHONE */}

                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                          Phone Number
                        </label>

                        <div className="relative">
                          <Phone
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) =>
                              updateProfile("phone", e.target.value)
                            }
                            placeholder="09XXXXXXXXX"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        style={{
                          backgroundColor: BLUE,
                        }}
                      >
                        {savingProfile ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : (
                          <Save size={17} />
                        )}

                        {savingProfile ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === "address" && (
          <>
            {/* ============================================================
              DELIVERY ADDRESSES
          ============================================================ */}

            <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(23,54,93,0.06)] sm:mb-6">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-[#F7FAFD] p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                    <MapPin size={20} />
                  </div>

                  <div>
                    <h2
                      className="font-extrabold"
                      style={{
                        color: BLUE,
                      }}
                    >
                      Delivery Addresses
                    </h2>

                    <p className="text-xs text-gray-500">
                      Add, edit, and manage your saved delivery addresses.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAddAddress}
                  disabled={loadingDeliveryAreas || deliveryAreas.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  style={{
                    background: `linear-gradient(135deg, ${ORANGE}, #D97706)`,
                  }}
                >
                  <Plus size={17} />
                  Add New Address
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
                {loadingDeliveryAreas ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
                    <Loader2 size={22} className="mr-2 animate-spin" />
                    Loading available delivery areas...
                  </div>
                ) : deliveryAreas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 px-6 py-10 text-center">
                    <MapPin size={28} className="mx-auto text-orange-500" />

                    <h3 className="mt-3 font-extrabold text-gray-800">
                      Delivery is currently unavailable
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                      The farm has not configured any active delivery areas yet.
                      Please check again later.
                    </p>
                  </div>
                ) : loadingAddresses ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
                    <Loader2 size={22} className="mr-2 animate-spin" />
                    Loading delivery addresses...
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm">
                      <MapPin size={25} />
                    </div>

                    <h3 className="mt-4 font-extrabold text-gray-800">
                      No delivery address yet
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                      Add your first delivery address so you can quickly use it
                      during checkout.
                    </p>

                    <button
                      type="button"
                      onClick={openAddAddress}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
                      style={{
                        backgroundColor: BLUE,
                      }}
                    >
                      <Plus size={17} />
                      Add Delivery Address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`group rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                          address.is_default
                            ? "border-blue-300 bg-blue-50/50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                address.is_default
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <MapPin size={20} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-extrabold text-gray-800">
                                  {address.label}
                                </h3>

                                {address.is_default && (
                                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-green-700">
                                    Default
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 text-sm font-semibold text-gray-800">
                                {address.detailed_address}
                              </p>

                              <p className="mt-1 text-sm leading-6 text-gray-500">
                                {address.barangay}, {address.municipality},{" "}
                                {address.province}, {address.region}
                              </p>

                              {address.latitude !== null &&
                                address.longitude !== null && (
                                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-600">
                                    <CheckCircle2 size={14} />
                                    Map location saved
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:flex-wrap">
                          {!address.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(address.id)}
                              className="flex items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100"
                            >
                              <Star size={14} />
                              Set Default
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditAddress(address)}
                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(address)}
                            className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === "security" && (
          <>
            {/* ============================================================
              CHANGE PASSWORD
          ============================================================ */}

            <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(23,54,93,0.06)] sm:mb-6">
              <div className="border-b border-slate-100 bg-gradient-to-r from-white to-[#F7FAFD] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 shadow-sm">
                    <Lock size={20} />
                  </div>

                  <div>
                    <h2
                      className="font-extrabold"
                      style={{
                        color: BLUE,
                      }}
                    >
                      Change Password
                    </h2>

                    <p className="text-xs text-gray-500">
                      Keep your account secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-4 sm:p-6">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Current Password
                  </label>

                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => updatePassword("current", e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      New Password
                    </label>

                    <input
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) =>
                        updatePassword("newPassword", e.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Confirm New Password
                    </label>

                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) =>
                        updatePassword("confirm", e.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {changingPassword && (
                      <Loader2 size={17} className="animate-spin" />
                    )}

                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            </section>

            {/* ============================================================
              LOGOUT
          ============================================================ */}

            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_rgba(23,54,93,0.05)] sm:p-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-extrabold text-gray-800">Logout</h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Sign out of your CRAYTECH account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100 sm:w-auto"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ============================================================
          ADD / EDIT DELIVERY ADDRESS MODAL
      ============================================================ */}

      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071A2D]/60 p-3 backdrop-blur-[2px] sm:p-4">
          <div className="flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
            {/* HEADER */}

            <div className="z-20 flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 shadow-sm sm:items-center sm:px-6 sm:py-4">
              <div>
                <h2
                  className="text-lg font-extrabold sm:text-xl"
                  style={{
                    color: BLUE,
                  }}
                >
                  {editingAddressId !== null
                    ? "Edit Delivery Address"
                    : "Add Delivery Address"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Save your address and pin your exact delivery location.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddressModal}
                disabled={savingAddress}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={21} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
              {/* BASIC INFORMATION */}

              <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Address Label
                  </label>

                  <input
                    type="text"
                    value={addressForm.label}
                    onChange={(e) => updateAddress("label", e.target.value)}
                    placeholder="e.g. Home, School, Office"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Country
                  </label>

                  <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700">
                    Philippines
                  </div>
                </div>
              </div>

              {/* LOCATION */}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-5 md:grid-cols-2">
                {/* REGION */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Region
                  </label>

                  <select
                    value={addressForm.region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={loadingDeliveryAreas || loadingRegions}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingRegions ? "Loading Regions..." : "Select Region"}
                    </option>

                    {availableRegions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PROVINCE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Province
                  </label>

                  <select
                    value={addressForm.province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    disabled={!addressForm.region || loadingProvinces}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingProvinces
                        ? "Loading Provinces..."
                        : "Select Province"}
                    </option>

                    {provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MUNICIPALITY */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Municipality / City
                  </label>

                  <select
                    value={addressForm.municipality}
                    onChange={(e) => handleMunicipalityChange(e.target.value)}
                    disabled={!addressForm.province || loadingMunicipalities}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingMunicipalities
                        ? "Loading Municipalities..."
                        : "Select Municipality / City"}
                    </option>

                    {municipalities.map((municipality) => (
                      <option key={municipality} value={municipality}>
                        {municipality}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BARANGAY */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Barangay
                  </label>

                  <select
                    value={addressForm.barangay}
                    onChange={(e) => updateAddress("barangay", e.target.value)}
                    disabled={!addressForm.municipality || loadingBarangays}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingBarangays
                        ? "Loading Barangays..."
                        : "Select Barangay"}
                    </option>

                    {barangays.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DELIVERY COVERAGE */}

              {addressForm.region &&
                addressForm.province &&
                addressForm.municipality && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:mt-5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0 text-blue-600"
                      />

                      <div>
                        <p className="text-sm font-extrabold text-blue-800">
                          Delivery Location
                        </p>

                        <p className="mt-1 text-xs leading-5 text-blue-700">
                          {addressForm.municipality}, {addressForm.province},{" "}
                          {addressForm.region}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* DETAILED ADDRESS */}

              <div className="mt-3 sm:mt-5">
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Detailed Address
                </label>

                <textarea
                  value={addressForm.detailed_address}
                  onChange={(e) =>
                    updateAddress("detailed_address", e.target.value)
                  }
                  rows={2}
                  placeholder="House number, street, sitio, subdivision, landmark, etc."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10"
                />
              </div>

              {/* MAP */}

              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 sm:mt-6 sm:rounded-2xl">
                <div className="flex flex-col justify-between gap-2 border-b border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-blue-600" />

                      <h3 className="font-extrabold text-gray-800">
                        Pin Your Location
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Click the map to place your delivery location.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50 sm:w-auto"
                  >
                    <Navigation size={14} />
                    Use My Location
                  </button>
                </div>

                <div className="h-[155px] w-full sm:h-[300px] lg:h-[340px]">
                  <MapContainer
                    key={`${selectedMapPosition[0]}-${selectedMapPosition[1]}-${mapZoom}`}
                    center={selectedMapPosition}
                    zoom={mapZoom}
                    scrollWheelZoom
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapClickHandler onSelect={handleMapLocation} />

                    {addressForm.latitude !== null &&
                      addressForm.longitude !== null && (
                        <Marker
                          position={[
                            addressForm.latitude,
                            addressForm.longitude,
                          ]}
                          icon={pinIcon}
                        />
                      )}
                  </MapContainer>
                </div>

                <div className="border-t border-gray-200 bg-white px-3 py-2 sm:p-4">
                  {addressForm.latitude !== null &&
                  addressForm.longitude !== null ? (
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-green-700">
                        Location pinned successfully
                      </span>

                      <span className="text-gray-500">
                        Latitude: {addressForm.latitude.toFixed(6)}
                        {" • "}
                        Longitude: {addressForm.longitude.toFixed(6)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-orange-600">
                      Please click the map to pin your exact delivery location.
                    </p>
                  )}
                </div>
              </div>

              {/* DEFAULT */}

              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:mt-5 sm:p-4">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) =>
                    updateAddress("is_default", e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />

                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Set as default delivery address
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Your default address will automatically be selected during
                    checkout.
                  </p>
                </div>
              </label>
            </div>

            {/* FOOTER */}

            <div className="z-20 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-3 py-3 shadow-[0_-8px_25px_rgba(23,54,93,0.06)] sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={closeAddressModal}
                disabled={savingAddress}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAddress}
                disabled={
                  savingAddress ||
                  !addressForm.region ||
                  !addressForm.province ||
                  !addressForm.municipality ||
                  !addressForm.barangay
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                style={{
                  background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
                }}
              >
                {savingAddress && (
                  <Loader2 size={17} className="animate-spin" />
                )}

                {savingAddress
                  ? "Saving..."
                  : editingAddressId !== null
                    ? "Update Address"
                    : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSettings;
