import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Truck,
  WalletCards,
  X,
  Home,
} from "lucide-react";

import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useLocation, useNavigate } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import api from "../../lib/api";

const BLUE = "#1749D1";
const BLUE_DARK = "#102d79";

// Same custom blue pin used on the Customer Settings map.
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

type PaymentMethod = "cod" | "paymongo";

type DeliveryMethod = "delivery" | "pickup";

/* ============================================================
   DIRECT CHECKOUT ITEM
============================================================ */
interface DirectCheckoutItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  selling_type?: "kilogram" | "piece";
  available_weight_kg?: number;
  available_pieces?: number;
}

/* ============================================================
   DELIVERY AREA
============================================================ */

interface DeliveryArea {
  id: number;
  country: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  is_active: boolean | number | string;
}

/* ============================================================
   SAVED DELIVERY ADDRESS
============================================================ */

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

/* ============================================================
   COORDINATES
============================================================ */

interface Coordinates {
  lat: number;
  lng: number;
}

/* ============================================================
   GEOCODE RESULT
============================================================ */

interface GeocodeResult {
  lat: string;
  lon: string;
  boundingbox?: string[];
  display_name?: string;
}

interface LocationOption {
  code: string;
  name: string;
  type?: string;
}

const ALL = "ALL";

/* ============================================================
   MAP PIN SELECTOR
============================================================ */

interface MapPinSelectorProps {
  position: Coordinates | null;
  onSelect: (position: Coordinates) => void;
}

const MapPinSelector: React.FC<MapPinSelectorProps> = ({
  position,
  onSelect,
}) => {
  useMapEvents({
    click(event) {
      onSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return position ? (
    <Marker position={[position.lat, position.lng]} icon={pinIcon} />
  ) : null;
};

/* ============================================================
   MAP CENTER
============================================================ */

interface MapCenterProps {
  center: Coordinates | null;
  zoom?: number;
}

const MapCenter: React.FC<MapCenterProps> = ({ center, zoom = 15 }) => {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }

    map.setView([center.lat, center.lng], zoom, {
      animate: true,
    });
  }, [center, zoom, map]);

  return null;
};

/* ============================================================
   ADDRESS MODAL PROPS
============================================================ */

interface AddressModalProps {
  open: boolean;
  deliveryAreas: DeliveryArea[];
  existingAddressCount: number;

  onClose: () => void;
  onSaved: (address: DeliveryAddress) => void;
}

/* ============================================================
   ADD ADDRESS MODAL
============================================================ */

