import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  Home,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  X,
  Loader2,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import { useState } from "react";

import api from "../lib/api";

// ============================================================
// TYPES
// ============================================================

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// ============================================================
// MENU ITEMS
// ============================================================

const menuItems = [
  {
    name: "Dashboard",
    path: "/admin/dashboard",
    icon: Home,
  },
  {
    name: "Automation",
    path: "/admin/automation",
    icon: SlidersHorizontal,
  },
  {
    name: "Sensors",
    path: "/admin/sensors",
    icon: Activity,
  },
  {
    name: "Farm Management",
    path: "/admin/farm-management",
    icon: Building2,
  },
  {
    name: "Batches",
    path: "/admin/batches",
    icon: Package,
  },
  {
    name: "Selling",
    path: "/admin/selling",
    icon: ShoppingCart,
  },
  {
    name: "Orders",
    path: "/admin/orders",
    icon: ClipboardList,
  },
  {
    name: "Delivery",
    path: "/admin/delivery",
    icon: Truck,
  },
  {
    name: "Reports",
    path: "/admin/reports",
    icon: BarChart3,
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: Settings,
  },
];

// ============================================================
// SIDEBAR
// ============================================================

function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  // ==========================================================
  // LOGOUT
  // ==========================================================

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
      // Authentication cleanup
      localStorage.removeItem("craytech_token");
      localStorage.removeItem("craytech_user");
      localStorage.removeItem("user");

      sessionStorage.removeItem("craytech_token");
      sessionStorage.removeItem("craytech_user");
      sessionStorage.removeItem("user");

      // Close mobile sidebar
      onClose?.();

      // Redirect
      navigate("/login", {
        replace: true,
      });

      setLoggingOut(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      {/* ========================================================
          MOBILE BACKDROP
      ======================================================== */}

      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="
            fixed
            inset-0
            z-[60]
            bg-slate-950/45
            backdrop-blur-[1px]
            lg:hidden
          "
        />
      )}

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-[70]
          flex
          w-64
          flex-col
          overflow-hidden
          bg-gradient-to-b
          from-[#1749D1]
          to-[#102D79]
          text-white
          shadow-2xl
          transition-transform
          duration-300
          ease-in-out

          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ======================================================
            BRAND AREA
        ====================================================== */}

        <div
          className="
            relative
            flex
            min-h-[176px]
            shrink-0
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
            onClick={onClose}
            className="
              absolute
              right-3
              top-3
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              text-white/70
              transition
              hover:bg-white/10
              hover:text-white
              lg:hidden
            "
          >
            <X size={20} />
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
              ring-1
              ring-black/5
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

          <p
            className="
              mt-1
              text-center
              text-xs
              font-medium
              text-blue-100
            "
          >
            Farm Management System
          </p>
        </div>

        {/* ======================================================
            NAVIGATION
        ====================================================== */}

        <nav
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-3
            py-5
          "
        >
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
            Main Menu
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `
                    group
                    flex
                    min-h-[48px]
                    items-center
                    gap-3
                    rounded-xl
                    px-3.5
                    text-sm
                    font-medium
                    transition-all
                    duration-200

                    ${
                      isActive
                        ? "bg-white text-[#1749D1] shadow-md"
                        : "text-blue-50 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {/* ICON */}

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
                              ? "bg-blue-50 text-[#1749D1]"
                              : "text-blue-100 group-hover:bg-white/10 group-hover:text-white"
                          }
                        `}
                      >
                        <Icon size={19} strokeWidth={2} />
                      </span>

                      {/* LABEL */}

                      <span className="min-w-0 truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* ======================================================
            LOGOUT
        ====================================================== */}

        <div
          className="
            shrink-0
            border-t
            border-white/10
            bg-black/5
            p-3
          "
        >
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
              hover:bg-red-500/20
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
                shrink-0
                items-center
                justify-center
                rounded-lg
                transition
                group-hover:bg-red-500/20
              "
            >
              {loggingOut ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <LogOut size={19} />
              )}
            </span>

            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
