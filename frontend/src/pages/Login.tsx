import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import SocialAuthButtons from "../components/SocialAuthButtons";

type UserRole = "super_admin" | "admin" | "customer" | "delivery";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mobile_number?: string | null;
  business_name?: string | null;
  is_active?: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

interface VerificationRequiredResponse {
  success: boolean;
  message: string;
  requires_verification?: boolean;
  email?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const socialError = searchParams.get("social_error");

    if (!socialError) return;

    const messages: Record<string, string> = {
      account_exists:
        "An account with this email already exists. Please log in using your CRAYTECH email and password.",
      email_missing:
        "The provider did not share an email address. Please allow email access or register using your email.",
      email_unverified:
        "Your Google email could not be verified. Please try another account.",
      account_disabled:
        "This account is disabled. Please contact the CRAYTECH administrator.",
      authentication_failed:
        "Social sign-in could not be completed. Please try again.",
    };

    setError(
      messages[socialError] || "Social sign-in failed. Please try again.",
    );
    searchParams.delete("social_error");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>("/login", {
        email,
        password,
      });

      console.log("Login response:", response.data);

      if (!response.data.success) {
        setError(response.data.message || "Login failed.");
        return;
      }

      const { token, user } = response.data;

      // Save authentication
      localStorage.setItem("craytech_token", token);
      localStorage.setItem("craytech_user", JSON.stringify(user));

      console.log("Logged in user:", user);

      // Normalize role
      const userRole = String(user.role || "")
        .trim()
        .toLowerCase();

      // Role redirection

      if (userRole === "super_admin") {
        navigate("/super-admin/dashboard", { replace: true });
        return;
      }

      if (userRole === "admin") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (userRole === "customer") {
        navigate("/customer/dashboard", { replace: true });
        return;
      }

      if (userRole === "delivery") {
        navigate("/delivery/dashboard", { replace: true });
        return;
      }

      // Invalid role
      console.error("Invalid user role:", user.role);

      localStorage.removeItem("craytech_token");
      localStorage.removeItem("craytech_user");

