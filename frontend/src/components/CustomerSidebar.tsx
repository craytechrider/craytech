import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Settings,
  LogOut,
  X,
  Loader2,
} from "lucide-react";

import api from "../lib/api";

interface CustomerSidebarProps {
  cartCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const BLUE = "#1749D1";
const BLUE_DARK = "#102D79";
const ORANGE = "#F59E0B";

const menuItems = [
  {
    name: "Dashboard",
    path: "/customer/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Orders",
    path: "/customer/orders",
    icon: ShoppingBag,
  },
  {
    name: "Cart",
    path: "/customer/cart",
    icon: ShoppingCart,
  },
  {
    name: "Settings",
    path: "/customer/settings",
    icon: Settings,
  },
];

const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  cartCount = 0,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  const [internalOpen, setInternalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | SIDEBAR STATE
  |--------------------------------------------------------------------------
  |
  | If the parent provides isOpen, use it.
  | Otherwise control the sidebar internally.
  |
  */

  const sidebarOpen = typeof isOpen === "boolean" ? isOpen : internalOpen;

  /*
  |--------------------------------------------------------------------------
  | BURGER EVENT FROM TOPBAR
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleToggleSidebar = () => {
      if (typeof isOpen === "boolean") {
        return;
      }

      setInternalOpen((current) => !current);
    };

    const handleOpenSidebar = () => {
      if (typeof isOpen === "boolean") {
        return;
      }

      setInternalOpen(true);
    };

    const handleCloseSidebar = () => {
      if (typeof isOpen === "boolean") {
        onClose?.();
        return;
      }

      setInternalOpen(false);
    };

    window.addEventListener("craytech-toggle-sidebar", handleToggleSidebar);

    window.addEventListener("craytech-open-sidebar", handleOpenSidebar);

    window.addEventListener("craytech-close-sidebar", handleCloseSidebar);

    return () => {
      window.removeEventListener(
        "craytech-toggle-sidebar",
        handleToggleSidebar,
      );

      window.removeEventListener("craytech-open-sidebar", handleOpenSidebar);

      window.removeEventListener("craytech-close-sidebar", handleCloseSidebar);
    };
  }, [isOpen, onClose]);

  /*
  |--------------------------------------------------------------------------
  | CLOSE
  |--------------------------------------------------------------------------
  */

  const closeSidebar = () => {
    if (typeof isOpen === "boolean") {
      onClose?.();
      return;
    }

    setInternalOpen(false);
  };

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("craytech_token");
      localStorage.removeItem("craytech_user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      sessionStorage.removeItem("craytech_token");
      sessionStorage.removeItem("craytech_user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      closeSidebar();

      navigate("/login", {
        replace: true,
      });

      setLoggingOut(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/* ==========================================================
          MOBILE OVERLAY
      ========================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
          className="
            fixed inset-0 z-[70]
            bg-slate-950/50
            backdrop-blur-[1px]
            lg:hidden
          "
        />
      )}

      {/* ==========================================================
          SIDEBAR
      ========================================================== */}

      <aside
        className={`
            fixed
            top-0
            bottom-0
            left-0
            z-[80]
            flex
            w-[280px]
            flex-col
            text-white
            shadow-2xl
            transition-transform
            duration-300
            ease-in-out
            lg:w-64
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{
          background: `linear-gradient(
            180deg,
            ${BLUE} 0%,
            ${BLUE_DARK} 100%
          )`,
        }}
      >
        {/* ========================================================
            TOP ORANGE ACCENT
        ======================================================== */}

        <div
          className="
            absolute
            left-0
            right-0
            top-0
            h-1
          "
          style={{
            backgroundColor: ORANGE,
          }}
        />

        {/* ========================================================
            BRAND
        ======================================================== */}

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
            onClick={closeSidebar}
            className="
              absolute
              right-4
              top-4
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
              className="
                h-16
                w-16
                object-contain
              "
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
            Customer Portal
          </p>
        </div>

        {/* ========================================================
            NAVIGATION
        ======================================================== */}

        <nav
          className="
            flex-1
            overflow-y-auto
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

          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) => `
                    group
                    flex
                    min-h-[50px]
                    w-full
                    items-center
                    justify-between
                    rounded-xl
                    px-3
                    text-sm
                    font-semibold
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
                      <div className="flex min-w-0 items-center gap-3">
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

                        {/* NAME */}

                        <span className="truncate">{item.name}</span>
                      </div>

                      {/* CART BADGE */}

                      {item.name === "Cart" && cartCount > 0 && (
                        <span
                          className="
                              ml-2
                              flex
                              h-[22px]
                              min-w-[22px]
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              px-1.5
                              text-[10px]
                              font-extrabold
                              text-white
                              shadow-sm
                            "
                          style={{
                            backgroundColor: ORANGE,
                          }}
                        >
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* ========================================================
            ACCOUNT AREA
        ======================================================== */}

        <div
          className="
            shrink-0
            border-t
            border-white/10
            px-3
            py-3
          "
        >
          <div
            className="
              mb-2
              rounded-xl
              border
              border-white/10
              bg-white/10
              px-3
              py-3
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-wider
                text-blue-200
              "
            >
              Account
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
              Customer
            </p>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="
              group
              flex
              min-h-[48px]
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              text-sm
              font-semibold
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
};

export default CustomerSidebar;