const AddAddressModal: React.FC<AddressModalProps> = ({
  open,
  deliveryAreas,
  existingAddressCount,
  onClose,
  onSaved,
}) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");

  const selectedCountry = "Philippines";

  const [selectedRegion, setSelectedRegion] = useState("");

  const [selectedProvince, setSelectedProvince] = useState("");

  const [selectedMunicipality, setSelectedMunicipality] = useState("");

  const [selectedBarangay, setSelectedBarangay] = useState("");

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const [detailedAddress, setDetailedAddress] = useState("");

  const [setAsDefault, setSetAsDefault] = useState(existingAddressCount === 0);

  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null);

  const [mapPosition, setMapPosition] = useState<Coordinates | null>(null);

  const [loadingMap, setLoadingMap] = useState(false);

  const [mapError, setMapError] = useState("");

  const [error, setError] = useState("");

  /* ==========================================================
     RESET FORM
  ========================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    setLabel("");
    setSelectedRegion("");
    setSelectedProvince("");
    setSelectedMunicipality("");
    setSelectedBarangay("");
    setDetailedAddress("");

    setSetAsDefault(existingAddressCount === 0);

    setMapCenter(null);
    setMapPosition(null);

    setLoadingMap(false);
    setMapError("");
    setError("");
  }, [open, existingAddressCount]);

  /* ==========================================================
     LOCATION DATA
  ========================================================== */

  const normalizeLocationResponse = (response: any): LocationOption[] => {
    const data = response?.data?.data ?? response?.data ?? [];
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => ({
        code: String(item?.code ?? item?.id ?? item?.name ?? ""),
        name: String(item?.name ?? item?.label ?? ""),
        type: item?.type ? String(item.type) : undefined,
      }))
      .filter((item: LocationOption) => item.code && item.name);
  };

  // Compare location names without being affected by letter case or extra spaces.
  const normalizeLocationName = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLocaleLowerCase();

  const isAllLocation = (value: unknown) =>
    normalizeLocationName(value) === "all";

  const isActiveDeliveryArea = (area: DeliveryArea) =>
    area.is_active === true ||
    area.is_active === 1 ||
    String(area.is_active).toLowerCase() === "true" ||
    String(area.is_active) === "1" ||
    area.is_active === undefined;

  const areaFieldMatches = (areaValue: string, selectedValue: string) =>
    isAllLocation(areaValue) ||
    normalizeLocationName(areaValue) === normalizeLocationName(selectedValue);

  const getActiveDeliveryAreas = () =>
    deliveryAreas.filter(isActiveDeliveryArea);

  const filterRegionsByDeliveryAreas = (options: LocationOption[]) => {
    const areas = getActiveDeliveryAreas();

    return options.filter((option) =>
      areas.some(
        (area) =>
          areaFieldMatches(area.country, selectedCountry) &&
          areaFieldMatches(area.region, option.name),
      ),
    );
  };

  const filterProvincesByDeliveryAreas = (
    options: LocationOption[],
    region: string,
  ) => {
    const areas = getActiveDeliveryAreas();

    return options.filter((option) =>
      areas.some(
        (area) =>
          areaFieldMatches(area.country, selectedCountry) &&
          areaFieldMatches(area.region, region) &&
          areaFieldMatches(area.province, option.name),
      ),
    );
  };

  const filterMunicipalitiesByDeliveryAreas = (
    options: LocationOption[],
    region: string,
    province: string,
  ) => {
    const areas = getActiveDeliveryAreas();

    return options.filter((option) =>
      areas.some(
        (area) =>
          areaFieldMatches(area.country, selectedCountry) &&
          areaFieldMatches(area.region, region) &&
          areaFieldMatches(area.province, province) &&
          areaFieldMatches(area.municipality, option.name),
      ),
    );
  };

  const filterBarangaysByDeliveryAreas = (
    options: LocationOption[],
    region: string,
    province: string,
    municipality: string,
  ) => {
    const areas = getActiveDeliveryAreas();

    return options.filter((option) =>
      areas.some(
        (area) =>
          areaFieldMatches(area.country, selectedCountry) &&
          areaFieldMatches(area.region, region) &&
          areaFieldMatches(area.province, province) &&
          areaFieldMatches(area.municipality, municipality) &&
          areaFieldMatches(area.barangay, option.name),
      ),
    );
  };

  const loadRegions = async () => {
    try {
      setLoadingRegions(true);
      const response = await api.get("/locations/regions");
      const allRegions = normalizeLocationResponse(response);
      setRegions(filterRegionsByDeliveryAreas(allRegions));
    } catch (error: any) {
      console.error("Failed to load regions:", error);
      setRegions([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  const loadProvinces = async (region: string) => {
    if (!region) {
      setProvinces([]);
      return;
    }
    try {
      setLoadingProvinces(true);
      const response = await api.get(
        `/locations/${encodeURIComponent(region)}/provinces`,
      );
      const allProvinces = normalizeLocationResponse(response);
      setProvinces(filterProvincesByDeliveryAreas(allProvinces, region));
    } catch (error: any) {
      console.error("Failed to load provinces:", error);
      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadMunicipalities = async (region: string, province: string) => {
    if (!region || !province) {
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
      const allMunicipalities = normalizeLocationResponse(response);
      setMunicipalities(
        filterMunicipalitiesByDeliveryAreas(
          allMunicipalities,
          region,
          province,
        ),
      );
    } catch (error: any) {
      console.error("Failed to load municipalities:", error);
      setMunicipalities([]);
    } finally {
      setLoadingMunicipalities(false);
    }
  };

  const loadBarangays = async (
    region: string,
    province: string,
    municipality: string,
  ) => {
    if (!region || !province || !municipality) {
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
      const allBarangays = normalizeLocationResponse(response);
      setBarangays(
        filterBarangaysByDeliveryAreas(
          allBarangays,
          region,
          province,
          municipality,
        ),
      );
    } catch (error: any) {
      console.error("Failed to load barangays:", error);
      setBarangays([]);
    } finally {
      setLoadingBarangays(false);
    }
  };

  const selectedDeliveryArea = useMemo(() => {
    if (
      !selectedRegion ||
      !selectedProvince ||
      !selectedMunicipality ||
      !selectedBarangay
    ) {
      return null;
    }

    return (
      deliveryAreas.find(
        (area) =>
          (area.country === selectedCountry || area.country === ALL) &&
          (area.region === selectedRegion || area.region === ALL) &&
          (area.province === selectedProvince || area.province === ALL) &&
          (area.municipality === selectedMunicipality ||
            area.municipality === ALL) &&
          (area.barangay === selectedBarangay || area.barangay === ALL),
      ) || null
    );
  }, [
    deliveryAreas,
    selectedRegion,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
  ]);

  useEffect(() => {
    if (!open || deliveryAreas.length === 0) {
      setRegions([]);
      return;
    }

    void loadRegions();
  }, [open, deliveryAreas]);

  /* ==========================================================
     COUNTRY
  ========================================================== */

  /* ==========================================================
     REGION
  ========================================================== */

  const handleRegionChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const region = e.target.value;

    setSelectedRegion(region);
    setSelectedProvince("");
    setSelectedMunicipality("");
    setSelectedBarangay("");

    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);

    setMapCenter(null);
    setMapPosition(null);
    setMapError("");

    await loadProvinces(region);
  };

  /* ==========================================================
     PROVINCE
  ========================================================== */

  const handleProvinceChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const province = e.target.value;

    setSelectedProvince(province);
    setSelectedMunicipality("");
    setSelectedBarangay("");

    setMunicipalities([]);
    setBarangays([]);

    setMapCenter(null);
    setMapPosition(null);
    setMapError("");

    await loadMunicipalities(selectedRegion, province);
  };

  /* ==========================================================
     MUNICIPALITY
  ========================================================== */

  const handleMunicipalityChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const municipality = e.target.value;

    setSelectedMunicipality(municipality);
    setSelectedBarangay("");

    setBarangays([]);

    setMapCenter(null);
    setMapPosition(null);
    setMapError("");

    await loadBarangays(selectedRegion, selectedProvince, municipality);
  };

  /* ==========================================================
     GEOCODE BARANGAY
  ========================================================== */

  const geocodeBarangay = async (barangay: string) => {
    if (!barangay) {
      return;
    }

    setLoadingMap(true);
    setMapError("");
    setMapPosition(null);

    try {
      const query = [
        barangay,
        selectedMunicipality,
        selectedProvince,
        selectedRegion,
        selectedCountry,
      ]
        .filter(Boolean)
        .join(", ");

      const url =
        "https://nominatim.openstreetmap.org/search" +
        "?format=jsonv2" +
        "&limit=1" +
        `&q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to locate the selected barangay.");
      }

      const results = (await response.json()) as GeocodeResult[];

      if (!results || results.length === 0) {
        throw new Error(
          "The selected barangay could not be located on the map.",
        );
      }

      const result = results[0];

      const lat = Number(result.lat);
      const lng = Number(result.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Invalid map coordinates returned.");
      }

      setMapCenter({
        lat,
        lng,
      });
    } catch (err: any) {
      console.error("Barangay geocoding failed:", err);

      setMapError(err?.message || "Unable to load the map location.");
    } finally {
      setLoadingMap(false);
    }
  };

  /* ==========================================================
     BARANGAY
  ========================================================== */

  const handleBarangayChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const barangay = e.target.value;

    setSelectedBarangay(barangay);

    setMapCenter(null);
    setMapPosition(null);
    setMapError("");

    if (barangay) {
      await geocodeBarangay(barangay);
    }
  };

  /* ==========================================================
     USE CURRENT LOCATION - SAME BEHAVIOR AS SETTINGS
  ========================================================== */

  const handleUseCurrentLocation = () => {
    setMapError("");
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser. Please select your location directly on the map.",
      );
      return;
    }

    setLoadingMap(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setMapCenter(coordinates);
        setMapPosition(coordinates);
        setLoadingMap(false);
      },
      (locationError) => {
        console.error("Geolocation error:", locationError);

        setError(
          "Unable to get your current location. Please allow location access or select the location directly on the map.",
        );
        setLoadingMap(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  /* ==========================================================
     SAVE ADDRESS
  ========================================================== */

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!label.trim()) {
      setError("Please enter an address name such as Home or Farm.");
      return;
    }

    if (!selectedCountry) {
      setError("Please select your country.");
      return;
    }

    if (!selectedRegion) {
      setError("Please select your region.");
      return;
    }

    if (!selectedProvince) {
      setError("Please select your province.");
      return;
    }

    if (!selectedMunicipality) {
      setError("Please select your municipality.");
      return;
    }

    if (!selectedBarangay) {
      setError("Please select your barangay.");
      return;
    }

    if (!selectedDeliveryArea) {
      setError(
        "The selected location is not currently available for delivery.",
      );
      return;
    }

    if (!detailedAddress.trim()) {
      setError("Please enter your detailed delivery address.");
      return;
    }

    if (!mapPosition) {
      setError("Please pin your exact delivery location on the map.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/delivery-addresses", {
        label: label.trim(),

        country: selectedCountry,
        region: selectedRegion,
        province: selectedProvince,
        municipality: selectedMunicipality,
        barangay: selectedBarangay,

        detailed_address: detailedAddress.trim(),

        latitude: mapPosition.lat,
        longitude: mapPosition.lng,

        is_default: setAsDefault,
      });

      const savedAddress = response.data?.data;

      if (!savedAddress) {
        throw new Error("The server did not return the saved address.");
      }

      onSaved(savedAddress);

      onClose();
    } catch (err: any) {
      console.error("Failed to save delivery address:", err);

      console.error("Server response:", err.response?.data);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to save delivery address.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* ====================================================
            MODAL HEADER
        ==================================================== */}

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <MapPin size={21} className="text-[#1749D1]" />
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-[#122B5C]">
                Add Delivery Address
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Save this address for faster checkout.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={21} />
          </button>
        </div>

        {/* ====================================================
            MODAL BODY
        ==================================================== */}

        <form onSubmit={handleSaveAddress} className="overflow-y-auto">
          <div className="p-6">
            {/* =================================================
                ADDRESS LABEL
            ================================================= */}

            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Address Name
              </label>

              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home, Farm, Work, etc."
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                required
              />

              <p className="mt-2 text-xs text-gray-400">
                This name helps you identify the address during checkout.
              </p>
            </div>

            {/* =================================================
                LOCATION
            ================================================= */}

            <div className="mb-6">
              <h3 className="mb-1 text-sm font-extrabold text-gray-800">
                Delivery Location
              </h3>

              <p className="mb-5 text-xs text-gray-500">
                Select your actual Philippine location. Delivery availability is
                checked against the farm's configured delivery areas.
              </p>

              {deliveryAreas.length === 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-700">
                    No delivery areas are currently available.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Country
                    </label>
                    <div className="flex h-12 items-center rounded-xl border border-gray-200 bg-gray-100 px-4 text-sm font-semibold text-gray-700">
                      Philippines
                    </div>
                  </div>

                  {/* REGION */}

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Region
                    </label>

                    <select
                      value={selectedRegion}
                      onChange={handleRegionChange}
                      disabled={loadingRegions}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      required
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
                    </select>
                  </div>

                  {/* PROVINCE */}

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Province
                    </label>

                    <select
                      value={selectedProvince}
                      onChange={handleProvinceChange}
                      disabled={!selectedRegion || loadingProvinces}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">
                        {loadingProvinces
                          ? "Loading provinces..."
                          : "Select Province"}
                      </option>

                      {provinces.map((province) => (
                        <option key={province.code} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MUNICIPALITY */}

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Municipality
                    </label>

                    <select
                      value={selectedMunicipality}
                      onChange={handleMunicipalityChange}
                      disabled={!selectedProvince || loadingMunicipalities}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
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
                          {municipality.type ? ` (${municipality.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* BARANGAY */}

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Barangay
                    </label>

                    <select
                      value={selectedBarangay}
                      onChange={handleBarangayChange}
                      disabled={!selectedMunicipality || loadingBarangays}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">
                        {loadingBarangays
                          ? "Loading barangays..."
                          : "Select Barangay"}
                      </option>

                      {barangays.map((barangay) => (
                        <option key={barangay.code} value={barangay.name}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* =================================================
                DELIVERY AREA CONFIRMATION
            ================================================= */}

            {selectedDeliveryArea && (
              <div className="mb-6 flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <MapPin size={19} className="mt-0.5 shrink-0 text-[#1749D1]" />

                <div>
                  <p className="text-sm font-bold text-green-700">
                    Delivery available
                  </p>

                  <p className="mt-1 text-xs leading-5 text-green-700">
                    {selectedBarangay}, {selectedMunicipality},{" "}
                    {selectedProvince}, {selectedRegion}
                    <span className="mt-1 block text-[11px] font-medium text-green-600">
                      Your location matches an active delivery area.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* =================================================
                DETAILED ADDRESS
            ================================================= */}

            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Detailed Address
              </label>

              <textarea
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                placeholder="House number, street, sitio, landmark, etc."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                required
              />

              <p className="mt-2 text-xs text-gray-400">
                Enter the specific location within the selected barangay.
              </p>
            </div>

            {/* =================================================
                MAP
            ================================================= */}

            {selectedBarangay && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200">
                <div className="flex flex-col justify-between gap-3 border-b border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <MapPin size={20} className="text-[#1749D1]" />
                    </div>

                    <div>
                      <p className="text-sm font-extrabold text-gray-800">
                        Pin Your Delivery Location
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Click the map to place your delivery location.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={loadingMap}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <Navigation size={14} />
                    Use My Location
                  </button>
                </div>

                {loadingMap ? (
                  <div className="flex h-80 items-center justify-center">
                    <div className="text-center">
                      <Loader2
                        size={32}
                        className="mx-auto animate-spin text-[#1749D1]"
                      />

                      <p className="mt-3 text-sm font-bold text-gray-700">
                        Locating {selectedBarangay}...
                      </p>
                    </div>
                  </div>
                ) : mapError ? (
                  <div className="p-5">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-bold text-red-700">
                        Unable to load map location
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-600">
                        {mapError}
                      </p>
                    </div>
                  </div>
                ) : mapCenter ? (
                  <>
                    <MapContainer
                      key={`${mapCenter.lat}-${mapCenter.lng}`}
                      center={[mapCenter.lat, mapCenter.lng]}
                      zoom={15}
                      scrollWheelZoom={true}
                      className="h-[350px] w-full"
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapCenter center={mapCenter} />

                      <MapPinSelector
                        position={mapPosition}
                        onSelect={setMapPosition}
                      />
                    </MapContainer>

                    <div className="border-t border-gray-100 p-4">
                      {mapPosition ? (
                        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2
                              size={20}
                              className="mt-0.5 shrink-0 text-green-600"
                            />

                            <div>
                              <p className="text-sm font-extrabold text-green-700">
                                Location selected
                              </p>

                              <p className="mt-1 text-xs leading-5 text-green-700">
                                Your delivery pin has been selected.
                              </p>

                              <p className="mt-2 text-[11px] font-medium text-green-600">
                                Latitude: {mapPosition.lat.toFixed(6)}
                                <br />
                                Longitude: {mapPosition.lng.toFixed(6)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                          <p className="text-sm font-bold text-orange-700">
                            Pin required
                          </p>

                          <p className="mt-1 text-xs leading-5 text-orange-600">
                            Click the map or use My Location to pin your exact
                            delivery location.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* =================================================
                DEFAULT ADDRESS
            ================================================= */}

            <label className="mb-2 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-blue-300">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#1749D1]"
              />

              <div>
                <p className="text-sm font-bold text-gray-800">
                  Set as default delivery address
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  This address will automatically be selected for your next
                  orders.
                </p>
              </div>
            </label>
          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || deliveryAreas.length === 0}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1749D1] px-6 text-sm font-bold text-white transition hover:bg-[#102d79] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Save Address
                </>
              )}
            </button>
          </div>
        </form>

        {/* VALIDATION / ERROR MESSAGE MODAL */}
        {error && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/55 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="checkout-address-error-title"
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <X size={19} />
                  </div>
                  <h3
                    id="checkout-address-error-title"
                    className="text-base font-extrabold text-[#122B5C]"
                  >
                    Unable to Continue
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close error message"
                  onClick={() => setError("")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="mt-5 h-11 w-full rounded-xl bg-[#1749D1] text-sm font-bold text-white transition hover:bg-[#102d79]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

/* ============================================================
   MAIN CHECKOUT
============================================================ */

const CustomerCheckout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { cart, cartCount, cartTotal, clearCart } = useCart();

  const [loading, setLoading] = useState(false);

  /* ==========================================================
     DIRECT CHECKOUT
  ========================================================== */

  const directCheckoutItem =
    (
      location.state as {
        checkoutItem?: DirectCheckoutItem;
      } | null
    )?.checkoutItem ?? null;

  const isDirectCheckout = Boolean(directCheckoutItem);

  /*
   * Normalize both checkout modes into one item array.
   * Direct Checkout uses only the product/quantity selected
   * from the product page. Normal Checkout uses the cart.
   */
  const checkoutItems = isDirectCheckout
    ? [
        {
          id: directCheckoutItem!.id,
          name: directCheckoutItem!.name,
          price: Number(directCheckoutItem!.price),
          cartQuantity: Number(directCheckoutItem!.quantity),
          image: directCheckoutItem!.image,
          selling_type: directCheckoutItem!.selling_type || "kilogram",
          available_weight_kg: directCheckoutItem!.available_weight_kg,
          available_pieces: directCheckoutItem!.available_pieces,
        },
      ]
    : cart;

  const checkoutCount = isDirectCheckout ? 1 : cartCount;

  const checkoutTotal = isDirectCheckout
    ? Number(directCheckoutItem!.price) * Number(directCheckoutItem!.quantity)
    : cartTotal;

  /* ==========================================================
     DELIVERY AREAS
  ========================================================== */

  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);

  const [loadingDeliveryAreas, setLoadingDeliveryAreas] = useState(true);

  /* ==========================================================
     SAVED ADDRESSES
  ========================================================== */

  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);

  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );

  const [showAddressSelector, setShowAddressSelector] = useState(false);

  const [showAddAddressModal, setShowAddAddressModal] = useState(false);

  /* ==========================================================
     FORM
  ========================================================== */

  const [form, setForm] = useState({
    customer_name: "",
    customer_contact: "",
    delivery_method: "delivery" as DeliveryMethod,
    customer_note: "",
    payment_method: "cod" as PaymentMethod,
  });

  /* ==========================================================
     LOAD DELIVERY AREAS
  ========================================================== */

  useEffect(() => {
    const loadDeliveryAreas = async () => {
      try {
        setLoadingDeliveryAreas(true);

        const response = await api.get("/delivery-areas");

        console.log("Delivery areas response:", response.data);

        const areas = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        const activeAreas = areas.filter(
          (area: DeliveryArea) =>
            area.is_active === true ||
            area.is_active === 1 ||
            area.is_active === undefined,
        );

        setDeliveryAreas(activeAreas);
      } catch (error: any) {
        console.error("Failed to load delivery areas:", error);

        setDeliveryAreas([]);
      } finally {
        setLoadingDeliveryAreas(false);
      }
    };

    loadDeliveryAreas();
  }, []);

  /* ==========================================================
     LOAD SAVED ADDRESSES
  ========================================================== */

  const loadSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);

      const response = await api.get("/delivery-addresses");

      console.log("Saved addresses response:", response.data);

      const addresses = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setSavedAddresses(addresses);

      /*
       * Automatically select default address.
       */

      const defaultAddress = addresses.find((address: DeliveryAddress) =>
        Boolean(address.is_default),
      );

      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (addresses.length > 0) {
        /*
         * Safety fallback if the backend
         * somehow has no default.
         */

        setSelectedAddressId(addresses[0].id);
      } else {
        setSelectedAddressId(null);
      }
    } catch (error: any) {
      console.error("Failed to load saved delivery addresses:", error);

      setSavedAddresses([]);
      setSelectedAddressId(null);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadSavedAddresses();
  }, []);

  /* ==========================================================
     AUTOMATICALLY OPEN ADDRESS MODAL
     WHEN CUSTOMER HAS NO ADDRESS
  ========================================================== */

  useEffect(() => {
    if (
      !loadingAddresses &&
      form.delivery_method === "delivery" &&
      savedAddresses.length === 0
    ) {
      setShowAddAddressModal(true);
    }
  }, [loadingAddresses, savedAddresses.length, form.delivery_method]);

  /* ==========================================================
     SELECTED ADDRESS
  ========================================================== */

  const selectedAddress = useMemo(() => {
    if (selectedAddressId === null) {
      return null;
    }

    return (
      savedAddresses.find((address) => address.id === selectedAddressId) || null
    );
  }, [savedAddresses, selectedAddressId]);

  /* ==========================================================
     SELECTED DELIVERY AREA
  ========================================================== */

  const selectedDeliveryArea = useMemo(() => {
    if (!selectedAddress) {
      return null;
    }

    return (
      deliveryAreas.find(
        (area) =>
          (area.country === selectedAddress.country || area.country === ALL) &&
          (area.region === selectedAddress.region || area.region === ALL) &&
          (area.province === selectedAddress.province ||
            area.province === ALL) &&
          (area.municipality === selectedAddress.municipality ||
            area.municipality === ALL) &&
          (area.barangay === selectedAddress.barangay || area.barangay === ALL),
      ) || null
    );
  }, [deliveryAreas, selectedAddress]);

  /* ==========================================================
     FORMAT PRICE
  ========================================================== */

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(price) || 0);
  };

  /* ==========================================================
     FORM CHANGE
  ========================================================== */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /* ==========================================================
     DELIVERY METHOD
  ========================================================== */

  const handleDeliveryMethodChange = (method: DeliveryMethod) => {
    setForm((current) => ({
      ...current,

      delivery_method: method,

      payment_method: method === "pickup" ? "paymongo" : current.payment_method,
    }));

    if (method === "delivery") {
      /*
       * If the customer has no saved address,
       * immediately show the add-address modal.
       */

      if (savedAddresses.length === 0) {
        setShowAddAddressModal(true);
      } else {
        /*
         * Make sure default is selected.
         */

        const defaultAddress = savedAddresses.find(
          (address) => address.is_default,
        );

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      }
    }
  };

  /* ==========================================================
     PAYMENT METHOD
  ========================================================== */

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setForm((current) => ({
      ...current,
      payment_method: method,
    }));
  };

  /* ==========================================================
     ADDRESS SAVED
  ========================================================== */

  const handleAddressSaved = async (address: DeliveryAddress) => {
    /*
     * Reload all addresses so the new
     * default state is guaranteed to match
     * the backend.
     */

    await loadSavedAddresses();

    /*
     * Immediately select the newly saved address.
     */

    setSelectedAddressId(address.id);

    setShowAddressSelector(false);
  };

  /* ==========================================================
     FULL ADDRESS
  ========================================================== */

  const getFullDeliveryAddress = () => {
    if (!selectedAddress) {
      return "";
    }

    const location = [
      selectedAddress.barangay,
      selectedAddress.municipality,
      selectedAddress.province,
      selectedAddress.region,
      selectedAddress.country,
    ]
      .filter(Boolean)
      .join(", ");

    if (!selectedAddress.detailed_address) {
      return location;
    }

    return `${selectedAddress.detailed_address}, ${location}`;
  };

  /* ==========================================================
     PLACE ORDER
  ========================================================== */

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    /* ------------------------------------------------------
         CHECKOUT ITEMS
      ------------------------------------------------------ */

    if (checkoutItems.length === 0) {
      alert("There are no items to checkout.");

      navigate("/customer/cart");

      return;
    }

    /* ------------------------------------------------------
         NAME
      ------------------------------------------------------ */

    if (!form.customer_name.trim()) {
      alert("Please enter your name.");

      return;
    }

    /* ------------------------------------------------------
         CONTACT
      ------------------------------------------------------ */

    if (!form.customer_contact.trim()) {
      alert("Please enter your contact number.");

      return;
    }

    /* ------------------------------------------------------
         DELIVERY
      ------------------------------------------------------ */

    if (form.delivery_method === "delivery") {
      /*
       * No saved address.
       */

      if (savedAddresses.length === 0) {
        alert("Please add a delivery address before placing your order.");

        setShowAddAddressModal(true);

        return;
      }

      /*
       * No selected address.
       */

      if (!selectedAddress) {
        alert("Please select a delivery address.");

        setShowAddressSelector(true);

        return;
      }

      /*
       * Make sure the address is still
       * inside an active delivery area.
       */

      if (!selectedDeliveryArea) {
        alert(
          "Your selected delivery address is no longer available for delivery. Please choose another address.",
        );

        return;
      }

      /*
       * Make sure detailed address exists.
       */

      if (!selectedAddress.detailed_address.trim()) {
        alert(
          "Your selected delivery address is incomplete. Please update it from Settings.",
        );

        return;
      }

      /*
       * Make sure map coordinates exist.
       */

      if (
        selectedAddress.latitude === null ||
        selectedAddress.longitude === null
      ) {
        alert(
          "Your selected delivery address does not have a map location. Please update it from Settings.",
        );

        return;
      }
    }

    /* ------------------------------------------------------
         COD
      ------------------------------------------------------ */

    if (form.payment_method === "cod" && form.delivery_method === "pickup") {
      alert("Cash on Delivery is only available for delivery orders.");

      return;
    }

    setLoading(true);

    try {
      /* ====================================================
           ORDER PAYLOAD
        ==================================================== */

      const payload = {
        customer_name: form.customer_name.trim(),

        customer_contact: form.customer_contact.trim(),

        order_type: "customer",

        status: "pending",

        delivery_method: form.delivery_method,

        /*
         * IMPORTANT:
         * Save the selected saved delivery address ID.
         * The address record contains the detailed address
         * and the map latitude/longitude.
         */

        delivery_address_id:
          form.delivery_method === "delivery"
            ? (selectedAddress?.id ?? null)
            : null,

        customer_note: form.customer_note.trim() || null,

        payment_method: form.payment_method,

        items: checkoutItems.map((item) => ({
          product_id: item.id,

          quantity: Number(item.cartQuantity),

          /*
           * Keep selling type if your backend uses it.
           */
          selling_type: item.selling_type || "kilogram",
        })),
      };

      console.log("Submitting order:", payload);

      /* ====================================================
           PAYMONGO
        ==================================================== */

      if (form.payment_method === "paymongo") {
        const response = await api.post("/orders/paymongo", payload);

        console.log("PayMongo response:", response.data);

        const checkoutUrl =
          response.data?.checkout_url ||
          response.data?.data?.checkout_url ||
          response.data?.data?.attributes?.checkout_url;

        if (!checkoutUrl) {
          throw new Error(
            "PayMongo checkout URL was not returned by the server.",
          );
        }

        /*
         * Do NOT clear the cart yet.
         *
         * Payment still needs to be completed.
         */

        window.location.href = checkoutUrl;

        return;
      }

      /* ====================================================
           CASH ON DELIVERY
        ==================================================== */

      const response = await api.post("/orders", payload);

      console.log("Order response:", response.data);

      /*
       * Only clear cart after successful
       * order creation.
       */

      /*
       * Direct Checkout does not use the cart, so the
       * customer's existing cart must remain untouched.
       */
      if (!isDirectCheckout) {
        clearCart();
      }

      navigate("/customer/orders", {
        replace: true,
      });
    } catch (error: any) {
      console.error("Checkout failed:", error);

      console.error("Server response:", error.response?.data);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Unable to place your order.";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     EMPTY CART
  ========================================================== */

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[#F7F9FC]">
        
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="mx-auto max-w-3xl rounded-3xl border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <ShoppingCart size={38} className="text-[#1749D1]" />
              </div>

              <h1 className="mt-6 text-2xl font-extrabold text-[#1749D1]">
                Your cart is empty
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Add products to your cart before proceeding to checkout.
              </p>

              <button
                type="button"
                onClick={() => navigate("/customer/dashboard")}
                className="mt-7 rounded-xl bg-[#1749D1] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#102d79]"
              >
                Browse Products
              </button>
            </div>
          </div>
        
      </div>
    );
  }

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC]">
      
        <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="mb-5 rounded-2xl bg-gradient-to-br from-[#1749D1] via-[#1749D1] to-[#102d79] p-5 text-white shadow-lg sm:mb-7 sm:p-7">
            <button
              type="button"
              onClick={() =>
                navigate(
                  isDirectCheckout ? "/customer/dashboard" : "/customer/cart",
                )
              }
              className="mb-4 flex items-center gap-2 text-xs font-bold text-blue-100 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              {isDirectCheckout ? "Back to Products" : "Back to Cart"}
            </button>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-7 rounded-full bg-[#F59E0B]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                  Checkout
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Complete Your Order
              </h1>

              <p className="mt-1 max-w-xl text-xs leading-5 text-blue-100 sm:text-sm">
                Enter your information and choose your payment method.
              </p>

              {isDirectCheckout && (
                <div className="mt-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white ring-1 ring-white/10">
                  Direct Checkout
                </div>
              )}
            </div>
          </div>

          {/* ==================================================
              CHECKOUT
          ================================================== */}

          <form
            onSubmit={handlePlaceOrder}
            className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
          >
            <div className="space-y-6">
              {/* =================================================
                  CUSTOMER INFORMATION
              ================================================= */}

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <MapPin size={20} className="text-[#1749D1]" />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-[#1749D1]">
                      Customer Information
                    </h2>

                    <p className="text-xs text-gray-500">
                      Enter your contact information.
                    </p>
                  </div>
                </div>

                {/* NAME */}

                <div>
                  <label
                    htmlFor="customer_name"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="customer_name"
                    name="customer_name"
                    type="text"
                    value={form.customer_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    required
                  />
                </div>

                {/* CONTACT */}

                <div className="mt-5">
                  <label
                    htmlFor="customer_contact"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Contact Number
                  </label>

                  <input
                    id="customer_contact"
                    name="customer_contact"
                    type="tel"
                    value={form.customer_contact}
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* =================================================
                  DELIVERY METHOD
              ================================================= */}

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                    <Truck size={20} className="text-orange-500" />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-[#1749D1]">
                      Delivery Method
                    </h2>

                    <p className="text-xs text-gray-500">
                      Choose how you want to receive your order.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* DELIVERY */}

                  <button
                    type="button"
                    onClick={() => handleDeliveryMethodChange("delivery")}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                      form.delivery_method === "delivery"
                        ? "border-[#1749D1] bg-blue-50 ring-1 ring-[#1749D1]"
                        : "border-gray-200 bg-gray-50 hover:border-blue-300"
                    }`}
                  >
                    <Truck size={22} />

                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        Delivery
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Have your order delivered.
                      </p>
                    </div>
                  </button>

                  {/* PICKUP */}

                  <button
                    type="button"
                    onClick={() => handleDeliveryMethodChange("pickup")}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                      form.delivery_method === "pickup"
                        ? "border-[#1749D1] bg-blue-50 ring-1 ring-[#1749D1]"
                        : "border-gray-200 bg-gray-50 hover:border-blue-300"
                    }`}
                  >
                    <Store size={22} />

                    <div>
                      <p className="text-sm font-bold text-gray-800">Pickup</p>

                      <p className="mt-1 text-xs text-gray-500">
                        Pick up your order from the farm.
                      </p>
                    </div>
                  </button>
                </div>

                {/* =================================================
                    SAVED DELIVERY ADDRESS
                ================================================= */}

                {form.delivery_method === "delivery" && (
                  <div className="mt-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-800">
                          Delivery Address
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          Your default address is automatically selected.
                        </p>
                      </div>

                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAddressSelector((current) => !current)
                          }
                          className="text-xs font-bold text-[#1749D1] hover:underline"
                        >
                          {showAddressSelector ? "Close" : "Change Address"}
                        </button>
                      )}
                    </div>

                    {/* LOADING */}

                    {loadingAddresses ? (
                      <div className="flex h-28 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2
                            size={18}
                            className="animate-spin text-[#1749D1]"
                          />
                          Loading saved addresses...
                        </div>
                      </div>
                    ) : savedAddresses.length === 0 ? (
                      /* NO ADDRESS */

                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500">
                            <MapPin size={21} />
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-extrabold text-gray-800">
                              No delivery address saved
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-600">
                              Add a delivery address to continue with delivery.
                              Your first saved address will automatically become
                              your default address.
                            </p>

                            <button
                              type="button"
                              onClick={() => setShowAddAddressModal(true)}
                              className="mt-4 flex items-center gap-2 rounded-xl bg-[#1749D1] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#102d79]"
                            >
                              <Plus size={16} />
                              Add Delivery Address
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* =================================================
                            SELECTED ADDRESS
                        ================================================= */}

                        {selectedAddress && (
                          <div className="rounded-2xl border border-[#1749D1] bg-blue-50 p-5 ring-1 ring-[#1749D1]">
                            <div className="flex items-start gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1749D1]">
                                <Home size={21} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-extrabold text-gray-800">
                                    {selectedAddress.label}
                                  </p>

                                  {selectedAddress.is_default && (
                                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                                      Default
                                    </span>
                                  )}

                                  <span className="rounded-full bg-[#1749D1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Selected
                                  </span>
                                </div>

                                <p className="mt-2 text-sm leading-6 text-gray-700">
                                  {selectedAddress.detailed_address}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                  {selectedAddress.barangay},{" "}
                                  {selectedAddress.municipality},{" "}
                                  {selectedAddress.province},{" "}
                                  {selectedAddress.region}
                                </p>

                                {selectedAddress.latitude !== null &&
                                  selectedAddress.longitude !== null && (
                                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-green-600">
                                      <CheckCircle2 size={15} />
                                      Map location saved
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* =================================================
                            ADDRESS SELECTOR
                        ================================================= */}

                        {showAddressSelector && (
                          <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              Saved Addresses
                            </p>

                            {savedAddresses.map((address) => {
                              const isSelected =
                                selectedAddressId === address.id;

                              return (
                                <button
                                  key={address.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAddressId(address.id);

                                    setShowAddressSelector(false);
                                  }}
                                  className={`w-full rounded-xl border p-4 text-left transition ${
                                    isSelected
                                      ? "border-[#1749D1] bg-white ring-1 ring-[#1749D1]"
                                      : "border-gray-200 bg-white hover:border-blue-300"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1749D1]">
                                      <Home size={17} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-gray-800">
                                          {address.label}
                                        </p>

                                        {address.is_default && (
                                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase text-green-700">
                                            Default
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 text-xs leading-5 text-gray-600">
                                        {address.detailed_address}
                                      </p>

                                      <p className="text-xs leading-5 text-gray-500">
                                        {address.barangay},{" "}
                                        {address.municipality},{" "}
                                        {address.province}
                                      </p>
                                    </div>

                                    {isSelected && (
                                      <CheckCircle2
                                        size={20}
                                        className="shrink-0 text-[#1749D1]"
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            })}

                            {/* ADD NEW */}

                            <button
                              type="button"
                              onClick={() => setShowAddAddressModal(true)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#1749D1] bg-white py-3 text-xs font-bold text-[#1749D1] transition hover:bg-blue-50"
                            >
                              <Plus size={16} />
                              Add New Address
                            </button>
                          </div>
                        )}

                        {/* ADD ADDRESS BUTTON */}

                        {!showAddressSelector && (
                          <button
                            type="button"
                            onClick={() => setShowAddAddressModal(true)}
                            className="mt-3 flex items-center gap-2 text-xs font-bold text-[#1749D1] hover:underline"
                          >
                            <Plus size={15} />
                            Add another delivery address
                          </button>
                        )}

                        {/* INVALID AREA WARNING */}

                        {selectedAddress && !selectedDeliveryArea && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-bold text-red-700">
                              This address is no longer available for delivery.
                            </p>

                            <p className="mt-1 text-xs leading-5 text-red-600">
                              Please select another saved address or add a new
                              one.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* =================================================
                    PICKUP
                ================================================= */}

                {form.delivery_method === "pickup" && (
                  <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex gap-3">
                      <Store
                        size={19}
                        className="mt-0.5 shrink-0 text-orange-500"
                      />

                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          Pickup selected
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-600">
                          You will pick up your order from the farm.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================
                  ORDER NOTES
              ================================================= */}

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                    <Package size={20} className="text-orange-500" />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-[#1749D1]">
                      Order Notes
                    </h2>

                    <p className="text-xs text-gray-500">
                      Add any special instructions.
                    </p>
                  </div>
                </div>

                <textarea
                  id="customer_note"
                  name="customer_note"
                  value={form.customer_note}
                  onChange={handleChange}
                  placeholder="Optional notes for your order..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              {/* =================================================
                  PAYMENT
              ================================================= */}

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <CreditCard size={20} className="text-[#1749D1]" />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-[#1749D1]">
                      Payment Method
                    </h2>

                    <p className="text-xs text-gray-500">
                      Choose your payment method.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* COD */}

                  <button
                    type="button"
                    disabled={form.delivery_method === "pickup"}
                    onClick={() => handlePaymentMethodChange("cod")}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      form.payment_method === "cod"
                        ? "border-orange-400 bg-orange-50 ring-1 ring-orange-400"
                        : "border-gray-200 bg-gray-50"
                    } ${
                      form.delivery_method === "pickup"
                        ? "cursor-not-allowed opacity-40"
                        : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                      <WalletCards size={21} className="text-orange-500" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Pay when your order arrives.
                      </p>
                    </div>
                  </button>

                  {/* PAYMONGO */}

                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange("paymongo")}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      form.payment_method === "paymongo"
                        ? "border-[#1749D1] bg-blue-50 ring-1 ring-[#1749D1]"
                        : "border-gray-200 bg-gray-50 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                      <CreditCard size={21} className="text-[#1749D1]" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        PayMongo
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Pay securely online.
                      </p>
                    </div>
                  </button>
                </div>

                {form.payment_method === "paymongo" && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs leading-5 text-blue-800">
                      You will be redirected to the secure PayMongo checkout
                      page to complete your payment.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                RIGHT SIDE
            ================================================== */}

            <div>
              <div className="sticky top-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* HEADER */}

                <div className="bg-gradient-to-r from-[#1749D1] to-[#102d79] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
                      <Package size={19} className="text-white" />
                    </div>

                    <div>
                      <h2 className="font-extrabold text-white">
                        Order Summary
                      </h2>

                      <p className="text-xs text-blue-100">
                        {checkoutCount} item
                        {checkoutCount !== 1 ? "s" : ""}
                        {isDirectCheckout && (
                          <span className="ml-1 text-blue-200">
                            • Direct Checkout
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ITEMS */}

                <div className="max-h-[420px] overflow-y-auto p-5">
                  {checkoutItems.map((item) => {
                    const itemTotal =
                      Number(item.price) * Number(item.cartQuantity);

                    return (
                      <div
                        key={item.id}
                        className="flex gap-3 border-b border-gray-100 py-4 first:pt-0 last:border-b-0"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package size={24} className="text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#1749D1]">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {Number(item.cartQuantity).toFixed(1)} kg ×{" "}
                            {formatPrice(Number(item.price))}
                          </p>

                          <p className="mt-1 text-sm font-extrabold text-gray-800">
                            {formatPrice(itemTotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DIRECT CHECKOUT NOTICE */}

                {isDirectCheckout && (
                  <div className="border-t border-gray-100 px-5 pt-5">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-bold text-[#1749D1]">
                        Direct Checkout
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Only the selected product and quantity will be included
                        in this order. Your existing cart will not be changed.
                      </p>
                    </div>
                  </div>
                )}

                {/* TOTAL */}

                <div className="border-t border-gray-100 p-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>

                    <span className="font-bold text-gray-800">
                      {formatPrice(checkoutTotal)}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-gray-500">Selling Unit</span>

                    <span className="font-bold text-gray-800">Kilogram</span>
                  </div>

                  <div className="my-5 border-t border-dashed border-gray-200" />

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">
                        Total
                      </p>

                      <p className="mt-1 text-3xl font-extrabold text-[#1749D1]">
                        {formatPrice(checkoutTotal)}
                      </p>
                    </div>

                    <CheckCircle2 size={28} className="text-gray-300" />
                  </div>

                  {/* =================================================
                      RECEIVING
                  ================================================= */}

                  <div className="mt-5 rounded-xl bg-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Receiving Method
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      {form.delivery_method === "delivery" ? (
                        <>
                          <Truck size={17} className="text-[#1749D1]" />

                          <span className="text-sm font-bold text-gray-700">
                            Delivery
                          </span>
                        </>
                      ) : (
                        <>
                          <Store size={17} className="text-[#1749D1]" />

                          <span className="text-sm font-bold text-gray-700">
                            Pickup
                          </span>
                        </>
                      )}
                    </div>

                    {/* SELECTED ADDRESS */}

                    {form.delivery_method === "delivery" && selectedAddress && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Delivery Address
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-gray-700">
                          {selectedAddress.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {selectedAddress.detailed_address}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {selectedAddress.barangay},{" "}
                          {selectedAddress.municipality},{" "}
                          {selectedAddress.province}
                        </p>
                      </div>
                    )}

                    {/* MAP */}

                    {form.delivery_method === "delivery" &&
                      selectedAddress &&
                      selectedAddress.latitude !== null &&
                      selectedAddress.longitude !== null && (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Map Location
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-green-600">
                            <CheckCircle2 size={14} />
                            Pin saved
                          </p>
                        </div>
                      )}
                  </div>

                  {/* PAYMENT */}

                  <div className="mt-3 rounded-xl bg-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Payment
                    </p>

                    <p className="mt-1 text-sm font-bold text-gray-700">
                      {form.payment_method === "paymongo"
                        ? "PayMongo"
                        : "Cash on Delivery"}
                    </p>
                  </div>

                  {/* =================================================
                      BUTTON
                  ================================================= */}

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      loadingAddresses ||
                      (form.delivery_method === "delivery" &&
                        (savedAddresses.length === 0 ||
                          !selectedAddress ||
                          !selectedDeliveryArea))
                    }
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1749D1] text-sm font-bold text-white shadow-sm transition hover:bg-[#102d79] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : form.payment_method === "paymongo" ? (
                      <>
                        <CreditCard size={18} />
                        Pay with PayMongo
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Place Order
                      </>
                    )}
                  </button>

                  <p className="mt-4 text-center text-xs leading-5 text-gray-400">
                    Please make sure your information and order details are
                    correct.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      

      {/* ========================================================
          ADD ADDRESS MODAL
      ======================================================== */}

      <AddAddressModal
        open={showAddAddressModal}
        deliveryAreas={deliveryAreas}
        existingAddressCount={savedAddresses.length}
        onClose={() => setShowAddAddressModal(false)}
        onSaved={handleAddressSaved}
      />
    </div>
  );
};

export default CustomerCheckout;
