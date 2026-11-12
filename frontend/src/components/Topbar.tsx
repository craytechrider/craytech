import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";

import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  CheckCheck,
  Menu,
} from "lucide-react";

import { ref, onValue, update } from "firebase/database";

import { db } from "../firebase";
import api from "../lib/api";
import {
  enablePushNotifications,
  registerIfAlreadyAllowed,
} from "../services/pushNotifications";

// ============================================================
// TYPES
// ============================================================

interface TopbarProps {
  /*
   * AdminLayout can directly control the sidebar.
   *
   * CustomerLayout can continue using:
   *
   * <Topbar />
   *
   * In that case, the existing custom event is used.
   */
  onMenuClick?: () => void;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  business_name?: string;
  mobile_number?: string;
  phone?: string;
  role: "admin" | "customer" | "delivery";
}

interface FirebaseNotification {
  user_id?: number | string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  created_at?: string | number;
  timestamp?: string | number;
}

interface NotificationItem extends FirebaseNotification {
  id: string;
  source: "firebase" | "laravel";
  read: boolean;
  title?: string;
  message?: string;
  type?: string;
  created_at?: string | number;
  timestamp?: string | number;
}

interface LaravelNotificationResponse {
  id: string;
  type?: string;
  data?: {
    title?: string;
    message?: string;
    type?: string;
    [key: string]: unknown;
  };
  read_at?: string | null;
  created_at?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();

  // ==========================================================
  // USER
  // ==========================================================

  const [user, setUser] = useState<UserData | null>(null);

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  const [firebaseNotifications, setFirebaseNotifications] = useState<
    NotificationItem[]
  >([]);
  const [laravelNotifications, setLaravelNotifications] = useState<
    NotificationItem[]
  >([]);
  const notifications = [
    ...firebaseNotifications,
    ...laravelNotifications,
  ].sort((a, b) => {
    const getTime = (item: NotificationItem) => {
      const value = item.created_at ?? item.timestamp ?? 0;
      const numeric = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
      const parsed = new Date(String(value)).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    return getTime(b) - getTime(a);
  });

  const [notificationOpen, setNotificationOpen] = useState(false);

  // ==========================================================
  // PROFILE DROPDOWN
  // ==========================================================

  const [profileOpen, setProfileOpen] = useState(false);

  // ==========================================================
  // BROWSER PUSH NOTIFICATIONS
  // ==========================================================

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  // ==========================================================
  // LOAD USER
  // ==========================================================

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("craytech_user");

      if (!storedUser) {
        setUser(null);
        return;
      }

      try {
        const parsedUser: UserData = JSON.parse(storedUser);

        setUser(parsedUser);

        console.log("Topbar user:", parsedUser);
      } catch (error) {
        console.error("Failed to parse stored user:", error);

        setUser(null);
      }
    };

    // Initial load
    loadUser();

    // Listen for changes from Settings
    window.addEventListener("craytech-user-updated", loadUser);

