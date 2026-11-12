import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  Loader2,
  Settings as SettingsIcon,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Store,
} from "lucide-react";

import api from "../../lib/api";

// ============================================================
// COLORS
// ============================================================

const BLUE = "#1749D1";
const BLUE_DARK = "#102D79";
const NAVY = "#122B5C";
const ORANGE = "#F59E0B";

// ============================================================
// TYPES
// ============================================================

interface Profile {
  name: string;
  business_name: string;
  email: string;
  mobile_number: string;
}

type SettingsTab = "profile" | "security";

// ============================================================
// COMPONENT
// ============================================================

const Settings: React.FC = () => {
  // ============================================================
  // ACTIVE TAB
  // ============================================================

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // ============================================================
  // PROFILE
  // ============================================================

  const [profile, setProfile] = useState<Profile>({
    name: "",
    business_name: "",
    email: "",
    mobile_number: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);

  // ============================================================
  // PASSWORD
  // ============================================================

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingPassword, setSavingPassword] = useState(false);

  // ============================================================
  // MESSAGES
  // ============================================================

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadSettings();
  }, []);

  // ============================================================
  // LOAD SETTINGS
  // ============================================================

  const loadSettings = async () => {
    try {
      setLoadingProfile(true);
      setError("");

      const response = await api.get("/settings");

      console.log("Settings response:", response.data);

      const profileData =
        response.data?.data || response.data?.user || response.data;

      if (profileData) {
        setProfile({
          name: profileData.name || "",

          business_name: profileData.business_name || "",

          email: profileData.email || "",

          mobile_number:
            profileData.mobile_number ||
            profileData.phone ||
            profileData.contact_number ||
            "",
        });
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);

      setError(err?.response?.data?.message || "Unable to load settings.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // ============================================================
  // PROFILE CHANGE
  // ============================================================

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (savingProfile) {
      return;
    }

    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const response = await api.put("/settings/profile", {
        name: profile.name,

        business_name: profile.business_name,

        email: profile.email,

        mobile_number: profile.mobile_number,
      });

      console.log("Profile update response:", response.data);

      /*
       * Update locally stored user information
       * so the sidebar/header can immediately
       * display the updated information.
       */
      const storedUser = localStorage.getItem("craytech_user");

      if (storedUser) {
        try {
          const currentUser = JSON.parse(storedUser);

          const updatedUser = {
            ...currentUser,

            name: profile.name,

            business_name: profile.business_name,

            email: profile.email,

            mobile_number: profile.mobile_number,
          };

          localStorage.setItem("craytech_user", JSON.stringify(updatedUser));

          window.dispatchEvent(new Event("craytech-user-updated"));
        } catch (storageError) {
          console.error("Failed to update local user:", storageError);
        }
      }

      setMessage("Profile information updated successfully.");
    } catch (err: any) {
      console.error("Profile update error:", err);

      setError(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (savingPassword) {
      return;
    }

    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");

      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");

      return;
    }

    setSavingPassword(true);

    try {
      await api.put("/settings/password", {
        current_password: currentPassword,

        new_password: newPassword,

        new_password_confirmation: confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage("Password updated successfully.");
    } catch (err: any) {
      console.error("Password update error:", err);

      setError(err?.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
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
  // TABS
  // ============================================================

  const tabs = [
    {
      id: "profile" as SettingsTab,
      label: "Profile",
      description: "Administrator information",
      icon: User,
    },

    {
      id: "security" as SettingsTab,
      label: "Security",
      description: "Password & security",
      icon: ShieldCheck,
    },
  ];

  // ============================================================
  // INPUT CLASSES
  // ============================================================

  const inputClass = `
    w-full
    rounded-lg
    border
    border-gray-200
    bg-slate-50
    py-2.5
    pl-11
    pr-4
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

  const passwordInputClass = `
    w-full
    rounded-lg
    border
    border-gray-200
    bg-slate-50
    px-4
    py-2.5
    pr-12
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

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* HERO */}
          <section className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-[#17365D] via-[#1749D1] to-[#102D79] px-4 py-4 text-white shadow-md sm:px-5 sm:py-4 lg:px-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-28 h-60 w-60 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-100 ring-1 ring-white/10">
                  <SettingsIcon size={14} />
                  Administrator
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                    <SettingsIcon size={21} />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                      Settings
                    </h1>

                    <p className="mt-0.5 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
                      Manage your administrator account and system settings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:w-auto">
                <div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Account
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-white">
                    Administrator
                  </p>
                </div>

                <div className="rounded-lg bg-[#F59E0B]/20 px-3 py-2 ring-1 ring-orange-300/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-100">
                    Security
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-white">
                    Protected
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SUCCESS MESSAGE */}
          {message && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <div className="min-w-0">
                <p className="text-sm font-bold text-green-700">Success</p>
                <p className="mt-1 text-xs leading-5 text-green-600">
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

          {/* ERROR MESSAGE */}
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertCircle size={19} className="mt-0.5 shrink-0 text-red-600" />

              <div className="min-w-0">
                <p className="text-sm font-bold text-red-700">
                  Something went wrong
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">{error}</p>
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

          {/* SETTINGS WORKSPACE */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* MOBILE TABS */}
            <div className="border-b border-slate-200 bg-slate-50 lg:hidden">
              <div className="grid grid-cols-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        clearMessages();
                      }}
                      className={`
                        relative flex min-h-[48px] items-center justify-center gap-2
                        border-b-2 px-3 py-2 text-xs font-semibold transition
                        ${
                          active
                            ? "border-[#1749D1] bg-blue-50/70 text-[#1749D1]"
                            : "border-transparent text-slate-500 hover:bg-slate-50"
                        }
                      `}
                    >
                      <Icon size={18} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-col lg:flex-row">
              {/* DESKTOP SIDEBAR */}
              <aside className="hidden w-[210px] shrink-0 border-r border-slate-200 bg-slate-50 lg:block">
                <div className="sticky top-0 p-3 xl:p-4">
                  <div className="mb-3 flex items-center gap-2 px-2">
                    <span className="h-1.5 w-6 rounded-full bg-[#F59E0B]" />

                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Settings Menu
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            clearMessages();
                          }}
                          className={`
                            group flex w-full items-center gap-2.5 rounded-lg
                            px-2.5 py-2 text-left transition
                            ${
                              active
                                ? "bg-white text-[#1749D1] shadow-sm ring-1 ring-blue-100"
                                : "text-slate-600 hover:bg-white hover:text-[#1749D1]"
                            }
                          `}
                        >
                          <div
                            className={`
                              flex h-8 w-8 shrink-0 items-center justify-center
                              rounded-lg transition
                              ${
                                active
                                  ? "bg-blue-50 text-[#1749D1]"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-[#1749D1]"
                              }
                            `}
                          >
                            <Icon size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">{tab.label}</p>

                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {tab.description}
                            </p>
                          </div>

                          <ChevronRight
                            size={16}
                            className={
                              active
                                ? "shrink-0 text-[#1749D1]"
                                : "shrink-0 text-slate-300"
                            }
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <SettingsIcon size={16} className="text-[#1749D1]" />

                      <p className="text-xs font-extrabold text-[#1749D1]">
                        ADMIN SETTINGS
                      </p>
                    </div>

                    <p className="text-[11px] leading-5 text-blue-700">
                      Configure your business information and account security.
                    </p>
                  </div>
                </div>
              </aside>

              {/* CONTENT */}
              <section className="min-w-0 flex-1 bg-white">
                {/* PROFILE */}
                {activeTab === "profile" && (
                  <div className="p-4 sm:p-5 lg:p-6">
                    <div className="mb-5 flex items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1749D1]">
                        <User size={21} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-lg font-extrabold text-[#122B5C] sm:text-xl">
                          Profile Information
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                          Update your administrator and business information.
                        </p>
                      </div>
                    </div>

                    {loadingProfile ? (
                      <div className="flex min-h-[300px] items-center justify-center">
                        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                          <Loader2
                            size={20}
                            className="animate-spin text-[#1749D1]"
                          />
                          Loading account information...
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleProfileUpdate}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {/* NAME */}
                          <div>
                            <label
                              htmlFor="name"
                              className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                              Full Name
                            </label>

                            <div className="relative">
                              <User
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              />

                              <input
                                id="name"
                                name="name"
                                type="text"
                                value={profile.name}
                                onChange={handleProfileChange}
                                required
                                placeholder="Enter your name"
                                className={inputClass}
                              />
                            </div>
                          </div>

                          {/* BUSINESS */}
                          <div>
                            <label
                              htmlFor="business_name"
                              className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                              Business Name
                            </label>

                            <div className="relative">
                              <Store
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              />

                              <input
                                id="business_name"
                                name="business_name"
                                type="text"
                                value={profile.business_name}
                                onChange={handleProfileChange}
                                required
                                placeholder="Enter your business name"
                                className={inputClass}
                              />
                            </div>

                            <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                              This name will appear in the dashboard header and
                              throughout the system.
                            </p>
                          </div>

                          {/* EMAIL */}
                          <div>
                            <label
                              htmlFor="email"
                              className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                              Email Address
                            </label>

                            <div className="relative">
                              <Mail
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              />

                              <input
                                id="email"
                                name="email"
                                type="email"
                                value={profile.email}
                                onChange={handleProfileChange}
                                required
                                placeholder="Enter your email"
                                className={inputClass}
                              />
                            </div>
                          </div>

                          {/* PHONE */}
                          <div>
                            <label
                              htmlFor="mobile_number"
                              className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                              Phone Number
                            </label>

                            <div className="relative">
                              <Phone
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              />

                              <input
                                id="mobile_number"
                                name="mobile_number"
                                type="text"
                                value={profile.mobile_number}
                                onChange={handleProfileChange}
                                placeholder="Enter your phone number"
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#1749D1] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#102D79] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingProfile ? (
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
                      </form>
                    )}
                  </div>
                )}

                {/* SECURITY */}
                {activeTab === "security" && (
                  <div className="p-4 sm:p-5 lg:p-6">
                    <div className="mb-5 flex items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1749D1]">
                        <ShieldCheck size={21} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-lg font-extrabold text-[#122B5C] sm:text-xl">
                          Account Security
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                          Keep your administrator account secure.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handlePasswordUpdate}>
                      <div className="w-full max-w-xl space-y-4">
                        {/* CURRENT PASSWORD */}
                        <div>
                          <label
                            htmlFor="current_password"
                            className="mb-1.5 block text-xs font-semibold text-slate-600"
                          >
                            Current Password
                          </label>

                          <div className="relative">
                            <LockKeyhole
                              size={18}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                              id="current_password"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) =>
                                setCurrentPassword(e.target.value)
                              }
                              required
                              placeholder="Enter current password"
                              className={`${passwordInputClass} pl-11`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowCurrentPassword((value) => !value)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1749D1]"
                              aria-label={
                                showCurrentPassword
                                  ? "Hide current password"
                                  : "Show current password"
                              }
                            >
                              {showCurrentPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* NEW PASSWORD */}
                        <div>
                          <label
                            htmlFor="new_password"
                            className="mb-1.5 block text-xs font-semibold text-slate-600"
                          >
                            New Password
                          </label>

                          <div className="relative">
                            <LockKeyhole
                              size={18}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                              id="new_password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              minLength={8}
                              required
                              placeholder="Minimum 8 characters"
                              className={`${passwordInputClass} pl-11`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword((value) => !value)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1749D1]"
                              aria-label={
                                showNewPassword
                                  ? "Hide new password"
                                  : "Show new password"
                              }
                            >
                              {showNewPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                          <label
                            htmlFor="confirm_password"
                            className="mb-1.5 block text-xs font-semibold text-slate-600"
                          >
                            Confirm New Password
                          </label>

                          <div className="relative">
                            <LockKeyhole
                              size={18}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                              id="confirm_password"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              minLength={8}
                              required
                              placeholder="Re-enter your new password"
                              className={`${passwordInputClass} pl-11`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword((value) => !value)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#1749D1]"
                              aria-label={
                                showConfirmPassword
                                  ? "Hide confirmation password"
                                  : "Show confirmation password"
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SECURITY NOTICE */}
                      <div className="mt-5 flex w-full max-w-xl items-start gap-2.5 rounded-lg border border-orange-100 bg-orange-50 p-3">
                        <LockKeyhole
                          size={19}
                          className="mt-0.5 shrink-0 text-orange-500"
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-orange-700">
                            Password Security
                          </p>

                          <p className="mt-1 text-xs leading-5 text-orange-600">
                            Use at least 8 characters and avoid using easily
                            guessed information.
                          </p>
                        </div>
                      </div>

                      {/* BUTTON */}
                      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                          type="submit"
                          disabled={savingPassword}
                          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#1749D1] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#102D79] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingPassword ? (
                            <>
                              <Loader2 size={17} className="animate-spin" />
                              Updating Password...
                            </>
                          ) : (
                            <>
                              <LockKeyhole size={17} />
                              Change Password
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