      setError("Invalid user role.");
    } catch (err: any) {
      console.error("Login error:", err);

      const status = err.response?.status;
      const data: VerificationRequiredResponse = err.response?.data;

      // ACCOUNT LOCKED AFTER THREE FAILED PASSWORD ATTEMPTS
      if (status === 423 && err.response?.data?.requires_password_reset) {
        setError(
          err.response.data.message ||
            "Your account has been temporarily locked. Please reset your password."
        );
        navigate("/forgot-password", {
          replace: true,
          state: { email },
        });
        return;
      }

      // EMAIL VERIFICATION REQUIRED
      if (status === 403 && data?.requires_verification) {
        const verificationEmail = data.email || email;

        // Do not save an authentication token.
        localStorage.removeItem("craytech_token");
        localStorage.removeItem("craytech_user");

        navigate("/verify-email", {
          replace: true,
          state: {
            email: verificationEmail,
            notice:
              data.message ||
              "Please verify your email address before logging in.",
          },
        });

        return;
      }

      // Validation error
      if (status === 422) {
        const errors = err.response?.data?.errors;

        if (errors?.email) {
          setError(errors.email[0]);
        } else if (errors?.password) {
          setError(errors.password[0]);
        } else {
          setError(err.response?.data?.message || "Invalid login information.");
        }

        return;
      }

      // Unauthorized / disabled account
      if (status === 401) {
        setError(err.response?.data?.message || "Invalid email or password.");
        return;
      }

      // Other errors
      setError(
        err.response?.data?.message || "Unable to connect to the server.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="background-overlay" />

      <div className="blur-orb orb-one" />
      <div className="blur-orb orb-two" />
      <div className="blur-orb orb-three" />

      <main className="login-wrapper">
        <div className="login-card">
          <div className="logo-wrapper">
            <img
              src="/craytech-logo.png"
              alt="CRAYTECH Logo"
              className="logo"
            />
          </div>

          <div className="brand-section">
            <h1>CRAYTECH</h1>
            <div className="brand-line" />
            <p>Crayfish Farm Management System</p>
          </div>

          <p className="login-description">
            Sign in to continue to your account.
          </p>

          {error && (
            <div className="error-message">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div className="field">
              <div className="password-label">
                <label htmlFor="password">Password</label>

                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="login-button">
              {loading ? (
                <>
                  <span className="spinner" />
                  LOGGING IN...
                </>
              ) : (
                "LOG IN"
              )}
            </button>
          </form>

          <SocialAuthButtons />

          <div className="register-section">
            <p>Don't have an account?</p>
            <Link to="/register">Create an account</Link>
          </div>

          <Link to="/" className="back-link">
            ← Back to Welcome
          </Link>
        </div>

        <footer>© {new Date().getFullYear()} CRAYTECH</footer>
      </main>

      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Segoe UI", system-ui, sans-serif;
          background-image: url("/background.jpg");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          box-sizing: border-box;
        }

        .background-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(3, 18, 45, 0.82),
            rgba(16, 64, 130, 0.64),
            rgba(5, 28, 65, 0.82)
          );
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .blur-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          pointer-events: none;
          animation: floatOrb 10s ease-in-out infinite;
        }

        .orb-one {
          width: 300px;
          height: 300px;
          background: rgba(35, 115, 255, 0.65);
          top: -100px;
          left: -70px;
        }

        .orb-two {
          width: 260px;
          height: 260px;
          background: rgba(0, 180, 255, 0.40);
          right: -70px;
          bottom: -80px;
          animation-delay: -3s;
        }

        .orb-three {
          width: 180px;
          height: 180px;
          background: rgba(255, 60, 60, 0.28);
          left: 45%;
          top: 5%;
          animation-delay: -6s;
        }

        .login-wrapper {
          width: 100%;
          max-width: 440px;
          padding: 20px;
          position: relative;
          z-index: 2;
          box-sizing: border-box;
          animation: pageEnter 0.7s ease-out;
        }

        .login-card {
          width: 100%;
          box-sizing: border-box;
          padding: 28px 38px 25px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow:
            0 25px 65px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .logo-wrapper {
          width: 78px;
          height: 78px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 18px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.13);
          animation: logoFloat 4s ease-in-out infinite;
        }

        .logo {
          width: 65px;
          height: 65px;
          object-fit: contain;
        }

        .brand-section {
          text-align: center;
        }

        .brand-section h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 3px;
          color: #182235;
        }

        .brand-line {
          width: 38px;
          height: 3px;
          border-radius: 10px;
          background: #ef4444;
          margin: 9px auto;
        }

        .brand-section p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .login-description {
          text-align: center;
          margin: 15px 0 17px;
          color: #64748b;
          font-size: 13px;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          margin-bottom: 14px;
          border-radius: 10px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          animation: errorShake 0.35s ease;
        }

        .error-message span {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 800;
        }

        .error-message p {
          margin: 0;
          font-size: 12px;
          line-height: 1.3;
        }

        .field {
          margin-bottom: 14px;
        }

        .field label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
        }

        .field input {
          width: 100%;
          box-sizing: border-box;
          height: 44px;
          padding: 0 13px;
          border: 1px solid #d7dee8;
          border-radius: 9px;
          background: rgba(248, 250, 252, 0.9);
          color: #172033;
          font-size: 13px;
          outline: none;
          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease;
        }

        .field input::placeholder {
          color: #94a3b8;
        }

        .field input:hover {
          border-color: #b8c4d4;
        }

        .field input:focus {
          background: white;
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.10);
        }

        .login-button {
          width: 100%;
          height: 46px;
          margin-top: 3px;
          border: none;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: white;
          background: linear-gradient(135deg, #ff3b45, #e62935);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(230, 41, 53, 0.25);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            opacity 0.25s ease;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(230, 41, 53, 0.35);
        }

        .login-button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .register-section {
          text-align: center;
          margin-top: 16px;
        }

        .register-section p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .register-section a {
          display: inline-block;
          margin-top: 4px;
          color: #e62935;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .register-section a:hover {
          color: #be123c;
        }

        .back-link {
          display: block;
          text-align: center;
          margin-top: 13px;
          color: #64748b;
          font-size: 12px;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .back-link:hover {
          color: #182235;
        }

        .password-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .forgot-password-link {
          color: #e62935;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .forgot-password-link:hover {
          color: #be123c;
          text-decoration: underline;
        }

        footer {
          text-align: center;
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes floatOrb {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(25px, -20px) scale(1.08);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes errorShake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }

        @media (max-height: 700px) {
          .login-wrapper {
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .login-card {
            padding-top: 20px;
            padding-bottom: 18px;
          }

          .logo-wrapper {
            width: 65px;
            height: 65px;
            margin-bottom: 8px;
          }

          .logo {
            width: 54px;
            height: 54px;
          }

          .brand-section h1 {
            font-size: 30px;
          }

          .login-description {
            margin: 10px 0 12px;
          }

          .field {
            margin-bottom: 10px;
          }

          .register-section {
            margin-top: 11px;
          }

          .back-link {
            margin-top: 9px;
          }

          footer {
            margin-top: 8px;
          }
        }

        @media (max-width: 500px) {
          .login-wrapper {
            padding: 15px;
          }

          .login-card {
            padding: 25px 22px 22px;
            border-radius: 20px;
          }

          .brand-section h1 {
            font-size: 30px;
            letter-spacing: 2px;
          }

          .brand-section p {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
