import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";

const SocialAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [message, setMessage] = useState("Completing your sign-in...");

  useEffect(() => {
    let active = true;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const authenticate = async () => {
      const code = searchParams.get("code");

      if (!code) {
        if (active) {
          setMessage("Invalid or missing authentication code.");
          redirectTimer = setTimeout(
            () => navigate("/login", { replace: true }),
            2500,
          );
        }
        return;
      }

      try {
        const response = await api.post("/auth/social/exchange", {
          code,
        });

        if (!active) return;

        const { token, user } = response.data;

        if (!token || !user) {
          throw new Error("Invalid authentication response.");
        }

        const role = String(user.role || "")
          .trim()
          .toLowerCase();

        // Accept all supported account roles.
        const roleRoutes: Record<string, string> = {
          super_admin: "/super-admin/dashboard",
          admin: "/admin/dashboard",
          customer: "/customer/dashboard",
          delivery: "/delivery/dashboard",
        };

        const destination = roleRoutes[role];

        if (!destination) {
          console.error("Unsupported social login role:", user.role);

          localStorage.removeItem("craytech_token");
          localStorage.removeItem("craytech_user");

          setMessage(`Invalid account role: ${user.role || "Not provided"}`);

          redirectTimer = setTimeout(
            () => navigate("/login", { replace: true }),
            2500,
          );
          return;
        }

        localStorage.setItem("craytech_token", token);
        localStorage.setItem("craytech_user", JSON.stringify(user));

        navigate(destination, { replace: true });
      } catch (error: any) {
        console.error("Social authentication error:", error);

        if (!active) return;

        setMessage(
          error.response?.data?.message ||
            error.message ||
            "Unable to complete social authentication.",
        );

        redirectTimer = setTimeout(
          () => navigate("/login", { replace: true }),
          3000,
        );
      }
    };

    authenticate();

    return () => {
      active = false;

      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [navigate, searchParams]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f6f9",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", padding: 30 }}>
        <div
          style={{
            width: 42,
            height: 42,
            border: "4px solid #dbeafe",
            borderTopColor: "#17365D",
            borderRadius: "50%",
            margin: "0 auto 20px",
            animation: "socialSpin 0.8s linear infinite",
          }}
        />

        <h2 style={{ color: "#17365D" }}>CRAYTECH</h2>

        <p style={{ color: "#64748b" }}>{message}</p>

        <style>
          {`
            @keyframes socialSpin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default SocialAuthCallback;
