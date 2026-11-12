import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  headers: {
    Accept: "application/json",
  },
});

// Prevent multiple simultaneous 401 responses from triggering repeated redirects.
let isRedirectingToLogin = false;

// =========================================================
// REQUEST INTERCEPTOR
// Automatically attach CRAYTECH authentication token
// =========================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("craytech_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token");

    console.log(
      "API Request:",
      config.method?.toUpperCase(),
      config.url,
      "Token:",
      token ? "FOUND" : "NOT FOUND",
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// =========================================================
// RESPONSE INTERCEPTOR
// Handle expired/missing authentication on ALL customer pages
// =========================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("401 Unauthorized");
      console.error("URL:", error.config?.url);
      console.error("Server response:", error.response?.data);

      const currentPath = window.location.pathname;
      const isCustomerPage = currentPath.startsWith("/customer");
      const requestUrl = String(error.config?.url || "").toLowerCase();

      // Do not treat failed login/registration/password requests as an
      // expired customer session. Those forms should show their own errors.
      const isAuthenticationRequest =
        /\/(login|register|forgot-password|reset-password)(\?|$)/.test(
          requestUrl,
        );

      if (isCustomerPage && !isAuthenticationRequest && !isRedirectingToLogin) {
        isRedirectingToLogin = true;

        const authKeys = [
          "craytech_token",
          "craytech_user",
          "token",
          "user",
          "auth_token",
          "access_token",
        ];

        authKeys.forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        // Full navigation clears the protected page and sends the customer
        // to the public login route, even if no token was stored locally.
        if (currentPath !== "/login") {
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
