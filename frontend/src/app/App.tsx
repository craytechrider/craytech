import { Routes, Route, Navigate } from "react-router-dom";

// WEBSITE ANALYTICS TRACKER
import WebsiteVisitTracker from "../components/WebsiteVisitTracker";

// PUBLIC
import Welcome from "../pages/Welcome";
import Login from "../pages/Login";
import Register from "../pages/Register";
import VerifyEmail from "../pages/VerifyEmail";
import ForgotPassword from "../pages/ForgotPassword";
import SocialAuthCallback from "../pages/SocialAuthCallback";

// PROTECTED
import ProtectedRoute from "../routes/ProtectedRoute";

// SUPER ADMIN
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import SuperAdminDashboard from "../pages/superadmin/Dashboard";
import AdminManagement from "../pages/superadmin/AdminManagement";
import UserManagement from "../pages/superadmin/UserManagement";
import WebsiteAnalytics from "../pages/superadmin/WebsiteAnalytics";
import ActivityLogs from "../pages/superadmin/ActivityLogs";
import SystemHealth from "../pages/superadmin/SystemHealth";

// ADMIN
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import FarmManagement from "../pages/admin/FarmManagement";
import Batches from "../pages/admin/Batches";
import Selling from "../pages/admin/Selling";
import Orders from "../pages/admin/Orders";
import Delivery from "../pages/admin/Delivery";
import Reports from "../pages/admin/Reports";
import Settings from "../pages/admin/Settings";
import Automation from "../pages/admin/Automation";
import Sensors from "../pages/admin/Sensors";

// CUSTOMER
import CustomerLayout from "../layouts/CustomerLayout";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerOrders from "../pages/customer/CustomerOrders";
import CustomerCart from "../pages/customer/CustomerCart";
import CustomerSettings from "../pages/customer/CustomerSettings";
import CustomerCheckout from "../pages/customer/CustomerCheckout";
import PaymentSuccess from "../pages/customer/PaymentSuccess";

// DELIVERY
import DeliveryLayout from "../layouts/DeliveryLayout";
import DeliveryDashboard from "../pages/delivery/DeliveryDashboard";
import Deliveries from "../pages/delivery/Deliveries";
import DeliveryProfile from "../pages/delivery/DeliveryProfile";

function App() {
  return (
    <>
      {/* Automatically record website page visits */}
      <WebsiteVisitTracker />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/social-auth/callback" element={<SocialAuthCallback />} />

        {/* SUPER ADMIN ROUTES */}
        <Route element={<ProtectedRoute role="super_admin" />}>
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route
              index
              element={<Navigate to="/super-admin/dashboard" replace />}
            />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="analytics" element={<WebsiteAnalytics />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="system-health" element={<SystemHealth />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="farm-management" element={<FarmManagement />} />
            <Route path="batches" element={<Batches />} />
            <Route path="selling" element={<Selling />} />
            <Route path="automation" element={<Automation />} />
            <Route path="sensors" element={<Sensors />} />
            <Route path="orders" element={<Orders />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* CUSTOMER ROUTES */}
        <Route element={<ProtectedRoute role="customer" />}>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route
              index
              element={<Navigate to="/customer/dashboard" replace />}
            />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="cart" element={<CustomerCart />} />
            <Route path="checkout" element={<CustomerCheckout />} />
            <Route path="payment-success" element={<PaymentSuccess />} />
            <Route path="settings" element={<CustomerSettings />} />
          </Route>
        </Route>

        {/* DELIVERY ROUTES */}
        <Route element={<ProtectedRoute role="delivery" />}>
          <Route path="/delivery" element={<DeliveryLayout />}>
            <Route
              index
              element={<Navigate to="/delivery/dashboard" replace />}
            />
            <Route path="dashboard" element={<DeliveryDashboard />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="profile" element={<DeliveryProfile />} />
          </Route>
        </Route>

        {/* UNKNOWN URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
