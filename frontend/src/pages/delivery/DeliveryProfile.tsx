import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Save,
  X,
  Loader2,
  RefreshCw,
  Truck,
} from "lucide-react";

import api from "../../lib/api";

// ============================================================
// CONSTANTS
// ============================================================

const DELIVERY_BLUE = "#1749D1";
const DELIVERY_DARK = "#102d79";

// ============================================================
// TYPES
// ============================================================

interface UserProfile {
  id: number;
  name: string;
  email: string;
  mobile_number?: string | null;
  role: string;
  is_active?: boolean;
  business_name?: string | null;
}

interface ProfileForm {
  name: string;
  email: string;
  mobile_number: string;
}

// ============================================================
// HELPERS
// ============================================================

const getStoredUser = (): UserProfile | null => {
  try {
    /*
     * Your project has used "user" for the logged-in account.
     */

    const storedUser =
      localStorage.getItem("user") || localStorage.getItem("craytech_user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Failed to read stored user:", error);
    return null;
  }
};

// ============================================================
// DELIVERY PROFILE
// ============================================================

const DeliveryProfile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    mobile_number: "",
  });

  // ==========================================================
  // INITIALIZE FORM
  // ==========================================================

  const initializeForm = (profile: UserProfile | null) => {
    if (!profile) {
      return;
    }

    setForm({
      name: profile.name || "",
      email: profile.email || "",
      mobile_number: profile.mobile_number || "",
    });
  };

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      /*
       * Try to get the latest authenticated user
       * from Laravel.
       *
       * If your existing API already returns the
       * authenticated user through /user, this
       * will populate the latest profile.
       */

      const response = await api.get("/user");

      const responseData = response?.data;

      const profile: UserProfile =
        responseData?.data?.user ||
        responseData?.user ||
        responseData?.data ||
        responseData;

      if (profile && profile.id) {
        setUser(profile);
        initializeForm(profile);

        /*
         * Keep local storage synchronized.
         */

        localStorage.setItem("user", JSON.stringify(profile));
        localStorage.setItem("craytech_user", JSON.stringify(profile));
      } else {
        /*
         * If the endpoint doesn't return a user object,
         * keep using the locally stored account.
         */

        initializeForm(user);
      }
    } catch (requestError) {
      console.error("Failed to load delivery profile:", requestError);

      /*
       * Do not make the page unusable if the profile
       * endpoint isn't available.
       *
       * We can still display the authenticated user
       * saved during login.
       */

      initializeForm(user);

      if (!user) {
        setError("Unable to load your profile information.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOAD ON PAGE OPEN
  // ==========================================================

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    /*
     * Remove previous messages while editing.
     */

    setError("");
    setSuccess("");
  };

  // ==========================================================
  // START EDITING
  // ==========================================================

  const handleEdit = () => {
    if (!user) {
      return;
    }

    initializeForm(user);

    setError("");
    setSuccess("");
    setEditing(true);
  };

  // ==========================================================
  // CANCEL EDITING
  // ==========================================================

  const handleCancel = () => {
    initializeForm(user);

    setEditing(false);
    setError("");
    setSuccess("");
  };

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    /*
     * Basic validation.
     */

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedMobile = form.mobile_number.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!trimmedMobile) {
      setError("Mobile number is required.");
      return;
    }

    setSaving(true);

    try {
      /*
       * Update authenticated user's profile.
       *
       * Expected Laravel endpoint:
       *
       * PUT /profile
       */

      const response = await api.put("/profile", {
        name: trimmedName,
        email: trimmedEmail,
        mobile_number: trimmedMobile,
      });

      const responseData = response?.data;

      const updatedUser: UserProfile =
        responseData?.data?.user ||
        responseData?.user ||
        responseData?.data ||
        responseData;

      /*
       * If Laravel returns the updated user,
       * use it immediately.
       */

      const nextUser: UserProfile =
        updatedUser && updatedUser.id
          ? updatedUser
          : {
              ...(user as UserProfile),
              name: trimmedName,
              email: trimmedEmail,
              mobile_number: trimmedMobile,
            };

      setUser(nextUser);

      initializeForm(nextUser);

      /*
       * Keep login information synchronized.
       */

      localStorage.setItem("user", JSON.stringify(nextUser));

      localStorage.setItem("craytech_user", JSON.stringify(nextUser));

      setEditing(false);

      setSuccess("Your profile has been updated successfully.");
    } catch (requestError: any) {
      console.error("Profile update failed:", requestError);

      const backendMessage =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error;

      setError(
        backendMessage || "Unable to update your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DISPLAY VALUES
  // ==========================================================

  const initials = useMemo(() => {
    const name = user?.name || "Delivery Personnel";

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return "DP";
    }

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user?.role) {
      return "Delivery Personnel";
    }

    if (user.role.toLowerCase() === "delivery") {
      return "Delivery Personnel";
    }

    return user.role;
  }, [user]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading && !user) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2
            size={34}
            className="animate-spin"
            style={{
              color: DELIVERY_BLUE,
            }}
          />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full w-full min-w-0 overflow-x-hidden bg-gradient-to-br from-[#F4F7FC] via-[#F8FAFD] to-[#EEF3FA]">
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
        {/* ======================================================
            HERO
        ====================================================== */}

        <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#17365D] via-[#15345B] to-[#0F2948] px-4 py-6 text-white shadow-xl shadow-[#102d79]/15 ring-1 ring-white/10 sm:mb-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl sm:h-60 sm:w-60" />
          <div className="pointer-events-none absolute -bottom-24 right-16 h-48 w-48 rounded-full bg-[#F59E0B]/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-sm sm:text-xs">
                <Truck size={14} className="text-[#F59E0B]" />
                CRAYTECH Delivery Portal
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 sm:h-12 sm:w-12">
                  <User size={23} className="text-[#F59E0B]" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                    My Profile
                  </h1>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm sm:leading-6">
                    Manage your delivery personnel account and contact
                    information.
                  </p>
                </div>
              </div>
            </div>


          </div>
        </section>

        {/* ======================================================
            MESSAGES
        ====================================================== */}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:mb-5">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-700">Success</p>
              <p className="mt-1 break-words text-xs leading-5 text-emerald-600 sm:text-sm">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="shrink-0 rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:mb-5">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-red-700">
                Something went wrong
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-red-600 sm:text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded-lg p-1 text-red-600 transition hover:bg-red-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ======================================================
            MAIN PROFILE GRID
        ====================================================== */}

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
          {/* ====================================================
              PROFILE SUMMARY
          ==================================================== */}

          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/[0.04] transition-shadow hover:shadow-lg">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#17365D] via-[#17365D] to-[#0F2948] px-5 pb-6 pt-6 text-center sm:px-6 sm:pb-7 sm:pt-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10" />

              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 bg-white text-2xl font-extrabold text-[#17365D] shadow-lg sm:h-24 sm:w-24 sm:text-3xl">
                  {initials}
                </div>

                <h2 className="mt-4 truncate text-lg font-extrabold text-white sm:text-xl">
                  {user?.name || "Delivery Personnel"}
                </h2>

                <p className="mt-1 truncate text-xs text-blue-100 sm:text-sm">
                  {user?.email || "No email available"}
                </p>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white ring-1 ring-white/10 sm:text-xs">
                  <Truck size={13} className="text-[#F59E0B]" />
                  {roleLabel}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Account Status
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-slate-800">
                      {user?.is_active === false ? "Inactive" : "Active"}
                    </p>
                  </div>

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      user?.is_active === false
                        ? "bg-red-100 text-red-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-[#F59E0B]"
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-800">
                      Delivery Account
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      This account is authorized to manage customer deliveries
                      assigned by the CRAYTECH administrator.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ====================================================
              PROFILE INFORMATION
          ==================================================== */}

          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/[0.04] transition-shadow hover:shadow-lg">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17365D]/10 text-[#17365D]">
                  <User size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#17365D] sm:text-lg">
                    Personal Information
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Your account and contact information
                  </p>
                </div>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17365D] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F2948] sm:w-auto"
                >
                  <Pencil size={16} />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="p-4 sm:p-6 lg:p-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {/* NAME */}
                <div>
                  <label
                    htmlFor="delivery-profile-name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="delivery-profile-name"
                      type="text"
                      value={form.name}
                      disabled={!editing || saving}
                      onChange={(event) =>
                        handleChange("name", event.target.value)
                      }
                      className="
                        w-full min-h-[46px] rounded-xl border border-slate-200
                        bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900
                        outline-none transition
                        focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10
                        disabled:cursor-not-allowed disabled:opacity-80
                      "
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="delivery-profile-email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="delivery-profile-email"
                      type="email"
                      value={form.email}
                      disabled={!editing || saving}
                      onChange={(event) =>
                        handleChange("email", event.target.value)
                      }
                      className="
                        w-full min-h-[46px] rounded-xl border border-slate-200
                        bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900
                        outline-none transition
                        focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10
                        disabled:cursor-not-allowed disabled:opacity-80
                      "
                    />
                  </div>
                </div>

                {/* MOBILE */}
                <div>
                  <label
                    htmlFor="delivery-profile-mobile"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Mobile Number
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="delivery-profile-mobile"
                      type="tel"
                      value={form.mobile_number}
                      disabled={!editing || saving}
                      onChange={(event) =>
                        handleChange("mobile_number", event.target.value)
                      }
                      className="
                        w-full min-h-[46px] rounded-xl border border-slate-200
                        bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900
                        outline-none transition
                        focus:border-[#17365D] focus:bg-white focus:ring-4 focus:ring-[#17365D]/10
                        disabled:cursor-not-allowed disabled:opacity-80
                      "
                    />
                  </div>
                </div>

                {/* ROLE */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Account Role
                  </label>

                  <div className="relative">
                    <ShieldCheck
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={roleLabel}
                      disabled
                      className="
                        w-full min-h-[46px] rounded-xl border border-slate-200
                        bg-slate-100 py-3 pl-11 pr-4 text-sm font-semibold text-slate-600
                      "
                    />
                  </div>
                </div>
              </div>

              {/* ACCOUNT ID */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Account ID
                    </p>

                    <p className="mt-1 font-mono text-sm font-bold text-slate-700">
                      {user?.id ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </p>

                    <p
                      className={`mt-1 text-sm font-bold ${
                        user?.is_active === false
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {user?.is_active === false ? "Inactive" : "Active"}
                    </p>
                  </div>
                </div>
              </div>

              {/* EDIT ACTIONS */}
              {editing && (
                <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X size={17} />
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#17365D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F2948] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={17} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ======================================================
            ACCOUNT INFORMATION
        ====================================================== */}

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-5 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F59E0B]">
              <Truck size={19} />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">
                Delivery Personnel Account
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                Your account is used to access orders assigned to you by the
                CRAYTECH farm administrator. You can update your personal
                contact information above.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Portal keeps the refresh control fixed to the viewport, above page content and mobile browser safe areas. */}
      {createPortal(
        <button
          type="button"
          onClick={loadProfile}
          disabled={loading || saving}
          aria-label="Refresh profile"
          title="Refresh profile"
          className="fixed z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-xl shadow-amber-900/25 ring-4 ring-white/80 transition-all duration-200 hover:scale-105 hover:bg-amber-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          }}
        >
          {loading ? (
            <Loader2 size={23} className="animate-spin" />
          ) : (
            <RefreshCw size={23} />
          )}
        </button>,
        document.body
      )}
    </div>
  );
};

export default DeliveryProfile;