    return () => {
      window.removeEventListener("craytech-user-updated", loadUser);
    };
  }, []);

  // ==========================================================
  // AUTOMATIC PUSH NOTIFICATION PROMPT AFTER LOGIN
  // ==========================================================

  useEffect(() => {
    if (!user) {
      setShowPushPrompt(false);
      return;
    }

    if (!("Notification" in window)) return;

    // If permission was already granted, silently register/refresh the token.
    if (Notification.permission === "granted") {
      void registerIfAlreadyAllowed();
      return;
    }

    // A denied browser permission must be changed in browser site settings.
    if (Notification.permission === "denied") return;

    // Show the in-app prompt unless this user dismissed it on this browser.
    const dismissedKey = `craytech_push_dismissed_${user.id}`;
    if (localStorage.getItem(dismissedKey) !== "true") {
      setShowPushPrompt(true);
    }
  }, [user]);

  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushMessage("");

    const token = await enablePushNotifications();

    setPushLoading(false);

    if (token) {
      setShowPushPrompt(false);
      setPushMessage("Notifications enabled successfully.");
      if (user) {
        localStorage.removeItem(`craytech_push_dismissed_${user.id}`);
      }
      return;
    }

    if ("Notification" in window && Notification.permission === "denied") {
      setPushMessage(
        "Notifications are blocked. Please allow them in your browser's site settings.",
      );
    } else {
      setPushMessage("Unable to enable notifications. Please try again.");
    }
  };

  const handleDismissPush = () => {
    if (user) {
      localStorage.setItem(`craytech_push_dismissed_${user.id}`, "true");
    }
    setShowPushPrompt(false);
    setPushMessage("");
  };

  // ==========================================================
  // MOBILE SIDEBAR
  // ==========================================================

  const toggleSidebar = () => {
    /*
     * ADMIN
     *
     * AdminLayout passes onMenuClick directly.
     */
    if (onMenuClick) {
      onMenuClick();
      return;
    }

    /*
     * CUSTOMER
     *
     * Keep compatibility with the existing
     * CustomerSidebar implementation.
     */
    window.dispatchEvent(new Event("craytech-toggle-sidebar"));
  };

  // ==========================================================
  // FIREBASE NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    if (!user) {
      setFirebaseNotifications([]);
      setLaravelNotifications([]);
      return;
    }

    console.log("Loading Firebase notifications for user:", user.id);

    const notificationsRef = ref(db, "notifications");

    const unsubscribe = onValue(
      notificationsRef,
      (snapshot) => {
        const data = snapshot.val();

        console.log("Firebase notification data:", data);

        if (!data) {
          setFirebaseNotifications([]);
          return;
        }

        const notificationList: NotificationItem[] = [];

        // ====================================================
        // CONVERT FIREBASE OBJECT TO ARRAY
        // ====================================================

        Object.entries(data).forEach(([id, value]) => {
          const notification = value as FirebaseNotification;

          // ==================================================
          // USER FILTER
          // ==================================================

          if (
            notification.user_id !== undefined &&
            String(notification.user_id) !== String(user.id)
          ) {
            return;
          }

          notificationList.push({
            id: `firebase-${id}`,
            source: "firebase",
            ...notification,
            read: Boolean(notification.read),
          });
        });

        // ====================================================
        // SORT NEWEST FIRST
        // ====================================================

        notificationList.sort((a, b) => {
          const getTime = (notification: NotificationItem): number => {
            const value =
              notification.created_at ?? notification.timestamp ?? 0;

            // Number timestamp
            if (typeof value === "number") {
              return value;
            }

            // Numeric string timestamp
            const numericValue = Number(value);

            if (!Number.isNaN(numericValue)) {
              return numericValue;
            }

            // Firebase date string
            const dateValue = new Date(value).getTime();

            return Number.isNaN(dateValue) ? 0 : dateValue;
          };

          return getTime(b) - getTime(a);
        });

        setFirebaseNotifications(notificationList);
      },
      (error) => {
        console.error("Firebase notification listener error:", error);

        setFirebaseNotifications([]);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // ==========================================================
  // LARAVEL DATABASE NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    if (!user) {
      setLaravelNotifications([]);
      return;
    }

    let active = true;

    const loadLaravelNotifications = async () => {
      try {
        const response = await api.get("/notifications");
        const rows: LaravelNotificationResponse[] = response.data?.data ?? [];
        if (!active) return;

        const mapped: NotificationItem[] = rows.map((item) => ({
          id: `laravel-${item.id}`,
          source: "laravel",
          title: item.data?.title || "Notification",
          message: item.data?.message || "You have a new notification.",
          type: item.data?.type || "info",
          read: Boolean(item.read_at),
          created_at: item.created_at,
        }));

        setLaravelNotifications(mapped);
      } catch (error) {
        console.error("Failed to load Laravel notifications:", error);
      }
    };

    loadLaravelNotifications();
    const intervalId = window.setInterval(loadLaravelNotifications, 30000);
    const handleFocus = () => loadLaravelNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  // ==========================================================
  // UNREAD COUNT
  // ==========================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  // ==========================================================
  // MARK ONE AS READ
  // ==========================================================

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.read) return;

    try {
      if (notification.source === "firebase") {
        const firebaseId = notification.id.replace(/^firebase-/, "");
        await update(ref(db, `notifications/${firebaseId}`), { read: true });
        setFirebaseNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      } else {
        const laravelId = notification.id.replace(/^laravel-/, "");
        await api.patch(`/notifications/${laravelId}/read`);
        setLaravelNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // ==========================================================
  // MARK ALL AS READ
  // ==========================================================

  const markAllAsRead = async () => {
    try {
      const firebaseUnread = firebaseNotifications.filter((item) => !item.read);
      const laravelUnread = laravelNotifications.filter((item) => !item.read);

      if (firebaseUnread.length > 0) {
        const updates: Record<string, boolean> = {};
        firebaseUnread.forEach((item) => {
          const firebaseId = item.id.replace(/^firebase-/, "");
          updates[`notifications/${firebaseId}/read`] = true;
        });
        await update(ref(db), updates);
        setFirebaseNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
      }

      if (laravelUnread.length > 0) {
        await api.patch("/notifications/read-all");
        setLaravelNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    localStorage.removeItem("craytech_token");
    localStorage.removeItem("craytech_user");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("craytech_token");
    sessionStorage.removeItem("craytech_user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);

    navigate("/login", {
      replace: true,
    });
  };

  // ==========================================================
  // CLOSE DROPDOWNS
  // ==========================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        !target.closest(".notification-container") &&
        !target.closest(".profile-container")
      ) {
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ==========================================================
  // FORMAT NOTIFICATION DATE
  // ==========================================================

  const formatNotificationDate = (value?: string | number) => {
    if (!value) {
      return "";
    }

    try {
      let date: Date;

      if (typeof value === "number") {
        date = new Date(value);
      } else {
        const numericValue = Number(value);

        if (!Number.isNaN(numericValue)) {
          date = new Date(numericValue);
        } else {
          date = new Date(value);
        }
      }

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return date.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // ==========================================================
  // NOTIFICATION ICON
  // ==========================================================

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "order":
        return "📦";

      case "delivery_assigned":
      case "delivery_status":
        return "🚚";

      case "success":
        return "✅";

      case "warning":
        return "⚠️";

      case "error":
        return "❌";

      case "info":
        return "ℹ️";

      default:
        return "🔔";
    }
  };

  // ==========================================================
  // BUSINESS
  // ==========================================================

  const businessName = user?.business_name?.trim() || "CRAYTECH";

  // ==========================================================
  // ROLE LABEL
  // ==========================================================

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "delivery"
        ? "Delivery Personnel"
        : "Customer";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <header
        className="
        fixed
        left-0
        right-0
        top-0
        z-[30]
        h-[72px]
        border-b
        border-gray-200
        bg-white/95
        shadow-sm
        backdrop-blur
        lg:left-64
      "
      >
        <div
          className="
          flex
          h-full
          items-center
          justify-between
          px-3
          sm:px-5
          lg:px-7
        "
        >
          {/* ======================================================
            LEFT SIDE
        ====================================================== */}

          <div
            className="
            flex
            min-w-0
            items-center
            gap-3
          "
          >
            {/* ====================================================
              MOBILE BURGER
          ==================================================== */}

            <button
              type="button"
              aria-label="Open navigation"
              onClick={toggleSidebar}
              className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-gray-200
              bg-white
              text-[#17365D]
              shadow-sm
              transition
              hover:border-blue-100
              hover:bg-blue-50
              active:scale-95
              lg:hidden
            "
            >
              <Menu size={21} />
            </button>

            {/* ====================================================
              BRAND
          ==================================================== */}

            <div className="min-w-0">
              <h1
                className="
                truncate
                text-base
                font-extrabold
                tracking-tight
                text-[#17365D]
                sm:text-lg
                lg:text-xl
              "
              >
                {businessName}
              </h1>

              <div
                className="
                mt-0.5
                flex
                items-center
                gap-1.5
              "
              >
                <span
                  className="
                  h-1.5
                  w-5
                  rounded-full
                  bg-[#F59E0B]
                "
                />

                <p
                  className="
                  truncate
                  text-[9px]
                  font-semibold
                  text-gray-500
                  sm:text-[10px]
                "
                >
                  Farm Management System
                </p>
              </div>
            </div>
          </div>

          {/* ======================================================
            RIGHT SIDE
        ====================================================== */}

          <div
            className="
            flex
            shrink-0
            items-center
            gap-1
            sm:gap-2
            md:gap-3
          "
          >
            {/* ====================================================
              NOTIFICATIONS
          ==================================================== */}

            <div
              className="
              notification-container
              relative
            "
            >
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationOpen(!notificationOpen);

                  setProfileOpen(false);
                }}
                className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                text-gray-600
                transition
                hover:bg-gray-100
                active:scale-95
              "
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span
                    className="
                    absolute
                    right-0.5
                    top-0.5
                    flex
                    h-[18px]
                    min-w-[18px]
                    items-center
                    justify-center
                    rounded-full
                    border-2
                    border-white
                    bg-red-500
                    px-1
                    text-[9px]
                    font-extrabold
                    text-white
                  "
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* ==================================================
                NOTIFICATION DROPDOWN
            ================================================== */}

              {notificationOpen && (
                <div
                  className="
                  absolute
                  right-0
                  top-12
                  z-[9999]
                  w-[360px]
                  max-w-[calc(100vw-24px)]
                  overflow-hidden
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  shadow-2xl
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
                    py-4
                  "
                  >
                    <div>
                      <h3
                        className="
                        text-sm
                        font-extrabold
                        text-[#17365D]
                      "
                      >
                        Notifications
                      </h3>

                      <p
                        className="
                        mt-0.5
                        text-xs
                        text-gray-500
                      "
                      >
                        {unreadCount} unread
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="
                        flex
                        items-center
                        gap-1
                        rounded-lg
                        px-2
                        py-1.5
                        text-xs
                        font-semibold
                        text-[#1749D1]
                        hover:bg-blue-50
                      "
                      >
                        <CheckCheck size={14} />
                        Mark all
                      </button>
                    )}
                  </div>

                  {/* LIST */}

                  <div
                    className="
                    max-h-[420px]
                    overflow-y-auto
                  "
                  >
                    {notifications.length === 0 ? (
                      <div
                        className="
                        px-5
                        py-12
                        text-center
                      "
                      >
                        <div className="mb-3 text-4xl">🔔</div>

                        <p
                          className="
                          font-semibold
                          text-gray-500
                        "
                        >
                          No notifications
                        </p>

                        <p
                          className="
                          mt-1
                          text-xs
                          text-gray-400
                        "
                        >
                          You're all caught up.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => markAsRead(notification)}
                          className={`
                            w-full
                            border-b
                            border-gray-100
                            px-4
                            py-3
                            text-left
                            transition
                            hover:bg-gray-50
                            ${!notification.read ? "bg-blue-50/50" : "bg-white"}
                          `}
                        >
                          <div
                            className="
                              flex
                              gap-3
                            "
                          >
                            <div
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-gray-100
                              "
                            >
                              <span className="text-lg">
                                {getNotificationIcon(notification.type)}
                              </span>
                            </div>

                            <div
                              className="
                                min-w-0
                                flex-1
                              "
                            >
                              <div
                                className="
                                  flex
                                  items-start
                                  justify-between
                                  gap-2
                                "
                              >
                                <p
                                  className={`
                                    text-sm
                                    ${
                                      !notification.read
                                        ? "font-bold text-gray-800"
                                        : "font-semibold text-gray-700"
                                    }
                                  `}
                                >
                                  {notification.title || "Notification"}
                                </p>

                                {!notification.read && (
                                  <span
                                    className="
                                      mt-1.5
                                      h-2
                                      w-2
                                      shrink-0
                                      rounded-full
                                      bg-[#1749D1]
                                    "
                                  />
                                )}
                              </div>

                              <p
                                className="
                                  mt-1
                                  line-clamp-2
                                  text-xs
                                  text-gray-500
                                "
                              >
                                {notification.message ||
                                  "You have a new notification."}
                              </p>

                              <p
                                className="
                                  mt-2
                                  text-[10px]
                                  text-gray-400
                                "
                              >
                                {formatNotificationDate(
                                  notification.created_at ||
                                    notification.timestamp,
                                )}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ====================================================
              PROFILE
          ==================================================== */}

            <div
              className="
              profile-container
              relative
            "
            >
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(!profileOpen);

                  setNotificationOpen(false);
                }}
                className="
                flex
                items-center
                gap-2
                rounded-xl
                px-1.5
                py-1.5
                transition
                hover:bg-gray-100
              "
              >
                {/* AVATAR */}

                <div
                  className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#1749D1]
                  text-white
                  shadow-sm
                  ring-2
                  ring-blue-50
                "
                >
                  <User size={18} />
                </div>

                {/* USER */}

                <div
                  className="
                  hidden
                  max-w-[170px]
                  text-left
                  md:block
                "
                >
                  <p
                    className="
                    truncate
                    text-sm
                    font-bold
                    text-gray-800
                  "
                  >
                    {user?.name || "CRAYTECH User"}
                  </p>

                  <p
                    className="
                    truncate
                    text-[10px]
                    font-medium
                    text-gray-500
                  "
                  >
                    {roleLabel}
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className="
                  hidden
                  text-gray-500
                  sm:block
                "
                />
              </button>

              {/* ==================================================
                PROFILE DROPDOWN
            ================================================== */}

              {profileOpen && (
                <div
                  className="
                  absolute
                  right-0
                  top-12
                  z-[9999]
                  w-64
                  max-w-[calc(100vw-24px)]
                  overflow-hidden
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  shadow-2xl
                "
                >
                  {/* USER INFO */}

                  <div
                    className="
                    border-b
                    border-gray-100
                    bg-[#FAFBFD]
                    px-4
                    py-4
                  "
                  >
                    <div
                      className="
                      flex
                      items-center
                      gap-3
                    "
                    >
                      <div
                        className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#1749D1]
                        text-white
                      "
                      >
                        <User size={18} />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                          truncate
                          font-bold
                          text-gray-800
                        "
                        >
                          {user?.name || "CRAYTECH User"}
                        </p>

                        <p
                          className="
                          truncate
                          text-xs
                          text-gray-500
                        "
                        >
                          {user?.email || ""}
                        </p>
                      </div>
                    </div>

                    {/* BUSINESS */}

                    <div
                      className="
                      mt-3
                      rounded-xl
                      border
                      border-blue-100
                      bg-blue-50
                      px-3
                      py-2.5
                    "
                    >
                      <p
                        className="
                        text-[9px]
                        font-extrabold
                        uppercase
                        tracking-wider
                        text-[#1749D1]
                      "
                      >
                        Business
                      </p>

                      <p
                        className="
                        mt-0.5
                        truncate
                        text-xs
                        font-bold
                        text-[#122B5C]
                      "
                      >
                        {businessName}
                      </p>
                    </div>
                  </div>

                  {/* SETTINGS */}

                  <Link
                    to={
                      user?.role === "admin"
                        ? "/admin/settings"
                        : user?.role === "delivery"
                          ? "/delivery/profile"
                          : "/customer/settings"
                    }
                    onClick={() => setProfileOpen(false)}
                    className="
                    flex
                    items-center
                    gap-3
                    px-4
                    py-3.5
                    text-sm
                    font-medium
                    text-gray-700
                    transition
                    hover:bg-gray-50
                  "
                  >
                    <Settings size={17} />
                    {user?.role === "delivery" ? "My Profile" : "Settings"}
                  </Link>

                  {/* LOGOUT */}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="
                    flex
                    w-full
                    items-center
                    gap-3
                    border-t
                    border-gray-100
                    px-4
                    py-3.5
                    text-sm
                    font-medium
                    text-red-600
                    transition
                    hover:bg-red-50
                  "
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showPushPrompt &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-[#071629]/65 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                handleDismissPush();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="push-notification-title"
              className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl"
            >
              <div className="relative overflow-hidden bg-[#17365D] px-6 pb-7 pt-8 text-center">
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-white/10" />

                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg">
                  <Bell size={30} className="text-white" />
                </div>

                <h2
                  id="push-notification-title"
                  className="relative mt-5 text-xl font-extrabold tracking-tight text-white"
                >
                  Stay Updated with CRAYTECH
                </h2>

                <p className="relative mx-auto mt-2 max-w-xs text-sm leading-relaxed text-blue-100">
                  Get important updates about your orders, payments, deliveries,
                  and farm activities.
                </p>

                <div className="relative mx-auto mt-4 h-1 w-12 rounded-full bg-[#F59E0B]" />
              </div>

              <div className="px-6 py-6">
                <div className="space-y-4">
                  {[
                    {
                      icon: "📦",
                      title: "Order Updates",
                      description:
                        "Know when your orders are received and processed.",
                    },
                    {
                      icon: "💳",
                      title: "Payment Updates",
                      description:
                        "Receive payment confirmations and status changes.",
                    },
                    {
                      icon: "🚚",
                      title: "Delivery Updates",
                      description: "Stay informed about your order deliveries.",
                    },
                    {
                      icon: "🌊",
                      title: "Farm Activities",
                      description: "Receive important farm and system alerts.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {pushMessage && (
                  <p
                    role="status"
                    className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700"
                  >
                    {pushMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17365D] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#0F2948] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bell size={17} />
                  {pushLoading
                    ? "Enabling Notifications..."
                    : "Enable Notifications"}
                </button>

                <button
                  type="button"
                  onClick={handleDismissPush}
                  disabled={pushLoading}
                  className="mt-2 w-full rounded-xl px-5 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Maybe Later
                </button>

                <p className="mt-3 text-center text-[10px] leading-relaxed text-gray-400">
                  You can change this permission anytime in your browser
                  settings.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Topbar;
