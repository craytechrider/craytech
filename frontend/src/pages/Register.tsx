import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import SocialAuthButtons from "../components/SocialAuthButtons";

interface RegisterResponse {
  success: boolean;
  message: string;
  email?: string;
  requires_verification?: boolean;
}

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<RegisterResponse>("/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      console.log("Register response:", response.data);

      if (!response.data.success) {
        setError(response.data.message || "Registration failed.");
        return;
      }

      // A newly registered customer must verify their email first.
      // Do not save a Sanctum token or redirect to the dashboard yet.
      navigate("/verify-email", {
        replace: true,
        state: {
          email: response.data.email || email,
        },
      });
    } catch (err: any) {
      console.error("Register error:", err);

      const data = err.response?.data;

      // The backend may have created the account but failed to send
      // the email. Let the customer reach the OTP page to resend it.
      if (data?.requires_verification && data?.email) {
        navigate("/verify-email", {
          replace: true,
          state: {
            email: data.email,
            notice: data.message,
          },
        });
        return;
      }

      const errors = data?.errors;

      if (errors) {
        const firstError = Object.values(errors)[0] as string[];
        setError(firstError?.[0] || "Registration failed.");
      } else {
        setError(data?.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="register-page">
      {/* =========================================
        ANIMATED BACKGROUND
    ========================================== */}

      <div className="background-overlay" />

      <div className="blur-orb orb-one" />
      <div className="blur-orb orb-two" />
      <div className="blur-orb orb-three" />

      {/* =========================================
        REGISTER CONTENT
    ========================================== */}

      <main className="register-wrapper">
        <div className="register-card">
          {/* LOGO */}
          <div className="logo-wrapper">
            <img src="/craytech-logo.png" alt="CRAYTECH" className="logo" />
          </div>

          {/* BRAND */}
          <h1>CRAYTECH</h1>

          <div className="brand-line" />

          <p className="subtitle">Create your customer account</p>

          {/* ERROR */}
          {error && <div className="error-message">{error}</div>}

          {/* FORM */}
          <form onSubmit={handleRegister}>
            {/* NAME */}
            <div className="field">
              <label htmlFor="name">Full Name</label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Enter your name"
              />
            </div>

            {/* EMAIL */}
            <div className="field">
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            {/* PASSWORD */}
            <div className="field">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimum 8 characters"
              />
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="field">
              <label htmlFor="passwordConfirmation">Confirm Password</label>

              <input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                placeholder="Repeat your password"
              />
            </div>

            {/* REGISTER */}
            <button
              type="submit"
              disabled={loading}
              className="register-button"
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>

          {/* SOCIAL REGISTRATION */}
          <SocialAuthButtons />

          {/* LOGIN */}
          <div className="login-section">
            <p>Already have an account?</p>

            <Link to="/login">Log in</Link>
          </div>

          {/* BACK */}
          <Link to="/" className="back-link">
            ← Back to Welcome
          </Link>
        </div>
      </main>

      <style>{`

      /* =========================================
         PAGE
      ========================================== */

      .register-page {
        min-height: 100vh;
        width: 100%;
        position: relative;

        overflow-x: hidden;
        overflow-y: auto;

        display: flex;
        align-items: center;
        justify-content: center;

        font-family: "Segoe UI", system-ui, sans-serif;

        background-image:
          url("/background.jpg");

        background-size: cover;
        background-position: center;
        background-attachment: fixed;
      }


      /* =========================================
         BACKGROUND OVERLAY
      ========================================== */

      .background-overlay {
        position: fixed;
        inset: 0;

        background:
          linear-gradient(
            135deg,
            rgba(3, 18, 45, 0.78),
            rgba(16, 64, 130, 0.60),
            rgba(5, 28, 65, 0.78)
          );

        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);

        z-index: 0;
      }


      /* =========================================
         BLUR ORBS
      ========================================== */

      .blur-orb {
        position: fixed;

        border-radius: 50%;

        filter: blur(80px);

        opacity: 0.45;

        pointer-events: none;

        animation:
          floatOrb 10s ease-in-out infinite;

        z-index: 1;
      }


      .orb-one {
        width: 350px;
        height: 350px;

        background: rgba(35, 115, 255, 0.65);

        top: -120px;
        left: -80px;
      }


      .orb-two {
        width: 300px;
        height: 300px;

        background: rgba(0, 180, 255, 0.40);

        right: -80px;
        bottom: -100px;

        animation-delay: -3s;
      }


      .orb-three {
        width: 220px;
        height: 220px;

        background: rgba(255, 60, 60, 0.28);

        left: 45%;
        top: 5%;

        animation-delay: -6s;
      }


      /* =========================================
         WRAPPER
      ========================================== */

      .register-wrapper {
        width: 100%;

        max-width: 520px;

        padding: 25px 18px;

        position: relative;

        z-index: 5;

        animation:
          pageEnter 0.9s ease-out;
      }


      /* =========================================
         GLASS CARD
      ========================================== */

      .register-card {
        width: 100%;

        padding: 32px 38px;

        border-radius: 26px;

        background:
          rgba(255, 255, 255, 0.90);

        border:
          1px solid rgba(255, 255, 255, 0.35);

        box-shadow:
          0 30px 80px rgba(0, 0, 0, 0.40),
          inset 0 1px 0 rgba(255, 255, 255, 0.6);

        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);

        animation:
          cardEnter 0.9s ease-out;
      }


      /* =========================================
         LOGO
      ========================================== */

      .logo-wrapper {
        width: 82px;
        height: 82px;

        margin: 0 auto 14px;

        display: flex;

        align-items: center;
        justify-content: center;

        background: rgba(255, 255, 255, 0.95);

        border-radius: 20px;

        box-shadow:
          0 12px 30px rgba(0, 0, 0, 0.14);

        animation:
          logoFloat 4s ease-in-out infinite;
      }


      .logo {
        width: 68px;
        height: 68px;

        object-fit: contain;
      }


      /* =========================================
         BRAND
      ========================================== */

      .register-card h1 {
        margin: 0;

        text-align: center;

        font-size: 38px;

        line-height: 1;

        font-weight: 800;

        letter-spacing: 4px;

        color: #182235;

        animation:
          textEnter 0.8s ease-out;
      }


      .brand-line {
        width: 48px;
        height: 4px;

        border-radius: 10px;

        background: #ef4444;

        margin: 10px auto 8px;
      }


      .subtitle {
        margin: 0 0 20px;

        text-align: center;

        font-size: 14px;

        color: #64748b;

        font-weight: 500;
      }


      /* =========================================
         ERROR
      ========================================== */

      .error-message {
        background: #fff1f2;

        border: 1px solid #fecdd3;

        color: #dc2626;

        border-radius: 12px;

        padding: 11px 14px;

        margin-bottom: 16px;

        font-size: 13px;

        animation:
          errorEnter 0.3s ease-out;
      }


      /* =========================================
         FIELDS
      ========================================== */

      .field {
        margin-bottom: 13px;

        animation:
          fieldEnter 0.6s ease-out both;
      }


      .field:nth-child(1) {
        animation-delay: 0.15s;
      }


      .field:nth-child(2) {
        animation-delay: 0.22s;
      }


      .field:nth-child(3) {
        animation-delay: 0.29s;
      }


      .field:nth-child(4) {
        animation-delay: 0.36s;
      }


      .field label {
        display: block;

        margin-bottom: 5px;

        font-size: 13px;

        font-weight: 600;

        color: #374151;
      }


      .field input {
        width: 100%;

        box-sizing: border-box;

        padding: 11px 13px;

        border:
          1px solid #d1d5db;

        border-radius: 10px;

        background:
          rgba(255, 255, 255, 0.75);

        color: #1f2937;

        font-size: 14px;

        outline: none;

        transition:
          border 0.25s ease,
          box-shadow 0.25s ease,
          transform 0.25s ease;
      }


      .field input:focus {
        border-color: #ef4444;

        box-shadow:
          0 0 0 3px rgba(239, 68, 68, 0.12);

        transform: translateY(-1px);
      }


      /* =========================================
         BUTTON
      ========================================== */

      .register-button {
        width: 100%;

        padding: 12px;

        margin-top: 4px;

        border: none;

        border-radius: 11px;

        background:
          linear-gradient(
            135deg,
            #ff3b45,
            #e62935
          );

        color: white;

        font-size: 14px;

        font-weight: 700;

        cursor: pointer;

        box-shadow:
          0 10px 25px rgba(230, 41, 53, 0.25);

        transition:
          transform 0.25s ease,
          box-shadow 0.25s ease;
      }


      .register-button:hover {
        transform: translateY(-3px);

        box-shadow:
          0 14px 30px rgba(230, 41, 53, 0.35);
      }


      .register-button:active {
        transform: translateY(0);
      }


      .register-button:disabled {
        background: #9ca3af;

        cursor: not-allowed;

        box-shadow: none;

        transform: none;
      }


      /* =========================================
         LOGIN
      ========================================== */

      .login-section {
        text-align: center;

        margin-top: 17px;
      }


      .login-section p {
        margin: 0;

        font-size: 13px;

        color: #64748b;
      }


      .login-section a {
        display: inline-block;

        margin-top: 3px;

        color: #ef4444;

        font-size: 14px;

        font-weight: 700;

        text-decoration: none;

        transition:
          transform 0.2s ease,
          color 0.2s ease;
      }


      .login-section a:hover {
        color: #dc2626;

        transform: translateY(-1px);
      }


      /* =========================================
         BACK
      ========================================== */

      .back-link {
        display: block;

        margin-top: 14px;

        text-align: center;

        color: #94a3b8;

        font-size: 12px;

        text-decoration: none;

        transition:
          color 0.2s ease,
          transform 0.2s ease;
      }


      .back-link:hover {
        color: #475569;

        transform: translateY(-1px);
      }


      /* =========================================
         ANIMATIONS
      ========================================== */

      @keyframes pageEnter {

        from {
          opacity: 0;
          transform:
            translateY(25px)
            scale(0.98);
        }

        to {
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }

      }


      @keyframes cardEnter {

        from {
          opacity: 0;
          transform:
            translateY(35px)
            scale(0.96);
        }

        to {
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }

      }


      @keyframes logoFloat {

        0%,
        100% {
          transform:
            translateY(0)
            rotate(0deg);
        }

        50% {
          transform:
            translateY(-7px)
            rotate(1deg);
        }

      }


      @keyframes floatOrb {

        0%,
        100% {
          transform:
            translate(0, 0)
            scale(1);
        }

        50% {
          transform:
            translate(30px, -25px)
            scale(1.08);
        }

      }


      @keyframes textEnter {

        from {
          opacity: 0;
          transform:
            translateY(12px);
        }

        to {
          opacity: 1;
          transform:
            translateY(0);
        }

      }


      @keyframes fieldEnter {

        from {
          opacity: 0;
          transform:
            translateX(-15px);
        }

        to {
          opacity: 1;
          transform:
            translateX(0);
        }

      }


      @keyframes errorEnter {

        from {
          opacity: 0;
          transform:
            translateY(-5px);
        }

        to {
          opacity: 1;
          transform:
            translateY(0);
        }

      }


      /* =========================================
         MOBILE
      ========================================== */

      @media (max-width: 500px) {

        .register-wrapper {
          padding: 18px 12px;
        }

        .register-card {
          padding: 25px 22px;
          border-radius: 22px;
        }

        .logo-wrapper {
          width: 72px;
          height: 72px;
        }

        .logo {
          width: 60px;
          height: 60px;
        }

        .register-card h1 {
          font-size: 32px;
          letter-spacing: 3px;
        }

      }


      /* =========================================
         REDUCE MOTION
      ========================================== */

      @media (prefers-reduced-motion: reduce) {

        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

      }

    `}</style>
    </div>
  );
};

export default Register;
