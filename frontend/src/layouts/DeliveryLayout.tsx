import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Truck, LogOut, Menu, X, Package, User } from "lucide-react";

import api from "../lib/api";
import Topbar from "../components/Topbar";

const DELIVERY_BLUE = "#17365D";
const DELIVERY_ORANGE = "#F59E0B";

const menuItems = [
  {
    name: "Dashboard",
    path: "/delivery/dashboard",
    icon: Package,
  },
  {
    name: "Deliveries",
    path: "/delivery/deliveries",
    icon: Truck,
  },
  {
    name: "My Profile",
    path: "/delivery/profile",
    icon: User,
  },
];

interface DeliveryLayoutProps {
  children?: React.ReactNode;
}

interface UserData {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
}

const DeliveryLayout: React.FC<DeliveryLayoutProps> = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ============================================================
  // USER
  // ============================================================

  const getStoredUser = (): UserData | null => {
    try {
      const storedUser = localStorage.getItem("craytech_user");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  };

  const [user] = useState<UserData | null>(getStoredUser);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("craytech_token");
      localStorage.removeItem("craytech_user");

      localStorage.removeItem("user");

      sessionStorage.removeItem("craytech_token");
      sessionStorage.removeItem("craytech_user");

      sessionStorage.removeItem("user");

      navigate("/login", {
        replace: true,
      });

      setLoggingOut(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {/* ======================================================
          MOBILE OVERLAY
      ====================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-slate-950/40
            lg:hidden
          "
        />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          w-64
          flex-col
          bg-gradient-to-b
          from-[#1749D1]
          to-[#102d79]
          text-white
          shadow-xl
          transition-transform
          duration-300

          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* ====================================================
            BRAND
        ==================================================== */}

        <div
          className="
            relative
            flex
            min-h-[176px]
            flex-col
            items-center
            justify-center
            border-b
            border-white/10
            px-5
          "
        >
          {/* MOBILE CLOSE */}

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="
              absolute
              right-4
              top-4
              rounded-lg
              p-2
              text-white/70
              transition
              hover:bg-white/10
              hover:text-white
              lg:hidden
            "
          >
            <X size={21} />
          </button>

          {/* LOGO */}

          <div
            className="
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-2xl
              bg-white
              shadow-lg
            "
          >
            <img
              src="/craytech-logo.png"
              alt="CRAYTECH logo"
              className="h-16 w-16 object-contain"
            />
          </div>

          {/* BRAND */}

          <h1
            className="
              mt-4
              text-center
              text-2xl
              font-extrabold
              tracking-[0.18em]
              text-white
            "
          >
            CRAYTECH
          </h1>

          <p className="mt-1 text-center text-xs font-medium text-blue-100">
            Delivery Portal
          </p>
          <span className="mt-3 h-1 w-10 rounded-full bg-[#F59E0B]" />
        </div>

        {/* ====================================================
            NAVIGATION
        ==================================================== */}

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className="
              mb-3
              px-3
              text-[10px]
              font-bold
              uppercase
              tracking-[0.18em]
              text-blue-200/70
            "
          >
            Delivery Menu
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              const currentPath = window.location.pathname;

              const isActive =
                currentPath === item.path ||
                (item.path === "/delivery/dashboard" &&
                  currentPath === "/delivery");

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`
                    group
                    flex
                    min-h-[48px]
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3.5
                    text-left
                    text-sm
                    font-medium
                    transition-all
                    duration-200

                    ${
                      isActive
                        ? "bg-white text-[#17365D] shadow-md"
                        : "text-blue-50 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      transition

                      ${
                        isActive
                          ? "bg-[#17365D]/10 text-[#17365D]"
                          : "text-blue-100 group-hover:bg-white/10 group-hover:text-white"
                      }
                    `}
                  >
                    <Icon size={19} strokeWidth={2} />
                  </span>

                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ====================================================
            ACCOUNT
        ==================================================== */}

        <div className="border-t border-white/10 p-3">
          <div className="mb-3 rounded-xl bg-white/10 px-3 py-3">
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-blue-200
              "
            >
              Logged In As
            </p>

            <p
              className="
                mt-1
                truncate
                text-sm
                font-bold
                text-white
              "
            >
              {user?.name || "Delivery Personnel"}
            </p>

            <p className="text-xs text-blue-100">Delivery Personnel</p>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="
              group
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-3.5
              py-3
              text-sm
              font-medium
              text-blue-50
              transition
              hover:bg-[#F59E0B]/15
              hover:text-white
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <span
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                transition
                group-hover:bg-[#F59E0B]/15
              "
            >
              <LogOut size={19} />
            </span>

            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN AREA
      ====================================================== */}

      <div className="min-h-screen lg:pl-64">
        {/* Shared topbar: notifications, profile, and push prompt */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* PAGE CONTENT */}
        <main
          className="
            min-h-screen
            min-w-0
            px-3
            pb-5
            pt-[88px]
            sm:px-4
            lg:px-7
            xl:px-8
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DeliveryLayout;
