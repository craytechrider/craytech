import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/* ============================================================
   USER TYPE
============================================================ */

type UserRole = "super_admin" | "admin" | "customer" | "delivery";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole | string;
  mobile_number?: string | null;
  business_name?: string | null;
  is_active?: boolean;
}

/* ============================================================
   PROTECTED ROUTE PROPS
============================================================ */

interface ProtectedRouteProps {
  role?: UserRole;
}

/* ============================================================
   ROLE-BASED REDIRECT
============================================================ */

const getDashboardPath = (role: string): string => {
  switch (role) {
    case "super_admin":
      return "/super-admin/dashboard";

    case "admin":
      return "/admin/dashboard";

    case "customer":
      return "/customer/dashboard";

    case "delivery":
      return "/delivery/dashboard";

    default:
      return "/login";
  }
};

/* ============================================================
   PROTECTED ROUTE
============================================================ */

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role }) => {
  const location = useLocation();

  const token = localStorage.getItem("craytech_token");
  const userData = localStorage.getItem("craytech_user");

  /* ==========================================================
     AUTHENTICATION CHECK
  ========================================================== */

  if (!token || !userData) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  /* ==========================================================
     PARSE USER
  ========================================================== */

  let user: User;

  try {
    user = JSON.parse(userData);
  } catch (error) {
    console.error("Invalid user data:", error);

    localStorage.removeItem("craytech_token");
    localStorage.removeItem("craytech_user");

    sessionStorage.removeItem("craytech_token");
    sessionStorage.removeItem("craytech_user");

    return <Navigate to="/login" replace />;
  }

  /* ==========================================================
     VALIDATE USER OBJECT
  ========================================================== */

  if (!user || typeof user !== "object") {
    localStorage.removeItem("craytech_token");
    localStorage.removeItem("craytech_user");

    sessionStorage.removeItem("craytech_token");
    sessionStorage.removeItem("craytech_user");

    return <Navigate to="/login" replace />;
  }

  /* ==========================================================
     NORMALIZE ROLE
  ========================================================== */

  const userRole = String(user.role || "")
    .trim()
    .toLowerCase();

  const requiredRole = String(role || "")
    .trim()
    .toLowerCase();

  /* ==========================================================
     CHECK USER ROLE
  ========================================================== */

  if (!userRole) {
    localStorage.removeItem("craytech_token");
    localStorage.removeItem("craytech_user");

    sessionStorage.removeItem("craytech_token");
    sessionStorage.removeItem("craytech_user");

    return <Navigate to="/login" replace />;
  }

  /* ==========================================================
     CHECK ACCOUNT STATUS
  ========================================================== */

  if (user.is_active === false) {
    localStorage.removeItem("craytech_token");
    localStorage.removeItem("craytech_user");

    sessionStorage.removeItem("craytech_token");
    sessionStorage.removeItem("craytech_user");

    return <Navigate to="/login" replace />;
  }

  /* ==========================================================
     ROLE AUTHORIZATION
  ========================================================== */

  if (requiredRole && userRole !== requiredRole) {
    console.warn(
      `Unauthorized. User role "${userRole}" cannot access "${requiredRole}".`,
    );

    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  /* ==========================================================
     AUTHORIZED
  ========================================================== */

  return <Outlet />;
};

export default ProtectedRoute;
